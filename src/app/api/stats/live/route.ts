import { NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS } from "../_excluded";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const LIVE_QUERY = `
  query LiveOrders($since: timestamptz!, $today: timestamptz!, $excluded: [uuid!]!) {
    recent_orders: orders(
      where: {
        created_at: { _gte: $since },
        partner_id: { _nin: $excluded },
        type: { _in: ["delivery", "deliveryPOS", "takeawayPOS", "table", "table_order"] },
        _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }]
      }
      order_by: { created_at: desc }
      limit: 30
    ) {
      id
      display_id
      short_id
      created_at
      status
      total_price
      type
      orderedby
      table_number
      table_name
      partner { id, name, district }
    }

    today_active_partners: orders(
      where: {
        created_at: { _gte: $today },
        partner_id: { _nin: $excluded },
        type: { _in: ["delivery", "deliveryPOS", "takeawayPOS", "table", "table_order"] },
        _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }]
      }
      distinct_on: partner_id
      order_by: { partner_id: asc }
    ) { partner_id }

    last_hour: orders_aggregate(where: {
      created_at: { _gte: $since },
      partner_id: { _nin: $excluded },
      type: { _in: ["delivery", "deliveryPOS", "takeawayPOS", "table", "table_order"] },
      _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }]
    }) {
      aggregate { count, sum { total_price } }
    }

    last_hour_delivery: orders_aggregate(where: {
      created_at: { _gte: $since },
      partner_id: { _nin: $excluded },
      type: { _in: ["delivery", "deliveryPOS"] },
      _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }]
    }) { aggregate { count, sum { total_price } } }

    last_hour_takeaway: orders_aggregate(where: {
      created_at: { _gte: $since },
      partner_id: { _nin: $excluded },
      type: { _eq: "takeawayPOS" },
      _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }]
    }) { aggregate { count, sum { total_price } } }

    last_hour_dinein: orders_aggregate(where: {
      created_at: { _gte: $since },
      partner_id: { _nin: $excluded },
      type: { _in: ["table", "table_order"] },
      _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }]
    }) { aggregate { count, sum { total_price } } }

    pending_now: orders_aggregate(where: {
      status: { _in: ["pending", "accepted", "ready", "dispatched"] },
      partner_id: { _nin: $excluded },
      created_at: { _gte: $today }
    }) {
      aggregate { count }
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
  if (json.errors) console.error("Live Hasura errors:", JSON.stringify(json.errors));
  return json.data ?? {};
}

export async function GET() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const data = await hasura(LIVE_QUERY, {
      since: oneHourAgo,
      today: todayStart.toISOString(),
      excluded: EXCLUDED_PARTNER_IDS,
    });

    const recentOrders = (data.recent_orders ?? []).map((o: any) => ({
      id: o.id,
      displayId: o.display_id ?? o.short_id ?? null,
      createdAt: o.created_at,
      status: o.status,
      totalPrice: Math.round(o.total_price ?? 0),
      type: o.type,
      orderedby: o.orderedby,
      tableNumber: o.table_number,
      tableName: o.table_name,
      partnerName: o.partner?.name ?? "—",
      partnerDistrict: o.partner?.district ?? null,
      partnerId: o.partner?.id ?? null,
    }));

    return NextResponse.json({
      recentOrders,
      activeRestaurantsToday: (data.today_active_partners ?? []).length,
      lastHour: {
        total: {
          count: data.last_hour?.aggregate?.count ?? 0,
          gmv: Math.round(data.last_hour?.aggregate?.sum?.total_price ?? 0),
        },
        delivery: {
          count: data.last_hour_delivery?.aggregate?.count ?? 0,
          gmv: Math.round(data.last_hour_delivery?.aggregate?.sum?.total_price ?? 0),
        },
        takeaway: {
          count: data.last_hour_takeaway?.aggregate?.count ?? 0,
          gmv: Math.round(data.last_hour_takeaway?.aggregate?.sum?.total_price ?? 0),
        },
        dinein: {
          count: data.last_hour_dinein?.aggregate?.count ?? 0,
          gmv: Math.round(data.last_hour_dinein?.aggregate?.sum?.total_price ?? 0),
        },
      },
      pendingNow: data.pending_now?.aggregate?.count ?? 0,
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("live stats failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
