import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS, EXCLUDED_USER_IDS } from "../_excluded";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Non-POS direct order types only — POS orders are excluded from /analytics.
const DIRECT_TYPES = ["delivery", "table", "table_order"];

const LIVE_QUERY = `
  query LiveOrders($since: timestamptz!, $today: timestamptz!, $partnerFilter: uuid_comparison_exp!, $excludedUsers: [uuid!]!, $directTypes: [String!]!) {
    recent_orders: orders(
      where: {
        created_at: { _gte: $since },
        partner_id: $partnerFilter,
        type: { _in: $directTypes },
        _and: [
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
        ]
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
      delivery_address
      partner { id, name, district }
    }

    today_active_partners: orders(
      where: {
        created_at: { _gte: $today },
        partner_id: $partnerFilter,
        type: { _in: $directTypes },
        _and: [
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
        ]
      }
      distinct_on: partner_id
      order_by: { partner_id: asc }
    ) { partner_id }

    last_hour: orders_aggregate(where: {
      created_at: { _gte: $since },
      partner_id: $partnerFilter,
      type: { _in: $directTypes },
      _and: [
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
      ]
    }) {
      aggregate { count, sum { total_price } }
    }

    last_hour_delivery: orders_aggregate(where: {
      _and: [
        { created_at: { _gte: $since } },
        { partner_id: $partnerFilter },
        { type: { _eq: "delivery" } },
        { delivery_address: { _is_null: false } },
        { delivery_address: { _neq: "" } },
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
      ]
    }) { aggregate { count, sum { total_price } } }

    last_hour_takeaway: orders_aggregate(where: {
      _and: [
        { created_at: { _gte: $since } },
        { partner_id: $partnerFilter },
        { type: { _eq: "delivery" } },
        { _or: [{ delivery_address: { _is_null: true } }, { delivery_address: { _eq: "" } }] },
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
      ]
    }) { aggregate { count, sum { total_price } } }

    last_hour_dinein: orders_aggregate(where: {
      created_at: { _gte: $since },
      partner_id: $partnerFilter,
      type: { _in: ["table", "table_order"] },
      _and: [
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
      ]
    }) { aggregate { count, sum { total_price } } }

    pending_now: orders_aggregate(where: {
      status: { _in: ["pending", "accepted", "ready", "dispatched", "in_transit"] },
      partner_id: $partnerFilter,
      type: { _in: $directTypes },
      created_at: { _gte: $today },
      _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }]
    }) {
      aggregate { count }
    }
  }
`;

// Active partners over the last 7 days — populates the dropdown so the
// operator can scope the live feed without typing UUIDs. Limited to keep
// the response small; ordered by activity recency.
const PARTNERS_QUERY = `
  query LivePartners($since: timestamptz!, $excluded: [uuid!]!) {
    orders(
      where: {
        created_at: { _gte: $since },
        partner_id: { _nin: $excluded }
      }
      distinct_on: partner_id
    ) {
      partner { id, name, district }
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

export async function GET(req: NextRequest) {
  try {
    const partnerIdParam = req.nextUrl.searchParams.get("partnerId");
    const partnerId =
      partnerIdParam && UUID_RE.test(partnerIdParam) ? partnerIdParam : null;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const partnerFilter = partnerId
      ? { _eq: partnerId }
      : { _nin: EXCLUDED_PARTNER_IDS };

    const [data, partnersData] = await Promise.all([
      hasura(LIVE_QUERY, {
        since: oneHourAgo,
        today: todayStart.toISOString(),
        partnerFilter,
        excludedUsers: EXCLUDED_USER_IDS,
        directTypes: DIRECT_TYPES,
      }),
      hasura(PARTNERS_QUERY, {
        since: sevenDaysAgo,
        excluded: EXCLUDED_PARTNER_IDS,
      }),
    ]);

    const recentOrders = (data.recent_orders ?? []).map((o: any) => {
      // A delivery order without a delivery address is treated as takeaway.
      const addr = (o.delivery_address ?? "").toString().trim();
      const displayType =
        o.type === "delivery" && !addr ? "takeaway" : o.type;
      return {
        id: o.id,
        displayId: o.display_id ?? o.short_id ?? null,
        createdAt: o.created_at,
        status: o.status,
        totalPrice: Math.round(o.total_price ?? 0),
        type: displayType,
        orderedby: o.orderedby,
        tableNumber: o.table_number,
        tableName: o.table_name,
        partnerName: o.partner?.name ?? "—",
        partnerDistrict: o.partner?.district ?? null,
        partnerId: o.partner?.id ?? null,
      };
    });

    const partners = (partnersData.orders ?? [])
      .map((row: any) => row.partner)
      .filter((p: any) => p && p.id && p.name)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        district: p.district ?? null,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

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
      partners,
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("live stats failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
