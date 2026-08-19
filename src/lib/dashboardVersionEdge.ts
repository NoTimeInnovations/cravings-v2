/**
 * Dashboard-version lookup for the MIDDLEWARE (src/proxy.ts).
 *
 * Separate from src/lib/dashboardVersion.ts on purpose: that one is a Server
 * Component helper built on `unstable_cache`/`next/cache`, neither of which is
 * available in middleware. This is plain `fetch` plus a module-level TTL cache,
 * so it runs in either middleware runtime.
 *
 * WHY IT IS IN THE MIDDLEWARE AT ALL: the redirect used to live only in
 * /admin-v2's layout, and Next could not emit a real 307 from there — the shell
 * had already started streaming, so the redirect degraded to
 * `<meta http-equiv="refresh" content="1;url=/admin-v3">`, i.e. a full second of
 * blank page. Both partner login paths (src/screens/Login.tsx and
 * /partnerlogin) are HARD navigations, so every single v3 login would have eaten
 * that flash. Middleware runs before any rendering, so it can redirect properly.
 *
 * COST: the lookup is only ever performed on a dashboard ENTRY url — bare
 * /admin-v2, or /admin-v2?view=Dashboard — never on in-app navigation (which
 * always carries a ?view=) and never on assets. With the cache below that is
 * roughly one Hasura call per partner per TTL, not one per request.
 */

const TTL_MS = 60_000;

type Entry = { version: "v2" | "v3"; at: number };
const cache = new Map<string, Entry>();

const QUERY = `query PartnerDashboardVersionEdge($id: uuid!) {
  partners_by_pk(id: $id) { admin_dashboard_version }
}`;

export async function getDashboardVersionEdge(
  partnerId: string,
): Promise<"v2" | "v3"> {
  if (!partnerId) return "v2";

  const hit = cache.get(partnerId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.version;

  const endpoint =
    process.env.HASURA_SERVER_GRAPHQL_ENDPOINT ||
    process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT;
  const secret =
    process.env.HASURA_SERVER_ADMIN_SECRET ||
    process.env.HASURA_GRAPHQL_ADMIN_SECRET ||
    process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET;

  if (!endpoint || !secret) return "v2";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": secret,
      },
      body: JSON.stringify({ query: QUERY, variables: { id: partnerId } }),
      cache: "no-store",
    });
    if (!res.ok) return "v2";
    const json = await res.json();
    const version: "v2" | "v3" =
      json?.data?.partners_by_pk?.admin_dashboard_version === "v3" ? "v3" : "v2";
    cache.set(partnerId, { version, at: Date.now() });
    return version;
  } catch (e) {
    // Fails OPEN to v2. If Hasura is unreachable the partner lands on the
    // dashboard they have always had — an outage must never migrate anybody,
    // and it must certainly never strand a v2 partner on a half-built v3.
    console.error("getDashboardVersionEdge failed, defaulting to v2:", e);
    return "v2";
  }
}

/**
 * True for the urls that mean "the partner is ENTERING the dashboard", as
 * opposed to navigating within it. admin-v2 mirrors its section into `?view=`,
 * so anything carrying a section other than Dashboard came from a v3 sidebar
 * hand-off and must be left alone — redirecting it would bounce the partner
 * between the two dashboards forever.
 */
export function isDashboardEntryUrl(search: string): boolean {
  const view = new URLSearchParams(search).get("view");
  return !view || view === "Dashboard";
}
