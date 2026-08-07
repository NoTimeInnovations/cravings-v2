import { NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS, EXCLUDED_USER_IDS } from "../../_excluded";

/**
 * Watchlist auto-sync — add restaurants that have clearly "started" to the Target
 * watchlist so none get forgotten.
 *
 * A restaurant qualifies when it has taken at least MIN_ORDERS real orders in the
 * last WINDOW_DAYS days (≈2 orders/week over two weeks). Qualifying restaurants
 * not already tracked are inserted with the base plan and "free_trial" status
 * (the admin can flip any to "paid" afterwards). Idempotent: re-running only adds
 * newly-active restaurants; existing rows are left untouched (ON CONFLICT DO
 * NOTHING), so their manually-set plan/status/note are never overwritten.
 *
 *   POST → scan + add   → { scanned, qualified, added, alreadyTracked, addedPartners }
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

// "Active restaurant" threshold. Two weeks of look-back, ≈2 orders/week.
const WINDOW_DAYS = 14;
const MIN_ORDERS = 4;
// Defaults for auto-added rows — mirror the manual add (BASE_PLAN_INR = ₹3000).
const DEFAULT_PLAN_INR = 3000;
const DEFAULT_STATUS = "free_trial";
const DEFAULT_NOTE = "Auto-synced (active)";

// Same "real order" filter the watchlist stats use: every channel counts; only
// non-orders (cancelled / never-paid / expired) and internal test accounts drop.
// `$since` bounds it to the look-back window.
const VALID_ROW = `
  { _or: [{ status: { _is_null: true } }, { status: { _nin: ["cancelled", "pending_payment", "expired"] } }] },
  { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
  { created_at: { _gte: $since } }
`;

// Only fetch partners that have at least one qualifying recent order (the
// `orders: {…}` relationship filter), then read each one's exact count. Keeps the
// scan to genuinely-active stores instead of every partner ever created.
const CANDIDATES_QUERY = `
  query SyncCandidates($since: timestamptz!, $excludedPartners: [uuid!]!, $excludedUsers: [uuid!]!) {
    partners(
      where: { _and: [
        { id: { _nin: $excludedPartners } },
        { orders: { _and: [ ${VALID_ROW} ] } }
      ] },
      limit: 10000
    ) {
      id
      name
      store_name
      recent: orders_aggregate(where: { _and: [ ${VALID_ROW} ] }) {
        aggregate { count }
      }
    }
  }
`;

const EXISTING_QUERY = `
  query WatchlistPartnerIds {
    analytics_watchlist { partner_id }
  }
`;

const INSERT_MUTATION = `
  mutation BulkAddWatchlist($objects: [analytics_watchlist_insert_input!]!) {
    insert_analytics_watchlist(
      objects: $objects,
      on_conflict: { constraint: analytics_watchlist_partner_unique, update_columns: [] }
    ) {
      affected_rows
      returning { id partner_id }
    }
  }
`;

async function hasura(query: string, variables: Record<string, unknown>) {
  const res = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_SECRET,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  return res.json();
}

const cnt = (a: any) => Number(a?.aggregate?.count ?? 0);

export async function POST() {
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

    const candRes = await hasura(CANDIDATES_QUERY, {
      since,
      excludedPartners: EXCLUDED_PARTNER_IDS,
      excludedUsers: EXCLUDED_USER_IDS,
    });
    if (candRes.errors) {
      console.error("watchlist sync candidates errors:", JSON.stringify(candRes.errors));
      return NextResponse.json({ error: "Scan failed" }, { status: 500 });
    }

    const partners: any[] = candRes.data?.partners ?? [];
    const qualified = partners
      .map((p) => ({ id: p.id as string, name: p.name ?? p.store_name ?? "—", orders: cnt(p.recent) }))
      .filter((p) => p.orders >= MIN_ORDERS);

    if (qualified.length === 0) {
      return NextResponse.json({
        scanned: partners.length,
        qualified: 0,
        added: 0,
        alreadyTracked: 0,
        addedPartners: [],
        windowDays: WINDOW_DAYS,
        minOrders: MIN_ORDERS,
        syncedAt: new Date().toISOString(),
      });
    }

    // How many qualifiers are already on the list — for a clear result summary.
    const existRes = await hasura(EXISTING_QUERY, {});
    const existing = new Set<string>(
      (existRes.data?.analytics_watchlist ?? []).map((r: any) => r.partner_id as string)
    );
    const alreadyTracked = qualified.filter((p) => existing.has(p.id)).length;

    const objects = qualified.map((p) => ({
      partner_id: p.id,
      plan_inr: DEFAULT_PLAN_INR,
      status: DEFAULT_STATUS,
      note: DEFAULT_NOTE,
    }));

    const insRes = await hasura(INSERT_MUTATION, { objects });
    if (insRes.errors) {
      console.error("watchlist sync insert errors:", JSON.stringify(insRes.errors));
      return NextResponse.json({ error: "Add failed" }, { status: 500 });
    }

    const returned: any[] = insRes.data?.insert_analytics_watchlist?.returning ?? [];
    const byId = new Map(qualified.map((p) => [p.id, p]));
    const addedPartners = returned.map((r) => ({
      partnerId: r.partner_id as string,
      name: byId.get(r.partner_id)?.name ?? "—",
      orders: byId.get(r.partner_id)?.orders ?? 0,
    }));

    return NextResponse.json({
      scanned: partners.length,
      qualified: qualified.length,
      added: addedPartners.length,
      alreadyTracked,
      addedPartners,
      windowDays: WINDOW_DAYS,
      minOrders: MIN_ORDERS,
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("watchlist sync failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
