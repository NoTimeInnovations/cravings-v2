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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const ordersWhere: Record<string, unknown> = {
      partner_id: { _eq: partnerId },
      status: { _nin: ["pending_payment", "expired"] },
      ...(scope === "today" ? { created_at: { _gte: todayIso } } : {}),
    };

    const data = await hasura(ORDERS_QUERY, {
      partnerId,
      today: todayIso,
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
