"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface DeliveryMapProps {
  deliveryLng: number;
  deliveryLat: number;
  driverLng?: number | null;
  driverLat?: number | null;
  hotelLng?: number | null;
  hotelLat?: number | null;
  hotelBanner?: string | null;
  hotelName?: string | null;
  // Which endpoint the polyline connects the driver to.
  // "to_hotel" before pickup (rider heading to restaurant);
  // "to_destination" after pickup (rider heading to customer).
  routeMode?: "to_destination" | "to_hotel";
  /**
   * Partner-configured delivery radius in km. When set together with a
   * hotel point, the map draws a filled circle around the pickup so the
   * viewer can see the configured service area at a glance.
   */
  radiusKm?: number | null;
  onMapClick?: () => void;
}

const RADIUS_SOURCE = "radius";
const RADIUS_FILL_LAYER = "radius-fill";
const RADIUS_LINE_LAYER = "radius-line";

/**
 * Generate a circle polygon (GeoJSON) around `center` with the given
 * radius in kilometres. Uses an equirectangular projection — good enough
 * up to a few-km radius at any latitude outside the poles.
 */
function circlePolygon(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  points = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push([centerLng + distanceX * Math.cos(theta), centerLat + distanceY * Math.sin(theta)]);
  }
  coords.push(coords[0]!);
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

const ROUTE_SOURCE = "route";
const ROUTE_LAYER = "route-line";

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deliveryMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const hotelMarker = useRef<mapboxgl.Marker | null>(null);
  const animationFrame = useRef<number | null>(null);
  const currentDriverPos = useRef<{ lng: number; lat: number } | null>(null);
  const routeAbort = useRef<AbortController | null>(null);
  const routeModeRef = useRef(routeMode);

  useEffect(() => {
    routeModeRef.current = routeMode;
  }, [routeMode]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [deliveryLng, deliveryLat],
      zoom: 15,
      interactive: false,
      attributionControl: false,
    });

    // Delivery location marker (red)
    const deliveryEl = document.createElement("div");
    deliveryEl.innerHTML = `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#ef4444"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`;
    deliveryEl.style.cursor = "pointer";

    deliveryMarker.current = new mapboxgl.Marker({ element: deliveryEl })
      .setLngLat([deliveryLng, deliveryLat])
      .addTo(map.current);

    // Add route source and layer once map loads
    map.current.on("load", () => {
      if (!map.current) return;
      map.current.addSource(ROUTE_SOURCE, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.current.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#FF8220",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
      // Delivery-radius circle — empty polygon by default. The radius
      // effect below populates this with a real ring when both
      // `radiusKm` and a hotel point are present.
      map.current.addSource(RADIUS_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.current.addLayer(
        {
          id: RADIUS_FILL_LAYER,
          type: "fill",
          source: RADIUS_SOURCE,
          paint: { "fill-color": "#f97316", "fill-opacity": 0.08 },
        },
        ROUTE_LAYER,
      );
      map.current.addLayer(
        {
          id: RADIUS_LINE_LAYER,
          type: "line",
          source: RADIUS_SOURCE,
          paint: {
            "line-color": "#f97316",
            "line-width": 2,
            "line-opacity": 0.6,
            "line-dasharray": [3, 2],
          },
        },
        ROUTE_LAYER,
      );
    });

    map.current.on("click", () => onMapClick?.());

    return () => {
      map.current?.remove();
      map.current = null;
      // Reset all marker refs so the next mount (e.g. React strict-mode
      // double-invoke) re-creates them. Without this, the existing refs
      // point to orphaned markers detached from the removed map, and the
      // `if (!driverMarker.current)` guard below would skip re-creation.
      deliveryMarker.current = null;
      driverMarker.current = null;
      hotelMarker.current = null;
      currentDriverPos.current = null;
    };
  }, []);

  // Hotel marker — rounded image circle (or initial fallback). Re-renders
  // when coords or banner change.
  useEffect(() => {
    if (!map.current) return;
    if (hotelLng == null || hotelLat == null) {
      hotelMarker.current?.remove();
      hotelMarker.current = null;
      return;
    }

    const initial = (hotelName ?? "?").trim().charAt(0).toUpperCase() || "?";
    const inner = hotelBanner
      ? `<img src="${hotelBanner}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
      : `<span style="font-weight:700;color:#7c2d12;font-size:14px;">${initial}</span>`;
    const el = document.createElement("div");
    el.style.cssText = `
      width:36px;height:36px;border-radius:50%;
      background:#fff;border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      overflow:hidden;display:flex;align-items:center;justify-content:center;
      outline:2px solid #f97316;
    `;
    el.innerHTML = inner;

    hotelMarker.current?.remove();
    hotelMarker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([hotelLng, hotelLat])
      .addTo(map.current);

    fitBounds();
  }, [hotelLng, hotelLat, hotelBanner, hotelName]);

  // Smoothly animate driver marker to new position & update route
  useEffect(() => {
    if (!map.current) return;
    if (driverLng == null || driverLat == null) return;

    const targetPos = { lng: driverLng, lat: driverLat };

    // Create driver marker if it doesn't exist
    if (!driverMarker.current) {
      const driverEl = document.createElement("div");
      driverEl.innerHTML = `<div style="
        width: 40px; height: 40px;
        background: #FF8220;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        padding: 4px;
      "><svg viewBox="45 70 170 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="26" height="20"><path d="M78.1295 93.3647C78.1295 89.1933 81.5111 85.8118 85.6825 85.8118H108.341C112.513 85.8118 115.894 89.1933 115.894 93.3647C115.894 97.5361 112.513 100.918 108.341 100.918H85.6825C81.5111 100.918 78.1295 97.5361 78.1295 93.3647Z" fill="white"/><path d="M146.106 83.8663C146.106 80.0741 149.18 77 152.972 77H171.511C178.337 77 183.871 82.5335 183.871 89.3594C183.871 90.8762 182.641 92.1059 181.124 92.1059H153.659C149.488 92.1059 146.106 88.7243 146.106 84.5529V83.8663Z" fill="white"/><path d="M176.318 80.7765C180.489 80.7765 183.871 84.158 183.871 88.3294V114.765C183.871 118.936 180.489 122.318 176.318 122.318C172.146 122.318 168.765 118.936 168.765 114.765V88.3294C168.765 84.158 172.146 80.7765 176.318 80.7765Z" fill="white"/><path d="M180.689 109.274C184.233 112.129 184.793 117.315 181.938 120.86L152.579 157.318C149.962 160.567 145.208 161.079 141.959 158.463C138.71 155.847 138.197 151.092 140.813 147.843L171.034 110.316C173.413 107.362 177.735 106.896 180.689 109.274Z" fill="white"/><path d="M152.547 151.9C152.547 157.114 148.32 161.341 143.106 161.341L63.1705 161.341C58.9992 161.341 55.6176 157.96 55.6176 153.788C55.6176 149.617 58.9992 146.235 63.1705 146.235L146.882 146.235C150.011 146.235 152.547 148.771 152.547 151.9Z" fill="white"/><path d="M115.894 153.341C115.894 157.759 112.313 161.341 107.894 161.341L63.4707 161.341C59.0524 161.341 55.4707 157.759 55.4707 153.341L55.4707 129.212C55.4707 117.062 65.3204 107.212 77.4707 107.212L107.894 107.212C112.313 107.212 115.894 110.793 115.894 115.212L115.894 153.341Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M183.871 138.682C196.385 138.683 206.529 148.828 206.529 161.342C206.529 173.855 196.385 184 183.871 184C171.357 184 161.212 173.855 161.212 161.342C161.212 148.827 171.357 138.682 183.871 138.682ZM183.87 153.788C179.699 153.788 176.317 157.17 176.317 161.342C176.318 165.513 179.699 168.894 183.87 168.894C188.041 168.894 191.424 165.513 191.424 161.342C191.424 157.17 188.041 153.788 183.87 153.788Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M93.2358 138.682C105.75 138.683 115.894 148.828 115.894 161.342C115.894 173.855 105.75 184 93.2358 184C80.7218 184 70.5768 173.855 70.5766 161.342C70.5766 148.827 80.7216 138.682 93.2358 138.682ZM93.2348 153.788C89.0636 153.788 85.6821 157.17 85.6821 161.342C85.6823 165.513 89.0637 168.894 93.2348 168.894C97.406 168.894 100.788 165.513 100.789 161.342C100.789 157.17 97.4062 153.788 93.2348 153.788Z" fill="white"/></svg></div>`;

      driverMarker.current = new mapboxgl.Marker({ element: driverEl })
        .setLngLat([driverLng, driverLat])
        .addTo(map.current);
      currentDriverPos.current = { ...targetPos };
      fitBounds();
      fetchRoute(driverLng, driverLat);
      return;
    }

    // Animate from current to target position
    const startPos = currentDriverPos.current || { lng: driverLng, lat: driverLat };
    const startTime = performance.now();
    const duration = 1000; // 1 second smooth transition

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      const lng = startPos.lng + (targetPos.lng - startPos.lng) * ease;
      const lat = startPos.lat + (targetPos.lat - startPos.lat) * ease;

      driverMarker.current?.setLngLat([lng, lat]);

      if (t < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        currentDriverPos.current = { ...targetPos };
        animationFrame.current = null;
        fitBounds();
      }
    };

    animationFrame.current = requestAnimationFrame(animate);
    fetchRoute(driverLng, driverLat);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [driverLng, driverLat]);

  // When the route mode flips (e.g. order moves from food_ready → dispatched),
  // redraw the polyline against the new endpoint and reframe the camera on
  // the new active leg without waiting for the next driver tick.
  useEffect(() => {
    if (driverLng == null || driverLat == null) return;
    fetchRoute(driverLng, driverLat);
    fitBounds();
  }, [routeMode, hotelLng, hotelLat]);

  // Delivery-radius ring around the partner. Re-renders on hotel coord or
  // radius change. Hidden when either is missing.
  useEffect(() => {
    const apply = () => {
      const m = map.current;
      if (!m) return;
      const source = m.getSource(RADIUS_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      if (radiusKm == null || radiusKm <= 0 || hotelLng == null || hotelLat == null) {
        source.setData({ type: "FeatureCollection", features: [] });
        return;
      }
      source.setData(circlePolygon(hotelLng, hotelLat, radiusKm));
    };
    const m = map.current;
    if (!m) return;
    if (m.isStyleLoaded()) apply();
    else m.once("load", apply);
  }, [hotelLng, hotelLat, radiusKm]);

  async function fetchRoute(fromLng: number, fromLat: number) {
    if (!map.current) return;

    // Pick endpoint based on current route mode. Fall back to destination if
    // hotel coords are missing.
    let toLng = deliveryLng;
    let toLat = deliveryLat;
    if (routeModeRef.current === "to_hotel" && hotelLng != null && hotelLat != null) {
      toLng = hotelLng;
      toLat = hotelLat;
    }

    // Abort previous request
    routeAbort.current?.abort();
    const controller = new AbortController();
    routeAbort.current = controller;

    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      const coords = data.routes?.[0]?.geometry?.coordinates;
      if (!coords || !map.current) return;

      const source = map.current.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        });
      }
    } catch (e: any) {
      if (e.name !== "AbortError") console.error("Route fetch error:", e);
    }
  }

  function fitBounds() {
    if (!map.current) return;

    // Frame only the active leg so the rider stays visible. The inactive
    // marker (hotel pre-pickup → destination is hidden from fit;
    // post-pickup → hotel is hidden from fit) is still rendered, just may
    // sit outside the camera if it's far away.
    const bounds = new mapboxgl.LngLatBounds();
    const useHotelAsTarget =
      routeModeRef.current === "to_hotel" && hotelLng != null && hotelLat != null;
    const targetLng = useHotelAsTarget ? hotelLng! : deliveryLng;
    const targetLat = useHotelAsTarget ? hotelLat! : deliveryLat;

    if (driverLng != null && driverLat != null) {
      bounds.extend([driverLng, driverLat]);
      bounds.extend([targetLng, targetLat]);
    } else if (hotelLng != null && hotelLat != null) {
      // No rider yet — show destination + hotel so both reference points
      // are visible.
      bounds.extend([deliveryLng, deliveryLat]);
      bounds.extend([hotelLng, hotelLat]);
    } else {
      // Just the destination — leave the initial centered/zoomed view.
      return;
    }

    map.current.fitBounds(bounds, {
      padding: 60,
      maxZoom: 16,
      duration: 500,
    });
  }

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-md border border-gray-200 overflow-hidden"
      style={{ height: 250 }}
    />
  );
}
