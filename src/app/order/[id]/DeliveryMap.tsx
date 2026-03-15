"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface DeliveryMapProps {
  deliveryLng: number;
  deliveryLat: number;
  driverLng?: number | null;
  driverLat?: number | null;
  onMapClick?: () => void;
}

export default function DeliveryMap({
  deliveryLng,
  deliveryLat,
  driverLng,
  driverLat,
  onMapClick,
}: DeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deliveryMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const animationFrame = useRef<number | null>(null);
  const currentDriverPos = useRef<{ lng: number; lat: number } | null>(null);

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

    map.current.on("click", () => onMapClick?.());

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Smoothly animate driver marker to new position
  useEffect(() => {
    if (!map.current) return;
    if (driverLng == null || driverLat == null) return;

    const targetPos = { lng: driverLng, lat: driverLat };

    // Create driver marker if it doesn't exist
    if (!driverMarker.current) {
      const driverEl = document.createElement("div");
      driverEl.innerHTML = `<div style="
        width: 36px; height: 36px;
        background: #7c3aed;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; line-height: 1;
      ">🍔</div>`;

      driverMarker.current = new mapboxgl.Marker({ element: driverEl })
        .setLngLat([driverLng, driverLat])
        .addTo(map.current);
      currentDriverPos.current = { ...targetPos };
      fitBounds();
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

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [driverLng, driverLat]);

  function fitBounds() {
    if (!map.current) return;
    if (driverLng == null || driverLat == null) return;

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([deliveryLng, deliveryLat]);
    bounds.extend([driverLng, driverLat]);

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
