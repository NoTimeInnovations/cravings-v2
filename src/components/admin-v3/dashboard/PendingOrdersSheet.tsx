"use client";

import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { OrderCard, useOrderCardActions } from "./orderCardShared";

/**
 * The "Pending orders" sheet behind the header's overflow menu.
 *
 * v3's own, rather than admin-v2's <OrderNotification>. That one renders a
 * read-only OrderNotificationCard whose only action is to deep-link into the
 * Orders screen — so the same order looked different and could do less
 * depending on whether the partner tapped it on the dashboard or in here.
 * This renders the exact dashboard card, through the exact same actions hook,
 * so Accept / Mark Ready / Dispatch, Cancel and View details all work
 * identically in both places.
 *
 * Always controlled: it is opened from a DropdownMenuItem, and a SheetTrigger
 * nested in one does not survive the menu closing on click, so the parent owns
 * the open state.
 */
export function PendingOrdersSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { orders } = useOrderSubscriptionStore();
  // Navigating to the Orders screen must also close the sheet, or the partner
  // lands on admin-v2 with an orphaned overlay still open above it.
  const actions = useOrderCardActions({ onNavigateAway: () => onOpenChange(false) });

  const pendingOrders = React.useMemo(
    () => orders.filter((o) => o.status === "pending"),
    [orders],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[85vw] overflow-y-auto sm:max-w-md dark:border-zinc-800 dark:bg-zinc-900">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-zinc-950 dark:text-zinc-50">
              Pending Orders ({pendingOrders.length})
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-3">
            {pendingOrders.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400">
                  No pending orders
                </p>
              </div>
            ) : (
              pendingOrders.map((order) => (
                // forceExpanded: the one-line collapsed variant is a dashboard
                // space-saver for orders already out for delivery. Nothing in
                // this sheet is ever in that state, and a sheet has the room.
                <OrderCard
                  key={order.id}
                  order={order}
                  actions={actions}
                  forceExpanded
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {actions.dialogs}
    </>
  );
}
