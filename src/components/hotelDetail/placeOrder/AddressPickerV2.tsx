"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  LocateFixed,
  Search,
  X,
} from "lucide-react";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import { HotelData } from "@/app/hotels/[...id]/page";
import type { SavedAddress } from "./AddressManagementModal";

type RecentSearch = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
};

type GeocodedInfo = {
  name: string;
  address: string;
  area?: string;
  city?: string;
  district?: string;
  pincode?: string;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 10.050525, lng: 76.322455 };
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];
const RECENT_SEARCHES_KEY = "recent-address-searches";
const MAX_RECENT = 5;

function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage?.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSearch[];
  } catch {
    return [];
  }
}

function saveRecentSearch(item: RecentSearch) {
  try {
    const existing = getRecentSearches().filter(
      (r) => r.placeId !== item.placeId,
    );
    const updated = [item, ...existing].slice(0, MAX_RECENT);
    localStorage?.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {}
}

const GREEN_PIN_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#16a34a"/><circle cx="16" cy="14.5" r="6" fill="white"/></svg>',
)}`;

const AddressPickerV2 = ({
  open,
  onClose,
  onSaved,
  hotelData,
  accent = "#EA580C",
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (addr: SavedAddress) => void;
  hotelData: HotelData;
  accent?: string;
}) => {
  // Screens: "landing" or "map"
  const [screen, setScreen] = useState<"landing" | "map">("landing");
  const [searchValue, setSearchValue] = useState("");
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  const initialCenter = useMemo(() => {
    if (
      hotelData?.geo_location &&
      typeof hotelData.geo_location === "object" &&
      "coordinates" in hotelData.geo_location
    ) {
      return {
        lat: hotelData.geo_location.coordinates[1],
        lng: hotelData.geo_location.coordinates[0],
      };
    }
    return DEFAULT_CENTER;
  }, [hotelData?.geo_location]);

  const [mapCenter, _setMapCenter] = useState(initialCenter);
  const updateMapCenter = useCallback((c: { lat: number; lng: number }) => {
    _setMapCenter(c);
    mapCenterRef.current = c;
  }, []);

  const [geocodedInfo, setGeocodedInfo] = useState<GeocodedInfo | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [mapMoving, setMapMoving] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const mapCenterRef = useRef(mapCenter);
  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hotelMarkerRef = useRef<google.maps.Marker | null>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const mapInitializedRef = useRef(false);
  const mapDraggedRef = useRef(false);

  const hotelCoords = useMemo(() => {
    if (
      hotelData?.geo_location &&
      typeof hotelData.geo_location === "object" &&
      "coordinates" in hotelData.geo_location
    ) {
      return {
        lat: hotelData.geo_location.coordinates[1],
        lng: hotelData.geo_location.coordinates[0],
      };
    }
    return null;
  }, [hotelData?.geo_location]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Init services
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current =
        new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Check geolocation permission and skip landing if granted
  useEffect(() => {
    if (!open) return;
    navigator.permissions?.query({ name: "geolocation" }).then((result) => {
      const granted = result.state === "granted";
      setLocationGranted(granted);
      if (granted) {
        // Auto-get location and go straight to map
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            updateMapCenter(center);
            setScreen("map");
          },
          () => {
            // Fallback to landing if geolocation fails
            if (hotelCoords) updateMapCenter(hotelCoords);
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
      }
      result.onchange = () => setLocationGranted(result.state === "granted");
    }).catch(() => {});
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setScreen("landing");
      setSearchValue("");
      setPredictions([]);
      setGeocodedInfo(null);
      setManualAddress("");
      setMapMoving(false);
      mapInitializedRef.current = false;
      mapDraggedRef.current = false;
      hotelMarkerRef.current?.setMap(null);
      hotelMarkerRef.current = null;
      if (isLoaded) {
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
      }
      if (hotelCoords) updateMapCenter(hotelCoords);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!isLoaded || !autocompleteServiceRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchValue.trim()) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      autocompleteServiceRef.current!.getPlacePredictions(
        {
          input: searchValue,
          sessionToken: sessionTokenRef.current || undefined,
        },
        (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            setPredictions(results);
          } else {
            setPredictions([]);
          }
        },
      );
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, isLoaded]);

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!isLoaded) return;
      setGeocoding(true);
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setGeocoding(false);
        if (status === "OK" && results && results[0]) {
          const components = results[0].address_components;
          const formatted = results[0].formatted_address;
          let name = "";
          let area = "";
          let city = "";
          let district = "";
          let pincode = "";
          components.forEach((c) => {
            const t = c.types;
            if (t.includes("sublocality_level_1") || t.includes("sublocality")) {
              area = c.long_name;
              if (!name) name = c.long_name;
            }
            if (t.includes("neighborhood") || t.includes("premise")) {
              name = c.long_name;
            }
            if (
              t.includes("locality") ||
              t.includes("administrative_area_level_2")
            ) {
              city = c.long_name;
            }
            if (t.includes("administrative_area_level_3")) {
              district = c.long_name;
            }
            if (t.includes("postal_code")) {
              pincode = c.long_name;
            }
          });
          if (!name) name = area || city || "Selected Location";
          setGeocodedInfo({
            name,
            address: formatted,
            area: area || undefined,
            city: city || undefined,
            district: district || undefined,
            pincode: pincode || undefined,
          });
        }
      });
    },
    [isLoaded],
  );

  const handleSelectPrediction = (
    prediction: google.maps.places.AutocompletePrediction,
  ) => {
    if (!isLoaded) return;
    if (!placesServiceRef.current) {
      const div = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "name"],
        sessionToken: sessionTokenRef.current || undefined,
      },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          saveRecentSearch({
            placeId: prediction.place_id,
            name:
              prediction.structured_formatting.main_text ||
              prediction.description,
            address:
              prediction.structured_formatting.secondary_text ||
              prediction.description,
            lat,
            lng,
            timestamp: Date.now(),
          });
          sessionTokenRef.current =
            new google.maps.places.AutocompleteSessionToken();
          updateMapCenter({ lat, lng });
          setScreen("map");
          setSearchValue("");
          setPredictions([]);
        }
      },
    );
  };

  const handleSelectRecent = (recent: RecentSearch) => {
    saveRecentSearch({ ...recent, timestamp: Date.now() });
    updateMapCenter({ lat: recent.lat, lng: recent.lng });
    setScreen("map");
  };

  const handleUseCurrentLocation = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const center = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        updateMapCenter(center);
        setLocating(false);
        setScreen("map");
      },
      () => {
        setLocating(false);
        toast.error("Unable to get your location");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleMapIdle = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();
    mapCenterRef.current = { lat, lng };

    if (!mapInitializedRef.current) {
      mapInitializedRef.current = true;
      // Geocode on first load
      reverseGeocode(lat, lng);
      return;
    }

    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (mapDraggedRef.current) {
      geocodeTimerRef.current = setTimeout(() => {
        mapDraggedRef.current = false;
        setMapMoving(false);
        reverseGeocode(lat, lng);
      }, 800);
    }
  }, [reverseGeocode]);

  const handleMapDragStart = useCallback(() => {
    mapDraggedRef.current = true;
    setMapMoving(true);
    setGeocodedInfo(null);
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
  }, []);

  const handleConfirm = async () => {
    if (!geocodedInfo) {
      toast.error("Please wait for location to load");
      return;
    }
    setSaving(true);
    try {
      const addr: SavedAddress = {
        id: `${Date.now()}`,
        label: geocodedInfo.name || "Other",
        address: manualAddress.trim() || geocodedInfo.address,
        customLocation: manualAddress.trim() || undefined,
        area: geocodedInfo.area,
        city: geocodedInfo.city,
        district: geocodedInfo.district,
        pincode: geocodedInfo.pincode,
        latitude: mapCenterRef.current.lat,
        longitude: mapCenterRef.current.lng,
        isDefault: false,
      };
      onSaved(addr);
      onClose();
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // ============ LANDING SCREEN ============
  if (screen === "landing") {
    return (
      <div className="fixed inset-0 z-[700] h-[100dvh] flex flex-col bg-white">
        {/* Map background (draggable) */}
        <div className="flex-1 relative">
          {isLoaded && !loadError ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={initialCenter}
              zoom={14}
              options={{
                zoomControl: false,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                gestureHandling: "greedy",
                disableDefaultUI: true,
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}

          {/* Overlay to dim the map slightly */}
          <div className="absolute inset-0 bg-white/20 pointer-events-none" />

          {/* Back button only */}
          <div className="absolute top-0 left-0 z-20 pt-3 px-3">
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          {/* Center pin on map */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
            <svg width="36" height="46" viewBox="0 0 40 50" fill="none">
              <path
                d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z"
                fill={accent}
              />
              <circle cx="20" cy="18" r="7" fill="white" />
            </svg>
          </div>
        </div>

        {/* Bottom card */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-30 shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">
          <div className="px-5 pt-6 pb-2">
            {/* Get the fastest delivery + illustration */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  Get the
                </h2>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  fastest delivery
                </h2>
              </div>
              {/* Map illustration */}
              <div className="w-20 h-20 relative">
                <div
                  className="w-full h-full rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${accent}10` }}
                >
                  <div className="relative">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <rect x="2" y="2" width="36" height="36" rx="4" fill={`${accent}20`} stroke={`${accent}40`} strokeWidth="1" />
                      <path d="M8 14h24M8 20h24M8 26h24" stroke={`${accent}30`} strokeWidth="0.5" />
                      <path d="M14 8v24M20 8v24M26 8v24" stroke={`${accent}30`} strokeWidth="0.5" />
                    </svg>
                    <div
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: accent }}
                    >
                      <MapPin className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Turn on device location button */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold disabled:opacity-60 mb-5"
              style={{ backgroundColor: accent }}
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              Turn on device location
            </button>
          </div>

          {/* Search bar at bottom */}
          <div className="px-5 pb-6 pt-2 border-t border-gray-100">
            <button
              onClick={() => setScreen("map")}
              className="w-full relative"
            >
              <input
                type="text"
                placeholder="Search an area or address"
                readOnly
                className="w-full h-12 pl-4 pr-12 rounded-xl border border-gray-200 text-sm text-gray-700 cursor-pointer placeholder:text-gray-400 bg-white"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="h-safe-area-bottom" />
        </div>
      </div>
    );
  }

  // ============ MAP CONFIRM SCREEN ============
  return (
    <div className="fixed inset-0 z-[700] h-[100dvh] flex flex-col bg-white">
      <div className="flex-1 relative">
        {loadError ? (
          <div className="flex items-center justify-center h-full text-red-600">
            <p>Error loading maps</p>
          </div>
        ) : !isLoaded ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={17}
            onLoad={(map) => {
              mapRef.current = map;
              mapInitializedRef.current = false;
              // Add hotel marker
              if (hotelCoords) {
                hotelMarkerRef.current?.setMap(null);
                hotelMarkerRef.current = new google.maps.Marker({
                  position: hotelCoords,
                  map,
                  icon: {
                    url: GREEN_PIN_SVG,
                    scaledSize: new google.maps.Size(32, 42),
                    anchor: new google.maps.Point(16, 42),
                  },
                  title: hotelData?.store_name || "Restaurant",
                  zIndex: 5,
                });
              }
            }}
            onIdle={handleMapIdle}
            onDragStart={handleMapDragStart}
            options={{
              zoomControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              gestureHandling: "greedy",
            }}
          />
        )}

        {/* Center pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
          <svg width="40" height="50" viewBox="0 0 40 50" fill="none">
            <path
              d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z"
              fill={accent}
            />
            <circle cx="20" cy="18" r="7" fill="white" />
          </svg>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-0.5 pointer-events-none z-10">
          <div className="w-3 h-1 bg-black/20 rounded-full" />
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-white shadow-sm">
          <div className="px-4 py-4 flex items-center gap-3">
            <button onClick={onClose} className="p-1">
              <ArrowLeft className="h-6 w-6 text-gray-900" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              Confirm Location
            </h1>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search an area or address"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full h-12 pl-4 pr-12 rounded-xl border border-gray-200 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              {searchValue.trim() ? (
                <button
                  onClick={() => { setSearchValue(""); setPredictions([]); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              ) : (
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              )}
            </div>
            {/* Search results dropdown */}
            {searchValue.trim() && predictions.length > 0 && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.place_id}
                    onClick={() => handleSelectPrediction(prediction)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0"
                  >
                    <Search className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {prediction.structured_formatting.main_text}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current location FAB */}
        <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium bg-white text-gray-900 disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: accent }} />
            ) : (
              <LocateFixed className="h-4 w-4" style={{ color: accent }} />
            )}
            Current location
          </button>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="rounded-t-3xl -mt-6 relative z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] bg-white">
        <div className="px-5 pt-5 pb-4">
          <p className="text-[15px] font-semibold text-gray-900">
            Order will be delivered here
          </p>
          <p className="text-xs mt-0.5 text-gray-500">
            Place the pin at exact delivery location
          </p>

          {mapMoving || geocoding ? (
            <div className="flex items-start gap-2.5 mt-4 animate-pulse">
              <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 bg-gray-200" />
              <div className="flex-1 min-w-0">
                <div className="h-4 rounded w-2/3 bg-gray-200" />
                <div className="h-3 rounded w-full mt-2 bg-gray-100" />
              </div>
            </div>
          ) : geocodedInfo ? (
            <div className="flex items-start gap-2.5 mt-4">
              <MapPin className="h-5 w-5 shrink-0 mt-0.5" style={{ color: accent }} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-gray-900">
                  {geocodedInfo.name}
                </p>
                <p className="text-xs mt-0.5 text-gray-500 line-clamp-2">
                  {geocodedInfo.address}
                </p>
              </div>
            </div>
          ) : null}

          <textarea
            placeholder="Enter complete address (flat/house no, street, landmark)"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            rows={2}
            className="w-full mt-4 p-3 rounded-xl border border-gray-200 bg-white text-sm resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />

          <button
            onClick={handleConfirm}
            disabled={saving || geocoding || mapMoving || !geocodedInfo}
            className="w-full mt-5 h-14 text-white rounded-2xl font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
            style={{ backgroundColor: accent }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </span>
            ) : (
              "Confirm & proceed"
            )}
          </button>
        </div>
        <div className="h-safe-area-bottom" />
      </div>
    </div>
  );
};

export default AddressPickerV2;
