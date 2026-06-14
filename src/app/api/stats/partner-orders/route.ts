import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS } from "../_excluded";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAGE_SIZE = 25;

// Full partner list for the picker — every partner, not just recently active
// ones (unlike /api/stats/live, which only lists the last 7 days).
const PARTNERS_QUERY = `
  query AllPartners($excluded: [uuid!]!) {
    partners(
      where: { id: { _nin: $excluded } }
      order_by: { name: asc }
      limit: 2000
    ) {
      id
      name
      store_name
      district
    }
  }
`;

// Same status exclusions as the admin-v2 orders views: drafts whose payment
// never completed are hidden everywhere.
const ORDER_FIELDS = `
  id
  display_id
  created_at
  status
  type
  total_price
  table_number
  table_name
  qr_code { table_name }
  delivery_address
  delivery_location
  phone
  orderedby
  payment_method
  is_paid
  cashfree_payment_id
  order_channel
  notes
  gst_included
  extra_charges
  discounts
  cancel_reason
  cancelled_by
  scheduled_date
  scheduled_time
  scheduled_time_to
  booking_persons
  loyalty_points_redeemed
  loyalty_redeem_value
  loyalty_points_earned
  user { full_name phone }
  order_items {
    quantity
    item
    menu { name price }
  }
`;

const ORDERS_QUERY = `
  query PartnerOrders(
    $partnerId: uuid!,
    $today: timestamptz!,
    $monthWhere: orders_bool_exp!,
    $weekWhere: orders_bool_exp!,
    $chAppWhere: orders_bool_exp!,
    $chWebWhere: orders_bool_exp!,
    $chWaWhere: orders_bool_exp!,
    $chTotalWhere: orders_bool_exp!,
    $ordersWhere: orders_bool_exp!,
    $limit: Int!,
    $offset: Int!
  ) {
    partner: partners_by_pk(id: $partnerId) {
      id
      name
      store_name
      district
      currency
      gst_percentage
      country
    }

    today_agg: orders_aggregate(where: {
      partner_id: { _eq: $partnerId },
      created_at: { _gte: $today },
      status: { _nin: ["pending_payment", "expired"] }
    }) { aggregate { count, sum { total_price } } }

    all_agg: orders_aggregate(where: {
      partner_id: { _eq: $partnerId },
      status: { _nin: ["pending_payment", "expired"] }
    }) { aggregate { count, sum { total_price } } }

    month_agg: orders_aggregate(where: $monthWhere) {
      aggregate { count, sum { total_price } }
    }

    week_agg: orders_aggregate(where: $weekWhere) {
      aggregate { count, sum { total_price } }
    }

    ch_app_agg: orders_aggregate(where: $chAppWhere) {
      aggregate { count, sum { total_price } }
    }

    ch_web_agg: orders_aggregate(where: $chWebWhere) {
      aggregate { count, sum { total_price } }
    }

    ch_wa_agg: orders_aggregate(where: $chWaWhere) {
      aggregate { count, sum { total_price } }
    }

    ch_total_agg: orders_aggregate(where: $chTotalWhere) {
      aggregate { count, sum { total_price } }
    }

    page_agg: orders_aggregate(where: $ordersWhere) {
      aggregate { count }
    }

    orders(
      where: $ordersWhere,
      order_by: { created_at: desc },
      limit: $limit,
      offset: $offset
    ) {
      ${ORDER_FIELDS}
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
  if (json.errors) {
    console.error("partner-orders Hasura errors:", JSON.stringify(json.errors));
  }
  return json.data ?? {};
}

function mapOrder(o: any) {
  return {
    id: o.id,
    displayId: o.display_id ?? null,
    createdAt: o.created_at,
    status: o.status ?? null,
    type: o.type ?? null,
    totalPrice: o.total_price ?? 0,
    tableNumber: o.table_number ?? null,
    tableName: o.qr_code?.table_name ?? o.table_name ?? null,
    deliveryAddress: o.delivery_address ?? null,
    deliveryLocation: o.delivery_location ?? null,
    phone: o.phone ?? null,
    orderedby: o.orderedby ?? null,
    paymentMethod: o.payment_method ?? null,
    isPaid: o.is_paid ?? false,
    cashfreePaymentId: o.cashfree_payment_id ?? null,
    orderChannel: o.order_channel ?? null,
    notes: o.notes ?? null,
    gstIncluded: o.gst_included ?? null,
    extraCharges: o.extra_charges ?? [],
    discounts: o.discounts ?? [],
    cancelReason: o.cancel_reason ?? null,
    cancelledBy: o.cancelled_by ?? null,
    scheduledDate: o.scheduled_date ?? null,
    scheduledTime: o.scheduled_time ?? null,
    bookingPersons: o.booking_persons ?? null,
    loyaltyPointsRedeemed: o.loyalty_points_redeemed ?? 0,
    loyaltyRedeemValue: o.loyalty_redeem_value ?? 0,
    loyaltyPointsEarned: o.loyalty_points_earned ?? null,
    userName: o.user?.full_name ?? null,
    userPhone: o.user?.phone ?? null,
    items: (o.order_items ?? []).map((i: any) => ({
      name: i.item?.name ?? i.menu?.name ?? "Unknown",
      price: i.item?.price ?? i.menu?.price ?? 0,
      quantity: i.quantity ?? 0,
      isFreebie: i.item?.is_freebie ?? false,
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const partnerIdParam = req.nextUrl.searchParams.get("partnerId");
    const partnerId =
      partnerIdParam && UUID_RE.test(partnerIdParam) ? partnerIdParam : null;

    // Without a partner, just return the picker options.
    if (!partnerId) {
      const data = await hasura(PARTNERS_QUERY, {
        excluded: EXCLUDED_PARTNER_IDS,
      });
      const partners = (data.partners ?? [])
        .filter((p: any) => p?.id && (p.name || p.store_name))
        .map((p: any) => ({
          id: p.id,
          name: p.name ?? p.store_name,
          district: p.district ?? null,
        }));
      return NextResponse.json({ partners, syncedAt: new Date().toISOString() });
    }

    const scopeParam = req.nextUrl.searchParams.get("scope");
    const scope: "today" | "all" = scopeParam === "all" ? "all" : "today";

    const pageParam = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

    const now = new Date();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    // Selected month/year for the monthly card (defaults to the current month).
    const monthParam = Number(req.nextUrl.searchParams.get("month"));
    const yearParam = Number(req.nextUrl.searchParams.get("year"));
    const selMonth =
      Number.isFinite(monthParam) && monthParam >= 1 && monthParam <= 12
        ? Math.floor(monthParam)
        : now.getMonth() + 1;
    const selYear =
      Number.isFinite(yearParam) && yearParam >= 2000 && yearParam <= 3000
        ? Math.floor(yearParam)
        : now.getFullYear();
    const monthStart = new Date(selYear, selMonth - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(selYear, selMonth, 1, 0, 0, 0, 0);

    // Start of the current week (Monday-based).
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const diffToMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - diffToMonday);

    // Customisable channel-breakdown range (defaults: from the beginning → now).
    const fromParam = req.nextUrl.searchParams.get("from");
    const toParam = req.nextUrl.searchParams.get("to");
    const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/;
    const rangeFrom =
      fromParam && dateOnlyRe.test(fromParam)
        ? new Date(`${fromParam}T00:00:00.000`)
        : null;
    const rangeTo =
      toParam && dateOnlyRe.test(toParam)
        ? new Date(`${toParam}T23:59:59.999`)
        : now;

    // New metrics ignore cancelled orders (as well as the always-hidden drafts).
    const ACTIVE_STATUS = {
      status: { _nin: ["pending_payment", "expired", "cancelled"] },
    };

    const monthWhere = {
      partner_id: { _eq: partnerId },
      ...ACTIVE_STATUS,
      created_at: { _gte: monthStart.toISOString(), _lt: monthEnd.toISOString() },
    };

    const weekWhere = {
      partner_id: { _eq: partnerId },
      ...ACTIVE_STATUS,
      created_at: { _gte: weekStart.toISOString() },
    };

    const rangeCreatedAt: Record<string, string> = {
      ...(rangeFrom ? { _gte: rangeFrom.toISOString() } : {}),
      _lte: rangeTo.toISOString(),
    };
    const chBase = {
      partner_id: { _eq: partnerId },
      ...ACTIVE_STATUS,
      created_at: rangeCreatedAt,
    };
    // Untagged (null) orders predate the order_channel column → counted as web.
    const chAppWhere = { ...chBase, order_channel: { _eq: "app" } };
    const chWebWhere = {
      _and: [
        chBase,
        {
          _or: [
            { order_channel: { _eq: "web" } },
            { order_channel: { _is_null: true } },
          ],
        },
      ],
    };
    const chWaWhere = { ...chBase, order_channel: { _in: ["whatsapp", "wa"] } };
    const chTotalWhere = chBase;

    const ordersWhere: Record<string, unknown> = {
      partner_id: { _eq: partnerId },
      status: { _nin: ["pending_payment", "expired"] },
      ...(scope === "today" ? { created_at: { _gte: todayIso } } : {}),
    };

    const data = await hasura(ORDERS_QUERY, {
      partnerId,
      today: todayIso,
      monthWhere,
      weekWhere,
      chAppWhere,
      chWebWhere,
      chWaWhere,
      chTotalWhere,
      ordersWhere,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

    if (!data.partner) {
      return NextResponse.json({ error: "partner not found" }, { status: 404 });
    }

    return NextResponse.json({
      partner: {
        id: data.partner.id,
        name: data.partner.name ?? data.partner.store_name ?? "—",
        district: data.partner.district ?? null,
        currency: data.partner.currency ?? "₹",
        gstPercentage: data.partner.gst_percentage ?? 0,
        country: data.partner.country ?? null,
      },
      summary: {
        today: {
          count: data.today_agg?.aggregate?.count ?? 0,
          gmv: Math.round(data.today_agg?.aggregate?.sum?.total_price ?? 0),
        },
        all: {
          count: data.all_agg?.aggregate?.count ?? 0,
          gmv: Math.round(data.all_agg?.aggregate?.sum?.total_price ?? 0),
        },
        month: {
          count: data.month_agg?.aggregate?.count ?? 0,
          gmv: Math.round(data.month_agg?.aggregate?.sum?.total_price ?? 0),
        },
        week: {
          count: data.week_agg?.aggregate?.count ?? 0,
          gmv: Math.round(data.week_agg?.aggregate?.sum?.total_price ?? 0),
        },
      },
      monthSelection: { year: selYear, month: selMonth },
      channels: {
        from: rangeFrom ? fromParam : null,
        to: toParam && dateOnlyRe.test(toParam) ? toParam : null,
        app: {
          count: data.ch_app_agg?.aggregate?.count ?? 0,
          gmv: Math.round(data.ch_app_agg?.aggregate?.sum?.total_price ?? 0),
        },
        web: {
          count: data.ch_web_agg?.aggregate?.count ?? 0,
          gmv: Math.round(data.ch_web_agg?.aggregate?.sum?.total_price ?? 0),
        },
        whatsapp: {
          count: data.ch_wa_agg?.aggregate?.count ?? 0,
          gmv: Math.round(data.ch_wa_agg?.aggregate?.sum?.total_price ?? 0),
        },
        total: {
          count: data.ch_total_agg?.aggregate?.count ?? 0,
          gmv: Math.round(data.ch_total_agg?.aggregate?.sum?.total_price ?? 0),
        },
      },
      scope,
      page,
      pageSize: PAGE_SIZE,
      totalCount: data.page_agg?.aggregate?.count ?? 0,
      orders: (data.orders ?? []).map(mapOrder),
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("partner-orders failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
