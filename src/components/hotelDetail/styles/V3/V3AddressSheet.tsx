"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { trackMaps } from "@/lib/mapsUsage";
import { MapPin, Search, LocateFixed, Loader2, Home, Building2, Navigation, Trash2, ChevronDown, Plus, ArrowLeft, Clock } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";
import type { SavedAddress } from "../../placeOrder/AddressManagementModal";
import { getRecentSearches, saveRecentSearch, removeRecentSearch, type RecentSearch } from "@/lib/recentSearches";
import { extractPlaceName, stripPlusCode, isPlusCode } from "@/lib/placeName";
import { getLocalAddresses, mergeAddresses, upsertLocalAddress, removeLocalAddress } from "@/lib/localAddresses";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

interface V3AddressSheetProps {
  currentAddress: string;
  onSelect: (address: string, coords: { lat: number; lng: number } | null) => void;
  onClose: () => void;
  accent?: string;
  savedAddresses?: SavedAddress[];
  onDeleteSaved?: (id: string) => void;
  /**
   * If provided, search-suggestion picks and "Use my location" hand the
   * chosen point to this callback instead of committing via onSelect — so
   * the consumer can open a map picker for fine-tuning and saving.
   */
  onPickForMap?: (address: string, coords: { lat: number; lng: number } | null) => void;
  /**
   * If provided, the "Add new Address" row calls this instead of the map
   * picker — so the consumer can jump straight to the address-details form
   * using the already-selected location (no location re-ask).
   */
  onAddNew?: () => void;
  /** Partner/outlet coordinates, used to show the distance to each address. */
  partnerCoords?: { lat: number; lng: number } | null;
  brandHeader?: {
    brandName: string;
    outletLabel: string | null;
    onChange: () => void;
  } | null;
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

// Primary line for a saved address (Swiggy/Zomato style): the recognizable
// place name, with the tag in brackets only for Home/Office/custom — never
// "(Other)". Plus codes ("28QW+QW2") are never shown.
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

// Straight-line distance (km) between the partner and an address point.
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

export default function V3AddressSheet({ currentAddress, onSelect, onClose, accent = "#1f2937", savedAddresses, onDeleteSaved, onPickForMap, onAddNew, partnerCoords, brandHeader }: V3AddressSheetProps) {
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [localSaved, setLocalSaved] = useState<SavedAddress[]>([]);

  const ANIM_MS = 450;

  // Trigger slide-up on mount (after first paint so the transition runs)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Load recent searches + locally-saved addresses from localStorage on open.
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

  // Lock background scroll while the sheet is mounted
  useEffect(() => {
    const original = document.body.style.overflow;
    const originalTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = original;
      document.body.style.touchAction = originalTouch;
    };
  }, []);

  const handleSearch = useCallback((query: string) => {
    setAddress(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 3 || !autocompleteRef.current) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void trackMaps({ api: "autocomplete", source: "checkout_v3_address" });
      autocompleteRef.current?.getPlacePredictions(
        { input: query, sessionToken: sessionTokenRef.current || undefined },
        (results) => setSuggestions(results || []),
      );
    }, 500);
  }, []);

  const animateAndSelect = useCallback(
    (addr: string, coords: { lat: number; lng: number } | null) => {
      setClosing(true);
      setTimeout(() => onSelect(addr, coords), ANIM_MS);
    },
    [onSelect],
  );

  // Search picks & "Use my location" hand off to the map picker if provided.
  const animateAndPickForMap = useCallback(
    (addr: string, coords: { lat: number; lng: number } | null) => {
      if (!onPickForMap) {
        animateAndSelect(addr, coords);
        return;
      }
      setClosing(true);
      setTimeout(() => onPickForMap(addr, coords), ANIM_MS);
    },
    [onPickForMap, animateAndSelect],
  );

  const selectSuggestion = useCallback((s: google.maps.places.AutocompletePrediction) => {
    const placeId = s.place_id;
    const name = s.structured_formatting?.main_text || s.description;
    const secondary = s.structured_formatting?.secondary_text || s.description;
    setSuggestions([]);
    const finish = (coords: { lat: number; lng: number } | null) => {
      // Remember this search (name + sub-address) for the "Recently searched"
      // list, persisted in localStorage.
      if (coords) {
        saveRecentSearch({ placeId, name, address: secondary, lat: coords.lat, lng: coords.lng, timestamp: Date.now() });
      }
      animateAndPickForMap(s.description, coords);
    };
    if (placesRef.current) {
      void trackMaps({ api: "place_details", source: "checkout_v3_address" });
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
  }, [animateAndPickForMap]);

  const selectRecent = useCallback((r: RecentSearch) => {
    saveRecentSearch({ ...r, timestamp: Date.now() });
    animateAndPickForMap(r.name + (r.address ? `, ${r.address}` : ""), { lat: r.lat, lng: r.lng });
  }, [animateAndPickForMap]);

  const selectSaved = useCallback(
    (a: SavedAddress, text: string, coords: { lat: number; lng: number } | null) => {
      // Bump this address to "latest" locally so it stays on top after a reload,
      // regardless of the DB array order.
      upsertLocalAddress({ ...a, savedAt: Date.now() }, Date.now());
      animateAndSelect(text, coords);
    },
    [animateAndSelect],
  );

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          void trackMaps({ api: "geocode", source: "checkout_v3_address" });
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
          const data = await res.json();
          if (data.results?.[0]) addr = data.results[0].formatted_address;
        } catch {}
        setLocating(false);
        animateAndPickForMap(addr, { lat: latitude, lng: longitude });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleAddNew = () => {
    if (onAddNew) {
      setClosing(true);
      setTimeout(() => onAddNew(), ANIM_MS);
    } else {
      animateAndPickForMap("", null);
    }
  };

  const animateClose = () => {
    setClosing(true);
    setTimeout(onClose, ANIM_MS);
  };

  // Merge the caller's list with locally-saved addresses (which reliably carry
  // `savedAt`) and sort newest-first — so order is stable across reloads
  // regardless of how the DB array happens to be ordered.
  const mergedSaved = mergeAddresses(localSaved, savedAddresses || []);
  // Selected address pinned first; the rest stay newest-first.
  const isMatch = (a: SavedAddress) => {
    const text = formatSavedAddress(a);
    return !!currentAddress && (text === currentAddress || a.address === currentAddress);
  };
  const orderedSaved = [...mergedSaved.filter(isMatch), ...mergedSaved.filter((a) => !isMatch(a))];
  const visibleSaved = showAllSaved ? orderedSaved : orderedSaved.slice(0, 3);
  const hiddenSaved = orderedSaved.length - visibleSaved.length;

  return (
    <div className="fixed inset-0 z-[500]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div ref={dummyDivRef} className="hidden" />

      {/* Backdrop */}
      <div
        onClick={animateClose}
        className="absolute inset-0 bg-black/40"
        style={{
          opacity: !mounted || closing ? 0 : 1,
          transition: `opacity ${ANIM_MS}ms ease-out`,
        }}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-gray-50 rounded-t-2xl h-[92vh] overflow-hidden flex flex-col"
        style={{
          transform: !mounted || closing ? "translateY(100%)" : "translateY(0)",
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {/* Header */}
        <div className="bg-white shrink-0">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button onClick={animateClose} aria-label="Back" className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Select Your Location</h2>
          </div>

          {/* Outlet row (multi-outlet brands) */}
          {brandHeader && (
            <button
              type="button"
              onClick={() => { brandHeader.onChange(); animateClose(); }}
              className="w-[calc(100%-2rem)] mx-4 mb-3 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-left transition active:opacity-70"
            >
              <MapPin className="w-4 h-4 shrink-0 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Outlet</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {brandHeader.brandName}
                  {brandHeader.outletLabel ? ` — ${brandHeader.outletLabel}` : ""}
                </p>
              </div>
              <span className="text-xs font-semibold inline-flex items-center gap-0.5 shrink-0" style={{ color: accent }}>
                Change
                <ChevronDown className="w-3 h-3" />
              </span>
            </button>
          )}

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="flex items-center h-[50px] rounded-xl border border-gray-200 bg-white px-4 gap-2.5 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900/10 transition">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search an area or address"
                value={address}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 h-full text-[15px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-8 overscroll-contain"
          style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
        >
          {suggestions.length > 0 ? (
            /* ===== Search suggestions ===== */
            <div className="rounded-2xl bg-white overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3 border-b border-gray-100 last:border-0 transition active:bg-gray-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">
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
              {/* ===== Action cards ===== */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="rounded-xl border border-gray-200 bg-white p-3.5 flex flex-col items-start gap-2 disabled:opacity-50 transition active:opacity-60"
                >
                  {locating ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: accent }} />
                  ) : (
                    <LocateFixed className="w-5 h-5" style={{ color: accent }} />
                  )}
                  <span className="text-sm font-semibold text-gray-900 leading-tight text-left">
                    Use Current Location
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="rounded-xl border border-gray-200 bg-white p-3.5 flex flex-col items-start gap-2 transition active:opacity-60"
                >
                  <Plus className="w-5 h-5" style={{ color: accent }} />
                  <span className="text-sm font-semibold text-gray-900 leading-tight text-left">
                    Add New Address
                  </span>
                </button>
              </div>

              {/* ===== Saved addresses ===== */}
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
                          className={`w-full text-left flex items-start gap-3 px-4 py-3.5 cursor-pointer transition active:bg-gray-50 ${i !== visibleSaved.length - 1 ? "border-b border-gray-100" : ""}`}
                        >
                          <div className="flex flex-col items-center shrink-0 w-12">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                              <Icon className="w-4 h-4" style={{ color: selected ? accent : "#4b5563" }} />
                            </div>
                            {dist && <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">{dist}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold truncate" style={{ color: selected ? accent : "#111827" }}>
                              {name}
                            </p>
                            <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2">{subText}</p>
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

              {/* ===== Recently searched ===== */}
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
                          className={`w-full text-left flex items-start gap-3 px-4 py-3.5 cursor-pointer transition active:bg-gray-50 ${i !== recents.length - 1 ? "border-b border-gray-100" : ""}`}
                        >
                          <div className="flex flex-col items-center shrink-0 w-12">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-gray-500" />
                            </div>
                            {dist && <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">{dist}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold text-gray-900 truncate">
                              {isPlusCode(r.name) ? extractPlaceName(r.address) || r.name : r.name}
                            </p>
                            <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2">{stripPlusCode(r.address)}</p>
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
    </div>
  );
}
