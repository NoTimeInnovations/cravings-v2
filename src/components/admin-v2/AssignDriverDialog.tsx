"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getActiveDeliveryBoysQuery,
  assignDeliveryBoyMutation,
} from "@/api/deliveryBoys";
import { Partner, useAuthStore } from "@/store/authStore";
import useOrderStore, { Order } from "@/store/orderStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { Notification } from "@/app/actions/notification";
import { toast } from "sonner";
import { Bike, Check, Loader2, Phone } from "lucide-react";

interface DriverOption {
  id: string;
  name: string;
  phone: string;
  is_online: boolean;
}

/**
 * Popup to pick one of the partner's own registered drivers and dispatch the
 * order to them. Assigning runs the same mutation + notifications as the order
 * details screen and flips the order to "dispatched".
 */
export function AssignDriverDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}) {
  const { userData } = useAuthStore();
  const { orders, setOrders } = useOrderSubscriptionStore();
  const { updateOrderStatus } = useOrderStore();
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!open || !userData?.id) return;
    setLoading(true);
    setSelectedId("");
    fetchFromHasura(getActiveDeliveryBoysQuery, { partner_id: userData.id })
      // Online riders first so the selectable ones are at the top; offline ones
      // still show (with a marker) below and stay pickable — assignment notifies
      // them when they come back online.
      .then((res) =>
        setDrivers(
          [...(res?.delivery_boys || [])].sort(
            (a: DriverOption, b: DriverOption) =>
              Number(b.is_online) - Number(a.is_online),
          ),
        ),
      )
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, [open, userData?.id]);

  const orderNo = order
    ? Number(order.display_id) > 0
      ? `#${order.display_id}`
      : `#${order.id.slice(0, 6)}`
    : "";

  const handleDispatch = async () => {
    if (!order) return;
    if (!selectedId) {
      toast.error("Please select a driver");
      return;
    }
    setAssigning(true);
    try {
      await fetchFromHasura(assignDeliveryBoyMutation, {
        order_id: order.id,
        delivery_boy_id: selectedId,
      });

      const storeName =
        userData && "store_name" in userData
          ? (userData as Partner).store_name
          : undefined;
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
          selectedId,
          order.id,
          order.display_id || order.id.slice(0, 8),
          order.deliveryAddress || "No address",
          userData?.id,
        );
      } catch (e) {
        console.error("Failed to notify driver:", e);
      }

      const boy = drivers.find((d) => d.id === selectedId);
      setOrders(
        orders.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "dispatched" as const,
                delivery_boy_id: selectedId,
                delivery_boy: boy
                  ? { id: boy.id, name: boy.name, phone: boy.phone }
                  : o.delivery_boy,
                assigned_at: new Date().toISOString(),
              }
            : o,
        ),
      );

      toast.success(`Dispatched with ${boy?.name ?? "driver"}`);
      onOpenChange(false);
    } catch (e) {
      console.error("Error dispatching order:", e);
      toast.error("Failed to dispatch order");
    } finally {
      setAssigning(false);
    }
  };

  // Escape hatch: mark the order dispatched without assigning one of the
  // partner's own drivers (e.g. handed to a walk-in rider, or the partner
  // removed all their drivers after this screen loaded). Mirrors the plain
  // status-update path used when the partner has no own drivers.
  const handleDispatchWithoutDriver = async () => {
    if (!order) return;
    setAssigning(true);
    try {
      await updateOrderStatus(orders, order.id, "dispatched" as any, setOrders);
      toast.success("Order dispatched");
      onOpenChange(false);
    } catch (e) {
      console.error("Error dispatching order:", e);
      toast.error("Failed to dispatch order");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign a driver</DialogTitle>
          <DialogDescription>
            Pick one of your drivers to dispatch order {orderNo}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              No active drivers. Add one in the Delivery Boys section.
            </p>
            <Button
              variant="outline"
              onClick={handleDispatchWithoutDriver}
              disabled={assigning}
              className="w-full"
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Dispatch without a driver"
              )}
            </Button>
          </div>
        ) : (
          <div className="max-h-[300px] space-y-2 overflow-y-auto py-1">
            {drivers.map((d) => {
              const active = d.id === selectedId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      active
                        ? "bg-orange-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Bike className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 truncate text-sm font-semibold">
                      {d.name}
                      {!d.is_online && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Offline
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {d.phone}
                    </span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-orange-600" />}
                </button>
              );
            })}
          </div>
        )}

        {drivers.length > 0 && (
          <Button
            onClick={handleDispatch}
            disabled={assigning || !selectedId}
            className="w-full bg-[#c0392b] hover:bg-[#a83228]"
          >
            {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Dispatch"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
