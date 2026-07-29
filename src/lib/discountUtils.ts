// Single source of truth for the monetary value of an order discount.
//
// Background: max_discount_amount was only enforced at order placement
// (PlaceOrderModal/V2 cap the savings before storing them on the order).
// Every other surface (bill, order details, my-orders, POS, order editor)
// recomputed `(subtotal * value) / 100` from the raw percentage, ignoring
// the cap — so a 20% / cap-₹100 discount displayed (and on edit, persisted)
// as ₹102+ on large orders.

export type OrderDiscountLike = {
  type?: string | null;
  value?: number | null;
  savings?: number | null;
  max_discount_amount?: number | null;
};

/**
 * Recompute a discount's monetary value from its raw definition, honouring
 * the max_discount_amount cap. Use when the order's items may have changed
 * since placement (e.g. the order editor), where the stored savings could
 * be stale. Flat and freebie discounts carry their amount in `value`.
 */
export function computeDiscountAmount(
  discount: OrderDiscountLike | null | undefined,
  subtotal: number
): number {
  if (!discount) return 0;
  if (discount.type === "percentage") {
    let amount = (subtotal * (Number(discount.value) || 0)) / 100;
    const cap = Number(discount.max_discount_amount);
    if (Number.isFinite(cap) && cap > 0) amount = Math.min(amount, cap);
    return amount;
  }
  return Number(discount.value) || 0;
}

/**
 * The discount amount as it was actually applied to the order: prefers the
 * `savings` persisted at placement (already capped), falling back to a
 * capped recompute for older orders that lack it. Use for display of an
 * existing order.
 */
export function getDiscountAmount(
  discount: OrderDiscountLike | null | undefined,
  subtotal: number
): number {
  if (!discount) return 0;
  const saved = Number(discount.savings);
  if (Number.isFinite(saved) && saved > 0) return saved;
  return computeDiscountAmount(discount, subtotal);
}

/**
 * Whether this partner may put MORE THAN ONE discount on a single bill.
 *
 * Defaults to false — one discount per order. The POS keeps discounts in an
 * array and used to append without any limit, so staff could stack the same
 * offer repeatedly and walk a bill down; the storefront has always allowed a
 * single discount. Partners opt into stacking explicitly.
 */
export function isDiscountStackingEnabled(deliveryRules: any): boolean {
  return !!deliveryRules?.discount_stacking;
}

/**
 * Clamp a discount list to what the partner's setting allows. Applied wherever
 * totals are computed or persisted, so a stale client (or an order edited
 * before the setting was turned off) can't bypass the UI-level rule.
 */
export function limitDiscounts<T>(discounts: T[], deliveryRules: any): T[] {
  if (!Array.isArray(discounts) || discounts.length <= 1) return discounts || [];
  return isDiscountStackingEnabled(deliveryRules) ? discounts : discounts.slice(0, 1);
}

// ---------------------------------------------------------------------------
// Offers vs discounts: an item already marked down by an OFFER must not also be
// discounted. On the storefront the cart line's `price` IS the offer price
// (hotelDataFetcher rewrites menus[].price), so such a line is EXCLUDED from the
// discount base rather than discounted and subtracted again.
//
// Detection joins the partner-level offers array, NOT `line.offers`: the cart
// line's copy carries only {offer_price, max_per_order} — no start_time, no
// variant — and several add-to-cart paths blank it out, so it yields both false
// positives (upcoming/expired offers) and false negatives.
//
// NOTE: the POS deliberately never prices a line at an offer price (it always
// bills the raw menu price), so POS totals must NOT use this — excluding there
// would under-discount a bill the customer paid in full.
// ---------------------------------------------------------------------------

export type OfferLike = {
  menu?: { id?: string | null } | null;
  variant?: { name?: string | null } | null;
  start_time?: string | null;
  end_time?: string | null;
};

export type DiscountCartLine = {
  id?: string | null;
  price?: number | null;
  quantity?: number | null;
  variantSelections?: { name?: string | null }[] | null;
};

/** Is this cart line currently sold at an offer price? */
export function isLineOnOffer(
  line: DiscountCartLine,
  offers: OfferLike[] | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!offers?.length || !line) return false;
  const baseId = String(line.id ?? "").split("|")[0];
  if (!baseId) return false;
  const variantName = line.variantSelections?.[0]?.name ?? null;
  return offers.some((o) => {
    if (o?.menu?.id !== baseId) return false;
    // Ignore offers that haven't started or have ended — the item cards charge
    // full price for those, so the line isn't actually discounted.
    const start = o.start_time ? new Date(o.start_time).getTime() : 0;
    const end = o.end_time ? new Date(o.end_time).getTime() : Infinity;
    if (!(start <= now && end > now)) return false;
    // A variant-targeted offer only prices its own variant line; a base offer
    // only prices a line with no variant. Mirrors the item cards' pricing.
    return o.variant?.name ? o.variant.name === variantName : !variantName;
  });
}

/**
 * The part of the cart a discount may be computed on: everything except lines
 * already sold at an offer price. Returns the full subtotal when the partner
 * has no live offers.
 */
export function discountableSubtotal(
  lines: DiscountCartLine[] | null | undefined,
  offers: OfferLike[] | null | undefined,
  now: number = Date.now(),
): number {
  if (!lines?.length) return 0;
  return lines.reduce((sum, line) => {
    if (isLineOnOffer(line, offers, now)) return sum;
    return sum + (Number(line.price) || 0) * (Number(line.quantity) || 0);
  }, 0);
}
