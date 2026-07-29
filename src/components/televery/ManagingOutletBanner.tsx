"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogOut, ShieldAlert, Loader2 } from "lucide-react";
import { returnToTeleverySession } from "@/app/actions/televerySession";
import { returnToSuperadminSession } from "@/app/actions/superadminSession";
import { TELEVERY_DASHBOARD_PATH } from "@/lib/televery";

/** Bar height. Kept in sync with the shell-shrink rule below. */
const BAR_HEIGHT_PX = 44;

/**
 * "You are managing X as <Televery | superadmin>" — shown across the WHOLE
 * partner dashboard whenever someone has swapped into a partner's session, from
 * either src/app/actions/televerySession.ts or superadminSession.ts.
 *
 * It is deliberately loud and always on screen: this is real impersonation with
 * full write access to someone else's business, and nothing audit-logs it today.
 * Nobody should be able to forget which shop they are editing.
 *
 * "Always" is literal — the marker that drives this banner shares the auth
 * cookie's 30-day lifetime and is cleared with it, so it cannot expire early and
 * leave the swap running with neither a warning nor this Exit button.
 */
export function ManagingOutletBanner({
  outletName,
  /** Which session Exit hands back. Superadmin swaps restore a far more powerful
   *  session than Televery ones, so they must not share a return path. */
  mode = "televery",
}: {
  outletName?: string;
  mode?: "televery" | "superadmin";
}) {
  const [exiting, setExiting] = useState(false);

  // Who the viewer is acting AS. The banner exists so nobody forgets whose shop
  // they are editing, which only works if it names the right identity — saying
  // "as Televery" to a superadmin is worse than saying nothing.
  const actingAs = mode === "superadmin" ? "superadmin" : "Televery";
  const exitLabel = mode === "superadmin" ? "Exit to superadmin" : "Exit to marketplace";

  const handleExit = async () => {
    setExiting(true);
    try {
      const res =
        mode === "superadmin"
          ? await returnToSuperadminSession()
          : await returnToTeleverySession();
      if (!res.ok) {
        toast.error(res.error || "Could not return.");
        setExiting(false);
        return;
      }
      // Hard reload, never router.push: only a full load re-runs AuthInitializer
      // → fetchUser, which is what rehydrates userData for the restored televery
      // session. A client nav would keep the outlet's userData in memory.
      window.location.href =
        mode === "superadmin" ? "/superadmin" : TELEVERY_DASHBOARD_PATH;
    } catch (err) {
      console.error("Exit impersonation failed:", err);
      toast.error("Could not return.");
      setExiting(false);
    }
  };

  return (
    <>
      {/*
        The dashboard shell under this bar is a full-viewport `h-screen` column.
        Shrink it by exactly the bar height so the page still ends at the fold —
        otherwise the window grows 44px taller and the floating Save button /
        mobile action bars sit below it. Scoped to the managing wrapper, and to
        DIRECT children only, so no modal or inner pane is affected.
      */}
      <style>{`
        .tv-managing-shell > .h-screen { height: calc(100vh - ${BAR_HEIGHT_PX}px); }
      `}</style>

      <div
        className="sticky top-0 z-[60] flex items-center gap-2 border-b border-amber-600/40 bg-amber-500 px-3 text-amber-950 shadow-sm sm:gap-3 sm:px-4"
        style={{ height: BAR_HEIGHT_PX }}
        role="status"
      >
        <ShieldAlert className="h-4 w-4 shrink-0" />

        <p className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">
          You&apos;re managing{" "}
          <span className="font-extrabold">
            {outletName || "this business"}
          </span>
          <span className="hidden sm:inline">
            {" "}as {actingAs} — changes affect their live store.
          </span>
        </p>

        <button
          type="button"
          onClick={handleExit}
          disabled={exiting}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-950 px-2.5 py-1.5 text-xs font-bold text-amber-50 transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
        >
          {exiting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{exitLabel}</span>
          <span className="sm:hidden">Exit</span>
        </button>
      </div>
    </>
  );
}
