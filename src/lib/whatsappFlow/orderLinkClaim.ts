import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Single-use ("session-locked") WhatsApp order links. The first person to open a
// link claims it; if the link is forwarded, anyone else who opens it is shown
// the expired screen. State lives in the `order_link_claims` table keyed by a
// hash of the token (the token itself never touches the DB), with a PRIMARY KEY
// on token_hash so the first INSERT wins atomically.

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Atomically claim an order link for its first opener. Returns true if THIS
 * caller claimed it (the first opener), false if it was already claimed (a
 * forwarded/shared link). Fails OPEN on unexpected DB errors so a transient
 * blip never blocks a legitimate first open.
 */
export async function claimOrderLink(
  token: string,
  partnerId: string,
  userId: string,
): Promise<boolean> {
  try {
    const res = await fetchFromHasura(
      `mutation ClaimOrderLink($o: order_link_claims_insert_input!) {
        insert_order_link_claims_one(object: $o) { token_hash }
      }`,
      { o: { token_hash: hashToken(token), partner_id: partnerId, user_id: userId } },
    );
    return !!res?.insert_order_link_claims_one?.token_hash;
  } catch (e: any) {
    const msg = String(e?.message || e);
    // PRIMARY KEY / unique violation = already claimed by someone else.
    if (/unique|duplicate|constraint|already exists/i.test(msg)) return false;
    console.error("claimOrderLink error:", e);
    return true; // fail open
  }
}

/**
 * Has this order link already been claimed? Returns the claim row (with the
 * user it was claimed for) or null. Fails OPEN (null = treat as unclaimed) so a
 * DB blip never wrongly shows the expired screen.
 */
export async function getOrderLinkClaim(
  token: string,
): Promise<{ user_id: string | null } | null> {
  try {
    const res = await fetchFromHasura(
      `query OrderLinkClaim($h: String!) {
        order_link_claims_by_pk(token_hash: $h) { user_id }
      }`,
      { h: hashToken(token) },
    );
    return res?.order_link_claims_by_pk || null;
  } catch (e) {
    console.error("getOrderLinkClaim error:", e);
    return null; // fail open
  }
}
