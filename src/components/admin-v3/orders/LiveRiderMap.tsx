"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";

import { useLiveAgentLocation } from "@/hooks/useLiveAgentLocation";
import { cn } from "@/lib/utils";
import type { Partner } from "@/store/authStore";
import type { Order } from "@/store/orderStore";

/**
 * Where the partner's OWN rider is, right now, inside the Delivery card.
 *
 * Own riders only. A Porter/Rapido rider is tracked through that provider's own
 * link (the card's "Track rider" button) and never reports to our heartbeat hub;
 * a pool rider reports to the pool. This map is fed by the Menuthere delivery
 * app, so it can only ever show someone running it.
 *
 * Same data path as admin-v2's LiveRiderLocation — useLiveAgentLocation polling
 * the hub every 3s, seeded from the delivery_boys row so the marker is never
 * blank on first paint — and the same Mapbox component the customer's order page
 * uses. Only the chrome is v3's.
 */

// mapbox-gl needs window/document, so the map cannot be server-rendered.
const DeliveryMap = dynamic(() => import("@/app/order/[id]/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <Loader2 className="h-4 w-4 animate-spin text-zinc-400 dark:text-zinc-500" />
    </div>
  ),
});

/** "12s ago" / "4m ago" / "1h 20m ago". */
function ageLabel(sec: number): string {
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m ago`;
}

export function LiveRiderMap({
  order,
  partner,
}: {
  order: Order;
  partner: Partner | null | undefined;
}) {
  // Terminal orders stop polling: there is no "live" left to show, and a detail
  // screen left open would otherwise poll the hub every 3s indefinitely.
  const isActive =
    !!order.delivery_boy_id &&
    order.status !== "completed" &&
    order.status !== "cancelled";

  const boy = order.delivery_boy as
    | { current_lat?: number | null; current_lng?: number | null; location_updated_at?: string | null }
    | undefined;
  const seed =
    boy?.current_lat != null && boy?.current_lng != null
      ? {
          lat: boy.current_lat,
          lng: boy.current_lng,
          updatedAtMs: boy.location_updated_at
            ? new Date(boy.location_updated_at).getTime()
            : undefined,
        }
      : null;

  const live = useLiveAgentLocation({ orderId: order.id, paused: !isActive, seed });

  if (!isActive) return null;

  const dropLng = order.delivery_location?.coordinates?.[0] ?? null;
  const dropLat = order.delivery_location?.coordinates?.[1] ?? null;
  // Without a drop pin there is nothing to draw a route to, and a lone marker
  // floating on a map answers no question worth the space.
  if (dropLat == null || dropLng == null) return null;

  const hotelGeo = partner?.geo_location as
    | { coordinates?: [number, number] }
    | string
    | null
    | undefined;
  const hotelCoords =
    hotelGeo && typeof hotelGeo === "object" && Array.isArray(hotelGeo.coordinates)
      ? hotelGeo.coordinates
      : null;
  const radiusKm =
    (partner?.delivery_rules as { delivery_radius?: number } | null)?.delivery_radius ??
    null;

  // Before pickup the rider is heading to the RESTAURANT; after it, to the
  // customer. Drawing the wrong leg makes a rider on their way to collect look
  // like one going the wrong direction.
  const pickedUp =
    order.status === "dispatched" || order.status === "in_transit";

  return (
    <div className="border-t border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
      <div className="relative h-[190px] overflow-hidden rounded-[10px] border border-zinc-200 dark:border-zinc-800">
        <DeliveryMap
          deliveryLng={dropLng}
          deliveryLat={dropLat}
          driverLng={live?.lng ?? null}
          driverLat={live?.lat ?? null}
          hotelLng={hotelCoords?.[0] ?? null}
          hotelLat={hotelCoords?.[1] ?? null}
          hotelName={partner?.store_name ?? null}
          hotelBanner={partner?.store_banner ?? null}
          routeMode={pickedUp ? "to_destination" : "to_hotel"}
          radiusKm={radiusKm}
          onMapClick={() => {
            if (!live) return;
            window.open(
              `https://www.google.com/maps/dir/${live.lat},${live.lng}/${dropLat},${dropLng}`,
              "_blank",
              "noopener,noreferrer",
            );
          }}
        />

        {live ? (
          /* Live vs last-known is the whole point of the chip: a stale dot on a
             map looks exactly like a live one, and acting on a ten-minute-old
             position is worse than knowing you have none. */
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold leading-none text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200">
            <span className="relative flex h-2 w-2">
              {live.source === "live" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  live.source === "live" ? "bg-green-500" : "bg-amber-400",
                )}
              />
            </span>
            {live.source === "live" ? "Live" : "Last known"} · {ageLabel(live.ageSec)}
          </span>
        ) : (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold leading-none text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-400">
            <MapPin size={11} strokeWidth={2} />
            Waiting for the rider&rsquo;s app
          </span>
        )}
      </div>
    </div>
  );
}
