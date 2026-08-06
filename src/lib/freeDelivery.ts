import type { DeliveryRules } from "@/store/orderStore";

/**
 * FREE / REDUCED DELIVERY ABOVE A CART VALUE — distance-capped.
 *
 * A restaurant rewards bigger orders: once the item subtotal reaches a target
 * AND the drop is close enough, the delivery fee is waived or cut. This is the
 * one place that decides whether an order earns that perk, so the checkout
 * price, the cart nudge and the settings preview can never disagree about it.
 *
 * The benefit is applied AFTER whichever pricing source produced the base fee
 * (own basic/advanced/fixed/per-km, the delivery-agent quote, or the Porter/
 * Rapido live quote), so it uniformly covers "every place". When a live-quote
 * rider is still booked on a now-free order the restaurant absorbs the courier
 * fare — that is the intended trade for the sale.
 *
 * Deliberately conservative in every ambiguous case (mirrors hybridDelivery.ts):
 * the perk only engages when the partner has switched it on AND entered a usable
 * distance, and an order whose distance we could not measure earns NOTHING. That
 * last choice is the money-safe INVERSION of hybrid booking's "unknown => stay
 * with third party": here the no-op is charging the normal fee, because granting
 * free delivery on an unmeasured (possibly far) drop would let a distance-service
 * hiccup hand out free delivery the partner never agreed to. A misconfiguration
 * or measurement gap therefore costs the discount, never the restaurant's margin.
 *
 * NOTE: today Cashfree/Razorpay trust the client grand total, so this runs
 * client-side only. If a server-side total revalidation is ever added it MUST
 * import this helper to stay in lockstep.
 */

export interface FreeDeliveryConfig {
  /** Item subtotal (major units) needed to qualify. 0 = no minimum. */
  minOrder: number;
  /** Max road distance (km) the perk covers (ignored when anyDistance). */
  maxKm: number;
  /** When true, the km cap is ignored — a qualifying order value earns the perk
   *  at any distance (still bounded by the serviceable delivery radius). */
  anyDistance: boolean;
  mode: "free" | "reduced";
  /** Amount off the fee in "reduced" mode (major units). */
  discount: number;
}

/**
 * The usable free-delivery config, or null when the perk is not configured.
 *
 * OFF when the master toggle is off, the distance cap is missing/<= 0, or the
 * mode is "reduced" with no positive discount (nothing to give). Mirrors
 * `thirdPartyLimitKm` returning null for "not configured".
 */
export function freeDeliveryConfig(
  rules: DeliveryRules | null | undefined,
): FreeDeliveryConfig | null {
  if (!rules?.free_delivery_enabled) return null;

  const anyDistance = !!rules.free_delivery_any_distance;
  const maxKmRaw = Number(rules.free_delivery_max_km);
  const maxKm = Number.isFinite(maxKmRaw) && maxKmRaw > 0 ? maxKmRaw : 0;
  // A capped perk needs a usable distance; "any distance" needs none.
  if (!anyDistance && maxKm <= 0) return null;

  const minOrderRaw = Number(rules.free_delivery_min_order);
  const minOrder = Number.isFinite(minOrderRaw) && minOrderRaw > 0 ? minOrderRaw : 0;

  const mode = rules.free_delivery_mode === "reduced" ? "reduced" : "free";

  const discountRaw = Number(rules.free_delivery_discount);
  const discount = Number.isFinite(discountRaw) && discountRaw > 0 ? discountRaw : 0;

  // "reduced" with nothing to reduce is the same as no perk at all.
  if (mode === "reduced" && discount <= 0) return null;

  return { minOrder, maxKm, anyDistance, mode, discount };
}

export type DeliveryBenefitKind = "none" | "free" | "reduced";

export interface DeliveryBenefit {
  /** The fee to actually charge (>= 0, whole units). */
  finalFare: number;
  benefit: DeliveryBenefitKind;
  /** The fee that would be charged WITHOUT the perk — for "was ₹X" display. */
  originalFare: number;
  /** Both the value AND distance conditions are met. */
  qualifies: boolean;
  /** Major units still needed on the subtotal to unlock — powers the cart nudge.
   *  0 when already qualifying, feature off, or beyond the distance cap. */
  amountToUnlock: number;
}

/**
 * Resolve the delivery-fee benefit for one cart.
 *
 * @param rules          partner.delivery_rules
 * @param subtotalMajor  raw item subtotal (major units) — the delivery threshold basis
 * @param distanceKm     measured road distance to the drop, or null/undefined if unknown
 * @param baseFare       the fee that WOULD be charged (porter fare / agent price / own cost)
 */
export function computeDeliveryBenefit(
  rules: DeliveryRules | null | undefined,
  subtotalMajor: number,
  distanceKm: number | null | undefined,
  baseFare: number,
): DeliveryBenefit {
  const originalFare = Math.max(0, Number(baseFare) || 0);
  const none = (amountToUnlock = 0): DeliveryBenefit => ({
    finalFare: originalFare,
    benefit: "none",
    originalFare,
    qualifies: false,
    amountToUnlock,
  });

  const cfg = freeDeliveryConfig(rules);
  if (!cfg) return none();

  // Nothing to waive or reduce — the fee is already 0 (a range-gap freebie, a
  // hidden charge, or not yet computed). Don't celebrate "free delivery" or
  // nudge for a fee that isn't there.
  if (originalFare <= 0) return none();

  // Distance gate. "Any distance" perks skip it entirely (a high enough order
  // ships free however far — still bounded by the serviceable delivery radius
  // elsewhere). Capped perks need a KNOWN drop within the cap: an unmeasured
  // distance earns nothing (money-safe; see file header), and a drop past the
  // cap never qualifies no matter how large the cart.
  if (!cfg.anyDistance) {
    const d = Number(distanceKm);
    if (!Number.isFinite(d) || d <= 0) return none();
    if (d > cfg.maxKm) return none(0);
  }

  // Cart too small → no perk yet, but surface how much more unlocks it (nudge).
  const s = Math.max(0, Number(subtotalMajor) || 0);
  if (s < cfg.minOrder) return none(Math.max(0, cfg.minOrder - s));

  // Qualifies.
  let finalFare: number;
  let benefit: DeliveryBenefitKind;
  if (cfg.mode === "free") {
    finalFare = 0;
    benefit = "free";
  } else {
    finalFare = Math.max(0, originalFare - cfg.discount);
    // A discount that swallows the whole fee reads as "free" for honest display.
    benefit = finalFare <= 0 ? "free" : "reduced";
  }

  return {
    finalFare: Math.round(finalFare),
    benefit,
    originalFare,
    qualifies: true,
    amountToUnlock: 0,
  };
}

/**
 * THIRD-PARTY (Porter/Rapido) FREE NEAR-ZONE.
 *
 * A separate, value-agnostic rule for stores that charge the live bridge quote:
 * inside a small radius the store eats the courier fare so nearby customers get
 * free delivery, and everyone beyond the radius pays the quote. Unlike hybrid
 * booking it never switches to an own rider — it only waives the near fare.
 * Applied only in the Porter charge path at checkout.
 */

/** The free near-zone radius in km, or 0 when off. */
export function thirdPartyFreeKm(rules: DeliveryRules | null | undefined): number {
  const km = Number(rules?.porter_free_km);
  return Number.isFinite(km) && km > 0 ? km : 0;
}

/**
 * True when a live-quote order sits inside the free near-zone (distance <= N km).
 * Unknown distance → false (money-safe: only waive a fare we can confirm is inside
 * the zone; an unmeasured drop pays the quote).
 */
export function isWithinThirdPartyFreeZone(
  rules: DeliveryRules | null | undefined,
  distanceKm: number | null | undefined,
): boolean {
  const freeKm = thirdPartyFreeKm(rules);
  if (freeKm <= 0) return false;
  const d = Number(distanceKm);
  if (!Number.isFinite(d) || d <= 0) return false;
  return d <= freeKm;
}
