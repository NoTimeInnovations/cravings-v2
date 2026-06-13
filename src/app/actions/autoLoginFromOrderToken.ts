"use server";

import { verifyOrderLinkToken } from "@/lib/whatsappFlow/orderLink";
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
    if (!v.valid || !v.userId) return false;

    // The order link is personal to the customer it was issued for. If a session
    // already exists on this device:
    //   • a partner / superadmin / captain session is NEVER overridden (staff
    //     may be testing on the same browser),
    //   • the SAME customer is a no-op,
    //   • a DIFFERENT customer session IS switched to the link's customer.
    const existing = await getAuthCookie();
    if (existing?.id) {
      if (existing.role !== "user") return false;
      if (existing.id === v.userId) return false;
    }

    // The token is signed, but confirm the user still exists and isn't deleted
    // before minting a session.
    const res = (await fetchFromHasura(
      `query AutoLoginUser($id: uuid!) {
        users(where: {id: {_eq: $id}, deletion_status: {_eq: 0}}, limit: 1) { id }
      }`,
      { id: v.userId },
    )) as { users?: Array<{ id: string }> };

    if (!res?.users?.length) return false;

    await setAuthCookie({
      id: v.userId,
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
