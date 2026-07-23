import { fetchFromHasura } from "@/lib/hasuraClient";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// The access token to use for Graph send/template operations on ANY partner's
// WABA. A partner's stored integration.access_token is a Coexistence token
// (whatsapp_business_manage_events) that CANNOT send messages or manage
// templates — only our system-user token has whatsapp_business_messaging +
// whatsapp_business_management. We still target the partner's own
// waba_id / phone_number_id; only the auth token is ours.
export function getWabaOpsToken(): string {
  return process.env.WHATSAPP_ACCESS_TOKEN!;
}

// Token for operating on a PARTNER's own WABA (sends, templates, reads). The
// Coexistence Tech Provider model requires the PER-PARTNER Business Integration
// System User token captured during Embedded Signup (integration.access_token)
// — it is the only token with a role on that customer's WABA. Our global
// system-user token (WHATSAPP_ACCESS_TOKEN) has NO role on a partner's WABA and
// returns error 100/subcode 33 on every call. We fall back to it only for WABAs
// that live inside our own Meta business (the demo/test WABA), where it works.
//
// NOTE: the per-partner token must carry whatsapp_business_messaging +
// whatsapp_business_management for /messages and /message_templates to succeed.
// That depends on the Embedded Signup config requesting those scopes (see the
// connect flow); a token scoped only to whatsapp_business_manage_events still
// fails — the partner must re-onboard once the config grants the messaging
// scopes.
export function partnerWabaToken(
  integration: { access_token?: string | null } | null | undefined,
): string {
  return integration?.access_token || process.env.WHATSAPP_ACCESS_TOKEN!;
}

// Upload media (image / video / document) to Meta's Resumable Upload API and
// return the file HANDLE that a message template's media HEADER needs as
// example.header_handle[0]. A raw URL is NOT accepted by template creation — it
// must be this handle. The handle is bound to the app (META_APP_ID) + the token,
// so callers MUST pass the SAME token createMetaTemplate will use for that
// partner's WABA (i.e. partnerWabaToken(integration)).
export async function uploadMediaToMetaForTemplate(
  bytes: Buffer,
  fileType: string,
  token: string,
  fileName = "header-media",
): Promise<string> {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID not configured");

  // 1. Open a resumable upload session.
  const startRes = await fetch(
    `${GRAPH_API_BASE}/${appId}/uploads?` +
      new URLSearchParams({
        file_name: fileName,
        file_length: String(bytes.length),
        file_type: fileType,
        access_token: token,
      }).toString(),
    { method: "POST" },
  );
  const startData = await startRes.json().catch(() => ({}));
  if (!startRes.ok || !startData?.id) {
    throw new Error(
      `Meta upload session failed (${startRes.status}): ${JSON.stringify(startData)}`,
    );
  }

  // 2. Upload the bytes in one shot (offset 0); Meta returns { h: "<handle>" }.
  const upRes = await fetch(`${GRAPH_API_BASE}/${startData.id}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${token}`,
      file_offset: "0",
    },
    // Wrap in a fresh ArrayBuffer-backed Uint8Array: a Node Buffer
    // (Buffer<ArrayBufferLike>) is not assignable to fetch's BodyInit type.
    body: new Uint8Array(bytes),
  });
  const upData = await upRes.json().catch(() => ({}));
  if (!upRes.ok || !upData?.h) {
    throw new Error(
      `Meta media upload failed (${upRes.status}): ${JSON.stringify(upData)}`,
    );
  }
  return upData.h as string;
}

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

// ─── Lightweight: Meta user_id from a token ──────────────────────
// Unlike getConnectedWabaInfo this does NOT require any WhatsApp scope, so it's
// safe for the Coexistence flow where the token is scoped only to
// whatsapp_business_manage_events. We still want the Meta user_id so the Data
// Deletion Callback can map a signed_request back to the partner. Returns null
// if it can't be read — never throws (the connection shouldn't fail over this).
export async function getTokenMetaUserId(
  accessToken: string,
): Promise<string | null> {
  try {
    const appAccessToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
    const res = await fetch(
      `${GRAPH_API_BASE}/debug_token?` +
        new URLSearchParams({
          input_token: accessToken,
          access_token: appAccessToken,
        }),
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.user_id || null;
  } catch (e) {
    console.error("getTokenMetaUserId failed:", e);
    return null;
  }
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
// Multi-number aware: a partner can connect MANY WhatsApp numbers. The row is
// keyed on phone_number_id — re-connecting the SAME number updates that row in
// place (token refresh), a NEW number INSERTs an additional row. The partner's
// FIRST number becomes the primary (default sender for system-initiated sends).
export async function saveWhatsAppIntegration(data: {
  partner_id: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  meta_user_id?: string | null;
}) {
  // Look up any existing row for THIS number (re-connect / token refresh) and
  // count the partner's existing numbers to decide whether this becomes primary.
  const checkQuery = `
    query CheckWhatsAppIntegration($partner_id: uuid!, $phone_number_id: String!) {
      byPhone: whatsapp_business_integrations(where: {phone_number_id: {_eq: $phone_number_id}}) {
        id
        partner_id
        is_primary
      }
      partnerRows: whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
        id
      }
    }
  `;

  const checkRes = await fetchFromHasura(checkQuery, {
    partner_id: data.partner_id,
    phone_number_id: data.phone_number_id,
  });

  const existing = checkRes?.byPhone?.[0] as
    | { id: string; partner_id: string; is_primary: boolean }
    | undefined;
  const partnerRowCount = checkRes?.partnerRows?.length || 0;

  // Best-effort: resolve the connected number's display phone (the number
  // customers actually message) so the storefront "Send Hi" button points at the
  // partner's WhatsApp — NOT their contact phone, which may be junk. Null if the
  // token can't read it; a backfill / later connect fills it in.
  let displayPhone: string | null = null;
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${data.phone_number_id}?fields=display_phone_number&access_token=${encodeURIComponent(
        data.access_token,
      )}`,
    );
    if (res.ok) {
      const d = await res.json();
      displayPhone = d?.display_phone_number || null;
    }
  } catch {
    /* ignore — leave null */
  }

  if (existing) {
    // This number already has a row. Update its credentials in place. If it was
    // previously connected by a DIFFERENT partner, reassign it (a phone number
    // lives in exactly one place) and make it primary when the new owner has no
    // other numbers. Same-partner re-connect preserves the existing primary flag.
    const reassigned = existing.partner_id !== data.partner_id;
    const mutation = `
      mutation UpdateWhatsAppIntegration($id: uuid!, $changes: whatsapp_business_integrations_set_input!) {
        update_whatsapp_business_integrations_by_pk(pk_columns: {id: $id}, _set: $changes) {
          id
        }
      }
    `;
    await fetchFromHasura(mutation, {
      id: existing.id,
      changes: {
        partner_id: data.partner_id,
        waba_id: data.waba_id,
        phone_number_id: data.phone_number_id,
        access_token: data.access_token,
        meta_user_id: data.meta_user_id ?? null,
        ...(displayPhone ? { display_phone: displayPhone } : {}),
        ...(reassigned ? { is_primary: partnerRowCount === 0 } : {}),
        updated_at: new Date().toISOString(),
      },
    });

    // If we took a number AWAY from its previous owner and it was that owner's
    // primary, promote their oldest surviving number so they keep a default
    // sender (mirrors the disconnect route's promotion). Otherwise the original
    // partner would be left with zero primaries.
    if (reassigned && existing.is_primary) {
      const remaining = await fetchFromHasura(
        `query RemainingAfterReassign($p: uuid!) {
          whatsapp_business_integrations(where: {partner_id: {_eq: $p}}, order_by: {updated_at: asc}, limit: 1) { id }
        }`,
        { p: existing.partner_id },
      );
      const next = remaining?.whatsapp_business_integrations?.[0];
      if (next?.id) {
        await fetchFromHasura(
          `mutation PromoteAfterReassign($id: uuid!) {
            update_whatsapp_business_integrations_by_pk(pk_columns: {id: $id}, _set: {is_primary: true}) { id }
          }`,
          { id: next.id },
        );
      }
    }
  } else {
    // A brand-new number for this partner. First number connected → primary.
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
        is_primary: partnerRowCount === 0,
        ...(displayPhone ? { display_phone: displayPhone } : {}),
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

/** A brand outlet that shares ONE WhatsApp number with the brand parent. */
export type BranchCandidate = {
  partner_id: string;
  access_token: string;
  flow_enabled: boolean;
  feature_flags: string | null;
  username: string | null;
  store_name: string | null;
};

// ─── Lookup partner by Phone Number ID ───────────────────────────
export async function getPartnerByPhoneNumberId(phoneNumberId: string) {
  const query = `
    query GetPartnerByPhoneNumber($phone_number_id: String!) {
      whatsapp_business_integrations(
        where: {phone_number_id: {_eq: $phone_number_id}}
        order_by: {updated_at: asc}
      ) {
        id
        partner_id
        phone_number_id
        access_token
        flow_enabled
        partner { feature_flags username store_name branch { parent_partner_id } }
      }
    }
  `;

  const res = await fetchFromHasura(query, {
    phone_number_id: phoneNumberId,
  });
  const rows = (res?.whatsapp_business_integrations ?? []) as Array<{
    id: string;
    partner_id: string;
    phone_number_id: string;
    access_token: string;
    flow_enabled: boolean;
    partner?: {
      feature_flags?: string | null;
      username?: string | null;
      store_name?: string | null;
      branch?: { parent_partner_id?: string | null } | null;
    } | null;
  }>;
  if (!rows.length) return null;
  // A brand can COPY its WhatsApp integration to every outlet (a shared number),
  // so ONE phone_number_id can map to many partner rows. Inbound (a customer's
  // "hi") must resolve to the number's OWNER — the brand's PARENT branch — not an
  // arbitrary outlet, or the reply runs the wrong partner's flow and its order
  // link points at the wrong store (e.g. a "welcome to Televery" message whose
  // link went to sm_houseware). Prefer the row whose partner IS its branch's
  // parent; otherwise the oldest row (the original connector). `order_by
  // updated_at asc` makes that deterministic — previously there was no order, so
  // `[0]` picked an undefined/arbitrary row.
  const row =
    rows.find(
      (r) =>
        !!r.partner?.branch?.parent_partner_id &&
        r.partner.branch.parent_partner_id === r.partner_id,
    ) ?? rows[0];
  // A shared number's OTHER rows are the brand's outlets. Surface the ones that
  // belong to THIS brand (their branch parent IS the chosen parent) so the
  // webhook can switch to a branch when the customer names it ("order from
  // spicechick") — reusing rows already in hand, no extra round-trip. Unrelated
  // shops that merely ride the same reseller number (branch parent unset/other)
  // are excluded, so a customer can never be handed a stranger's order link.
  const parentId = row.partner_id;
  const branchCandidates: BranchCandidate[] = rows
    .filter(
      (r) =>
        r.partner_id !== parentId &&
        !!r.partner?.branch?.parent_partner_id &&
        r.partner.branch.parent_partner_id === parentId,
    )
    .map((r) => ({
      partner_id: r.partner_id,
      access_token: r.access_token,
      flow_enabled: r.flow_enabled,
      feature_flags: r.partner?.feature_flags ?? null,
      username: r.partner?.username ?? null,
      store_name: r.partner?.store_name ?? null,
    }));
  // Flatten feature_flags onto the row so the cached webhook lookup can gate
  // WhatsApp features without an extra round-trip.
  return {
    id: row.id,
    partner_id: row.partner_id,
    phone_number_id: row.phone_number_id,
    access_token: row.access_token,
    flow_enabled: row.flow_enabled,
    feature_flags: row.partner?.feature_flags ?? null,
    branchCandidates,
  };
}

// Short-lived in-memory cache of the phone-number → partner mapping. This is the
// ONE sequential DB round-trip the inbound webhook does before its parallel read
// wave, so caching it on a warm serverless instance shaves real latency off the
// reply. Entries are tiny and integrations rarely change; a 60s TTL bounds the
// staleness window (a freshly rotated token / new integration applies within a
// minute). Per-instance only — no cross-instance coherency needed.
type PhoneNumberPartner = {
  id: string;
  partner_id: string;
  phone_number_id: string;
  access_token: string;
  flow_enabled: boolean;
  feature_flags: string | null;
  branchCandidates: BranchCandidate[];
} | null;

const PARTNER_BY_PHONE_TTL_MS = 60_000;
const partnerByPhoneCache = new Map<
  string,
  { at: number; value: PhoneNumberPartner }
>();

export async function getPartnerByPhoneNumberIdCached(
  phoneNumberId: string,
): Promise<PhoneNumberPartner> {
  if (!phoneNumberId) return null;
  const hit = partnerByPhoneCache.get(phoneNumberId);
  if (hit && Date.now() - hit.at < PARTNER_BY_PHONE_TTL_MS) return hit.value;
  const value = (await getPartnerByPhoneNumberId(phoneNumberId)) as PhoneNumberPartner;
  // Only cache positive hits — a miss may be a not-yet-provisioned integration
  // we want to re-check immediately on the next message.
  if (value) partnerByPhoneCache.set(phoneNumberId, { at: Date.now(), value });
  return value;
}

// ─── Fetch the partner's PRIMARY integration row (waba_id + access_token) ─
// A partner may have several connected numbers; this returns the one marked
// primary (the default sender for system-initiated messages), falling back to
// the oldest when no primary is set. Callers that must target a SPECIFIC number
// (inbox reply, broadcast) should resolve by phone_number_id instead.
export async function getPartnerWabaIntegration(partnerId: string): Promise<{
  id: string;
  partner_id: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
} | null> {
  const query = `
    query GetPartnerWabaIntegration($partner_id: uuid!) {
      whatsapp_business_integrations(
        where: {partner_id: {_eq: $partner_id}}
        order_by: {is_primary: desc, updated_at: asc}
        limit: 1
      ) {
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

// ─── Fetch ALL of a partner's connected numbers (primary first) ──
export async function getPartnerWabaIntegrations(partnerId: string): Promise<
  Array<{
    id: string;
    partner_id: string;
    waba_id: string;
    phone_number_id: string;
    access_token: string;
    display_phone: string | null;
    is_primary: boolean;
  }>
> {
  const query = `
    query GetPartnerWabaIntegrations($partner_id: uuid!) {
      whatsapp_business_integrations(
        where: {partner_id: {_eq: $partner_id}}
        order_by: {is_primary: desc, updated_at: asc}
      ) {
        id
        partner_id
        waba_id
        phone_number_id
        access_token
        display_phone
        is_primary
      }
    }
  `;
  const res = await fetchFromHasura(query, { partner_id: partnerId });
  return res?.whatsapp_business_integrations || [];
}

// ─── Resolve the send token for a SPECIFIC number ────────────────
// Flows reply from the exact number the customer messaged, so the token must be
// the one attached to THAT phone_number_id's row (not an arbitrary partner row).
// Returns null if the number isn't connected — caller falls back as it sees fit.
export async function getIntegrationByPhoneNumberId(
  phoneNumberId: string,
): Promise<{
  id: string;
  partner_id: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
} | null> {
  const query = `
    query GetIntegrationByPnid($phone_number_id: String!) {
      whatsapp_business_integrations(where: {phone_number_id: {_eq: $phone_number_id}}, limit: 1) {
        id
        partner_id
        waba_id
        phone_number_id
        access_token
      }
    }
  `;
  const res = await fetchFromHasura(query, { phone_number_id: phoneNumberId });
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
  | {
      type: "BODY";
      text?: string;
      example?: { body_text?: string[][] };
      // Authentication templates have no custom body text — Meta generates it.
      add_security_recommendation?: boolean;
    }
  | { type: "FOOTER"; text?: string; code_expiration_minutes?: number }
  | {
      type: "BUTTONS";
      buttons: Array<
        | { type: "QUICK_REPLY"; text: string }
        | { type: "URL"; text: string; url: string; example?: string[] }
        | { type: "PHONE_NUMBER"; text: string; phone_number: string }
        | {
            type: "OTP";
            otp_type: "COPY_CODE" | "ONE_TAP" | "ZERO_TAP";
            text?: string;
          }
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createMetaTemplate(
  wabaId: string,
  accessToken: string,
  payload: MetaTemplatePayload,
): Promise<{ id: string; status: string; category: string }> {
  const url = `${GRAPH_API_BASE}/${wabaId}/message_templates`;
  const init: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };

  // Meta's edge intermittently returns a 503 (empty body) / 429 on the template
  // WRITE path even when reads succeed. Auto-retry those transient failures with
  // backoff so a blip doesn't fail the partner. 4xx (real validation errors) are
  // returned immediately — retrying those is pointless and hides the reason.
  const MAX_ATTEMPTS = 3;
  let lastStatus = 0;
  let lastData: any = {};
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (e: any) {
      // Network-level failure (DNS/connection). Retry, then give a clear message.
      console.warn(
        `Meta createMetaTemplate network error (attempt ${attempt}/${MAX_ATTEMPTS}):`,
        e?.message || e,
      );
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 800);
        continue;
      }
      throw new Error(
        "Couldn't reach WhatsApp to submit the template. Check the connection and try again.",
      );
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;

    lastStatus = res.status;
    lastData = data;

    const transient = res.status >= 500 || res.status === 429;
    if (transient && attempt < MAX_ATTEMPTS) {
      console.warn(
        `Meta createMetaTemplate ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying`,
      );
      await sleep(attempt * 800); // 0.8s, then 1.6s
      continue;
    }
    break; // non-transient (4xx) or out of attempts
  }

  console.error("Meta createMetaTemplate failed:", lastStatus, lastData);
  throw new Error(formatMetaTemplateError(lastStatus, lastData));
}

// Turn a Meta Graph error into a clear, actionable message for the partner.
// Prefers Meta's own user-facing title/message; softens transient 5xx into a
// "try again" message instead of a raw status code.
export function formatMetaTemplateError(status: number, data: any): string {
  const err = data?.error || {};
  // Transient server-side issues at Meta — not the partner's fault.
  if (status >= 500) {
    return "WhatsApp's template service is temporarily unavailable. Please try again in a moment.";
  }
  if (status === 429 || err?.code === 80007 || err?.code === 130429) {
    return "Too many template requests right now. Wait a minute and try again.";
  }
  // Authentication (OTP) templates require a VERIFIED Meta business. Unverified
  // accounts get a generic "does not have permission" (code 10 / subcode
  // 2388185) — translate it into something actionable.
  if (
    err?.error_subcode === 2388185 ||
    (err?.code === 10 && /message template/i.test(String(err?.error_user_title || "")))
  ) {
    return "WhatsApp won't let this account create Authentication (OTP) templates yet — your Meta business must be verified first (Meta Business Manager → Security Center → Business verification). Utility and Marketing templates work without verification.";
  }
  const title = err?.error_user_title;
  const msg =
    err?.error_user_msg || err?.message || `WhatsApp rejected the template (HTTP ${status}).`;
  const detail = err?.error_data?.details;
  const base = title && title !== msg ? `${title}: ${msg}` : msg;
  return detail && !base.includes(detail) ? `${base} (${detail})` : base;
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

// ─── Provision our standard templates onto a partner's WABA ──────
// When a partner connects (Coexistence), copy our approved templates (OTP,
// order updates, etc.) onto THEIR WABA so they can send those messages from
// their own number — templates are per-WABA, so ours don't exist on theirs.
//
// Source = WHATSAPP_WABA_ID (our WABA). Auth = WHATSAPP_ACCESS_TOKEN (our
// system user has whatsapp_business_management; a partner's Coexistence token
// is manage_events-only and can't create templates). Entirely best-effort:
// returns a count and NEVER throws, so it can't block the connect. Common
// no-ops: WHATSAPP_WABA_ID unset, our token lacks access to the partner WABA,
// a template already exists, or Meta rejects a re-create.
export async function provisionPartnerTemplates(
  partnerWabaId: string,
): Promise<{ created: number; skipped: number; failed: number }> {
  const result = { created: 0, skipped: 0, failed: 0 };
  const sourceWabaId = process.env.WHATSAPP_WABA_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!sourceWabaId || !token) {
    console.warn(
      "provisionPartnerTemplates skipped: set WHATSAPP_WABA_ID (our source WABA) to enable copying templates to partner WABAs.",
    );
    return result;
  }

  let source: MetaTemplateListItem[];
  try {
    source = await listMetaTemplates(sourceWabaId, token);
  } catch (e) {
    console.error("provisionPartnerTemplates: failed to list source templates:", e);
    return result;
  }

  // Only copy APPROVED templates — drafts/pending/rejected aren't worth pushing.
  const toCopy = source.filter(
    (t) => (t.status || "").toUpperCase() === "APPROVED",
  );
  if (!toCopy.length) return result;

  // Skip any the partner already has (by name). If we can't even list the
  // partner's templates, our token has no access to their WABA — bail cleanly.
  let existingNames: Set<string>;
  try {
    const existing = await listMetaTemplates(partnerWabaId, token);
    existingNames = new Set(existing.map((t) => t.name));
  } catch (e) {
    console.error(
      "provisionPartnerTemplates: can't list partner templates (token lacks access to their WABA?):",
      e,
    );
    return result;
  }

  for (const t of toCopy) {
    if (existingNames.has(t.name)) {
      result.skipped++;
      continue;
    }
    try {
      await createMetaTemplate(partnerWabaId, token, {
        name: t.name,
        language: t.language,
        category: t.category as MetaTemplatePayload["category"],
        components: t.components,
      });
      result.created++;
    } catch (e) {
      console.error(`provisionPartnerTemplates: failed to create "${t.name}":`, e);
      result.failed++;
    }
  }

  console.log(
    `provisionPartnerTemplates(${partnerWabaId}): created=${result.created} skipped=${result.skipped} failed=${result.failed}`,
  );
  return result;
}
