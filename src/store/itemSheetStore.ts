"use client";

import { useEffect } from "react";
import { create } from "zustand";

/**
 * How many item detail / variant bottom sheets are currently on screen.
 *
 * Deliberately NOT persisted and NOT part of orderStore: it is pure transient UI
 * presence, and a persisted "open" count could survive a reload and wedge
 * anything gated on it.
 *
 * Consumed by <AddedRecommendationsSheet/>, which holds an added item's pairings
 * back while its own sheet is still open (popping them over the sheet on every
 * "+" tap is noise) and surfaces them once the sheet closes. The customizer has
 * its own global `isOpen` in customizerStore, so it needs no registration here.
 */
interface ItemSheetState {
  openCount: number;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useItemSheetStore = create<ItemSheetState>((set) => ({
  openCount: 0,
  openSheet: () => set((s) => ({ openCount: s.openCount + 1 })),
  // Clamp at 0 so an unbalanced close can never drive the count negative and
  // leave the "a sheet is open" check permanently true.
  closeSheet: () => set((s) => ({ openCount: Math.max(0, s.openCount - 1) })),
}));

/**
 * Register an item sheet as open for as long as `isOpen` is true. Pass a literal
 * `true` from a component that is only mounted while its sheet is open — the
 * cleanup then fires on unmount, so every close path (button, backdrop, swipe,
 * route change) is covered without wiring each one.
 */
export function useRegisterItemSheet(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const { openSheet, closeSheet } = useItemSheetStore.getState();
    openSheet();
    return () => closeSheet();
  }, [isOpen]);
}
