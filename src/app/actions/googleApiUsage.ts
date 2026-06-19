"use server";

// Superadmin analytics for Google Maps Platform request usage. Reads the
// google_api_usage meter table via Hasura's run_sql (read-only) so we can use
// GROUP BY / date_trunc / FILTER for accurate per-period, per-partner, per-order
// and per-day breakdowns that plain GraphQL aggregates can't express.

const GQL_ENDPOINT =
  process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT ||
  "https://hasura-prod-v2.cravings.live/v1/graphql";
const ADMIN_SECRET =
  process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET ||
  process.env.HASURA_GRAPHQL_ADMIN_SECRET ||
  "";
const SQL_ENDPOINT = GQL_ENDPOINT.replace(/\/v1\/graphql\/?$/, "/v2/query");
const SOURCE = "neon db";

// Runs a read-only SQL statement and returns rows as objects keyed by column.
async function runSql(sql: string): Promise<Record<string, string | null>[]> {
  const res = await fetch(SQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify({
      type: "run_sql",
      args: { source: SOURCE, sql, read_only: true },
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { result_type?: string; result?: string[][] };
  if (!json.result || json.result.length === 0) return [];
  const [cols, ...rows] = json.result;
  return rows.map((r) => {
    const obj: Record<string, string | null> = {};
    cols.forEach((c, i) => (obj[c] = r[i]));
    return obj;
  });
}

const n = (v: string | null | undefined) => Number(v ?? 0) || 0;

// run_sql returns a jsonb column as its JSON text; parse {api: count} into a
// count-desc array for the per-order / per-partner breakdown dropdowns.
const parseByApi = (
  raw: string | null | undefined,
): { api: string; count: number }[] => {
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw) as Record<string, number>;
    return Object.entries(obj)
      .map(([api, count]) => ({ api, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
};

export interface GoogleApiUsageStats {
  generatedAt: string;
  totals: { today: number; week: number; month: number; all: number };
  byApi: { api: string; today: number; week: number; month: number; all: number }[];
  byDay: { day: string; count: number }[];
  byPartnerMonth: {
    partnerId: string | null;
    storeName: string;
    count: number;
    lastAt: string;
    byApi: { api: string; count: number }[];
  }[];
  byOrder: {
    orderId: string;
    displayId: string | null;
    partnerId: string | null;
    storeName: string;
    count: number;
    lastAt: string;
    byApi: { api: string; count: number }[];
  }[];
  recent: {
    id: string;
    api: string;
    source: string | null;
    partnerId: string | null;
    storeName: string;
    orderId: string | null;
    createdAt: string;
  }[];
}

export async function getGoogleApiUsageStats(
  nowIso?: string,
): Promise<GoogleApiUsageStats> {
  // Per-API + grand total, split by period (FILTER), in one pass.
  const apiRows = await runSql(`
    SELECT COALESCE(api, '__all__') AS api,
      count(*) AS all_time,
      count(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS today,
      count(*) FILTER (WHERE created_at >= date_trunc('week', now())) AS this_week,
      count(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS this_month
    FROM public.google_api_usage
    GROUP BY ROLLUP(api)
    ORDER BY all_time DESC;
  `);

  const grand = apiRows.find((r) => r.api === "__all__");
  const byApi = apiRows
    .filter((r) => r.api !== "__all__")
    .map((r) => ({
      api: r.api || "unknown",
      today: n(r.today),
      week: n(r.this_week),
      month: n(r.this_month),
      all: n(r.all_time),
    }));

  const byDay = (
    await runSql(`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*) AS cnt
    FROM public.google_api_usage
    WHERE created_at >= now() - interval '30 days'
    GROUP BY 1 ORDER BY 1;
  `)
  ).map((r) => ({ day: r.day || "", count: n(r.cnt) }));

  const byPartnerMonth = (
    await runSql(`
    SELECT t.partner_id, t.store_name,
      sum(t.cnt) AS cnt,
      to_char(max(t.last_at), 'YYYY-MM-DD HH24:MI:SS') AS last_at,
      jsonb_object_agg(t.api, t.cnt) AS by_api
    FROM (
      SELECT u.partner_id, COALESCE(p.store_name, '— (no partner / signup)') AS store_name,
        u.api, count(*) AS cnt, max(u.created_at) AS last_at
      FROM public.google_api_usage u
      LEFT JOIN public.partners p ON p.id = u.partner_id
      WHERE u.created_at >= date_trunc('month', now())
      GROUP BY u.partner_id, store_name, u.api
    ) t
    GROUP BY t.partner_id, t.store_name
    ORDER BY max(t.last_at) DESC
    LIMIT 200;
  `)
  ).map((r) => ({
    partnerId: r.partner_id,
    storeName: r.store_name || "—",
    count: n(r.cnt),
    lastAt: r.last_at || "",
    byApi: parseByApi(r.by_api),
  }));

  // Attribute an order's requests to the ORDER's partner (not each usage row's
  // partner_id). A maps row tagged before/after the partner id was known — e.g.
  // the V3 address sheet historically logged without it — would otherwise split
  // a single order across a real-partner row and a "—" row.
  const byOrder = (
    await runSql(`
    SELECT t.order_id, t.display_id, t.partner_id, t.store_name,
      sum(t.cnt) AS cnt,
      to_char(max(t.last_at), 'YYYY-MM-DD HH24:MI:SS') AS last_at,
      jsonb_object_agg(t.api, t.cnt) AS by_api
    FROM (
      SELECT u.order_id, o.display_id, o.partner_id, COALESCE(p.store_name, '—') AS store_name,
        u.api, count(*) AS cnt, max(u.created_at) AS last_at
      FROM public.google_api_usage u
      LEFT JOIN public.orders o ON o.id = u.order_id
      LEFT JOIN public.partners p ON p.id = o.partner_id
      WHERE u.order_id IS NOT NULL
      GROUP BY u.order_id, o.display_id, o.partner_id, store_name, u.api
    ) t
    GROUP BY t.order_id, t.display_id, t.partner_id, t.store_name
    ORDER BY max(t.last_at) DESC
    LIMIT 200;
  `)
  ).map((r) => ({
    orderId: r.order_id || "",
    displayId: r.display_id,
    partnerId: r.partner_id,
    storeName: r.store_name || "—",
    count: n(r.cnt),
    lastAt: r.last_at || "",
    byApi: parseByApi(r.by_api),
  }));

  const recent = (
    await runSql(`
    SELECT u.id, u.api, u.source, u.partner_id, COALESCE(p.store_name, '—') AS store_name,
      u.order_id, to_char(u.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
    FROM public.google_api_usage u
    LEFT JOIN public.partners p ON p.id = u.partner_id
    ORDER BY u.created_at DESC
    LIMIT 50;
  `)
  ).map((r) => ({
    id: r.id || "",
    api: r.api || "",
    source: r.source,
    partnerId: r.partner_id,
    storeName: r.store_name || "—",
    orderId: r.order_id,
    createdAt: r.created_at || "",
  }));

  return {
    generatedAt: nowIso || "",
    totals: {
      today: n(grand?.today),
      week: n(grand?.this_week),
      month: n(grand?.this_month),
      all: n(grand?.all_time),
    },
    byApi,
    byDay,
    byPartnerMonth,
    byOrder,
    recent,
  };
}
