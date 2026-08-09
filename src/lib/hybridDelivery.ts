import type { DeliveryRules } from "@/store/orderStore";

/**
 * HYBRID BOOKING — distance bands, one carrier each.
 *
 * A store rarely wants one carrier for everything: their own rider is cheapest
 * around the corner, an instant third-party rider is worth it across town, and
 * past that a parcel courier is the only thing that makes sense. So the partner
 * draws the lines themselves — "mine to 1 km, Rapido to 10 km, Shiprocket beyond"
 * — and this file is the one place that decides which band a drop falls in and
 * who carries it.
 *
 * Every side of the system resolves the SAME function from the SAME measurement:
 * the checkout (whose price to charge), the delivery bridge (book a rider?) and
 * the Shiprocket dispatcher (book a courier?). Two of them each thinking the
 * order is theirs means two vehicles and two bills; none of them thinking so
 * means the food sits on the counter.
 *
 * Deliberately conservative in every ambiguous case: the split only engages when
 * the partner switched it on AND left at least one usable boundary, and a drop
 * whose distance we could not measure falls in the FIRST band — which is where
 * the third-party rider sat before any of this was configurable. A
 * misconfiguration costs the feature, not the order.
 */

/**
 * The three ways an order can reach a customer:
 *  - "own"        the restaurant's own rider, priced with the partner's own rules
 *  - "bridge"     an instant third-party rider (Porter / Rapido / Uber via the
 *                 delivery bridge, or Adloggs via delivery_agent), priced live
 *  - "shiprocket" the partner's own Shiprocket account, priced by its quote
 */
export type HybridCarrier = "own" | "bridge" | "shiprocket";

/** One row of the ladder. `upto: null` is the last band — everything beyond. */
export interface HybridBand {
  upto: number | null;
  carrier: HybridCarrier;
}

/** A band resolved against a real distance, with both its edges. */
export interface ResolvedBand extends HybridBand {
  /** Lower edge in km (0 for the first band). */
  from: number;
}

export const HYBRID_CARRIERS: HybridCarrier[] = ["own", "bridge", "shiprocket"];

/** What a band with no carrier set means. Matches what hybrid booking did before
 *  the ladder existed: the instant rider takes it. */
const CARRIER_FALLBACK: HybridCarrier = "bridge";

function readCarrier(value: unknown, fallback: HybridCarrier = CARRIER_FALLBACK): HybridCarrier {
  return value === "own" || value === "bridge" || value === "shiprocket" ? value : fallback;
}

/**
 * A band's upper edge, or null for the open-ended one.
 *
 * The null check is NOT redundant with the isFinite check below it: `Number(null)`
 * is 0, so coercing first turns the open-ended band into a 0 km band — which is
 * then dropped as unusable, leaving the ladder with no tail and everything past
 * the last boundary silently falling back to own delivery.
 */
export function readUpto(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * The pre-ladder shape: one boundary, a carrier on each side. Still read because
 * partners configured it that way, and rewriting their rows on read would mean a
 * background write to every one of them.
 */
function legacyBands(rules: DeliveryRules): HybridBand[] {
  const limit = Number(rules.third_party_max_km);
  if (!Number.isFinite(limit) || limit <= 0) return [];
  return [
    { upto: limit, carrier: readCarrier(rules.hybrid_near_provider, "bridge") },
    { upto: null, carrier: readCarrier(rules.hybrid_far_provider, "own") },
  ];
}

/**
 * The store's ladder, cleaned up, or null when there is nothing usable to apply.
 *
 * Cleaning is not cosmetic — the resolver below walks this list and MUST be able
 * to trust it:
 *  - boundaries that are missing, zero or negative are dropped (a band that
 *    covers nothing would swallow every order at position 0)
 *  - boundaries are sorted ascending and de-duplicated, so a partner mid-edit
 *    (typing "1" on the way to "12") can never produce a ladder that routes by
 *    the order rows happen to sit in
 *  - exactly one open-ended band is appended at the end, so every distance
 *    resolves to something
 *
 * Fewer than two bands means no split at all: null, and every caller behaves as
 * it did before the feature existed.
 */
export function hybridBands(rules: DeliveryRules | null | undefined): HybridBand[] | null {
  if (!rules?.hybrid_booking) return null;

  const raw: unknown[] = Array.isArray(rules.hybrid_bands) ? rules.hybrid_bands : [];
  const source: HybridBand[] = raw.length
    ? raw.map((b: any) => ({ upto: readUpto(b?.upto), carrier: readCarrier(b?.carrier) }))
    : legacyBands(rules);
  if (!source.length) return null;

  const bounded: HybridBand[] = [];
  const seen = new Set<number>();
  for (const band of source) {
    const upto = Number(band.upto);
    if (!Number.isFinite(upto) || upto <= 0 || seen.has(upto)) continue;
    seen.add(upto);
    bounded.push({ upto, carrier: band.carrier });
  }
  bounded.sort((a, b) => (a.upto as number) - (b.upto as number));

  // The tail carrier is whatever the partner put on the open-ended row. Taking the
  // LAST such row (rather than the first) matches what the editor writes and keeps
  // a stray duplicate from silently winning.
  const openRows = source.filter((b) => b.upto == null);
  const tail: HybridBand = {
    upto: null,
    carrier: openRows.length ? openRows[openRows.length - 1].carrier : "own",
  };

  const bands = [...bounded, tail];
  return bands.length >= 2 ? bands : null;
}

/** Whether the split is configured and usable at all. */
export function isHybridBookingActive(rules: DeliveryRules | null | undefined): boolean {
  return hybridBands(rules) != null;
}

/**
 * WHICH BAND this drop falls in, with both its edges, or null when there is no
 * split to answer for.
 *
 * A distance we could not measure resolves to the FIRST band rather than to
 * nothing: roadDistanceKm falls back to straight-line and can still come back
 * empty, and every side of the system needs the same answer for that order or
 * they will disagree about who is carrying it.
 */
export function hybridBandForDistance(
  rules: DeliveryRules | null | undefined,
  distanceKm: number | null | undefined,
): ResolvedBand | null {
  const bands = hybridBands(rules);
  if (!bands) return null;

  const d = Number(distanceKm);
  const measured = Number.isFinite(d) && d > 0;

  let from = 0;
  for (const band of bands) {
    if (!measured) return { ...band, from };
    if (band.upto == null || d <= band.upto) return { ...band, from };
    from = band.upto;
  }
  // Unreachable: hybridBands always ends with an open band.
  const last = bands[bands.length - 1];
  return { ...last, from };
}

/**
 * WHO CARRIES THIS ORDER, or null when there is no split to answer for.
 *
 * The single question the checkout, the delivery bridge and the Shiprocket
 * dispatcher all ask.
 */
export function hybridCarrierFor(
  rules: DeliveryRules | null | undefined,
  distanceKm: number | null | undefined,
): HybridCarrier | null {
  return hybridBandForDistance(rules, distanceKm)?.carrier ?? null;
}

/** "0–1 km" / "1–10 km" / "beyond 10 km" — for logs, order notes and settings. */
export function describeBand(band: Pick<ResolvedBand, "from" | "upto">): string {
  const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  if (band.upto == null) return band.from > 0 ? `beyond ${n(band.from)} km` : "any distance";
  return `${n(band.from)}–${n(band.upto)} km`;
}

/** Plain-English carrier name, so the settings screen, the order card and the
 *  dispatch logs all call the same thing by the same name. */
export function carrierLabel(carrier: HybridCarrier): string {
  return carrier === "own"
    ? "your own rider"
    : carrier === "bridge"
      ? "an instant third-party rider"
      : "Shiprocket";
}
