import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerByUsernameQuery } from "@/api/partners";
import { PartnerGtm } from "@/components/storefront/PartnerGtm";

// Resolves a partner's GTM container id from their username. Cached (≤60s) and
// tagged with a NAMESPACED per-username tag so the admin Integrations save can
// bust it via revalidateTag(`partner-gtm:${username}`) without colliding with
// global literal tags like "offers". A transient Hasura error degrades to
// "no GTM", never a broken page.
const loadGtmId = (username: string) =>
  unstable_cache(
    async (): Promise<string | null> => {
      try {
        const res = await fetchFromHasura(getPartnerByUsernameQuery, { username });
        return (res?.partners?.[0]?.gtm_container_id as string | null) ?? null;
      } catch {
        return null;
      }
    },
    [`partner-gtm:${username}`],
    { revalidate: 60, tags: [`partner-gtm:${username}`, "partner-gtm"] },
  )();

// Wraps the main-domain /[username] storefront subtree (menu, /home, /info,
// /my-orders, /user-profile, legal pages) and injects the partner's GTM once,
// with no cross-route re-injection.
//
// On a CUSTOM DOMAIN we skip here: the proxy routes some storefront pages
// (/order, /bill, …) to top-level routes OUTSIDE this subtree, so the root
// layout injects GTM from the x-partner-gtm header for the whole custom domain
// instead. Injecting here too would double up on the pages that do pass through
// this layout. Main-domain /order & /bill resolve their partner client-side and
// are out of Phase 1 scope.
export default async function UsernameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const isCustomDomain = (await headers()).get("x-is-custom-domain") === "1";
  const gtmId = isCustomDomain ? null : await loadGtmId(username);
  return (
    <>
      <PartnerGtm gtmId={gtmId} />
      {children}
    </>
  );
}
