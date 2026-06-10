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
