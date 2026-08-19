"use client";

import * as React from "react";
import { BarChart3, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  customerDeliveryChargeOf,
  poolFeeOf,
  poolKmOf,
  poolOccurredAt,
  poolOrdersForRider,
  poolStatsByRider,
  poolTotals,
  unassignedCount,
  type DateRange,
  type Period,
  type PoolOrder,
  type PoolRiderStats,
  type Scope,
} from "@/lib/deliveryPoolStats";
import { V3Card } from "../ui/primitives";
import {
  EmptyBlock,
  FigureButton,
  GridHead,
  Segmented,
  str,
} from "./shared";

/**
 * Rider performance — the HISTORICAL half of the Delivery Pool screen.
 *
 * Every figure comes from `src/lib/deliveryPoolStats`, exactly as admin-v2's
 * panel does: `poolStatsByRider` for the rows, `poolTotals` for the summary
 * line, `poolOrdersForRider` for the breakdown and `unassignedCount` for the
 * orders that never found a rider. Nothing is re-derived here, so a rider's
 * figures can never disagree between the two dashboards.
 *
 * The rows come from OUR orders table (`getPoolStatsOrdersQuery`), not the pool
 * API — the pool's /orders endpoint only returns live jobs. The parent owns that
 * read, because it also owns the period the read has to cover.
 */

const PERIOD_OPTIONS: { value: Period; label: React.ReactNode }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

const SCOPE_OPTIONS: { value: Scope; label: React.ReactNode }[] = [
  { value: "completed", label: "Delivered" },
  { value: "all", label: "Incl. in progress" },
];

/** Rider · orders · order value · charged to customer · distance. */
const GRID =
  "grid grid-cols-[minmax(200px,1.6fr)_90px_140px_180px_110px] items-center";

/** Order · when · pool state · value · charged · paid to pool · distance. */
const BD_GRID =
  "grid grid-cols-[minmax(150px,1.3fr)_120px_minmax(110px,1fr)_100px_100px_110px_100px] items-center";

const DATE_INPUT =
  "bg-transparent text-[12.5px] font-medium leading-none text-zinc-950 outline-none [color-scheme:light] dark:text-zinc-50 dark:[color-scheme:dark]";

export function PoolPerformance({
  statsOrders,
  statsLoading,
  period,
  onPeriodChange,
  scope,
  onScopeChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  range,
  money,
}: {
  statsOrders: PoolOrder[];
  statsLoading: boolean;
  period: Period;
  onPeriodChange: (p: Period) => void;
  scope: Scope;
  onScopeChange: (s: Scope) => void;
  customFrom: string;
  onCustomFromChange: (v: string) => void;
  customTo: string;
  onCustomToChange: (v: string) => void;
  range: DateRange;
  money: (n: number) => string;
}) {
  const [breakdownFor, setBreakdownFor] = React.useState<PoolRiderStats | null>(
    null,
  );

  const riderStats = React.useMemo(
    () => poolStatsByRider(statsOrders, range, scope),
    [statsOrders, range, scope],
  );
  const poolOverall = React.useMemo(() => poolTotals(riderStats), [riderStats]);
  const unassigned = React.useMemo(
    () => unassignedCount(statsOrders, range),
    [statsOrders, range],
  );

  return (
    <>
      {/* Toolbar — period, scope, and the totals the rows below add up to. */}
      <div className="flex flex-wrap items-center gap-2.5 px-3 lg:px-0">
        <Segmented
          ariaLabel="Period"
          value={period}
          options={PERIOD_OPTIONS}
          onChange={onPeriodChange}
        />
        {period === "custom" && (
          <div className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 dark:border-zinc-700 dark:bg-zinc-800">
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className={DATE_INPUT}
              aria-label="From date"
            />
            <span className="text-zinc-400 dark:text-zinc-500">→</span>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => onCustomToChange(e.target.value)}
              className={DATE_INPUT}
              aria-label="To date"
            />
          </div>
        )}
        <Segmented
          ariaLabel="Which orders count"
          value={scope}
          options={SCOPE_OPTIONS}
          onChange={onScopeChange}
        />
        <div className="ml-auto text-[12.5px] font-normal leading-none text-zinc-500 dark:text-zinc-400">
          {statsLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              Loading…
            </span>
          ) : (
            <>
              <span className="font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                {poolOverall.orders}
              </span>{" "}
              orders ·{" "}
              <span className="font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                {money(poolOverall.value)}
              </span>{" "}
              ·{" "}
              <span className="font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                {poolOverall.km} km
              </span>
            </>
          )}
        </div>
      </div>

      {/* overflow-hidden: the first painted child in the populated branch is
          GridHead's grey strip, which would otherwise fill the card's rounded
          top corners square from lg up. */}
      <V3Card className="overflow-hidden">
        {statsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={22}
              className="animate-spin text-zinc-400 dark:text-zinc-500"
            />
          </div>
        ) : !riderStats.length ? (
          <EmptyBlock
            icon={<BarChart3 size={19} strokeWidth={1.7} />}
            title="No pool deliveries in this period"
            body="Nothing here yet — no pool delivery with an assigned rider fell inside this window."
          />
        ) : (
          <>
            {/* Table — scrolls inside itself, never the page. */}
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <GridHead
                  grid={GRID}
                  cols={[
                    { label: "Rider" },
                    { label: "Orders", right: true },
                    { label: "Order value", right: true },
                    { label: "Charged to customer", right: true },
                    { label: "Distance", right: true },
                  ]}
                />
                {riderStats.map((st) => (
                  <div
                    key={st.phone ?? st.rider}
                    className={`${GRID} border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50`}
                  >
                    <div className="min-w-0 px-4 py-3">
                      <div
                        translate="no"
                        className="notranslate truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                      >
                        {st.rider}
                      </div>
                      {st.phone && (
                        <div
                          translate="no"
                          className="notranslate mt-1 truncate text-xs font-normal leading-none text-zinc-400 tabular-nums dark:text-zinc-500"
                        >
                          {st.phone}
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3 text-right text-[13px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                      {st.orders}
                    </div>
                    <div className="px-4 py-3 text-right text-[13px] font-medium leading-none tabular-nums">
                      <FigureButton onClick={() => setBreakdownFor(st)}>
                        {money(st.value)}
                      </FigureButton>
                    </div>
                    <div className="px-4 py-3 text-right text-[13px] font-medium leading-none tabular-nums">
                      <FigureButton onClick={() => setBreakdownFor(st)}>
                        {money(st.deliveryCharge)}
                      </FigureButton>
                    </div>
                    <div className="px-4 py-3 text-right text-[13px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                      {st.km} km
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stated in the open rather than in a tooltip: someone may pay
                riders on these numbers. */}
            <div className="bg-zinc-50 px-4 py-3 lg:rounded-b-xl dark:bg-zinc-800/60">
              <p className="text-xs font-normal leading-[1.55] text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Charged to customer
                </span>{" "}
                is the delivery fee on the bill and is already part of Order
                value. Open a rider&apos;s figure to see the orders behind it,
                including what each delivery cost you in pool fees.
                <br />
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Distance
                </span>{" "}
                is the real delivered distance from the pool service, not a
                straight-line estimate — but it is only as good as the customer
                location on the order, so an implausibly long trip usually means a
                bad saved address rather than a long ride.
                {unassigned > 0 && (
                  <>
                    {" "}
                    <span className="text-amber-600 dark:text-amber-500">
                      {unassigned} pool {unassigned === 1 ? "order" : "orders"} in
                      this period never got a rider, so they appear in no row
                      above.
                    </span>
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </V3Card>

      {/* Order-by-order breakdown for one pool rider. Uses poolOrdersForRider,
          which applies the SAME period/scope predicates as the totals — a
          breakdown that did not add up to the figure it explains would be worse
          than none. */}
      <Dialog
        open={!!breakdownFor}
        onOpenChange={(open) => !open && setBreakdownFor(null)}
      >
        <DialogContent className="overflow-y-auto sm:max-h-[85vh] sm:max-w-3xl dark:border-zinc-800 dark:bg-zinc-900">
          {breakdownFor &&
            (() => {
              const key = breakdownFor.phone ?? breakdownFor.rider;
              const rows = poolOrdersForRider(statsOrders, key, range, scope);
              const label = (() => {
                const d = (x: Date) =>
                  x.toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                  });
                if (period === "day") return "today";
                if (period === "week") return "the last 7 days";
                if (period === "month") return "the last 30 days";
                return d(range.from) === d(range.to)
                  ? d(range.from)
                  : `${d(range.from)} – ${d(range.to)}`;
              })();
              return (
                <>
                  <DialogHeader>
                    <DialogTitle translate="no" className="notranslate">
                      {breakdownFor.rider}
                    </DialogTitle>
                    <DialogDescription>
                      {rows.length}{" "}
                      {rows.length === 1 ? "delivery" : "deliveries"} in {label}
                      {scope === "completed"
                        ? " (delivered only)"
                        : " (including in progress)"}
                      {" — "}
                      {money(breakdownFor.value)} order value,{" "}
                      {money(breakdownFor.poolFee)} paid to pool.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="min-w-[820px]">
                      <GridHead
                        grid={BD_GRID}
                        cols={[
                          { label: "Order" },
                          { label: "When" },
                          { label: "Pool state" },
                          { label: "Order value", right: true },
                          { label: "Charged", right: true },
                          { label: "Paid to pool", right: true },
                          { label: "Distance", right: true },
                        ]}
                      />
                      {rows.map((od: PoolOrder) => (
                        <div
                          key={od.id}
                          className={`${BD_GRID} border-t border-zinc-100 dark:border-zinc-800`}
                        >
                          <div className="min-w-0 px-4 py-2.5">
                            <div className="text-[13px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                              {Number(od.display_id) > 0
                                ? `#${od.display_id}`
                                : "—"}
                            </div>
                            {od.delivery_address && (
                              <div
                                translate="no"
                                className="notranslate mt-1 truncate text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500"
                              >
                                {od.delivery_address}
                              </div>
                            )}
                          </div>
                          <div className="whitespace-nowrap px-4 py-2.5 text-[12.5px] font-normal leading-none text-zinc-700 dark:text-zinc-300">
                            {poolOccurredAt(od).toLocaleString(undefined, {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {!od.delivered_at && (
                              <span
                                className="ml-1 text-amber-600 dark:text-amber-500"
                                title="No delivery time recorded — dated by when the order was placed."
                              >
                                *
                              </span>
                            )}
                          </div>
                          <div className="truncate px-4 py-2.5 text-[12.5px] font-normal capitalize leading-none text-zinc-500 dark:text-zinc-400">
                            {str(od.delivery_provider_state).replace(/_/g, " ")}
                          </div>
                          <div className="px-4 py-2.5 text-right text-[12.5px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                            {money(Number(od.total_price) || 0)}
                          </div>
                          <div className="px-4 py-2.5 text-right text-[12.5px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                            {money(customerDeliveryChargeOf(od))}
                          </div>
                          <div className="px-4 py-2.5 text-right text-[12.5px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                            {money(poolFeeOf(od))}
                          </div>
                          <div className="px-4 py-2.5 text-right text-[12.5px] font-normal leading-none text-zinc-700 tabular-nums dark:text-zinc-300">
                            {poolKmOf(od)} km
                          </div>
                        </div>
                      ))}
                      <div
                        className={`${BD_GRID} border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60`}
                      >
                        <div className="col-span-3 px-4 py-2.5 text-[12.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                          Total
                        </div>
                        <div className="px-4 py-2.5 text-right text-[12.5px] font-semibold leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                          {money(breakdownFor.value)}
                        </div>
                        <div className="px-4 py-2.5 text-right text-[12.5px] font-semibold leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                          {money(breakdownFor.deliveryCharge)}
                        </div>
                        <div className="px-4 py-2.5 text-right text-[12.5px] font-semibold leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                          {money(breakdownFor.poolFee)}
                        </div>
                        <div className="px-4 py-2.5 text-right text-[12.5px] font-semibold leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                          {breakdownFor.km} km
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
                    Distance comes from the pool service and is the real delivered
                    distance. Rows marked{" "}
                    <span className="text-amber-600 dark:text-amber-500">*</span>{" "}
                    have no recorded delivery time and are dated by when the order
                    was placed.
                  </p>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
