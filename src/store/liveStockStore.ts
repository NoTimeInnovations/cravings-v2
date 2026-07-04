import { create } from "zustand";

// Live stock overrides keyed by BASE menu id. The checkout modals fetch current
// stock when they open and publish it here so the storefront menu cards reflect
// out-of-stock items immediately (the page's own menu data is an SSR snapshot
// that can be up to ~60s stale).
//
// Only NON date-capped (legacy global) quantities are published here. Date-capped
// items track stock per calendar date (menu_date_stocks); a single number would be
// meaningless on a menu card that hasn't chosen a date, so the modals deliberately
// omit them and enforce those per-date at checkout instead.
interface LiveStockState {
  qty: Record<string, number>;
  setMany: (map: Record<string, number>) => void;
}

export const useLiveStock = create<LiveStockState>((set) => ({
  qty: {},
  setMany: (map) =>
    set((s) => {
      // Skip the update if nothing actually changed (avoids needless re-renders).
      let changed = false;
      for (const k in map) {
        if (s.qty[k] !== map[k]) {
          changed = true;
          break;
        }
      }
      return changed ? { qty: { ...s.qty, ...map } } : s;
    }),
}));
