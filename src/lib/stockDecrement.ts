import { fetchFromHasura } from "@/lib/hasuraClient";

// One stock-decrement instruction for an ordered line.
export type StockDecrementLine = {
  menuId: string;
  // Legacy hints — no longer used for routing. Routing is re-resolved from the
  // DB per menuId (see below) so it can't be corrupted by a cart built from a
  // query that omits daily_default. Kept optional for backward compatibility.
  stockId?: string | null;
  quantity: number;
  dailyDefault?: number | null;
};

// Authoritative stock rows for the ordered items — the single source of truth
// for whether an item is date-capped, so decrement routing never depends on
// which (possibly daily_default-less) query built the cart.
const GET_STOCKS_FOR_MENU = `
  query StocksForMenu($ids: [uuid!]!) {
    stocks(where: { menu_id: { _in: $ids } }) {
      menu_id
      id
      stock_type
      daily_default
    }
  }
`;

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

// Decrement stock for an order's lines. Server-safe (only depends on
// fetchFromHasura), so it runs from the client order stores (cash/COD, POS) and
// from the server-side online finalize.
//
// Two stock modes, decided per item from the DB (NOT from the caller):
//   - Date-capped (stocks.daily_default is a number): decrement the
//     menu_date_stocks row for `stockDate`, seeded from the default on the first
//     order of the day. The item is NEVER globally disabled — only that date
//     "locks" when it hits 0.
//   - Global (daily_default null): legacy behaviour — decrement stocks.stock_quantity
//     and flip menu.is_available off when it reaches 0.
//
// Items with no stock row are skipped (untracked => unlimited). Quantities are
// aggregated per menu id so an item with multiple variant lines decrements once.
// Best-effort: a failure on one item is logged and does not throw.
export async function decrementStockForOrder(
  lines: StockDecrementLine[],
  opts: { stockDate: string },
): Promise<void> {
  const { stockDate } = opts;

  // Aggregate ordered quantity per menu id (variants share one stock row).
  const qtyByMenu = new Map<string, number>();
  for (const l of lines) {
    if (!l?.menuId) continue;
    const qty = Number(l.quantity) || 0;
    if (qty <= 0) continue;
    qtyByMenu.set(l.menuId, (qtyByMenu.get(l.menuId) || 0) + qty);
  }
  if (qtyByMenu.size === 0) return;

  // Re-resolve the authoritative stock rows so routing is independent of the
  // cart's origin. Best-effort: if this lookup fails, skip rather than guess.
  const menuIds = Array.from(qtyByMenu.keys());
  let rows: Array<{ menu_id: string; id: string; stock_type: string; daily_default: number | null }> = [];
  try {
    const res = await fetchFromHasura(GET_STOCKS_FOR_MENU, { ids: menuIds });
    rows = res?.stocks || [];
  } catch (e) {
    console.error("[stockDecrement] failed to load stock rows", e);
    return;
  }
  const stockByMenu = new Map<string, { stockId: string; dailyDefault: number | null }>();
  for (const r of rows) {
    if (r?.menu_id == null) continue;
    stockByMenu.set(r.menu_id, { stockId: r.id, dailyDefault: r.daily_default ?? null });
  }

  for (const [menuId, qty] of qtyByMenu) {
    const info = stockByMenu.get(menuId);
    if (!info) continue; // no stock row => untracked / unlimited

    try {
      if (info.dailyDefault != null) {
        // Date-capped: seed the day's row (once) then decrement it. Never touch
        // is_available — only this date locks when it reaches 0.
        await fetchFromHasura(SEED_DATE_STOCK, {
          menuId,
          date: stockDate,
          qty: info.dailyDefault,
        });
        await fetchFromHasura(DECREASE_DATE_STOCK, {
          menuId,
          date: stockDate,
          by: -qty,
        });
      } else {
        // Global stock: decrement and auto-disable at 0.
        const res = await fetchFromHasura(DECREASE_STOCK, { stockId: info.stockId, by: -qty });
        const newQty = res?.update_stocks_by_pk?.stock_quantity;
        if (typeof newQty === "number" && newQty <= 0) {
          await fetchFromHasura(DISABLE_MENU_ITEM, { id: menuId });
        }
      }
    } catch (e) {
      console.error("[stockDecrement] failed for", menuId, stockDate, e);
    }
  }
}
