"use server";

/**
 * Per-day revenue summary for a partner's Settlements page.
 *
 * One row per calendar day (in the partner's own timezone) with the order
 * count, how much was collected online up-front ("prepaid"), how much is
 * cash / pay-at-counter ("COD"), and the day's total revenue (prepaid + COD).
 *
 * "Prepaid" = an order whose money is already in through an online gateway
 * (is_paid AND payment_method is not cash). Everything else — unpaid orders and
 * cash orders — is COD. revenue = prepaid + cod always holds, so cod is derived
 * as revenue − prepaid rather than summed independently.
 */

import { fetchFromHasura } from "@/lib/hasuraClient";

/** One calendar day of orders. */
export type DailyRevenueRow = {
  /** YYYY-MM-DD in the partner's timezone. */
  date: string;
  orders: number;
  prepaid: number;
  cod: number;
  revenue: number;
};

export type DailyRevenueResult =
  | { success: true; rows: DailyRevenueRow[]; truncated: boolean }
  | { success: false; error: string };

const getPartnerTimezone = `
  query GetPartnerTimezone($id: uuid!) {
    partners_by_pk(id: $id) {
      timezone
    }
  }
`;

// All real orders in the window. Draft (unpaid online, "pending_payment") and
// "expired" orders are excluded to match the partner-facing order list — they
// aren't real sales and would inflate the count. We over-fetch by a day on each
// side (see below) and re-bucket precisely by the partner's local calendar day
// in code, so we don't have to reason about the partner's UTC offset here.
const getPartnerOrders = `
  query PartnerDailyOrders($pid: uuid!, $start: timestamptz!, $end: timestamptz!, $limit: Int!) {
    orders(
      where: {
        partner_id: { _eq: $pid }
        status: { _nin: ["pending_payment", "expired"] }
        created_at: { _gte: $start, _lte: $end }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      created_at
      total_price
      is_paid
      payment_method
    }
  }
`;

const MAX_ORDERS = 20000;

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

/** Add whole days to a YYYY-MM-DD string, returning YYYY-MM-DD (UTC-safe). */
function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const p = (n: number) => (n < 10 ? "0" + n : "" + n);
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

/** Local calendar date (YYYY-MM-DD) of an instant in the given IANA timezone. */
function localDateInTz(iso: string, timeZone: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  const y = get("year");
  const m = get("month");
  const day = get("day");
  return y && m && day ? `${y}-${m}-${day}` : null;
}

/** An order counts as prepaid when its money is already in via an online gateway. */
function isPrepaid(o: { is_paid?: boolean | null; payment_method?: string | null }): boolean {
  return o.is_paid === true && (o.payment_method ?? "").toLowerCase() !== "cash";
}

/**
 * Daily revenue rows for [startDate, endDate] (YYYY-MM-DD, in the partner's
 * timezone), newest day first. Days with no orders are omitted.
 */
export async function getPartnerDailyRevenue(
  partnerId: string,
  range: { startDate: string; endDate: string },
): Promise<DailyRevenueResult> {
  let timeZone = "Asia/Kolkata";
  try {
    const tzData = await fetchFromHasura(getPartnerTimezone, { id: partnerId });
    const tz = tzData?.partners_by_pk?.timezone;
    if (typeof tz === "string" && tz.trim()) timeZone = tz.trim();
  } catch {
    // Fall back to IST — bucketing still works, just anchored to the default tz.
  }

  // Pad the fetch window by a day each side (in UTC) so orders near local
  // midnight — which can sit in the previous/next UTC day for any offset up to
  // ±14h — are still pulled, then filtered back to the requested local range.
  const start = `${addDaysToDate(range.startDate, -1)}T00:00:00Z`;
  const end = `${addDaysToDate(range.endDate, 1)}T23:59:59Z`;

  let orders: any[] = [];
  try {
    const data = await fetchFromHasura(getPartnerOrders, {
      pid: partnerId,
      start,
      end,
      limit: MAX_ORDERS,
    });
    orders = data?.orders || [];
  } catch (e: any) {
    console.error("[daily-revenue] orders query failed:", e?.message || e);
    return { success: false, error: "Failed to load orders" };
  }

  const truncated = orders.length >= MAX_ORDERS;

  const byDate = new Map<string, { orders: number; prepaid: number; revenue: number }>();
  for (const o of orders) {
    const date = localDateInTz(o.created_at, timeZone);
    // Keep only orders whose local calendar day falls in the requested range.
    if (!date || date < range.startDate || date > range.endDate) continue;
    const amount = num(o.total_price);
    const bucket = byDate.get(date) || { orders: 0, prepaid: 0, revenue: 0 };
    bucket.orders += 1;
    bucket.revenue += amount;
    if (isPrepaid(o)) bucket.prepaid += amount;
    byDate.set(date, bucket);
  }

  const rows: DailyRevenueRow[] = Array.from(byDate.entries())
    .map(([date, b]) => ({
      date,
      orders: b.orders,
      prepaid: b.prepaid,
      cod: b.revenue - b.prepaid,
      revenue: b.revenue,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return { success: true, rows, truncated };
}
