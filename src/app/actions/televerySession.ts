"use server";

import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { decryptText, encryptText } from "@/lib/encrtption";
import { getAuthCookie, setAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { TELEVERY_ROLE, isTeleveryPartner } from "@/lib/televery";
import { AUTH_COOKIE, TELEVERY_PARENT_COOKIE } from "@/lib/sessionCookies";

/**
 * Televery → outlet SESSION SWAP.
 *
 * Clicking "Manage" on a connected business signs Televery in AS that outlet:
 * the auth cookie is re-minted with `{id: <outletId>, role: "partner"}` and the
 * browser hard-loads /admin-v2, which is then the outlet's own dashboard —
 * every store, every server action, every write resolves the partner from the
 * session, so nothing has to be threaded a partner id.
 *
 * Why a swap and not "render admin-v2 for partnerId": 76 of ~199 admin-v2
 * components read useAuthStore().userData directly, six Zustand stores resolve
 * the partner from getState().userData with their WRITES hardcoded to
 * userData.id (see menuStore_hasura.ts), and 25 places compare
 * `role === "partner"` by equality. Threading an id through that would risk
 * VIEWING outlet X while SAVING to Televery's own row.
 *
 * ⚠ This is real impersonation, not a read-only view: while the swap is active
 * Televery has the outlet's full write access (menu, prices, orders, settings,
 * payouts). Nothing audit-logs it today — there is no record of which actions
 * were taken by the outlet itself vs. by Televery acting as it. If that ever
 * matters, log here (enter/exit) and stamp mutations with the parent id.
 *
 * The way back is `televery_parent_session`: a second httpOnly cookie holding
 * the Televery parent id, minted here and consumed by returnToTeleverySession.
 * Treat it as a CAPABILITY — redeeming it grants Televery's session, and with it
 * every outlet in the brand — so its lifetime is tied to the swapped session at
 * both ends: it is bound to that session when minted (setParentCookie), and any
 * later auth write destroys it (setAuthCookie / removeAuthCookie).
 *
 * NOTE: deliberately NOT routed through signInPartnerWithEmail/addAccount. That
 * path persists every outlet's PLAINTEXT password into
 * localStorage["my_accounts"] (src/lib/addAccount.ts) and would leave each
 * managed outlet permanently switchable-to on that device even after sign-out.
 * Password-less server-side minting has precedent in
 * src/app/actions/autoLoginFromOrderToken.ts.
 */

/**
 * Matched to the auth cookie's own 30 days (setAuthCookie) DELIBERATELY: the
 * marker must never be able to expire out from under the session it marks.
 *
 * It used to be 12 hours, which meant a swap quietly turned into an UNMARKED
 * impersonation at hour 12 — banner gone, "Exit to marketplace" gone, but the
 * session still the outlet's with full write access for the auth cookie's
 * remaining 29 days. Expiry was never the control that ends a swap anyway:
 * sign-out and every other login clear it outright (removeAuthCookie /
 * setAuthCookie), and Exit stays available for exactly as long as the swapped
 * session exists.
 */
const PARENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — same as the auth cookie

// Membership proof + the outlet's session fields in ONE round-trip. The
// `branches where parent_partner_id = caller` shape is the same brand-membership
// check /api/televery/overview uses; nesting the outlet filter inside it means a
// row can only come back if it really belongs to the CALLER'S OWN brand.
const OUTLET_SESSION_QUERY = `
query TeleveryOutletSession($parent_partner_id: uuid!, $outlet_id: uuid!) {
  branches(where: { parent_partner_id: { _eq: $parent_partner_id } }, limit: 1) {
    id
    outlets(where: { id: { _eq: $outlet_id } }, limit: 1) {
      id
      username
      store_name
      status
      feature_flags
      subscription_details
    }
  }
}`;

// The Televery row itself, re-read on the way back so the restored session
// carries current flags/status rather than whatever they were 12 hours ago.
const PARENT_SESSION_QUERY = `
query TeleveryParentSession($id: uuid!) {
  partners_by_pk(id: $id) {
    id
    username
    store_name
    status
    feature_flags
    subscription_details
  }
}`;

const MANAGED_OUTLET_QUERY = `
query TeleveryManagedOutlet($id: uuid!) {
  partners_by_pk(id: $id) {
    id
    username
    store_name
  }
}`;

/**
 * SHA-256 of the raw auth cookie CIPHERTEXT — the fingerprint of one specific
 * session instance.
 *
 * `encryptText` runs AES with a fresh random salt per call, so re-minting the
 * very same {id, role, flags, status} produces a different ciphertext every
 * time. That makes the ciphertext a usable identity for "this exact session",
 * which is precisely what an outlet id is NOT: outlet ids repeat, sessions
 * don't.
 */
function fingerprintOf(rawAuthCookie: string) {
  return createHash("sha256").update(rawAuthCookie).digest("hex");
}

/** The auth cookie as stored, un-decrypted. */
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
 * Write the parent cookie. Must be called AFTER the outlet's auth cookie is
 * minted — it binds to it.
 *
 * `encryptText` only serializes {id, role, feature_flags, status}, so everything
 * travels packed into `id` as "<parentId>|<outletId>|<nonce>|<fingerprint>":
 *
 *  - parentId    — whose session Exit hands back. From the SESSION, never the client.
 *  - outletId    — which partner may redeem it (auth.id must equal it).
 *  - nonce       — 128 random bits, so two swaps of the same parent→outlet pair never
 *                  mint the same marker and an old one can never be mistaken for
 *                  the current one.
 *  - fingerprint — of the auth cookie THIS swap just minted. This is what pins the
 *                  marker to one session rather than to "whoever happens to be that
 *                  outlet later": any subsequent setAuthCookie (a real login by the
 *                  outlet's owner, an account switch) writes a different ciphertext,
 *                  so the fingerprint stops matching and the marker is inert.
 *
 * The fingerprint is belt-and-braces on top of setAuthCookie clearing the marker
 * outright — it still holds if some future auth path forgets to clear it.
 */
async function setParentCookie(parentId: string, outletId: string) {
  const rawAuth = await readRawAuthCookie();
  if (!rawAuth) {
    // Refuse to leave an UNBOUND marker behind; the caller rolls the swap back.
    throw new Error("No auth cookie to bind the televery parent cookie to.");
  }

  const encrypted = encryptText({
    id: [
      parentId,
      outletId,
      randomBytes(16).toString("hex"),
      fingerprintOf(rawAuth),
    ].join("|"),
    role: TELEVERY_ROLE,
    feature_flags: "",
    status: "managing",
  });

  (await cookies()).set(TELEVERY_PARENT_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: PARENT_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
}

async function readParentCookie(): Promise<{
  parentId: string;
  outletId: string;
  fingerprint: string;
} | null> {
  const raw = (await cookies()).get(TELEVERY_PARENT_COOKIE)?.value;
  if (!raw) return null;

  try {
    const data = decryptText(raw);
    if (data?.role !== TELEVERY_ROLE) return null;
    const [parentId, outletId, nonce, fingerprint] = String(data.id || "").split("|");
    // All four parts required: a value missing any of them is a legacy or
    // truncated marker, and an unbound marker is the bug this shape fixes.
    if (!parentId || !outletId || !nonce || !fingerprint) return null;
    return { parentId, outletId, fingerprint };
  } catch {
    // Tampered / re-keyed / legacy value — treat as absent.
    return null;
  }
}

/**
 * The one place that decides whether a swap is live, so the banner and the Exit
 * control can never disagree about it.
 *
 * Live means all three: a well-formed marker, the current session is the outlet
 * it was minted for, and that session is the very one it was minted alongside
 * (fingerprint). Anything else is a leftover and reads as "no swap".
 */
async function readActiveSwap(): Promise<{
  parentId: string;
  outletId: string;
} | null> {
  const parent = await readParentCookie();
  if (!parent) return null;

  const auth = await readAuthSession();
  if (!auth?.id || auth.role !== "partner" || auth.id !== parent.outletId) {
    return null;
  }

  const rawAuth = await readRawAuthCookie();
  if (!rawAuth || fingerprintOf(rawAuth) !== parent.fingerprint) return null;

  return { parentId: parent.parentId, outletId: parent.outletId };
}

async function clearParentCookie() {
  (await cookies()).delete(TELEVERY_PARENT_COOKIE);
}

/**
 * Put the caller's OWN session back after a swap that failed halfway. Plain
 * setAuthCookie, so it also clears the parent marker.
 */
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
    console.error("televery session rollback failed:", err);
  }
}

/**
 * Swap the caller's Televery session for the outlet's partner session.
 *
 * The client must HARD-navigate (window.location.href = "/admin-v2") afterwards,
 * never router.push: only a full reload re-runs AuthInitializer → fetchUser, and
 * without it userData stays Televery's while the cookie says otherwise. Same
 * reason documented on AdminAccountSwitcher's account switch.
 */
export async function enterOutletSession(
  partnerId: string,
): Promise<{ ok: boolean; error?: string }> {
  // Kept outside the try so the catch can undo a half-finished swap.
  let sessionBefore: Awaited<ReturnType<typeof getAuthCookie>> = null;
  let swapped = false;

  try {
    if (!partnerId) return { ok: false, error: "No business selected." };

    const auth = await readAuthSession();
    if (!auth?.id || auth.role !== TELEVERY_ROLE) {
      return { ok: false, error: "Only the marketplace account can do this." };
    }
    sessionBefore = auth;

    // The parent is the SESSION, never a client-supplied id.
    const parentId = auth.id;

    // Televery is itself a member row of its own brand — managing "itself" would
    // just downgrade the session to a plain partner one. Refuse.
    if (partnerId === parentId) {
      return { ok: false, error: "That is your own marketplace account." };
    }

    const data = await fetchFromHasuraServer(OUTLET_SESSION_QUERY, {
      parent_partner_id: parentId,
      outlet_id: partnerId,
    });

    const outlet = data?.branches?.[0]?.outlets?.[0] ?? null;
    if (!outlet?.id) {
      return {
        ok: false,
        error: "That business is not connected to your account.",
      };
    }

    // Session FIRST, marker second — the marker's fingerprint is taken from the
    // auth cookie this call mints, so it cannot be written before it.
    //
    // `keepTeleveryParent` is the one opt-out of setAuthCookie's "any session
    // change invalidates the marker" rule, and it is safe only because the very
    // next line replaces the marker with one bound to this new session.
    // Flags/status come from the OUTLET row, so middleware and the feature gates
    // see the outlet's real entitlements — not Televery's.
    // Set BEFORE the await, not after: if setAuthCookie throws part-way we
    // cannot know whether the cookie was written, so the rollback has to assume
    // it was. Restoring a session that never changed is a no-op.
    swapped = true;
    await setAuthCookie(
      {
        id: outlet.id,
        role: "partner",
        feature_flags: outlet.feature_flags || "",
        status: outlet.status || "inactive",
        hasSubscription: !!outlet.subscription_details,
      },
      { keepTeleveryParent: true },
    );

    await setParentCookie(parentId, outlet.id);

    return { ok: true };
  } catch (err) {
    console.error("enterOutletSession failed:", err);

    // The client stays on the marketplace page when we return !ok, so the
    // SESSION has to stay Televery's as well. Returning an error while the
    // browser silently holds the outlet's cookie would be the worst of both
    // worlds: signed in as someone else's business, no banner, no way back.
    if (swapped && sessionBefore) await restoreSession(sessionBefore);

    return { ok: false, error: "Could not open that dashboard. Try again." };
  }
}

/**
 * Undo the swap: restore the Televery marketplace session and drop the parent
 * cookie. The client hard-navigates to /televeryDashboard afterwards (same
 * reload reasoning as above — authStore.fetchUser has a televery branch that
 * rehydrates userData from the restored cookie).
 */
export async function returnToTeleverySession(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    // Redeemable ONLY by the exact session it was minted for — not merely by
    // "this outlet". A leftover marker (signed out, then someone else signed in
    // on this device) fails the fingerprint and is destroyed rather than
    // honoured; honouring it would hand an unrelated partner Televery's session
    // and with it every other outlet in the brand.
    const swap = await readActiveSwap();
    if (!swap) {
      await clearParentCookie();
      return { ok: false, error: "No marketplace session to return to." };
    }

    const res = await fetchFromHasuraServer(PARENT_SESSION_QUERY, {
      id: swap.parentId,
    });
    const partner = res?.partners_by_pk;

    // Belt and braces: the `televery` role is only ever minted for the one
    // account that is allowed into the marketplace dashboard.
    if (!partner?.id || !isTeleveryPartner(partner)) {
      await clearParentCookie();
      return { ok: false, error: "Marketplace account not found." };
    }

    await setAuthCookie({
      id: partner.id,
      role: TELEVERY_ROLE,
      feature_flags: partner.feature_flags || "",
      status: partner.status || "inactive",
      hasSubscription: !!partner.subscription_details,
    });
    await clearParentCookie();

    return { ok: true };
  } catch (err) {
    console.error("returnToTeleverySession failed:", err);
    return { ok: false, error: "Could not return to the marketplace. Try again." };
  }
}

/**
 * Server-side context for the "you are managing X" banner, resolved in
 * /admin-v2's layout.
 *
 * Reports `managing` only for a live swap (readActiveSwap) — the same test
 * returnToTeleverySession redeems on, so the banner is shown exactly when the
 * Exit button will work. An ordinary partner who signs in on this device after a
 * swap gets no banner and no Exit.
 *
 * Read-only by design: this runs from a LAYOUT, where the cookie store is not
 * mutable, so it must never try to clear a stale marker. And it must never
 * throw — an exception here is a 500 on the whole dashboard.
 */
export async function getManagedOutletContext(): Promise<{
  managing: boolean;
  outletName?: string;
}> {
  try {
    const swap = await readActiveSwap();
    if (!swap) return { managing: false };

    // The name is cosmetic, so a failed lookup must NOT hide the banner —
    // showing it unnamed is far better than silently impersonating with no
    // warning at all.
    try {
      const res = await fetchFromHasuraServer(MANAGED_OUTLET_QUERY, {
        id: swap.outletId,
      });
      const p = res?.partners_by_pk;
      return {
        managing: true,
        outletName: p?.store_name || p?.username || undefined,
      };
    } catch (err) {
      console.error("getManagedOutletContext name lookup failed:", err);
      return { managing: true };
    }
  } catch (err) {
    // A corrupt/re-keyed cookie makes decryptText throw; from an async layout
    // that is a 500 on every admin-v2 page instead of a normal dashboard.
    console.error("getManagedOutletContext failed:", err);
    return { managing: false };
  }
}
