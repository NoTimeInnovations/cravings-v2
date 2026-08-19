"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAdminStore } from "@/store/adminStore";
import { V3_OWNED_VIEWS } from "./navItems";

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

  return React.useCallback(
    (view: string, params?: string) => {
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
    [router, setActiveView],
  );
}
