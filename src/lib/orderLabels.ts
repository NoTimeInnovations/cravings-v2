/**
 * Shared labels for orders: POS-vs-customer source, order-type label, and the
 * payment display used across the Orders section and Settlements.
 *
 * Detection primitives (verified against order creation):
 * - POS/staff order  → `source === "pos"` (fallbacks cover legacy rows).
 * - sub-type         → POS/table_order = dine-in; delivery w/o address = takeaway.
 * - prepaid (online) → `is_paid === true && payment_method !== "cash"`.
 */

type OrderLike = {
  source?: string | null;
  type?: string | null;
  captain_id?: string | null;
  orderedby?: string | null;
  payment_method?: string | null;
  is_paid?: boolean | null;
  deliveryAddress?: string | null;
};

/**
 * A POS/staff-created order (vs a customer order). Primary signal is
 * `source === "pos"`; the fallbacks cover legacy rows created before `source`
 * was populated (a partner-POS takeaway is `type: "delivery"`, so `type` alone
 * isn't enough — captain_id / orderedby catch captain POS).
 */
export const isPosOrder = (o?: OrderLike | null): boolean =>
  !!o &&
  (o.source === "pos" ||
    o.type === "pos" ||
    o.captain_id != null ||
    o.orderedby === "captain");

export type OrderSubType = "dine_in" | "takeaway" | "delivery";

/** The dine-in / takeaway / delivery nature of any order (POS or customer). */
export const getOrderSubType = (o?: OrderLike | null): OrderSubType => {
  if (o?.type === "pos" || o?.type === "table_order") return "dine_in";
  if (o?.type === "delivery" && !o?.deliveryAddress) return "takeaway";
  return "delivery";
};

const SUBTYPE_LABEL: Record<OrderSubType, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

/**
 * Order-type label for the Orders section. POS orders are prefixed —
 * "POS: Dine-in" / "POS: Takeaway" / "POS: Delivery" — while customer orders
 * show just the sub-type.
 */
export const getOrderTypeLabel = (o?: OrderLike | null): string => {
  const sub = SUBTYPE_LABEL[getOrderSubType(o)];
  return isPosOrder(o) ? `POS: ${sub}` : sub;
};

/** Human label for a POS payment method (cash / upi / card), or "Not selected". */
export const posMethodLabel = (method?: string | null): string => {
  switch ((method ?? "").toLowerCase()) {
    case "cash":
      return "Cash";
    case "upi":
      return "UPI";
    case "card":
      return "Card";
    default:
      return "Not selected";
  }
};

/** True when a (customer) order was pre-paid online: money is in and not cash. */
export const isPrepaidOrder = (o?: OrderLike | null): boolean =>
  !!o && o.is_paid === true && (o.payment_method ?? "").toLowerCase() !== "cash";

/**
 * Payment label used in the Orders list and Settlements:
 * - POS order → the chosen method (Cash / UPI / Card) or "Not selected"
 * - customer  → "Prepaid" (paid online, gateway name hidden) or "COD"
 */
export const getPaymentDisplayLabel = (o?: OrderLike | null): string => {
  if (isPosOrder(o)) return posMethodLabel(o?.payment_method);
  return isPrepaidOrder(o) ? "Prepaid" : "COD";
};
