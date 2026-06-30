import { create } from "zustand";

// Live stock overrides keyed by BASE menu id. The checkout modals fetch current
// stock when they open and publish it here so the storefront menu cards reflect
// out-of-stock items immediately (the page's own menu data is an SSR snapshot
// that can be up to ~60s stale).
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
