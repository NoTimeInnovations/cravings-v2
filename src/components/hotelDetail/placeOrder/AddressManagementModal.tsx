"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  LocateFixed,
  Search,
  X,
  Clock,
  Trash2,
} from "lucide-react";
import {
  GoogleMap,
  useLoadScript,
} from "@react-google-maps/api";
import { HotelData } from "@/app/hotels/[...id]/page";

// Local types for user addresses (stored in users.addresses jsonb)
export type SavedAddress = {
  id: string;
  label: string;
  customLabel?: string;
  house_no?: string;
  flat_no?: string;
  street?: string;
  road_no?: string;
  area?: string;
  landmark?: string;
  city?: string;
  district?: string;
  pincode?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  customLocation?: string;
};

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

// Google Maps configuration
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 10.050525, lng: 76.322455 };
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];
const RECENT_SEARCHES_KEY = "recent-address-searches";
const MAX_RECENT = 5;
const GREEN_PIN_SVG = `data:image/svg+xml,${encodeURIComponent('<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#16a34a"/><circle cx="16" cy="14.5" r="6" fill="white"/></svg>')}`;


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

const DEFAULT_ACCENT = "#EA580C";

export type AddressModalTheme = {
  accent?: string;
  bg?: string;
  text?: string;
  showGrid?: boolean;
};

const AddressManagementModal = ({
  open,
  onClose,
  onSaved,
  editAddress = null,
  hotelData,
  savedAddresses = [],
  onDeleteAddress,
  theme: themeProp,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (addr: SavedAddress) => void;
  editAddress?: SavedAddress | null;
  hotelData: HotelData;
  savedAddresses?: SavedAddress[];
  onDeleteAddress?: (addressId: string) => void;
  theme?: AddressModalTheme;
}) => {
  // Use theme from props first, then localStorage fallback
  const [accent, setAccent] = useState(themeProp?.accent || DEFAULT_ACCENT);
  const [themeBg, setThemeBg] = useState(themeProp?.bg || "#F5F5F5");
  const [themeText, setThemeText] = useState(themeProp?.text || "#000000");
  const [showGrid, setShowGrid] = useState(themeProp?.showGrid === true);
  useEffect(() => {
    // If theme prop is provided, use it directly
    if (themeProp) {
      if (themeProp.accent) setAccent(themeProp.accent);
      if (themeProp.bg) setThemeBg(themeProp.bg);
      if (themeProp.text) setThemeText(themeProp.text);
      setShowGrid(themeProp.showGrid === true);
      return;
    }
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem("hotelTheme");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accent) setAccent(parsed.accent);
        if (parsed.bg) setThemeBg(parsed.bg);
        if (parsed.text) setThemeText(parsed.text);
        setShowGrid(parsed.showGrid === true);
      }
    } catch {}
  }, [themeProp]);

  // Glassmorphism card styles matching PlaceOrderModal
  const isDark = (() => {
    const c = themeText.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
  })();
  const cardBg = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.04)";
  const cardBorder = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.08)";
  const cardDivider = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";

  // Screen: "search" or "map"
  const [screen, setScreen] = useState<"search" | "map">("search");
  const [searchValue, setSearchValue] = useState("");
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const initialCenter = hotelData?.geo_location && typeof hotelData.geo_location === "object" && "coordinates" in hotelData.geo_location
    ? { lat: hotelData.geo_location.coordinates[1], lng: hotelData.geo_location.coordinates[0] }
    : DEFAULT_CENTER;
  const [mapCenter, _setMapCenter] = useState<{ lat: number; lng: number }>(
    initialCenter,
  );
  const updateMapCenter = useCallback((c: { lat: number; lng: number }) => {
    _setMapCenter(c);
    mapCenterRef.current = c;
  }, []);
  const [geocodedInfo, setGeocodedInfo] = useState<GeocodedInfo | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [mapMoving, setMapMoving] = useState(false);

  const [hotelMarkerVisible, setHotelMarkerVisible] = useState(true);
  const [hotelDirection, setHotelDirection] = useState<{ angle: number } | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const mapCenterRef = useRef<{ lat: number; lng: number }>(mapCenter);
  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hotelMarkerRef = useRef<google.maps.Marker | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const mapInitializedRef = useRef(false);
  const mapDraggedRef = useRef(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Hotel coordinates from geo_location
  const hotelCoords = hotelData?.geo_location && typeof hotelData.geo_location === "object" && "coordinates" in hotelData.geo_location
    ? { lat: hotelData.geo_location.coordinates[1], lng: hotelData.geo_location.coordinates[0] }
    : null;

  // Initialize services when loaded
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current =
        new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Add hotel marker when map loads
  useEffect(() => {
    if (!mapRef.current || !hotelCoords || !isLoaded) return;
    if (hotelMarkerRef.current) return; // already added

    hotelMarkerRef.current = new google.maps.Marker({
      position: hotelCoords,
      map: mapRef.current,
      icon: {
        url: GREEN_PIN_SVG,
        scaledSize: new google.maps.Size(32, 42),
        anchor: new google.maps.Point(16, 42),
      },
      title: hotelData?.store_name || "Restaurant",
      zIndex: 5,
    });

    return () => {
      hotelMarkerRef.current?.setMap(null);
      hotelMarkerRef.current = null;
    };
  }, [isLoaded, hotelCoords, hotelData?.store_name]);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setSearchValue("");
      setPredictions([]);
      setGeocodedInfo(null);
      setManualAddress("");
      setMapMoving(false);
      mapInitializedRef.current = false;
      if (isLoaded) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }
      hotelMarkerRef.current?.setMap(null);
      hotelMarkerRef.current = null;
      setHotelMarkerVisible(true);
      setHotelDirection(null);

      if (editAddress?.latitude && editAddress?.longitude) {
        const center = {
          lat: editAddress.latitude,
          lng: editAddress.longitude,
        };
        updateMapCenter(center);
        setScreen("map");
      } else {
        // Default map center to hotel location
        if (hotelCoords) {
          updateMapCenter(hotelCoords);
        }
        setScreen("search");
      }
    }
  }, [open, editAddress]);

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
  }, [searchValue, isLoaded, hotelData?.country_code]);

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
            if (
              t.includes("sublocality_level_1") ||
              t.includes("sublocality")
            ) {
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

    // Need a PlacesService to get details
    if (!placesServiceRef.current) {
      // Create a temporary div for PlacesService
      const div = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }

    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ["geometry", "name"], sessionToken: sessionTokenRef.current || undefined },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const center = { lat, lng };

          saveRecentSearch({
            placeId: prediction.place_id,
            name:
              prediction.structured_formatting.main_text || prediction.description,
            address:
              prediction.structured_formatting.secondary_text ||
              prediction.description,
            lat,
            lng,
            timestamp: Date.now(),
          });

          // Reset session token after place details fetch (completes the billing session)
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

          updateMapCenter(center);
          setScreen("map");
          setSearchValue("");
          setPredictions([]);
        }
      },
    );
  };

  const handleSelectRecent = (recent: RecentSearch) => {
    const center = { lat: recent.lat, lng: recent.lng };
    saveRecentSearch({ ...recent, timestamp: Date.now() });
    updateMapCenter(center);
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

        if (screen === "search") {
          setScreen("map");
        } else if (mapRef.current) {
          mapRef.current.panTo(center);
        }
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

    // Mark initialized after first idle (skip geocode timer during init)
    if (!mapInitializedRef.current) {
      console.log("[Map] Initialized");
      mapInitializedRef.current = true;
    }

    // Check if hotel marker is visible in bounds
    if (hotelCoords) {
      const bounds = mapRef.current.getBounds();
      const hotelLatLng = new google.maps.LatLng(hotelCoords.lat, hotelCoords.lng);
      if (bounds && bounds.contains(hotelLatLng)) {
        setHotelMarkerVisible(true);
        setHotelDirection(null);
      } else {
        setHotelMarkerVisible(false);
        const dLng = hotelCoords.lng - lng;
        const dLat = hotelCoords.lat - lat;
        const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
        setHotelDirection({ angle });
      }
    }

    // Auto reverse-geocode after 1.2s only if user dragged/zoomed
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (mapDraggedRef.current) {
      geocodeTimerRef.current = setTimeout(() => {
        mapDraggedRef.current = false;
        console.log("[Map] Idle — fetching address");
        setMapMoving(false);
        reverseGeocode(lat, lng);
      }, 1200);
    }
  }, [hotelCoords, reverseGeocode]);

  const handleMapDragStart = useCallback(() => {
    if (!mapInitializedRef.current) return;
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
        id: editAddress?.id || `${Date.now()}`,
        label: editAddress?.label || geocodedInfo.name || "Other",
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
      toast.success(
        editAddress
          ? "Address updated successfully"
          : "Address saved successfully",
      );
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // ============ SEARCH SCREEN ============
  if (screen === "search") {
    const hasSearch = searchValue.trim().length > 0;

    return (
      <div
        className="fixed inset-0 z-[70] h-[100dvh] flex flex-col"
        style={{
          backgroundColor: themeBg,
          ...(showGrid && {
            backgroundImage: `linear-gradient(${themeText}0D 1px, transparent 1px), linear-gradient(90deg, ${themeText}0D 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }),
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 shrink-0">
          <button
            onClick={onClose}
            className="p-1"
          >
            <ArrowLeft className="h-6 w-6" style={{ color: themeText }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: themeText }}>
            Select Your Location
          </h1>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-3 shrink-0">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search an area or address"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full h-12 pl-4 pr-12 rounded-xl outline-none transition-colors text-[15px]"
              style={{
                backgroundColor: cardBg,
                backdropFilter: "blur(12px)",
                color: themeText,
                border: `1px solid ${cardBorder}`,
              }}
              autoFocus
            />
            {hasSearch ? (
              <button
                onClick={() => {
                  setSearchValue("");
                  setPredictions([]);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <X className="h-5 w-5" style={{ color: `${themeText}66` }} />
              </button>
            ) : (
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: `${themeText}66` }} />
            )}
          </div>
        </div>

        {/* Use Current Location */}
        {!hasSearch && (
          <div className="px-4 pb-4 shrink-0">
            <button
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl text-[15px] font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: cardBg, backdropFilter: "blur(12px)", border: `1px solid ${cardBorder}`, color: themeText }}
            >
              {locating ? (
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: accent }} />
              ) : (
                <LocateFixed className="h-5 w-5" style={{ color: accent }} />
              )}
              Use Current Location
            </button>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto">
          {hasSearch ? (
            <>
              <div className="px-4 pt-2 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: `${themeText}66` }}>
                  Search Results
                </p>
              </div>
              {predictions.length === 0 && (
                <div className="px-4 py-8 text-center text-sm" style={{ color: `${themeText}66` }}>
                  {isLoaded ? "No results found" : "Loading..."}
                </div>
              )}
              <div className="mx-4 rounded-xl overflow-hidden" style={{ backgroundColor: cardBg, backdropFilter: "blur(12px)", border: `1px solid ${cardBorder}` }}>
                {predictions.map((prediction, idx) => {
                  const isRecent = recentSearches.some(
                    (r) => r.placeId === prediction.place_id,
                  );

                  return (
                    <button
                      key={prediction.place_id}
                      onClick={() => handleSelectPrediction(prediction)}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors"
                      style={idx < predictions.length - 1 ? { borderBottom: `1px solid ${cardDivider}` } : undefined}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${themeText}0A` }}>
                        {isRecent ? (
                          <Clock className="h-4 w-4" style={{ color: `${themeText}80` }} />
                        ) : (
                          <Search className="h-4 w-4" style={{ color: `${themeText}80` }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold truncate" style={{ color: themeText }}>
                          {prediction.structured_formatting.main_text}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: `${themeText}80` }}>
                          {prediction.structured_formatting.secondary_text}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <>
                  <div className="px-4 pt-2 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: `${themeText}66` }}>
                      Saved Addresses
                    </p>
                  </div>
                  <div className="mx-4 rounded-xl overflow-hidden mb-3" style={{ backgroundColor: cardBg, backdropFilter: "blur(12px)", border: `1px solid ${cardBorder}` }}>
                    {savedAddresses.map((addr, idx) => (
                        <div
                          key={addr.id}
                          className="flex items-center gap-3.5 px-4 py-3.5 transition-colors"
                          style={idx < savedAddresses.length - 1 ? { borderBottom: `1px solid ${cardDivider}` } : undefined}
                        >
                          <button
                            onClick={() => {
                              onSaved(addr);
                              onClose();
                            }}
                            className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                          >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}15` }}>
                              <MapPin className="h-4 w-4" style={{ color: accent }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-semibold truncate" style={{ color: themeText }}>
                                {addr.label}
                              </p>
                              <p className="text-xs truncate mt-0.5" style={{ color: `${themeText}80` }}>
                                {addr.address ||
                                  [addr.flat_no, addr.house_no, addr.area, addr.city]
                                    .filter(Boolean)
                                    .join(", ")}
                              </p>
                            </div>
                          </button>
                          {onDeleteAddress && (
                            <button
                              onClick={() => onDeleteAddress(addr.id)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          )}
                        </div>
                    ))}
                  </div>
                </>
              )}

              {recentSearches.length > 0 && (
                <>
                  <div className="px-4 pt-2 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: `${themeText}66` }}>
                      Recently Searched
                    </p>
                  </div>
                  <div className="mx-4 rounded-xl overflow-hidden" style={{ backgroundColor: cardBg, backdropFilter: "blur(12px)", border: `1px solid ${cardBorder}` }}>
                    {recentSearches.map((recent, idx) => (
                        <button
                          key={recent.placeId}
                          onClick={() => handleSelectRecent(recent)}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors"
                          style={idx < recentSearches.length - 1 ? { borderBottom: `1px solid ${cardDivider}` } : undefined}
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${themeText}0A` }}>
                            <Clock className="h-4 w-4" style={{ color: `${themeText}80` }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-semibold truncate" style={{ color: themeText }}>
                              {recent.name}
                            </p>
                            <p className="text-xs truncate mt-0.5" style={{ color: `${themeText}80` }}>
                              {recent.address}
                            </p>
                          </div>
                        </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ============ MAP SCREEN ============
  return (
    <div className="fixed inset-0 z-[70] h-[100dvh] flex flex-col" style={{ backgroundColor: themeBg }}>
      {/* Map fills the screen */}
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
              // Auto-geocode on first load
              reverseGeocode(mapCenter.lat, mapCenter.lng);
              // Add hotel marker
              if (hotelCoords && !hotelMarkerRef.current) {
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

        {/* Fixed center pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
          <svg
            width="40"
            height="50"
            viewBox="0 0 40 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z"
              fill={accent}
            />
            <circle cx="20" cy="18" r="7" fill="white" />
          </svg>
        </div>
        {/* Pin shadow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-0.5 pointer-events-none z-10">
          <div className="w-3 h-1 bg-black/20 rounded-full" />
        </div>

        {/* Hotel direction indicator when marker is off-screen */}
        {!hotelMarkerVisible && hotelDirection && hotelCoords && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div
              className="absolute"
              style={{
                // Position the indicator at the edge of the screen in the direction of the hotel
                top: `${50 - Math.cos(hotelDirection.angle * Math.PI / 180) * 40}%`,
                left: `${50 + Math.sin(hotelDirection.angle * Math.PI / 180) * 40}%`,
                transform: `translate(-50%, -50%) rotate(${hotelDirection.angle}deg)`,
              }}
            >
              <div className="flex flex-col items-center">
                {/* Arrow pointing toward hotel */}
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 4L8 16h12L14 4z" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                </svg>
                <span className="text-[10px] font-bold rounded px-1.5 py-0.5 mt-0.5 shadow-sm whitespace-nowrap"
                  style={{ transform: `rotate(${-hotelDirection.angle}deg)`, color: "#16a34a", backgroundColor: `${themeBg}E6` }}
                >
                  {hotelData?.store_name || "Restaurant"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top overlay: back + title + search */}
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top shadow-sm" style={{ backgroundColor: themeBg }}>
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setScreen("search")}
              className="p-1"
            >
              <ArrowLeft className="h-6 w-6" style={{ color: themeText }} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: themeText }}>
              Confirm Location
            </h1>
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={() => setScreen("search")}
              className="relative w-full"
            >
              <input
                type="text"
                placeholder="Search an area or address"
                readOnly
                className="w-full h-12 pl-4 pr-12 rounded-xl text-[15px] cursor-pointer"
                style={{ backgroundColor: cardBg, backdropFilter: "blur(12px)", color: themeText, border: `1px solid ${cardBorder}` }}
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: `${themeText}66` }} />
            </button>
          </div>
        </div>

        {/* Current location button */}
        <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium disabled:opacity-50"
            style={{ color: themeText, backgroundColor: themeBg }}
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
      <div className="rounded-t-3xl -mt-6 relative z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ backgroundColor: themeBg }}>
        <div className="px-5 pt-5 pb-4">
          <p className="text-[15px] font-semibold" style={{ color: themeText }}>
            Order will be delivered here
          </p>
          <p className="text-xs mt-0.5" style={{ color: `${themeText}66` }}>
            Place the pin or exact delivery location
          </p>

          {mapMoving || geocoding ? (
            <div className="flex items-start gap-2.5 mt-4 animate-pulse">
              <div className="w-5 h-5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: `${themeText}1D` }} />
              <div className="flex-1 min-w-0">
                <div className="h-4 rounded w-2/3" style={{ backgroundColor: `${themeText}1D` }} />
                <div className="h-3 rounded w-full mt-2" style={{ backgroundColor: `${themeText}0D` }} />
              </div>
            </div>
          ) : geocodedInfo ? (
            <div className="flex items-start gap-2.5 mt-4">
              <MapPin className="h-5 w-5 shrink-0 mt-0.5" style={{ color: accent }} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold" style={{ color: themeText }}>
                  {geocodedInfo.name}
                </p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: `${themeText}80` }}>
                  {geocodedInfo.address}
                </p>
              </div>
            </div>
          ) : null}

          <textarea
            placeholder="Enter complete address - optional (flat/house no, street, landmark)"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            rows={2}
            className="w-full mt-4 p-3 rounded-xl outline-none transition-colors text-[14px] resize-none"
            style={{ backgroundColor: cardBg, backdropFilter: "blur(12px)", color: themeText, border: `1px solid ${cardBorder}` }}
          />

          <button
            onClick={handleConfirm}
            disabled={saving || geocoding || mapMoving || !geocodedInfo}
            className="w-full mt-5 h-14 text-white rounded-2xl font-bold text-[16px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
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

        {/* Safe area bottom padding */}
        <div className="h-safe-area-bottom" />
      </div>
    </div>
  );
};

export default AddressManagementModal;
