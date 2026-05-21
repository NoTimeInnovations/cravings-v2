"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, ChevronDown, Navigation, Clock, Search, X } from "lucide-react";
import { useLocationStore } from "@/store/geolocationStore";
import useOrderStore from "@/store/orderStore";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { createPortal } from "react-dom";
import { calculateDeliveryDistanceAndCost } from "./OrderDrawer";
import { isVideoUrl } from "@/lib/mediaUtils";
import { useLoadScript } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

interface LocationHeaderProps {
  hoteldata: HotelData;
  styles: Styles;
  accent: string;
  bannerError: boolean;
  setBannerError: (v: boolean) => void;
  brandHeader?: {
    brandName: string;
    outletLabel: string | null;
    onChange: () => void;
  } | null;
}

interface RecentLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const LocationHeader = ({
  hoteldata,
  styles,
  accent,
  bannerError,
  setBannerError,
  brandHeader,
}: LocationHeaderProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [displayAddress, setDisplayAddress] = useState<string>("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const { coords, isLoading: isGeoLoading } = useLocationStore();
  const { userAddress, setUserAddress, setUserCoordinates } = useOrderStore();

  const deliveryRadius = hoteldata?.delivery_rules?.delivery_radius || 0;
  const storeName = hoteldata?.store_name || "";
  const storeLocation = hoteldata?.location_details || hoteldata?.district || hoteldata?.country || "";

  // Initialize Google services once the maps script is loaded
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  const googleReverseGeocode = useCallback(
    (lat: number, lng: number): Promise<string | null> => {
      if (!isLoaded) return Promise.resolve(null);
      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve(null);
          }
        });
      });
    },
    [isLoaded]
  );

  // Load recent locations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("recent-delivery-locations");
      if (saved) setRecentLocations(JSON.parse(saved));
    } catch {}
  }, []);

  // Set display address from userAddress or coords
  useEffect(() => {
    if (userAddress) {
      setDisplayAddress(userAddress);
    } else if (coords && isLoaded) {
      googleReverseGeocode(coords.lat, coords.lng).then((addr) => {
        if (addr) setDisplayAddress(addr);
      });
    }
  }, [userAddress, coords, isLoaded, googleReverseGeocode]);

  const saveRecentLocation = (loc: RecentLocation) => {
    const updated = [loc, ...recentLocations.filter(
      (r) => r.lat !== loc.lat || r.lng !== loc.lng
    )].slice(0, 5);
    setRecentLocations(updated);
    try { localStorage.setItem("recent-delivery-locations", JSON.stringify(updated)); } catch {}
  };

  const selectLocation = useCallback(async (lat: number, lng: number, name: string, address: string) => {
    setUserCoordinates({ lat, lng });
    setUserAddress(address || name);
    setDisplayAddress(address || name);

    // Update geolocation store too
    useLocationStore.getState().setCoords({ lat, lng });

    saveRecentLocation({ name, address, lat, lng });
    setShowPicker(false);
    setSearchQuery("");
    setPredictions([]);

    // Check delivery radius
    await calculateDeliveryDistanceAndCost(hoteldata);

    // Check if out of range after calculation
    setTimeout(() => {
      const info = useOrderStore.getState().deliveryInfo;
      if (info?.isOutOfRange) {
        setShowUnavailable(true);
      }
    }, 500);
  }, [hoteldata]);

  const handleUseCurrentLocation = async () => {
    const result = await useLocationStore.getState().refreshLocation();
    if (result) {
      const addr = await googleReverseGeocode(result.lat, result.lng);
      await selectLocation(result.lat, result.lng, "Current Location", addr || "Your current location");
    }
  };

  // Google Places Autocomplete search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query.trim() || !isLoaded || !autocompleteServiceRef.current) {
      setPredictions([]);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      setIsSearching(true);

      // Bias predictions toward the store location when available
      const storeCoords = hoteldata?.geo_location?.coordinates;
      const location = storeCoords
        ? new google.maps.LatLng(storeCoords[1], storeCoords[0])
        : undefined;

      autocompleteServiceRef.current!.getPlacePredictions(
        {
          input: query,
          sessionToken: sessionTokenRef.current || undefined,
          ...(location && { location, radius: 50000 }),
        },
        (results, status) => {
          setIsSearching(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
          } else {
            setPredictions([]);
          }
        }
      );
    }, 300);
  };

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!isLoaded) return;

    if (!placesServiceRef.current) {
      const div = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "name", "formatted_address"],
        sessionToken: sessionTokenRef.current || undefined,
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const name = prediction.structured_formatting.main_text || place.name || prediction.description;
          const address = place.formatted_address || prediction.description;

          // Reset session token after place details fetch (closes the billing session)
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

          selectLocation(lat, lng, name, address);
        }
      }
    );
  };

  const shortAddress = displayAddress
    ? displayAddress.length > 35
      ? displayAddress.substring(0, 35) + "..."
      : displayAddress
    : "Select location";

  return (
    <>
      {/* Header Bar */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 cursor-pointer"
        style={{ backgroundColor: accent }}
        onClick={() => setShowPicker(true)}
      >
        {/* Store Logo */}
        <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 overflow-hidden flex items-center justify-center shadow-sm">
          {hoteldata?.store_banner && !bannerError && !isVideoUrl(hoteldata.store_banner) ? (
            <img
              src={hoteldata.store_banner}
              alt={storeName}
              className="w-full h-full object-cover"
              onError={() => setBannerError(true)}
            />
          ) : (
            <span className="text-sm font-bold" style={{ color: accent }}>
              {storeName.charAt(0) || "S"}
            </span>
          )}
        </div>

        {/* Location Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white text-[13px] font-medium opacity-80">Location</span>
            <ChevronDown size={12} className="text-white/60" />
          </div>
          <p className="text-white text-[14px] font-semibold truncate">
            {shortAddress}
          </p>
        </div>
      </div>

      {/* Location Picker Bottom Sheet */}
      {showPicker && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setShowPicker(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Choose a Location</h3>
              <button
                onClick={() => setShowPicker(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Brand / Outlet row */}
            {brandHeader && (
              <button
                type="button"
                onClick={() => { setShowPicker(false); brandHeader.onChange(); }}
                className="w-full flex items-center gap-3 px-5 py-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors text-left"
              >
                <MapPin size={18} className="text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Outlet
                  </p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {brandHeader.brandName}
                    {brandHeader.outletLabel ? ` — ${brandHeader.outletLabel}` : ""}
                  </p>
                </div>
                <span
                  className="text-sm font-semibold inline-flex items-center gap-0.5 shrink-0"
                  style={{ color: accent }}
                >
                  Change
                  <ChevronDown size={14} />
                </span>
              </button>
            )}

            {/* Search Input */}
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5" style={{ borderColor: `${accent}40` }}>
                <Search size={18} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for any location"
                  className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setPredictions([]); }}>
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Use Current Location */}
            <button
              onClick={handleUseCurrentLocation}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              disabled={isGeoLoading || !isLoaded}
            >
              <Navigation size={18} style={{ color: accent }} />
              <span className="text-sm font-medium" style={{ color: accent }}>
                {isGeoLoading ? "Getting location..." : "Use your current location"}
              </span>
            </button>

            <div className="border-t mx-5" />

            {/* Search Results or Recent Locations */}
            <div className="overflow-y-auto max-h-[45vh] pb-6">
              {searchQuery && predictions.length > 0 ? (
                <div>
                  <p className="px-5 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase">Search Results</p>
                  {predictions.map((p) => (
                    <button
                      key={p.place_id}
                      onClick={() => handleSelectPrediction(p)}
                      className="w-full flex items-start gap-3 px-5 py-3 hover:bg-gray-50 text-left transition-colors"
                    >
                      <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {p.structured_formatting?.main_text || p.description}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {p.structured_formatting?.secondary_text || p.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery && isSearching ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Searching...</p>
              ) : searchQuery && !isSearching && predictions.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No results found</p>
              ) : (
                <>
                  {recentLocations.length > 0 && (
                    <div>
                      <p className="px-5 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase">Recent Locations</p>
                      {recentLocations.map((loc, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectLocation(loc.lat, loc.lng, loc.name, loc.address)}
                          className="w-full flex items-start gap-3 px-5 py-3 hover:bg-gray-50 text-left transition-colors"
                        >
                          <Clock size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{loc.name}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{loc.address}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delivery Unavailable Modal */}
      {showUnavailable && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end justify-center" onClick={() => setShowUnavailable(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white rounded-t-2xl w-full max-w-md p-6 pb-8 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3">Delivery Not Available</h3>
            <div className="border-t mb-4" />
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              We are currently serving within {deliveryRadius} km from {storeLocation || storeName}. Your selected location is outside our delivery area.
            </p>
            <button
              onClick={() => {
                setShowUnavailable(false);
                setShowPicker(true);
              }}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: accent }}
            >
              Choose Another Location
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default LocationHeader;
