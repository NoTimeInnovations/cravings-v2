"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAdminStore } from "@/store/adminStore";
import { V3_OWNED_VIEWS } from "./navItems";
import { currentScreenParams, useReturnTo } from "./returnTo";

/**
 * Navigate inside admin-v3, falling back to admin-v2 for sections v3 has not
 * built.
 *
 * Every v3 screen used to hard-code `router.push("/admin-v2?view=X")`, which was
 * right when v3 only had the Dashboard. Now that it owns most sections, those
 * links throw the partner out of the shell — losing the live-order subscription
 * and the zustand state with it — to reach a screen v3 already has. This checks
 * V3_OWNED_VIEWS and only leaves when it genuinely has to.
 *
 * `params` are written with history.replaceState BEFORE the view switches,
 * because the screens that read them (Settings via ?sg/?ss, Menu via
 * ?menuPanel) read window.location at MOUNT. A router.replace is async and can
 * land after the screen has already mounted and seen an empty query.
 */
export function useV3Navigate() {
  const router = useRouter();
  const setActiveView = useAdminStore((s) => s.setActiveView);
  const setReturnTarget = useReturnTo((s) => s.setTarget);

  return React.useCallback(
    (
      view: string,
      params?: string,
      opts?: { returnLabel?: string; record?: boolean },
    ) => {
      // Remember where this jump STARTED, so the destination's outermost Back
      // comes back here instead of dead-ending on the destination's own parent.
      // Only for a jump that actually crosses screens: navigating within the
      // screen you are already on has a real parent to walk up to.
      //
      // Read straight from the store rather than subscribing — this callback
      // must not be re-created every time activeView changes, or the effects
      // that depend on it downstream re-run on every navigation.
      const from = useAdminStore.getState().activeView;
      if (opts?.record !== false && from && from !== view) {
        setReturnTarget({
          view: from,
          params: currentScreenParams(),
          label: opts?.returnLabel ?? from,
        });
      }

      if (V3_OWNED_VIEWS.has(view)) {
        if (typeof window !== "undefined") {
          const url = params
            ? `${window.location.pathname}?${params}`
            : window.location.pathname;
          window.history.replaceState(null, "", url);
        }
        setActiveView(view);
        return;
      }
      // Not built in v3 — hand off to admin-v2. Client navigation, so the
      // stores survive the trip; src/proxy.ts leaves ?view= deep links alone.
      const query = `view=${encodeURIComponent(view)}${params ? `&${params}` : ""}`;
      setActiveView(view);
      router.push(`/admin-v2?${query}`);
    },
    [router, setActiveView, setReturnTarget],
  );
}

/**
 * A screen's OUTERMOST back action.
 *
 * Returns to wherever the user came from when they were sent here from another
 * screen, and falls back to the screen's own parent otherwise. Only the top of
 * a screen's hierarchy should use this: inner pages have a real parent to walk
 * up to, and short-circuiting past it would skip levels the user did visit.
 *
 * The returning navigation deliberately does NOT record a new target
 * (`record: false`). Recording it would make the screen we just left the next
 * back destination, and the two would bounce off each other forever.
 */
export function useBackOrReturn(
  fallback: () => void,
  fallbackLabel: string,
  /**
   * Whether this page is where the user ENTERED the screen.
   *
   * An inner page reached by drilling down has a real parent above it, and
   * jumping straight out would skip a level the user did visit. The same page
   * reached by deep link has no such parent — the hub above it was never on
   * screen. Pass the mount-time deep-link check here; the default suits a
   * screen's outermost level, which is always an entry point.
   */
  enabled = true,
) {
  const navigate = useV3Navigate();
  const target = useReturnTo((s) => s.target);
  const consume = useReturnTo((s) => s.consume);

  // `fallback` is an inline arrow at every call site, so it is a new function
  // on every render. Holding the latest in a ref keeps `goBack` stable — the
  // same trap useDeclareSubPage documents, for the same reason.
  const fallbackRef = React.useRef(fallback);
  fallbackRef.current = fallback;

  const goBack = React.useCallback(() => {
    const t = enabled ? consume() : null;
    if (t) navigate(t.view, t.params, { record: false });
    else fallbackRef.current();
  }, [consume, navigate, enabled]);

  const returning = enabled && !!target;
  return {
    goBack,
    /** For aria-label / tooltip: names where Back actually goes. */
    label: returning ? `Back to ${target!.label}` : fallbackLabel,
    /** True when Back leaves this screen entirely. */
    leavesScreen: returning,
  };
}
