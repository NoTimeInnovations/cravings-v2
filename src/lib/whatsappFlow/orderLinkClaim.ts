import crypto from "crypto";
import { cookies } from "next/headers";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Single-use ("session-locked") WhatsApp order links. The first person to open a
// link claims it: we mint a random claim id, store it on the claim row (atomic
// INSERT — PK on a hash of the token, so the first opener wins) AND set it as a
// cookie on that visitor's browser. Only a visitor whose cookie matches the
// stored claim id may use the link for its 10-minute lifetime — anyone the link
// is forwarded to has no matching cookie and is shown the expired screen.

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Per-token cookie name (short + stable). The token itself never goes in a cookie.
function claimCookieName(token: string): string {
  return `olt_${hashToken(token).slice(0, 16)}`;
}

const CLAIM_TTL_SECONDS = 10 * 60; // matches the auth order-link token TTL

/**
 * Atomically claim an order link for its first opener. On the first claim it
 * mints a random claim id, stores it on the claim row, and sets it as a cookie
 * on the caller's browser. Returns true if THIS caller claimed it (first opener),
 * false if it was already claimed (a forwarded/shared link). Fails OPEN on
 * unexpected (non-conflict) DB errors so a transient blip never blocks a
 * legitimate first open. MUST be called from a server action / route handler
 * (it sets a cookie).
 */
export async function claimOrderLink(
  token: string,
  partnerId: string,
  userId: string,
): Promise<boolean> {
  const claimId = crypto.randomBytes(16).toString("hex");
  try {
    const res = await fetchFromHasura(
      `mutation ClaimOrderLink($o: order_link_claims_insert_input!) {
        insert_order_link_claims_one(object: $o) { token_hash }
      }`,
      {
        o: {
          token_hash: hashToken(token),
          claim_id: claimId,
          partner_id: partnerId,
          user_id: userId,
        },
      },
    );
    if (!res?.insert_order_link_claims_one?.token_hash) return false;
  } catch (e: any) {
    const msg = String(e?.message || e);
    // PRIMARY KEY / unique violation = already claimed (forwarded link).
    if (/unique|duplicate|constraint|already exists/i.test(msg)) return false;
    console.error("claimOrderLink error:", e);
    // fail open: fall through and still bind a cookie so the opener isn't locked out.
  }
  try {
    (await cookies()).set(claimCookieName(token), claimId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: CLAIM_TTL_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  } catch {
    /* no request/cookie context — ignore */
  }
  return true;
}

/**
 * Is the order link locked to a DIFFERENT visitor? True when the link has been
 * claimed and the current request's cookie does NOT match the stored claim id
 * (a forwarded link opened by someone other than the first opener). False when
 * the link is unclaimed (the first opener may still claim it) or when the
 * cookie matches. Fails OPEN (false) on DB errors so a blip never wrongly
 * expires a valid link. Safe from a server component (read-only).
 */
export async function isOrderLinkLockedToOther(token: string): Promise<boolean> {
  let claimId: string | null | undefined;
  try {
    const res = await fetchFromHasura(
      `query OrderLinkClaim($h: String!) {
        order_link_claims_by_pk(token_hash: $h) { claim_id }
      }`,
      { h: hashToken(token) },
    );
    const row = res?.order_link_claims_by_pk;
    if (!row) return false; // not claimed yet — the first opener may still claim it
    claimId = row.claim_id;
  } catch (e) {
    console.error("isOrderLinkLockedToOther error:", e);
    return false; // fail open
  }
  if (!claimId) return false; // claimed without an id (legacy) — can't match, don't lock
  let cookieVal: string | undefined;
  try {
    cookieVal = (await cookies()).get(claimCookieName(token))?.value;
  } catch {
    cookieVal = undefined;
  }
  return cookieVal !== claimId; // locked unless this browser holds the matching id
}
