/**
 * Shared helper: partner IDs on the analytics block list (`analytics_blocklist`).
 *
 * These are test / junk accounts the team created that must never be counted in
 * analytics — kept out of the watchlist (add + sync) and out of the signup
 * counts. It's the DB-backed, user-editable companion to the hardcoded
 * EXCLUDED_PARTNER_IDS in `_excluded.ts`.
 *
 * Fails soft: on any error it returns [] so the surrounding stats still render
 * (just without the extra filtering).
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export async function getBlockedPartnerIds(): Promise<string[]> {
  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": HASURA_SECRET,
      },
      body: JSON.stringify({ query: `query { analytics_blocklist { partner_id } }` }),
      cache: "no-store",
    });
    const json = await res.json();
    if (json.errors) {
      console.error("getBlockedPartnerIds errors:", JSON.stringify(json.errors));
      return [];
    }
    return (json.data?.analytics_blocklist ?? []).map((r: any) => r.partner_id as string);
  } catch (e) {
    console.error("getBlockedPartnerIds failed", e);
    return [];
  }
}
