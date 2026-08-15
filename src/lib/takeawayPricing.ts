// Takeaway price adjustment: an extra amount added to each item's price when the
// order type is "takeaway". Configured per partner and applied in both the
// customer ordering flow and POS. Independent from `partners.price_adjustment`
// (the hidden hotel-link markup); the two may stack.
//
// TWO MODES:
//   flat    — a per-item amount, from `partners.takeaway_price_adjustment` (Int)
//   percent — a share of the item's own price, from
//             `delivery_rules.takeaway_price_adjustment_percent`
//
// The percent lives in delivery_rules (jsonb) rather than a column because the
// existing column is an Int and a rate like 12.5 would be truncated to 12.
//
// A percent COMPOUNDS on the hotel-link markup rather than applying to the raw
// menu price: `price_adjustment` is baked into menus[].price server-side long
// before a cart exists, so by the time takeaway is applied the original price is
// gone. 10% + 10% is therefore 21%, not 20% — deliberate, and the settings copy
// says so.

export type AdjustmentMode = "flat" | "percent";

/** A resolved adjustment: the mode and its value. `value` is rupees when flat,
 *  a percentage (12.5 = 12.5%) when percent. */
export type PriceAdjustment = {
  mode: AdjustmentMode;
  value: number;
};

/** No adjustment — the shape every "off" path returns, so callers never branch on null. */
export const NO_ADJUSTMENT: PriceAdjustment = { mode: "flat", value: 0 };

type TakeawayPartner = {
  takeaway_price_adjustment?: number | null;
  delivery_rules?: unknown;
} | null;

/** Read `delivery_rules`, which is stored as either a JSON string or an object
 *  depending on which write path last touched it. */
const readRules = (partner: TakeawayPartner): Record<string, unknown> => {
  const raw = (partner as { delivery_rules?: unknown } | null)?.delivery_rules;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
};

export const getTakeawayAdjustment = (partner?: TakeawayPartner): PriceAdjustment => {
  const rules = readRules(partner ?? null);
  if (rules.takeaway_price_adjustment_mode === "percent") {
    const pct = Number(rules.takeaway_price_adjustment_percent);
    return Number.isFinite(pct) && pct !== 0
      ? { mode: "percent", value: pct }
      : NO_ADJUSTMENT;
  }
  return { mode: "flat", value: partner?.takeaway_price_adjustment || 0 };
};

/** True when this adjustment would change any price at all. */
export const hasAdjustment = (adj: PriceAdjustment | number | null | undefined): boolean =>
  typeof adj === "number" ? adj !== 0 : !!adj && adj.value !== 0;

/** Accepts the legacy plain-number form so a call site that still passes a
 *  rupee amount keeps working while sites are migrated. */
const normalize = (adj: PriceAdjustment | number | null | undefined): PriceAdjustment =>
  typeof adj === "number" ? { mode: "flat", value: adj } : adj || NO_ADJUSTMENT;

// The surcharge applies to real menu items only — custom / off-menu items
// (entered with a manual price at billing time) are charged exactly as typed.
const isTakeawayAdjustable = (item?: { is_custom?: boolean } | null): boolean =>
  !item?.is_custom;

/**
 * Per-unit surcharge for a single item.
 *
 * `price` is required for percent mode and ignored for flat. It is optional so
 * the flat call sites that never had a price to hand keep compiling; a percent
 * adjustment with no price returns 0 rather than guessing, which under-charges
 * visibly instead of over-charging silently.
 */
export const takeawayUnitAdjustment = (
  item: { is_custom?: boolean; price?: number } | null | undefined,
  adjustment: PriceAdjustment | number,
  price?: number,
): number => {
  if (!isTakeawayAdjustable(item)) return 0;
  const adj = normalize(adjustment);
  if (adj.value === 0) return 0;
  if (adj.mode === "flat") return adj.value;
  const base = price ?? item?.price ?? 0;
  return (base * adj.value) / 100;
};

/** Returns items with each menu item's unit price adjusted (floored at 0);
 *  custom items and a zero adjustment are passed through unchanged. */
export const applyTakeawayAdjustment = <T extends { price: number; is_custom?: boolean }>(
  items: T[],
  adjustment: PriceAdjustment | number,
): T[] => {
  const adj = normalize(adjustment);
  if (adj.value === 0) return items;
  return items.map((item) =>
    isTakeawayAdjustable(item)
      ? { ...item, price: Math.max(0, item.price + takeawayUnitAdjustment(item, adj, item.price)) }
      : item,
  );
};

/**
 * Total surcharge across a cart.
 *
 * Sums the PER-LINE surcharge rather than applying the rate to a subtotal: for a
 * percentage the two agree mathematically, but summing per line keeps this
 * consistent with what each row displays, so a bill's lines always add up to its
 * total.
 */
export const takeawayChargeForItems = <T extends { quantity: number; is_custom?: boolean; price?: number }>(
  items: T[],
  adjustment: PriceAdjustment | number,
): number => {
  const adj = normalize(adjustment);
  if (adj.value === 0) return 0;
  return items.reduce(
    (sum, item) => sum + takeawayUnitAdjustment(item, adj, item.price) * item.quantity,
    0,
  );
};
