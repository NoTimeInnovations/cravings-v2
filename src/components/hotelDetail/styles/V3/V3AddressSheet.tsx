"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, LocateFixed, Loader2, X, Home, Building2, Navigation, Trash2, ChevronDown } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";
import type { SavedAddress } from "../../placeOrder/AddressManagementModal";

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

export default function V3AddressSheet({ currentAddress, onSelect, onClose, accent = "#1f2937", savedAddresses, onDeleteSaved, onPickForMap, brandHeader }: V3AddressSheetProps) {
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAllSaved, setShowAllSaved] = useState(false);

  const ANIM_MS = 450;

  // Trigger slide-up on mount (after first paint so the transition runs)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
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
      autocompleteRef.current?.getPlacePredictions(
        { input: query, sessionToken: sessionTokenRef.current || undefined },
        (results) => setSuggestions(results || []),
      );
    }, 300);
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

  const selectSuggestion = useCallback((placeId: string, description: string) => {
    setSuggestions([]);
    if (placesRef.current) {
      placesRef.current.getDetails(
        { placeId, fields: ["geometry"], sessionToken: sessionTokenRef.current || undefined },
        (place) => {
          const coords = place?.geometry?.location
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : null;
          if (typeof google !== "undefined") {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
          animateAndPickForMap(description, coords);
        },
      );
    } else {
      animateAndPickForMap(description, null);
    }
  }, [animateAndPickForMap]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
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

  const animateClose = () => {
    setClosing(true);
    setTimeout(onClose, ANIM_MS);
  };

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
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          transform: !mounted || closing ? "translateY(100%)" : "translateY(0)",
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {/* Handle + close (sticky) */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
          <div />
          <div className="h-1 w-8 rounded-full bg-gray-200" />
          <button onClick={animateClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <div className="px-4 pb-2 shrink-0">
          <h2 className="text-base font-bold text-gray-900">Delivery address</h2>
          {currentAddress && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">Current: {currentAddress}</p>
          )}
        </div>

        {/* Brand / outlet row */}
        {brandHeader && (
          <div className="px-4 pb-3 shrink-0">
            <button
              type="button"
              onClick={() => { brandHeader.onChange(); animateClose(); }}
              className="w-full flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-left transition active:opacity-70"
            >
              <MapPin className="w-4 h-4 shrink-0 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Outlet
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {brandHeader.brandName}
                  {brandHeader.outletLabel ? ` — ${brandHeader.outletLabel}` : ""}
                </p>
              </div>
              <span
                className="text-xs font-semibold inline-flex items-center gap-0.5 shrink-0"
                style={{ color: accent }}
              >
                Change
                <ChevronDown className="w-3 h-3" />
              </span>
            </button>
          </div>
        )}

        {/* Search + current-location (sticky at top of body) */}
        <div className="px-4 pb-3 shrink-0 bg-white flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center h-[44px] rounded-xl border border-gray-200 px-3 gap-2 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900/10 transition">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search street, building, landmark"
              value={address}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 h-full text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
            />
          </div>
          <button
            onClick={useCurrentLocation}
            disabled={locating}
            className="h-[44px] px-3 rounded-xl flex items-center gap-1.5 shrink-0 transition active:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <LocateFixed className="w-4 h-4 text-white" />
            )}
            <span className="text-xs font-semibold text-white whitespace-nowrap">
              Use my location
            </span>
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 overscroll-contain"
          style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
        >
          {/* Suggestions (when searching) */}
          {suggestions.length > 0 ? (
            suggestions.map((s) => (
            <button
              key={s.place_id}
              onClick={() => selectSuggestion(s.place_id, s.description)}
              className="w-full text-left py-3 flex items-start gap-2.5 border-b border-gray-100 last:border-0 transition active:opacity-60"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {s.structured_formatting?.main_text || s.description}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {s.structured_formatting?.secondary_text || ""}
                </p>
              </div>
            </button>
          ))
          ) : (
            <>
              {/* Saved addresses (selected first, then last added) */}
              {savedAddresses && savedAddresses.length > 0 && (() => {
                const isMatch = (a: SavedAddress) => {
                  const text = formatSavedAddress(a);
                  return (
                    !!currentAddress &&
                    (text === currentAddress || a.address === currentAddress)
                  );
                };
                const reversed = [...savedAddresses].reverse();
                const sorted = [
                  ...reversed.filter(isMatch),
                  ...reversed.filter((a) => !isMatch(a)),
                ];
                const visible = showAllSaved ? sorted : sorted.slice(0, 3);
                const hidden = sorted.length - visible.length;
                return (
                  <div className="pb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Saved addresses
                    </p>
                    <div className="space-y-1.5">
                      {visible.map((a) => {
                        const Icon = labelIcon(a.label);
                        const text = formatSavedAddress(a);
                        const isSelected =
                          (!!currentAddress && text === currentAddress) ||
                          (!!currentAddress &&
                            !!a.address &&
                            a.address === currentAddress);
                        return (
                          <div
                            key={a.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              const coords =
                                a.latitude != null && a.longitude != null
                                  ? { lat: a.latitude, lng: a.longitude }
                                  : null;
                              animateAndSelect(text, coords);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const coords =
                                  a.latitude != null && a.longitude != null
                                    ? { lat: a.latitude, lng: a.longitude }
                                    : null;
                                animateAndSelect(text, coords);
                              }
                            }}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-xl border transition active:opacity-60 cursor-pointer"
                            style={{
                              borderColor: isSelected ? accent : "#f3f4f6",
                              backgroundColor: isSelected ? `${accent}10` : "white",
                            }}
                          >
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: isSelected ? `${accent}20` : "#f9fafb",
                              }}
                            >
                              <Icon
                                className="w-4 h-4"
                                style={{ color: isSelected ? accent : "#4b5563" }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: isSelected ? accent : "#111827" }}
                              >
                                {a.customLabel || a.label || "Saved"}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate mt-0.5">{text}</p>
                            </div>
                            {isSelected && (
                              <span
                                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                                style={{ color: accent, backgroundColor: `${accent}1A` }}
                              >
                                Selected
                              </span>
                            )}
                            {onDeleteSaved && (
                              <button
                                type="button"
                                aria-label="Delete address"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Remove this address?")) {
                                    onDeleteSaved(a.id);
                                  }
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-red-50 active:opacity-60 transition"
                              >
                                <Trash2 className="w-4 h-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {hidden > 0 && (
                      <button
                        onClick={() => setShowAllSaved(true)}
                        className="w-full mt-2 py-2.5 text-sm font-semibold rounded-xl border border-gray-100 transition active:opacity-60"
                        style={{ color: accent }}
                      >
                        Show {hidden} more
                      </button>
                    )}
                  </div>
                );
              })()}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
