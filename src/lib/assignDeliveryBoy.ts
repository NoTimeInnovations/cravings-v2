"use client";

import { toast } from "sonner";

import {
  assignDeliveryBoyMutation,
  getActiveDeliveryBoysQuery,
} from "@/api/deliveryBoys";
import { Notification } from "@/app/actions/notification";
import { reportRiderToPetpooja } from "@/app/actions/petpoojaRider";
import { sendDeliveryStatusWebhook } from "@/app/actions/sendPartnerWebhook";
import { fetchFromHasura } from "@/lib/hasuraClient";
import type { Partner } from "@/store/authStore";
import type { Order } from "@/store/orderStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";

/**
 * Putting one of the partner's OWN riders on an order.
 *
 * Extracted from admin-v2's AssignDriverDialog so admin-v3's inline rider
 * dropdown runs the identical sequence. Assignment is not one mutation — it is
 * a mutation plus five notifications, each with its own failure rule — and a
 * second hand-written copy would drift the moment one of them changed.
 */

export interface DriverOption {
  id: string;
  name: string;
  phone: string;
  is_online: boolean;
}

/**
 * The partner's active riders, online first.
 *
 * Offline riders stay pickable rather than being filtered out: assignment
 * notifies them, and it reaches them when they next come online.
 */
export async function loadActiveDrivers(
  partnerId: string,
): Promise<DriverOption[]> {
  const res = await fetchFromHasura(getActiveDeliveryBoysQuery, {
    partner_id: partnerId,
  });
  return [...((res?.delivery_boys as DriverOption[]) || [])].sort(
    (a, b) => Number(b.is_online) - Number(a.is_online),
  );
}

/**
 * Assign `driver` to `order` and flip it to dispatched.
 *
 * Everything after the Hasura mutation is fire-and-forget by design: a
 * partner's own webhook, a push to the customer, a push to the rider and the
 * Petpooja report must never be able to undo an assignment their staff just
 * made. Returns false only when the assignment ITSELF failed.
 */
export async function assignDeliveryBoyToOrder(
  order: Order,
  driver: DriverOption,
  partner: Partner | null | undefined,
): Promise<boolean> {
  try {
    await fetchFromHasura(assignDeliveryBoyMutation, {
      order_id: order.id,
      delivery_boy_id: driver.id,
    });
  } catch (e) {
    console.error("[assign rider] mutation failed:", e);
    toast.error("Failed to dispatch order");
    return false;
  }

  // The partner's own webhook.
  try {
    void sendDeliveryStatusWebhook(order.id, "assigned", {
      name: driver.name ?? null,
      phone: driver.phone ?? null,
    });
  } catch {
    /* never block an assignment on a partner's endpoint */
  }

  const storeName =
    partner && "store_name" in partner ? partner.store_name : undefined;
  try {
    await Notification.user.sendOrderStatusNotification(
      order,
      "dispatched",
      storeName,
    );
  } catch (e) {
    console.error("Failed to notify customer:", e);
  }
  try {
    await Notification.deliveryBoy.sendAssignmentNotification(
      driver.id,
      order.id,
      order.display_id || order.id.slice(0, 8),
      order.deliveryAddress || "No address",
      partner?.id,
    );
  } catch (e) {
    console.error("Failed to notify driver:", e);
  }

  // Tell Petpooja who is carrying it — their POS only learns rider details for
  // its own self-delivery orders.
  try {
    void reportRiderToPetpooja({
      orderId: order.id,
      status: "assigned",
      riderName: driver.name,
      riderPhone: driver.phone,
    });
  } catch {
    /* their POS being unreachable must not fail the assignment */
  }

  // Reflect it locally so every open surface updates without a refetch.
  const { orders, setOrders } = useOrderSubscriptionStore.getState();
  setOrders(
    orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: "dispatched" as const,
            delivery_boy_id: driver.id,
            delivery_boy: { id: driver.id, name: driver.name, phone: driver.phone },
            assigned_at: new Date().toISOString(),
          }
        : o,
    ),
  );

  toast.success(`Dispatched with ${driver.name || "driver"}`);
  return true;
}
