/**
 * Shared helpers for the "lock completed orders" safeguard.
 *
 * A single source of truth so every staff surface (partner POS, captain POS,
 * dashboard order list / details / editor) enforces the rule identically:
 * once an order is COMPLETED and the partner has switched the lock on, the
 * order can no longer be edited — the only remaining action is Cancel.
 *
 * The flag lives on the partner row inside the `delivery_rules` JSON blob
 * (`delivery_rules.lock_completed_orders`) and is toggled from
 * Settings → Store → Order Lock behind a hard-coded master password.
 */

import type { AuthUser } from "@/store/authStore";

type OrderLike = { status?: string | null } | null | undefined;

/** delivery_rules is normally an object, but tolerate a stringified column. */
const parseDeliveryRules = (dr: any): any => {
  if (!dr) return null;
  if (typeof dr === "string") {
    try {
      return JSON.parse(dr);
    } catch {
      return null;
    }
  }
  return dr;
};

/** An order is "completed" (terminal-fulfilled). */
export const isOrderCompleted = (order: OrderLike): boolean =>
  order?.status === "completed";

/**
 * Whether the partner has enabled the completed-order lock. Works for both a
 * `partner` session (reads delivery_rules directly) and a `captain` session
 * (reads the nested partner.delivery_rules).
 */
export const isCompletedOrderLockEnabled = (
  userData: AuthUser | null | undefined
): boolean => {
  if (!userData) return false;
  const anyUser = userData as any;
  const deliveryRules = parseDeliveryRules(
    anyUser.role === "captain"
      ? anyUser.partner?.delivery_rules
      : anyUser.delivery_rules
  );
  return !!deliveryRules?.lock_completed_orders;
};

/**
 * True when an order must be treated as read-only for staff edits: the lock
 * setting is on AND the order is completed. Cancellation is still permitted.
 */
export const isOrderEditLocked = (
  order: OrderLike,
  userData: AuthUser | null | undefined
): boolean => isCompletedOrderLockEnabled(userData) && isOrderCompleted(order);
