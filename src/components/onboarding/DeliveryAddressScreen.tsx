"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Loader2, MapPin, Search, Navigation } from "lucide-react";

interface DeliveryAddressScreenProps {
  storeBanner?: string;
  storeName: string;
  accentColor: string;
  onContinue: (address: string, coords: { lat: number; lng: number } | null) => void;
  loading?: boolean;
}

export default function DeliveryAddressScreen({
  storeBanner,
  storeName,
  accentColor,
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
  const dummyDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof google !== "undefined" && google.maps) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
      if (dummyDivRef.current) {
        placesRef.current = new google.maps.places.PlacesService(dummyDivRef.current);
      }
    }
  }, []);

  const handleSearch = (query: string) => {
    setAddress(query);
    setError("");
    if (!query || query.length < 3 || !autocompleteRef.current) {
      setSuggestions([]);
      return;
    }
    autocompleteRef.current.getPlacePredictions(
      { input: query, componentRestrictions: { country: "in" } },
      (results) => {
        setSuggestions(results || []);
      }
    );
  };

  const selectSuggestion = (placeId: string, description: string) => {
    setAddress(description);
    setSuggestions([]);
    if (placesRef.current) {
      placesRef.current.getDetails({ placeId, fields: ["geometry"] }, (place) => {
        if (place?.geometry?.location) {
          setCoords({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
    }
  };

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
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
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
    <div className="flex flex-col min-h-dvh bg-white">
      <div ref={dummyDivRef} className="hidden" />

      {/* Logo */}
      <div className="flex justify-center pt-10 pb-6">
        {storeBanner ? (
          <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
            <Image
              src={storeBanner}
              alt={storeName}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: accentColor }}
          >
            {storeName?.charAt(0) || "M"}
          </div>
        )}
      </div>

      <div className="flex-1 px-6">
        <h2 className="text-gray-900 font-bold text-xl text-center mb-1">
          Delivery address
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          Where should we delivery your order?
        </p>

        {/* Use current location */}
        <button
          onClick={useCurrentLocation}
          disabled={locating}
          className="w-full flex items-center gap-3 border border-gray-200 rounded-xl p-4 mb-4 hover:bg-gray-50 transition-colors"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            {locating ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentColor }} />
            ) : (
              <Navigation className="w-5 h-5" style={{ color: accentColor }} />
            )}
          </div>
          <div className="text-left">
            <p className="text-gray-900 font-semibold text-sm">
              Use current location
            </p>
            <p className="text-gray-400 text-xs">
              Allow GPS to detect your address
            </p>
          </div>
        </button>

        {/* OR divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-xs font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Search input */}
        <div className="relative">
          <div className="flex items-center border border-gray-200 rounded-xl h-12 px-3 gap-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search for area, street, locality..."
              value={address}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 h-full text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            />
          </div>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-14 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  onClick={() => selectSuggestion(s.place_id, s.description)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{s.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={loading || !address.trim()}
          className="w-full h-12 rounded-xl text-white font-semibold text-sm mt-6 flex items-center justify-center transition-opacity disabled:opacity-60"
          style={{ backgroundColor: accentColor }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>
      </div>
    </div>
  );
}
