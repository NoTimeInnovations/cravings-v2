/**
 * What a menu item (or one of its variants) costs on a DELIVERY order.
 *
 * A partner may set a separate `delivery_price` to cover packaging or platform
 * cost. When they have not, the dine-in `price` stands.
 *
 * ── Why 0 means "not set", on BOTH sides ─────────────────────────────────────
 *
 * The old rule was `delivery_price ?? price`, and `??` only falls back on
 * null/undefined. A variant saved with delivery_price = 0 was therefore taken as
 * genuinely costing nothing: a ₹199 salad base rendered as "0 ₹" and the
 * configurator offered "Add item · 0 ₹", so it could be ordered free.
 *
 * The inverse shape is far more common and must keep working. 45 live variants
 * store price = 0 with the real amount in delivery_price (an artefact of imports
 * and of the offer editor, which several call sites already work around with
 * falsy `||` chains — see AdminV2Offers). So neither field can be trusted to be
 * populated, and neither zero can be trusted to be intentional.
 *
 * Hence: take whichever field carries a POSITIVE number, preferring
 * delivery_price. That is right for all three real shapes —
 *   price 199, delivery 0    → 199   (the bug this fixes)
 *   price 0,   delivery 199  → 199   (the 45 rows, unchanged)
 *   price 199, delivery 150  → 150   (a genuine delivery rate, unchanged)
 *
 * A truly free line is expressed as an offer, not as a 0 here — an item that is
 * free by accident is indistinguishable from one that is free on purpose, and
 * only one of those two is ever what the restaurant meant.
 */

export interface DeliveryPriceSource {
  price?: number | string | null;
  delivery_price?: number | string | null;
  /** Absent on variants, which never carry their own delivery visibility. */
  show_on_delivery?: boolean | null;
}

/** A finite, positive number, or null. Tolerates numeric strings, which is how
 *  these arrive from the admin form and from imported menus. */
function positive(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The delivery-mode base price, BEFORE any offer discount or partner price
 * adjustment. Returns 0 only when neither field holds a positive number.
 *
 * An item the partner has switched OFF for delivery keeps its ordinary price:
 * a delivery_price left behind on such a row is stale config, and using it made
 * the item quote a delivery figure on menus it is not even sold through — e.g.
 * a 89 item with a leftover delivery_price of 100 showed as 100. Only an
 * explicit false disables it, so variants (which carry no flag) are unaffected.
 */
export function deliveryBasePrice(source: DeliveryPriceSource | null | undefined): number {
  const deliveryPrice =
    source?.show_on_delivery === false ? null : positive(source?.delivery_price);
  return deliveryPrice ?? positive(source?.price) ?? 0;
}

/**
 * True when this row carries a delivery price that genuinely differs from its
 * dine-in price — i.e. both are real and they disagree. Used for the offer
 * delta, which must not treat "no separate delivery price" as a delta of
 * -price.
 */
export function hasDistinctDeliveryPrice(
  source: DeliveryPriceSource | null | undefined,
): boolean {
  const d = positive(source?.delivery_price);
  const p = positive(source?.price);
  return d != null && p != null && d !== p;
}
