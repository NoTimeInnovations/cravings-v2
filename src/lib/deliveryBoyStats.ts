import { haversineKm, type LatLng } from "./roadDistance";

/**
 * Per-rider delivery stats for the admin Delivery Boys screen.
 *
 * Everything here is derived from `orders` — there is no stats table and no
 * per-order distance column, so the numbers are computed from the order rows
 * themselves. That keeps them always-correct with no backfill, at the cost of
 * reading the raw orders for the window being shown.
 */

/** A GeoJSON Point as Hasura returns it: coordinates are [lng, lat], NOT [lat, lng]. */
export type GeoPoint = { coordinates?: [number, number] | number[] } | null | undefined;

/** One line in an order's `extra_charges` array. */
export type ExtraCharge = { name?: string | null; amount?: number | string | null };

export type StatsOrder = {
  id: string;
  /** The short order number the admin shows everywhere else (AdminV2AllOrders). */
  display_id: string | null;
  delivery_address: string | null;
  delivery_boy_id: string | null;
  total_price: number | null;
  status: string | null;
  created_at: string;
  delivered_at: string | null;
  delivery_location: GeoPoint;
  extra_charges: ExtraCharge[] | null;
};

/**
 * The delivery fee charged to the customer, identified by the exact line name.
 *
 * Name-matching looks brittle, but it IS this codebase's convention rather than
 * a guess: the fee is written as `{ name: "Delivery Charge" }` by orderStore and
 * both checkout modals, and deliveryPoolDispatch already reads it back the same
 * way. Matching only that line is deliberate — "Parcel Charge" and "Round Off"
 * ride in the same array and are not delivery revenue.
 *
 * A missing or empty array means no fee was levied, not missing data: the
 * checkout only pushes the line when the amount is greater than zero.
 */
export const DELIVERY_CHARGE_LINE = "Delivery Charge";

export function deliveryChargeOf(o: StatsOrder): number {
  for (const c of o.extra_charges ?? []) {
    if (c?.name === DELIVERY_CHARGE_LINE) return Number(c.amount) || 0;
  }
  return 0;
}

export type Period = "day" | "week" | "month" | "custom";

/** An inclusive window in LOCAL time. Every figure on these screens is computed
 *  against one of these rather than against a `Period` directly, so a custom
 *  range is not a special case bolted onto the presets — it is the same shape. */
export type DateRange = { from: Date; to: Date };

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/**
 * The window a period means. Presets end at today; "custom" uses the dates given.
 *
 * A custom range with the ends the wrong way round is SWAPPED rather than
 * returning nothing — a date picker makes that trivially easy to do, and an
 * empty table reads as "no deliveries" rather than "you picked backwards".
 * Missing custom dates fall back to today, so the table is never blank while
 * someone is still choosing.
 */
export function rangeFor(
  period: Period,
  custom?: { from?: string | null; to?: string | null } | null,
  now: Date = new Date(),
): DateRange {
  if (period === "custom") {
    const a = parseLocalDate(custom?.from) ?? now;
    const b = parseLocalDate(custom?.to) ?? now;
    const from = startOfDay(a);
    const to = endOfDay(b);
    return from <= to ? { from, to } : { from: startOfDay(b), to: endOfDay(a) };
  }
  return { from: periodStart(period, now), to: endOfDay(now) };
}

/**
 * Parse the "YYYY-MM-DD" an <input type="date"> produces as a LOCAL calendar
 * date. `new Date("2026-08-14")` would parse it as UTC midnight, which in any
 * timezone behind UTC lands on the previous day — so a partner in the Americas
 * picking the 14th would silently get the 13th. Constructing from the parts
 * avoids that everywhere, not just where the offset happens to be positive.
 */
function parseLocalDate(v: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((v ?? "").trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Which orders a figure is built from.
 *
 *   "completed" — only orders actually delivered. Use when the number judges or
 *                 pays a rider: nothing is credited before the work is done.
 *   "all"       — completed PLUS still in flight, i.e. what a rider is currently
 *                 handling. A live workload view, and it can go DOWN later if an
 *                 in-flight order is cancelled.
 *
 * Cancelled orders are excluded from both — the rider earned no value and rode
 * no distance — and are already filtered out server-side by the query.
 */
export type Scope = "completed" | "all";

export type RiderStats = {
  orders: number;
  value: number;
  /** Delivery fees collected from customers on this rider's orders. A subset of
   *  `value`, not an addition to it — `total_price` already includes the fee. */
  deliveryCharge: number;
  km: number;
  /** Orders in the window whose customer location is missing, so they add
   *  nothing to `km`. Surfaced so a low distance reads as "not recorded"
   *  rather than "did not travel". */
  ordersWithoutLocation: number;
};

export const EMPTY_STATS: RiderStats = { orders: 0, value: 0, deliveryCharge: 0, km: 0, ordersWithoutLocation: 0 };

/** Hasura GeoJSON → the {lat,lng} shape roadDistance expects. Order matters:
 *  GeoJSON is [longitude, latitude] and swapping them silently yields a
 *  plausible-looking but wrong distance. */
export function toLatLng(p: GeoPoint): LatLng | null {
  const c = p?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const [lng, lat] = c;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Start of a PRESET window, in LOCAL time — a partner asking for "today" means
 *  their day, not UTC's. "custom" has no fixed start; use rangeFor. */
export function periodStart(period: Period, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - 6); // today plus the previous 6
  if (period === "month") d.setDate(d.getDate() - 29);
  return d;
}

/**
 * When a delivery counts towards a day.
 *
 * `delivered_at` is the honest answer — it is when the rider finished — but it
 * is NULL on a large share of rows (including many marked completed), so
 * created_at is the fallback. Without it those orders would silently vanish
 * from every total.
 */
const occurredAt = (o: StatsOrder): Date => new Date(o.delivered_at ?? o.created_at);

/** Cancelled orders are excluded everywhere: the rider neither earned the value
 *  nor rode the distance. Everything else — completed and still-in-flight —
 *  counts as work taken on. */
const counts = (o: StatsOrder, scope: Scope): boolean => {
  const st = (o.status ?? "").toLowerCase();
  if (st === "cancelled") return false;
  return scope === "all" || st === "completed";
};

/**
 * Aggregate orders per rider for one window.
 *
 * `partnerLocation` is the restaurant. Distance is the STRAIGHT-LINE km from
 * there to the customer, one way — not road distance and not a round trip.
 * Road distance would mean one Mapbox call per order (roadDistanceKm), which is
 * neither free nor fast enough to aggregate a month of orders on page load, so
 * this deliberately under-reports rather than guessing a multiplier. Label it
 * as approximate wherever it is shown.
 */
export function statsByRider(
  orders: StatsOrder[] | null | undefined,
  partnerLocation: GeoPoint,
  range: DateRange,
  scope: Scope = "completed",
): Record<string, RiderStats> {
  const from = range.from.getTime();
  const to = range.to.getTime();
  const origin = toLatLng(partnerLocation);
  const out: Record<string, RiderStats> = {};

  for (const o of orders ?? []) {
    if (!o.delivery_boy_id || !counts(o, scope)) continue;
    const when = occurredAt(o).getTime();
    if (!Number.isFinite(when) || when < from || when > to) continue;

    const s = (out[o.delivery_boy_id] ??= { ...EMPTY_STATS });
    s.orders += 1;
    s.value += Number(o.total_price) || 0;
    s.deliveryCharge += deliveryChargeOf(o);

    // Accumulate the SAME rounded per-order figure the breakdown shows, so the
    // rows always sum to this total exactly.
    const dest = toLatLng(o.delivery_location);
    if (origin && dest) s.km += Math.round(haversineKm(origin, dest) * 10) / 10;
    else s.ordersWithoutLocation += 1;
  }

  for (const s of Object.values(out)) {
    s.km = Math.round(s.km * 10) / 10;
    s.deliveryCharge = Math.round(s.deliveryCharge * 100) / 100;
  }
  return out;
}

/**
 * The individual orders behind one rider's figures — the breakdown shown when a
 * number is clicked.
 *
 * Deliberately applies the SAME period/scope predicates as statsByRider rather
 * than re-deriving them: if these two ever disagree, the breakdown would fail to
 * add up to the total it claims to explain, which is worse than having no
 * breakdown at all. Newest first, which is how someone auditing a figure reads.
 */
export function ordersForRider(
  orders: StatsOrder[] | null | undefined,
  riderId: string,
  range: DateRange,
  scope: Scope = "completed",
): StatsOrder[] {
  const from = range.from.getTime();
  const to = range.to.getTime();
  return (orders ?? [])
    .filter((o) => {
      if (o.delivery_boy_id !== riderId || !counts(o, scope)) return false;
      const when = occurredAt(o).getTime();
      return Number.isFinite(when) && when >= from && when <= to;
    })
    .sort((a, b) => occurredAt(b).getTime() - occurredAt(a).getTime());
}

/** Straight-line km for one order, or null when the customer location is
 *  missing — null renders as "not recorded" rather than a misleading 0.
 *
 *  Rounded to 1dp HERE, and the per-rider total sums these same rounded values.
 *  Summing raw distances and rounding once at the end is more precise but leaves
 *  the breakdown rows not adding up to the total printed directly beneath them,
 *  which reads as a bug to anyone checking the figure. Consistency wins on a
 *  number already labelled approximate. */
export function orderKm(o: StatsOrder, partnerLocation: GeoPoint): number | null {
  const origin = toLatLng(partnerLocation);
  const dest = toLatLng(o.delivery_location);
  if (!origin || !dest) return null;
  return Math.round(haversineKm(origin, dest) * 10) / 10;
}

/** Timestamp a row is attributed to — exported so the breakdown shows the same
 *  date that decided which period the order landed in. */
export const orderOccurredAt = occurredAt;

/** Totals across every rider, for the summary row. */
export function totalStats(byRider: Record<string, RiderStats>): RiderStats {
  return Object.values(byRider).reduce<RiderStats>(
    (a, s) => ({
      orders: a.orders + s.orders,
      value: a.value + s.value,
      deliveryCharge: Math.round((a.deliveryCharge + s.deliveryCharge) * 100) / 100,
      km: Math.round((a.km + s.km) * 10) / 10,
      ordersWithoutLocation: a.ordersWithoutLocation + s.ordersWithoutLocation,
    }),
    { ...EMPTY_STATS },
  );
}
