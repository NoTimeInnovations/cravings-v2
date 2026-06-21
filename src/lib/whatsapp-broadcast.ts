/**
 * Server-only helpers for WhatsApp broadcasts.
 *
 * A broadcast sends one approved template to many recipients. The actual send
 * is driven by the cron worker (/api/cron/dispatch-broadcasts), which calls
 * sendBroadcastTemplate() once per recipient. This mirrors the single-send path
 * in /api/whatsapp/send (partner number first, Menuthere number as fallback)
 * and logs every attempt to whatsapp_message_logs like the rest of the app.
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

// Per-recipient mapping for each body {{n}} placeholder.
export type VariableSource = "phone" | "name" | "fixed";
export interface VariableMapItem {
  source: VariableSource;
  value?: string; // used when source === "fixed"
}

export interface BroadcastRecipient {
  id: string;
  name: string | null;
  phone: string;
}

export type HeaderMediaType = "image" | "video" | "document";

export interface BroadcastSendConfig {
  partnerId: string;
  templateName: string;
  language: string;
  variableMap: VariableMapItem[];
  headerParams?: string[] | null;
  // Media header (for templates whose HEADER format is IMAGE/VIDEO/DOCUMENT). A
  // single hosted public URL is sent to every recipient via {<type>: { link }}.
  headerMediaUrl?: string | null;
  headerMediaType?: HeaderMediaType | null;
}

interface PartnerWhatsApp {
  partnerPhoneNumberId: string | null;
  partnerToken: string | null;
}

// Resolve once per broadcast tick so we don't re-query Hasura per recipient.
export async function getPartnerWhatsApp(
  partnerId: string,
): Promise<PartnerWhatsApp> {
  try {
    const query = `
      query GetPartnerWhatsApp($partner_id: uuid!) {
        whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}, limit: 1) {
          phone_number_id
          access_token
        }
      }
    `;
    const data = await fetchFromHasuraServer(query, { partner_id: partnerId });
    const integration = data?.whatsapp_business_integrations?.[0];
    if (integration?.phone_number_id) {
      return {
        partnerPhoneNumberId: integration.phone_number_id,
        partnerToken: integration.access_token || null,
      };
    }
  } catch {
    // fall through to Menuthere's number
  }
  return { partnerPhoneNumberId: null, partnerToken: null };
}

// Mirror the normalization used in /api/whatsapp/send (India-centric defaults).
export function normalizePhone(phone: string): string {
  let formatted = phone.replace(/[\s\-\+\(\)]/g, "");
  if (formatted.startsWith("0")) formatted = "91" + formatted.slice(1);
  if (formatted.length === 10) formatted = "91" + formatted;
  return formatted;
}

function resolveVar(item: VariableMapItem, recipient: BroadcastRecipient): string {
  if (item.source === "phone") return recipient.phone;
  if (item.source === "name") return recipient.name?.trim() || "";
  return item.value || "";
}

function logWhatsAppMessage(params: {
  partnerId: string;
  phone: string;
  templateName: string;
  status: "sent" | "failed";
  metaMessageId?: string;
  errorDetails?: string;
}) {
  const mutation = `
    mutation LogWhatsAppMessage($object: whatsapp_message_logs_insert_input!) {
      insert_whatsapp_message_logs_one(object: $object) { id }
    }
  `;
  fetchFromHasuraServer(mutation, {
    object: {
      partner_id: params.partnerId,
      phone: params.phone,
      template_name: params.templateName,
      message_type: "template",
      category: "broadcast",
      status: params.status,
      meta_message_id: params.metaMessageId || null,
      error_details: params.errorDetails || null,
    },
  }).catch((err) => console.error("Failed to log broadcast message:", err));
}

export interface SendResult {
  ok: boolean;
  metaMessageId?: string;
  error?: string;
}

/**
 * Send one broadcast template message to one recipient. Tries the partner's own
 * WABA number first; on failure falls back to Menuthere's shared number so the
 * customer still receives it.
 */
export async function sendBroadcastTemplate(
  cfg: BroadcastSendConfig,
  recipient: BroadcastRecipient,
  partnerWa: PartnerWhatsApp,
): Promise<SendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
  const menutherePhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const to = normalizePhone(recipient.phone);

  const components: any[] = [];
  if (cfg.headerMediaUrl && cfg.headerMediaType) {
    // Media header: WhatsApp wants { type: "<media>", <media>: { link } }.
    const mt = cfg.headerMediaType;
    components.push({
      type: "header",
      parameters: [{ type: mt, [mt]: { link: cfg.headerMediaUrl } }],
    });
  } else if (cfg.headerParams?.length) {
    components.push({
      type: "header",
      parameters: cfg.headerParams.map((p) => ({ type: "text", text: p })),
    });
  }
  const bodyParams = (cfg.variableMap || []).map((item) => ({
    type: "text",
    text: resolveVar(item, recipient),
  }));
  if (bodyParams.length) {
    components.push({ type: "body", parameters: bodyParams });
  }

  const messagePayload: any = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: cfg.templateName,
      language: { code: cfg.language || "en" },
      ...(components.length ? { components } : {}),
    },
  };

  const sendFrom = (fromPhoneNumberId: string, token: string) =>
    fetch(
      `https://graph.facebook.com/${API_VERSION}/${fromPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      },
    );

  let res = partnerWa.partnerPhoneNumberId
    ? await sendFrom(
        partnerWa.partnerPhoneNumberId,
        partnerWa.partnerToken || accessToken,
      )
    : await sendFrom(menutherePhoneNumberId, accessToken);

  // If the partner's own number fails, THIS is the real cause. The Menuthere
  // fallback below can't send a partner-owned template — that template isn't on
  // Menuthere's WABA, so it returns a misleading "(#132001) template does not
  // exist" that masks the actual partner-side error (e.g. the number is still
  // On-Premise / on the Business App and not registered on the Cloud API).
  let partnerError: string | null = null;
  if (!res.ok && partnerWa.partnerPhoneNumberId) {
    partnerError = await res.text();
    console.warn(
      "Broadcast send via partner number failed, retrying from Menuthere:",
      res.status,
      partnerError,
    );
    res = await sendFrom(menutherePhoneNumberId, accessToken);
  }

  if (!res.ok) {
    const fallbackError = await res.text();
    // Prefer the partner-number error — it's the actionable one.
    const errBody = partnerError || fallbackError;
    logWhatsAppMessage({
      partnerId: cfg.partnerId,
      phone: to,
      templateName: cfg.templateName,
      status: "failed",
      errorDetails: errBody,
    });
    return { ok: false, error: errBody.slice(0, 500) };
  }

  const result = await res.json().catch(() => ({}) as any);
  const metaMessageId = result?.messages?.[0]?.id;
  logWhatsAppMessage({
    partnerId: cfg.partnerId,
    phone: to,
    templateName: cfg.templateName,
    status: "sent",
    metaMessageId,
  });
  return { ok: true, metaMessageId };
}

/**
 * How many broadcast messages this partner has already sent today (UTC).
 * Used to enforce the per-partner daily cap (default 250). Counts recipient
 * rows flipped to "sent" since UTC midnight across all of the partner's
 * broadcasts.
 */
export async function countSentToday(partnerId: string): Promise<number> {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const query = `
    query CountSentToday($partner_id: uuid!, $since: timestamptz!) {
      whatsapp_broadcast_recipients_aggregate(
        where: {
          status: { _eq: "sent" }
          sent_at: { _gte: $since }
          broadcast: { partner_id: { _eq: $partner_id } }
        }
      ) {
        aggregate { count }
      }
    }
  `;
  const data = await fetchFromHasuraServer(query, {
    partner_id: partnerId,
    since: midnight.toISOString(),
  });
  return data?.whatsapp_broadcast_recipients_aggregate?.aggregate?.count || 0;
}
