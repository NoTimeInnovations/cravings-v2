import { fetchFromHasura } from "@/lib/hasuraClient";

/**
 * What an order records ABOUT itself — when it entered each status, and how far
 * the delivery was.
 *
 * Both live in columns that only admin-v3 selects (`orders.status_timestamps`,
 * `orders.delivery_distance_km`), so nothing here changes a single pixel of
 * admin-v2. Neither is a shared read path: v3's order detail fetches them on
 * its own rather than widening the order subscription every screen uses.
 */

/* ------------------------------------------------------ status timestamps -- */

/**
 * `orders.status_timestamps` — `{ [status]: ISO-8601 }`.
 *
 * Written by the `orders_stamp_status` BEFORE INSERT OR UPDATE trigger, not by
 * app code. That is the point: a trigger cannot be forgotten by a code path, so
 * the dashboard, POS, the captain app, the cron auto-progress job, the
 * delivery-pool webhook, the public API and a hand edit in the Hasura console
 * are all covered by construction. Re-entering a status overwrites the older
 * time, which is what "when did it become X" means.
 */
export type StatusTimestamps = Record<string, string>;

const safeParse = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

export function parseStatusTimestamps(raw: unknown): StatusTimestamps {
  // jsonb normally arrives already parsed, but a stringified JSON column is a
  // real shape in this codebase (theme, storefront_settings), so accept both.
  const obj = typeof raw === "string" ? safeParse(raw) : raw;
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out: StatusTimestamps = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === "string" && Number.isFinite(Date.parse(v))) out[k] = v;
  }
  return out;
}

/** The first of `statuses` that has a stamp. Orders can skip steps — a takeaway
 *  never goes through `dispatched` — so callers pass the aliases that mean the
 *  same point on the timeline. */
export function stampFor(
  stamps: StatusTimestamps,
  ...statuses: string[]
): string | null {
  for (const s of statuses) if (stamps[s]) return stamps[s];
  return null;
}

/* --------------------------------------------------------------- elapsed -- */

/** Milliseconds between two timestamps, or null if either is missing or unparseable. */
export function elapsedMs(
  from: string | null | undefined,
  to: string | null | undefined,
): number | null {
  if (!from || !to) return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const ms = b - a;
  // A negative span means the two came from different clocks (the trigger uses
  // the DB's, created_at can come from the client). Report nothing rather than
  // "-3m", which would read as a bug in the order rather than in the clocks.
  return ms >= 0 ? ms : null;
}

/** Coarse, human duration: "45s", "12m", "1h 20m", "2d 3h". Deliberately two
 *  units at most — "1h 20m 13s" is noise on a delivery time. */
export function formatElapsed(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;

  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;

  const totalHr = Math.floor(totalMin / 60);
  if (totalHr < 24) {
    const m = totalMin % 60;
    return m ? `${totalHr}h ${m}m` : `${totalHr}h`;
  }

  const d = Math.floor(totalHr / 24);
  const h = totalHr % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}

/* -------------------------------------------------------------- distance -- */

/** One decimal is the precision the number is actually measured to — checkout
 *  rounds the routed distance to 0.1 km before pricing against the rate tiers. */
export function formatKm(km: number): string {
  return `${Math.round(km * 10) / 10} km`;
}

const SAVE_DISTANCE = `
  mutation SaveOrderDeliveryDistance($id: uuid!, $km: numeric!) {
    update_orders_by_pk(pk_columns: { id: $id }, _set: { delivery_distance_km: $km }) {
      id
    }
  }
`;

/**
 * Persist the delivery distance at PLACEMENT.
 *
 * Checkout has already routed this distance to price the delivery charge, so
 * this stores a number we hold rather than paying for a second Mapbox call —
 * and it means the order detail screen reads a column instead of re-routing
 * every time someone opens an old order.
 *
 * Fire-and-forget on purpose, like the rest of the post-insert work in
 * placeOrder: a failure here must never fail an order the customer just paid
 * for. A missing value degrades to "not recorded", nothing worse.
 */
export function saveDeliveryDistance(orderId: string, km: number): void {
  if (!orderId || !Number.isFinite(km) || km <= 0) return;
  void fetchFromHasura(SAVE_DISTANCE, {
    id: orderId,
    km: Math.round(km * 10) / 10,
  }).catch((e) => console.warn("[order metrics] distance not saved:", e));
}
