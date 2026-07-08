// Single source of truth for the optional "Round Off" charge.
//
// When a partner enables round-off (delivery_rules.round_off === true), checkout
// appends a final "Round Off" line that brings the grand total UP to the next
// whole number. The amount is always in [0, 1): 0 when the total is already
// whole (then no line is added), otherwise the rupee-complement to the next
// integer. Because it's always >= 0 it behaves exactly like the existing
// positive Parcel Charge — it flows through total_price, the extra_charges
// array, every bill/receipt display, and (by name) the pp_menu_insert Petpooja
// mapper, so the shown total, the persisted total_price, and the Petpooja bill
// can never diverge.
//
// The name is canonical — the Petpooja mapper (separate repo) keys on it exactly
// — so do not change it without updating pp_menu_insert.

export const ROUND_OFF_NAME = "Round Off";

/**
 * Amount to ADD to `grandTotal` so it becomes the next whole number (round up).
 * Computed in integer paise to avoid floating-point drift (245.20 -> 0.80,
 * 245.00 -> 0). Always in [0, 1). Returns 0 for non-finite / non-positive input.
 */
export function computeRoundOff(grandTotal: number): number {
  if (!Number.isFinite(grandTotal) || grandTotal <= 0) return 0;
  const paise = Math.round(grandTotal * 100);
  const remainder = ((paise % 100) + 100) % 100;
  return remainder === 0 ? 0 : (100 - remainder) / 100;
}

/** Whether the partner has round-off billing enabled. */
export function isRoundOffEnabled(deliveryRules: any): boolean {
  return !!deliveryRules?.round_off;
}

/** Build the round-off extra-charge object (or null when nothing to add). */
export function roundOffCharge(
  grandTotal: number,
): { name: string; amount: number; charge_type: "FLAT_FEE" } | null {
  const amount = computeRoundOff(grandTotal);
  if (amount <= 0) return null;
  return { name: ROUND_OFF_NAME, amount, charge_type: "FLAT_FEE" };
}
