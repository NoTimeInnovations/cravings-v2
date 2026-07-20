// Single source of truth for the optional "Round Off" charge.
//
// When a partner enables round-off (delivery_rules.round_off === true), checkout
// appends a final "Round Off" line that brings the grand total to the NEAREST
// whole number (round half up). The amount is signed and in (-0.5, 0.5]:
//   - fractional part < .50  -> negative (round the total DOWN)
//   - fractional part >= .50 -> positive (round the total UP; a .50 tie rounds up)
//   - already whole          -> 0 (no line added)
// It flows through total_price, the extra_charges array, every bill/receipt
// display, and (by name) the pp_menu_insert Petpooja mapper, so the shown total,
// the persisted total_price, and the Petpooja bill can never diverge. Because the
// amount can now be negative, every call site pushes/shows the line on `!== 0`
// (not `> 0`) so a round-DOWN is applied and displayed too.
//
// The name is canonical — the Petpooja mapper (separate repo) keys on it exactly
// — so do not change it without updating pp_menu_insert.

export const ROUND_OFF_NAME = "Round Off";

/**
 * Signed amount to ADD to `grandTotal` so it becomes the NEAREST whole number
 * (round half up). Computed in integer paise to avoid floating-point drift:
 * 245.20 -> -0.20 (down), 245.50 -> +0.50 (up), 245.80 -> +0.20 (up),
 * 245.00 -> 0. In (-0.5, 0.5]. Returns 0 for non-finite / non-positive input.
 */
export function computeRoundOff(grandTotal: number): number {
  if (!Number.isFinite(grandTotal) || grandTotal <= 0) return 0;
  const paise = Math.round(grandTotal * 100);
  const remainder = ((paise % 100) + 100) % 100; // 0..99
  if (remainder === 0) return 0;
  // < 50 paise: drop the fraction (round down, negative).
  // >= 50 paise: complement up to the next rupee (round up, positive; .50 ties up).
  return remainder < 50 ? -remainder / 100 : (100 - remainder) / 100;
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
  if (amount === 0) return null;
  return { name: ROUND_OFF_NAME, amount, charge_type: "FLAT_FEE" };
}
