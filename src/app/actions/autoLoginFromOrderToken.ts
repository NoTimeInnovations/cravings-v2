"use server";

import { verifyOrderLinkToken, buildOrderLink } from "@/lib/whatsappFlow/orderLink";
import { claimOrderLink } from "@/lib/whatsappFlow/orderLinkClaim";
import { findOrCreateUserByPhone } from "@/lib/whatsappFlow/silentUser";
import { sendWhatsAppCloudMessage } from "@/lib/whatsapp-meta";
import { getAuthCookie, setAuthCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Best-effort: when a customer OPENS an order link for the FIRST time, send them
// a short WhatsApp confirmation so they know the tap registered. Opt-in per
// partner — it only fires when storefront_settings.orderLinkOpenedMessage is set
// (so it never auto-messages other partners' customers). The message supports
// {{order_link}} (a PLAIN link — no auto-login, so it can never loop back into
// this notice) and {{store_name}}. Never throws.
async function notifyOrderLinkOpened(partnerId: string, localPhone: string): Promise<void> {
  try {
    if (!localPhone) return;
    const res = (await fetchFromHasura(
      `query OrderLinkOpenedNotice($p: uuid!) {
        partners_by_pk(id: $p) {
          store_name username custom_domain country_code storefront_settings
        }
        whatsapp_business_integrations(where: { partner_id: { _eq: $p } }, order_by: {is_primary: desc, updated_at: asc}, limit: 1) {
          phone_number_id access_token
        }
      }`,
      { p: partnerId },
    )) as any;

    const partner = res?.partners_by_pk;
    const integ = res?.whatsapp_business_integrations?.[0];
    if (!partner || !integ?.phone_number_id || !integ?.access_token) return;

    // storefront_settings is a JSON string stored inside a jsonb column.
    let settings: any = partner.storefront_settings;
    if (typeof settings === "string") {
      try {
        settings = JSON.parse(settings);
      } catch {
        settings = null;
      }
    }
    const template = settings?.orderLinkOpenedMessage;
    if (typeof template !== "string" || !template.trim()) return;

    // The token stores the LOCAL phone; rebuild the WhatsApp number (cc + local).
    const cc = String(partner.country_code || "").replace(/[^0-9]/g, "");
    const local = String(localPhone).replace(/[^0-9]/g, "");
    const to = cc ? `${cc}${local}` : local.length === 10 ? `91${local}` : local;
    if (!to) return;

    // A PLAIN order link (no embedded phone) → opening it creates no claim, so
    // this confirmation can never re-trigger itself.
    const plainLink = partner.username
      ? buildOrderLink(partner.username, partnerId, { customDomain: partner.custom_domain })
      : "";

    const body = template
      .replace(/\{\{\s*order_link\s*\}\}/g, plainLink)
      .replace(/\{\{\s*store_name\s*\}\}/g, partner.store_name || "");

    await sendWhatsAppCloudMessage(integ.phone_number_id, integ.access_token, to, body);
  } catch (e) {
    console.error("notifyOrderLinkOpened failed:", e);
  }
}

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

    // First open of this link → send the opt-in "you opened the menu" confirmation
    // (only for phone-bearing links, where we can message the customer back).
    if (v.phone) await notifyOrderLinkOpened(partnerId, v.phone);

    return true;
  } catch (e) {
    console.error("autoLoginFromOrderToken failed:", e);
    return false;
  }
}
