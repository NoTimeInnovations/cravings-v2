"use client";

import * as React from "react";
import { format } from "date-fns";
import { Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import useOrderStore, { type Order } from "@/store/orderStore";
import { useAdminStore } from "@/store/adminStore";
import { Partner, useAuthStore } from "@/store/authStore";
import { CancelOrderDialog } from "@/components/CancelOrderDialog";
import { AssignDriverDialog } from "@/components/admin-v2/AssignDriverDialog";
import { useHasOwnDrivers } from "@/hooks/useHasOwnDrivers";
import { shouldPickOwnDriverOnDispatch } from "@/lib/ownDriverDispatch";
import { AdminV3Button, StatusPill } from "../ui/primitives";
import { useV3Navigate } from "../useV3Navigate";

/**
 * The v3 order card, and the behaviour behind it, in ONE place.
 *
 * Both surfaces that show live orders — the dashboard's Live Orders panel and
 * the "Pending orders" sheet behind the header's overflow menu — render this
 * exact component through this exact hook. They used to be different components
 * with different capabilities (the sheet was read-only and just deep-linked to
 * admin-v2), which meant the same order looked and behaved differently
 * depending on where a partner happened to tap it.
 */

/** Statuses that keep an order "live". Same set admin-v2's DashboardLiveOrders uses. */
export const LIVE_STATUSES = new Set([
  "pending",
  "accepted",
  "food_ready",
  "dispatched",
  "in_transit",
]);

/** Statuses the design draws as a one-line row rather than an expanded card. */
export const COLLAPSED_STATUSES = new Set(["dispatched", "in_transit"]);

export const STATUS_LABEL: Record<string, { label: string; tone: "amber" | "green" | "blue" }> = {
  pending: { label: "New", tone: "amber" },
  accepted: { label: "Accepted", tone: "blue" },
  food_ready: { label: "Ready", tone: "green" },
  dispatched: { label: "Out for delivery", tone: "green" },
  in_transit: { label: "On the way", tone: "green" },
};

/** Copied from admin-v2's LiveOrderCard.nextStep — the workflow must not diverge. */
export function nextStep(order: Order): { status: string; label: string } | null {
  switch (order.status) {
    case "pending":
      return { status: "accepted", label: "Accept" };
    case "accepted":
      return { status: "food_ready", label: "Mark Ready" };
    case "food_ready":
      // Takeaway orders are typed "delivery" but carry no address — they skip
      // the dispatch step entirely.
      return order.type === "delivery" && order.deliveryAddress
        ? { status: "dispatched", label: "Dispatch" }
        : { status: "completed", label: "Complete" };
    case "dispatched":
    case "in_transit":
      return { status: "completed", label: "Complete" };
    default:
      return null;
  }
}

export function typeLabel(order: Order): string {
  if (order.type === "delivery") return order.deliveryAddress ? "Delivery" : "Takeaway";
  if (order.type === "table_order") return "Dine-in";
  return order.type || "Order";
}

export function orderNumber(order: Order): string {
  return Number(order.display_id) > 0
    ? `#${order.display_id}`
    : `#${order.id.slice(0, 6)}`;
}

export function locationOf(order: Order): string {
  return (
    order.tableName ||
    (order.tableNumber ? `Table ${order.tableNumber}` : "") ||
    order.deliveryAddress ||
    order.user?.full_name ||
    "Online"
  );
}

/**
 * Every action an order card can take, plus the two dialogs they can open.
 *
 * Returns `dialogs` as an element the caller must render once — the cancel and
 * assign-driver dialogs are shared per surface, not per card.
 */
export function useOrderCardActions({ onNavigateAway }: { onNavigateAway?: () => void } = {}) {
  const { orders, setOrders } = useOrderSubscriptionStore();
  const { updateOrderStatus } = useOrderStore();
  const { setSelectedOrderId, setActiveView } = useAdminStore();
  const { userData } = useAuthStore();
  const navigate = useV3Navigate();

  const currency = (userData as Partner)?.currency || "₹";
  const isPetpooja = !!(userData as Partner)?.petpooja_restaurant_id;

  // A SET, not a single id: one order being updated must not swallow clicks on
  // every other card. A busy kitchen advances several in quick succession.
  const [advancing, setAdvancing] = React.useState<Set<string>>(new Set());

  // Whether this partner runs their own riders. When they do, "Dispatch" opens
  // the driver picker instead of dispatching straight out — skipping it would
  // silently send orders out unassigned for exactly the partners who care most.
  const hasOwnDrivers = useHasOwnDrivers();
  const [assigningId, setAssigningId] = React.useState<string | null>(null);
  const assigningOrder = orders.find((o) => o.id === assigningId) || null;

  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const cancellingOrder = orders.find((o) => o.id === cancellingId) || null;

  // Orders is a v3 screen now, so this stays in the shell — it used to push to
  // /admin-v2, which threw the partner out of v3 to reach a screen v3 has.
  // selectedOrderId is set first: adminStore has no persist, and the Orders
  // screen reads it to open the order that was clicked rather than the list.
  const openOrder = React.useCallback(
    (order?: Order) => {
      if (order) setSelectedOrderId(order.id);
      onNavigateAway?.();
      navigate("Orders");
    },
    [navigate, setSelectedOrderId, onNavigateAway],
  );

  const advance = React.useCallback(
    async (order: Order, next: string) => {
      if (advancing.has(order.id)) return;

      if (
        next === "dispatched" &&
        shouldPickOwnDriverOnDispatch(order, userData as Partner, hasOwnDrivers)
      ) {
        setAssigningId(order.id);
        return;
      }

      setAdvancing((prev) => new Set(prev).add(order.id));
      try {
        // `as any`: orderStore types this parameter as a narrow three-value
        // union that predates the accepted/food_ready/dispatched statuses it is
        // actually called with. admin-v2 casts here for the same reason.
        await updateOrderStatus(orders, order.id, next as any, setOrders);
        toast.success(next === "completed" ? "Order completed" : "Order status updated");
      } catch (e) {
        console.error("[V3 order] advance failed:", e);
        toast.error("Couldn't update the order");
      } finally {
        setAdvancing((prev) => {
          const nextSet = new Set(prev);
          nextSet.delete(order.id);
          return nextSet;
        });
      }
    },
    [advancing, hasOwnDrivers, orders, setOrders, updateOrderStatus, userData],
  );

  const dialogs = (
    <>
      {cancellingOrder && (
        <CancelOrderDialog
          open={!!cancellingId}
          onOpenChange={(o) => {
            if (!o) setCancellingId(null);
          }}
          orderId={cancellingOrder.id}
          orderShortId={cancellingOrder.display_id || cancellingOrder.id.slice(0, 8)}
          isPetpooja={isPetpooja}
        />
      )}
      <AssignDriverDialog
        open={!!assigningId}
        onOpenChange={(o) => {
          if (!o) setAssigningId(null);
        }}
        order={assigningOrder}
      />
    </>
  );

  return {
    orders,
    currency,
    advancing,
    openOrder,
    advance,
    requestCancel: setCancellingId,
    dialogs,
  };
}

export type OrderCardActions = ReturnType<typeof useOrderCardActions>;

/**
 * One live order. `collapsed` renders the design's single-line variant used for
 * orders already out for delivery; everything else gets the full card.
 */
export function OrderCard({
  order,
  actions,
  forceExpanded = false,
}: {
  order: Order;
  actions: OrderCardActions;
  /** The pending-orders sheet always wants the full card, never the one-liner. */
  forceExpanded?: boolean;
}) {
  const { currency, advancing, openOrder, advance, requestCancel } = actions;
  const status = STATUS_LABEL[order.status];
  const next = nextStep(order);
  const busy = advancing.has(order.id);
  const collapsed = !forceExpanded && COLLAPSED_STATUSES.has(order.status);

  if (collapsed) {
    return (
      <div className="col-span-full flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-zinc-200 px-3.5 py-3 dark:border-zinc-800">
        <span className="text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
          {orderNumber(order)}
        </span>
        {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
        <span
          translate="no"
          className="notranslate min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-600 dark:text-zinc-300"
        >
          {order.items.map((i) => i.name).join(", ") || locationOf(order)}
        </span>
        <span className="text-[13.5px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
          {currency}
          {order.totalPrice}
        </span>
        <AdminV3Button variant="small" onClick={() => openOrder(order)}>
          Track
        </AdminV3Button>
      </div>
    );
  }

  return (
    /* shrink-0 is load-bearing, not cosmetic. These cards are flex items in a
       height-constrained column, and `overflow-hidden` waives the automatic
       minimum size that would normally stop a flex item shrinking below its
       content. Without shrink-0 the whole queue squeezes to fit, every card
       clips to its header, and the items and action buttons silently vanish. */
    <div className="shrink-0 overflow-hidden rounded-[10px] border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
        <span className="text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
          {orderNumber(order)}
        </span>
        {/* No pill for a pending order: "New" said nothing the Accept button
            below does not already say, and it was the extra element pushing the
            header onto a second line. The pill still renders for every LATER
            status, where it is the only thing telling you where the order is. */}
        {status && order.status !== "pending" && (
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        )}
        <StatusPill tone="outline">{typeLabel(order)}</StatusPill>
        {/* Time and total travel together. As separate flex children the total
            was the first thing to wrap once these cards became grid cells, so
            every card grew a stray third line holding nothing but the price. */}
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold leading-none text-zinc-500 dark:text-zinc-400">
            <Clock size={12} strokeWidth={1.9} />
            {format(new Date(order.createdAt), "hh:mm a")}
          </span>
          <span className="whitespace-nowrap text-[13.5px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            {currency}
            {order.totalPrice}
          </span>
        </span>
      </div>

      <div className="px-3 pb-3 pt-2.5">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium leading-none text-zinc-500 dark:text-zinc-400">
          <MapPin size={14} strokeWidth={1.8} className="shrink-0" />
          <span translate="no" className="notranslate truncate">
            {locationOf(order)}
          </span>
        </div>

        {/* translate="no": Google Translate rewrites every text node it is
            allowed to, and a dish name rendered in another language cannot be
            matched against the menu or the kitchen ticket. The surrounding UI
            labels still translate. */}
        <div translate="no" className="notranslate flex flex-col gap-1">
          {order.items.slice(0, 4).map((item, i) => (
            <div
              key={i}
              className="flex gap-2 text-[13px] leading-snug text-zinc-950 dark:text-zinc-50"
            >
              <span className="shrink-0 font-bold text-zinc-400 dark:text-zinc-500">
                {item.quantity}×
              </span>
              <span className="truncate font-medium">{item.name}</span>
            </div>
          ))}
          {order.items.length > 4 && (
            <div className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
              +{order.items.length - 4} more
            </div>
          )}
        </div>

        {/* Compact so View details / Cancel / Accept still share ONE row in a
            ~260px grid cell — at the default 38px height they wrapped, which is
            what made every card a row taller than it needed to be. */}
        <div className="mt-3 flex flex-nowrap items-center gap-1.5">
          <AdminV3Button
            variant="secondary"
            className="h-9 shrink-0 px-2.5 text-[12.5px]"
            onClick={() => openOrder(order)}
          >
            Details
          </AdminV3Button>
          {/* Same rule as admin-v2: an order can only be cancelled while it is
              still pending — once the kitchen has accepted it, cancelling is an
              Orders-screen decision. */}
          {order.status === "pending" && (
            <AdminV3Button
              variant="danger"
              className="h-9 min-w-0 flex-1 px-2 text-[12.5px]"
              onClick={() => requestCancel(order.id)}
            >
              Cancel
            </AdminV3Button>
          )}
          {next && (
            <AdminV3Button
              variant="primary"
              className="h-9 min-w-0 flex-1 px-2 text-[12.5px]"
              disabled={busy}
              onClick={() => advance(order, next.status)}
            >
              {busy ? "Working…" : next.label}
            </AdminV3Button>
          )}
        </div>
      </div>
    </div>
  );
}
