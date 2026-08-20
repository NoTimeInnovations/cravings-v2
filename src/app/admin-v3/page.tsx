"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAdminStore } from "@/store/adminStore";
import { Partner, useAuthStore } from "@/store/authStore";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { AdminV3Sidebar } from "@/components/admin-v3/AdminV3Sidebar";
import { AdminV3Header } from "@/components/admin-v3/AdminV3Header";
import { AdminV3Dashboard } from "@/components/admin-v3/AdminV3Dashboard";
import { AdminV3Search } from "@/components/admin-v3/AdminV3Search";
import { useWhatsAppStatus } from "@/components/admin-v3/dashboard/useWhatsAppStatus";
import { SubscriptionGate } from "@/components/admin-v2/SubscriptionGate";
import { V3_OWNED_VIEWS, SETTINGS_DEEP_LINKS } from "@/components/admin-v3/navItems";
import { V3_VIEWS, V3_WA_SCREENS } from "@/components/admin-v3/viewRegistry";
import type { AdminV3WhatsAppScreen } from "@/components/admin-v3/AdminV3WhatsApp";

/**
 * /admin-v3 — the redesigned partner dashboard.
 *
 * Sections v3 implements are listed in V3_OWNED_VIEWS and rendered from
 * V3_VIEWS (lazily, one chunk each). Anything NOT in that set still hands off
 * to admin-v2 as `?view=<title>`, which admin-v2's layout respects: it forwards
 * a v3 partner to /admin-v3 only on a BARE visit, so these deep links do not
 * bounce back. See the isV3DeepLink note in src/app/admin-v2/layout.tsx.
 */
export default function AdminV3Page() {
  const { activeView, setActiveView } = useAdminStore();
  const { userData, signOut } = useAuthStore();
  const partner = userData as Partner | undefined;
  const { gate } = useSubscriptionGate();
  const { status: whatsapp, refresh: refreshWhatsApp } = useWhatsAppStatus();

  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  // WhatsApp's sub-screens are reached from its hub, not the sidebar, so they
  // live outside activeView. Null = show the hub.
  const [waScreen, setWaScreen] = React.useState<AdminV3WhatsAppScreen | null>(null);
  // Desktop sidebar collapse is a POS-ONLY affordance: POS is a two-pane counter
  // screen that wants every pixel, and admin-v2 collapses there too. Every other
  // screen keeps the sidebar, so neither the collapse nor its toggle exists
  // outside POS.
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [searchOpen, setSearchOpen] = React.useState(false);

  /**
   * "Menuthere | <store>" in the tab.
   *
   * Client-side because the store name only exists once the session has
   * loaded — a server-rendered metadata title would have to fetch the partner
   * again on every navigation to say the same thing. The previous title is
   * restored on unmount so a client navigation out of the shell does not leave
   * a stale store name in the tab.
   */
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.title;
    const store = partner?.store_name?.trim();
    document.title = store ? `Menuthere | ${store}` : "Menuthere";
    return () => {
      document.title = previous;
    };
  }, [partner?.store_name]);

  // ⌘K / Ctrl-K from anywhere in the shell.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /**
   * Restore the screen from the URL on load.
   *
   * activeView is plain (unpersisted) zustand defaulting to "Dashboard", so a
   * reload always dropped back there — even from /admin-v3?sg=ordering&ss=checkout,
   * where the URL plainly says which screen was open. `?sg=` means Settings (the
   * section screen reads sg/ss itself); otherwise `?view=` names it outright.
   *
   * Anything v3 does not implement still falls back to Dashboard, or the sidebar
   * would highlight nothing and the panel would render empty.
   */
  const [restored, setRestored] = React.useState(false);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("sg") ? "Settings" : params.get("view");
    const current = useAdminStore.getState().activeView;

    if (fromUrl && V3_OWNED_VIEWS.has(fromUrl)) {
      if (fromUrl !== current) setActiveView(fromUrl);
    } else if (!V3_OWNED_VIEWS.has(current)) {
      setActiveView("Dashboard");
    }
    setRestored(true);
  }, [setActiveView]);

  /**
   * ...and keep the URL naming the screen, so there is something to restore.
   *
   * Other params are preserved: Settings owns sg/ss and writes them itself.
   * Dashboard is left implicit to keep the bare /admin-v3 address clean — and
   * because src/proxy.ts treats a bare or view=Dashboard entry as the one to
   * resolve the dashboard version on.
   */
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Not before the restore above has run. setActiveView is async, so on the
    // first pass activeView is still "Dashboard" while the URL already says
    // Settings — writing then would strip sg/ss a beat before the Settings
    // screen mounts to read them, and the deep link would die on arrival.
    if (!restored) return;
    const params = new URLSearchParams(window.location.search);
    if (activeView === "Dashboard") params.delete("view");
    else params.set("view", activeView);
    // A screen's own deep-link params describe a screen that is no longer
    // open. Left behind, ?wa=numbers would silently reopen the numbers page
    // every time WhatsApp was visited again.
    if (activeView !== "Settings") {
      params.delete("sg");
      params.delete("ss");
    }
    if (activeView !== "WhatsApp") params.delete("wa");
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", next);
    }
  }, [activeView, restored]);

  // Runs on the view CHANGE, not on every render, so toggling the sidebar back
  // open while still on POS sticks instead of being slammed shut again. Leaving
  // POS always restores it — the collapse belongs to POS, not to the session.
  const prevViewRef = React.useRef(activeView);
  React.useEffect(() => {
    if (prevViewRef.current !== activeView) {
      setSidebarOpen(activeView !== "POS");
      prevViewRef.current = activeView;
    }
  }, [activeView]);

  // Leaving WhatsApp must drop its sub-screen, or coming back later reopens
  // whatever was last inspected instead of the hub.
  React.useEffect(() => {
    if (activeView !== "WhatsApp" && waScreen) setWaScreen(null);
  }, [activeView, waScreen]);

  const handleNavigate = (view: string, id: string) => {
    setDrawerOpen(false);
    if (V3_OWNED_VIEWS.has(view)) {
      setActiveView(view);
      return;
    }
    // Hand off to admin-v2 as a CLIENT navigation, so the zustand stores
    // (activeView, selectedOrderId, the live-order subscription) survive the
    // trip. The version guard lives in src/proxy.ts, which runs for RSC
    // navigations too, so nothing is skipped by not reloading.
    setActiveView(view);
    const extra = SETTINGS_DEEP_LINKS[id];
    const query = `view=${encodeURIComponent(view)}${extra ? `&${extra}` : ""}`;
    router.push(`/admin-v2?${query}`);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("[V3] sign out failed:", e);
    } finally {
      window.location.href = "/login";
    }
  };

  // Live orders arrive over a subscription and need no manual pull; the only
  // polled state left on this screen is the WhatsApp channel, which also drives
  // the Get Started checklist.
  const handleRefresh = () => {
    setRefreshing(true);
    refreshWhatsApp();
    // Purely cosmetic: the load sets its own state, and a spinner that vanishes
    // instantly reads as "nothing happened".
    setTimeout(() => setRefreshing(false), 600);
  };

  const renderView = () => {
    // The Dashboard is the one screen the shell feeds props: it shares the
    // WhatsApp status poll with the header rather than starting a second one.
    if (activeView === "Dashboard") {
      return (
        <AdminV3Dashboard whatsapp={whatsapp} onRefreshWhatsApp={refreshWhatsApp} />
      );
    }

    if (activeView === "WhatsApp") {
      // Only the sub-screens v3 has built are in the map; the hub pushes the
      // rest (ApiUsage, Catalogue) to admin-v2 on its own. A miss here falls
      // through to the hub below rather than blanking the panel — and it does
      // so WITHOUT calling setWaScreen, because setting state during render is
      // how you get a render loop instead of a fallback.
      const Sub = waScreen ? V3_WA_SCREENS[waScreen] : undefined;
      if (Sub) return <Sub onBack={() => setWaScreen(null)} />;
      const Hub = V3_VIEWS.WhatsApp;
      return <Hub onOpenScreen={(s: AdminV3WhatsAppScreen) => {
        // Intercept only what v3 implements; anything else falls through to the
        // hub's own router.push into admin-v2.
        if (V3_WA_SCREENS[s]) setWaScreen(s);
        else router.push(`/admin-v2?view=WhatsApp&waScreen=${s}`);
      }} />;
    }

    const View = V3_VIEWS[activeView];
    return View ? <View /> : null;
  };

  const sidebar = (
    <AdminV3Sidebar
      activeView={activeView}
      onNavigate={handleNavigate}
      onOpenSearch={() => setSearchOpen(true)}
      onLogout={handleLogout}
    />
  );

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <AdminV3Search
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onGo={(entry) => {
          setDrawerOpen(false);
          // Settings entries carry their section/tab as ?sg/?ss — the screen
          // reads those at MOUNT, so they must be on the URL before the view
          // switches, exactly as useV3Navigate does it.
          if (entry.sg && typeof window !== "undefined") {
            const p = new URLSearchParams();
            p.set("sg", entry.sg);
            if (entry.ss) p.set("ss", entry.ss);
            window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
            // replaceState does NOT fire popstate, and AdminV3Settings only
            // re-reads the URL on mount or on that event — so searching for a
            // setting while already ON Settings would move the URL and leave
            // the screen where it was. This is the nudge that applies it.
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
          if (V3_OWNED_VIEWS.has(entry.view)) setActiveView(entry.view);
          else handleNavigate(entry.view, entry.view.toLowerCase());
        }}
      />
      {/*
        dvh, not vh — 100vh is the viewport with the mobile browser toolbar
        RETRACTED, so a 100vh shell is taller than what is actually on screen and
        the document scrolls past it, exposing white body beneath.
        --tv-bar-h is published at runtime by ManagingOutletBanner when a
        superadmin or Televery user is impersonating; without the subtraction the
        document is exactly one banner taller than the window. The 0px fallback
        is the normal, un-impersonated case.
      */}
      <div
        style={{ height: "calc(100dvh - var(--tv-bar-h, 0px))" }}
        className="flex overflow-hidden bg-white dark:bg-zinc-950"
      >
        {/* Desktop sidebar */}
        {/* The inner fixed-width div is what stops the nav reflowing while the
            column animates shut — collapsing the aside alone would squeeze the
            labels first. Same trick admin-v2 uses. */}
        <aside
          data-tour="sidebar"
          aria-hidden={!sidebarOpen}
          className={cn(
            "hidden shrink-0 overflow-hidden border-zinc-200 transition-[width] duration-300 ease-in-out lg:block dark:border-zinc-800",
            sidebarOpen ? "border-r lg:w-[260px]" : "lg:w-0",
          )}
        >
          {/* h-full matters: the sidebar sizes itself with `h-full` and its nav
              scrolls via `flex-1 overflow-y-auto`. Without a height here that
              percentage resolves against an auto-height parent and collapses to
              auto — the nav then grows past the aside, which is overflow-hidden,
              so the lower items and the Logout button are clipped AND unscrollable. */}
          <div className="h-full w-[260px]">{sidebar}</div>
        </aside>

        {/* Mobile drawer. The overlay and width are overridden off the shadcn
            defaults (bg-black/80, w-3/4 p-6) to match the design's scrim. */}
        <SheetContent
          side="left"
          className="w-[272px] border-r border-zinc-200 bg-zinc-50 p-0 dark:border-zinc-800 dark:bg-zinc-900"
          overlayClassName="bg-[#0B1220]/55"
        >
          {/* absolute inset-0, not h-full: SheetContent always renders an empty
              Title/Description for a11y whose margins would otherwise push the
              nav past the bottom of a phone screen. */}
          <div className="absolute inset-0 overflow-y-auto overscroll-contain">
            {sidebar}
          </div>
        </SheetContent>

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* One header at every width — it carries its own hamburger below lg.
              The separate mobile top bar it replaced cost a whole row of
              vertical space and fought this one for `sticky top-0`. */}
          <AdminV3Header
            title={activeView}
            subtitle={`${partner?.store_name || "Your store"} · ${format(new Date(), "EEEE, d MMM")}`}
            // Dashboard only: the plan is context for the day's overview, not a
            // banner to carry onto every screen.
            planLabel={
              activeView === "Dashboard" && gate.isGated ? gate.planName : null
            }
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onOpenDrawer={() => setDrawerOpen(true)}
            // POS only — the header renders no toggle without a handler.
            onToggleSidebar={
              activeView === "POS" ? () => setSidebarOpen((o) => !o) : undefined
            }
            sidebarOpen={sidebarOpen}
          />

          {/* From lg up this box owns the height left over under the header, and
              the dashboard divides it between its columns so the page itself does
              not scroll. Below lg it is auto-height and `main` scrolls as one
              ordinary page. SubscriptionGate renders a fragment (notice banner +
              children), so both land as flex children here. */}
          <div className="flex flex-col lg:min-h-0 lg:flex-1">
            <SubscriptionGate
              activeView={activeView}
              onNavigate={(view: string) => handleNavigate(view, view.toLowerCase())}
            >
              {renderView()}
            </SubscriptionGate>
          </div>
        </main>
      </div>
    </Sheet>
  );
}
