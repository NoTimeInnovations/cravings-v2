import { fetchFromHasura } from "@/lib/hasuraClient";

// One stock-decrement instruction for an ordered line.
export type StockDecrementLine = {
  menuId: string;
  stockId: string | null | undefined;
  quantity: number;
  // Per-date stock (prebooking). When dailyDefault is a number the item is
  // "date-capped": its stock lives in menu_date_stocks keyed by the order's
  // date, seeded from this default. null/undefined => legacy global stock.
  dailyDefault?: number | null;
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

// Seed the (menu, date) row to the item's daily default ONLY when it doesn't
// exist yet (update_columns: [] => existing rows are left untouched). Runs
// before the decrement so the first order of the day starts from the cap.
const SEED_DATE_STOCK = `
  mutation SeedDateStock($menuId: uuid!, $date: date!, $qty: numeric!) {
    insert_menu_date_stocks_one(
      object: { menu_id: $menuId, date: $date, stock_quantity: $qty }
      on_conflict: { constraint: menu_date_stocks_menu_date_key, update_columns: [] }
    ) {
      id
    }
  }
`;

const DECREASE_DATE_STOCK = `
  mutation DecreaseDateStock($menuId: uuid!, $date: date!, $by: numeric!) {
    update_menu_date_stocks(
      where: { menu_id: { _eq: $menuId }, date: { _eq: $date } }
      _inc: { stock_quantity: $by }
    ) {
      affected_rows
    }
  }
`;

// Decrement stock for an order's lines and auto-disable any global-stock item
// that hits <= 0. Server-safe (only depends on fetchFromHasura), so it can run
// from the client order store (cash/COD placement) and from the server-side
// online finalize.
//
// Two stock modes, decided per line by `dailyDefault`:
//   - Global (dailyDefault == null): legacy behaviour — decrement stocks.stock_quantity
//     and flip menu.is_available off when it reaches 0.
//   - Date-capped (dailyDefault is a number): decrement the menu_date_stocks row
//     for `stockDate` (seeded from the default on first order of the day). The
//     item is NEVER globally disabled — only that date "locks" when it hits 0.
//
// Lines without a stockId (item has no stock row) are skipped. Quantities are
// aggregated per target so an item with multiple variant lines decrements once.
// Best-effort: a failure on one item is logged and does not throw.
export async function decrementStockForOrder(
  lines: StockDecrementLine[],
  opts: { stockDate: string },
): Promise<void> {
  const { stockDate } = opts;

  // Global-stock items aggregated per stock row.
  const byStock = new Map<string, { menuId: string; qty: number }>();
  // Date-capped items aggregated per menu id (all share the one stockDate).
  const byDate = new Map<string, { qty: number; dailyDefault: number }>();

  for (const l of lines) {
    if (!l?.menuId) continue;
    const qty = Number(l.quantity) || 0;
    if (qty <= 0) continue;

    const isDateCapped = typeof l.dailyDefault === "number";
    if (isDateCapped) {
      const cur = byDate.get(l.menuId);
      if (cur) cur.qty += qty;
      else byDate.set(l.menuId, { qty, dailyDefault: l.dailyDefault as number });
      continue;
    }

    if (!l.stockId) continue;
    const cur = byStock.get(l.stockId);
    if (cur) cur.qty += qty;
    else byStock.set(l.stockId, { menuId: l.menuId, qty });
  }

  // Global stock: decrement and auto-disable at 0.
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

  // Date-capped stock: seed the day's row (once) then decrement it. Never
  // touches is_available — only this date locks when it reaches 0.
  for (const [menuId, { qty, dailyDefault }] of byDate) {
    try {
      await fetchFromHasura(SEED_DATE_STOCK, {
        menuId,
        date: stockDate,
        qty: dailyDefault,
      });
      await fetchFromHasura(DECREASE_DATE_STOCK, {
        menuId,
        date: stockDate,
        by: -qty,
      });
    } catch (e) {
      console.error("[stockDecrement] failed for date stock", menuId, stockDate, e);
    }
  }
}
