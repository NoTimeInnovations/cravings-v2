"use client";

import React, { useEffect, useState } from "react";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import useOrderStore, { Order } from "@/store/orderStore";
import { useAdminStore } from "@/store/adminStore";
import { useAuthStore, Partner } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getActiveDeliveryBoysQuery } from "@/api/deliveryBoys";
import { CancelOrderDialog } from "@/components/CancelOrderDialog";
import { AssignDriverDialog } from "./AssignDriverDialog";
import { LiveOrderCard } from "./LiveOrderCard";

// Statuses that keep an order "live" on the dashboard. The card stays pinned at
// the top until the order is completed (or cancelled), at which point it drops
// out of this list.
const LIVE_STATUSES = new Set([
  "pending",
  "accepted",
  "food_ready",
  "dispatched",
  "in_transit",
]);

export function DashboardLiveOrders() {
  const { orders, setOrders } = useOrderSubscriptionStore();
  const { updateOrderStatus } = useOrderStore();
  const { setSelectedOrderId, setActiveView } = useAdminStore();
  const { userData } = useAuthStore();

  const currency = (userData as Partner)?.currency || "₹";
  const isPetpooja = !!(userData as Partner)?.petpooja_restaurant_id;

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const cancellingOrder = orders.find((o) => o.id === cancellingId) || null;

  // Order awaiting a driver pick before dispatch (own-driver flow).
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const assigningOrder = orders.find((o) => o.id === assigningId) || null;

  // Whether this partner has any of their own drivers registered. When they do,
  // dispatching opens the driver-picker popup instead of going out directly.
  const [hasOwnDrivers, setHasOwnDrivers] = useState(false);
  useEffect(() => {
    if (!userData?.id) return;
    fetchFromHasura(getActiveDeliveryBoysQuery, { partner_id: userData.id })
      .then((res) => setHasOwnDrivers((res?.delivery_boys?.length ?? 0) > 0))
      .catch(() => {});
  }, [userData?.id]);

  const liveOrders = orders
    .filter((o) => LIVE_STATUSES.has(o.status))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  // Nothing live → render nothing so the dashboard looks normal when idle.
  if (liveOrders.length === 0) return null;

  const openOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    setActiveView("Orders");
  };

  const advance = async (order: Order, nextStatus: string) => {
    // Dispatching a delivery order while the partner runs their own drivers →
    // open the driver-picker popup instead of dispatching directly.
    if (
      nextStatus === "dispatched" &&
      order.type === "delivery" &&
      hasOwnDrivers
    ) {
      setAssigningId(order.id);
      return;
    }

    try {
      await updateOrderStatus(orders, order.id, nextStatus as any, setOrders);
      toast.success(
        nextStatus === "completed"
          ? "Order completed"
          : "Order status updated",
      );
    } catch {
      toast.error("Failed to update order");
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          Live Orders
          <span className="text-sm font-normal text-muted-foreground">
            ({liveOrders.length})
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setActiveView("Orders")}
          className="text-sm font-medium text-orange-600 hover:underline"
        >
          View all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {liveOrders.map((order) => (
          <LiveOrderCard
            key={order.id}
            order={order}
            currency={currency}
            cancellable={order.status === "pending"}
            onView={() => openOrder(order)}
            onCancel={() => setCancellingId(order.id)}
            onAdvance={(nextStatus) => advance(order, nextStatus)}
          />
        ))}
      </div>

      {cancellingOrder && (
        <CancelOrderDialog
          open={!!cancellingId}
          onOpenChange={(o) => {
            if (!o) setCancellingId(null);
          }}
          orderId={cancellingOrder.id}
          orderShortId={
            cancellingOrder.display_id || cancellingOrder.id.slice(0, 8)
          }
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
    </div>
  );
}
