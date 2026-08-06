/**
 * Partner-scoped links that survive a custom domain.
 *
 * On menuthere.com a partner lives under /{username}. On their own domain the
 * proxy rewrites the ROOT to /{username} (src/proxy.ts), so the username is
 * already implied by the host — emitting `/{username}/contact-us` there produces
 * `/{username}/{username}/contact-us`, which has no route and 404s.
 *
 * That is not a hypothetical: the public website page shipped with nine
 * hardcoded `/${partner.username}/…` links, and every one of them was a dead
 * link for every partner on a custom domain.
 *
 * Server components get the flag from the `x-is-custom-domain` header the proxy
 * sets; see src/app/[username]/layout.tsx for the same read. Client components
 * have isCustomDomainHost() in src/lib/domain-utils.ts.
 */

/**
 * The prefix every partner-scoped path hangs off: "" on a custom domain,
 * "/{username}" otherwise.
 */
export function partnerBasePath(username: string, isCustomDomain: boolean): string {
  return isCustomDomain ? "" : `/${encodeURIComponent(username)}`;
}

/**
 * Join a base from partnerBasePath() with a partner-scoped path.
 *
 *   partnerHref("/kaifan", "/contact-us")  ->  "/kaifan/contact-us"
 *   partnerHref("",        "/contact-us")  ->  "/contact-us"
 *   partnerHref("/kaifan", "")             ->  "/kaifan"
 *   partnerHref("",        "")             ->  "/"          (never "")
 *
 * The empty-path case is the storefront itself and is why this is a function
 * rather than string concatenation: `${base}${path}` yields "" on a custom
 * domain, and an empty href resolves to the CURRENT url, so "View our menu"
 * would silently reload the marketing page instead of opening the menu.
 */
export function partnerHref(base: string, path = ""): string {
  const p = path && !path.startsWith("/") ? `/${path}` : path;
  return `${base}${p}` || "/";
}
