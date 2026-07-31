import type { DeliveryRules } from "@/store/orderStore";

/**
 * HYBRID BOOKING — third-party rider near, the restaurant's own rider far.
 *
 * A partner books Porter/Rapido for nearby drops, but past a certain distance
 * the third-party fare stops making sense and they would rather send their own
 * rider. This is the one place that decides which side of that line an order
 * falls on, so the checkout price, the settings preview and the dispatcher can
 * never disagree about it.
 *
 * Deliberately conservative in every ambiguous case: the split only engages when
 * the partner has BOTH switched it on and entered a usable number, and an order
 * whose distance we could not measure stays with the third party — which is
 * exactly today's behaviour. A misconfiguration therefore costs the feature, not
 * the order.
 */

/**
 * The configured limit in km, or null when the split is not usable.
 *
 * `deliveryRadius` is checked because a limit at or beyond the orderable radius
 * leaves NO band for own delivery. That is not a split, it is the old behaviour
 * with extra steps, and treating it as configured would let the settings screen
 * promise something that can never happen.
 */
export function thirdPartyLimitKm(
  rules: DeliveryRules | null | undefined,
  deliveryRadius?: number | null,
): number | null {
  if (!rules?.hybrid_booking) return null;
  const limit = Number(rules.third_party_max_km);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const radius = Number(deliveryRadius ?? rules.delivery_radius);
  if (Number.isFinite(radius) && radius > 0 && limit >= radius) return null;
  return limit;
}

/** Whether the split is configured and usable at all. */
export function isHybridBookingActive(
  rules: DeliveryRules | null | undefined,
  deliveryRadius?: number | null,
): boolean {
  return thirdPartyLimitKm(rules, deliveryRadius) != null;
}

/**
 * True when this drop is past the third-party limit and the restaurant delivers
 * it themselves.
 *
 * An unknown distance returns FALSE on purpose. roadDistanceKm falls back to
 * straight-line and can still come back empty; guessing "far" there would drop a
 * third-party booking the partner was relying on and hand them a delivery they
 * never agreed to make.
 */
export function isBeyondThirdPartyRadius(
  rules: DeliveryRules | null | undefined,
  distanceKm: number | null | undefined,
  deliveryRadius?: number | null,
): boolean {
  const limit = thirdPartyLimitKm(rules, deliveryRadius);
  if (limit == null) return false;
  const d = Number(distanceKm);
  if (!Number.isFinite(d) || d <= 0) return false;
  return d > limit;
}
