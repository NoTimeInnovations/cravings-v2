"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type Row = Record<string, unknown>;

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};
const isOnline = (s: unknown) => s === "online" || s === "idle";
const rName = (r: Row) => String(r.full_name ?? r.rider_name ?? r.name ?? "Rider");
const rId = (r: Row) => String(r.id ?? r.rider_id ?? rName(r));
const rLat = (r: Row) => num(r.last_lat ?? r.lat);
const rLng = (r: Row) => num(r.last_lng ?? r.lng);
const rStatus = (r: Row) => r.availability ?? r.status; // partner aliases availability

/**
 * Live availability view for delivery riders: online riders (with a recent
 * location) are plotted on a Mapbox map; everyone else is listed as offline.
 * Used by the Super Admin (all riders) and the partner panel (linked riders).
 */
export default function RiderAvailabilityMap({
  riders,
  center = [76.2673, 9.9312], // Kochi
}: {
  riders: Row[];
  center?: [number, number];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const online = riders.filter(
    (r) => isOnline(rStatus(r)) && rLat(r) != null && rLng(r) != null,
  );
  const offline = riders.filter((r) => !online.includes(r));

  // Init the map once.
  useEffect(() => {
    if (!mapboxgl.accessToken || !containerRef.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 11,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers whenever the online riders / their positions change.
  const onlineKey = JSON.stringify(online.map((r) => [rId(r), rLat(r), rLng(r)]));
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (!online.length) return;

    const bounds = new mapboxgl.LngLatBounds();
    online.forEach((r) => {
      const lng = rLng(r)!;
      const lat = rLat(r)!;
      const photo = r.photo_url as string | null;
      const el = document.createElement("div");
      el.style.cssText =
        "width:36px;height:36px;border-radius:50%;border:3px solid #16a34a;background:#fff;background-size:cover;background-position:center;box-shadow:0 1px 5px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-weight:700;color:#ea580c;font-size:14px;cursor:pointer;";
      if (photo) el.style.backgroundImage = `url("${photo}")`;
      else el.textContent = rName(r).charAt(0).toUpperCase();
      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(
        `<div style="font-size:12px;padding:2px 4px"><b>${rName(r)}</b><br/>${String(rStatus(r) ?? "online")}</div>`,
      );
      const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).setPopup(popup).addTo(map);
      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
    });
    if (online.length === 1) map.easeTo({ center: bounds.getCenter(), zoom: 13, duration: 600 });
    else map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineKey]);

  if (!mapboxgl.accessToken) {
    return <div className="text-sm text-red-600 p-3">NEXT_PUBLIC_MAPBOX_TOKEN is not configured.</div>;
  }

  return (
    <div className="grid md:grid-cols-[1fr_260px] gap-4">
      <div ref={containerRef} className="h-[440px] rounded-lg overflow-hidden border border-[#ffba79]/20" />
      <div className="bg-white rounded-lg border border-[#ffba79]/20 p-3 h-[440px] overflow-y-auto">
        <h4 className="font-semibold text-sm mb-2">
          Online <span className="text-green-600">({online.length})</span>
        </h4>
        {online.length ? (
          <div className="space-y-1.5 mb-4">
            {online.map((r) => (
              <div key={rId(r)} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="truncate">{rName(r)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mb-4">No riders online.</p>
        )}
        <h4 className="font-semibold text-sm mb-2">
          Offline <span className="text-gray-400">({offline.length})</span>
        </h4>
        {offline.length ? (
          <div className="space-y-1.5">
            {offline.map((r) => (
              <div key={rId(r)} className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <span className="truncate">{rName(r)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No offline riders.</p>
        )}
      </div>
    </div>
  );
}
