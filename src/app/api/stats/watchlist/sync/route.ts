import { NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS, EXCLUDED_USER_IDS } from "../../_excluded";
import { getBlockedPartnerIds } from "../../_blocklist";

/**
 * Watchlist sync — keep the Target watchlist to the restaurants that are
 * *actually using* online ordering, so we spend effort only on the serious ones.
 *
 * A restaurant qualifies when its ONLINE orders (POS / in-store billing is
 * excluded) average at least MIN_ORDERS_PER_WEEK over the last WINDOW_DAYS
 * (a rolling 30-day cycle). One click both:
 *   - ADDS every qualifying restaurant not already tracked (base plan,
 *     "free_trial"; existing rows keep their manual plan/status/note), and
 *   - REMOVES tracked restaurants that have fallen below the bar — EXCEPT ones
 *     marked "paid", which are never auto-removed (real customers are protected;
 *     a human can still remove them by hand).
 *
 *   POST → { scanned, qualified, added, removed, keptPaidBelow,
 *            addedPartners, removedPartners, windowDays, minPerWeek }
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

// "Serious / active" bar: online orders averaging ≥ 2 / week over the last 30
// days. 2/week × (30/7) weeks ≈ 8.57 orders, so ≥ 9 online orders qualifies and
// ≤ 8 falls below.
const WINDOW_DAYS = 30;
const MIN_ORDERS_PER_WEEK = 2;
const MIN_ORDERS_IN_WINDOW = (MIN_ORDERS_PER_WEEK * WINDOW_DAYS) / 7; // ≈ 8.571

// Defaults for auto-added rows — mirror the manual add (BASE_PLAN_INR = ₹3000).
const DEFAULT_PLAN_INR = 3000;
const DEFAULT_STATUS = "free_trial";
const DEFAULT_NOTE = "Auto-synced (active)";

// ONLINE orders only — POS/in-store (source "pos", incl. captain billing) is
// excluded, matching the customer-order filter used across /api/stats. Also
// drops non-orders (cancelled / never-paid / expired) and internal test users.
// `$since` bounds it to the 30-day window.
const ONLINE_ROW = `
  { _or: [{ status: { _is_null: true } }, { status: { _nin: ["cancelled", "pending_payment", "expired"] } }] },
  { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
  { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] },
  { created_at: { _gte: $since } }
`;

// Only pull partners that have at least one qualifying online order in the
// window (the `orders: {…}` relationship filter), then read each one's exact
// online count. Keeps the scan to genuinely-active stores.
const CANDIDATES_QUERY = `
  query SyncCandidates($since: timestamptz!, $excludedPartners: [uuid!]!, $excludedUsers: [uuid!]!) {
    partners(
      where: { _and: [
        { id: { _nin: $excludedPartners } },
        { orders: { _and: [ ${ONLINE_ROW} ] } }
      ] },
      limit: 10000
    ) {
      id
      name
      store_name
      recent: orders_aggregate(where: { _and: [ ${ONLINE_ROW} ] }) {
        aggregate { count }
      }
    }
  }
`;

const EXISTING_QUERY = `
  query WatchlistRows {
    analytics_watchlist { id partner_id status note }
  }
`;

// Exact online-order count (last 30d) for the partners we already track, so we
// can drop the ones that have gone quiet (even if they have zero recent orders
// and therefore never show up in the candidate scan).
const TRACKED_COUNTS_QUERY = `
  query TrackedCounts($ids: [uuid!]!, $since: timestamptz!, $excludedUsers: [uuid!]!) {
    partners(where: { id: { _in: $ids } }) {
      id
      name
      store_name
      recent: orders_aggregate(where: { _and: [ ${ONLINE_ROW} ] }) {
        aggregate { count }
      }
    }
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

const DELETE_MUTATION = `
  mutation BulkRemoveWatchlist($ids: [uuid!]!) {
    delete_analytics_watchlist(where: { id: { _in: $ids } }) {
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
const nameOf = (p: any) => p?.name ?? p?.store_name ?? "—";

export async function POST() {
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

    // Blocked (test/junk) partners never qualify — merge them into the excluded
    // set so the scan skips them and they're never (re)added.
    const blocked = await getBlockedPartnerIds();
    const excludedPartners = Array.from(new Set([...EXCLUDED_PARTNER_IDS, ...blocked]));

    // 1) Scan active stores + read who we already track (in parallel).
    const [candRes, existRes] = await Promise.all([
      hasura(CANDIDATES_QUERY, {
        since,
        excludedPartners,
        excludedUsers: EXCLUDED_USER_IDS,
      }),
      hasura(EXISTING_QUERY, {}),
    ]);

    if (candRes.errors) {
      console.error("watchlist sync candidates errors:", JSON.stringify(candRes.errors));
      return NextResponse.json({ error: "Scan failed" }, { status: 500 });
    }
    if (existRes.errors) {
      console.error("watchlist sync existing errors:", JSON.stringify(existRes.errors));
      return NextResponse.json({ error: "Scan failed" }, { status: 500 });
    }

    const candidates: any[] = candRes.data?.partners ?? [];
    const qualified = candidates
      .map((p) => ({ id: p.id as string, name: nameOf(p), orders: cnt(p.recent) }))
      .filter((p) => p.orders >= MIN_ORDERS_IN_WINDOW);

    const existingRows: any[] = existRes.data?.analytics_watchlist ?? [];
    const existingIds = new Set<string>(existingRows.map((r) => r.partner_id as string));

    // 2) ADD qualifiers we don't already track.
    const toAdd = qualified.filter((p) => !existingIds.has(p.id));
    let addedPartners: { partnerId: string; name: string; orders: number }[] = [];
    if (toAdd.length > 0) {
      const objects = toAdd.map((p) => ({
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
      const byId = new Map(toAdd.map((p) => [p.id, p]));
      addedPartners = returned.map((r) => ({
        partnerId: r.partner_id as string,
        name: byId.get(r.partner_id)?.name ?? "—",
        orders: byId.get(r.partner_id)?.orders ?? 0,
      }));
    }

    // 3) REMOVE tracked partners that have fallen below the bar — but never the
    //    ones marked "paid" (real customers are protected from auto-removal).
    let removedPartners: { partnerId: string; name: string; orders: number }[] = [];
    let keptPaidBelow = 0;
    if (existingRows.length > 0) {
      const trackedIds = Array.from(existingIds);
      const trackedRes = await hasura(TRACKED_COUNTS_QUERY, {
        ids: trackedIds,
        since,
        excludedUsers: EXCLUDED_USER_IDS,
      });
      if (trackedRes.errors) {
        console.error("watchlist sync tracked errors:", JSON.stringify(trackedRes.errors));
        return NextResponse.json({ error: "Scan failed" }, { status: 500 });
      }
      const countById = new Map<string, { orders: number; name: string }>();
      for (const p of trackedRes.data?.partners ?? []) {
        countById.set(p.id as string, { orders: cnt(p.recent), name: nameOf(p) });
      }

      const removeRowIds: string[] = [];
      for (const row of existingRows) {
        const info = countById.get(row.partner_id as string);
        const orders = info?.orders ?? 0;
        if (orders >= MIN_ORDERS_IN_WINDOW) continue; // still active — keep
        if (row.status === "paid") {
          keptPaidBelow += 1; // below the bar but protected
          continue;
        }
        removeRowIds.push(row.id as string);
        removedPartners.push({
          partnerId: row.partner_id as string,
          name: info?.name ?? "—",
          orders,
        });
      }

      if (removeRowIds.length > 0) {
        const delRes = await hasura(DELETE_MUTATION, { ids: removeRowIds });
        if (delRes.errors) {
          console.error("watchlist sync delete errors:", JSON.stringify(delRes.errors));
          return NextResponse.json({ error: "Remove failed" }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      scanned: candidates.length,
      qualified: qualified.length,
      added: addedPartners.length,
      removed: removedPartners.length,
      keptPaidBelow,
      addedPartners,
      removedPartners,
      windowDays: WINDOW_DAYS,
      minPerWeek: MIN_ORDERS_PER_WEEK,
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("watchlist sync failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
