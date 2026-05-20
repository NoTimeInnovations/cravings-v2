import { fetchFromHasura } from "@/lib/hasuraClient";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ─── Token Exchange ───────────────────────────────────────────────
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
}> {
  const res = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        code,
      }),
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Meta token exchange failed:", err);
    throw new Error("Failed to exchange code for token");
  }

  return res.json();
}

// ─── Debug Token → extract WABA ID & Phone Number ID ─────────────
export async function getConnectedWabaInfo(accessToken: string): Promise<{
  wabaId: string;
  phoneNumberId: string;
  metaUserId: string | null;
}> {
  // /debug_token requires an app access token (or a developer's user token)
  // for the access_token param — NOT the same token being debugged.
  const appAccessToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const res = await fetch(
    `${GRAPH_API_BASE}/debug_token?` +
      new URLSearchParams({
        input_token: accessToken,
        access_token: appAccessToken,
      }),
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Meta debug_token failed:", res.status, err);
    throw new Error("Failed to debug token");
  }

  const data = await res.json();
  const scopes = data.data?.granular_scopes || [];
  const metaUserId: string | null = data.data?.user_id || null;
  // Log the full payload (token already validated, this is internal logging
  // only — production logs are server-side and not exposed to the user) so we
  // can diagnose Embedded Signup edge cases (empty target_ids, missing scope,
  // etc.) without forcing the partner to retry.
  console.log("Meta debug_token response:", JSON.stringify(data));

  // Both granular_scopes entries point at the WABA — phone_number_id is not
  // included; we have to fetch it from /{waba_id}/phone_numbers separately.
  let wabaId: string | undefined =
    scopes.find((s: any) => s.scope === "whatsapp_business_management")
      ?.target_ids?.[0] ||
    scopes.find((s: any) => s.scope === "whatsapp_business_messaging")
      ?.target_ids?.[0];

  // Fallback: if debug_token returned the WhatsApp scope(s) with empty
  // target_ids (a known Embedded Signup race for fresh business portfolios),
  // discover the WABA by listing the user's accessible businesses.
  if (!wabaId) {
    console.warn(
      "debug_token returned no WABA target_ids — falling back to /me/businesses lookup",
    );
    try {
      const meRes = await fetch(
        `${GRAPH_API_BASE}/me?fields=businesses{owned_whatsapp_business_accounts{id}}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (meRes.ok) {
        const meData = await meRes.json();
        console.log("Meta /me/businesses response:", JSON.stringify(meData));
        const businesses = meData?.businesses?.data || [];
        for (const biz of businesses) {
          const waba = biz?.owned_whatsapp_business_accounts?.data?.[0];
          if (waba?.id) {
            wabaId = waba.id;
            break;
          }
        }
      } else {
        const err = await meRes.text();
        console.error("Meta /me fallback failed:", meRes.status, err);
      }
    } catch (e) {
      console.error("Meta /me fallback threw:", e);
    }
  }

  if (!wabaId) {
    // Distinguish the failure modes so the partner sees something actionable
    // instead of a generic message.
    const hasScopes = scopes.some(
      (s: any) =>
        s.scope === "whatsapp_business_management" ||
        s.scope === "whatsapp_business_messaging",
    );
    const reason = hasScopes
      ? "Connection granted but no WhatsApp Business Account was selected. Please retry and complete the WhatsApp setup step in the popup."
      : "WhatsApp permissions were not granted. Please retry and approve all permissions in the popup.";
    throw new Error(reason);
  }

  // Sanity-check that BOTH scopes Meta requires for Tech Provider features
  // are present. Connecting without `whatsapp_business_management` means the
  // partner can't manage templates (the whole point of our Tech Provider
  // submission), so fail loud at connect time rather than later from a
  // 200 on /messages and a 403 on /message_templates.
  const grantedScopes = scopes.map((s: any) => s.scope);
  const missing: string[] = [];
  if (!grantedScopes.includes("whatsapp_business_messaging"))
    missing.push("whatsapp_business_messaging");
  if (!grantedScopes.includes("whatsapp_business_management"))
    missing.push("whatsapp_business_management");
  if (missing.length > 0) {
    console.warn(
      "Embedded Signup granted scopes:",
      grantedScopes,
      "missing:",
      missing,
    );
    throw new Error(
      `WhatsApp connected, but Meta did not grant the required ${missing.join(
        " + ",
      )} permission${missing.length > 1 ? "s" : ""}. Update your Embedded Signup configuration in Meta Business Manager to request both permissions, then reconnect.`,
    );
  }

  const phoneRes = await fetch(
    `${GRAPH_API_BASE}/${wabaId}/phone_numbers`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!phoneRes.ok) {
    const err = await phoneRes.text();
    console.error("Failed to fetch WABA phone_numbers:", phoneRes.status, err);
    throw new Error("Failed to fetch phone numbers for this WABA");
  }
  const phoneData = await phoneRes.json();
  const phoneNumberId = phoneData?.data?.[0]?.id;
  if (!phoneNumberId) {
    console.error("WABA has no phone numbers:", JSON.stringify(phoneData));
    throw new Error(
      "Your WhatsApp Business Account has no registered phone numbers yet. Add a phone number in WhatsApp Manager and retry.",
    );
  }

  return { wabaId, phoneNumberId, metaUserId };
}

// ─── Subscribe to webhooks for a WABA ────────────────────────────
export async function subscribeWabaWebhooks(
  wabaId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${GRAPH_API_BASE}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to subscribe WABA webhooks:", err);
    throw new Error("Failed to subscribe to WABA webhooks");
  }
}

// ─── Save/Update integration in Hasura ───────────────────────────
export async function saveWhatsAppIntegration(data: {
  partner_id: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  meta_user_id?: string | null;
}) {
  // Check if integration already exists for this partner
  const checkQuery = `
    query CheckWhatsAppIntegration($partner_id: uuid!) {
      whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
        id
      }
    }
  `;

  const checkRes = await fetchFromHasura(checkQuery, {
    partner_id: data.partner_id,
  });

  const existingId =
    checkRes?.whatsapp_business_integrations?.[0]?.id;

  if (existingId) {
    // Update existing
    const mutation = `
      mutation UpdateWhatsAppIntegration($id: uuid!, $changes: whatsapp_business_integrations_set_input!) {
        update_whatsapp_business_integrations_by_pk(pk_columns: {id: $id}, _set: $changes) {
          id
        }
      }
    `;
    await fetchFromHasura(mutation, {
      id: existingId,
      changes: {
        waba_id: data.waba_id,
        phone_number_id: data.phone_number_id,
        access_token: data.access_token,
        meta_user_id: data.meta_user_id ?? null,
        updated_at: new Date().toISOString(),
      },
    });
  } else {
    // Insert new
    const mutation = `
      mutation InsertWhatsAppIntegration($object: whatsapp_business_integrations_insert_input!) {
        insert_whatsapp_business_integrations_one(object: $object) {
          id
        }
      }
    `;
    await fetchFromHasura(mutation, {
      object: {
        partner_id: data.partner_id,
        waba_id: data.waba_id,
        phone_number_id: data.phone_number_id,
        access_token: data.access_token,
        meta_user_id: data.meta_user_id ?? null,
        updated_at: new Date().toISOString(),
      },
    });
  }
}

// ─── Lookup partner by WABA ID ───────────────────────────────────
export async function getPartnerByWabaId(wabaId: string) {
  const query = `
    query GetPartnerByWaba($waba_id: String!) {
      whatsapp_business_integrations(where: {waba_id: {_eq: $waba_id}}) {
        id
        partner_id
        phone_number_id
        access_token
      }
    }
  `;

  const res = await fetchFromHasura(query, { waba_id: wabaId });
  return res?.whatsapp_business_integrations?.[0] || null;
}

// ─── Lookup partner by Phone Number ID ───────────────────────────
export async function getPartnerByPhoneNumberId(phoneNumberId: string) {
  const query = `
    query GetPartnerByPhoneNumber($phone_number_id: String!) {
      whatsapp_business_integrations(where: {phone_number_id: {_eq: $phone_number_id}}) {
        id
        partner_id
        phone_number_id
        access_token
      }
    }
  `;

  const res = await fetchFromHasura(query, {
    phone_number_id: phoneNumberId,
  });
  return res?.whatsapp_business_integrations?.[0] || null;
}

// ─── Fetch the partner's integration row (waba_id + access_token) ─
export async function getPartnerWabaIntegration(partnerId: string): Promise<{
  id: string;
  partner_id: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
} | null> {
  const query = `
    query GetPartnerWabaIntegration($partner_id: uuid!) {
      whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}, limit: 1) {
        id
        partner_id
        waba_id
        phone_number_id
        access_token
      }
    }
  `;
  const res = await fetchFromHasura(query, { partner_id: partnerId });
  return res?.whatsapp_business_integrations?.[0] || null;
}

// ─── Message Templates: list / create / delete on Meta ───────────
// All three wrap the same /{waba_id}/message_templates endpoint.
// Meta auto-reviews newly created templates within 24h; status flips from
// PENDING → APPROVED / REJECTED — callers should pull updated status from
// /message_templates (the list endpoint) rather than relying on the POST
// response.

export type MetaTemplateComponent =
  | {
      type: "HEADER";
      format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
      text?: string;
      example?: { header_text?: string[]; header_handle?: string[] };
    }
  | { type: "BODY"; text: string; example?: { body_text?: string[][] } }
  | { type: "FOOTER"; text: string }
  | {
      type: "BUTTONS";
      buttons: Array<
        | { type: "QUICK_REPLY"; text: string }
        | { type: "URL"; text: string; url: string; example?: string[] }
        | { type: "PHONE_NUMBER"; text: string; phone_number: string }
      >;
    };

export interface MetaTemplatePayload {
  name: string;
  language: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  components: MetaTemplateComponent[];
}

export interface MetaTemplateListItem {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  rejected_reason?: string;
  components: MetaTemplateComponent[];
}

export async function listMetaTemplates(
  wabaId: string,
  accessToken: string,
): Promise<MetaTemplateListItem[]> {
  const url =
    `${GRAPH_API_BASE}/${wabaId}/message_templates?` +
    new URLSearchParams({
      fields: "id,name,language,category,status,rejected_reason,components",
      limit: "200",
    });
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Meta listMetaTemplates failed:", res.status, err);
    throw new Error(`Meta returned ${res.status} listing templates`);
  }
  const data = await res.json();
  return data?.data || [];
}

export async function createMetaTemplate(
  wabaId: string,
  accessToken: string,
  payload: MetaTemplatePayload,
): Promise<{ id: string; status: string; category: string }> {
  const res = await fetch(`${GRAPH_API_BASE}/${wabaId}/message_templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Meta createMetaTemplate failed:", res.status, data);
    const message =
      data?.error?.error_user_msg ||
      data?.error?.message ||
      `Meta returned ${res.status}`;
    throw new Error(message);
  }
  return data;
}

// Meta lets you edit APPROVED/REJECTED templates by POSTing to the template's
// own id (not the WABA endpoint). `name` and `language` are immutable. You
// can change category, components, or both. After editing, the template goes
// back into review.
export async function editMetaTemplate(
  metaTemplateId: string,
  accessToken: string,
  patch: {
    category?: "UTILITY" | "MARKETING" | "AUTHENTICATION";
    components?: MetaTemplateComponent[];
  },
): Promise<{ success: boolean; status?: string; category?: string }> {
  const body: Record<string, unknown> = {};
  if (patch.category) body.category = patch.category;
  if (patch.components) body.components = patch.components;

  const res = await fetch(`${GRAPH_API_BASE}/${metaTemplateId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Meta editMetaTemplate failed:", res.status, data);
    const message =
      data?.error?.error_user_msg ||
      data?.error?.message ||
      `Meta returned ${res.status}`;
    throw new Error(message);
  }
  return data;
}

// Subcodes returned by Graph when a template doesn't exist on the account.
// We treat these as "already deleted" rather than errors so the caller can
// drop the local row cleanly.
const META_TEMPLATE_NOT_FOUND_SUBCODES = new Set([2593002, 2593003]);

export class MetaTemplateNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaTemplateNotFoundError";
  }
}

export async function deleteMetaTemplate(
  wabaId: string,
  accessToken: string,
  name: string,
  hsmId?: string,
): Promise<void> {
  // Meta requires `name`; passing `hsm_id` deletes a single language variant
  // rather than the whole template family. We always pass it when we have it.
  const params = new URLSearchParams({ name });
  if (hsmId) params.set("hsm_id", hsmId);
  const res = await fetch(
    `${GRAPH_API_BASE}/${wabaId}/message_templates?${params}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (res.ok) return;

  const data = await res.json().catch(() => ({} as any));
  console.error("Meta deleteMetaTemplate failed:", res.status, data);

  const subcode: number | undefined = data?.error?.error_subcode;
  const userMsg: string | undefined =
    data?.error?.error_user_msg || data?.error?.message;

  if (res.status === 404 || (subcode && META_TEMPLATE_NOT_FOUND_SUBCODES.has(subcode))) {
    throw new MetaTemplateNotFoundError(
      userMsg || "Template not found at Meta",
    );
  }
  throw new Error(userMsg || `Meta returned ${res.status} deleting template`);
}

// ─── Send a WhatsApp message via Cloud API ───────────────────────
export async function sendWhatsAppCloudMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
) {
  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp Cloud API send failed:", err);
    return false;
  }

  return true;
}
