"use server";

import { verifyOrderLinkToken } from "@/lib/whatsappFlow/orderLink";
import { claimOrderLink } from "@/lib/whatsappFlow/orderLinkClaim";
import { findOrCreateUserByPhone } from "@/lib/whatsappFlow/silentUser";
import { getAuthCookie, setAuthCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Called from the storefront when a customer opens a WhatsApp order link whose
// token carries their user id. Verifies the signed token and silently sets the
// auth cookie — no OTP, no UI. Returns true when a session was established.
export async function autoLoginFromOrderToken(
  partnerId: string,
  token: string,
): Promise<boolean> {
  try {
    if (!partnerId || !token) return false;

    const v = verifyOrderLinkToken(partnerId, token);
    if (!v.valid) return false;

    // Resolve the customer to a real user id. Two token shapes:
    //   • encrypted phone token → find-or-create the account NOW (this is where
    //     account creation moved to, off the WhatsApp reply path). Keyed by phone
    //     so it lands on the customer's existing account, never a duplicate, and
    //     reactivates a soft-deleted one.
    //   • legacy userId token → the id is carried directly.
    let userId = v.userId;
    let resolvedViaPhone = false;
    if (!userId && v.phone) {
      userId = await findOrCreateUserByPhone(v.phone, null);
      resolvedViaPhone = true;
    }
    if (!userId) return false;

    // The order link is personal to the customer it was issued for. If a session
    // already exists on this device:
    //   • a partner / superadmin / captain session is NEVER overridden (staff
    //     may be testing on the same browser),
    //   • the SAME customer is a no-op,
    //   • a DIFFERENT customer session IS switched to the link's customer.
    const existing = await getAuthCookie();
    if (existing?.id) {
      if (existing.role !== "user") return false;
      if (existing.id === userId) return false;
    }

    // For a legacy userId token, confirm the user still exists and isn't deleted
    // before minting a session. (The phone path already created/fetched and
    // reactivated the account, so this check is redundant there.)
    if (!resolvedViaPhone) {
      const res = (await fetchFromHasura(
        `query AutoLoginUser($id: uuid!) {
          users(where: {id: {_eq: $id}, deletion_status: {_eq: 0}}, limit: 1) { id }
        }`,
        { id: userId },
      )) as { users?: Array<{ id: string }> };

      if (!res?.users?.length) return false;
    }

    // Single-use lock: the first opener claims the link. If it was already
    // claimed (the link was forwarded/shared), don't establish a session — the
    // storefront then shows the expired screen for this visitor.
    const claimed = await claimOrderLink(token, partnerId, userId);
    if (!claimed) return false;

    await setAuthCookie({
      id: userId,
      role: "user",
      feature_flags: "",
      status: "active",
    });
    return true;
  } catch (e) {
    console.error("autoLoginFromOrderToken failed:", e);
    return false;
  }
}
