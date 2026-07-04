import { getPartnerWabaIntegration, partnerWabaToken } from "@/lib/whatsapp-meta";
import {
  normalizePhone,
  getPartnerOptOuts,
  getPartnerDailyLimit,
} from "@/lib/whatsapp-broadcast";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

// How many messages this number has actually sent today (UTC), counted from the
// SAME ledger the API writes to (whatsapp_message_logs). The broadcast counter
// only counts broadcast recipients, so it would read ~0 for a pure-API partner
// and never enforce the cap.
async function countSentTodayFromLogs(
  partnerId: string,
  phoneNumberId: string,
): Promise<number> {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const data = await fetchFromHasuraServer(
    `query ApiDailyCount($p: uuid!, $pn: String!, $s: timestamptz!) {
      whatsapp_message_logs_aggregate(where: {
        partner_id: { _eq: $p }
        sent_from_phone_number_id: { _eq: $pn }
        status: { _eq: "sent" }
        created_at: { _gte: $s }
      }) { aggregate { count } }
    }`,
    { p: partnerId, pn: phoneNumberId, s: midnight.toISOString() },
  );
  return data?.whatsapp_message_logs_aggregate?.aggregate?.count || 0;
}

export type MediaType = "image" | "video" | "document";

export interface SendTemplateInput {
  partnerId: string;
  to: string;
  templateName: string;
  /** Optional — resolved from the approved template in our DB when omitted. */
  language?: string;
  bodyParams?: string[];
  headerParams?: string[];
  headerMediaUrl?: string | null;
  headerMediaType?: MediaType | null;
  buttonParams?: string[];
}

// Resolve a template's language from our local mirror when the caller doesn't
// pass one. Prefers a row on the default number's WABA. Returns null if there's
// no approved template of that name.
async function resolveTemplateLanguage(
  partnerId: string,
  templateName: string,
  wabaId: string | null,
): Promise<string | null> {
  const data = await fetchFromHasuraServer(
    `query TplLang($p: uuid!, $n: String!) {
      whatsapp_message_templates(
        where: { partner_id: { _eq: $p }, name: { _eq: $n }, status: { _eq: "APPROVED" } }
        order_by: { language: asc }
      ) { language waba_id }
    }`,
    { p: partnerId, n: templateName },
  );
  const rows = (data?.whatsapp_message_templates || []) as Array<any>;
  const scoped = wabaId ? rows.filter((r) => !r.waba_id || r.waba_id === wabaId) : rows;
  return (scoped[0] || rows[0])?.language || null;
}

export type SendOutcome =
  | { ok: true; messageId: string | null; to: string }
  | { ok: false; status: number; error: string; detail?: string };

// Mirror the app's whatsapp_message_logs shape so public-API sends show up in
// the same ledger as everything else. category = 'api' to distinguish them.
function logSend(p: {
  partnerId: string;
  phone: string;
  templateName: string;
  status: "sent" | "failed";
  phoneNumberId: string;
  metaMessageId?: string | null;
  errorDetails?: string | null;
}): void {
  fetchFromHasuraServer(
    `mutation LogApiSend($o: whatsapp_message_logs_insert_input!) {
      insert_whatsapp_message_logs_one(object: $o) { id }
    }`,
    {
      o: {
        partner_id: p.partnerId,
        phone: p.phone,
        template_name: p.templateName,
        message_type: "template",
        category: "api",
        status: p.status,
        meta_message_id: p.metaMessageId || null,
        error_details: p.errorDetails || null,
        sent_from_phone_number_id: p.phoneNumberId,
      },
    },
  ).catch(() => {});
}

// Send one approved template to one phone from the partner's DEFAULT (primary)
// connected WhatsApp number. The sending number is controlled by the partner in
// Integration settings, NOT chosen by the caller.
export async function sendTemplateForPartner(
  input: SendTemplateInput,
): Promise<SendOutcome> {
  const to = normalizePhone(input.to);
  if (to.length < 8) {
    return { ok: false, status: 400, error: "invalid_number", detail: "Recipient phone number looks invalid." };
  }
  if (!input.templateName) {
    return { ok: false, status: 400, error: "missing_fields", detail: "template_name is required." };
  }

  // Default sender = the partner's primary connected number.
  const integration = await getPartnerWabaIntegration(input.partnerId);
  if (!integration?.phone_number_id || !integration.access_token) {
    return {
      ok: false,
      status: 412,
      error: "no_whatsapp_number",
      detail: "No default WhatsApp number is connected. Connect one and mark it default in Integration settings.",
    };
  }
  const phoneNumberId = integration.phone_number_id;

  // Language is optional — look it up from the approved template when omitted.
  let language = (input.language || "").trim();
  if (!language) {
    language = (await resolveTemplateLanguage(input.partnerId, input.templateName, integration.waba_id || null)) || "";
    if (!language) {
      return {
        ok: false,
        status: 404,
        error: "template_not_found",
        detail: `No approved template named '${input.templateName}' on your default number. Check the name (see GET /templates) or pass 'language'.`,
      };
    }
  }

  // Never message a customer who opted out (replied STOP). getPartnerOptOuts is
  // best-effort (returns an empty set on read failure); WhatsApp/Meta also
  // enforces STOP at their layer, so a transient read miss can't cause a
  // sustained compliance gap.
  const optedOut = await getPartnerOptOuts(input.partnerId);
  if (optedOut.has(to)) {
    return { ok: false, status: 409, error: "recipient_opted_out", detail: "This customer has opted out (replied STOP)." };
  }

  // Respect the number's Meta daily messaging tier.
  try {
    const [limit, sentToday] = await Promise.all([
      getPartnerDailyLimit(input.partnerId, phoneNumberId),
      countSentTodayFromLogs(input.partnerId, phoneNumberId),
    ]);
    if (sentToday >= limit) {
      return { ok: false, status: 429, error: "daily_limit_reached", detail: `This number's WhatsApp daily limit (${limit}) is used up for today.` };
    }
  } catch {
    /* tier read failed — allow the send; Meta still enforces its own cap */
  }

  // Build the template components from the caller's parameter arrays.
  const components: any[] = [];
  if (input.headerMediaUrl && input.headerMediaType) {
    const mt = input.headerMediaType;
    components.push({ type: "header", parameters: [{ type: mt, [mt]: { link: input.headerMediaUrl } }] });
  } else if (input.headerParams?.length) {
    components.push({ type: "header", parameters: input.headerParams.map((t) => ({ type: "text", text: String(t) })) });
  }
  if (input.bodyParams?.length) {
    components.push({ type: "body", parameters: input.bodyParams.map((t) => ({ type: "text", text: String(t) })) });
  }
  if (input.buttonParams?.length) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: input.buttonParams.map((t) => ({ type: "text", text: String(t) })),
    });
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: language },
      ...(components.length ? { components } : {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${partnerWabaToken(integration)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    logSend({ partnerId: input.partnerId, phone: to, templateName: input.templateName, status: "failed", phoneNumberId, errorDetails: e?.message || "network error" });
    return { ok: false, status: 502, error: "send_failed", detail: "Couldn't reach WhatsApp. Try again." };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data?.error?.error_user_msg || data?.error?.message || `WhatsApp returned ${res.status}`;
    logSend({
      partnerId: input.partnerId,
      phone: to,
      templateName: input.templateName,
      status: "failed",
      phoneNumberId,
      errorDetails: JSON.stringify(data?.error || data).slice(0, 1000),
    });
    const isTemplate = /template/i.test(String(detail));
    return {
      ok: false,
      status: res.status >= 500 ? 502 : 400,
      error: isTemplate ? "template_error" : "send_failed",
      detail,
    };
  }

  const messageId = data?.messages?.[0]?.id || null;
  logSend({ partnerId: input.partnerId, phone: to, templateName: input.templateName, status: "sent", phoneNumberId, metaMessageId: messageId });
  return { ok: true, messageId, to };
}
