/**
 * Fetches the top delivery-enabled partners to render on the home page
 * "Trusted by restaurants" strip. Sorted by delivery-order count desc.
 *
 * Filters out obvious test / demo / placeholder accounts so we don't
 * show "Al Raidhan test store" or "OREO DEMO" on the marketing page.
 *
 * Called from `src/app/(root)/page.tsx` (a server component), so this
 * runs at request-time on the server with Next's built-in fetch cache.
 * Re-fetched once per hour.
 */

const QUERY = `
  query TrustBarPartners {
    partners(
      where: { orders: { type: { _eq: "delivery" } } }
      order_by: { orders_aggregate: { count: desc } }
      limit: 25
    ) {
      store_name
      orders_aggregate(where: { type: { _eq: "delivery" } }) {
        aggregate { count }
      }
    }
  }
`;

const EXCLUDE_RE = /\b(test|demo|sample|sandbox|qa|staging)\b/i;

/** Display-name overrides for the trust bar (matched against store_name). */
const RENAME: Array<{ match: RegExp; to: string }> = [
  { match: /moosa/i, to: "Rimaal" },
  { match: /jui[zc]y\s*man/i, to: "Nila" },
];

export async function getTrustBarPartners(limit = 6): Promise<string[]> {
  const endpoint = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT;
  const secret = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET;
  if (!endpoint || !secret) return [];

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": secret,
      },
      body: JSON.stringify({ query: QUERY }),
      // Cache for 1 hour. Trust bar doesn't need to be fresh.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: {
        partners?: Array<{
          store_name: string | null;
          orders_aggregate?: { aggregate?: { count?: number | null } | null };
        }>;
      };
    };

    const rows = json.data?.partners ?? [];
    return rows
      .map((p) => ({
        name: (p.store_name ?? "").trim(),
        count: p.orders_aggregate?.aggregate?.count ?? 0,
      }))
      .filter((p) => p.name.length > 0 && !EXCLUDE_RE.test(p.name))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((p) => RENAME.find((r) => r.match.test(p.name))?.to ?? p.name);
  } catch {
    return [];
  }
}
