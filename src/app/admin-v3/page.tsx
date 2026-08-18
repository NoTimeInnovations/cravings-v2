"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAdminStore } from "@/store/adminStore";
import { Partner, useAuthStore } from "@/store/authStore";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { AdminV3Sidebar } from "@/components/admin-v3/AdminV3Sidebar";
import { AdminV3Header } from "@/components/admin-v3/AdminV3Header";
import { AdminV3Dashboard } from "@/components/admin-v3/AdminV3Dashboard";
import { useWhatsAppStatus } from "@/components/admin-v3/dashboard/useWhatsAppStatus";
import { SubscriptionGate } from "@/components/admin-v2/SubscriptionGate";
import { V3_OWNED_VIEWS, SETTINGS_DEEP_LINKS } from "@/components/admin-v3/navItems";

/**
 * /admin-v3 — the redesigned partner dashboard.
 *
 * SCOPE: only the sidebar and the Dashboard are built in v3. Every other
 * sidebar item deep-links back into admin-v2 as `?view=<title>`, which
 * admin-v2's layout is written to respect (it forwards a v3 partner to /admin-v3
 * only on a BARE visit, so these deep links do not bounce back). See the
 * isV3DeepLink note in src/app/admin-v2/layout.tsx.
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

  // v3 only renders the Dashboard. Landing here with a stale activeView from a
  // previous v2 session would otherwise leave the sidebar with nothing
  // highlighted.
  React.useEffect(() => {
    if (!V3_OWNED_VIEWS.has(useAdminStore.getState().activeView)) {
      setActiveView("Dashboard");
    }
  }, [setActiveView]);

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

  const sidebar = (
    <AdminV3Sidebar
      activeView={activeView}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      whatsappConnected={whatsapp?.connected}
    />
  );

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
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
        <aside
          data-tour="sidebar"
          className="hidden w-[260px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 lg:block"
        >
          {sidebar}
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
            planLabel={gate.isGated ? gate.planName : null}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onOpenDrawer={() => setDrawerOpen(true)}
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
              <AdminV3Dashboard
                whatsapp={whatsapp}
                onRefreshWhatsApp={refreshWhatsApp}
              />
            </SubscriptionGate>
          </div>
        </main>
      </div>
    </Sheet>
  );
}
