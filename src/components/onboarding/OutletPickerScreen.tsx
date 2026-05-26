"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MapPin, Phone, Send, Store, LocateFixed, Loader2 } from "lucide-react";
import { useLocationStore } from "@/store/geolocationStore";
import { DEFAULT_BRAND_COLOR_HEX } from "@/lib/brandColor";
import type { BranchContext, BranchOutlet } from "@/api/branches";

interface OutletPickerScreenProps {
  brand: BranchContext;
  onSelect: (outlet: BranchOutlet) => void;
  onBack?: () => void;
  accent?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const haversineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const outletCoords = (o: BranchOutlet): { lat: number; lng: number } | null => {
  const c = o.geo_location?.coordinates;
  if (!c || c.length < 2) return null;
  return { lng: c[0], lat: c[1] };
};

export default function OutletPickerScreen({
  brand,
  onSelect,
  onBack,
  accent = DEFAULT_BRAND_COLOR_HEX,
}: OutletPickerScreenProps) {
  const { coords: storedCoords, getLocation, isLoading: locating } = useLocationStore();
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    storedCoords,
  );
  const [areaInput, setAreaInput] = useState("");
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (storedCoords && !userCoords) setUserCoords(storedCoords);
  }, [storedCoords]);

  // Auto-request location on mount so the nearest outlet is pre-selected.
  useEffect(() => {
    if (userCoords) return;
    let cancelled = false;
    (async () => {
      const c = await getLocation();
      if (cancelled) return;
      if (c) setUserCoords(c);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedOutlets = useMemo(() => {
    const outlets = [...brand.outlets];
    if (!userCoords) {
      return outlets.sort((a, b) =>
        (a.store_name || "").localeCompare(b.store_name || ""),
      );
    }
    return outlets
      .map((o) => {
        const c = outletCoords(o);
        const km = c ? haversineKm(userCoords, c) : Number.POSITIVE_INFINITY;
        return { o, km };
      })
      .sort((a, b) => a.km - b.km)
      .map((x) => x.o);
  }, [brand.outlets, userCoords]);

  const distanceFor = (o: BranchOutlet): string | null => {
    if (!userCoords) return null;
    const c = outletCoords(o);
    if (!c) return null;
    const km = haversineKm(userCoords, c);
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
  };

  const handleUseMyLocation = async () => {
    setFindError(null);
    const c = await getLocation();
    if (c) setUserCoords(c);
    else setFindError("Could not get your location.");
  };

  const handleFind = async () => {
    const q = areaInput.trim();
    if (!q) return;
    if (!MAPBOX_TOKEN) {
      setFindError("Geocoding unavailable.");
      return;
    }
    setFinding(true);
    setFindError(null);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          q,
        )}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
      );
      const data = await res.json();
      const feat = data?.features?.[0];
      if (!feat?.center || feat.center.length < 2) {
        setFindError("No match for that address.");
        return;
      }
      const [lng, lat] = feat.center as [number, number];
      setUserCoords({ lat, lng });
    } catch {
      setFindError("Couldn't reach the geocoder.");
    } finally {
      setFinding(false);
    }
  };

  const handleContinue = () => {
    const target =
      sortedOutlets.find((o) => o.id === selectedId) || sortedOutlets[0];
    if (target) onSelect(target);
  };

  return (
    <div
      className="flex flex-col min-h-dvh bg-white mx-auto w-full md:max-w-md relative"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-3 px-4 py-3.5 lg:max-w-md lg:mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition active:opacity-60"
            >
              <ChevronLeft className="w-[18px] h-[18px] text-gray-900" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 pb-32">
        <div className="px-6 lg:max-w-md lg:mx-auto">
          {/* Brand header */}
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              {brand.name}
            </h2>
            {brand.tagline && (
              <p
                className="mt-1 text-xs font-semibold tracking-[0.18em] uppercase"
                style={{ color: accent }}
              >
                {brand.tagline}
              </p>
            )}
          </div>

          {/* Section heading */}
          <div className="mt-6 flex items-center gap-2">
            <Store className="w-5 h-5" style={{ color: accent }} />
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              Pick an outlet
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Choose where you'd like to pick up your order.
          </p>

          {/* Find nearest */}
          <div className="mt-5 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gray-500">
                Find nearest to me
              </p>
              <button
                onClick={handleUseMyLocation}
                disabled={locating}
                className="text-[11px] font-semibold flex items-center gap-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                {locating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5" />
                )}
                Use my location
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFind();
                }}
                placeholder="Type your area / address"
                className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <button
                onClick={handleFind}
                disabled={finding || !areaInput.trim()}
                className="h-10 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {finding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Find
              </button>
            </div>
            {findError && (
              <p className="mt-2 text-xs text-red-500">{findError}</p>
            )}
          </div>

          {/* Outlets */}
          <div className="mt-5 flex flex-col gap-3">
            {sortedOutlets.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No outlets available right now.
              </p>
            ) : (
              sortedOutlets.map((o) => {
                const isSelected =
                  selectedId === o.id || (!selectedId && o === sortedOutlets[0]);
                const dist = distanceFor(o);
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className={`w-full p-4 rounded-2xl bg-white flex items-start gap-3 text-left transition-all ${
                      isSelected
                        ? "border-[1.5px] shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                        : "border-[1.5px] border-gray-200 shadow-sm"
                    }`}
                    style={isSelected ? { borderColor: accent } : undefined}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? "" : "bg-gray-100"
                      }`}
                      style={
                        isSelected ? { backgroundColor: `${accent}15` } : undefined
                      }
                    >
                      <Store
                        className="w-5 h-5"
                        style={{ color: isSelected ? accent : "#111827" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900 truncate">
                        {o.store_tagline?.trim() || o.store_name}
                      </p>
                      {(o.location || o.location_details) && (
                        <p className="mt-1 text-sm text-gray-700 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-500" />
                          <span className="line-clamp-2">
                            {[o.location_details, o.location]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </p>
                      )}
                      {o.phone && (
                        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          {o.phone}
                        </p>
                      )}
                      {dist && (
                        <p
                          className="mt-1 text-[11px] font-semibold"
                          style={{ color: accent }}
                        >
                          {dist}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30">
        <div className="px-4 pt-3.5 pb-8 lg:max-w-md lg:mx-auto">
          <button
            onClick={handleContinue}
            disabled={sortedOutlets.length === 0}
            className="w-full h-[52px] rounded-[14px] text-white font-semibold text-base flex items-center justify-center transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            Continue to menu
          </button>
        </div>
      </div>
    </div>
  );
}
