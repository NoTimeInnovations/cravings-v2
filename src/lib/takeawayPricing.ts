// Takeaway price adjustment: a flat, per-item rupee amount added to each item's
// price when the order type is "takeaway". Configured per partner via
// `partners.takeaway_price_adjustment` and applied in both the customer ordering
// flow and POS. Independent from `partners.price_adjustment` (the hidden hotel-link
// markup); the two may stack.

export const getTakeawayAdjustment = (
  partner?: { takeaway_price_adjustment?: number | null } | null,
): number => partner?.takeaway_price_adjustment || 0;

// The surcharge applies to real menu items only — custom / off-menu items
// (entered with a manual price at billing time) are charged exactly as typed.
const isTakeawayAdjustable = (item?: { is_custom?: boolean } | null): boolean =>
  !item?.is_custom;

// Per-unit surcharge for a single item: `adjustment` for menu items, 0 for custom.
export const takeawayUnitAdjustment = (
  item: { is_custom?: boolean } | null | undefined,
  adjustment: number,
): number => (isTakeawayAdjustable(item) ? adjustment : 0);

// Returns items with each menu item's unit price bumped by `adjustment` (floored at
// 0); custom items and a 0 adjustment are passed through unchanged. Generic over any
// { price, is_custom? } shape so it works for cart items in either store.
export const applyTakeawayAdjustment = <T extends { price: number; is_custom?: boolean }>(
  items: T[],
  adjustment: number,
): T[] =>
  adjustment
    ? items.map((item) =>
        isTakeawayAdjustable(item)
          ? { ...item, price: Math.max(0, item.price + adjustment) }
          : item,
      )
    : items;

// Total surcharge across a cart: `adjustment` × quantity, summed over menu items only.
export const takeawayChargeForItems = <T extends { quantity: number; is_custom?: boolean }>(
  items: T[],
  adjustment: number,
): number =>
  adjustment
    ? items.reduce((sum, item) => sum + (isTakeawayAdjustable(item) ? adjustment * item.quantity : 0), 0)
    : 0;
