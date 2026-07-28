/**
 * Per-recipient "pick up where you left off" link for comeback templates.
 *
 * A WhatsApp template's URL button is fixed except for one trailing variable, so
 * the template is created as `https://menuthere.com/{{1}}` and each message
 * supplies the rest of the path. That is what makes a PER-CUSTOMER link possible
 * at all — the alternative is one shared link for the whole batch, which cannot
 * sign anyone in.
 *
 * What the customer gets is a one-tap link that signs them in (an encrypted
 * phone token, so the account is resolved when they tap rather than on the send
 * path) and drops them straight on the menu. Compared with "here is our website",
 * it removes the login that most lapsed customers would not bother with.
 *
 * Two limits worth stating plainly:
 *   • the token is valid for 23 hours. A comeback message opened two days later
 *     lands on the storefront's "send hi for a new link" state rather than signed
 *     in — a soft landing, not an error;
 *   • the cart is NOT pre-filled with their last order here. That needs the order
 *     per recipient, which is a query per person inside the send loop; the
 *     signed-in menu link is the version that costs nothing extra.
 */

import { buildOrderLink } from "@/lib/whatsappFlow/orderLink";
import { normalizeForPartner, type PartnerDialContext } from "./phone";

const STOREFRONT_ORIGIN = "https://menuthere.com/";

export interface ComebackLinkContext extends PartnerDialContext {
  partnerId: string;
  username: string | null;
  customDomain?: string | null;
}

/**
 * The variable half of the template's URL button, for one recipient.
 *
 * Returns null when it cannot be built (no username, or a custom domain — whose
 * links are rooted at the domain itself and so share no prefix with the
 * menuthere.com base the template was approved with). Callers must treat null as
 * "send without a button parameter" rather than substituting something else:
 * Meta rejects the whole message if a declared button variable is missing, so a
 * template with a dynamic button must not be paired with a partner we cannot
 * build a suffix for.
 */
export function comebackLinkSuffix(
  ctx: ComebackLinkContext,
  recipientPhone: string,
): string | null {
  if (!ctx.username || ctx.customDomain) return null;

  // buildOrderLink encrypts the customer's LOCAL number — that is the form the
  // storefront resolves an account by. Recipients are stored country-qualified
  // ("919846012345"), so handing that straight over would mint a token for a
  // phone that matches nobody, and auto-login would silently fail.
  const n = normalizeForPartner(recipientPhone, ctx);
  if (!n.ok) return null;

  const url = buildOrderLink(ctx.username, ctx.partnerId, {
    phone: n.value.national,
    customDomain: null,
  });
  if (!url.startsWith(STOREFRONT_ORIGIN)) return null;
  return url.slice(STOREFRONT_ORIGIN.length);
}

/** The base URL a comeback template's dynamic button must be created with. */
export const COMEBACK_BUTTON_BASE = `${STOREFRONT_ORIGIN}{{1}}`;
