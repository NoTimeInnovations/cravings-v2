"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, MapPin, Store, LocateFixed, Loader2, X, AlertTriangle } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";
import { useLocationStore } from "@/store/geolocationStore";
import useOrderStore from "@/store/orderStore";
import { DEFAULT_BRAND_COLOR_HEX } from "@/lib/brandColor";
import { resolveAutocompleteCountry } from "@/lib/autocompleteCountry";
import AddressPickerV2 from "@/components/hotelDetail/placeOrder/AddressPickerV2";
import type { BranchContext, BranchOutlet } from "@/api/branches";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

interface OutletPickerScreenProps {
  brand: BranchContext;
  onSelect: (outlet: BranchOutlet) => void;
  onBack?: () => void;
  accent?: string;
  /**
   * When "delivery", the picker treats the address input as the delivery
   * destination (required to continue) and persists it via onAddressSave.
   */
  orderType?: "delivery" | "takeaway" | null;
  onAddressSave?: (
    address: string,
    coords: { lat: number; lng: number } | null,
  ) => void | Promise<void>;
  /** Optional hotel data passed to the AddressPickerV2 map for centering/radius. */
  hotelData?: any;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const haversineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const outletCoords = (o: BranchOutlet): { lat: number; lng: number } | null => {
  const c = o.geo_location?.coordinates;
  if (!c || c.length < 2) return null;
  return { lng: c[0], lat: c[1] };
};

export default function OutletPickerScreen({
  brand,
  onSelect,
  onBack,
  accent = DEFAULT_BRAND_COLOR_HEX,
  orderType,
  onAddressSave,
  hotelData,
}: OutletPickerScreenProps) {
  const isDelivery = orderType === "delivery";
  const { coords: storedCoords, getLocation, isLoading: locating } = useLocationStore();
  const savedUserAddress = useOrderStore((s) => s.userAddress);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    storedCoords,
  );
  const [areaInput, setAreaInput] = useState(isDelivery ? savedUserAddress || "" : "");
  // The address text that has been geocoded successfully — for delivery this
  // gates the Continue button so the user can't proceed without a destination.
  const [savedAddress, setSavedAddress] = useState<string | null>(
    isDelivery && savedUserAddress && storedCoords ? savedUserAddress : null,
  );
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Delivery is a two-page flow: first the address, then the outlet list. Start
  // on the outlet page only when a delivery address is already known (returning
  // user); otherwise collect the address first. Takeaway keeps its single
  // combined page (address card is just "find nearest"), so view is unused there.
  const [view, setView] = useState<"address" | "outlets">(
    isDelivery && !(savedUserAddress && storedCoords) ? "address" : "outlets",
  );

  // Google Places autocomplete (delivery mode only).
  const { isLoaded: isGoogleLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dummyDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDelivery) return;
    if (isGoogleLoaded && typeof google !== "undefined") {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      if (dummyDivRef.current) {
        placesRef.current = new google.maps.places.PlacesService(dummyDivRef.current);
      }
    }
  }, [isGoogleLoaded, isDelivery]);

  // AddressPickerV2 (map confirm) state.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<
    { address?: string; coords: { lat: number; lng: number } } | null
  >(null);

  const openPickerWith = useCallback(
    (addr: string, c: { lat: number; lng: number } | null) => {
      if (c) {
        setPickerInitial({ address: addr, coords: c });
      } else {
        setPickerInitial(null);
      }
      setPickerOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (storedCoords && !userCoords) setUserCoords(storedCoords);
  }, [storedCoords]);

  // For takeaway, auto-request location on mount so the nearest outlet is
  // pre-selected. For delivery we want the user to type their actual delivery
  // address — silent geolocation could pick the wrong place (e.g. they're at
  // the office but want delivery home), so we skip the auto-prompt.
  useEffect(() => {
    if (isDelivery) return;
    if (userCoords) return;
    let cancelled = false;
    (async () => {
      const c = await getLocation();
      if (cancelled) return;
      if (c) setUserCoords(c);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDelivery]);

  const sortedOutlets = useMemo(() => {
    const outlets = [...brand.outlets];
    if (!userCoords) {
      return outlets.sort((a, b) =>
        (a.store_name || "").localeCompare(b.store_name || ""),
      );
    }
    return outlets
      .map((o) => {
        const c = outletCoords(o);
        const km = c ? haversineKm(userCoords, c) : Number.POSITIVE_INFINITY;
        return { o, km };
      })
      .sort((a, b) => a.km - b.km)
      .map((x) => x.o);
  }, [brand.outlets, userCoords]);

  const distanceFor = (o: BranchOutlet): string | null => {
    if (!userCoords) return null;
    const c = outletCoords(o);
    if (!c) return null;
    const km = haversineKm(userCoords, c);
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
  };

  const distanceKmFor = (o: BranchOutlet): number | null => {
    if (!userCoords) return null;
    const c = outletCoords(o);
    if (!c) return null;
    return haversineKm(userCoords, c);
  };

  const isOutletOutOfRange = (o: BranchOutlet): boolean => {
    const radius = o.delivery_rules?.delivery_radius;
    if (!radius) return false;
    const km = distanceKmFor(o);
    if (km == null) return false;
    return km > radius;
  };

  const effectiveSelected: BranchOutlet | null =
    sortedOutlets.find((o) => o.id === selectedId) || sortedOutlets[0] || null;
  const selectedOutOfRange =
    isDelivery && !!savedAddress && !!effectiveSelected
      ? isOutletOutOfRange(effectiveSelected)
      : false;
  const selectedRadiusKm = effectiveSelected?.delivery_rules?.delivery_radius;
  const selectedDistanceKm = effectiveSelected
    ? distanceKmFor(effectiveSelected)
    : null;

  // Bias autocomplete to the partner's country instead of hardcoding India,
  // so e.g. Qatar partners surface Qatar addresses. Falls back to no
  // restriction (worldwide) when the partner's country is unknown.
  const autocompleteCountry = useMemo(
    () => resolveAutocompleteCountry(hotelData),
    [hotelData],
  );

  const handleAddressInputChange = (value: string) => {
    setAreaInput(value);
    if (!isDelivery) return;
    if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
    if (!value || value.length < 3 || !autocompleteRef.current) {
      setSuggestions([]);
      return;
    }
    suggestionDebounceRef.current = setTimeout(() => {
      autocompleteRef.current?.getPlacePredictions(
        {
          input: value,
          ...(autocompleteCountry
            ? { componentRestrictions: { country: autocompleteCountry } }
            : {}),
          sessionToken: sessionTokenRef.current || undefined,
        },
        (results) => setSuggestions(results || []),
      );
    }, 250);
  };

  const handleSuggestionSelect = (
    placeId: string,
    description: string,
  ) => {
    setSuggestions([]);
    setAreaInput(description);
    setFindError(null);
    if (!isDelivery) {
      // Non-delivery shouldn't see suggestions, but if it ever did, just use
      // coords for sorting and skip the map picker.
      if (placesRef.current) {
        placesRef.current.getDetails(
          { placeId, fields: ["geometry"], sessionToken: sessionTokenRef.current || undefined },
          (place) => {
            const loc = place?.geometry?.location;
            if (loc) setUserCoords({ lat: loc.lat(), lng: loc.lng() });
          },
        );
      }
      return;
    }
    if (!placesRef.current) {
      // No Places service yet — open picker without coords so user can search/drag.
      openPickerWith(description, null);
      return;
    }
    placesRef.current.getDetails(
      {
        placeId,
        fields: ["geometry"],
        sessionToken: sessionTokenRef.current || undefined,
      },
      (place) => {
        if (typeof google !== "undefined") {
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
        const loc = place?.geometry?.location;
        const coords = loc ? { lat: loc.lat(), lng: loc.lng() } : null;
        openPickerWith(description, coords);
      },
    );
  };

  const handleUseMyLocation = async () => {
    setFindError(null);
    const c = await getLocation();
    if (!c) {
      setFindError("Could not get your location.");
      return;
    }
    if (isDelivery) {
      // Open the map picker so the user can fine-tune the pin — current
      // geolocation is usually accurate to a building, not a door.
      const addr = useOrderStore.getState().userAddress || "";
      openPickerWith(addr, c);
      return;
    }
    setUserCoords(c);
  };

  const handleFind = async () => {
    const q = areaInput.trim();
    if (!q) return;
    // Delivery mode: open the picker so the user can drop the pin precisely.
    if (isDelivery) {
      openPickerWith(q, userCoords);
      return;
    }
    if (!MAPBOX_TOKEN) {
      setFindError("Geocoding unavailable.");
      return;
    }
    setFinding(true);
    setFindError(null);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          q,
        )}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
      );
      const data = await res.json();
      const feat = data?.features?.[0];
      if (!feat?.center || feat.center.length < 2) {
        setFindError("No match for that address.");
        return;
      }
      const [lng, lat] = feat.center as [number, number];
      setUserCoords({ lat, lng });
    } catch {
      setFindError("Couldn't reach the geocoder.");
    } finally {
      setFinding(false);
    }
  };

  const handlePickerSaved = useCallback((saved: any) => {
    const fullAddress =
      saved.address ||
      [saved.flat_no, saved.house_no, saved.area, saved.city]
        .filter(Boolean)
        .join(", ");
    const coords =
      saved.latitude != null && saved.longitude != null
        ? { lat: saved.latitude, lng: saved.longitude }
        : null;
    setPickerOpen(false);
    setPickerInitial(null);
    setAreaInput(fullAddress);
    setSavedAddress(fullAddress);
    if (coords) setUserCoords(coords);
    onAddressSave?.(fullAddress, coords);
  }, [onAddressSave]);

  // If the typed address changes after a successful Find, invalidate the
  // saved-address gate so the user has to confirm the new text.
  useEffect(() => {
    if (!isDelivery) return;
    if (savedAddress && areaInput.trim() !== savedAddress.trim()) {
      setSavedAddress(null);
    }
  }, [areaInput, savedAddress, isDelivery]);

  const canContinue = isDelivery
    ? Boolean(savedAddress) && sortedOutlets.length > 0
    : sortedOutlets.length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    const target =
      sortedOutlets.find((o) => o.id === selectedId) || sortedOutlets[0];
    if (target) onSelect(target);
  };

  // Two-page delivery flow: address page first, outlets page next. Takeaway is
  // always a single page (showOutletsView true, showAddressView false).
  const showAddressView = isDelivery && view === "address";
  const showOutletsView = !isDelivery || view === "outlets";
  const headerBack =
    isDelivery && view === "outlets" ? () => setView("address") : onBack;
  const bottomLabel = showAddressView
    ? savedAddress
      ? "Continue"
      : "Enter delivery address"
    : selectedOutOfRange
      ? "Explore menu"
      : "Order now";
  const bottomDisabled = showAddressView ? !savedAddress : !canContinue;
  const onBottomClick = showAddressView
    ? () => {
        if (savedAddress) setView("outlets");
      }
    : handleContinue;

  return (
    <div
      className="flex flex-col min-h-dvh bg-white mx-auto w-full md:max-w-md relative"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div ref={dummyDivRef} className="hidden" />
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-3 px-4 py-3.5 lg:max-w-md lg:mx-auto">
          {headerBack && (
            <button
              onClick={headerBack}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition active:opacity-60"
            >
              <ChevronLeft className="w-[18px] h-[18px] text-gray-900" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 pb-32">
        <div className="px-6 lg:max-w-md lg:mx-auto">
          {/* Heading — address page (delivery), outlet page (delivery), or takeaway */}
          {showAddressView ? (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: accent }} />
                <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                  Delivery address
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Where should we deliver your order?
              </p>
            </>
          ) : isDelivery ? (
            <>
              {savedAddress && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-gray-50 p-4">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${accent}15` }}
                  >
                    <MapPin className="w-3.5 h-3.5" style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-500">
                      Delivering to
                    </p>
                    <p className="mt-0.5 text-[13px] text-gray-900 leading-snug line-clamp-2">
                      {savedAddress}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("address")}
                    className="text-xs font-semibold shrink-0 active:opacity-60"
                    style={{ color: accent }}
                  >
                    Change
                  </button>
                </div>
              )}
              <div className="mt-5 flex items-center gap-2">
                <Store className="w-5 h-5" style={{ color: accent }} />
                <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                  Pick an outlet
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Choose the outlet to deliver from.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5" style={{ color: accent }} />
                <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                  Pick an outlet
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Choose where you'd like to pick up your order.
              </p>
            </>
          )}

          {/* Address / find-nearest card — address page (delivery) or takeaway */}
          {(showAddressView || !isDelivery) && (
          <div className="mt-5 rounded-2xl bg-gray-50 p-4">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gray-500">
              {isDelivery ? "Your delivery address" : "Find nearest to me"}
            </p>
            <div className="mt-2 relative">
              <div className="relative flex items-center h-10 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-gray-200">
                <input
                  value={areaInput}
                  onChange={(e) => handleAddressInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFind();
                  }}
                  placeholder={
                    isDelivery
                      ? "Search street, area, landmark"
                      : "Type your area / address"
                  }
                  className="flex-1 h-full pl-3 pr-9 bg-transparent text-sm rounded-xl focus:outline-none"
                />
                {areaInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAreaInput("");
                      setSuggestions([]);
                      setSavedAddress(null);
                      setFindError(null);
                    }}
                    aria-label="Clear address"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isDelivery && suggestions.length > 0 && (
                <div className="absolute top-[44px] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() =>
                        handleSuggestionSelect(s.place_id, s.description)
                      }
                      className="w-full text-left px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 truncate">
                          {s.structured_formatting?.main_text || s.description}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {s.structured_formatting?.secondary_text || ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* OR divider + Use my location alternative */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400">
                or
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="mt-3 w-full h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center gap-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {locating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LocateFixed className="w-4 h-4" style={{ color: accent }} />
              )}
              Use my current location
            </button>

            {findError && (
              <p className="mt-2 text-xs text-red-500">{findError}</p>
            )}
            {isDelivery && savedAddress && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${accent}15` }}
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-500">
                    Delivering to
                  </p>
                  <p className="mt-0.5 text-[13px] text-gray-900 leading-snug line-clamp-2">
                    {savedAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Outlets — outlet page (delivery) or takeaway */}
          {showOutletsView && (
            <>
          <div className="mt-3 flex flex-col gap-2">
            {sortedOutlets.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No outlets available right now.
              </p>
            ) : (
              sortedOutlets.map((o) => {
                const isSelected =
                  selectedId === o.id || (!selectedId && o === sortedOutlets[0]);
                const dist = distanceFor(o);
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className={`w-full px-3 py-2.5 rounded-xl bg-white flex items-center gap-2.5 text-left transition-all ${
                      isSelected
                        ? "border-[1.5px] shadow-[0_0_0_2px_rgba(0,0,0,0.05)]"
                        : "border border-gray-200"
                    }`}
                    style={isSelected ? { borderColor: accent } : undefined}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "" : "bg-gray-100"
                      }`}
                      style={
                        isSelected ? { backgroundColor: `${accent}15` } : undefined
                      }
                    >
                      <Store
                        className="w-4 h-4"
                        style={{ color: isSelected ? accent : "#111827" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {o.store_tagline?.trim() || o.store_name}
                        </p>
                        {dist && (
                          <p
                            className="text-[11px] font-semibold shrink-0"
                            style={{ color: accent }}
                          >
                            {dist}
                          </p>
                        )}
                      </div>
                      {(o.location || o.location_details) && (
                        <p className="mt-0.5 text-xs text-gray-600 flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
                          <span className="line-clamp-1">
                            {[o.location_details, o.location]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedOutOfRange && effectiveSelected && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl border border-red-200 bg-red-50">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">
                  Delivery unavailable here
                </p>
                <p className="mt-0.5 text-xs text-red-600/90 leading-snug">
                  {effectiveSelected.store_tagline?.trim() ||
                    effectiveSelected.store_name}{" "}
                  delivers within {selectedRadiusKm} km. Your address is{" "}
                  {selectedDistanceKm != null
                    ? selectedDistanceKm < 1
                      ? `${Math.round(selectedDistanceKm * 1000)} m`
                      : `${selectedDistanceKm.toFixed(1)} km`
                    : ""}{" "}
                  away. Try another address or pick a different outlet.
                </p>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30">
        <div className="px-4 pt-3.5 pb-8 lg:max-w-md lg:mx-auto">
          <button
            onClick={onBottomClick}
            disabled={bottomDisabled}
            className="w-full h-[52px] rounded-[14px] text-white font-semibold text-base flex items-center justify-center transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            {bottomLabel}
          </button>
        </div>
      </div>

      {isDelivery && (
        <AddressPickerV2
          open={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setPickerInitial(null);
          }}
          onSaved={handlePickerSaved}
          // Brand-parent flow: the picker shouldn't enforce the parent's
          // delivery radius — serviceability is per-outlet and is re-checked
          // once the user picks an outlet. Strip the radius so the
          // "outside delivery range" warning never shows here.
          hotelData={
            hotelData
              ? {
                  ...hotelData,
                  delivery_rules: hotelData?.delivery_rules
                    ? {
                        ...hotelData.delivery_rules,
                        delivery_radius: undefined,
                      }
                    : hotelData?.delivery_rules,
                }
              : hotelData
          }
          accent={accent}
          initialPick={pickerInitial}
        />
      )}
    </div>
  );
}
