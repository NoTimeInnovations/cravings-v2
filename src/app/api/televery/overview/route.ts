import { NextRequest, NextResponse } from "next/server";
import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { TELEVERY_PARTNER_ID, TELEVERY_ROLE } from "@/lib/televery";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

// Orders that never became real orders are excluded everywhere, matching the
// convention used by the rest of the stats routes.
const LIVE_STATUS = `{ _nin: ["pending_payment", "expired"] }`;

// One round-trip: the brand's outlets plus a per-outlet order count/GMV. The
// nested-aggregate shape is copied from /api/stats/selected-partners.
const OVERVIEW_QUERY = `
query TeleveryOverview($parent_partner_id: uuid!) {
  branches(where: { parent_partner_id: { _eq: $parent_partner_id } }, limit: 1) {
    id
    name
    outlets(
      where: { status: { _eq: "active" } }
      order_by: { store_name: asc }
    ) {
      id
      username
      store_name
      location
      phone
      status
      orders_aggregate(where: { status: ${LIVE_STATUS} }) {
        aggregate { count sum { total_price } }
      }
    }
  }
}`;

// Drill-down: one outlet's recent orders.
const OUTLET_ORDERS_QUERY = `
query TeleveryOutletOrders($partner_id: uuid!, $limit: Int!, $offset: Int!) {
  orders(
    where: { partner_id: { _eq: $partner_id }, status: ${LIVE_STATUS} }
    order_by: { created_at: desc }
    limit: $limit
    offset: $offset
  ) {
    id
    display_id
    created_at
    status
    type
    total_price
    user { full_name phone }
  }
  orders_aggregate(where: { partner_id: { _eq: $partner_id }, status: ${LIVE_STATUS} }) {
    aggregate { count }
  }
}`;

type Outlet = {
  id: string;
  username: string | null;
  store_name: string | null;
  location: string | null;
  phone: string | null;
  status: string | null;
  orders_aggregate?: { aggregate?: { count?: number; sum?: { total_price?: number | null } } };
};

/**
 * Marketplace dashboard data for Televery.
 *
 * The set of connected businesses is resolved SERVER-SIDE from the signed-in
 * session, never from the request — a caller cannot ask for another brand's
 * outlets. `partnerId` (drill-down) is likewise checked for membership of the
 * caller's own brand before any orders are returned.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthCookie();
  if (!auth || auth.role !== TELEVERY_ROLE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // The session is the marketplace parent; ignore any caller-supplied identity.
  const parentPartnerId = auth.id || TELEVERY_PARTNER_ID;

  try {
    const data = await fetchFromHasuraServer(OVERVIEW_QUERY, {
      parent_partner_id: parentPartnerId,
    });

    const branch = data?.branches?.[0] ?? null;
    const rawOutlets: Outlet[] = branch?.outlets ?? [];

    // The parent partner is itself a member row of its own branch — exclude it
    // so "connected businesses" counts only the shops Televery has onboarded.
    const outlets = rawOutlets.filter((o) => o.id !== parentPartnerId);

    const businesses = outlets.map((o) => ({
      id: o.id,
      username: o.username,
      storeName: o.store_name,
      location: o.location,
      phone: o.phone,
      status: o.status,
      orders: o.orders_aggregate?.aggregate?.count ?? 0,
      revenue: o.orders_aggregate?.aggregate?.sum?.total_price ?? 0,
    }));

    const totals = {
      businesses: businesses.length,
      orders: businesses.reduce((n, b) => n + b.orders, 0),
      revenue: businesses.reduce((n, b) => n + (b.revenue || 0), 0),
    };

    // Optional drill-down for one connected business.
    const partnerId = request.nextUrl.searchParams.get("partnerId");
    let outletOrders = null;
    if (partnerId) {
      if (!businesses.some((b) => b.id === partnerId)) {
        return NextResponse.json(
          { error: "That business is not connected to your account." },
          { status: 403 },
        );
      }
      const page = Math.max(0, Number(request.nextUrl.searchParams.get("page") || 0));
      const res = await fetchFromHasuraServer(OUTLET_ORDERS_QUERY, {
        partner_id: partnerId,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      outletOrders = {
        partnerId,
        page,
        pageSize: PAGE_SIZE,
        total: res?.orders_aggregate?.aggregate?.count ?? 0,
        orders: (res?.orders ?? []).map((o: any) => ({
          id: o.id,
          displayId: o.display_id,
          createdAt: o.created_at,
          status: o.status,
          type: o.type,
          totalPrice: o.total_price,
          customerName: o.user?.full_name ?? null,
          customerPhone: o.user?.phone ?? null,
        })),
      };
    }

    return NextResponse.json({
      brand: branch ? { id: branch.id, name: branch.name } : null,
      totals,
      businesses,
      outletOrders,
    });
  } catch (err: any) {
    console.error("televery/overview failed", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
