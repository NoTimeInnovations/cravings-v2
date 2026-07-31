"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  ReceiptText,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { enterOutletSession } from "@/app/actions/televerySession";
import {
  inr,
  statusBadgeClass,
  TeleveryEmptyState,
  TeleveryViewLoading,
} from "./shared";
import type { TeleveryBusiness, TeleveryOverview } from "./types";

/**
 * "Manage" — swaps the session to the outlet and opens ITS /admin-v2 dashboard.
 * Separate from the row's drill-down (which stays a read-only order list), so
 * the destructive-capable action is always an explicit, deliberate click.
 */
function ManageOutletButton({
  busy,
  disabled,
  onManage,
  className = "",
}: {
  busy: boolean;
  disabled: boolean;
  onManage: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onManage}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30 ${className}`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <SlidersHorizontal className="h-3.5 w-3.5" />
      )}
      Manage
    </button>
  );
}

interface TeleveryBusinessesViewProps {
  data: TeleveryOverview | null;
  loading: boolean;
  /** Non-null while drilled into one business's orders. */
  selected: TeleveryBusiness | null;
  page: number;
  onOpenBusiness: (business: TeleveryBusiness) => void;
  onBack: () => void;
  onPageChange: (page: number) => void;
  onAddRestaurant: () => void;
}

export function TeleveryBusinessesView({
  data,
  loading,
  selected,
  page,
  onOpenBusiness,
  onBack,
  onPageChange,
  onAddRestaurant,
}: TeleveryBusinessesViewProps) {
  // Id of the outlet whose session swap is in flight; also disables the other
  // rows so two swaps can never race each other's cookie writes.
  const [managingId, setManagingId] = useState<string | null>(null);

  const handleManage = async (business: TeleveryBusiness) => {
    if (managingId) return;
    setManagingId(business.id);
    try {
      const res = await enterOutletSession(business.id);
      if (!res.ok) {
        // Membership failed (or the swap did) — surface it and stay put. Never
        // navigate on failure: /admin-v2 with a televery session just bounces.
        toast.error(res.error || "Could not open that dashboard.");
        setManagingId(null);
        return;
      }
      // HARD reload, not router.push: a full load re-runs AuthInitializer →
      // fetchUser so userData is the OUTLET's. A client nav would render
      // admin-v2 against Televery's stale in-memory userData.
      window.location.href = "/admin-v2";
      // Deliberately leave `managingId` set — the button stays in its loading
      // state until the browser tears this page down.
    } catch (err) {
      console.error("enterOutletSession failed:", err);
      toast.error("Could not open that dashboard.");
      setManagingId(null);
    }
  };

  if (loading) return <TeleveryViewLoading />;

  const outletOrders = data?.outletOrders ?? null;

  // Drill-down is an in-view state swap (same pattern as the analytics
  // PartnerOrders section) rather than a route — the dashboard is a single page
  // and the order list is always fetched fresh anyway.
  if (selected && outletOrders) {
    const totalPages = Math.ceil(outletOrders.total / outletOrders.pageSize);

    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          All businesses
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {selected.storeName || selected.username || "Unnamed business"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {selected.whatsappOrders} via us ({inr(selected.whatsappRevenue)}) ·{" "}
              {selected.directOrders} direct ({inr(selected.directRevenue)})
              {selected.location ? ` · ${selected.location}` : ""}
            </p>
          </div>
          <ManageOutletButton
            busy={managingId === selected.id}
            disabled={managingId !== null}
            onManage={() => handleManage(selected)}
            className="px-3 py-2 text-sm"
          />
        </div>

        <Card className="overflow-hidden">
          {outletOrders.orders.length === 0 ? (
            <TeleveryEmptyState
              icon={ReceiptText}
              title="No orders yet"
              description="Orders placed at this business will show up here."
            />
          ) : (
            <div className="divide-y divide-border">
              {outletOrders.orders.map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">
                      {/* Every row is labelled, including "Direct" — an unlabelled
                          row would be ambiguous between "came direct" and "we do
                          not know", and this is the number Televery bills on. */}
                      <span
                        className={
                          o.orderChannel === "whatsapp"
                            ? "shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                        }
                      >
                        {o.orderChannel === "whatsapp" ? "Via us" : "Direct"}
                      </span>
                      #{o.displayId ?? o.id.slice(0, 8)}
                      {o.customerName ? (
                        <span className="ml-2 font-normal text-muted-foreground">
                          {o.customerName}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {o.type ? ` · ${o.type.replace("_", " ")}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusBadgeClass(o.status)}`}
                  >
                    {o.status || "—"}
                  </span>
                  <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {inr(o.totalPrice || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  const businesses = data?.businesses ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Businesses</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {businesses.length} business{businesses.length === 1 ? "" : "es"}{" "}
            connected to your marketplace.
          </p>
        </div>
        <Button
          className="bg-orange-600 text-white hover:bg-orange-700"
          onClick={onAddRestaurant}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add restaurant
        </Button>
      </div>

      <Card className="overflow-hidden">
        {businesses.length === 0 ? (
          <TeleveryEmptyState
            icon={Store}
            title="No businesses connected yet"
            description="Find a restaurant on Google and we'll set up its menu and page."
            action={
              <Button
                className="bg-orange-600 text-white hover:bg-orange-700"
                onClick={onAddRestaurant}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add restaurant
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {/* Two actions per row: the row itself drills into the orders, the
                Manage button opens that outlet's real dashboard. They are
                siblings (not nested buttons, which is invalid HTML). */}
            {businesses.map((b) => (
              <div
                key={b.id}
                className="flex w-full items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:gap-3"
              >
                <button
                  onClick={() => onOpenBusiness(b)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                    <Store className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {b.storeName || b.username || "Unnamed business"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {b.location || b.username || "—"}
                    </span>
                  </span>
                  {/* Split, not just a total: what Televery brought this shop
                      vs what the shop brought itself. Both are shown even when
                      one is 0 — a column that disappears reads as missing data
                      rather than as a real zero. */}
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-green-600 dark:text-green-500">
                      {b.whatsappOrders}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                      via us
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">
                      {b.directOrders}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                      direct
                    </span>
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-sm font-semibold tabular-nums sm:block">
                    {inr(b.revenue)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </button>
                <ManageOutletButton
                  busy={managingId === b.id}
                  disabled={managingId !== null}
                  onManage={() => handleManage(b)}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
