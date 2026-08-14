/**
 * Per-rider stats for the Delivery Pool panel.
 *
 * Deliberately separate from deliveryBoyStats even though the screens look
 * alike, because the underlying data is genuinely different:
 *
 *  - An in-house rider is a `delivery_boys` row referenced by
 *    `orders.delivery_boy_id`. A POOL rider is not in our database at all — it
 *    lives in the pool service, and the only trace on our side is the snapshot
 *    the dispatcher wrote into `orders.delivery_provider_meta`.
 *  - Distance there is REAL: the pool service computes it and stores
 *    `distanceKm`. No haversine, no straight-line caveat.
 *  - Pool orders carry a second money figure — `deliveryFee`, what the
 *    restaurant PAYS the pool — alongside what the customer paid.
 *
 * Sharing one module would have meant one set of types pretending both cases
 * are the same shape. They are not.
 */

import type { ExtraCharge, Period, Scope } from "./deliveryBoyStats";
import { deliveryChargeOf as boyDeliveryChargeOf, periodStart } from "./deliveryBoyStats";

export type { Period, Scope };
export { periodStart };

/** The dispatcher's snapshot of a pool delivery, as written to
 *  `orders.delivery_provider_meta`. Every field is optional: an order that never
 *  found a rider has the fee and distance but no rider at all. */
export type PoolMeta = {
  pool?: boolean;
  riderName?: string | null;
  riderPhone?: string | null;
  riderVehicle?: string | null;
  /** Real road distance from the pool service — NOT a straight-line estimate. */
  distanceKm?: number | string | null;
  /** What the restaurant pays the pool for this delivery. */
  deliveryFee?: number | string | null;
  trackingUrl?: string | null;
};

export type PoolOrder = {
  id: string;
  display_id: string | null;
  delivery_address: string | null;
  total_price: number | null;
  status: string | null;
  created_at: string;
  delivered_at: string | null;
  extra_charges: ExtraCharge[] | null;
  delivery_provider: string | null;
  delivery_provider_state: string | null;
  delivery_provider_meta: PoolMeta | null;
};

export type PoolRiderStats = {
  rider: string;
  phone: string | null;
  orders: number;
  /** What customers paid in total on these orders. */
  value: number;
  /** Delivery fees collected FROM customers. A subset of `value`. */
  deliveryCharge: number;
  /** What the restaurant paid the POOL for these deliveries. A cost, not revenue. */
  poolFee: number;
  /** Real km reported by the pool service. */
  km: number;
};

export const EMPTY_POOL_STATS: Omit<PoolRiderStats, "rider" | "phone"> = {
  orders: 0,
  value: 0,
  deliveryCharge: 0,
  poolFee: 0,
  km: 0,
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const poolMetaOf = (o: PoolOrder): PoolMeta => o.delivery_provider_meta ?? {};

/** Real distance for one pool delivery, rounded once so the breakdown rows sum
 *  exactly to the total shown above them. */
export const poolKmOf = (o: PoolOrder): number =>
  Math.round(num(poolMetaOf(o).distanceKm) * 10) / 10;

/**
 * What the restaurant pays the pool for this delivery.
 *
 * NOT independent of the customer's delivery charge. deliveryPoolDispatch sends
 * the order's "Delivery Charge" line to the pool as `delivery_fee`, and the pool
 * echoes it back here — so whenever the customer was charged, these two figures
 * are the SAME number by construction and the delivery margin is zero. They
 * diverge only when delivery was free for the customer: the dispatcher sends
 * nothing, the pool computes its own distance-based fee, and the restaurant
 * absorbs it. Measured across all 241 live pool orders, with NO exceptions in
 * either direction: of the 128 where the customer was charged, the pool fee
 * equalled the charge 128/128; of the 113 with free delivery, the pool billed a
 * fee anyway 113/113. So this figure is genuinely new information only on the
 * free-delivery half — elsewhere it restates the charge.
 */
export const poolFeeOf = (o: PoolOrder): number =>
  Math.round(num(poolMetaOf(o).deliveryFee) * 100) / 100;

/** What the customer paid for delivery — the same `extra_charges` line the
 *  in-house screen reads, so the two screens cannot disagree about it. */
export const customerDeliveryChargeOf = (o: PoolOrder): number =>
  boyDeliveryChargeOf(o as unknown as Parameters<typeof boyDeliveryChargeOf>[0]);

/**
 * Which rider a pool order belongs to.
 *
 * Keyed on PHONE, not name: names repeat and get re-typed, the phone is the
 * pool's stable handle. Returns null when no rider was ever assigned — 134 of
 * 241 live pool orders are in that state, and lumping them under a blank rider
 * would invent a worker who does not exist.
 */
export function riderKeyOf(o: PoolOrder): string | null {
  const m = poolMetaOf(o);
  const phone = (m.riderPhone ?? "").trim();
  if (phone) return phone;
  const name = (m.riderName ?? "").trim();
  return name || null;
}

const occurredAt = (o: PoolOrder): Date => new Date(o.delivered_at ?? o.created_at);
export const poolOccurredAt = occurredAt;

/**
 * Whether an order counts for a rider.
 *
 * Uses the POOL's own state rather than our order status, because the pool is
 * the authority on whether its rider completed the job — a restaurant can mark
 * an order completed while the pool leg is still running. Cancelled pool legs
 * count in neither scope.
 */
function counts(o: PoolOrder, scope: Scope): boolean {
  const st = (o.delivery_provider_state ?? "").toLowerCase();
  if (st === "cancelled") return false;
  return scope === "all" || st === "delivered";
}

/** Aggregate pool orders per rider for one window. */
export function poolStatsByRider(
  orders: PoolOrder[] | null | undefined,
  period: Period,
  scope: Scope = "completed",
  now: Date = new Date(),
): PoolRiderStats[] {
  const from = periodStart(period, now).getTime();
  const out = new Map<string, PoolRiderStats>();

  for (const o of orders ?? []) {
    const key = riderKeyOf(o);
    if (!key || !counts(o, scope)) continue;
    const when = occurredAt(o).getTime();
    if (!Number.isFinite(when) || when < from) continue;

    const m = poolMetaOf(o);
    const s =
      out.get(key) ??
      ({ rider: (m.riderName ?? "").trim() || key, phone: m.riderPhone ?? null, ...EMPTY_POOL_STATS } as PoolRiderStats);
    s.orders += 1;
    s.value += num(o.total_price);
    s.deliveryCharge += customerDeliveryChargeOf(o);
    s.poolFee += poolFeeOf(o);
    s.km += poolKmOf(o);
    out.set(key, s);
  }

  for (const s of out.values()) {
    s.value = Math.round(s.value * 100) / 100;
    s.deliveryCharge = Math.round(s.deliveryCharge * 100) / 100;
    s.poolFee = Math.round(s.poolFee * 100) / 100;
    s.km = Math.round(s.km * 10) / 10;
  }
  return [...out.values()].sort((a, b) => b.orders - a.orders);
}

/**
 * The orders behind one pool rider's figures.
 *
 * Applies the SAME predicates as poolStatsByRider — if these drift apart the
 * breakdown stops adding up to the number it is explaining.
 */
export function poolOrdersForRider(
  orders: PoolOrder[] | null | undefined,
  riderKey: string,
  period: Period,
  scope: Scope = "completed",
  now: Date = new Date(),
): PoolOrder[] {
  const from = periodStart(period, now).getTime();
  return (orders ?? [])
    .filter((o) => {
      if (riderKeyOf(o) !== riderKey || !counts(o, scope)) return false;
      const when = occurredAt(o).getTime();
      return Number.isFinite(when) && when >= from;
    })
    .sort((a, b) => occurredAt(b).getTime() - occurredAt(a).getTime());
}

/** Totals across every rider, for the summary line. */
export function poolTotals(rows: PoolRiderStats[]): Omit<PoolRiderStats, "rider" | "phone"> {
  return rows.reduce(
    (a, s) => ({
      orders: a.orders + s.orders,
      value: Math.round((a.value + s.value) * 100) / 100,
      deliveryCharge: Math.round((a.deliveryCharge + s.deliveryCharge) * 100) / 100,
      poolFee: Math.round((a.poolFee + s.poolFee) * 100) / 100,
      km: Math.round((a.km + s.km) * 10) / 10,
    }),
    { ...EMPTY_POOL_STATS },
  );
}

/**
 * Pool orders in the window that never found a rider, so they belong to nobody.
 * Counted separately and shown, because silently dropping them would make the
 * per-rider totals look like the whole picture when they are not.
 */
export function unassignedCount(
  orders: PoolOrder[] | null | undefined,
  period: Period,
  now: Date = new Date(),
): number {
  const from = periodStart(period, now).getTime();
  return (orders ?? []).filter((o) => {
    if (riderKeyOf(o)) return false;
    if ((o.delivery_provider_state ?? "").toLowerCase() === "cancelled") return false;
    const when = occurredAt(o).getTime();
    return Number.isFinite(when) && when >= from;
  }).length;
}
