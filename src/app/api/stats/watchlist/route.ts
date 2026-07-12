import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_USER_IDS } from "../_excluded";

/**
 * Watchlist — DB-backed roster of restaurants tracked in the Target section.
 *
 * Only the *selection* is persisted (partner_id + plan + status + note, in the
 * `analytics_watchlist` table). All order stats and trends are computed live on
 * every read from the `orders` table, so nothing else is stored and the view is
 * identical for everyone on any device.
 *
 *   GET    → watchlist rows joined with live order stats (total / avg / trends)
 *   POST   → add a partner        { partnerId, planInr, status, note? }
 *   PATCH  → edit an entry         { id, planInr?, status?, note? }
 *   DELETE → remove an entry       ?id=<watchlist row id>
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = new Set(["paid", "free_trial"]);

// "Real order" filter — counts a restaurant's actual order activity across ALL
// channels (customer app/web, POS/in-store, captain, WhatsApp, etc.). We only
// drop non-orders (cancelled / never-paid / expired drafts) and internal test
// accounts. NOTE: unlike the delivery-only endpoints we deliberately do NOT
// restrict by `source`, since POS/in-store billing is a large part of volume.
const VALID = `
  { _or: [{ status: { _is_null: true } }, { status: { _nin: ["cancelled", "pending_payment", "expired"] } }] },
  { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
`;

const bucket = (alias: string, range: string, withGmv = false) => `
  ${alias}: orders_aggregate(where: { _and: [ ${VALID}${range} ] }) {
    aggregate { count ${withGmv ? "sum { total_price }" : ""} }
  }`;

const STATS_QUERY = `
  query WatchlistStats(
    $ids: [uuid!]!, $excludedUsers: [uuid!]!,
    $h24: timestamptz!, $h48: timestamptz!,
    $d7: timestamptz!, $d14: timestamptz!,
    $d30: timestamptz!, $d60: timestamptz!
  ) {
    partners(where: { id: { _in: $ids } }) {
      id
      name
      store_name
      district
      username
      ${bucket("total", "", true)}
      ${bucket("last24h", ", { created_at: { _gte: $h24 } }")}
      ${bucket("prev24h", ", { created_at: { _gte: $h48, _lt: $h24 } }")}
      ${bucket("last7", ", { created_at: { _gte: $d7 } }")}
      ${bucket("prev7", ", { created_at: { _gte: $d14, _lt: $d7 } }")}
      ${bucket("last30", ", { created_at: { _gte: $d30 } }")}
      ${bucket("prev30", ", { created_at: { _gte: $d60, _lt: $d30 } }")}
    }
  }
`;

const LIST_QUERY = `
  query WatchlistRows {
    analytics_watchlist(order_by: { created_at: asc }) {
      id
      partner_id
      plan_inr
      status
      note
      created_at
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
  const json = await res.json();
  return json;
}

/**
 * All windows are rolling from "now": last 24h vs the 24h before, last 7d vs
 * the 7d before, last 30d vs the 30d before — a fair improving/degrading
 * signal at any moment (no calendar-boundary artefacts).
 */
function boundaries() {
  const now = Date.now();
  const h = 3_600_000;
  const day = 86_400_000;
  return {
    h24: new Date(now - 24 * h).toISOString(),
    h48: new Date(now - 48 * h).toISOString(),
    d7: new Date(now - 7 * day).toISOString(),
    d14: new Date(now - 14 * day).toISOString(),
    d30: new Date(now - 30 * day).toISOString(),
    d60: new Date(now - 60 * day).toISOString(),
  };
}

const cnt = (a: any) => Number(a?.aggregate?.count ?? 0);
const gmv = (a: any) => Number(a?.aggregate?.sum?.total_price ?? 0);

// -------------------------------------------------------------------- GET
export async function GET() {
  try {
    const listRes = await hasura(LIST_QUERY, {});
    if (listRes.errors) {
      console.error("watchlist list errors:", JSON.stringify(listRes.errors));
      return NextResponse.json({ error: "list failed" }, { status: 500 });
    }
    const rows: any[] = listRes.data?.analytics_watchlist ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ entries: [], syncedAt: new Date().toISOString() });
    }

    const ids = Array.from(new Set(rows.map((r) => r.partner_id)));
    const b = boundaries();
    const statsRes = await hasura(STATS_QUERY, {
      ids,
      excludedUsers: EXCLUDED_USER_IDS,
      ...b,
    });
    if (statsRes.errors) {
      console.error("watchlist stats errors:", JSON.stringify(statsRes.errors));
    }

    const byId: Record<string, any> = {};
    for (const p of statsRes.data?.partners ?? []) byId[p.id] = p;

    const entries = rows.map((r) => {
      const p = byId[r.partner_id];
      const last30 = cnt(p?.last30);
      return {
        id: r.id,
        partnerId: r.partner_id,
        name: p?.name ?? p?.store_name ?? "—",
        district: p?.district ?? null,
        username: p?.username ?? null,
        planInr: Number(r.plan_inr ?? 0),
        status: r.status,
        note: r.note ?? null,
        createdAt: r.created_at,
        // live stats (computed, never stored)
        totalOrders: cnt(p?.total),
        gmvTotal: gmv(p?.total),
        avgDaily: last30 / 30,
        avgWeekly: (last30 * 7) / 30,
        last24h: cnt(p?.last24h), // rolling last 24 hours
        prev24h: cnt(p?.prev24h), // the 24 hours before that
        week: cnt(p?.last7), // last 7 days
        prevWeek: cnt(p?.prev7), // the 7 days before that
        month: last30, // last 30 days
        prevMonth: cnt(p?.prev30), // the 30 days before that
      };
    });

    return NextResponse.json({ entries, syncedAt: new Date().toISOString() });
  } catch (e: any) {
    console.error("watchlist GET failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// -------------------------------------------------------------------- POST (add)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partnerId ?? "").trim();
    const planInr = Math.round(Number(body.planInr));
    const status = String(body.status ?? "free_trial").trim();
    const note = body.note ? String(body.note).trim().slice(0, 200) : null;

    if (!UUID_RE.test(partnerId))
      return NextResponse.json({ error: "Invalid partner" }, { status: 400 });
    if (!Number.isFinite(planInr) || planInr <= 0)
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    if (!VALID_STATUSES.has(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const res = await hasura(
      `mutation Add($obj: analytics_watchlist_insert_input!) {
         insert_analytics_watchlist_one(object: $obj) { id }
       }`,
      { obj: { partner_id: partnerId, plan_inr: planInr, status, note } }
    );

    if (res.errors) {
      const msg = JSON.stringify(res.errors);
      if (msg.includes("analytics_watchlist_partner_unique") || msg.includes("uniqueness")) {
        return NextResponse.json(
          { error: "This restaurant is already on the watchlist." },
          { status: 409 }
        );
      }
      console.error("watchlist add errors:", msg);
      return NextResponse.json({ error: "Add failed" }, { status: 500 });
    }

    return NextResponse.json({ id: res.data?.insert_analytics_watchlist_one?.id });
  } catch (e: any) {
    console.error("watchlist POST failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// -------------------------------------------------------------------- PATCH (edit)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    if (!UUID_RE.test(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const set: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.planInr != null) {
      const planInr = Math.round(Number(body.planInr));
      if (!Number.isFinite(planInr) || planInr <= 0)
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      set.plan_inr = planInr;
    }
    if (body.status != null) {
      const status = String(body.status).trim();
      if (!VALID_STATUSES.has(status))
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      set.status = status;
    }
    if (body.note !== undefined) {
      set.note = body.note ? String(body.note).trim().slice(0, 200) : null;
    }

    const res = await hasura(
      `mutation Edit($id: uuid!, $set: analytics_watchlist_set_input!) {
         update_analytics_watchlist_by_pk(pk_columns: { id: $id }, _set: $set) { id }
       }`,
      { id, set }
    );
    if (res.errors) {
      console.error("watchlist edit errors:", JSON.stringify(res.errors));
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    return NextResponse.json({ id });
  } catch (e: any) {
    console.error("watchlist PATCH failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// -------------------------------------------------------------------- DELETE (remove)
export async function DELETE(req: NextRequest) {
  try {
    const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
    if (!UUID_RE.test(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const res = await hasura(
      `mutation Del($id: uuid!) {
         delete_analytics_watchlist_by_pk(id: $id) { id }
       }`,
      { id }
    );
    if (res.errors) {
      console.error("watchlist delete errors:", JSON.stringify(res.errors));
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
    return NextResponse.json({ id });
  } catch (e: any) {
    console.error("watchlist DELETE failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
