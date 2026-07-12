import { NextRequest, NextResponse } from "next/server";

/**
 * Daily progress log — the team's day-by-day sales activity, stored in the
 * `analytics_daily_log` table and shared with everyone.
 *
 * Each entry records, for a day: calls done, new free trials, new paid
 * customers (+ optional note). Multiple entries per day are allowed and are
 * summed. The GET response also returns a `summary` aggregating each metric
 * over the last 24h / 7d / 30d vs the prior equal period.
 *
 *   GET    → { entries, summary }
 *   POST   → add an entry   { logDate?, calls, freeTrials, paidCustomers, note? }
 *   PATCH  → edit an entry  { id, logDate?, calls?, freeTrials?, paidCustomers?, note? }
 *   DELETE → remove         ?id=<row id>
 */

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

/** Today's date in IST as YYYY-MM-DD. */
function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

const metricAgg = `aggregate { sum { calls free_trials paid_customers } }`;
const SUMMARY_QUERY = `
  query DailyLogSummary(
    $today: date!, $yday: date!,
    $d7start: date!, $d7prevEnd: date!, $d14start: date!,
    $d30start: date!, $d30prevEnd: date!, $d60start: date!
  ) {
    d1: analytics_daily_log_aggregate(where: { log_date: { _eq: $today } }) { ${metricAgg} }
    p1: analytics_daily_log_aggregate(where: { log_date: { _eq: $yday } }) { ${metricAgg} }
    d7: analytics_daily_log_aggregate(where: { log_date: { _gte: $d7start, _lte: $today } }) { ${metricAgg} }
    p7: analytics_daily_log_aggregate(where: { log_date: { _gte: $d14start, _lte: $d7prevEnd } }) { ${metricAgg} }
    d30: analytics_daily_log_aggregate(where: { log_date: { _gte: $d30start, _lte: $today } }) { ${metricAgg} }
    p30: analytics_daily_log_aggregate(where: { log_date: { _gte: $d60start, _lte: $d30prevEnd } }) { ${metricAgg} }
  }
`;

const LIST_QUERY = `
  query DailyLogRows {
    analytics_daily_log(order_by: { log_date: desc, created_at: desc }) {
      id
      log_date
      calls
      free_trials
      paid_customers
      note
      created_at
    }
  }
`;

const sum = (agg: any, col: string) => Number(agg?.aggregate?.sum?.[col] ?? 0);

function pair(a: any, b: any, col: string) {
  return { curr: sum(a, col), prev: sum(b, col) };
}

// -------------------------------------------------------------------- GET
export async function GET() {
  try {
    const today = istToday();
    const vars = {
      today,
      yday: addDays(today, -1),
      d7start: addDays(today, -6),
      d7prevEnd: addDays(today, -7),
      d14start: addDays(today, -13),
      d30start: addDays(today, -29),
      d30prevEnd: addDays(today, -30),
      d60start: addDays(today, -59),
    };

    const [listRes, sumRes] = await Promise.all([
      hasura(LIST_QUERY, {}),
      hasura(SUMMARY_QUERY, vars),
    ]);

    if (listRes.errors) console.error("daily-log list errors:", JSON.stringify(listRes.errors));
    if (sumRes.errors) console.error("daily-log summary errors:", JSON.stringify(sumRes.errors));

    const entries = (listRes.data?.analytics_daily_log ?? []).map((r: any) => ({
      id: r.id,
      logDate: r.log_date,
      calls: Number(r.calls ?? 0),
      freeTrials: Number(r.free_trials ?? 0),
      paidCustomers: Number(r.paid_customers ?? 0),
      note: r.note ?? null,
      createdAt: r.created_at,
    }));

    const d = sumRes.data ?? {};
    const metric = (col: string) => ({
      d1: pair(d.d1, d.p1, col),
      d7: pair(d.d7, d.p7, col),
      d30: pair(d.d30, d.p30, col),
    });
    const summary = {
      calls: metric("calls"),
      freeTrials: metric("free_trials"),
      paidCustomers: metric("paid_customers"),
    };

    return NextResponse.json({ entries, summary, syncedAt: new Date().toISOString() });
  } catch (e: any) {
    console.error("daily-log GET failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// clamp a numeric field to a non-negative integer
function nonNegInt(v: unknown): number | null {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// -------------------------------------------------------------------- POST (add)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const logDate = body.logDate ? String(body.logDate).trim() : istToday();
    if (!DATE_RE.test(logDate))
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const calls = nonNegInt(body.calls ?? 0);
    const freeTrials = nonNegInt(body.freeTrials ?? 0);
    const paidCustomers = nonNegInt(body.paidCustomers ?? 0);
    if (calls === null || freeTrials === null || paidCustomers === null)
      return NextResponse.json({ error: "Counts must be 0 or more" }, { status: 400 });
    if (calls + freeTrials + paidCustomers === 0 && !body.note)
      return NextResponse.json({ error: "Enter at least one number or a note" }, { status: 400 });

    const note = body.note ? String(body.note).trim().slice(0, 200) : null;

    const res = await hasura(
      `mutation Add($obj: analytics_daily_log_insert_input!) {
         insert_analytics_daily_log_one(object: $obj) { id }
       }`,
      {
        obj: {
          log_date: logDate,
          calls,
          free_trials: freeTrials,
          paid_customers: paidCustomers,
          note,
        },
      }
    );
    if (res.errors) {
      console.error("daily-log add errors:", JSON.stringify(res.errors));
      return NextResponse.json({ error: "Add failed" }, { status: 500 });
    }
    return NextResponse.json({ id: res.data?.insert_analytics_daily_log_one?.id });
  } catch (e: any) {
    console.error("daily-log POST failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// -------------------------------------------------------------------- PATCH (edit)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    if (!UUID_RE.test(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const set: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.logDate != null) {
      const logDate = String(body.logDate).trim();
      if (!DATE_RE.test(logDate))
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      set.log_date = logDate;
    }
    for (const [key, col] of [
      ["calls", "calls"],
      ["freeTrials", "free_trials"],
      ["paidCustomers", "paid_customers"],
    ] as const) {
      if (body[key] != null) {
        const n = nonNegInt(body[key]);
        if (n === null)
          return NextResponse.json({ error: "Counts must be 0 or more" }, { status: 400 });
        set[col] = n;
      }
    }
    if (body.note !== undefined) {
      set.note = body.note ? String(body.note).trim().slice(0, 200) : null;
    }

    const res = await hasura(
      `mutation Edit($id: uuid!, $set: analytics_daily_log_set_input!) {
         update_analytics_daily_log_by_pk(pk_columns: { id: $id }, _set: $set) { id }
       }`,
      { id, set }
    );
    if (res.errors) {
      console.error("daily-log edit errors:", JSON.stringify(res.errors));
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    return NextResponse.json({ id });
  } catch (e: any) {
    console.error("daily-log PATCH failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

// -------------------------------------------------------------------- DELETE
export async function DELETE(req: NextRequest) {
  try {
    const id = (req.nextUrl.searchParams.get("id") ?? "").trim();
    if (!UUID_RE.test(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const res = await hasura(
      `mutation Del($id: uuid!) {
         delete_analytics_daily_log_by_pk(id: $id) { id }
       }`,
      { id }
    );
    if (res.errors) {
      console.error("daily-log delete errors:", JSON.stringify(res.errors));
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
    return NextResponse.json({ id });
  } catch (e: any) {
    console.error("daily-log DELETE failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
