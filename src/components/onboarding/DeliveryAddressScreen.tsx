"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trackMaps } from "@/lib/mapsUsage";
import { Loader2, MapPin, Search, LocateFixed, ChevronLeft, ChevronRight, Home, Building2, Navigation, Trash2, ArrowLeft } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";
import { useAuthStore } from "@/store/authStore";
import type { SavedAddress } from "@/components/hotelDetail/placeOrder/AddressManagementModal";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserAddressesMutation } from "@/api/auth";
import { toast } from "sonner";
import AddressPickerV2 from "@/components/hotelDetail/placeOrder/AddressPickerV2";
import { DEFAULT_BRAND_COLOR_HEX } from "@/lib/brandColor";
import { resolveAutocompleteCountry } from "@/lib/autocompleteCountry";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

const formatSavedAddress = (a: SavedAddress): string =>
  a.address ||
  [a.flat_no, a.house_no, a.street, a.area, a.city].filter(Boolean).join(", ");

const labelIcon = (label?: string) => {
  const l = (label || "").toLowerCase();
  if (l.includes("home") || l.includes("house")) return Home;
  if (l.includes("office") || l.includes("work")) return Building2;
  return Navigation;
};

interface DeliveryAddressScreenProps {
  storeBanner?: string;
  storeName: string;
  themeBg?: string;
  onContinue: (address: string, coords: { lat: number; lng: number } | null) => void;
  loading?: boolean;
  accent?: string;
  onBack?: () => void;
  hotelData?: any;
}

export default function DeliveryAddressScreen({
  storeName,
  onContinue,
  loading,
  accent = DEFAULT_BRAND_COLOR_HEX,
  onBack,
  hotelData,
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

  // Bias autocomplete to the partner's country instead of hardcoding India,
  // so e.g. Qatar partners surface Qatar addresses. Falls back to no
  // restriction (worldwide) when the partner's country is unknown.
  const autocompleteCountry = useMemo(
    () => resolveAutocompleteCountry(hotelData),
    [hotelData],
  );

  const { userData: authUser } = useAuthStore();
  const savedAddresses = useMemo(
    () => ((authUser as any)?.addresses || []) as SavedAddress[],
    [(authUser as any)?.addresses],
  );

  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<
    { address?: string; coords: { lat: number; lng: number } } | null
  >(null);

  // After the map pick, collect the same delivery-address details PlaceOrderModalV2
  // asks for (receiver name/phone + building/floor/save-as) before continuing.
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<SavedAddress | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    // Default to the logged-in user's details (checkbox pre-checked).
    useAccountDetails: true,
    receiverName: (authUser as any)?.full_name || "",
    receiverPhone: (authUser as any)?.phone || "",
    locationType: "Other" as "House" | "Office" | "Other",
    buildingFloor: "",
    street: "",
    saveAs: "",
    deliveryInstructions: "",
  });
  // Flips true on a save attempt so required fields highlight as required.
  const [triedSaveDetails, setTriedSaveDetails] = useState(false);

  const openPickerWith = useCallback(
    (addr: string, c: { lat: number; lng: number } | null) => {
      if (c) {
        setPickerInitial({ address: addr, coords: c });
      } else {
        setPickerInitial(null);
      }
      setAddressPickerOpen(true);
    },
    [],
  );

  const handleDeleteSaved = useCallback(async (id: string) => {
    if (!authUser || (authUser as any).role !== "user") return;
    const updated = savedAddresses.filter((a) => a.id !== id);
    try {
      await fetchFromHasura(updateUserAddressesMutation, {
        id: authUser.id,
        addresses: updated,
      });
      useAuthStore.setState({
        userData: { ...(authUser as any), addresses: updated } as any,
      });
      toast.success("Address deleted");
    } catch {
      toast.error("Failed to delete address");
    }
  }, [authUser, savedAddresses]);

  const persistAddresses = useCallback(
    async (addresses: SavedAddress[]) => {
      if (!authUser || (authUser as any).role !== "user") return false;
      try {
        await fetchFromHasura(updateUserAddressesMutation, {
          id: authUser.id,
          addresses,
        });
        useAuthStore.setState({
          userData: { ...(authUser as any), addresses } as any,
        });
        return true;
      } catch {
        toast.error("Failed to save address");
        return false;
      }
    },
    [authUser],
  );

  // Save the receiver + location details onto the picked address, persist it to
  // the user's saved addresses, then continue — mirrors PlaceOrderModalV2's
  // handleSaveAddressForm so onboarding captures the same delivery details.
  const handleSaveDetails = useCallback(async () => {
    if (!pendingAddress) return;
    setTriedSaveDetails(true);
    if (
      !addressFormData.receiverName.trim() ||
      !addressFormData.receiverPhone.trim() ||
      !addressFormData.buildingFloor.trim()
    ) {
      toast.error("Please fill the required fields");
      return; // the empty required fields highlight inline
    }
    const label = addressFormData.saveAs.trim() || addressFormData.locationType;
    const finalAddress: SavedAddress = {
      ...pendingAddress,
      label,
      house_no: addressFormData.buildingFloor.trim() || undefined,
      street: addressFormData.street.trim() || undefined,
      customLabel: addressFormData.saveAs.trim() || undefined,
      receiverName: addressFormData.receiverName.trim() || undefined,
      receiverPhone: addressFormData.receiverPhone.trim() || undefined,
    };
    const existing = [...savedAddresses];
    const idx = existing.findIndex((a) => a.id === finalAddress.id);
    if (idx >= 0) existing[idx] = finalAddress;
    else existing.push(finalAddress);
    await persistAddresses(existing);

    const fullAddress =
      finalAddress.address ||
      [finalAddress.flat_no, finalAddress.house_no, finalAddress.area, finalAddress.city]
        .filter(Boolean)
        .join(", ");
    const c =
      finalAddress.latitude != null && finalAddress.longitude != null
        ? { lat: finalAddress.latitude, lng: finalAddress.longitude }
        : null;
    setShowDetailForm(false);
    setPendingAddress(null);
    onContinue(fullAddress, c);
  }, [pendingAddress, addressFormData, savedAddresses, persistAddresses, onContinue]);

  // A required field is in error once a save was attempted and it's still empty.
  const requiredError = (value: string) => triedSaveDetails && !value.trim();
  const inputCls = (isErr: boolean) =>
    `w-full h-12 px-4 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 ${
      isErr
        ? "border-red-400 focus:ring-red-200"
        : "border-gray-200 focus:ring-gray-300"
    }`;

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
      void trackMaps({ api: "autocomplete", partnerId: hotelData?.id, source: "onboarding_address" });
      autocompleteRef.current?.getPlacePredictions(
        {
          input: query,
          ...(autocompleteCountry
            ? { componentRestrictions: { country: autocompleteCountry } }
            : {}),
          sessionToken: sessionTokenRef.current || undefined,
        },
        (results) => setSuggestions(results || []),
      );
    }, 500);
  }, [autocompleteCountry]);

  const selectSuggestion = useCallback((placeId: string, description: string) => {
    setSuggestions([]);
    setAddress(description);
    if (placesRef.current) {
      void trackMaps({ api: "place_details", partnerId: hotelData?.id, source: "onboarding_address" });
      placesRef.current.getDetails(
        { placeId, fields: ["geometry"], sessionToken: sessionTokenRef.current || undefined },
        (place) => {
          const c = place?.geometry?.location
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : null;
          if (typeof google !== "undefined") {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
          openPickerWith(description, c);
        },
      );
    } else {
      openPickerWith(description, null);
    }
  }, [openPickerWith]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          void trackMaps({ api: "geocode", partnerId: hotelData?.id, source: "onboarding_address" });
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
          const data = await res.json();
          if (data.results?.[0]) addr = data.results[0].formatted_address;
        } catch {}
        setLocating(false);
        openPickerWith(addr, { lat: latitude, lng: longitude });
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
    <div className="flex flex-col h-dvh bg-white overflow-hidden mx-auto w-full md:max-w-md" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div ref={dummyDivRef} className="hidden" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-3 px-4 py-3.5 lg:max-w-md lg:mx-auto">
          <button
            onClick={onBack || (() => onContinue("", null))}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition active:opacity-60"
          >
            <ChevronLeft className="w-[18px] h-[18px] text-gray-900" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
       <div className="px-6 lg:max-w-md lg:mx-auto">
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-gray-900 leading-tight">
          Delivery address
        </h1>
        <p className="mt-2 text-[14px] text-gray-500 leading-relaxed">
          Where should we deliver your order?
        </p>

        {/* Your delivery address — search, then OR, then current location (stacked) */}
        <div className="mt-6 rounded-2xl bg-gray-50 p-4">
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gray-500">
            Your delivery address
          </p>
          <div className="relative mt-2">
            <div className="flex items-center h-[48px] rounded-xl border border-gray-200 bg-white px-3.5 gap-2.5 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900/10 transition">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search street, area, landmark"
                value={address}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 h-full text-[15px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute top-[52px] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
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

          {/* OR divider */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Use my current location */}
          <button
            onClick={useCurrentLocation}
            disabled={locating}
            className="mt-3 w-full h-[48px] rounded-xl border border-gray-200 bg-white flex items-center justify-center gap-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 transition active:opacity-60"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" style={{ color: accent }} />
            )}
            Use my current location
          </button>
        </div>

        {/* Saved addresses */}
        {savedAddresses.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Saved addresses
            </p>
            <div className="space-y-2">
              {(() => {
                const isMatch = (a: SavedAddress) => {
                  const t = formatSavedAddress(a);
                  return !!address && (t === address || a.address === address);
                };
                const reversed = [...savedAddresses].reverse();
                return [
                  ...reversed.filter(isMatch),
                  ...reversed.filter((a) => !isMatch(a)),
                ];
              })().map((a) => {
                const Icon = labelIcon(a.label);
                const text = formatSavedAddress(a);
                return (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const c =
                        a.latitude != null && a.longitude != null
                          ? { lat: a.latitude, lng: a.longitude }
                          : null;
                      onContinue(text, c);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const c =
                          a.latitude != null && a.longitude != null
                            ? { lat: a.latitude, lng: a.longitude }
                            : null;
                        onContinue(text, c);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-[14px] border border-gray-100 hover:bg-gray-50 transition active:opacity-60 text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {a.customLabel || a.label || "Saved"}
                      </p>
                      <p className="text-[12px] text-gray-400 mt-0.5 truncate">{text}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Delete address"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Remove this address?")) {
                          handleDeleteSaved(a.id);
                        }
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-red-50 active:opacity-60 transition"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <ChevronRight className="w-[18px] h-[18px] text-gray-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
       </div>
      </div>

      {/* Sticky CTA */}
      <div className="shrink-0 bg-white/95 backdrop-blur-lg border-t border-gray-100">
       <div className="px-4 pt-2.5 pb-8 lg:max-w-md lg:mx-auto">
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

      {/* Delivery-address details (same fields as PlaceOrderModalV2) — shown
          after the map pick, before continuing. */}
      {showDetailForm && pendingAddress && (
        <div
          className="fixed inset-0 z-[600] bg-gray-50 overflow-y-auto"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="px-4 py-3 flex items-center gap-3 lg:max-w-md lg:mx-auto">
              <button
                type="button"
                onClick={() => {
                  setShowDetailForm(false);
                  setPendingAddress(null);
                }}
                className="p-1"
              >
                <ArrowLeft className="h-6 w-6 text-gray-900" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {pendingAddress.area || pendingAddress.city || "Location"}{" "}
                  <span className="text-gray-400 font-normal">| </span>
                  <span className="text-gray-500 font-normal text-xs">
                    {(pendingAddress.address || "").slice(0, 40)}
                    {(pendingAddress.address || "").length > 40 ? "…" : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-5 pb-32 lg:max-w-md lg:mx-auto">
            {/* Receiver Details */}
            <div>
              <h4 className="text-base font-bold text-gray-900 mb-3">Receiver Details</h4>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressFormData.useAccountDetails}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAddressFormData((prev) => ({
                      ...prev,
                      useAccountDetails: checked,
                      receiverName: checked ? ((authUser as any)?.full_name || "") : "",
                      receiverPhone: checked ? ((authUser as any)?.phone || "") : "",
                    }));
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Use my account details</span>
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Receiver name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={requiredError(addressFormData.receiverName)}
                    placeholder="Full name"
                    value={addressFormData.receiverName}
                    onChange={(e) =>
                      setAddressFormData((prev) => ({ ...prev, receiverName: e.target.value }))
                    }
                    className={inputCls(requiredError(addressFormData.receiverName))}
                  />
                  {requiredError(addressFormData.receiverName) && (
                    <p className="mt-1 text-xs text-red-500">Receiver name is required</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Receiver&apos;s number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    aria-required="true"
                    aria-invalid={requiredError(addressFormData.receiverPhone)}
                    placeholder="10-digit mobile number"
                    value={addressFormData.receiverPhone}
                    onChange={(e) =>
                      setAddressFormData((prev) => ({ ...prev, receiverPhone: e.target.value }))
                    }
                    className={inputCls(requiredError(addressFormData.receiverPhone))}
                  />
                  {requiredError(addressFormData.receiverPhone) && (
                    <p className="mt-1 text-xs text-red-500">Receiver&apos;s number is required</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div>
              <h4 className="text-base font-bold text-gray-900 mb-3">Location Details</h4>
              <div className="flex gap-2 mb-4">
                {(["House", "Office", "Other"] as const).map((type) => {
                  const selected = addressFormData.locationType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setAddressFormData((prev) => ({ ...prev, locationType: type }))
                      }
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                      style={
                        selected
                          ? { backgroundColor: accent, borderColor: accent, color: "white" }
                          : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#4b5563" }
                      }
                    >
                      {type === "House" && <Home className="h-3.5 w-3.5" />}
                      {type === "Office" && <Building2 className="h-3.5 w-3.5" />}
                      {type === "Other" && <Navigation className="h-3.5 w-3.5" />}
                      {type}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Building / Floor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={requiredError(addressFormData.buildingFloor)}
                    placeholder="e.g. Flat 3B, 2nd floor"
                    value={addressFormData.buildingFloor}
                    onChange={(e) =>
                      setAddressFormData((prev) => ({ ...prev, buildingFloor: e.target.value }))
                    }
                    className={inputCls(requiredError(addressFormData.buildingFloor))}
                  />
                  {requiredError(addressFormData.buildingFloor) && (
                    <p className="mt-1 text-xs text-red-500">Building / Floor is required</p>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Street (optional)"
                  value={addressFormData.street}
                  onChange={(e) =>
                    setAddressFormData((prev) => ({ ...prev, street: e.target.value }))
                  }
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />

                {/* Area / Locality with Change */}
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">Area/Locality</div>
                    <div className="text-sm text-gray-700 truncate mt-0.5">
                      {pendingAddress.address || ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const c =
                        pendingAddress.latitude != null && pendingAddress.longitude != null
                          ? { lat: pendingAddress.latitude, lng: pendingAddress.longitude }
                          : null;
                      setShowDetailForm(false);
                      openPickerWith(pendingAddress.address || "", c);
                    }}
                    className="flex items-center gap-1 shrink-0"
                    style={{ color: accent }}
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-semibold">Change</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Save address as (optional)"
                  value={addressFormData.saveAs}
                  onChange={(e) =>
                    setAddressFormData((prev) => ({ ...prev, saveAs: e.target.value }))
                  }
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
            <div className="px-4 py-3 pb-8 lg:max-w-md lg:mx-auto">
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={loading}
                className="w-full rounded-xl py-3.5 font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: accent }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Save & Continue"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map confirm + save (same flow as V3 bottom sheet) */}
      <AddressPickerV2
        open={addressPickerOpen}
        onClose={() => {
          setAddressPickerOpen(false);
          setPickerInitial(null);
        }}
        onSaved={(saved) => {
          // Onboarding only captures the rough delivery location. The full
          // receiver + location details are collected later at checkout (via
          // the "Add or Select address" flow), so continue straight away.
          setAddressPickerOpen(false);
          setPickerInitial(null);
          const coords =
            saved.latitude != null && saved.longitude != null
              ? { lat: saved.latitude, lng: saved.longitude }
              : null;
          onContinue(saved.address || "", coords);
        }}
        hotelData={hotelData}
        accent={accent}
        initialPick={pickerInitial}
      />
    </div>
  );
}
