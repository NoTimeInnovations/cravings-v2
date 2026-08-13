import { NextRequest, NextResponse } from "next/server";
import { getBlockedPartnerIds } from "../_blocklist";

/**
 * All Customers — a CRM-style roster of every partner, with the sales/onboarding
 * state the team tracks by hand (interest, menu-created, payment gateway, PG
 * status, delivery, QR setup) plus computed ONLINE-order stats.
 *
 * Stored in `analytics_customers`. Unlike the watchlist, the order stats here are
 * NOT live — they're computed and written only when the "Sync list" button runs
 * (see ./sync). This route just reads the stored rows and lets the manual fields
 * be edited.
 *
 *   GET   → customer rows (blocked partners excluded) joined with partner info
 *   PATCH → edit the manual fields of one row
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_INTEREST = new Set(["warm", "hot", "active"]);

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

const LIST_QUERY = `
  query Customers($blocked: [uuid!]!) {
    analytics_customers(
      where: { partner_id: { _nin: $blocked } }
      order_by: { total_orders: desc }
    ) {
      id
      partner_id
      interest
      menu_created
      menu_item_count
      payment_gateway
      pg_status
      delivery
      delivery_note
      qr_table
      qr_counter
      qr_swiggy_zomato
      qr_own_parcels
      total_orders
      weekly
      stats_synced_at
      created_at
    }
  }
`;

const PARTNERS_QUERY = `
  query CustomerPartners($ids: [uuid!]!) {
    partners(where: { id: { _in: $ids } }) {
      id
      name
      store_name
      district
      username
      created_at
    }
  }
`;

// -------------------------------------------------------------------- GET
export async function GET() {
  try {
    const blocked = await getBlockedPartnerIds();
    const listRes = await hasura(LIST_QUERY, { blocked });
    if (listRes.errors) {
      console.error("customers list errors:", JSON.stringify(listRes.errors));
      return NextResponse.json({ error: "list failed" }, { status: 500 });
    }
    const rows: any[] = listRes.data?.analytics_customers ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ entries: [], syncedAt: null });
    }

    const ids = Array.from(new Set(rows.map((r) => r.partner_id)));
    const pRes = await hasura(PARTNERS_QUERY, { ids });
    if (pRes.errors) console.error("customers partners errors:", JSON.stringify(pRes.errors));
    const byId: Record<string, any> = {};
    for (const p of pRes.data?.partners ?? []) byId[p.id] = p;

    let lastSynced: string | null = null;
    const entries = rows.map((r) => {
      const p = byId[r.partner_id];
      if (r.stats_synced_at && (!lastSynced || r.stats_synced_at > lastSynced)) {
        lastSynced = r.stats_synced_at;
      }
      const weekly = Array.isArray(r.weekly) ? r.weekly.map((n: any) => Number(n) || 0) : [];
      return {
        id: r.id,
        partnerId: r.partner_id,
        name: p?.name ?? p?.store_name ?? "—",
        district: p?.district ?? null,
        username: p?.username ?? null,
        joinedAt: p?.created_at ?? null, // when the partner was created (joined)
        interest: r.interest,
        menuCreated: !!r.menu_created,
        menuItemCount: Number(r.menu_item_count ?? 0),
        paymentGateway: r.payment_gateway ?? null,
        pgStatus: r.pg_status ?? null,
        delivery: r.delivery ?? null,
        deliveryNote: r.delivery_note ?? null,
        qrTable: !!r.qr_table,
        qrCounter: !!r.qr_counter,
        qrSwiggyZomato: !!r.qr_swiggy_zomato,
        qrOwnParcels: !!r.qr_own_parcels,
        totalOrders: Number(r.total_orders ?? 0),
        weekly,
        statsSyncedAt: r.stats_synced_at ?? null,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({ entries, syncedAt: lastSynced });
  } catch (e: any) {
    console.error("customers GET failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// map camelCase input keys → DB columns for the editable manual fields
const TEXT_FIELDS: Record<string, string> = {
  paymentGateway: "payment_gateway",
  pgStatus: "pg_status",
  delivery: "delivery",
  deliveryNote: "delivery_note",
};
const BOOL_FIELDS: Record<string, string> = {
  menuCreated: "menu_created",
  qrTable: "qr_table",
  qrCounter: "qr_counter",
  qrSwiggyZomato: "qr_swiggy_zomato",
  qrOwnParcels: "qr_own_parcels",
};

// -------------------------------------------------------------------- PATCH (edit manual fields)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    if (!UUID_RE.test(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const set: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.interest != null) {
      const v = String(body.interest).trim();
      if (!VALID_INTEREST.has(v))
        return NextResponse.json({ error: "Invalid interest" }, { status: 400 });
      set.interest = v;
    }
    for (const [key, col] of Object.entries(TEXT_FIELDS)) {
      if (body[key] !== undefined) {
        const raw = body[key];
        set[col] = raw == null ? null : String(raw).trim().slice(0, 300) || null;
      }
    }
    for (const [key, col] of Object.entries(BOOL_FIELDS)) {
      if (body[key] !== undefined) set[col] = !!body[key];
    }

    if (Object.keys(set).length === 1) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const res = await hasura(
      `mutation EditCustomer($id: uuid!, $set: analytics_customers_set_input!) {
         update_analytics_customers_by_pk(pk_columns: { id: $id }, _set: $set) { id }
       }`,
      { id, set }
    );
    if (res.errors) {
      console.error("customers edit errors:", JSON.stringify(res.errors));
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    return NextResponse.json({ id });
  } catch (e: any) {
    console.error("customers PATCH failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
