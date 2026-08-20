import { isFreePlan } from "@/lib/getPlanLimits";

/**
 * Sidebar item visibility, shared by the admin dashboards.
 *
 * Lifted verbatim out of `src/components/admin-v2/AdminSidebar.tsx` so v3 gates
 * exactly the way v2 does. v2 still holds its own copy — this module was added
 * alongside it rather than refactoring the live dashboard mid-redesign. If you
 * change a rule here, change it there too until v2 is migrated onto this.
 *
 * The ORDER of the checks below is load-bearing and not obvious:
 *   1. delivery-pool, stock-management and settlements are decided on their own
 *      flag REGARDLESS of plan — they survive the free plan.
 *   2. On a free plan, anything in FREE_PLAN_LOCKED_IDS is hidden and everything
 *      else is visible. This returns EARLY, so the per-feature checks below
 *      never run for free-plan partners.
 *   3. Only paid plans reach the per-feature flag checks.
 */

export type NavItemState = "visible" | "hidden";

/** Hidden for partners on the free plan. */
export const FREE_PLAN_LOCKED_IDS = [
  "captains",
  "pos",
  "inventory",
  "orders",
  "qrcodes",
  "deliveryboys",
  "customers",
  "reviews",
  "whatsapp",
  "loyalty",
];

/** The `{access, enabled}` map produced by getFeatures(). Only `enabled` is read. */
type Features = Record<string, { access?: boolean; enabled?: boolean } | undefined>;

export function getNavItemState(
  id: string,
  features: Features | null | undefined,
  userData: any,
): NavItemState {
  const planId = userData?.subscription_details?.plan?.id;
  const isOnFreePlan = isFreePlan(planId);

  // Flag-gated regardless of plan.
  if (id === "delivery-pool") {
    return features?.delivery_pool?.enabled ? "visible" : "hidden";
  }
  if (id === "stock-management") {
    return features?.stockmanagement?.enabled ? "visible" : "hidden";
  }
  // Porter & Rapido dispatch. `enabled`, not `access`: a partner who has the
  // feature available but switched off has nothing to run from here. The
  // Ordering settings tab stays reachable on `access` so they can turn it on.
  // v3-only id — admin-v2's sidebar never asks about it.
  if (id === "porter-rapido") {
    return features?.porter_bridge?.enabled ? "visible" : "hidden";
  }
  // Settlements only make sense for stores that accept online (Cashfree)
  // payments — hidden otherwise, regardless of plan.
  if (id === "settlements") {
    return userData?.accept_payments_via_cashfree ? "visible" : "hidden";
  }

  if (isOnFreePlan) {
    return FREE_PLAN_LOCKED_IDS.includes(id) ? "hidden" : "visible";
  }

  // Paid plans: per-feature flags.
  if (id === "captains") {
    return features?.captainordering?.enabled ? "visible" : "hidden";
  }
  if (id === "deliveryboys") {
    return features?.delivery?.enabled ? "visible" : "hidden";
  }
  if (id === "orders") {
    return features?.ordering?.enabled ||
      features?.delivery?.enabled ||
      features?.pos?.enabled
      ? "visible"
      : "hidden";
  }
  if (id === "pos") {
    return features?.pos?.enabled ? "visible" : "hidden";
  }
  if (id === "inventory") {
    return features?.purchasemanagement?.enabled ? "visible" : "hidden";
  }
  if (id === "customers") {
    return features?.ordering?.enabled || features?.delivery?.enabled
      ? "visible"
      : "hidden";
  }
  if (id === "reviews") {
    return features?.ordering?.enabled || features?.delivery?.enabled
      ? "visible"
      : "hidden";
  }
  if (id === "whatsapp") {
    return features?.whatsappOrdering?.enabled ? "visible" : "hidden";
  }
  if (id === "loyalty") {
    return features?.loyalty_points?.enabled ? "visible" : "hidden";
  }
  return "visible";
}
