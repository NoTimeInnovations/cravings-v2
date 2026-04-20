"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, MapPin, Search, LocateFixed, ChevronLeft, ChevronRight } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

interface DeliveryAddressScreenProps {
  storeBanner?: string;
  storeName: string;
  themeBg?: string;
  onContinue: (address: string, coords: { lat: number; lng: number } | null) => void;
  loading?: boolean;
  accent?: string;
  onBack?: () => void;
}

export default function DeliveryAddressScreen({
  storeName,
  onContinue,
  loading,
  accent = "#1f2937",
  onBack,
}: DeliveryAddressScreenProps) {
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dummyDivRef = useRef<HTMLDivElement>(null);

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
    setError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 3 || !autocompleteRef.current) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      autocompleteRef.current?.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "in" },
          sessionToken: sessionTokenRef.current || undefined,
        },
        (results) => setSuggestions(results || []),
      );
    }, 300);
  }, []);

  const selectSuggestion = useCallback((placeId: string, description: string) => {
    setAddress(description);
    setSuggestions([]);
    if (placesRef.current) {
      placesRef.current.getDetails(
        { placeId, fields: ["geometry"], sessionToken: sessionTokenRef.current || undefined },
        (place) => {
          if (place?.geometry?.location) {
            setCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
          }
          if (typeof google !== "undefined") {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
        },
      );
    }
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
          const data = await res.json();
          if (data.results?.[0]) setAddress(data.results[0].formatted_address);
        } catch {
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => { setError("Location access denied"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleContinue = () => {
    if (!address.trim()) { setError("Please enter a delivery address"); return; }
    onContinue(address, coords);
  };

  return (
    <div className="flex flex-col h-dvh bg-white overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div ref={dummyDivRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 sticky top-0 z-10 bg-white">
        <button
          onClick={onBack || (() => onContinue("", null))}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition active:opacity-60"
        >
          <ChevronLeft className="w-[18px] h-[18px] text-gray-900" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 flex-1 min-h-0 overflow-y-auto">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">
          Delivery address
        </h1>
        <p className="mt-2 text-[14px] text-gray-500 leading-relaxed">
          Where should we deliver your order?
        </p>

        {/* Use current location */}
        <button
          onClick={useCurrentLocation}
          disabled={locating}
          className="w-full mt-6 flex items-center gap-3 p-3.5 rounded-[14px] bg-gray-50 border-none cursor-pointer transition active:opacity-60"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accent }}>
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <LocateFixed className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-900">Use current location</p>
            <p className="text-[12px] text-gray-400 mt-0.5">GPS enabled · precise to the street</p>
          </div>
          <ChevronRight className="w-[18px] h-[18px] text-gray-400 shrink-0" />
        </button>

        {/* Search input */}
        <div className="relative mt-5">
          <div className="flex items-center h-[50px] rounded-xl border border-gray-200 bg-white px-3.5 gap-2.5 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900/10 transition">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search street, building, landmark"
              value={address}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 h-full text-[15px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute top-14 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  onClick={() => selectSuggestion(s.place_id, s.description)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2.5 transition active:opacity-60"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 truncate">{s.structured_formatting?.main_text || s.description}</p>
                    <p className="text-[12px] text-gray-400 mt-0.5 truncate">{s.structured_formatting?.secondary_text || ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Sticky CTA */}
      <div className="shrink-0 px-4 pt-2.5 pb-8 bg-white/95 backdrop-blur-lg border-t border-gray-100">
        <button
          onClick={handleContinue}
          disabled={loading || !address.trim()}
          className="w-full h-[50px] rounded-[14px] text-white font-semibold text-[15px] flex items-center justify-center transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          style={{ backgroundColor: accent }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>
      </div>
    </div>
  );
}
