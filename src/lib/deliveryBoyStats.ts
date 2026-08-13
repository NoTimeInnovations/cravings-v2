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

export type Period = "day" | "week" | "month";

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

/** Start of the window, in LOCAL time — a partner asking for "today" means
 *  their day, not UTC's. */
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
const counts = (o: StatsOrder): boolean => (o.status ?? "").toLowerCase() !== "cancelled";

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
  period: Period,
  now: Date = new Date(),
): Record<string, RiderStats> {
  const from = periodStart(period, now).getTime();
  const origin = toLatLng(partnerLocation);
  const out: Record<string, RiderStats> = {};

  for (const o of orders ?? []) {
    if (!o.delivery_boy_id || !counts(o)) continue;
    const when = occurredAt(o).getTime();
    if (!Number.isFinite(when) || when < from) continue;

    const s = (out[o.delivery_boy_id] ??= { ...EMPTY_STATS });
    s.orders += 1;
    s.value += Number(o.total_price) || 0;
    s.deliveryCharge += deliveryChargeOf(o);

    const dest = toLatLng(o.delivery_location);
    if (origin && dest) s.km += haversineKm(origin, dest);
    else s.ordersWithoutLocation += 1;
  }

  for (const s of Object.values(out)) {
    s.km = Math.round(s.km * 10) / 10;
    s.deliveryCharge = Math.round(s.deliveryCharge * 100) / 100;
  }
  return out;
}

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
