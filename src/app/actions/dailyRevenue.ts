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

/** A single order, for the per-transaction breakdown of a single day. */
export type RevenueTransaction = {
  /** Order UUID. */
  id: string;
  /** Per-partner sequential number (0/absent → fall back to short id). */
  displayId: number | null;
  /** Order timestamp (ISO). */
  createdAt: string;
  amount: number;
  /** Paid online up-front vs cash / pay-at-counter. */
  prepaid: boolean;
};

export type DailyRevenueResult =
  | {
      success: true;
      rows: DailyRevenueRow[];
      truncated: boolean;
      /** Per-order breakdown, populated only when the range is a single day. */
      transactions?: RevenueTransaction[];
    }
  | { success: false; error: string };

const getPartnerTimezone = `
  query GetPartnerTimezone($id: uuid!) {
    partners_by_pk(id: $id) {
      timezone
    }
  }
`;

// Real, money-bearing orders in the window. Excluded:
//   - "pending_payment" / "expired": unpaid online drafts (never real sales).
//   - "cancelled": the order was voided, so its total_price is NOT revenue —
//     counting it double-inflated the day's total (a cancelled ₹4,434 order still
//     keeps its price on the row; cancelling only flips `status`, it isn't deleted).
// We over-fetch by a day on each side (see below) and re-bucket precisely by the
// partner's local calendar day in code, so we don't reason about UTC offset here.
const getPartnerOrders = `
  query PartnerDailyOrders($pid: uuid!, $start: timestamptz!, $end: timestamptz!, $limit: Int!) {
    orders(
      where: {
        partner_id: { _eq: $pid }
        status: { _nin: ["pending_payment", "expired", "cancelled"] }
        created_at: { _gte: $start, _lte: $end }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      display_id
      created_at
      total_price
      is_paid
      payment_method
      status
    }
  }
`;

// Statuses whose orders never count as revenue, normalised for a defensive
// code-side check in case a row carries an odd casing/spelling the GraphQL
// _nin (exact match) let through (e.g. "Cancelled", "canceled", stray spaces).
const NON_REVENUE_STATUSES = new Set(["pending_payment", "expired", "cancelled", "canceled"]);

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

  // Only build the per-order breakdown for a single-day range — otherwise it
  // could be thousands of rows the UI never asks for.
  const singleDay = range.startDate === range.endDate;
  const transactions: RevenueTransaction[] = [];

  const byDate = new Map<string, { orders: number; prepaid: number; revenue: number }>();
  for (const o of orders) {
    // Defensive: skip any cancelled/draft/expired row that slipped past the
    // exact-match GraphQL filter (odd casing/whitespace on the status value).
    if (NON_REVENUE_STATUSES.has((o.status ?? "").trim().toLowerCase())) continue;
    const date = localDateInTz(o.created_at, timeZone);
    // Keep only orders whose local calendar day falls in the requested range.
    if (!date || date < range.startDate || date > range.endDate) continue;
    const amount = num(o.total_price);
    const prepaid = isPrepaid(o);
    const bucket = byDate.get(date) || { orders: 0, prepaid: 0, revenue: 0 };
    bucket.orders += 1;
    bucket.revenue += amount;
    if (prepaid) bucket.prepaid += amount;
    byDate.set(date, bucket);

    if (singleDay) {
      const displayId = num(o.display_id);
      transactions.push({
        id: o.id,
        displayId: displayId > 0 ? displayId : null,
        createdAt: o.created_at,
        amount,
        prepaid,
      });
    }
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

  // Orders come back newest-first from Hasura; keep that order in the breakdown.
  return { success: true, rows, truncated, transactions: singleDay ? transactions : undefined };
}
