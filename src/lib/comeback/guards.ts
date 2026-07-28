/**
 * Pre-send safety checks for Comeback Messages.
 *
 * These run twice — once when a batch is built (so the partner sees an honest
 * preview) and again at approval (because hours pass in between and a number's
 * quality rating is a rolling score that can move overnight).
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { getPartnerDailyLimit } from "@/lib/whatsapp-broadcast";
import { MAX_QUOTA_SHARE, type BlockedReason } from "./config";
import { normalizeForPartner, identityKey, type PartnerDialContext } from "./phone";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

/**
 * Business-initiated messages this number has already sent today (UTC), across
 * EVERY category — order confirmations, OTPs, broadcasts, comeback.
 *
 * countSentToday() in whatsapp-broadcast.ts counts only whatsapp_broadcast_recipients
 * rows, so a busy restaurant that has already spent 190 of its 250-message tier on
 * order confirmations would look like it had spent nothing. Marketing must never
 * be the reason a customer's order confirmation fails to send, so the headroom
 * check reads the log that captures all of it.
 */
export async function sentTodayAllCategories(
  partnerId: string,
  phoneNumberId?: string | null,
): Promise<number> {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const query = `
    query ComebackSentToday($partner_id: uuid!, $since: timestamptz!${phoneNumberId ? ", $pnid: String!" : ""}) {
      whatsapp_message_logs_aggregate(
        where: {
          partner_id: { _eq: $partner_id }
          status: { _eq: "sent" }
          created_at: { _gte: $since }
          ${phoneNumberId ? "sent_from_phone_number_id: { _eq: $pnid }" : ""}
        }
      ) { aggregate { count } }
    }
  `;
  const vars: Record<string, unknown> = { partner_id: partnerId, since: midnight.toISOString() };
  if (phoneNumberId) vars.pnid = phoneNumberId;
  try {
    const data = await fetchFromHasuraServer(query, vars);
    return data?.whatsapp_message_logs_aggregate?.aggregate?.count || 0;
  } catch (e) {
    console.error("[comeback] sentTodayAllCategories failed:", e);
    // Fail CLOSED: an unknown quota reads as fully consumed, so a Hasura blip
    // pauses marketing rather than letting it run unmetered into the tier cap.
    return Number.MAX_SAFE_INTEGER;
  }
}

/** How many comeback messages this number may still send today. */
export async function comebackHeadroom(
  partnerId: string,
  phoneNumberId?: string | null,
): Promise<{ limit: number; used: number; headroom: number }> {
  const [limit, used] = await Promise.all([
    getPartnerDailyLimit(partnerId, phoneNumberId),
    sentTodayAllCategories(partnerId, phoneNumberId),
  ]);
  const budget = Math.floor(limit * MAX_QUOTA_SHARE);
  return { limit, used, headroom: Math.max(0, Math.min(budget, limit - used)) };
}

/**
 * Every phone that must not be contacted, as identity keys.
 *
 * Opt-outs are stored per-partner, but one phone_number_id on this platform is
 * shared by 32 partners. To the customer that is a single WhatsApp contact: if
 * they told one restaurant to stop and another kept messaging from the same
 * number, they would (reasonably) block or report it, and the damage lands on a
 * number all 32 depend on for order confirmations. So for a shared number we
 * honour the opt-outs of every partner sending from it.
 */
export async function blockedIdentities(
  partnerId: string,
  phoneNumberId: string | null,
  partner: PartnerDialContext,
): Promise<Set<string>> {
  const siblingQuery = `
    query ComebackOptOutScope($pnid: String!) {
      whatsapp_business_integrations(where: { phone_number_id: { _eq: $pnid } }) { partner_id }
    }
  `;
  let partnerIds = [partnerId];
  if (phoneNumberId) {
    try {
      const sib = await fetchFromHasuraServer(siblingQuery, { pnid: phoneNumberId });
      const ids = (sib?.whatsapp_business_integrations || []).map((r: any) => r.partner_id);
      if (ids.length) partnerIds = Array.from(new Set([partnerId, ...ids]));
    } catch (e) {
      console.error("[comeback] opt-out scope lookup failed:", e);
    }
  }

  const query = `
    query ComebackOptOuts($pids: [uuid!]!) {
      whatsapp_broadcast_optouts(where: { partner_id: { _in: $pids } }) { phone }
    }
  `;
  const out = new Set<string>();
  try {
    const data = await fetchFromHasuraServer(query, { pids: partnerIds });
    for (const row of data?.whatsapp_broadcast_optouts || []) {
      // Opt-out rows are written by the webhook from Meta's country-code-prefixed
      // "from", while audience phones are normalised from local digits. Compare on
      // the identity key so the two shapes actually meet.
      const n = normalizeForPartner(String(row.phone || ""), partner);
      if (n.ok) out.add(identityKey(n.value.e164));
      else out.add(String(row.phone || "").replace(/\D/g, "").slice(-9));
    }
  } catch (e) {
    console.error("[comeback] opt-out fetch failed:", e);
    // Fail closed by signalling the caller, not by returning an empty set.
    throw new Error("optout_fetch_failed");
  }
  return out;
}

export interface Readiness {
  ok: boolean;
  reason?: BlockedReason;
  detail?: string;
  phoneNumberId: string | null;
  qualityRating: string | null;
  numberStatus: string | null;
}

/**
 * Live state of the sending number, read from Meta rather than the local mirror.
 *
 * A three-way judgement, not a demand for GREEN: Meta returns UNKNOWN for numbers
 * with too little recent volume, which is the normal state for exactly the small
 * restaurants this feature is for. Requiring GREEN would block almost everyone.
 */
export async function checkNumberQuality(
  phoneNumberId: string,
  token: string,
): Promise<{ quality: string | null; status: string | null }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}?` +
        new URLSearchParams({
          fields: "quality_rating,status,name_status",
          access_token: token,
        }),
    );
    if (!res.ok) return { quality: null, status: null };
    const d = await res.json();
    return { quality: d?.quality_rating ?? null, status: d?.status ?? null };
  } catch {
    return { quality: null, status: null };
  }
}

/** True when the number is in a state where sending marketing would be reckless. */
export function qualityBlocks(quality: string | null, status: string | null): string | null {
  const q = (quality || "").toUpperCase();
  const s = (status || "").toUpperCase();
  if (q === "RED") return "your number's quality rating is low right now";
  if (s === "FLAGGED") return "WhatsApp has flagged your number";
  if (s === "RESTRICTED") return "your number is currently restricted by WhatsApp";
  return null;
}
