// Shared out-of-stock predicate for storefront item cards. Centralizes the rule
// that was previously copy-pasted across every card variant, and lets a live
// stock override (published by the checkout) take precedence over the SSR menu
// snapshot.
//
// `item.id` is the BASE menu id on a card (cards render menu items, not variant
// cart lines), which is how the override map is keyed.
export function computeOutOfStock(
  item:
    | { id?: string; stocks?: { stock_quantity?: number; daily_default?: number | null }[] }
    | null
    | undefined,
  hasStockFeature: boolean | undefined,
  overrides?: Record<string, number>,
): boolean {
  if (!hasStockFeature || !item) return false;
  // Date-capped items (daily_default set) have per-date stock that the card
  // can't evaluate — no date is chosen yet. Keep them available here; the
  // checkout enforces the selected date's stock. The live override map never
  // carries date-capped quantities (see liveStockStore), so it won't grey them.
  if (item.stocks?.[0]?.daily_default != null) return false;
  const live = item.id != null ? overrides?.[item.id] : undefined;
  if (typeof live === "number") return live <= 0;
  return (item.stocks?.length ?? 0) > 0 && (item.stocks?.[0]?.stock_quantity ?? 1) <= 0;
}
