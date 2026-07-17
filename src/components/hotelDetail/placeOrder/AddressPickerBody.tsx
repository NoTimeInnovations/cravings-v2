"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { trackMaps } from "@/lib/mapsUsage";
import { MapPin, Search, LocateFixed, Loader2, Home, Building2, Navigation, Trash2, ChevronDown, Plus, Clock } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";
import type { SavedAddress } from "./AddressManagementModal";
import { getRecentSearches, saveRecentSearch, removeRecentSearch, type RecentSearch } from "@/lib/recentSearches";
import { extractPlaceName, stripPlusCode, isPlusCode } from "@/lib/placeName";
import { getLocalAddresses, mergeAddresses, upsertLocalAddress, removeLocalAddress } from "@/lib/localAddresses";

/**
 * The reusable address-selection UI: a Google-Places search box, "Use Current
 * Location" + "Add New Address" action cards, and saved / recently-searched
 * lists. Extracted from V3AddressSheet so both that sheet and the V6 onboarding
 * sheet share the exact same design + logic. This component owns NO sheet chrome
 * (backdrop / slide / scroll-lock / header) — the parent provides it and passes
 * animated callbacks. Callbacks are invoked directly (no built-in close anim).
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

export interface AddressPickerBodyProps {
  currentAddress: string;
  onSelect: (address: string, coords: { lat: number; lng: number } | null) => void;
  accent?: string;
  savedAddresses?: SavedAddress[];
  onDeleteSaved?: (id: string) => void;
  /** Search-suggestion picks + "Use my location" hand off here (for map fine-tune). */
  onPickForMap?: (address: string, coords: { lat: number; lng: number } | null) => void;
  /** "Add new Address" — jump straight to the details form / map picker. */
  onAddNew?: () => void;
  partnerCoords?: { lat: number; lng: number } | null;
  partnerId?: string | null;
  /** Extra classes for the scroll container (parent controls height/scroll). */
  className?: string;
}

const formatSavedAddress = (a: SavedAddress): string =>
  a.address ||
  [a.flat_no, a.house_no, a.street, a.area, a.city].filter(Boolean).join(", ");

const labelIcon = (label?: string) => {
  const l = (label || "").toLowerCase();
  if (l.includes("home") || l.includes("house")) return Home;
  if (l.includes("office") || l.includes("work")) return Building2;
  return Navigation;
};

const savedDisplayName = (a: SavedAddress): string => {
  const place =
    a.placeName?.trim() ||
    extractPlaceName(a.address) ||
    a.area?.trim() ||
    a.city?.trim() ||
    "Saved";
  const lbl = (a.label || "").trim();
  const tag = /home|house/i.test(lbl)
    ? "Home"
    : /office|work/i.test(lbl)
      ? "Office"
      : a.customLabel?.trim() && !/^other$/i.test(a.customLabel.trim())
        ? a.customLabel.trim()
        : "";
  return tag ? `${place} (${tag})` : place;
};

function haversineKm(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined,
): number | null {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const fmtKm = (d: number | null): string | null => {
  if (d == null) return null;
  return d < 100 ? `${d.toFixed(1)} km` : `${Math.round(d)} km`;
};

export default function AddressPickerBody({
  currentAddress,
  onSelect,
  accent = "#1f2937",
  savedAddresses,
  onDeleteSaved,
  onPickForMap,
  onAddNew,
  partnerCoords,
  partnerId,
  className = "",
}: AddressPickerBodyProps) {
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [localSaved, setLocalSaved] = useState<SavedAddress[]>([]);

  useEffect(() => {
    setRecents(getRecentSearches());
    setLocalSaved(getLocalAddresses());
  }, []);

  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dummyDivRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (isLoaded && typeof google !== "undefined") {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      if (dummyDivRef.current) {
        placesRef.current = new google.maps.places.PlacesService(dummyDivRef.current);
      }
    }
  }, [isLoaded]);

  const handleSearch = useCallback((query: string) => {
    setAddress(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 3 || !autocompleteRef.current) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void trackMaps({ api: "autocomplete", partnerId, source: "checkout_v3_address" });
      autocompleteRef.current?.getPlacePredictions(
        { input: query, sessionToken: sessionTokenRef.current || undefined },
        (results) => setSuggestions(results || []),
      );
    }, 500);
  }, [partnerId]);

  const pickForMap = useCallback(
    (addr: string, coords: { lat: number; lng: number } | null) => {
      if (onPickForMap) onPickForMap(addr, coords);
      else onSelect(addr, coords);
    },
    [onPickForMap, onSelect],
  );

  const selectSuggestion = useCallback((s: google.maps.places.AutocompletePrediction) => {
    const placeId = s.place_id;
    const name = s.structured_formatting?.main_text || s.description;
    const secondary = s.structured_formatting?.secondary_text || s.description;
    setSuggestions([]);
    const finish = (coords: { lat: number; lng: number } | null) => {
      if (coords) {
        saveRecentSearch({ placeId, name, address: secondary, lat: coords.lat, lng: coords.lng, timestamp: Date.now() });
      }
      pickForMap(s.description, coords);
    };
    if (placesRef.current) {
      void trackMaps({ api: "place_details", partnerId, source: "checkout_v3_address" });
      placesRef.current.getDetails(
        { placeId, fields: ["geometry"], sessionToken: sessionTokenRef.current || undefined },
        (place) => {
          const coords = place?.geometry?.location
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : null;
          if (typeof google !== "undefined") {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
          finish(coords);
        },
      );
    } else {
      finish(null);
    }
  }, [pickForMap, partnerId]);

  const selectRecent = useCallback((r: RecentSearch) => {
    saveRecentSearch({ ...r, timestamp: Date.now() });
    pickForMap(r.name + (r.address ? `, ${r.address}` : ""), { lat: r.lat, lng: r.lng });
  }, [pickForMap]);

  const selectSaved = useCallback(
    (a: SavedAddress, text: string, coords: { lat: number; lng: number } | null) => {
      upsertLocalAddress({ ...a, savedAt: Date.now() }, Date.now());
      onSelect(text, coords);
    },
    [onSelect],
  );

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          void trackMaps({ api: "geocode", partnerId, source: "checkout_v3_address" });
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
          const data = await res.json();
          if (data.results?.[0]) addr = data.results[0].formatted_address;
        } catch {}
        setLocating(false);
        pickForMap(addr, { lat: latitude, lng: longitude });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleAddNew = () => {
    if (onAddNew) onAddNew();
    else pickForMap("", null);
  };

  const mergedSaved = mergeAddresses(localSaved, savedAddresses || []);
  const isMatch = (a: SavedAddress) => {
    const text = formatSavedAddress(a);
    return !!currentAddress && (text === currentAddress || a.address === currentAddress);
  };
  const orderedSaved = [...mergedSaved.filter(isMatch), ...mergedSaved.filter((a) => !isMatch(a))];
  const visibleSaved = showAllSaved ? orderedSaved : orderedSaved.slice(0, 3);
  const hiddenSaved = orderedSaved.length - visibleSaved.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={dummyDivRef} className="hidden" />

      {/* Search */}
      <div className="px-4 pb-2.5">
        <div className="flex items-center h-[44px] rounded-xl border border-gray-200 bg-white px-3.5 gap-2 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900/10 transition">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search an area or address"
            value={address}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 h-full text-[13px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
          />
          <Search className="w-[18px] h-[18px] text-gray-400 shrink-0" />
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-5 overscroll-contain ${className}`}
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
      >
        {suggestions.length > 0 ? (
          <div className="rounded-2xl bg-white overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.place_id}
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-100 last:border-0 transition active:bg-gray-50"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 truncate">
                    {s.structured_formatting?.main_text || s.description}
                  </p>
                  <p className="text-[12px] text-gray-400 mt-0.5 truncate">
                    {s.structured_formatting?.secondary_text || ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Action cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col items-start gap-1.5 disabled:opacity-50 transition active:opacity-60"
              >
                {locating ? (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: accent }} />
                ) : (
                  <LocateFixed className="w-5 h-5" style={{ color: accent }} />
                )}
                <span className="text-[13px] font-semibold text-gray-900 leading-tight text-left">
                  Use Current Location
                </span>
              </button>
              <button
                type="button"
                onClick={handleAddNew}
                className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col items-start gap-1.5 transition active:opacity-60"
              >
                <Plus className="w-5 h-5" style={{ color: accent }} />
                <span className="text-[13px] font-semibold text-gray-900 leading-tight text-left">
                  Add New Address
                </span>
              </button>
            </div>

            {/* Saved addresses */}
            {orderedSaved.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">
                  Saved addresses
                </p>
                <div className="rounded-2xl bg-white overflow-hidden">
                  {visibleSaved.map((a, i) => {
                    const Icon = labelIcon(a.label);
                    const text = formatSavedAddress(a);
                    const subText = stripPlusCode(text);
                    const name = savedDisplayName(a);
                    const coords =
                      a.latitude != null && a.longitude != null
                        ? { lat: a.latitude, lng: a.longitude }
                        : null;
                    const dist = fmtKm(haversineKm(partnerCoords, coords));
                    const selected = isMatch(a);
                    return (
                      <div
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectSaved(a, text, coords)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectSaved(a, text, coords);
                          }
                        }}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 cursor-pointer transition active:bg-gray-50 ${i !== visibleSaved.length - 1 ? "border-b border-gray-100" : ""}`}
                      >
                        <div className="flex flex-col items-center shrink-0 w-12">
                          <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                            <Icon className="w-4 h-4" style={{ color: selected ? accent : "#4b5563" }} />
                          </div>
                          {dist && <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">{dist}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold truncate" style={{ color: selected ? accent : "#111827" }}>
                            {name}
                          </p>
                          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{subText}</p>
                          {a.receiverPhone?.trim() && (
                            <p className="text-[12px] text-gray-400 mt-0.5 truncate">📞 {a.receiverPhone.trim()}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label="Delete address"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Remove this address?")) {
                              setLocalSaved(removeLocalAddress(a.id));
                              onDeleteSaved?.(a.id);
                            }
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-red-50 active:opacity-60 transition"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    );
                  })}
                  {hiddenSaved > 0 && (
                    <button
                      onClick={() => setShowAllSaved(true)}
                      className="w-full py-3 text-sm font-semibold border-t border-gray-100 transition active:opacity-60 flex items-center justify-center gap-1"
                      style={{ color: accent }}
                    >
                      View all <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recently searched */}
            {recents.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">
                  Recently searched
                </p>
                <div className="rounded-2xl bg-white overflow-hidden">
                  {recents.map((r, i) => {
                    const dist = fmtKm(haversineKm(partnerCoords, { lat: r.lat, lng: r.lng }));
                    return (
                      <div
                        key={r.placeId + i}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectRecent(r)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectRecent(r);
                          }
                        }}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 cursor-pointer transition active:bg-gray-50 ${i !== recents.length - 1 ? "border-b border-gray-100" : ""}`}
                      >
                        <div className="flex flex-col items-center shrink-0 w-12">
                          <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-gray-500" />
                          </div>
                          {dist && <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">{dist}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-gray-900 truncate">
                            {isPlusCode(r.name) ? extractPlaceName(r.address) || r.name : r.name}
                          </p>
                          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{stripPlusCode(r.address)}</p>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove recent"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecents(removeRecentSearch(r.placeId));
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-gray-100 active:opacity-60 transition"
                        >
                          <Trash2 className="w-4 h-4 text-gray-300" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
