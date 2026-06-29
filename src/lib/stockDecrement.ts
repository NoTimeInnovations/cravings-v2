import { fetchFromHasura } from "@/lib/hasuraClient";

// One stock-decrement instruction for an ordered line.
export type StockDecrementLine = {
  menuId: string;
  stockId: string | null | undefined;
  quantity: number;
};

const DECREASE_STOCK = `
  mutation DecreaseStock($stockId: uuid!, $by: numeric!) {
    update_stocks_by_pk(pk_columns: { id: $stockId }, _inc: { stock_quantity: $by }) {
      id
      stock_quantity
    }
  }
`;

const DISABLE_MENU_ITEM = `
  mutation DisableMenuItem($id: uuid!) {
    update_menu_by_pk(pk_columns: { id: $id }, _set: { is_available: false }) {
      id
    }
  }
`;

// Decrement stock for an order's lines and auto-disable any item that hits <= 0.
// Server-safe (only depends on fetchFromHasura), so it can run from the client
// order store (cash/COD placement) and from the server-side online finalize.
// Lines without a stockId (item has no stock row) are skipped. Quantities are
// aggregated per stock row so an item with multiple variant lines decrements
// once. Best-effort: a failure on one item is logged and does not throw.
export async function decrementStockForOrder(lines: StockDecrementLine[]): Promise<void> {
  const byStock = new Map<string, { menuId: string; qty: number }>();
  for (const l of lines) {
    if (!l?.stockId || !l?.menuId) continue;
    const qty = Number(l.quantity) || 0;
    if (qty <= 0) continue;
    const cur = byStock.get(l.stockId);
    if (cur) cur.qty += qty;
    else byStock.set(l.stockId, { menuId: l.menuId, qty });
  }

  for (const [stockId, { menuId, qty }] of byStock) {
    try {
      const res = await fetchFromHasura(DECREASE_STOCK, { stockId, by: -qty });
      const newQty = res?.update_stocks_by_pk?.stock_quantity;
      // When an item runs out, turn its availability off so the partner has to
      // restock + re-enable it (or it's restored by the daily reset).
      if (typeof newQty === "number" && newQty <= 0) {
        await fetchFromHasura(DISABLE_MENU_ITEM, { id: menuId });
      }
    } catch (e) {
      console.error("[stockDecrement] failed for stock", stockId, e);
    }
  }
}
