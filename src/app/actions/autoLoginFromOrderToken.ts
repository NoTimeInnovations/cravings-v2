"use server";

import { verifyOrderLinkToken, buildOrderLink } from "@/lib/whatsappFlow/orderLink";
import { claimOrderLink } from "@/lib/whatsappFlow/orderLinkClaim";
import { findOrCreateUserByPhone } from "@/lib/whatsappFlow/silentUser";
import { sendWhatsAppCloudMessage } from "@/lib/whatsapp-meta";
import { getAuthCookie, setAuthCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { cookies } from "next/headers";

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

/** Last 4 digits only — enough for the customer to recognise their own number. */
function maskPhone(phone: string | null | undefined): string | null {
  const d = String(phone || "").replace(/[^0-9]/g, "");
  if (d.length < 4) return null;
  return `••••${d.slice(-4)}`;
}

/**
 * A human label for the session currently on the device, for the confirm sheet.
 * Best-effort: a failed lookup degrades to the role, never to a thrown error —
 * this runs on the path that is about to ASK before doing anything, so it must
 * not be able to break the ask.
 */
async function describeSession(existing: {
  id: string;
  role: string;
}): Promise<string> {
  if (existing.role === "superadmin") return "a superadmin account";
  if (existing.role === "partner" || existing.role === "captain") {
    try {
      const res = (await fetchFromHasura(
        `query SessionLabel($id: uuid!) { partners_by_pk(id: $id) { store_name } }`,
        { id: existing.id },
      )) as { partners_by_pk?: { store_name?: string | null } | null };
      const name = res?.partners_by_pk?.store_name?.trim();
      // Clamped: store names run long ("OREO DEMO - Bangalore Division") and
      // this string appears mid-sentence in a 375px-wide sheet.
      if (name) return `${name.length > 28 ? `${name.slice(0, 27)}…` : name} (dashboard)`;
    } catch {
      /* fall through to the generic label */
    }
    return existing.role === "captain" ? "a captain account" : "a store dashboard";
  }
  // Anything that is not role "user" is staff of some kind (Televery and any
  // future role land here). Saying "another customer" while the same sheet warns
  // about being signed out of the dashboard would contradict itself.
  return existing.role === "user" ? "another customer" : "a staff account";
}

export type OrderLinkLoginResult =
  | { status: "no" }
  | { status: "ok" }
  | {
      // A session belonging to SOMEONE ELSE is already on this device. We refuse
      // to replace it without a gesture; the client renders a confirm sheet and
      // calls back with { confirmed: true }.
      status: "needs_confirm";
      /** Who the device is currently signed in as, for the prompt. */
      currentLabel: string;
      /** true when that session is staff (partner / captain / superadmin). */
      currentIsStaff: boolean;
      /** Last 4 digits of the link's customer, e.g. "••••3210". Never the full number. */
      maskedPhone: string | null;
    };

/**
 * Called from the storefront when a customer opens a WhatsApp order link whose
 * token carries their identity. Verifies the token and establishes that
 * customer's session — no OTP.
 *
 * ── Why this cannot silently replace an existing session ─────────────────────
 *
 * An earlier version of this dropped the "staff sessions are exempt" gate so
 * that an owner tapping their own order link would be re-signed-in as the
 * WhatsApp number that asked for it, instead of placing the order on the admin
 * account. The reasoning was that the swap "can only ever DROP privileges,
 * because the minted session is always role 'user'".
 *
 * That is true of the ROLE and false of the ACCOUNT, and the account is what
 * matters. The token is NOT a secret: anyone can mint a valid one bound to
 * THEIR OWN phone by sending "hi" to the partner's WhatsApp and receiving
 * https://menuthere.com/<store>?olt=<token> back. Forward that plain URL to the
 * owner (support chat, a group, a shortener, a QR) and — with no gate — merely
 * opening it would sign them out of admin and into the ATTACKER's customer
 * account, with no prompt and no UI. That is login CSRF / session fixation:
 * repeatable remote sign-out of the dashboard, and every address or order the
 * victim then saves lands in an account the attacker reads from their own
 * phone. Same shape for a table link, which is shared around a table by design.
 *
 * So: silent ONLY when the device has no session at all. Any other session that
 * is not already the link's customer gets an explicit one-tap confirmation. The
 * owner testing their own link taps once; a forwarded link does nothing on its
 * own.
 *
 * The confirmation also covers the impersonation markers: setAuthCookie drops
 * PARENT_SESSION_COOKIES on every write, so a superadmin impersonating a
 * partner loses the way back out. Deliberately NOT passed keepParentSession —
 * that would leave a redeemable capability attached to a session it was not
 * minted for. Losing it is correct; the prompt says so before it happens.
 */
export async function autoLoginFromOrderToken(
  partnerId: string,
  token: string,
  opts?: { confirmed?: boolean },
): Promise<OrderLinkLoginResult> {
  const NO: OrderLinkLoginResult = { status: "no" };
  try {
    if (!partnerId || !token) return NO;

    const v = verifyOrderLinkToken(partnerId, token);
    if (!v.valid) return NO;

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
    if (!userId) return NO;

    // For a legacy userId token, confirm the user still exists and isn't deleted
    // before minting a session. (The phone path already created/fetched and
    // reactivated the account, so this check is redundant there.) The phone comes
    // back too, so the confirm prompt can name the account it is about to switch
    // to for BOTH token shapes.
    let linkPhone = v.phone;
    if (!resolvedViaPhone) {
      const res = (await fetchFromHasura(
        `query AutoLoginUser($id: uuid!) {
          users(where: {id: {_eq: $id}, deletion_status: {_eq: 0}}, limit: 1) { id phone }
        }`,
        { id: userId },
      )) as { users?: Array<{ id: string; phone?: string | null }> };

      if (!res?.users?.length) return NO;
      linkPhone = linkPhone || res.users[0].phone || null;
    }

    // ── The session gate ──────────────────────────────────────────────────────
    // Already the link's customer → nothing to do (the common re-open case).
    // No session at all → silent, as before.
    // Anyone else's session → confirm. See the doc comment above for why this
    // may not be silent: the token is self-mintable, so a silent swap would make
    // any forwarded link a remote session-replacement primitive.
    const existing = await getAuthCookie();
    if (existing?.id && existing.id !== userId && !opts?.confirmed) {
      return {
        status: "needs_confirm",
        currentLabel: await describeSession(existing),
        currentIsStaff: existing.role !== "user",
        maskedPhone: maskPhone(linkPhone),
      };
    }
    if (existing?.id && existing.id === userId) return NO;

    // Replacing a DIFFERENT person's session: their storefront state must not
    // ride along. `onboarding_data` holds a saved delivery ADDRESS + coords per
    // partner with a one-year maxAge, and setAuthCookie does not touch it — so
    // without this the next customer's checkout prefills, and submits, the
    // previous customer's home address. Same for the chosen order type and the
    // order session.
    //
    // Only on a replacement. On the silent no-session path the visitor may well
    // be the same person who just typed that address anonymously before tapping
    // their link, and wiping it would be pure friction.
    if (existing?.id) {
      const jar = await cookies();
      for (const c of ["onboarding_data", "onboarding_done", "order_session", "order_type_session"]) {
        jar.delete(c);
      }
    }

    // Best-effort first-open tracking. We NO LONGER hard-block re-opens: the
    // link is personal to this customer and already expires (23h), and the
    // single-use lock was locking out legitimate customers — WhatsApp opens
    // links in an in-app browser and the customer often re-opens in the system
    // browser (separate cookie jar), re-taps, or a preview crawler fetches it
    // first. So establish the session on EVERY valid, unexpired open; only the
    // genuine first claim fires the "you opened the menu" confirmation.
    const claimedFirst = await claimOrderLink(token, partnerId, userId);

    await setAuthCookie({
      id: userId,
      role: "user",
      feature_flags: "",
      status: "active",
    });

    // First open of this link → send the opt-in "you opened the menu" confirmation
    // (only for phone-bearing links, where we can message the customer back).
    if (claimedFirst && v.phone) await notifyOrderLinkOpened(partnerId, v.phone);

    return { status: "ok" };
  } catch (e) {
    console.error("autoLoginFromOrderToken failed:", e);
    return NO;
  }
}
