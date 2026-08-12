import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS } from "../_excluded";
import { getBlockedPartnerIds } from "../_blocklist";

/**
 * Partner signups over time — how many restaurants have *joined* (partners.
 * created_at), bucketed per IST day, for the Target tab's "Customers joined"
 * panel.
 *
 * Nothing is stored; everything is computed live from the `partners` table
 * (test/demo accounts excluded). Two things are returned:
 *
 *  - Fixed headline counts (all-time, rolling last 24h / 7d / 30d with the
 *    prior equal period) for the KPI row.
 *  - A custom range (`?from=YYYY-MM-DD&to=YYYY-MM-DD`, IST calendar days) with a
 *    per-day series, the range total vs the prior equal-length period, and the
 *    per-day / per-week / per-month rate over that range.
 *
 *   GET ?from=YYYY-MM-DD&to=YYYY-MM-DD  → { range, series, kpis, syncedAt }
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IST = "Asia/Kolkata";
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MAX_SPAN_DAYS = 731; // ~2 years — a generous cap on custom ranges

const istFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const istToday = () => istFmt.format(new Date());
const istDayOf = (d: Date) => istFmt.format(d);

/** add n days to a YYYY-MM-DD (UTC-safe) */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
/** inclusive number of days from a → b (both YYYY-MM-DD) */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS) + 1;
}
/** first / last instant of an IST calendar day, as a UTC ISO string */
const istStart = (day: string) => new Date(`${day}T00:00:00.000+05:30`).toISOString();
const istEnd = (day: string) => new Date(`${day}T23:59:59.999+05:30`).toISOString();

const countQuery = (alias: string, range: string) => `
  ${alias}: partners_aggregate(where: { _and: [ { id: { _nin: $excluded } }${range} ] }) {
    aggregate { count }
  }`;

const QUERY = `
  query Signups(
    $excluded: [uuid!]!,
    $rangeSince: timestamptz!, $rangeUntil: timestamptz!,
    $h24: timestamptz!, $h48: timestamptz!,
    $d7: timestamptz!, $d14: timestamptz!,
    $d30: timestamptz!, $d60: timestamptz!
  ) {
    range_rows: partners(
      where: { _and: [
        { id: { _nin: $excluded } },
        { created_at: { _gte: $rangeSince, _lte: $rangeUntil } }
      ] },
      order_by: { created_at: asc },
      limit: 100000
    ) { created_at }
    ${countQuery("all_time", "")}
    ${countQuery("l24", ", { created_at: { _gte: $h24 } }")}
    ${countQuery("p24", ", { created_at: { _gte: $h48, _lt: $h24 } }")}
    ${countQuery("l7", ", { created_at: { _gte: $d7 } }")}
    ${countQuery("p7", ", { created_at: { _gte: $d14, _lt: $d7 } }")}
    ${countQuery("l30", ", { created_at: { _gte: $d30 } }")}
    ${countQuery("p30", ", { created_at: { _gte: $d60, _lt: $d30 } }")}
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
  return res.json();
}

const cnt = (a: any) => Number(a?.aggregate?.count ?? 0);

export async function GET(req: NextRequest) {
  try {
    const today = istToday();
    const sp = req.nextUrl.searchParams;

    // ---- resolve the custom range (default: last 30 IST days ending today)
    let to = sp.get("to") ?? "";
    let from = sp.get("from") ?? "";
    if (!DATE_RE.test(to)) to = today;
    if (!DATE_RE.test(from)) from = addDays(to, -29);
    if (from > to) [from, to] = [to, from]; // swap if reversed
    if (to > today) to = today; // never look into the future
    if (from > to) from = to;
    if (daysBetween(from, to) > MAX_SPAN_DAYS) from = addDays(to, -(MAX_SPAN_DAYS - 1));

    const days = daysBetween(from, to);
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(from, -days);

    const blocked = await getBlockedPartnerIds();
    const excluded = Array.from(new Set([...EXCLUDED_PARTNER_IDS, ...blocked]));

    const now = Date.now();
    const iso = (ms: number) => new Date(now - ms).toISOString();
    const vars = {
      excluded,
      rangeSince: istStart(prevFrom), // fetch prev period too, for the trend
      rangeUntil: istEnd(to),
      h24: iso(24 * HOUR_MS),
      h48: iso(48 * HOUR_MS),
      d7: iso(7 * DAY_MS),
      d14: iso(14 * DAY_MS),
      d30: iso(30 * DAY_MS),
      d60: iso(60 * DAY_MS),
    };

    const res = await hasura(QUERY, vars);
    if (res.errors) {
      console.error("signups errors:", JSON.stringify(res.errors));
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
    const d = res.data ?? {};

    // ---- bucket signups by IST day; split current-range vs prior period
    const buckets: Record<string, number> = {};
    for (let k = from; k <= to; k = addDays(k, 1)) buckets[k] = 0;
    let prevTotal = 0;
    for (const row of d.range_rows ?? []) {
      const key = istDayOf(new Date(row.created_at));
      if (key >= from && key <= to) buckets[key] = (buckets[key] ?? 0) + 1;
      else if (key >= prevFrom && key <= prevTo) prevTotal += 1;
    }
    const series = Object.keys(buckets)
      .sort()
      .map((day) => ({ d: day, count: buckets[day] }));
    const total = series.reduce((s, p) => s + p.count, 0);

    return NextResponse.json({
      range: {
        from,
        to,
        days,
        prevFrom,
        prevTo,
        total,
        prevTotal,
        perDay: total / days,
        perWeek: (total * 7) / days,
        perMonth: (total * 30) / days,
      },
      series,
      kpis: {
        allTime: cnt(d.all_time),
        last24h: { curr: cnt(d.l24), prev: cnt(d.p24) },
        last7: { curr: cnt(d.l7), prev: cnt(d.p7) },
        last30: { curr: cnt(d.l30), prev: cnt(d.p30) },
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("signups GET failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
