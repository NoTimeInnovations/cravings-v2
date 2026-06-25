/**
 * Cashfree only allows a checkout session / return URL on domains that are
 * registered in the Cashfree (partner) account — i.e. menuthere.com. When a
 * partner serves their storefront on a custom domain, the live origin is NOT
 * whitelisted, so Cashfree rejects the session and the customer sees an error.
 *
 * To fix that without per-partner Cashfree config, we pin the Cashfree
 * `return_url` to the canonical menuthere.com origin whenever the customer is
 * on a custom domain. On menuthere.com / localhost / Vercel previews we keep the
 * live origin so payments return to the exact page the customer is on (and dev
 * / preview testing isn't redirected to production).
 *
 * The `/order/<id>` and `/bill` routes are global (non-username) even on custom
 * domains (see proxy.ts), so a menuthere.com return URL resolves for any partner.
 */

const CANONICAL_ORIGIN =
  process.env.NEXT_PUBLIC_BASE_URL || "https://menuthere.com";

// Hosts that are already registered with Cashfree (or are dev/preview origins
// we must not rewrite). Mirrors the custom-domain detection in proxy.ts.
function isRegisteredHost(host: string): boolean {
  return (
    host === "menuthere.com" ||
    host === "www.menuthere.com" ||
    host.endsWith(".menuthere.com") ||
    host.includes("localhost") ||
    host.endsWith(".vercel.app")
  );
}

/**
 * Origin to use when building a Cashfree `return_url`. Returns the canonical
 * menuthere.com origin on custom domains, otherwise the live origin.
 */
export function cashfreeReturnOrigin(): string {
  if (typeof window === "undefined") return CANONICAL_ORIGIN;
  return isRegisteredHost(window.location.hostname)
    ? window.location.origin
    : CANONICAL_ORIGIN;
}

/** True when the storefront is being served on a partner custom domain. */
export function isCustomDomain(): boolean {
  if (typeof window === "undefined") return false;
  return !isRegisteredHost(window.location.hostname);
}

/**
 * Layer 2 of the custom-domain Cashfree fix: run the *entire* checkout on
 * menuthere.com, not just the return URL. Cashfree won't launch its embedded
 * drop-in from a non-whitelisted origin, so on a custom domain we hand off to
 * the canonical `menuthere.com/order/<id>` page, which auto-launches the
 * (whitelisted) embedded checkout via the `autopay=cashfree` flag.
 *
 * The order must already exist in the DB as `pending_payment` before calling
 * this (it always does — the order is persisted before payment). The order
 * page is a global route and reads everything (amount, partner) from the DB, so
 * no cart / sessionStorage state needs to cross the domain boundary.
 *
 * Returns `true` if it navigated away — callers MUST stop their flow when true.
 */
export function payOnCanonicalDomain(orderId: string): boolean {
  if (typeof window === "undefined" || !isCustomDomain() || !orderId) return false;
  window.location.href = `${CANONICAL_ORIGIN}/order/${orderId}?autopay=cashfree`;
  return true;
}
