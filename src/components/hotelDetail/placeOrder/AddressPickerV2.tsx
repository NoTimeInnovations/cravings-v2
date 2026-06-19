"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackMaps } from "@/lib/mapsUsage";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  LocateFixed,
  Search,
  X,
  Home,
  Building2,
  Navigation,
} from "lucide-react";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import { HotelData } from "@/app/hotels/[...id]/page";
import type { SavedAddress } from "./AddressManagementModal";
import reverseQarsFromCoord, {
  type QarsReverseResult,
} from "@/app/actions/reverseQarsFromCoord";

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

// Parse Google address_components + formatted_address into our GeocodedInfo.
// Used for BOTH reverse-geocode results and Place Details results — both return
// the same google.maps.GeocoderAddressComponent[] shape — so picking a
// suggestion can use the Place Details address directly with no extra
// reverse-geocode round-trip on first map load.
function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[],
  formatted: string,
): GeocodedInfo {
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
    if (t.includes("locality") || t.includes("administrative_area_level_2")) {
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
  return {
    name,
    address: formatted,
    area: area || undefined,
    city: city || undefined,
    district: district || undefined,
    pincode: pincode || undefined,
  };
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 10.050525, lng: 76.322455 };
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];
const RECENT_SEARCHES_KEY = "recent-address-searches";
const MAX_RECENT = 5;

// Stable identities so react-google-maps doesn't re-run setOptions()/restyle the
// live map on every parent re-render — repeated setOptions calls interrupt the
// touch gesture and make dragging feel laggy/stuck on mobile.
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" } as const;
const MAP_OPTIONS: google.maps.MapOptions = {
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
  clickableIcons: false,
};
const MAP_OPTIONS_LANDING: google.maps.MapOptions = {
  ...MAP_OPTIONS,
  disableDefaultUI: true,
};

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

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const SHOP_PIN_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">' +
    // pin teardrop
    '<path d="M20 1.5C10.1 1.5 2 9.4 2 19c0 12.8 18 29 18 29s18-16.2 18-29C38 9.4 29.9 1.5 20 1.5z" fill="#EA580C" stroke="#1f2937" stroke-width="1.2" stroke-linejoin="round"/>' +
    // white inner badge
    '<circle cx="20" cy="18" r="10.5" fill="white"/>' +
    // lucide Store icon, scaled into the badge
    '<g transform="translate(13 11) scale(0.58)" fill="none" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>' +
      '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>' +
      '<path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>' +
      '<path d="M2 7h20"/>' +
      '<path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>' +
    '</g>' +
    "</svg>",
)}`;

const AddressPickerV2 = ({
  open,
  onClose,
  onSaved,
  hotelData,
  accent = "#EA580C",
  initialPick,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (addr: SavedAddress) => void;
  hotelData: HotelData;
  accent?: string;
  initialPick?: { address?: string; coords: { lat: number; lng: number } } | null;
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

  const [mapCenter] = useState(initialCenter);
  const updateMapCenter = useCallback((c: { lat: number; lng: number }) => {
    mapCenterRef.current = c;
    if (mapRef.current) {
      mapRef.current.panTo(c);
    }
  }, []);

  const [geocodedInfo, setGeocodedInfo] = useState<GeocodedInfo | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  // House / flat / floor details the customer types in, plus a simple label.
  const [detailsText, setDetailsText] = useState("");
  const [addressType, setAddressType] = useState<"Home" | "Office" | "Other">("Other");
  const [locating, setLocating] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [mapMoving, setMapMoving] = useState(false);
  const [pinDistanceKm, setPinDistanceKm] = useState<number | null>(null);
  // Qatar: the nearest blue-plate (QARS) building resolved from the current pin.
  const [qarsHit, setQarsHit] = useState<QarsReverseResult | null>(null);

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
  const radiusCircleRef = useRef<google.maps.Circle | null>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const mapInitializedRef = useRef(false);
  const mapDraggedRef = useRef(false);
  // True once an address is known without geocoding (set from Place Details on a
  // suggestion pick) → lets the map's first-load reverse-geocode be skipped.
  const pinAddressKnownRef = useRef(false);

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

  const radiusKm = hotelData?.delivery_rules?.delivery_radius;
  const isPinOutOfRange =
    !!radiusKm && pinDistanceKm != null && pinDistanceKm > radiusKm;

  // Qatar partners can refine the rough Google pin to an exact building using
  // their blue-plate (QARS) Zone / Street / Building numbers.
  const isQatar =
    (hotelData as any)?.country === "Qatar" ||
    (hotelData as any)?.country_code === "+974";

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
    // If caller already provided a pick (search result / current location from
    // the bottom sheet), skip permission probing — we'll center on initialPick.
    if (initialPick?.coords) return;
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
  }, [open, initialPick?.coords]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearchValue("");
      setPredictions([]);
      setGeocodedInfo(null);
      setDetailsText("");
      setAddressType("Other");
      setMapMoving(false);
      mapInitializedRef.current = false;
      mapDraggedRef.current = false;
      // Clear any leaked "address known" from a previous session — the picker
      // stays mounted across open/close, so a stale true would wrongly skip the
      // first-load reverse-geocode on edit / pick-on-map / current-location.
      pinAddressKnownRef.current = false;
      hotelMarkerRef.current?.setMap(null);
      hotelMarkerRef.current = null;
      if (isLoaded) {
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
      }
      if (initialPick?.coords) {
        // Jump straight to the map screen, centered on the chosen point.
        setScreen("map");
        updateMapCenter(initialPick.coords);
      } else {
        setScreen("landing");
        if (hotelCoords) updateMapCenter(hotelCoords);
      }
    }
  }, [open, initialPick?.coords?.lat, initialPick?.coords?.lng]);

  // Debounced search
  useEffect(() => {
    if (!isLoaded || !autocompleteServiceRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue.trim().length < 3) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void trackMaps({ api: "autocomplete", partnerId: hotelData?.id, source: "checkout_v2_address" });
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
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, isLoaded]);

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!isLoaded) return;
      setGeocoding(true);
      const geocoder = new google.maps.Geocoder();
      void trackMaps({ api: "geocode", partnerId: hotelData?.id, source: "checkout_v2_address" });
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setGeocoding(false);
        if (status === "OK" && results && results[0]) {
          setGeocodedInfo(
            parseAddressComponents(
              results[0].address_components,
              results[0].formatted_address,
            ),
          );
        }
      });
    },
    [isLoaded],
  );

  // Qatar only: resolve the nearest blue-plate building from the settled pin,
  // snap the pin to its exact coordinate, and refresh the address label. Falls
  // back to a plain Google reverse-geocode when no building is found nearby.
  const refineWithQars = useCallback(
    async (lat: number, lng: number) => {
      setGeocoding(true);
      try {
        const hit = await reverseQarsFromCoord(lat, lng);
        if (hit) {
          setQarsHit(hit);
          const [bLng, bLat] = hit.coordinates;
          updateMapCenter({ lat: bLat, lng: bLng }); // snap to exact building
          reverseGeocode(bLat, bLng);
          return;
        }
        setQarsHit(null);
      } catch {
        setQarsHit(null);
      }
      reverseGeocode(lat, lng);
    },
    [updateMapCenter, reverseGeocode],
  );

  // Cancel any in-flight drag reverse-geocode so a handler that takes ownership
  // of the address isn't later clobbered by the debounced drag geocode firing
  // with the previously-dragged coords (and re-enable Confirm immediately).
  const cancelPendingDragGeocode = () => {
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    }
    mapDraggedRef.current = false;
    setMapMoving(false);
  };

  const handleSelectPrediction = (
    prediction: google.maps.places.AutocompletePrediction,
  ) => {
    if (!isLoaded) return;
    if (!placesServiceRef.current) {
      const div = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }
    void trackMaps({ api: "place_details", partnerId: hotelData?.id, source: "checkout_v2_address" });
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "name", "formatted_address", "address_components"],
        sessionToken: sessionTokenRef.current || undefined,
      },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          // Use the Place Details address directly (skipping the first-load
          // reverse-geocode) only when it's usable and non-Qatar. Otherwise the
          // handler resolves the pin ITSELF — directly, not via the once-only
          // first-load idle — so a second pick / Qatar refinement / missing
          // formatted_address never leaves a stale or empty address on the
          // persistent map. Either way the handler owns the address, so the
          // first-load idle below is told to skip.
          cancelPendingDragGeocode();
          pinAddressKnownRef.current = true;
          if (place.address_components && place.formatted_address && !isQatar) {
            setGeocodedInfo(
              parseAddressComponents(
                place.address_components,
                place.formatted_address,
              ),
            );
          } else {
            setGeocodedInfo(null);
            setQarsHit(null);
            if (isQatar) refineWithQars(lat, lng);
            else reverseGeocode(lat, lng);
          }
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
    // Recents store only a label, not structured components → resolve the pin
    // directly (handler-owned), so it works even on a re-pick where the map
    // doesn't remount and the first-load idle won't re-fire.
    saveRecentSearch({ ...recent, timestamp: Date.now() });
    cancelPendingDragGeocode();
    setGeocodedInfo(null);
    setQarsHit(null);
    updateMapCenter({ lat: recent.lat, lng: recent.lng });
    setScreen("map");
    pinAddressKnownRef.current = true;
    if (isQatar) refineWithQars(recent.lat, recent.lng);
    else reverseGeocode(recent.lat, recent.lng);
  };

  const handleUseCurrentLocation = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const center = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        cancelPendingDragGeocode();
        setGeocodedInfo(null);
        setQarsHit(null);
        updateMapCenter(center);
        setLocating(false);
        setScreen("map");
        // Resolve directly (handler-owned) so it works even when the map is
        // already mounted and the first-load idle won't re-fire.
        pinAddressKnownRef.current = true;
        if (isQatar) refineWithQars(center.lat, center.lng);
        else reverseGeocode(center.lat, center.lng);
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
    if (hotelCoords) {
      setPinDistanceKm(haversineKm(hotelCoords, { lat, lng }));
    }

    if (!mapInitializedRef.current) {
      mapInitializedRef.current = true;
      // First load: resolve the pin ONLY when a handler hasn't already taken
      // ownership of the address (suggestion / recent / current-location all set
      // pinAddressKnownRef + resolve directly). Gating BOTH branches stops the
      // Qatar path from re-running refineWithQars after the handler already did.
      if (!pinAddressKnownRef.current) {
        if (isQatar) refineWithQars(lat, lng);
        else reverseGeocode(lat, lng);
      }
      return;
    }

    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (mapDraggedRef.current) {
      geocodeTimerRef.current = setTimeout(() => {
        mapDraggedRef.current = false;
        setMapMoving(false);
        if (isQatar) refineWithQars(lat, lng);
        else reverseGeocode(lat, lng);
      }, 800);
    }
  }, [reverseGeocode, refineWithQars, isQatar, hotelCoords]);

  const handleMapDragStart = useCallback(() => {
    // The pin moved off the picked place → its address must be re-derived.
    pinAddressKnownRef.current = false;
    mapDraggedRef.current = true;
    setMapMoving(true);
    setGeocodedInfo(null);
    setPinDistanceKm(null);
    setQarsHit(null);
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
  }, []);

  const handleConfirm = async () => {
    if (!geocodedInfo) {
      toast.error("Please wait for location to load");
      return;
    }
    if (isPinOutOfRange) {
      toast.error(
        `This location is ${pinDistanceKm?.toFixed(1)} km away — outside the ${radiusKm} km delivery range`,
      );
      return;
    }
    setSaving(true);
    try {
      // For Qatar, prepend the derived blue-plate so the saved address carries
      // the canonical Zone/Street/Building drivers actually use.
      const bluePlate = qarsHit
        ? `Zone ${qarsHit.zone}, Street ${qarsHit.street}, Building ${qarsHit.building}`
        : "";
      // Prepend the typed flat/floor/building details (if any) to the map
      // address so the delivery person sees them first.
      const details = detailsText.trim();
      const baseAddress = geocodedInfo.address;
      const withDetails = details ? `${details}, ${baseAddress}` : baseAddress;
      const fullAddress = bluePlate ? `${bluePlate} — ${withDetails}` : withDetails;
      const addr: SavedAddress = {
        id: `${Date.now()}`,
        label: addressType,
        address: fullAddress,
        placeName: geocodedInfo.name || geocodedInfo.area || undefined,
        house_no: details || undefined,
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
      <div className="fixed inset-0 z-[700] h-[100dvh] flex flex-col bg-white animate-fade-in">
        {/* Map background (draggable) */}
        <div className="flex-1 relative">
          {isLoaded && !loadError ? (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={initialCenter}
              zoom={14}
              options={MAP_OPTIONS_LANDING}
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
    <div className="fixed inset-0 z-[700] h-[100dvh] flex flex-col bg-white animate-fade-in">
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
            mapContainerStyle={MAP_CONTAINER_STYLE}
            zoom={17}
            onLoad={(map) => {
              void trackMaps({ api: "maps_js", partnerId: hotelData?.id, source: "checkout_v2_address" });
              mapRef.current = map;
              mapInitializedRef.current = false;
              map.setCenter(mapCenterRef.current);
              if (hotelCoords) {
                hotelMarkerRef.current?.setMap(null);
                hotelMarkerRef.current = new google.maps.Marker({
                  position: hotelCoords,
                  map,
                  icon: {
                    url: SHOP_PIN_SVG,
                    scaledSize: new google.maps.Size(36, 45),
                    anchor: new google.maps.Point(18, 45),
                  },
                  title: hotelData?.store_name || "Restaurant",
                  zIndex: 5,
                });
                const radiusKm = hotelData?.delivery_rules?.delivery_radius;
                if (radiusKm && radiusKm > 0) {
                  radiusCircleRef.current?.setMap(null);
                  radiusCircleRef.current = new google.maps.Circle({
                    map,
                    center: hotelCoords,
                    radius: radiusKm * 1000, // km → metres
                    strokeColor: "#f97316",
                    strokeOpacity: 0.6,
                    strokeWeight: 2,
                    fillColor: "#f97316",
                    fillOpacity: 0.08,
                    clickable: false,
                    zIndex: 1,
                  });
                }
              }
            }}
            onIdle={handleMapIdle}
            onDragStart={handleMapDragStart}
            options={MAP_OPTIONS}
          />
        )}

        {/* Center pin (customer location) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
          <svg width="40" height="50" viewBox="0 0 40 50" fill="none">
            <path
              d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z"
              fill="#16a34a"
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

          {isPinOutOfRange && !mapMoving && (
            <div className="flex items-start gap-2.5 mt-4 p-3 rounded-xl border border-red-200 bg-red-50">
              <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-red-700">
                  Outside delivery range
                </p>
                <p className="text-xs mt-0.5 text-red-600">
                  This location is {pinDistanceKm?.toFixed(1)} km away. {hotelData?.store_name || "This store"} delivers within {radiusKm} km.
                </p>
              </div>
            </div>
          )}

          {isQatar && qarsHit && !mapMoving && !geocoding && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <p className="text-xs text-gray-700">
                <span className="font-semibold">Exact building</span>
                {" · "}Zone {qarsHit.zone}, Street {qarsHit.street}, Building {qarsHit.building}
              </p>
            </div>
          )}

          {geocodedInfo && !mapMoving && !isPinOutOfRange && (
            <div className="mt-4 space-y-2.5">
              {/* Flat / floor / building — typed details (optional) */}
              <input
                type="text"
                value={detailsText}
                onChange={(e) => setDetailsText(e.target.value)}
                placeholder="Flat / floor / building, landmark (optional)"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              {/* Save as: Home / Office / Other (defaults to Other) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 mr-0.5">Save as</span>
                {(["Home", "Office", "Other"] as const).map((t) => {
                  const selected = addressType === t;
                  const Icon = t === "Home" ? Home : t === "Office" ? Building2 : Navigation;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddressType(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                      style={
                        selected
                          ? { backgroundColor: accent, borderColor: accent, color: "#fff" }
                          : { backgroundColor: "#fff", borderColor: "#e5e7eb", color: "#4b5563" }
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={saving || geocoding || mapMoving || !geocodedInfo || isPinOutOfRange}
            className="w-full mt-4 h-14 text-white rounded-2xl font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
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
