"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  Polygon,
  OverlayView,
  useJsApiLoader,
} from "@react-google-maps/api";

interface DeliveryMapProps {
  deliveryLng: number;
  deliveryLat: number;
  driverLng?: number | null;
  driverLat?: number | null;
  hotelLng?: number | null;
  hotelLat?: number | null;
  hotelBanner?: string | null;
  hotelName?: string | null;
  /**
   * Which endpoint the polyline connects the driver to.
   * `to_hotel` before pickup (rider heading to restaurant);
   * `to_destination` after pickup (rider heading to customer).
   */
  routeMode?: "to_destination" | "to_hotel";
  /**
   * Partner-configured delivery radius in km. When set together with a
   * hotel point, the map draws a filled circle around the pickup so the
   * viewer can see the configured service area at a glance.
   */
  radiusKm?: number | null;
  onMapClick?: () => void;
}

const MAP_LIBRARIES: ("places" | "geometry" | "drawing")[] = ["geometry"];

const DEFAULT_CENTER = { lat: 0, lng: 0 };

/**
 * Equirectangular circle polygon — good enough at any radius outside the
 * poles. Mirrors the old mapbox implementation so the radius ring looks the
 * same on both implementations during the rollout.
 */
function circlePolygon(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  points = 64,
): google.maps.LatLngLiteral[] {
  const coords: google.maps.LatLngLiteral[] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push({
      lat: centerLat + distanceY * Math.sin(theta),
      lng: centerLng + distanceX * Math.cos(theta),
    });
  }
  return coords;
}

/**
 * Animated driver position. We DO NOT pass driverLat/Lng directly into the
 * Marker — instead a rAF loop tweens from the previous reported position to
 * the new one, so the rider doesn't snap on each heartbeat tick.
 */
function useAnimatedPosition(
  targetLat: number | null | undefined,
  targetLng: number | null | undefined,
  durationMs = 1000,
): google.maps.LatLngLiteral | null {
  const [pos, setPos] = useState<google.maps.LatLngLiteral | null>(null);
  const fromRef = useRef<google.maps.LatLngLiteral | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetLat == null || targetLng == null) {
      setPos(null);
      fromRef.current = null;
      return;
    }
    const to = { lat: targetLat, lng: targetLng };
    const from = fromRef.current ?? to;
    fromRef.current = to;
    if (from.lat === to.lat && from.lng === to.lng) {
      setPos(to);
      return;
    }
    const start = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setPos({
        lat: from.lat + (to.lat - from.lat) * ease,
        lng: from.lng + (to.lng - from.lng) * ease,
      });
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [targetLat, targetLng, durationMs]);

  return pos;
}

/**
 * Fetch a driving polyline via Google's Directions REST endpoint. We use the
 * REST API (with NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) rather than the JS
 * DirectionsService so we get a small JSON payload and can abort on each new
 * driver heartbeat. Returns decoded path coords.
 */
function useDirections(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number } | null,
): google.maps.LatLngLiteral[] | null {
  const [path, setPath] = useState<google.maps.LatLngLiteral[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!from || !to) {
      setPath(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!key) return;
    const origin = `${from.lat},${from.lng}`;
    const destination = `${to.lat},${to.lng}`;
    fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${key}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((d) => {
        const overview = d?.routes?.[0]?.overview_polyline?.points as
          | string
          | undefined;
        if (!overview) {
          setPath([from, to]); // fall back to straight line
          return;
        }
        // Decode using the official geometry library if it's loaded;
        // straight-line fallback if not.
        const decoded = (window as any).google?.maps?.geometry?.encoding
          ?.decodePath?.(overview)
          ?.map((latLng: google.maps.LatLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
        setPath(decoded?.length ? decoded : [from, to]);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.warn("Directions fetch failed:", e?.message ?? e);
          setPath([from, to]);
        }
      });
    return () => controller.abort();
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  return path;
}

export default function DeliveryMap({
  deliveryLng,
  deliveryLat,
  driverLng,
  driverLat,
  hotelLng,
  hotelLat,
  hotelBanner,
  hotelName,
  routeMode = "to_destination",
  radiusKm,
  onMapClick,
}: DeliveryMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const animatedDriver = useAnimatedPosition(driverLat, driverLng);

  // Determine route endpoints based on mode.
  const routeTarget = useMemo(() => {
    if (routeMode === "to_hotel" && hotelLat != null && hotelLng != null) {
      return { lat: hotelLat, lng: hotelLng };
    }
    return { lat: deliveryLat, lng: deliveryLng };
  }, [routeMode, hotelLat, hotelLng, deliveryLat, deliveryLng]);

  // Always compute directions from the LATEST reported driver position (not
  // the tweened position) so the polyline doesn't lag the marker.
  const driverFrom = useMemo(() => {
    if (driverLat == null || driverLng == null) return null;
    return { lat: driverLat, lng: driverLng };
  }, [driverLat, driverLng]);
  const path = useDirections(driverFrom, routeTarget);

  // Fit bounds to whichever leg is active.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const bounds = new google.maps.LatLngBounds();
    if (driverFrom) {
      bounds.extend(driverFrom);
      bounds.extend(routeTarget);
    } else if (hotelLat != null && hotelLng != null) {
      bounds.extend({ lat: deliveryLat, lng: deliveryLng });
      bounds.extend({ lat: hotelLat, lng: hotelLng });
    } else {
      // Just the destination
      m.panTo({ lat: deliveryLat, lng: deliveryLng });
      return;
    }
    m.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [driverFrom, routeTarget, deliveryLat, deliveryLng, hotelLat, hotelLng]);

  const radiusPath = useMemo(() => {
    if (radiusKm == null || radiusKm <= 0 || hotelLng == null || hotelLat == null) {
      return null;
    }
    return circlePolygon(hotelLng, hotelLat, radiusKm);
  }, [radiusKm, hotelLng, hotelLat]);

  if (!isLoaded) {
    return (
      <div
        className="w-full rounded-md border border-gray-200 overflow-hidden bg-gray-50 animate-pulse"
        style={{ height: 250 }}
      />
    );
  }

  return (
    <div
      className="w-full rounded-md border border-gray-200 overflow-hidden"
      style={{ height: 250 }}
    >
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={DEFAULT_CENTER}
        zoom={15}
        onLoad={(m) => {
          mapRef.current = m;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
        onClick={() => onMapClick?.()}
        options={{
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "none",
          zoomControl: false,
          keyboardShortcuts: false,
        }}
      >
        {/* Customer drop pin (red) */}
        <Marker
          position={{ lat: deliveryLat, lng: deliveryLng }}
          icon={{
            path: "M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0zM14 8 a6 6 0 1 0 0 12 a6 6 0 1 0 0 -12 z",
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 1,
            anchor: new google.maps.Point(14, 36),
          }}
        />

        {/* Hotel marker — circular avatar with banner image or initial */}
        {hotelLng != null && hotelLat != null && (
          <OverlayView
            position={{ lat: hotelLat, lng: hotelLng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(width, height) => ({
              x: -width / 2,
              y: -height / 2,
            })}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#fff",
                border: "3px solid #fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                outline: "2px solid #f97316",
              }}
            >
              {hotelBanner ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={hotelBanner}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontWeight: 700, color: "#7c2d12", fontSize: 14 }}>
                  {((hotelName ?? "?").trim().charAt(0) || "?").toUpperCase()}
                </span>
              )}
            </div>
          </OverlayView>
        )}

        {/* Driver marker — circular scooter pin */}
        {animatedDriver && (
          <OverlayView
            position={animatedDriver}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(width, height) => ({
              x: -width / 2,
              y: -height / 2,
            })}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: "#FF8220",
                border: "3px solid white",
                borderRadius: "50%",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
              }}
            >
              <svg
                viewBox="45 70 170 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="20"
              >
                <path
                  d="M78.1295 93.3647C78.1295 89.1933 81.5111 85.8118 85.6825 85.8118H108.341C112.513 85.8118 115.894 89.1933 115.894 93.3647C115.894 97.5361 112.513 100.918 108.341 100.918H85.6825C81.5111 100.918 78.1295 97.5361 78.1295 93.3647Z"
                  fill="white"
                />
                <path
                  d="M146.106 83.8663C146.106 80.0741 149.18 77 152.972 77H171.511C178.337 77 183.871 82.5335 183.871 89.3594C183.871 90.8762 182.641 92.1059 181.124 92.1059H153.659C149.488 92.1059 146.106 88.7243 146.106 84.5529V83.8663Z"
                  fill="white"
                />
                <path
                  d="M176.318 80.7765C180.489 80.7765 183.871 84.158 183.871 88.3294V114.765C183.871 118.936 180.489 122.318 176.318 122.318C172.146 122.318 168.765 118.936 168.765 114.765V88.3294C168.765 84.158 172.146 80.7765 176.318 80.7765Z"
                  fill="white"
                />
                <path
                  d="M180.689 109.274C184.233 112.129 184.793 117.315 181.938 120.86L152.579 157.318C149.962 160.567 145.208 161.079 141.959 158.463C138.71 155.847 138.197 151.092 140.813 147.843L171.034 110.316C173.413 107.362 177.735 106.896 180.689 109.274Z"
                  fill="white"
                />
                <path
                  d="M152.547 151.9C152.547 157.114 148.32 161.341 143.106 161.341L63.1705 161.341C58.9992 161.341 55.6176 157.96 55.6176 153.788C55.6176 149.617 58.9992 146.235 63.1705 146.235L146.882 146.235C150.011 146.235 152.547 148.771 152.547 151.9Z"
                  fill="white"
                />
                <path
                  d="M115.894 153.341C115.894 157.759 112.313 161.341 107.894 161.341L63.4707 161.341C59.0524 161.341 55.4707 157.759 55.4707 153.341L55.4707 129.212C55.4707 117.062 65.3204 107.212 77.4707 107.212L107.894 107.212C112.313 107.212 115.894 110.793 115.894 115.212L115.894 153.341Z"
                  fill="white"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M183.871 138.682C196.385 138.683 206.529 148.828 206.529 161.342C206.529 173.855 196.385 184 183.871 184C171.357 184 161.212 173.855 161.212 161.342C161.212 148.827 171.357 138.682 183.871 138.682ZM183.87 153.788C179.699 153.788 176.317 157.17 176.317 161.342C176.318 165.513 179.699 168.894 183.87 168.894C188.041 168.894 191.424 165.513 191.424 161.342C191.424 157.17 188.041 153.788 183.87 153.788Z"
                  fill="white"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M93.2358 138.682C105.75 138.683 115.894 148.828 115.894 161.342C115.894 173.855 105.75 184 93.2358 184C80.7218 184 70.5768 173.855 70.5766 161.342C70.5766 148.827 80.7216 138.682 93.2358 138.682ZM93.2348 153.788C89.0636 153.788 85.6821 157.17 85.6821 161.342C85.6823 165.513 89.0637 168.894 93.2348 168.894C97.406 168.894 100.788 165.513 100.789 161.342C100.789 157.17 97.4062 153.788 93.2348 153.788Z"
                  fill="white"
                />
              </svg>
            </div>
          </OverlayView>
        )}

        {/* Driver → target polyline (driving directions when key allows,
            straight-line fallback otherwise) */}
        {path && path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: "#FF8220",
              strokeOpacity: 0.85,
              strokeWeight: 4,
              clickable: false,
            }}
          />
        )}

        {/* Delivery-radius ring */}
        {radiusPath && (
          <Polygon
            paths={radiusPath}
            options={{
              fillColor: "#f97316",
              fillOpacity: 0.08,
              strokeColor: "#f97316",
              strokeOpacity: 0.6,
              strokeWeight: 2,
              clickable: false,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
