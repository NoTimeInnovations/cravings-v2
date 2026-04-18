"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, LocateFixed, Loader2, X } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

interface V3AddressSheetProps {
  currentAddress: string;
  onSelect: (address: string, coords: { lat: number; lng: number } | null) => void;
  onClose: () => void;
}

export default function V3AddressSheet({ currentAddress, onSelect, onClose }: V3AddressSheetProps) {
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [closing, setClosing] = useState(false);
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

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
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
          onSelect(description, coords);
        },
      );
    } else {
      onSelect(description, null);
    }
  }, [onSelect]);

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
        onSelect(addr, { lat: latitude, lng: longitude });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const animateClose = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

  return (
    <div className="fixed inset-0 z-[500]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div ref={dummyDivRef} className="hidden" />

      {/* Backdrop */}
      <div
        onClick={animateClose}
        className="absolute inset-0 bg-black/40 transition-opacity duration-250"
        style={{ opacity: closing ? 0 : 1 }}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: closing ? "translateY(100%)" : "translateY(0)" }}
      >
        {/* Handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div />
          <div className="h-1 w-8 rounded-full bg-gray-200" />
          <button onClick={animateClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <h2 className="text-base font-bold text-gray-900">Delivery address</h2>
          {currentAddress && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">Current: {currentAddress}</p>
          )}
        </div>

        {/* Use current location */}
        <button
          onClick={useCurrentLocation}
          disabled={locating}
          className="mx-4 mb-3 flex items-center gap-3 p-3 rounded-xl bg-gray-50 transition active:opacity-60"
        >
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <LocateFixed className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Use current location</p>
            <p className="text-[11px] text-gray-400">GPS · precise to the street</p>
          </div>
        </button>

        {/* Search */}
        <div className="px-4 mb-2">
          <div className="flex items-center h-[44px] rounded-xl border border-gray-200 px-3 gap-2 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900/10 transition">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search street, building, landmark"
              value={address}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 h-full text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {suggestions.map((s) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
