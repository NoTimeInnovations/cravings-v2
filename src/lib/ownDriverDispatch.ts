import { getFeatures } from "@/lib/getFeatures";
import type { Order } from "@/store/orderStore";
import type { Partner } from "@/store/authStore";

/**
 * A "real" delivery order = type "delivery" WITH a drop address. Takeaway orders
 * are stored as type "delivery" but with a null address (see orderStore
 * placeOrder), so the address check is what distinguishes them — matching the
 * "Takeaway" badge and the isRealDelivery dispatch gate used elsewhere.
 */
export function isRealDeliveryOrder(order: Order): boolean {
  return order.type === "delivery" && !!order.deliveryAddress?.trim();
}

/**
 * Whether dispatching this order should open the own-driver picker
 * (AssignDriverDialog) instead of flipping the status straight to "dispatched".
 *
 * True only when:
 *  - the partner runs their own fleet (`hasOwnDrivers`), and
 *  - it's a real delivery order (not a takeaway, which has no address), and
 *  - no 3PL/pool auto-dispatch is enabled. Porter-bridge and the Menuthere
 *    delivery pool book riders automatically on `accepted`, so a manual
 *    own-driver assignment would double-book. This mirrors the exact gate the
 *    inline DeliveryBoyAssignment card already uses (porter_bridge +
 *    delivery_pool only — NOT delivery_agent, whose partners can legitimately
 *    fall back to their own riders).
 *
 * The caller still checks the target status ("dispatched") and that the order
 * isn't completed (which has its own password gate).
 */
export function shouldPickOwnDriverOnDispatch(
  order: Order,
  partner: Partner | null | undefined,
  hasOwnDrivers: boolean,
): boolean {
  if (!hasOwnDrivers) return false;
  if (!isRealDeliveryOrder(order)) return false;
  const f = getFeatures(partner?.feature_flags || null);
  if (f.porter_bridge.enabled || f.delivery_pool.enabled) return false;
  return true;
}
