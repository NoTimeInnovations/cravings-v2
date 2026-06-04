import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS } from "../_excluded";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const POSTHOG_API_HOST = POSTHOG_HOST.replace("us.i.", "us.").replace(
  "eu.i.",
  "eu."
);
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 60;
export const dynamic = "force-dynamic";

type Range = "1d" | "7d" | "30d" | "90d" | "365d";
const RANGE_DAYS: Record<Range, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

// Top-level path segments that look like usernames but are actually app routes.
// Anything captured under these should not be attributed to a partner.
const RESERVED_SEGMENTS = new Set([
  "",
  "admin",
  "admin-v2",
  "superadmin",
  "analytics",
  "reel-analytics",
  "api",
  "qrScan",
  "bill",
  "kot",
  "login",
  "signup",
  "auth",
  "explore",
  "about",
  "contact",
  "privacy",
  "terms",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "static",
  "public",
  "assets",
]);

function windowFor(range: Range) {
  const days = RANGE_DAYS[range] ?? 30;
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
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
    console.error("usage Hasura errors:", JSON.stringify(json.errors));
  }
  return json.data ?? {};
}

async function hogQuery(hogql: string) {
  const r = await fetch(
    `${POSTHOG_API_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
      cache: "no-store",
    }
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PostHog query failed: ${r.status} ${text.slice(0, 200)}`);
  }
  return r.json();
}

const PARTNERS_QUERY = `
  query UsagePartners($excluded: [uuid!]!) {
    partners(
      where: {
        id: { _nin: $excluded },
        username: { _is_null: false, _neq: "" }
      }
      limit: 5000
    ) {
      id
      name
      store_name
      district
      username
    }
  }
`;

const ORDERS_QUERY = `
  query UsageOrders($start: timestamptz!, $end: timestamptz!, $excluded: [uuid!]!) {
    orders(
      where: {
        created_at: { _gte: $start, _lte: $end },
        partner_id: { _nin: $excluded },
        _or: [{ status: { _is_null: true } }, { status: { _nin: ["cancelled", "pending_payment", "expired"] } }]
      }
      limit: 50000
    ) {
      partner_id
    }
  }
`;

const QR_CODES_QUERY = `
  query UsageQrCodes($excluded: [uuid!]!) {
    qr_codes(where: { partner_id: { _nin: $excluded } }) {
      id
      partner_id
    }
  }
`;

const QR_SCANS_QUERY = `
  query UsageQrScans($start: timestamptz!, $end: timestamptz!) {
    qr_scans(
      where: { created_at: { _gte: $start, _lte: $end } }
      limit: 200000
    ) {
      qr_id
    }
  }
`;

function emptyResponse(reason: string, range: Range, start: string, end: string) {
  return NextResponse.json({
    enabled: false,
    reason,
    range,
    window: { start, end },
    rows: [],
    totals: {
      restaurants: 0,
      events: 0,
      pageviews: 0,
      visits: 0,
      users: 0,
      orders: 0,
      scans: 0,
    },
    unmatched: [],
    syncedAt: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const rangeParam = (req.nextUrl.searchParams.get("range") ?? "30d") as Range;
  const range: Range = RANGE_DAYS[rangeParam] ? rangeParam : "30d";
  const w = windowFor(range);

  try {
    const phEnabled = !!(POSTHOG_PROJECT_ID && POSTHOG_PERSONAL_API_KEY);

    const phPromise = phEnabled
      ? hogQuery(
          `SELECT
             extract(coalesce(properties.$pathname, ''), '^/([^/?#]+)') AS username,
             count() AS events,
             countIf(event = '$pageview') AS pageviews,
             count(DISTINCT $session_id) AS visits,
             count(DISTINCT distinct_id) AS users
           FROM events
           WHERE timestamp >= now() - INTERVAL ${w.days} DAY
             AND properties.$pathname IS NOT NULL
             AND properties.$pathname LIKE '/_%'
           GROUP BY username
           HAVING username != '' AND events > 0
           ORDER BY events DESC
           LIMIT 1000`
        )
      : Promise.resolve(null);

    const [phRes, partnersRes, ordersRes, qrCodesRes, qrScansRes] =
      await Promise.all([
        phPromise,
        hasura(PARTNERS_QUERY, { excluded: EXCLUDED_PARTNER_IDS }),
        hasura(ORDERS_QUERY, {
          start: w.start,
          end: w.end,
          excluded: EXCLUDED_PARTNER_IDS,
        }),
        hasura(QR_CODES_QUERY, { excluded: EXCLUDED_PARTNER_IDS }),
        hasura(QR_SCANS_QUERY, { start: w.start, end: w.end }),
      ]);

    const ordersByPartner = new Map<string, number>();
    for (const o of ordersRes.orders ?? []) {
      if (!o.partner_id) continue;
      ordersByPartner.set(
        o.partner_id,
        (ordersByPartner.get(o.partner_id) ?? 0) + 1
      );
    }

    const qrToPartner = new Map<string, string>();
    for (const qc of qrCodesRes.qr_codes ?? []) {
      if (qc.id && qc.partner_id) qrToPartner.set(qc.id, qc.partner_id);
    }

    const scansByPartner = new Map<string, number>();
    for (const s of qrScansRes.qr_scans ?? []) {
      const pid = qrToPartner.get(s.qr_id);
      if (!pid) continue;
      scansByPartner.set(pid, (scansByPartner.get(pid) ?? 0) + 1);
    }

    type PartnerInfo = {
      id: string;
      username: string;
      name: string;
      district: string | null;
      orders: number;
      scans: number;
    };

    const partnersByUsername = new Map<string, PartnerInfo>();
    for (const p of partnersRes.partners ?? []) {
      const uname = (p.username ?? "").toString().trim().toLowerCase();
      if (!uname) continue;
      partnersByUsername.set(uname, {
        id: p.id,
        username: uname,
        name: p.store_name ?? p.name ?? "—",
        district: p.district ?? null,
        orders: ordersByPartner.get(p.id) ?? 0,
        scans: scansByPartner.get(p.id) ?? 0,
      });
    }

    type UsageAgg = {
      events: number;
      pageviews: number;
      visits: number;
      users: number;
    };
    const phByUsername = new Map<string, UsageAgg>();
    const unmatched: { username: string; events: number }[] = [];

    for (const row of phRes?.results ?? []) {
      const rawUsername = (row[0] ?? "").toString().trim().toLowerCase();
      if (!rawUsername || RESERVED_SEGMENTS.has(rawUsername)) continue;
      const agg: UsageAgg = {
        events: Number(row[1] ?? 0),
        pageviews: Number(row[2] ?? 0),
        visits: Number(row[3] ?? 0),
        users: Number(row[4] ?? 0),
      };
      if (partnersByUsername.has(rawUsername)) {
        phByUsername.set(rawUsername, agg);
      } else {
        unmatched.push({ username: rawUsername, events: agg.events });
      }
    }

    const rows = Array.from(partnersByUsername.values()).map((p) => {
      const ph = phByUsername.get(p.username);
      return {
        partnerId: p.id,
        username: p.username,
        name: p.name,
        district: p.district,
        events: ph?.events ?? 0,
        pageviews: ph?.pageviews ?? 0,
        visits: ph?.visits ?? 0,
        users: ph?.users ?? 0,
        orders: p.orders,
        scans: p.scans,
      };
    });

    rows.sort((a, b) => {
      if (b.events !== a.events) return b.events - a.events;
      if (b.orders !== a.orders) return b.orders - a.orders;
      return b.scans - a.scans;
    });

    const totals = rows.reduce(
      (t, r) => ({
        restaurants: t.restaurants + (r.events + r.orders + r.scans > 0 ? 1 : 0),
        events: t.events + r.events,
        pageviews: t.pageviews + r.pageviews,
        visits: t.visits + r.visits,
        users: t.users + r.users,
        orders: t.orders + r.orders,
        scans: t.scans + r.scans,
      }),
      {
        restaurants: 0,
        events: 0,
        pageviews: 0,
        visits: 0,
        users: 0,
        orders: 0,
        scans: 0,
      }
    );

    unmatched.sort((a, b) => b.events - a.events);

    return NextResponse.json({
      enabled: phEnabled,
      reason: phEnabled
        ? undefined
        : "POSTHOG_PROJECT_ID or POSTHOG_PERSONAL_API_KEY not set",
      range,
      window: { start: w.start, end: w.end },
      rows,
      totals,
      unmatched: unmatched.slice(0, 20),
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("usage stats failed", e);
    return emptyResponse(e?.message ?? "failed", range, w.start, w.end);
  }
}
