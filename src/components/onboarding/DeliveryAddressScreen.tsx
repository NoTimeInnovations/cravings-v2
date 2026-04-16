"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Loader2, MapPin, Search, LocateFixed } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

interface DeliveryAddressScreenProps {
  storeBanner?: string;
  storeName: string;
  themeBg?: string;
  onContinue: (address: string, coords: { lat: number; lng: number } | null) => void;
  loading?: boolean;
}

export default function DeliveryAddressScreen({
  storeBanner,
  storeName,
  themeBg,
  onContinue,
  loading,
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

    // Debounce 300ms to reduce API calls
    debounceRef.current = setTimeout(() => {
      autocompleteRef.current?.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "in" },
          sessionToken: sessionTokenRef.current || undefined,
        },
        (results) => {
          setSuggestions(results || []);
        }
      );
    }, 300);
  }, []);

  const selectSuggestion = useCallback((placeId: string, description: string) => {
    setAddress(description);
    setSuggestions([]);
    if (placesRef.current) {
      // Pass session token to group autocomplete + details into one billing session
      placesRef.current.getDetails(
        {
          placeId,
          fields: ["geometry"],
          sessionToken: sessionTokenRef.current || undefined,
        },
        (place) => {
          if (place?.geometry?.location) {
            setCoords({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          }
          // Reset session token after place details (completes billing session)
          if (typeof google !== "undefined") {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
        }
      );
    }
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await res.json();
          if (data.results?.[0]) {
            setAddress(data.results[0].formatted_address);
          }
        } catch {
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => {
        setError("Location access denied");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleContinue = () => {
    if (!address.trim()) {
      setError("Please enter a delivery address");
      return;
    }
    onContinue(address, coords);
  };

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: themeBg || '#14532D' }}>
      <div ref={dummyDivRef} className="hidden" />

      {/* Top section with logo only */}
      <div className="flex flex-col items-center justify-center px-6 pt-12 pb-8">
        {storeBanner ? (
          <div className="w-20 h-20 rounded-[20px] overflow-hidden border-4 border-white/20 bg-white">
            <Image
              src={storeBanner}
              alt={storeName}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-[20px] flex items-center justify-center text-white text-2xl font-bold bg-[#1E6B3A]">
            {storeName?.charAt(0) || "M"}
          </div>
        )}
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-10 pb-8">
        <h2 className="text-[#111827] font-bold text-xl text-center mb-1">
          Delivery address
        </h2>
        <p className="text-[#6B7280] text-sm text-center mb-8">
          Where should we delivery your order?
        </p>

        {/* Use current location */}
        <button
          onClick={useCurrentLocation}
          disabled={locating}
          className="w-full flex items-center gap-3 border border-[#D6D6D6] rounded-2xl px-4 py-5 mb-4 hover:bg-[#F9FAFB] transition-colors shadow-sm shadow-black/20"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#ECFDF5]">
            {locating ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
            ) : (
              <LocateFixed className="w-5 h-5 text-[#059669]" />
            )}
          </div>
          <div className="text-left">
            <p className="text-[#111827] font-semibold text-sm">
              Use current location
            </p>
            <p className="text-[#9CA3AF] text-xs">
              Allow GPS to detect your address
            </p>
          </div>
        </button>

        {/* OR divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#E5E7EB]" />
          <span className="text-[#9CA3AF] text-xs font-medium">OR</span>
          <div className="flex-1 h-px bg-[#E5E7EB]" />
        </div>

        {/* Search input */}
        <div className="relative">
          <div className="flex items-center border border-[#D6D6D6] rounded-xl h-[50px] px-3 gap-2 shadow-sm shadow-black/20">
            <Search className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search for area, street, locality..."
              value={address}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 h-full text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none bg-transparent"
            />
          </div>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-14 left-0 right-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  onClick={() => selectSuggestion(s.place_id, s.description)}
                  className="w-full text-left px-4 py-3 text-sm text-[#374151] hover:bg-[#F9FAFB] border-b border-[#F3F4F6] last:border-0 flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-[#9CA3AF] mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{s.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-[#EF4444] text-xs mt-2">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={loading || !address.trim()}
          className="w-full h-[50px] rounded-xl text-white font-semibold text-base mt-6 flex items-center justify-center transition-opacity disabled:opacity-60 bg-[#FF5301]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>
      </div>
    </div>
  );
}
