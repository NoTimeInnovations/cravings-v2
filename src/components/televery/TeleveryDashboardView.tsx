"use client";

import { useMemo } from "react";
import { Building2, ChevronRight, IndianRupee, Plus, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  inr,
  TeleveryEmptyState,
  TeleveryKpiCard,
  TeleveryViewLoading,
} from "./shared";
import type { TeleveryBusiness, TeleveryOverview } from "./types";

/** How many outlets the "Top businesses" list shows. */
const TOP_LIMIT = 5;

interface TeleveryDashboardViewProps {
  data: TeleveryOverview | null;
  loading: boolean;
  onAddRestaurant: () => void;
  onOpenBusiness: (business: TeleveryBusiness) => void;
}

export function TeleveryDashboardView({
  data,
  loading,
  onAddRestaurant,
  onOpenBusiness,
}: TeleveryDashboardViewProps) {
  const businesses = data?.businesses ?? [];

  // Derived here rather than served by the API: /api/televery/overview already
  // returns every outlet's order count, so ranking them client-side costs
  // nothing and keeps the dashboard on a single round-trip.
  const top = useMemo(
    () => [...businesses].sort((a, b) => b.orders - a.orders).slice(0, TOP_LIMIT),
    [businesses],
  );

  if (loading) return <TeleveryViewLoading />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            How the businesses on your marketplace are doing.
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <TeleveryKpiCard
          label="Connected businesses"
          value={String(data?.totals.businesses ?? 0)}
          icon={Building2}
        />
        {/* Orders Televery brought in, kept separate from the ones the shops got
            themselves. The combined figure is still shown, because a shop's own
            trade is not Televery's to claim — but it is not the headline.

            The split rests on every outlet answering on the brand's own WhatsApp
            number. If that stops being true the API says so and we show the plain
            totals instead of labelling orders "via Televery" on a rule that no longer
            holds — a number nobody can stand behind is worse than no number. */}
        {data?.channelSplitAttributable === false ? (
          <>
            <TeleveryKpiCard
              label="Total orders"
              value={String(data?.totals.orders ?? 0)}
              icon={ShoppingBag}
            />
            <TeleveryKpiCard
              label="Revenue"
              value={inr(data?.totals.revenue ?? 0)}
              icon={IndianRupee}
            />
          </>
        ) : (
          <>
            <TeleveryKpiCard
              label="Orders via Televery"
              value={String(data?.totals.whatsappOrders ?? 0)}
              icon={ShoppingBag}
            />
            <TeleveryKpiCard
              label="Revenue via Televery"
              value={inr(data?.totals.whatsappRevenue ?? 0)}
              icon={IndianRupee}
            />
            <TeleveryKpiCard
              label="Direct orders"
              value={String(data?.totals.directOrders ?? 0)}
              icon={Store}
            />
            <TeleveryKpiCard
              label="Direct revenue"
              value={inr(data?.totals.directRevenue ?? 0)}
              icon={IndianRupee}
            />
            <TeleveryKpiCard
              label="All orders"
              value={String(data?.totals.orders ?? 0)}
              icon={ShoppingBag}
            />
          </>
        )}
      </div>

      {data?.channelSplitAttributable === false && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          Order attribution is unavailable: your outlets no longer all share the
          Televery WhatsApp number, so we can&apos;t tell which orders came through
          you. Totals below are every order at each business.
        </p>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold tracking-tight">
            Top businesses by orders
          </h2>
          {top.length > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Top {top.length} of {businesses.length}
            </span>
          )}
        </div>

        {top.length === 0 ? (
          <TeleveryEmptyState
            icon={Store}
            title="No businesses connected yet"
            description="Add your first restaurant to start seeing orders here."
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
            {top.map((b, i) => (
              <button
                key={b.id}
                onClick={() => onOpenBusiness(b)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-100 text-xs font-bold text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                  {i + 1}
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
