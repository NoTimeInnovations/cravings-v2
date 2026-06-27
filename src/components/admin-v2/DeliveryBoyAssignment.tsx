"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getActiveDeliveryBoysQuery,
  assignDeliveryBoyMutation,
} from "@/api/deliveryBoys";
import { Partner, useAuthStore } from "@/store/authStore";
import { Order } from "@/store/orderStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { toast } from "sonner";
import { Copy, Loader2, MapPin, Phone, Truck } from "lucide-react";
import { Notification } from "@/app/actions/notification";
import { useLiveAgentLocation } from "@/hooks/useLiveAgentLocation";

// Mapbox-based live tracker — reused from the customer order page. Lazy-loaded
// (ssr: false) because mapbox-gl needs window/document.
const DeliveryMap = dynamic(() => import("@/app/order/[id]/DeliveryMap"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-md bg-muted" />,
});

interface DeliveryBoyOption {
  id: string;
  name: string;
  phone: string;
}

interface DeliveryBoyAssignmentProps {
  order: Order;
}

export function DeliveryBoyAssignment({ order }: DeliveryBoyAssignmentProps) {
  const { userData } = useAuthStore();
  const { orders, setOrders } = useOrderSubscriptionStore();
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoyOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    if (userData?.id) {
      fetchDeliveryBoys();
    }
  }, [userData?.id]);

  const fetchDeliveryBoys = async () => {
    try {
      const response = await fetchFromHasura(getActiveDeliveryBoysQuery, {
        partner_id: userData?.id,
      });
      if (response.delivery_boys) {
        setDeliveryBoys(response.delivery_boys);
      }
    } catch (error) {
      console.error("Error fetching delivery boys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = async (address: string, label: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleCopyPickup = () => {
    const partner = userData as Partner;
    const pickupAddress = [partner?.location, partner?.location_details]
      .map((v) => (v || "").trim())
      .filter(Boolean)
      .join(", ");
    if (!pickupAddress) {
      toast.error(
        "No restaurant address set. Add one in Settings → General → Address & Coordinates",
      );
      return;
    }
    handleCopyAddress(pickupAddress, "Pickup address");
  };

  const deliveryActions = (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full min-w-0"
        onClick={() =>
          handleCopyAddress(order.deliveryAddress || "", "Drop address")
        }
      >
        <Copy className="h-3.5 w-3.5 mr-1.5 shrink-0" />
        <span className="truncate">Copy Drop</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full min-w-0"
        onClick={handleCopyPickup}
      >
        <Copy className="h-3.5 w-3.5 mr-1.5 shrink-0" />
        <span className="truncate">Copy Pickup</span>
      </Button>
    </div>
  );

  const handleAssign = async () => {
    if (!selectedId) {
      toast.error("Please select a delivery boy");
      return;
    }

    setIsAssigning(true);
    try {
      await fetchFromHasura(assignDeliveryBoyMutation, {
        order_id: order.id,
        delivery_boy_id: selectedId,
      });

      // Send notification to customer
      try {
        const storeName =
          userData && "store_name" in userData
            ? userData.store_name
            : undefined;
        await Notification.user.sendOrderStatusNotification(
          order,
          "dispatched",
          storeName,
        );
      } catch (e) {
        console.error("Failed to send customer notification:", e);
      }

      // Send notification to delivery boy via OneSignal
      try {
        await Notification.deliveryBoy.sendAssignmentNotification(
          selectedId,
          order.id,
          order.display_id || order.id.slice(0, 8),
          order.deliveryAddress || "No address",
          userData?.id,
        );
      } catch (e) {
        console.error("Failed to send delivery boy notification:", e);
      }

      // Update local order state
      const assignedBoy = deliveryBoys.find((b) => b.id === selectedId);
      const updatedOrders = orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: "dispatched" as const,
              delivery_boy_id: selectedId,
              delivery_boy: assignedBoy
                ? {
                    id: assignedBoy.id,
                    name: assignedBoy.name,
                    phone: assignedBoy.phone,
                  }
                : o.delivery_boy,
              assigned_at: new Date().toISOString(),
            }
          : o,
      );
      setOrders(updatedOrders);

      toast.success("Delivery boy assigned successfully");
      setIsReassigning(false);
      setSelectedId("");
    } catch (error) {
      console.error("Error assigning delivery boy:", error);
      toast.error("Failed to assign delivery boy");
    } finally {
      setIsAssigning(false);
    }
  };

  // Already assigned - show delivery boy info with reassign option
  if (order.delivery_boy_id && order.delivery_boy) {
    return (
      <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-900/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-purple-900 dark:text-purple-300">
              Delivery Boy Assigned
            </h3>
          </div>
          {order.status !== "completed" && order.status !== "cancelled" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsReassigning(!isReassigning)}
            >
              {isReassigning ? "Cancel" : "Reassign"}
            </Button>
          )}
        </div>
        <div className="text-sm space-y-1">
          <p className="font-medium">{order.delivery_boy.name}</p>
          <a
            href={`tel:${order.delivery_boy.phone}`}
            className="flex items-center gap-1.5 text-blue-600 hover:underline"
          >
            <Phone className="h-3.5 w-3.5" />
            {order.delivery_boy.phone}
          </a>
        </div>
        <LiveRiderLocation order={order} />
        <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
          {deliveryActions}
        </div>
        {isReassigning && (
          <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
            <p className="text-xs text-muted-foreground mb-2">
              Select a new delivery boy:
            </p>
            {isLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : deliveryBoys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active delivery boys available.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select delivery boy" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryBoys
                      .filter((boy) => boy.id !== order.delivery_boy_id)
                      .map((boy) => (
                        <SelectItem key={boy.id} value={boy.id}>
                          {boy.name} ({boy.phone})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={isAssigning || !selectedId}
                  size="sm"
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Assign"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Assignment UI
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-4 w-4" />
        <h3 className="font-semibold">Assign Delivery Boy</h3>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : deliveryBoys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active delivery boys. Add one in the Delivery Boys section.
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select delivery boy" />
            </SelectTrigger>
            <SelectContent>
              {deliveryBoys.map((boy) => (
                <SelectItem key={boy.id} value={boy.id}>
                  {boy.name} ({boy.phone})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssign}
            disabled={isAssigning || !selectedId}
            size="sm"
          >
            {isAssigning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Assign"
            )}
          </Button>
        </div>
      )}
      <div className="mt-3 pt-3 border-t">{deliveryActions}</div>
    </div>
  );
}

/**
 * Live map + position indicator for the assigned rider (our own Menuthere
 * delivery-app riders — NOT the delivery pool). Polls the heartbeat hub every
 * 3 s via useLiveAgentLocation; falls back to the delivery_boys row from the
 * order itself when the hub is empty. Renders an embedded map (rider → drop,
 * with the restaurant + delivery radius) plus a compact "Live · Xs ago" line.
 * Hides itself entirely on terminal orders.
 */
function LiveRiderLocation({ order }: { order: Order }) {
  const { userData } = useAuthStore();
  const partner = userData as Partner | null;

  const isActive =
    !!order.delivery_boy_id &&
    order.status !== "completed" &&
    order.status !== "cancelled";
  const seed =
    order.delivery_boy?.current_lat != null &&
    order.delivery_boy?.current_lng != null
      ? {
          lat: order.delivery_boy.current_lat,
          lng: order.delivery_boy.current_lng,
          updatedAtMs: order.delivery_boy.location_updated_at
            ? new Date(order.delivery_boy.location_updated_at).getTime()
            : undefined,
        }
      : null;
  const live = useLiveAgentLocation({
    orderId: order.id,
    paused: !isActive,
    seed,
  });

  if (!isActive) return null;

  // Drop (customer) + restaurant coordinates for the map.
  const dropLng = order.delivery_location?.coordinates?.[0] ?? null;
  const dropLat = order.delivery_location?.coordinates?.[1] ?? null;
  const hotelGeo = partner?.geo_location as any;
  const hotelCoords =
    hotelGeo && typeof hotelGeo === "object" && Array.isArray(hotelGeo.coordinates)
      ? (hotelGeo.coordinates as [number, number])
      : null;
  const hotelLng = hotelCoords?.[0] ?? null;
  const hotelLat = hotelCoords?.[1] ?? null;
  const radiusKm = (partner?.delivery_rules as any)?.delivery_radius ?? null;

  const ageLabel = live
    ? live.ageSec < 60
      ? `${live.ageSec}s ago`
      : live.ageSec < 3600
        ? `${Math.floor(live.ageSec / 60)}m ago`
        : `${Math.floor(live.ageSec / 3600)}h ${Math.floor((live.ageSec % 3600) / 60)}m ago`
    : null;

  return (
    <div className="mt-3 space-y-2">
      {/* Embedded live map — shown once we know where to drop. The rider marker
          appears as soon as the app reports a location. */}
      {dropLat != null && dropLng != null && (
        <div className="relative h-56 overflow-hidden rounded-md border">
          <DeliveryMap
            deliveryLng={dropLng}
            deliveryLat={dropLat}
            driverLng={live?.lng ?? null}
            driverLat={live?.lat ?? null}
            hotelLng={hotelLng}
            hotelLat={hotelLat}
            hotelName={partner?.store_name ?? null}
            hotelBanner={partner?.store_banner ?? null}
            routeMode="to_destination"
            radiusKm={radiusKm}
            onMapClick={() => {
              if (!live) return;
              window.open(
                `https://www.google.com/maps/dir/${live.lat},${live.lng}/${dropLat},${dropLng}`,
                "_blank",
              );
            }}
          />
          {live ? (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] shadow">
              <span className="relative flex h-2 w-2">
                {live.source === "live" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${live.source === "live" ? "bg-green-500" : "bg-amber-400"}`}
                />
              </span>
              <span className="font-medium text-gray-800">
                {live.source === "live" ? "Live" : "Last seen"} · {ageLabel}
              </span>
            </div>
          ) : (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] text-gray-600 shadow">
              Waiting for rider location…
            </div>
          )}
        </div>
      )}

      {/* Compact text line — precise coords + open-in-Maps link. */}
      {live && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-white/60 dark:bg-purple-900/30 px-2.5 py-1.5 text-xs">
          <div className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-purple-600" />
            <span className="truncate font-mono text-muted-foreground">
              {live.lat.toFixed(5)}, {live.lng.toFixed(5)}
            </span>
          </div>
          <a
            href={`https://www.google.com/maps?q=${live.lat},${live.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 text-blue-600 hover:underline"
          >
            <MapPin className="h-3 w-3" />
            Open
          </a>
        </div>
      )}
    </div>
  );
}
