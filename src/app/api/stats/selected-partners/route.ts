import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_USER_IDS } from "../_excluded";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PARTNERS = 9;

const POS_TYPES = ["dineinPOS", "pos", "takeawayPOS", "deliveryPOS"];
const DIRECT_TYPES = ["delivery", "table", "table_order"];

const PARTNERS_QUERY = `
  query SelectedPartners(
    $ids: [uuid!]!,
    $since: timestamptz!,
    $excludedUsers: [uuid!]!,
    $directTypes: [String!]!,
    $posTypes: [String!]!
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
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
        ]
      }) { aggregate { count } }

      orders_delivery: orders_aggregate(where: {
        _and: [
          { created_at: { _gte: $since } },
          { type: { _eq: "delivery" } },
          { delivery_address: { _is_null: false } },
          { delivery_address: { _neq: "" } },
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
        ]
      }) { aggregate { count } }

      orders_takeaway: orders_aggregate(where: {
        _and: [
          { created_at: { _gte: $since } },
          { type: { _eq: "delivery" } },
          { _or: [{ delivery_address: { _is_null: true } }, { delivery_address: { _eq: "" } }] },
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
        ]
      }) { aggregate { count } }

      orders_dinein: orders_aggregate(where: {
        created_at: { _gte: $since },
        type: { _in: ["table", "table_order"] },
        _and: [
          { _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }] },
          { _or: [{ user_id: { _is_null: true } }, { user_id: { _nin: $excludedUsers } }] }
        ]
      }) { aggregate { count } }

      orders_pos: orders_aggregate(where: {
        created_at: { _gte: $since },
        type: { _in: $posTypes },
        _or: [{ status: { _is_null: true } }, { status: { _neq: "cancelled" } }]
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

    const data = await hasura(PARTNERS_QUERY, {
      ids,
      since,
      excludedUsers: EXCLUDED_USER_IDS,
      directTypes: DIRECT_TYPES,
      posTypes: POS_TYPES,
    });

    const partners = (data.partners ?? []).map((p: any) => ({
      id: p.id,
      name: p.name ?? p.store_name ?? "—",
      district: p.district ?? null,
      totalOrders: p.orders_total?.aggregate?.count ?? 0,
      delivery: p.orders_delivery?.aggregate?.count ?? 0,
      takeaway: p.orders_takeaway?.aggregate?.count ?? 0,
      dinein: p.orders_dinein?.aggregate?.count ?? 0,
      pos: p.orders_pos?.aggregate?.count ?? 0,
    }));

    return NextResponse.json({
      partners,
      windowStart: since,
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("selected-partners failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
