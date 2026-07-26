"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuthStore } from "@/store/authStore";
import AddRestaurantPanel from "@/components/televery/AddRestaurantPanel";
import { TeleveryNavbar } from "@/components/televery/TeleveryNavbar";
import { TeleverySidebar } from "@/components/televery/TeleverySidebar";
import { TeleveryDashboardView } from "@/components/televery/TeleveryDashboardView";
import { TeleveryBusinessesView } from "@/components/televery/TeleveryBusinessesView";
import type {
  TeleveryBusiness,
  TeleveryOverview,
  TeleveryView,
} from "@/components/televery/types";

/**
 * Televery marketplace dashboard.
 *
 * Uses the same shell as the partner dashboard (/admin-v2): navbar, collapsible
 * desktop sidebar, mobile Sheet sidebar, scrolling main pane. The chrome
 * components are Televery's own (TeleveryNavbar/TeleverySidebar) because
 * admin-v2's are wired to a partner session — see the comments on those files.
 *
 * All data comes from GET /api/televery/overview, which returns the brand, the
 * totals, the connected businesses and — when `partnerId` is supplied — one page
 * of that business's orders. Because every response carries the full overview,
 * the drill-down and the list share a single piece of state.
 */
export default function TeleveryDashboardPage() {
  const signOut = useAuthStore((s) => s.signOut);

  const [activeView, setActiveView] = useState<TeleveryView>("Dashboard");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [data, setData] = useState<TeleveryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<TeleveryBusiness | null>(null);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  // `quiet` refreshes in place (navbar refresh button) instead of blanking the
  // view out to the loader.
  const load = useCallback(
    async (opts?: { partnerId?: string; page?: number; quiet?: boolean }) => {
      if (opts?.quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (opts?.partnerId) qs.set("partnerId", opts.partnerId);
        if (opts?.page) qs.set("page", String(opts.page));
        const res = await fetch(
          `/api/televery/overview${qs.toString() ? `?${qs}` : ""}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load");
        setData(json);
      } catch (err: any) {
        toast.error(err?.message || "Could not load the dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const openBusiness = (b: TeleveryBusiness) => {
    // Reachable from the dashboard's top-businesses list too, so land the user
    // on the section that owns the drill-down.
    setActiveView("Businesses");
    setSelected(b);
    setPage(0);
    load({ partnerId: b.id, page: 0 });
  };

  const backToList = () => {
    setSelected(null);
    setPage(0);
    load();
  };

  const goPage = (next: number) => {
    if (!selected) return;
    setPage(next);
    load({ partnerId: selected.id, page: next });
  };

  const handleNavigate = (view: TeleveryView) => {
    setActiveView(view);
    // Sections are always entered fresh, so "Businesses" lands on the list
    // rather than a drill-down left over from an earlier visit. No refetch is
    // needed — every overview response carries the full business list, so the
    // list is already current.
    setSelected(null);
    setPage(0);
  };

  const refresh = () =>
    selected
      ? load({ partnerId: selected.id, page, quiet: true })
      : load({ quiet: true });

  return (
    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
      <div className="h-screen flex flex-col bg-orange-50 dark:bg-background overflow-hidden">
        <TeleveryNavbar
          brandName={data?.brand?.name || "Televery"}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onRefresh={refresh}
          refreshing={refreshing}
          onSignOut={() => signOut()}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <aside
            className={`hidden lg:block border-r bg-background overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64" : "w-0 border-none"
              }`}
          >
            {/* h-full so the short nav list still pins Sign out to the bottom. */}
            <div className="w-64 h-full">
              <TeleverySidebar
                activeView={activeView}
                onNavigate={handleNavigate}
                onSignOut={() => signOut()}
              />
            </div>
          </aside>

          {/* Mobile Sidebar (Sheet) */}
          <SheetContent side="left" className="p-0 w-64">
            {/* Absolutely fill the full-height (fixed) SheetContent and scroll,
                so the nav stays reachable on short screens. */}
            <div className="absolute inset-0 py-4 overflow-y-auto overflow-x-hidden overscroll-contain flex flex-col">
              <div className="px-4 mb-4 flex items-center gap-2">
                <img
                  src="/menuthere-logo-new.png"
                  alt="Menuthere"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {data?.brand?.name || "Televery"}
                </span>
              </div>
              <TeleverySidebar
                className="flex-1 py-0"
                activeView={activeView}
                onNavigate={(view) => {
                  handleNavigate(view);
                  setIsMobileOpen(false);
                }}
                onSignOut={() => signOut()}
              />
            </div>
          </SheetContent>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            {activeView === "Dashboard" ? (
              <TeleveryDashboardView
                data={data}
                loading={loading}
                onAddRestaurant={() => setShowAdd(true)}
                onOpenBusiness={openBusiness}
              />
            ) : (
              <TeleveryBusinessesView
                data={data}
                loading={loading}
                selected={selected}
                page={page}
                onOpenBusiness={openBusiness}
                onBack={backToList}
                onPageChange={goPage}
                onAddRestaurant={() => setShowAdd(true)}
              />
            )}
          </main>
        </div>
      </div>

      {showAdd && (
        <AddRestaurantPanel
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load({ quiet: true });
          }}
        />
      )}
    </Sheet>
  );
}
