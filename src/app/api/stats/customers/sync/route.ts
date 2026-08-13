import { NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS, EXCLUDED_USER_IDS } from "../../_excluded";
import { getBlockedPartnerIds } from "../../_blocklist";

/**
 * All Customers — sync.
 *
 * One click refreshes the whole roster: it (re)computes each partner's ONLINE
 * order stats (all-time total + the last 8 rolling 7-day weeks, POS/in-store
 * excluded) and active menu-item count, then upserts a row per partner into
 * `analytics_customers`.
 *
 * Manual CRM fields are preserved on re-sync (interest, payment gateway, PG
 * status, delivery, QR setup). `menu_created` is SEEDED on a partner's first
 * appearance (from the menu-size heuristic) and then left alone so hand edits
 * survive; the live item count is always refreshed so the human has the truth.
 *
 * Order/menu stats are computed with two grouped SQL passes (via Hasura
 * /v2/query run_sql) — far cheaper than per-partner GraphQL aggregates at 1000+
 * partners. Excluded test partners and blocked partners get no row.
 *
 *   POST → { partners, added, withOrders, weeks, syncedAt }
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;
// run_sql lives under /v2/query on the same Hasura host as /v1/graphql
const HASURA_BASE = HASURA_ENDPOINT.replace(/\/v1\/graphql\/?$/, "");
const RUN_SQL_ENDPOINT = `${HASURA_BASE}/v2/query`;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const WEEKS = 8; // last 8 rolling 7-day windows ≈ 2 months
// Heuristic sample-menu size for the first-sync `menu_created` seed. NOTE: the
// real onboarding menu size varies (extracted per-partner), so this only seeds a
// best-guess on first appearance — it never overwrites a manual edit afterwards.
const SAMPLE_MENU_SIZE = 30;

async function graphql(query: string, variables: Record<string, unknown>) {
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

/** run_sql → array of row objects keyed by the SELECT column aliases. */
async function runSql(sql: string): Promise<Record<string, string>[]> {
  const res = await fetch(RUN_SQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_SECRET,
    },
    body: JSON.stringify({
      type: "run_sql",
      args: { source: "default", sql, read_only: true },
    }),
    cache: "no-store",
  });
  const json = await res.json();
  const result: string[][] = json?.result ?? [];
  if (result.length < 2) return []; // [0] is the header row
  const header = result[0];
  return result.slice(1).map((row) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = row[i]));
    return o;
  });
}

// SQL fragment: exclude internal test users' orders (mirrors the other stats).
function userExclusionSql(): string {
  if (EXCLUDED_USER_IDS.length === 0) return "";
  const list = EXCLUDED_USER_IDS.map((id) => `'${id}'`).join(", ");
  return `AND (user_id IS NULL OR user_id NOT IN (${list}))`;
}

// Per-partner online-order stats: all-time total + WEEKS rolling 7-day buckets.
// POS/in-store (source 'pos') is excluded; only null/'customer' online orders.
function orderStatsSql(): string {
  const buckets = Array.from({ length: WEEKS }, (_, i) => {
    const lo = (i + 1) * 7;
    const hi = i * 7;
    const cond =
      i === 0
        ? `created_at >= now() - interval '7 days'`
        : `created_at >= now() - interval '${lo} days' AND created_at < now() - interval '${hi} days'`;
    return `  count(*) FILTER (WHERE ${cond}) AS w${i}`;
  }).join(",\n");
  return `
    SELECT partner_id::text AS pid,
      count(*) AS total,
${buckets}
    FROM orders
    WHERE partner_id IS NOT NULL
      AND (source IS NULL OR source = 'customer')
      AND (status IS NULL OR status NOT IN ('cancelled', 'pending_payment', 'expired'))
      ${userExclusionSql()}
    GROUP BY partner_id;
  `;
}

const MENU_COUNTS_SQL = `
  SELECT partner_id::text AS pid, count(*) AS c
  FROM menu
  WHERE deletion_status = 0 AND partner_id IS NOT NULL
  GROUP BY partner_id;
`;

// "WhatsApp connected" = the partner has a WhatsApp Business integration with the
// automation flow turned on (flow_enabled) — the same gate the inbound webhook
// uses to decide whether to run flows.
const WA_CONNECTED_SQL = `
  SELECT DISTINCT partner_id::text AS pid
  FROM whatsapp_business_integrations
  WHERE flow_enabled = true AND partner_id IS NOT NULL;
`;

const PARTNER_IDS_QUERY = `
  query AllPartnerIds($excluded: [uuid!]!) {
    partners(where: { id: { _nin: $excluded } }, limit: 100000) { id }
  }
`;

const EXISTING_QUERY = `
  query ExistingCustomers { analytics_customers { partner_id } }
`;

const UPSERT_MUTATION = `
  mutation UpsertCustomers($objects: [analytics_customers_insert_input!]!) {
    insert_analytics_customers(
      objects: $objects,
      on_conflict: {
        constraint: analytics_customers_partner_unique,
        update_columns: [total_orders, weekly, menu_item_count, whatsapp_connected, stats_synced_at, updated_at]
      }
    ) {
      affected_rows
    }
  }
`;

export async function POST() {
  try {
    // Who to skip entirely: hardcoded test partners + the block list.
    const blocked = await getBlockedPartnerIds();
    const excluded = Array.from(new Set([...EXCLUDED_PARTNER_IDS, ...blocked]));

    // Fan out the reads.
    const [statsRows, menuRows, waRows, idsRes, existRes] = await Promise.all([
      runSql(orderStatsSql()),
      runSql(MENU_COUNTS_SQL),
      runSql(WA_CONNECTED_SQL),
      graphql(PARTNER_IDS_QUERY, { excluded }),
      graphql(EXISTING_QUERY, {}),
    ]);

    if (idsRes.errors) {
      console.error("customers sync ids errors:", JSON.stringify(idsRes.errors));
      return NextResponse.json({ error: "Scan failed" }, { status: 500 });
    }

    const statsByPid = new Map<string, { total: number; weekly: number[] }>();
    for (const r of statsRows) {
      const weekly = Array.from({ length: WEEKS }, (_, i) => Number(r[`w${i}`] ?? 0) || 0);
      statsByPid.set(r.pid, { total: Number(r.total ?? 0) || 0, weekly });
    }

    const menuByPid = new Map<string, number>();
    for (const r of menuRows) menuByPid.set(r.pid, Number(r.c ?? 0) || 0);

    // partners whose WhatsApp is connected AND has the flow turned on
    const waConnected = new Set<string>(waRows.map((r) => r.pid));

    const existing = new Set<string>(
      (existRes.data?.analytics_customers ?? []).map((r: any) => r.partner_id as string)
    );

    const partnerIds: string[] = (idsRes.data?.partners ?? []).map((p: any) => p.id as string);
    const nowIso = new Date().toISOString();

    const objects = partnerIds.map((pid) => {
      const s = statsByPid.get(pid);
      const menuCount = menuByPid.get(pid) ?? 0;
      // menu_created is a first-appearance seed only (on-conflict never updates it,
      // so a hand edit survives — the menu-size heuristic is fuzzy). whatsapp_connected
      // is an objective signal, so it's refreshed on every sync (in update_columns).
      const menuCreatedSeed = menuCount > 0 && menuCount !== SAMPLE_MENU_SIZE;
      return {
        partner_id: pid,
        total_orders: s?.total ?? 0,
        weekly: s?.weekly ?? Array(WEEKS).fill(0),
        menu_item_count: menuCount,
        menu_created: menuCreatedSeed,
        whatsapp_connected: waConnected.has(pid),
        stats_synced_at: nowIso,
        updated_at: nowIso,
      };
    });

    const addedCount = partnerIds.filter((pid) => !existing.has(pid)).length;
    const withOrders = partnerIds.filter((pid) => (statsByPid.get(pid)?.total ?? 0) > 0).length;

    // Upsert in chunks to keep each request payload sane.
    const CHUNK = 500;
    for (let i = 0; i < objects.length; i += CHUNK) {
      const slice = objects.slice(i, i + CHUNK);
      const up = await graphql(UPSERT_MUTATION, { objects: slice });
      if (up.errors) {
        console.error("customers sync upsert errors:", JSON.stringify(up.errors));
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
      }
    }

    return NextResponse.json({
      partners: partnerIds.length,
      added: addedCount,
      withOrders,
      weeks: WEEKS,
      syncedAt: nowIso,
    });
  } catch (e: any) {
    console.error("customers sync failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
