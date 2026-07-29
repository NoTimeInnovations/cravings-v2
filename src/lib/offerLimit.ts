/**
 * Per-order quantity cap on an offer.
 *
 * The problem it solves: an offer price applies to EVERY unit, so a half-alfaham
 * listed at ₹360 with an offer price of ₹250 sells two for ₹500 rather than
 * ₹720 — the discount multiplies, which is almost never what the restaurant
 * meant by "offer price". A cap lets them say "this price is for one" (or two,
 * or five) without giving away the difference on every extra unit.
 *
 * NULL / absent / 0 means unlimited, which is what every existing offer has and
 * what they keep. Only a positive number restricts anything, so this can never
 * silently start blocking orders that used to go through.
 */

/** Shape the cart sees — a menu item with its offers attached. */
export interface OfferLike {
  offer_price?: number | null;
  max_per_order?: number | null;
}

export interface ItemWithOffers {
  offers?: OfferLike[] | null;
}

/**
 * How many units of this item one order may contain, or null for no limit.
 *
 * Reads the FIRST offer, matching how the rest of the app prices an item
 * (`offers?.[0]?.offer_price`). If that ever becomes "the best of several
 * offers", this has to follow it — a cap read off a different offer than the
 * price would be worse than no cap at all.
 */
export function offerMaxPerOrder(item: ItemWithOffers | null | undefined): number | null {
  const raw = item?.offers?.[0]?.max_per_order;
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

/** True when adding one more unit would exceed the cap. */
export function wouldExceedOfferLimit(
  item: ItemWithOffers | null | undefined,
  currentQuantity: number,
): boolean {
  const max = offerMaxPerOrder(item);
  return max != null && currentQuantity >= max;
}

/** Message shown when the cap stops an add. Names the number so it is actionable. */
export function offerLimitMessage(max: number): string {
  return max === 1
    ? "This offer is limited to 1 per order."
    : `This offer is limited to ${max} per order.`;
}

/**
 * Suffix marking the FULL-PRICE twin of an offer line.
 *
 * `|`-delimited on purpose: every consumer recovers the menu id with
 * `id.split("|")[0]` (orderStore, posStore, discountUtils, PlaceOrderModalV2),
 * and `base|__nooffer` and `base|Large|__nooffer` both still split to `base`.
 * Option ids in the add-on encoding are uuids, so this can never collide.
 */
export const NO_OFFER_SUFFIX = "__nooffer";

/** The full-price twin's id for a given offer line. */
export function twinIdFor(offerLineId: string): string {
  return `${offerLineId}|${NO_OFFER_SUFFIX}`;
}

/** True when this line is a full-price twin rather than an offer line. */
export function isTwinLine(id: string): boolean {
  return String(id).endsWith(`|${NO_OFFER_SUFFIX}`);
}

/** The offer line an id belongs to, stripping a twin suffix if present. */
export function offerLineIdOf(id: string): string {
  const s = String(id);
  return isTwinLine(s) ? s.slice(0, -(NO_OFFER_SUFFIX.length + 1)) : s;
}

export interface FullPriceSource {
  price?: number | null;
  /** Stamped by hotelDataFetcher at the point the offer price overwrote `price`. */
  original_price?: number | null;
}

/**
 * What one unit costs WITHOUT the offer.
 *
 * Returns null when the original is unknown or not actually higher than what is
 * being charged — in that case there is nothing to fall back to, and the caller
 * must keep the old refuse-to-add behaviour rather than invent a price. Charging
 * a number we cannot justify is worse than refusing the unit.
 */
export function fullPriceOf(item: FullPriceSource | null | undefined): number | null {
  const full = Number(item?.original_price);
  const charged = Number(item?.price);
  if (!Number.isFinite(full) || full <= 0) return null;
  if (Number.isFinite(charged) && full <= charged) return null;
  return full;
}
