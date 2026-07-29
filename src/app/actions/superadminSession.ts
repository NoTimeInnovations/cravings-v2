"use server";

import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { decryptText, encryptText } from "@/lib/encrtption";
import { getAuthCookie, setAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { AUTH_COOKIE, SUPERADMIN_PARENT_COOKIE } from "@/lib/sessionCookies";

/**
 * Superadmin → partner SESSION SWAP.
 *
 * "Manage" on a partner in Edit Partners signs the superadmin in AS that
 * partner: the auth cookie is re-minted with `{id: <partnerId>, role: "partner"}`
 * and the browser hard-loads /admin-v2, which is then that partner's own
 * dashboard. Every store, every server action and every write resolves the
 * partner from the session, so nothing has to be threaded a partner id.
 *
 * Deliberately the same mechanism as the Televery swap
 * (src/app/actions/televerySession.ts) rather than a new one — the reasoning
 * there about why a swap beats "render admin-v2 for partnerId" applies verbatim:
 * 76 admin-v2 components read useAuthStore().userData directly and six Zustand
 * stores hardcode their WRITES to userData.id, so a threaded id risks viewing
 * one partner while saving to another.
 *
 * It differs from the Televery swap in exactly two ways, both widening:
 *
 *   1. no membership check. Televery may only enter outlets in its own brand;
 *      a superadmin may enter ANY partner, so the only gate is the caller's own
 *      role;
 *   2. the way back restores the SUPERADMIN session, which is the most powerful
 *      session on the platform. That makes the marker cookie a bigger capability
 *      than Televery's, and it is why the fingerprint binding below is not
 *      optional.
 *
 * ⚠ This is real impersonation, not a read-only view. While the swap is live the
 * superadmin has the partner's full write access — menu, prices, orders,
 * settings, payouts — and nothing audit-logs it. There is no record separating
 * actions taken by the partner from actions taken by a superadmin acting as
 * them. If that ever matters, log enter/exit here and stamp mutations with the
 * acting superadmin id.
 */

/** Matched to the auth cookie's own 30 days: a marker must never expire out
 *  from under the session it marks, or a swap silently becomes an UNMARKED
 *  impersonation — no banner, no way back, full write access still live. */
const PARENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const PARTNER_SESSION_QUERY = `
query SuperadminPartnerSession($id: uuid!) {
  partners_by_pk(id: $id) {
    id
    username
    store_name
    status
    feature_flags
    subscription_details
  }
}`;

/**
 * Superadmins are NOT partners — they live in their own `super_admin` table, so
 * the way back has to look there. Querying partners_by_pk for a superadmin id
 * always returns null, which surfaced as "Superadmin account not found" on every
 * Exit and stranded the session inside the partner dashboard.
 */
const SUPERADMIN_QUERY = `
query SuperadminById($id: uuid!) {
  super_admin_by_pk(id: $id) { id email }
}`;

const MANAGED_PARTNER_QUERY = `
query SuperadminManagedPartner($id: uuid!) {
  partners_by_pk(id: $id) { id username store_name }
}`;

/**
 * SHA-256 of the raw auth cookie CIPHERTEXT — the identity of one specific
 * session instance. encryptText salts randomly per call, so re-minting the same
 * payload yields different ciphertext; that is what makes this usable as "this
 * exact session" when a partner id is not (ids repeat, sessions do not).
 */
function fingerprintOf(rawAuthCookie: string) {
  return createHash("sha256").update(rawAuthCookie).digest("hex");
}

async function readRawAuthCookie() {
  return (await cookies()).get(AUTH_COOKIE)?.value || null;
}

/** getAuthCookie decrypts, and decryptText THROWS on a corrupt/re-keyed value. */
async function readAuthSession() {
  try {
    return await getAuthCookie();
  } catch {
    return null;
  }
}

/**
 * Write the marker. Must run AFTER the partner's auth cookie is minted — it
 * binds to it.
 *
 * Everything travels packed into `id` as
 * "<superadminId>|<partnerId>|<nonce>|<fingerprint>":
 *   superadminId — whose session Exit hands back. From the SESSION, never the client.
 *   partnerId    — who may redeem it (auth.id must equal it).
 *   nonce        — 128 random bits, so no two swaps mint the same marker.
 *   fingerprint  — of the auth cookie this swap just minted, pinning the marker
 *                  to one session rather than to whoever is that partner later.
 */
async function setParentCookie(superadminId: string, partnerId: string) {
  const rawAuth = await readRawAuthCookie();
  if (!rawAuth) {
    // Never leave an UNBOUND marker behind; the caller rolls the swap back.
    throw new Error("No auth cookie to bind the superadmin parent cookie to.");
  }

  const encrypted = encryptText({
    id: [
      superadminId,
      partnerId,
      randomBytes(16).toString("hex"),
      fingerprintOf(rawAuth),
    ].join("|"),
    role: "superadmin",
    feature_flags: "",
    status: "managing",
  });

  (await cookies()).set(SUPERADMIN_PARENT_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: PARENT_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
}

async function readParentCookie(): Promise<{
  superadminId: string;
  partnerId: string;
  fingerprint: string;
} | null> {
  const raw = (await cookies()).get(SUPERADMIN_PARENT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const data = decryptText(raw);
    if (data?.role !== "superadmin") return null;
    const [superadminId, partnerId, nonce, fingerprint] = String(data.id || "").split("|");
    // All four required — a value missing any is truncated or legacy, and an
    // unbound marker is exactly what this shape exists to prevent.
    if (!superadminId || !partnerId || !nonce || !fingerprint) return null;
    return { superadminId, partnerId, fingerprint };
  } catch {
    return null;
  }
}

/**
 * The single place that decides whether a swap is live, so the banner and the
 * Exit control can never disagree.
 *
 * Live means all three: a well-formed marker, the current session IS the partner
 * it was minted for, and it is the very session it was minted alongside.
 */
async function readActiveSwap(): Promise<{
  superadminId: string;
  partnerId: string;
} | null> {
  const parent = await readParentCookie();
  if (!parent) return null;

  const auth = await readAuthSession();
  if (!auth?.id || auth.role !== "partner" || auth.id !== parent.partnerId) {
    return null;
  }

  const rawAuth = await readRawAuthCookie();
  if (!rawAuth || fingerprintOf(rawAuth) !== parent.fingerprint) return null;

  return { superadminId: parent.superadminId, partnerId: parent.partnerId };
}

async function clearParentCookie() {
  (await cookies()).delete(SUPERADMIN_PARENT_COOKIE);
}

/** Put the caller's own session back after a swap that failed halfway. */
async function restoreSession(
  session: NonNullable<Awaited<ReturnType<typeof getAuthCookie>>>,
) {
  try {
    await setAuthCookie({
      id: session.id,
      role: session.role,
      feature_flags: session.feature_flags || "",
      status: session.status || "inactive",
      hasSubscription: session.hasSubscription,
    });
  } catch (err) {
    console.error("superadmin session rollback failed:", err);
  }
}

/**
 * Swap the superadmin's session for the partner's.
 *
 * The client must HARD-navigate (window.location.href = "/admin-v2"), never
 * router.push: only a full reload re-runs AuthInitializer → fetchUser, and
 * without it userData stays the superadmin's while the cookie says otherwise.
 */
export async function enterPartnerSession(
  partnerId: string,
): Promise<{ ok: boolean; error?: string }> {
  let sessionBefore: Awaited<ReturnType<typeof getAuthCookie>> = null;
  let swapped = false;

  try {
    if (!partnerId) return { ok: false, error: "No partner selected." };

    const auth = await readAuthSession();
    if (!auth?.id || auth.role !== "superadmin") {
      return { ok: false, error: "Only a superadmin can do this." };
    }
    sessionBefore = auth;

    // From the SESSION, never a client-supplied id.
    const superadminId = auth.id;

    const data = await fetchFromHasuraServer(PARTNER_SESSION_QUERY, { id: partnerId });
    const partner = data?.partners_by_pk;
    if (!partner?.id) return { ok: false, error: "That partner no longer exists." };

    // Session FIRST, marker second — the fingerprint comes from the cookie this
    // call mints, so it cannot be written before it. keepParentSession is the
    // one opt-out of "any session change clears every marker", and it is safe
    // only because the very next line writes a marker bound to this new session.
    // Set before the await: if setAuthCookie throws part-way we cannot know
    // whether the cookie was written, so rollback must assume it was.
    swapped = true;
    await setAuthCookie(
      {
        id: partner.id,
        role: "partner",
        feature_flags: partner.feature_flags || "",
        status: partner.status || "inactive",
        hasSubscription: !!partner.subscription_details,
      },
      { keepParentSession: true },
    );

    await setParentCookie(superadminId, partner.id);

    return { ok: true };
  } catch (err) {
    console.error("enterPartnerSession failed:", err);
    // On failure the client stays on the superadmin page, so the SESSION has to
    // stay the superadmin's too — returning an error while the browser quietly
    // holds a partner's cookie is the worst of both worlds.
    if (swapped && sessionBefore) await restoreSession(sessionBefore);
    return { ok: false, error: "Could not open that dashboard. Try again." };
  }
}

/**
 * Undo the swap and restore the superadmin session. The client hard-navigates to
 * /superadmin afterwards, same reload reasoning as above.
 */
export async function returnToSuperadminSession(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    // Redeemable ONLY by the exact session it was minted for. A leftover marker
    // — signed out, then someone else signed in on this device — fails the
    // fingerprint and is destroyed rather than honoured. Honouring it would hand
    // an unrelated partner a SUPERADMIN session.
    const swap = await readActiveSwap();
    if (!swap) {
      await clearParentCookie();
      return { ok: false, error: "No superadmin session to return to." };
    }

    const res = await fetchFromHasuraServer(SUPERADMIN_QUERY, {
      id: swap.superadminId,
    });
    const sa = res?.super_admin_by_pk;
    if (!sa?.id) {
      await clearParentCookie();
      return { ok: false, error: "Superadmin account not found." };
    }

    // Mirrors what signInSuperAdmin writes: a superadmin has no feature flags and
    // no subscription, and is always "active". Carrying the partner's values over
    // would leave the restored session gated by the shop it just exited.
    await setAuthCookie({
      id: sa.id,
      role: "superadmin",
      feature_flags: "",
      status: "active",
    });
    await clearParentCookie();

    return { ok: true };
  } catch (err) {
    console.error("returnToSuperadminSession failed:", err);
    return { ok: false, error: "Could not return to superadmin. Try again." };
  }
}

/**
 * Server-side context for the "you are managing X" banner, resolved in
 * /admin-v2's layout.
 *
 * Read-only by design: this runs from a LAYOUT where the cookie store is not
 * mutable, so it must never try to clear a stale marker — and must never throw,
 * because an exception here is a 500 on the whole dashboard.
 */
export async function getSuperadminManagedContext(): Promise<{
  managing: boolean;
  partnerName?: string;
}> {
  try {
    const swap = await readActiveSwap();
    if (!swap) return { managing: false };

    // The name is cosmetic: a failed lookup must NOT hide the banner. Showing it
    // unnamed beats silently impersonating with no warning at all.
    try {
      const res = await fetchFromHasuraServer(MANAGED_PARTNER_QUERY, {
        id: swap.partnerId,
      });
      const p = res?.partners_by_pk;
      return { managing: true, partnerName: p?.store_name || p?.username || undefined };
    } catch (err) {
      console.error("getSuperadminManagedContext name lookup failed:", err);
      return { managing: true };
    }
  } catch (err) {
    console.error("getSuperadminManagedContext failed:", err);
    return { managing: false };
  }
}
