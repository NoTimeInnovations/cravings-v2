import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS, EXCLUDED_USER_IDS } from "../_excluded";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 30;
export const dynamic = "force-dynamic";

type Range = "1d" | "7d" | "30d" | "90d" | "365d";

const RANGE_DAYS: Record<Range, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

function windowFor(range: Range) {
  const days = RANGE_DAYS[range];
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    prevStart: prevStart.toISOString(),
    prevEnd: start.toISOString(),
    startDate: dateOnly(start),
    endDate: dateOnly(end),
    prevStartDate: dateOnly(prevStart),
    prevEndDate: dateOnly(start),
    days,
  };
}

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
  if (json.errors) {
    console.error("Hasura errors:", JSON.stringify(json.errors));
  }
  return json.data ?? {};
}

// Customer-facing fulfilment types we surface in /analytics. Dine-in
// (table / table_order) is intentionally excluded — analytics only tracks
// delivery and takeaway (which is just type=delivery with no address).
const DIRECT_TYPES = ["delivery"];

const KPI_QUERY = `
  query KpiQuery(
    $start: timestamptz!,
    $end: timestamptz!,
    $prevStart: timestamptz!,
    $prevEnd: timestamptz!,
    $startDate: date!,
    $endDate: date!,
    $excluded: [uuid!]!,
    $excludedUsers: [uuid!]!,
    $excludedQrs: [uuid!]!,
    $directTypes: [String!]!
  ) {
    active_customers: orders(
      where: {
        created_at: { _gte: $start, _lte: $end },
        user_id: { _is_null: false, _nin: $excludedUsers },
        partner_id: { _nin: $excluded },
        type: { _in: $directTypes },
        _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }]
      }
      distinct_on: user_id
      order_by: { user_id: asc }
    ) {
      user_id
    }
    active_customers_prev: orders(
      where: {
        created_at: { _gte: $prevStart, _lt: $prevEnd },
        user_id: { _is_null: false, _nin: $excludedUsers },
        partner_id: { _nin: $excluded },
        type: { _in: $directTypes },
        _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }]
      }
      distinct_on: user_id
      order_by: { user_id: asc }
    ) {
      user_id
    }
    orders: orders_aggregate(where: {
      created_at: { _gte: $start, _lte: $end },
      partner_id: { _nin: $excluded },
      type: { _in: $directTypes },
      _and: [
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) {
      aggregate { count, sum { total_price } }
    }
    orders_prev: orders_aggregate(where: {
      created_at: { _gte: $prevStart, _lt: $prevEnd },
      partner_id: { _nin: $excluded },
      type: { _in: $directTypes },
      _and: [
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) {
      aggregate { count, sum { total_price } }
    }
    completed_orders: orders_aggregate(where: {
      created_at: { _gte: $start, _lte: $end },
      partner_id: { _nin: $excluded },
      type: { _in: $directTypes },
      status: { _in: ["completed", "accepted"] },
      _and: [
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) {
      aggregate { count, sum { total_price } }
    }
    cancelled_orders: orders_aggregate(where: {
      created_at: { _gte: $start, _lte: $end },
      partner_id: { _nin: $excluded },
      type: { _in: $directTypes },
      status: { _eq: "cancelled" },
      _and: [
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) {
      aggregate { count }
    }
    qr_scans: qr_scans_aggregate(where: {
      created_at: { _gte: $start, _lte: $end },
      qr_id: { _nin: $excludedQrs }
    }) {
      aggregate { count }
    }
    qr_scans_prev: qr_scans_aggregate(where: {
      created_at: { _gte: $prevStart, _lt: $prevEnd },
      qr_id: { _nin: $excludedQrs }
    }) {
      aggregate { count }
    }
    active_partners: orders(
      where: {
        created_at: { _gte: $start, _lte: $end },
        partner_id: { _nin: $excluded },
        type: { _in: $directTypes },
        _and: [
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
          { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }
      distinct_on: partner_id
      order_by: { partner_id: asc }
    ) {
      partner_id
    }
    active_partners_prev: orders(
      where: {
        created_at: { _gte: $prevStart, _lt: $prevEnd },
        partner_id: { _nin: $excluded },
        type: { _in: $directTypes },
        _and: [
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
          { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }
      distinct_on: partner_id
      order_by: { partner_id: asc }
    ) {
      partner_id
    }
    new_partners: partners_aggregate(where: {
      created_at: { _gte: $start, _lte: $end },
      id: { _nin: $excluded }
    }) {
      aggregate { count }
    }
    new_partners_prev: partners_aggregate(where: {
      created_at: { _gte: $prevStart, _lt: $prevEnd },
      id: { _nin: $excluded }
    }) {
      aggregate { count }
    }
    reviews: reviews_aggregate(where: {
      created_at: { _gte: $startDate, _lte: $endDate },
      partner_id: { _nin: $excluded }
    }) {
      aggregate { count, avg { rating } }
    }
    offers_claimed: offers_claimed_aggregate(where: {
      claimed_time: { _gte: $start, _lte: $end },
      partner_id: { _nin: $excluded }
    }) {
      aggregate { count }
    }

    direct_delivery: orders_aggregate(where: {
      _and: [
        { created_at: { _gte: $start, _lte: $end } },
        { type: { _eq: "delivery" } },
        { partner_id: { _nin: $excluded } },
        { delivery_address: { _is_null: false } },
        { delivery_address: { _neq: "" } },
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) { aggregate { count, sum { total_price } } }
    direct_delivery_prev: orders_aggregate(where: {
      _and: [
        { created_at: { _gte: $prevStart, _lt: $prevEnd } },
        { type: { _eq: "delivery" } },
        { partner_id: { _nin: $excluded } },
        { delivery_address: { _is_null: false } },
        { delivery_address: { _neq: "" } },
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) { aggregate { count, sum { total_price } } }

    direct_takeaway: orders_aggregate(where: {
      _and: [
        { created_at: { _gte: $start, _lte: $end } },
        { type: { _eq: "delivery" } },
        { partner_id: { _nin: $excluded } },
        { _or: [{ delivery_address: { _is_null: true } }, { delivery_address: { _eq: "" } }] },
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) { aggregate { count, sum { total_price } } }
    direct_takeaway_prev: orders_aggregate(where: {
      _and: [
        { created_at: { _gte: $prevStart, _lt: $prevEnd } },
        { type: { _eq: "delivery" } },
        { partner_id: { _nin: $excluded } },
        { _or: [{ delivery_address: { _is_null: true } }, { delivery_address: { _eq: "" } }] },
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) { aggregate { count, sum { total_price } } }

  }
`;

const ALL_TIME_QUERY = `
  query AllTime($excluded: [uuid!]!, $excludedUsers: [uuid!]!, $excludedQrs: [uuid!]!, $directTypes: [String!]!) {
    total_partners: partners_aggregate(where: { id: { _nin: $excluded } }) {
      aggregate { count }
    }
    total_users: users_aggregate(where: { id: { _nin: $excludedUsers } }) {
      aggregate { count }
    }
    total_orders: orders_aggregate(where: {
      partner_id: { _nin: $excluded },
      type: { _in: $directTypes },
      _and: [
        { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
        { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
      ]
    }) {
      aggregate { count, sum { total_price }, avg { total_price } }
    }
    total_qr_scans: qr_scans_aggregate(where: {
      qr_id: { _nin: $excludedQrs }
    }) { aggregate { count } }
    total_reviews: reviews_aggregate(where: {
      partner_id: { _nin: $excluded }
    }) {
      aggregate { count, avg { rating } }
    }
  }
`;

const TOP_PARTNERS_QUERY = `
  query TopPartners($start: timestamptz!, $end: timestamptz!, $excluded: [uuid!]!, $excludedUsers: [uuid!]!, $directTypes: [String!]!) {
    partners(
      where: {
        id: { _nin: $excluded },
        orders: {
          created_at: { _gte: $start, _lte: $end },
          type: { _in: $directTypes },
          _and: [
            { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
            { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
          ]
        }
      }
      limit: 100
    ) {
      id
      name
      district
      orders_aggregate(where: {
        created_at: { _gte: $start, _lte: $end },
        type: { _in: $directTypes },
        _and: [
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }) {
        aggregate { count, sum { total_price } }
      }
    }
  }
`;

const TOP_QR_QUERY = `
  query TopQr($start: timestamptz!, $end: timestamptz!, $excluded: [uuid!]!, $excludedQrs: [uuid!]!) {
    qr_scans(
      where: {
        created_at: { _gte: $start, _lte: $end },
        qr_id: { _nin: $excludedQrs }
      }
      limit: 5000
      order_by: { created_at: desc }
    ) {
      qr_id
    }
    qr_codes(
      where: { partner_id: { _nin: $excluded } }
      order_by: { no_of_scans: desc }
      limit: 10
    ) {
      id
      no_of_scans
      table_number
      table_name
      partner { id, name, district }
    }
  }
`;

const CITY_QUERY = `
  query Cities($excluded: [uuid!]!) {
    partners(where: {
      district: { _is_null: false },
      id: { _nin: $excluded }
    }, limit: 1000) {
      district
    }
  }
`;

function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function maskName(name: string | null | undefined) {
  if (!name) return "—";
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(0, Math.min(trimmed.length, 24));
}

async function dailySeries(
  start: string,
  end: string,
  days: number,
  excludedQrs: string[]
): Promise<
  Array<{
    d: string;
    orders: number;
    gmv: number;
    customers: number;
    scans: number;
    newPartners: number;
    delivery: number;
    takeaway: number;
  }>
> {
  const buckets: Record<
    string,
    {
      orders: number;
      gmv: number;
      customers: Set<string>;
      scans: number;
      newPartners: number;
      delivery: number;
      takeaway: number;
    }
  > = {};
  for (let i = 0; i < days; i++) {
    const day = new Date(new Date(start).getTime() + i * 86400000)
      .toISOString()
      .slice(0, 10);
    buckets[day] = {
      orders: 0,
      gmv: 0,
      customers: new Set(),
      scans: 0,
      newPartners: 0,
      delivery: 0,
      takeaway: 0,
    };
  }

  const SERIES_QUERY = `
    query Series($start: timestamptz!, $end: timestamptz!, $excluded: [uuid!]!, $excludedUsers: [uuid!]!, $excludedQrs: [uuid!]!, $directTypes: [String!]!) {
      orders(where: {
        created_at: { _gte: $start, _lte: $end },
        partner_id: { _nin: $excluded },
        type: { _in: $directTypes },
        _and: [
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
        { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }, limit: 50000) {
        created_at
        total_price
        user_id
        type
        delivery_address
      }
      qr_scans(where: {
        created_at: { _gte: $start, _lte: $end },
        qr_id: { _nin: $excludedQrs }
      }, limit: 100000) {
        created_at
      }
      partners(where: {
        created_at: { _gte: $start, _lte: $end },
        id: { _nin: $excluded }
      }, limit: 5000) {
        created_at
      }
    }
  `;

  const data = await hasura(SERIES_QUERY, {
    start,
    end,
    excluded: EXCLUDED_PARTNER_IDS,
    excludedUsers: EXCLUDED_USER_IDS,
    excludedQrs,
    directTypes: DIRECT_TYPES,
  });

  for (const o of data.orders ?? []) {
    const d = new Date(o.created_at).toISOString().slice(0, 10);
    if (buckets[d]) {
      buckets[d].orders += 1;
      buckets[d].gmv += Number(o.total_price ?? 0);
      if (o.user_id) buckets[d].customers.add(o.user_id);
      if (o.type === "delivery") {
        // Delivery without an address is treated as takeaway.
        const addr = (o.delivery_address ?? "").toString().trim();
        if (addr) buckets[d].delivery += 1;
        else buckets[d].takeaway += 1;
      }
    }
  }
  for (const s of data.qr_scans ?? []) {
    const d = new Date(s.created_at).toISOString().slice(0, 10);
    if (buckets[d]) buckets[d].scans += 1;
  }
  for (const p of data.partners ?? []) {
    const d = new Date(p.created_at).toISOString().slice(0, 10);
    if (buckets[d]) buckets[d].newPartners += 1;
  }

  return Object.entries(buckets).map(([d, v]) => ({
    d,
    orders: v.orders,
    gmv: Math.round(v.gmv),
    customers: v.customers.size,
    scans: v.scans,
    newPartners: v.newPartners,
    delivery: v.delivery,
    takeaway: v.takeaway,
  }));
}

export async function GET(req: NextRequest) {
  try {
    const range = (req.nextUrl.searchParams.get("range") ?? "30d") as Range;
    const w = windowFor(RANGE_DAYS[range] ? range : "30d");

    // Resolve qr_ids belonging to excluded partners (qr_scans has no partner relationship)
    const excludedQrsResp = await hasura(
      `query ExcludedQrs($excluded: [uuid!]!) {
         qr_codes(where: { partner_id: { _in: $excluded } }) { id }
       }`,
      { excluded: EXCLUDED_PARTNER_IDS }
    );
    const excludedQrs: string[] = (excludedQrsResp.qr_codes ?? []).map(
      (q: any) => q.id
    );

    const [kpi, allTime, topPartners, topQr, cities, series] = await Promise.all([
      hasura(KPI_QUERY, {
        start: w.start,
        end: w.end,
        prevStart: w.prevStart,
        prevEnd: w.prevEnd,
        startDate: w.startDate,
        endDate: w.endDate,
        excluded: EXCLUDED_PARTNER_IDS,
        excludedUsers: EXCLUDED_USER_IDS,
        excludedQrs,
        directTypes: DIRECT_TYPES,
      }),
      hasura(ALL_TIME_QUERY, {
        excluded: EXCLUDED_PARTNER_IDS,
        excludedUsers: EXCLUDED_USER_IDS,
        excludedQrs,
        directTypes: DIRECT_TYPES,
      }),
      hasura(TOP_PARTNERS_QUERY, {
        start: w.start,
        end: w.end,
        excluded: EXCLUDED_PARTNER_IDS,
        excludedUsers: EXCLUDED_USER_IDS,
        directTypes: DIRECT_TYPES,
      }),
      hasura(TOP_QR_QUERY, {
        start: w.start,
        end: w.end,
        excluded: EXCLUDED_PARTNER_IDS,
        excludedQrs,
      }),
      hasura(CITY_QUERY, { excluded: EXCLUDED_PARTNER_IDS }),
      dailySeries(w.start, w.end, w.days, excludedQrs),
    ]);

    const ordersCount = kpi.orders?.aggregate?.count ?? 0;
    const ordersPrev = kpi.orders_prev?.aggregate?.count ?? 0;
    const gmv = Math.round(kpi.orders?.aggregate?.sum?.total_price ?? 0);
    const gmvPrev = Math.round(kpi.orders_prev?.aggregate?.sum?.total_price ?? 0);
    const activeCustomers = (kpi.active_customers ?? []).length;
    const activeCustomersPrev = (kpi.active_customers_prev ?? []).length;
    const scans = kpi.qr_scans?.aggregate?.count ?? 0;
    const scansPrev = kpi.qr_scans_prev?.aggregate?.count ?? 0;
    const activePartners = (kpi.active_partners ?? []).length;
    const activePartnersPrev = (kpi.active_partners_prev ?? []).length;
    const newPartners = kpi.new_partners?.aggregate?.count ?? 0;
    const newPartnersPrev = kpi.new_partners_prev?.aggregate?.count ?? 0;
    const reviews = kpi.reviews?.aggregate?.count ?? 0;
    const avgRating = kpi.reviews?.aggregate?.avg?.rating ?? null;
    const offersClaimed = kpi.offers_claimed?.aggregate?.count ?? 0;
    const cancelledCount = kpi.cancelled_orders?.aggregate?.count ?? 0;

    const districtCounts: Record<string, number> = {};
    for (const p of cities.partners ?? []) {
      const d = (p.district ?? "").toString().trim();
      if (!d) continue;
      districtCounts[d] = (districtCounts[d] ?? 0) + 1;
    }
    const topCities = Object.entries(districtCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([city, count]) => ({ city, count }));

    const qrScanCounts: Record<string, number> = {};
    for (const s of topQr.qr_scans ?? []) {
      qrScanCounts[s.qr_id] = (qrScanCounts[s.qr_id] ?? 0) + 1;
    }
    const topQrInPeriod = Object.entries(qrScanCounts)
      .map(([qr_id, count]) => {
        const meta = (topQr.qr_codes ?? []).find((q: any) => q.id === qr_id);
        return {
          qr_id,
          count,
          partner_name: meta?.partner?.name ?? "—",
          district: meta?.partner?.district ?? null,
          table_number: meta?.table_number ?? null,
          table_name: meta?.table_name ?? null,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topPartnersList = (topPartners.partners ?? [])
      .map((p: any) => ({
        id: p.id,
        name: maskName(p.name),
        district: p.district ?? null,
        orders: p.orders_aggregate?.aggregate?.count ?? 0,
        gmv: Math.round(p.orders_aggregate?.aggregate?.sum?.total_price ?? 0),
      }))
      .sort((a: any, b: any) => b.orders - a.orders);

    const topPartnersByGmv = [...topPartnersList].sort((a, b) => b.gmv - a.gmv);

    const completionRate =
      ordersCount > 0
        ? Math.round(
            ((kpi.completed_orders?.aggregate?.count ?? 0) / ordersCount) * 1000
          ) / 10
        : 0;

    const channel = (curr: any, prev: any) => {
      const c = curr?.aggregate?.count ?? 0;
      const g = Math.round(curr?.aggregate?.sum?.total_price ?? 0);
      const cPrev = prev?.aggregate?.count ?? 0;
      const gPrev = Math.round(prev?.aggregate?.sum?.total_price ?? 0);
      return {
        orders: c,
        gmv: g,
        ordersDelta: pctDelta(c, cPrev),
        gmvDelta: pctDelta(g, gPrev),
      };
    };

    const channels = {
      directDelivery: channel(kpi.direct_delivery, kpi.direct_delivery_prev),
      directTakeaway: channel(kpi.direct_takeaway, kpi.direct_takeaway_prev),
    };

    const directTotal = {
      orders:
        channels.directDelivery.orders +
        channels.directTakeaway.orders,
      gmv:
        channels.directDelivery.gmv +
        channels.directTakeaway.gmv,
    };
    const directPrev = {
      orders:
        (kpi.direct_delivery_prev?.aggregate?.count ?? 0) +
        (kpi.direct_takeaway_prev?.aggregate?.count ?? 0),
      gmv: Math.round(
        (kpi.direct_delivery_prev?.aggregate?.sum?.total_price ?? 0) +
          (kpi.direct_takeaway_prev?.aggregate?.sum?.total_price ?? 0)
      ),
    };

    return NextResponse.json({
      range,
      window: { start: w.start, end: w.end },
      kpis: {
        activeCustomers: {
          value: activeCustomers,
          delta: pctDelta(activeCustomers, activeCustomersPrev),
        },
        orders: { value: ordersCount, delta: pctDelta(ordersCount, ordersPrev) },
        gmv: { value: gmv, delta: pctDelta(gmv, gmvPrev) },
        scans: { value: scans, delta: pctDelta(scans, scansPrev) },
        activePartners: {
          value: activePartners,
          delta: pctDelta(activePartners, activePartnersPrev),
        },
        newPartners: { value: newPartners, delta: pctDelta(newPartners, newPartnersPrev) },
        reviews: { value: reviews, delta: null, avgRating },
        offersClaimed: { value: offersClaimed, delta: null },
        cancelled: { value: cancelledCount, delta: null },
        completionRate,
      },
      series,
      channels,
      channelTotals: {
        direct: {
          ...directTotal,
          ordersDelta: pctDelta(directTotal.orders, directPrev.orders),
          gmvDelta: pctDelta(directTotal.gmv, directPrev.gmv),
        },
      },
      topPartnersByOrders: topPartnersList.slice(0, 10),
      topPartnersByGmv: topPartnersByGmv.slice(0, 10),
      topQr: topQrInPeriod,
      topCities,
      allTime: {
        partners: allTime.total_partners?.aggregate?.count ?? 0,
        users: allTime.total_users?.aggregate?.count ?? 0,
        orders: allTime.total_orders?.aggregate?.count ?? 0,
        gmv: Math.round(allTime.total_orders?.aggregate?.sum?.total_price ?? 0),
        avgOrderValue: Math.round(allTime.total_orders?.aggregate?.avg?.total_price ?? 0),
        qrScans: allTime.total_qr_scans?.aggregate?.count ?? 0,
        reviews: allTime.total_reviews?.aggregate?.count ?? 0,
        avgRating: allTime.total_reviews?.aggregate?.avg?.rating ?? null,
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("public stats failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
