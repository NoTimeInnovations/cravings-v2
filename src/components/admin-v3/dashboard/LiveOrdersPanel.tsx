"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { StatusPill, V3Card } from "../ui/primitives";
import { LIVE_STATUSES, OrderCard, useOrderCardActions } from "./orderCardShared";

/**
 * The dashboard's live-order queue.
 *
 * The card itself and every action it can take live in ./orderCardShared, which
 * the "Pending orders" sheet renders too — so an order looks and behaves the
 * same wherever a partner reaches it.
 */
export function LiveOrdersPanel() {
  const { orders } = useOrderSubscriptionStore();
  const actions = useOrderCardActions();

  const liveOrders = React.useMemo(
    () =>
      orders
        .filter((o) => LIVE_STATUSES.has(o.status))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [orders],
  );

  return (
    <>
      <V3Card className="flex min-w-0 flex-[1_1_440px] flex-col overflow-hidden lg:h-full lg:flex-1">
        <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-zinc-100 px-[18px] py-4 dark:border-zinc-800">
          <span
            className={
              liveOrders.length > 0
                ? "h-2 w-2 shrink-0 animate-pulse-dot-fast rounded-full bg-red-600"
                : "h-2 w-2 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600"
            }
          />
          <h2 className="m-0 text-[15.5px] font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
            Live Orders
          </h2>
          <StatusPill tone="neutral" className="text-[11.5px]">
            {liveOrders.length}
          </StatusPill>
          <button
            type="button"
            onClick={() => actions.openOrder()}
            className="ml-auto flex items-center gap-1.5 text-[12.5px] font-bold leading-none text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
          >
            View all
            <ChevronRight size={13} strokeWidth={2.2} />
          </button>
        </div>

        {liveOrders.length === 0 ? (
          <div className="shrink-0 px-[18px] py-12 text-center">
            <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400">
              No live orders right now.
            </p>
            <p className="mt-1 text-[12.5px] text-zinc-400 dark:text-zinc-500">
              New orders appear here the moment they come in.
            </p>
          </div>
        ) : (
          <div className="grid content-start gap-3 p-3.5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {liveOrders.map((order) => (
              <OrderCard key={order.id} order={order} actions={actions} />
            ))}
          </div>
        )}
      </V3Card>

      {actions.dialogs}
    </>
  );
}
