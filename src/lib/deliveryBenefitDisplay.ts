import type { DeliveryBenefit } from "@/lib/freeDelivery";

/**
 * Small, pure presentation helpers for the free-/reduced-delivery UI, so the
 * cart nudge, the delivery line and the unlock card stay dumb and share one
 * tested source for their numbers. Amounts are rendered through <MenuPrice> at
 * the call site (never format a currency symbol here — partners use ₹/$/€/QAR).
 */

/** How full the "add ₹X more" progress bar is, clamped to 0–100. */
export function progressPct(subtotalMajor: number, thresholdMajor: number): number {
  const t = Number(thresholdMajor) || 0;
  if (t <= 0) return 100;
  const s = Math.max(0, Number(subtotalMajor) || 0);
  return Math.max(0, Math.min(100, (s / t) * 100));
}

/** What the customer saved on delivery (>= 0). */
export function deliverySavings(benefit: Pick<DeliveryBenefit, "originalFare" | "finalFare">): number {
  return Math.max(0, (Number(benefit.originalFare) || 0) - (Number(benefit.finalFare) || 0));
}
