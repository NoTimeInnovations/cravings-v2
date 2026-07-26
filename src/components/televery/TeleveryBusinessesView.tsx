"use client";

import { ChevronLeft, ChevronRight, Plus, ReceiptText, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  inr,
  statusBadgeClass,
  TeleveryEmptyState,
  TeleveryViewLoading,
} from "./shared";
import type { TeleveryBusiness, TeleveryOverview } from "./types";

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

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {selected.storeName || selected.username || "Unnamed business"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {outletOrders.total} order{outletOrders.total === 1 ? "" : "s"} ·{" "}
            {inr(selected.revenue)}
            {selected.location ? ` · ${selected.location}` : ""}
          </p>
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
                    <p className="truncate text-sm font-semibold">
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
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => onOpenBusiness(b)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
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
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums">
                    {b.orders}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                    orders
                  </span>
                </span>
                <span className="hidden w-24 shrink-0 text-right text-sm font-semibold tabular-nums sm:block">
                  {inr(b.revenue)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
