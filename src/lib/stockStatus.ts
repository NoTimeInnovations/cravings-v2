// Shared out-of-stock predicate for storefront item cards.
//
// By product decision, the STOREFRONT MENU never locks/greys an item based on
// stock — items always appear orderable on the listing. Stock is enforced only
// at CHECKOUT (the place-order modal), where the customer has picked a date (for
// date-capped items) and we can evaluate the real remaining quantity. So this
// always returns false; it's kept as the single call site every card variant
// routes through, in case menu-level stock display is ever reintroduced.
export function computeOutOfStock(
  _item?:
    | { id?: string; stocks?: { stock_quantity?: number; daily_default?: number | null }[] }
    | null,
  _hasStockFeature?: boolean,
  _overrides?: Record<string, number>,
): boolean {
  return false;
}
