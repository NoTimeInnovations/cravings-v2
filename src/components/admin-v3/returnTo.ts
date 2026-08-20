"use client";

import { create } from "zustand";

/**
 * Where Back should go when the user was sent INTO a screen from somewhere else.
 *
 * admin-v3 is one shell with one activeView, and screens can jump straight into
 * another screen's inner page: Porter & Rapido opens Settings on the Ordering
 * bridge tab, Integrations opens the WhatsApp numbers page, the dashboard's
 * quick actions open Menu already showing Availability, ⌘K lands on any setting
 * at all. Each of those destinations wires its own Back to its OWN parent — the
 * Settings hub, the WhatsApp hub, the menu list — because that is the only
 * parent it knows about. So Back drops the user somewhere they have never been.
 *
 * This holds the one thing the destination is missing: the place the journey
 * actually started. A screen's OUTERMOST back action consults it; everything
 * deeper still walks up its own hierarchy first, which is what makes
 * Accounts → bridge tab → Porter & Rapido come out in that order.
 *
 * v3-only and deliberately not in `adminStore`: that store is shared with
 * admin-v2, and v2 has no such concept.
 */
export type ReturnTarget = {
  /** activeView to restore. */
  view: string;
  /** Deep-link params to restore with it (`sg`/`ss`, `wa`, `menuPanel`). */
  params?: string;
  /** For the button's accessible name — "Back to Porter & Rapido". */
  label: string;
};

type ReturnToState = {
  target: ReturnTarget | null;
  setTarget: (t: ReturnTarget | null) => void;
  /** Read and clear in one go, so a target can only ever be consumed once. */
  consume: () => ReturnTarget | null;
};

export const useReturnTo = create<ReturnToState>((set, get) => ({
  target: null,
  setTarget: (target) => set({ target }),
  consume: () => {
    const t = get().target;
    if (t) set({ target: null });
    return t;
  },
}));

/**
 * The params currently on the URL that belong to a SCREEN rather than to the
 * shell, so returning restores the exact inner page the user left.
 *
 * `view` is excluded because the target carries it explicitly; keeping both
 * would let a stale `view=` override the one being navigated to.
 */
export function currentScreenParams(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const p = new URLSearchParams(window.location.search);
  p.delete("view");
  const qs = p.toString();
  return qs || undefined;
}
