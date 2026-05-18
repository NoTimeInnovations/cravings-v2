import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_USER_IDS } from "../_excluded";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PARTNERS = 9;

const DIRECT_TYPES = ["delivery"];

const PARTNERS_QUERY = `
  query SelectedPartners(
    $ids: [uuid!]!,
    $since: timestamptz!,
    $monthStart: timestamptz!,
    $excludedUsers: [uuid!]!,
    $directTypes: [String!]!
  ) {
    partners(where: { id: { _in: $ids } }) {
      id
      name
      district
      store_name

      orders_total: orders_aggregate(where: {
        created_at: { _gte: $since },
        type: { _in: $directTypes },
        _and: [
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
          { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }) { aggregate { count } }

      orders_delivery: orders_aggregate(where: {
        _and: [
          { created_at: { _gte: $since } },
          { type: { _eq: "delivery" } },
          { delivery_address: { _is_null: false } },
          { delivery_address: { _neq: "" } },
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
          { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }) { aggregate { count } }

      orders_takeaway: orders_aggregate(where: {
        _and: [
          { created_at: { _gte: $since } },
          { type: { _eq: "delivery" } },
          { _or: [{ delivery_address: { _is_null: true } }, { delivery_address: { _eq: "" } }] },
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
          { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }) { aggregate { count } }

      month_total: orders_aggregate(where: {
        created_at: { _gte: $monthStart },
        _and: [
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
        ]
      }) { aggregate { count, sum { total_price } } }

      month_delivery: orders_aggregate(where: {
        _and: [
          { created_at: { _gte: $monthStart } },
          { type: { _eq: "delivery" } },
          { delivery_address: { _is_null: false } },
          { delivery_address: { _neq: "" } },
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
          { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }) { aggregate { count } }

      month_takeaway: orders_aggregate(where: {
        _and: [
          { created_at: { _gte: $monthStart } },
          { type: { _eq: "delivery" } },
          { _or: [{ delivery_address: { _is_null: true } }, { delivery_address: { _eq: "" } }] },
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] },
          { _or: [{ source: { _is_null: true } }, { source: { _eq: "customer" } }] }
        ]
      }) { aggregate { count } }
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
    console.error("Selected-partners Hasura errors:", JSON.stringify(json.errors));
  }
  return json.data ?? {};
}

function startOfCurrentMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("ids") ?? "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => UUID_RE.test(s))
      .slice(0, MAX_PARTNERS);

    if (ids.length === 0) {
      return NextResponse.json({
        partners: [],
        syncedAt: new Date().toISOString(),
      });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const monthStart = startOfCurrentMonth();

    const data = await hasura(PARTNERS_QUERY, {
      ids,
      since,
      monthStart,
      excludedUsers: EXCLUDED_USER_IDS,
      directTypes: DIRECT_TYPES,
    });

    const partners = (data.partners ?? []).map((p: any) => ({
      id: p.id,
      name: p.name ?? p.store_name ?? "—",
      district: p.district ?? null,
      totalOrders: p.orders_total?.aggregate?.count ?? 0,
      delivery: p.orders_delivery?.aggregate?.count ?? 0,
      takeaway: p.orders_takeaway?.aggregate?.count ?? 0,
      monthTotal: p.month_total?.aggregate?.count ?? 0,
      monthDelivery: p.month_delivery?.aggregate?.count ?? 0,
      monthTakeaway: p.month_takeaway?.aggregate?.count ?? 0,
      monthGmv: Number(p.month_total?.aggregate?.sum?.total_price ?? 0),
    }));

    return NextResponse.json({
      partners,
      windowStart: since,
      monthStart,
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("selected-partners failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
