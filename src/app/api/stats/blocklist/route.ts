import { NextRequest, NextResponse } from "next/server";

/**
 * Block list — test / junk restaurants that must stay out of analytics.
 *
 * Stored in `analytics_blocklist` (partner_id + optional note). Blocked partners
 * are never added to the watchlist (manual add is rejected, sync skips them) and
 * are excluded from the signup counts. Blocking a partner also removes them from
 * the watchlist if they were being tracked.
 *
 *   GET    → blocked rows joined with partner name/district
 *   POST   → block a partner     { partnerId, note? }
 *   DELETE → unblock             ?id=<blocklist row id>
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  query Blocklist {
    analytics_blocklist(order_by: { created_at: desc }) {
      id
      partner_id
      note
      created_at
    }
  }
`;

const PARTNERS_QUERY = `
  query BlockedPartners($ids: [uuid!]!) {
    partners(where: { id: { _in: $ids } }) {
      id
      name
      store_name
      district
      username
    }
  }
`;

// -------------------------------------------------------------------- GET
export async function GET() {
  try {
    const listRes = await hasura(LIST_QUERY, {});
    if (listRes.errors) {
      console.error("blocklist list errors:", JSON.stringify(listRes.errors));
      return NextResponse.json({ error: "list failed" }, { status: 500 });
    }
    const rows: any[] = listRes.data?.analytics_blocklist ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ entries: [], syncedAt: new Date().toISOString() });
    }

    const ids = Array.from(new Set(rows.map((r) => r.partner_id)));
    const pRes = await hasura(PARTNERS_QUERY, { ids });
    if (pRes.errors) console.error("blocklist partners errors:", JSON.stringify(pRes.errors));

    const byId: Record<string, any> = {};
    for (const p of pRes.data?.partners ?? []) byId[p.id] = p;

    const entries = rows.map((r) => {
      const p = byId[r.partner_id];
      return {
        id: r.id,
        partnerId: r.partner_id,
        name: p?.name ?? p?.store_name ?? "—",
        district: p?.district ?? null,
        username: p?.username ?? null,
        note: r.note ?? null,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({ entries, syncedAt: new Date().toISOString() });
  } catch (e: any) {
    console.error("blocklist GET failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// -------------------------------------------------------------------- POST (block)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partnerId ?? "").trim();
    const note = body.note ? String(body.note).trim().slice(0, 200) : null;

    if (!UUID_RE.test(partnerId))
      return NextResponse.json({ error: "Invalid partner" }, { status: 400 });

    const res = await hasura(
      `mutation Block($obj: analytics_blocklist_insert_input!) {
         insert_analytics_blocklist_one(object: $obj) { id }
       }`,
      { obj: { partner_id: partnerId, note } }
    );

    if (res.errors) {
      const msg = JSON.stringify(res.errors);
      if (msg.includes("analytics_blocklist_partner_unique") || msg.includes("uniqueness")) {
        return NextResponse.json(
          { error: "This restaurant is already blocked." },
          { status: 409 }
        );
      }
      console.error("blocklist add errors:", msg);
      return NextResponse.json({ error: "Block failed" }, { status: 500 });
    }

    // Blocking un-tracks: drop them from the watchlist if they were on it.
    const del = await hasura(
      `mutation Untrack($pid: uuid!) {
         delete_analytics_watchlist(where: { partner_id: { _eq: $pid } }) { affected_rows }
       }`,
      { pid: partnerId }
    );
    const removedFromWatchlist = Number(
      del.data?.delete_analytics_watchlist?.affected_rows ?? 0
    );

    return NextResponse.json({
      id: res.data?.insert_analytics_blocklist_one?.id,
      removedFromWatchlist,
    });
  } catch (e: any) {
    console.error("blocklist POST failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// -------------------------------------------------------------------- DELETE (unblock)
export async function DELETE(req: NextRequest) {
  try {
    const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
    if (!UUID_RE.test(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const res = await hasura(
      `mutation Unblock($id: uuid!) {
         delete_analytics_blocklist_by_pk(id: $id) { id }
       }`,
      { id }
    );
    if (res.errors) {
      console.error("blocklist delete errors:", JSON.stringify(res.errors));
      return NextResponse.json({ error: "Unblock failed" }, { status: 500 });
    }
    return NextResponse.json({ id });
  } catch (e: any) {
    console.error("blocklist DELETE failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
