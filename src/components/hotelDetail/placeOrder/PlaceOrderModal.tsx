"use client";
import useOrderStore, { OrderItem } from "@/store/orderStore";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  LocateFixed,
  CheckCircle2,
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  Home,
  Briefcase,
  X,
  Search,
} from "lucide-react";
import { useLocationStore } from "@/store/geolocationStore";
import {
  GoogleMap,
  useLoadScript,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HotelData } from "@/app/hotels/[...id]/page";
import Link from "next/link";
import { getGstAmount, calculateDeliveryDistanceAndCost } from "../OrderDrawer";
import { QrGroup } from "@/app/admin/qr-management/page";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getFeatures } from "@/lib/getFeatures";
import DescriptionWithTextBreak from "@/components/DescriptionWithTextBreak";
import { useQrDataStore } from "@/store/qrDataStore";
import { motion, AnimatePresence } from "framer-motion";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserAddressesMutation } from "@/api/auth";
import {
  validatePhoneNumber,
  getPhoneValidationError,
} from "@/lib/getUserCountry";
import { getPhoneDigitsForCountry } from "@/lib/countryPhoneMap";

// Local types for user addresses (stored in users.addresses jsonb)
type SavedAddress = {
  id: string;
  label: string; // Home/Work/Other/Custom
  customLabel?: string; // For when label is "Other"
  house_no?: string;
  flat_no?: string;
  street?: string;
  road_no?: string;
  area?: string;
  landmark?: string;
  city?: string;
  district?: string;
  pincode?: string;
  address?: string; // full address text
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  customLocation?: string;
};

// Add type for deliveryInfo
interface DeliveryInfo {
  distance: number;
  cost: number;
  ratePerKm: number;
  isOutOfRange: boolean;
  minimumOrderAmount: number;
}

// Google Maps configuration
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 10.050525, lng: 76.322455 };
const GOOGLE_MAPS_LIBRARIES: ["places"] = ["places"];

// =================================================================
// Full-Page Address Management Component with Google Maps
// =================================================================

const AddressManagementModal = ({
  open,
  onClose,
  onSaved,
  editAddress = null,
  hotelData,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (addr: SavedAddress) => void;
  editAddress?: SavedAddress | null;
  hotelData: HotelData;
}) => {
  const [label, setLabel] = useState<string>("Home");
  const [customLabel, setCustomLabel] = useState<string>("");
  const [flatNo, setFlatNo] = useState<string>("");
  const [houseNo, setHouseNo] = useState<string>("");
  const [roadNo, setRoadNo] = useState<string>("");
  const [street, setStreet] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [customLocation, setCustomLocation] = useState<string>("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const isIndia = hotelData?.country === "India";
  const needDeliveryLocation =
    hotelData?.delivery_rules?.needDeliveryLocation ?? true;

  // Load Google Maps script once with Places library
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (editAddress) {
      setLabel(editAddress.label);
      setCustomLabel(editAddress.customLabel || "");
      setFlatNo(editAddress.flat_no || "");
      setHouseNo(editAddress.house_no || "");
      setRoadNo(editAddress.road_no || "");
      setStreet(editAddress.street || "");
      setArea(editAddress.area || "");
      setDistrict(editAddress.district || "");
      setLandmark(editAddress.landmark || "");
      setCity(editAddress.city || "");
      setPincode(editAddress.pincode || "");
      setCustomLocation(editAddress.customLocation || "");
      if (editAddress.latitude && editAddress.longitude) {
        setCoordinates({
          lat: editAddress.latitude,
          lng: editAddress.longitude,
        });
      }
      setShowMap(true);
    } else if (open) {
      // Reset form for new address
      setLabel("Home");
      setCustomLabel("");
      setFlatNo("");
      setHouseNo("");
      setRoadNo("");
      setStreet("");
      setArea("");
      setDistrict("");
      setLandmark("");
      setCity("");
      setCustomLocation("");
      setPincode("");
      setCoordinates(null);
      setShowMap(true);

      // Auto-fetch current location for new addresses
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCoordinates({ lat: latitude, lng: longitude });
            reverseGeocode(latitude, longitude);
            toast.success("Location detected successfully");
          },
          () => {
            // Silently fail — user can manually pick location
          },
        );
      }
    }
  }, [editAddress, open]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          reverseGeocode(latitude, longitude);
          toast.success("Location detected successfully");
        },
        (error) => {
          toast.error("Unable to get your location");
          console.error(error);
        },
      );
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const addressComponents = results[0].address_components;
          const formattedAddress = results[0].formatted_address;

          if (!needDeliveryLocation) {
            setCustomLocation(formattedAddress);
          }

          // Parse address components
          addressComponents.forEach((component) => {
            const types = component.types;
            if (types.includes("postal_code")) {
              setPincode(component.long_name);
            }
            if (
              types.includes("locality") ||
              types.includes("administrative_area_level_2")
            ) {
              setCity(component.long_name);
            }
            if (types.includes("administrative_area_level_3")) {
              setDistrict(component.long_name);
            }
            if (
              types.includes("sublocality") ||
              types.includes("sublocality_level_1")
            ) {
              setArea(component.long_name);
            }
          });

          if (!needDeliveryLocation && !customLocation) {
            setCustomLocation(formattedAddress);
          }
        }
      });
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCoordinates({ lat, lng });
        reverseGeocode(lat, lng);

        // Center map on selected place
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(17);
        }

        toast.success("Location found!");
      }
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCoordinates({ lat, lng });
      reverseGeocode(lat, lng);
    }
  };

  const isFormValid = () => {
    if (!needDeliveryLocation) {
      return !!customLocation?.trim();
    }

    let isValid = true;

    if (isIndia) {
      isValid =
        !!label &&
        !!(flatNo || houseNo) &&
        !!(street || roadNo) &&
        !!area &&
        !!city &&
        !!pincode &&
        coordinates !== null;
    } else {
      isValid = !!label && !!customLocation && coordinates !== null;
    }

    return isValid;
  };

  const handleSave = async () => {
    if (needDeliveryLocation && !coordinates) {
      toast.error("Please select a location on the map");
      return;
    }

    if (!isFormValid()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (needDeliveryLocation && label === "Other" && !customLabel.trim()) {
      toast.error("Please provide a custom label");
      return;
    }

    setSaving(true);
    try {
      const fullAddress = !needDeliveryLocation
        ? customLocation.trim()
        : isIndia
          ? [
              flatNo,
              houseNo,
              roadNo,
              street,
              area,
              district,
              landmark ? `near ${landmark}` : null,
              city,
              pincode,
            ]
              .filter(Boolean)
              .join(", ")
          : customLocation.trim();

      const normalizedLabel = label === "Other" ? customLabel.trim() : label;

      const addr: SavedAddress = {
        id: editAddress?.id || `${Date.now()}`,
        label: normalizedLabel,
        customLabel: undefined,
        flat_no: flatNo || undefined,
        house_no: houseNo || undefined,
        road_no: roadNo || undefined,
        street: street || undefined,
        area: area || undefined,
        district: district || undefined,
        landmark: landmark || undefined,
        city: city || undefined,
        pincode: pincode || undefined,
        address: fullAddress,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
        isDefault: false,
      };

      onSaved(addr);
      onClose();
      toast.success(
        editAddress
          ? "Address updated successfully"
          : "Address saved successfully",
      );
    } catch (error) {
      toast.error("Failed to save address");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const mapCenter = coordinates
    ? coordinates
    : hotelData?.geo_location?.coordinates
      ? {
          lat: hotelData.geo_location.coordinates[1],
          lng: hotelData.geo_location.coordinates[0],
        }
      : DEFAULT_CENTER;

  return (
    <div className="fixed inset-0 z-[70] bg-white h-[100dvh] flex flex-col">
      {/* Modern Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-stone-700" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {editAddress ? "Edit Address" : "Add New Address"}
            </h1>
            <p className="text-xs text-stone-500">
              {needDeliveryLocation
                ? "Select location and fill details"
                : "Enter your address"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-stone-50">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Map Section with Modern Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-200"
          >
            <div className="p-4 border-b border-stone-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#B5581A]" />
                Select Location
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Tap on the map or use current location
              </p>
            </div>

            {showMap ? (
              <div className="space-y-0">
                {/* Search Location */}
                {isLoaded && (
                  <div className="p-4 bg-white border-b border-stone-200">
                    <Autocomplete
                      onLoad={(autocomplete) => {
                        autocompleteRef.current = autocomplete;
                      }}
                      onPlaceChanged={onPlaceChanged}
                    >
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                        <Input
                          type="text"
                          placeholder="Search for a location..."
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          className="pl-10 rounded-xl text-gray-900 placeholder:text-gray-400 border-stone-200 focus:border-[#B5581A] focus:ring-[#B5581A]"
                        />
                      </div>
                    </Autocomplete>
                  </div>
                )}

                {/* Google Map */}
                <div className="h-[400px] w-full relative">
                  {loadError ? (
                    <div className="flex items-center justify-center h-full text-red-600">
                      <p>Error loading maps</p>
                    </div>
                  ) : !isLoaded ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-[#B5581A]" />
                    </div>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={mapCenter}
                      zoom={15}
                      onClick={handleMapClick}
                      onLoad={(map) => {
                        mapRef.current = map;
                      }}
                      options={{
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                      }}
                    >
                      {/* Hotel Marker */}
                      {hotelData?.geo_location?.coordinates && (
                        <Marker
                          position={{
                            lat: hotelData.geo_location.coordinates[1],
                            lng: hotelData.geo_location.coordinates[0],
                          }}
                          icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#B5581A",
                            fillOpacity: 1,
                            strokeColor: "#FFFFFF",
                            strokeWeight: 2,
                          }}
                        />
                      )}
                      {/* User Location Marker */}
                      {coordinates && <Marker position={coordinates} />}
                    </GoogleMap>
                  )}
                </div>

                {/* Map Actions */}
                <div className="p-4 bg-stone-50 border-t border-stone-200">
                  {coordinates ? (
                    <div className="flex gap-2">
                      <button
                        onClick={getCurrentLocation}
                        className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                      >
                        <LocateFixed className="h-4 w-4 inline mr-2" />
                        Relocate
                      </button>
                      <button
                        onClick={() => setShowMap(false)}
                        className="flex-1 px-4 py-2.5 bg-[#B5581A] text-white rounded-lg hover:bg-[#a64e2a] transition-colors text-sm font-medium"
                      >
                        Confirm Location
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-stone-500">
                      Click on the map to select your location
                    </div>
                  )}
                </div>
              </div>
            ) : !coordinates ? (
              <div className="p-6 space-y-3">
                <button
                  onClick={getCurrentLocation}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#F4E0D0]/70 text-[#B5581A] rounded-xl hover:bg-[#B5581A] hover:text-white transition-all duration-300 font-medium border border-[#B5581A]/30"
                >
                  <LocateFixed className="h-5 w-5" />
                  Use My Current Location
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-xs text-stone-400 uppercase tracking-wider">
                    or
                  </span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                <button
                  onClick={() => setShowMap(true)}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-100 transition-all duration-300 font-medium"
                >
                  <MapPin className="h-5 w-5" />
                  Select on Map
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Location Selected</p>
                    <p className="text-sm text-green-600 mt-0.5">
                      Your location has been set successfully
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMap(true)}
                  className="w-full px-4 py-2.5 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium"
                >
                  Change Location
                </button>
              </div>
            )}
          </motion.div>

          {/* Address Type Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm p-5 border border-stone-200"
          >
            <Label className="text-sm font-semibold text-gray-900 mb-3 block">
              Save address as
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "Home", icon: Home },
                { value: "Work", icon: Briefcase },
                { value: "Other", icon: MapPin },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLabel(option.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    label === option.value
                      ? "border-[#B5581A] bg-[#F4E0D0]/30 text-[#B5581A]"
                      : "border-stone-200 hover:border-stone-300 text-stone-600"
                  }`}
                >
                  <option.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{option.value}</span>
                </button>
              ))}
            </div>
            {label === "Other" && (
              <Input
                placeholder="Enter custom label (e.g., Mom's House)"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="mt-3 rounded-lg text-gray-900 placeholder:text-gray-400"
              />
            )}
          </motion.div>

          {/* Address Form Fields */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm p-5 border border-stone-200 space-y-4"
          >
            <h3 className="font-semibold text-gray-900">Address Details</h3>

            {!needDeliveryLocation ? (
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Full Address *
                </Label>
                <Textarea
                  placeholder="Enter your complete address..."
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="mt-2 rounded-lg resize-none text-gray-900 placeholder:text-gray-400"
                  rows={4}
                />
              </div>
            ) : !isIndia ? (
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Location Details
                </Label>
                <Textarea
                  placeholder="E.g., Near City Mall, Building 5..."
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="mt-2 rounded-lg resize-none text-gray-900 placeholder:text-gray-400"
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Flat/House No *
                    </Label>
                    <Input
                      placeholder="e.g., 101"
                      value={flatNo || houseNo}
                      onChange={(e) => {
                        setFlatNo(e.target.value);
                        setHouseNo("");
                      }}
                      className="mt-1.5 rounded-lg text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Road/Street *
                    </Label>
                    <Input
                      placeholder="e.g., MG Road"
                      value={street || roadNo}
                      onChange={(e) => {
                        setStreet(e.target.value);
                        setRoadNo("");
                      }}
                      className="mt-1.5 rounded-lg text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Area/Locality *
                  </Label>
                  <Input
                    placeholder="e.g., Indiranagar"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="mt-1.5 rounded-lg text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Landmark (Optional)
                  </Label>
                  <Input
                    placeholder="e.g., Near Metro Station"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="mt-1.5 rounded-lg text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      City *
                    </Label>
                    <Input
                      placeholder="e.g., Bangalore"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1.5 rounded-lg text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Pincode *
                    </Label>
                    <Input
                      placeholder="e.g., 560038"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="mt-1.5 rounded-lg text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer with Save Button */}
      <div className="p-4 border-t bg-white shrink-0">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving || !isFormValid()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#B5581A] text-white rounded-xl hover:bg-[#a64e2a] transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#B5581A]/20"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : editAddress ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Update Address
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Save Address
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// Modern Address Section Component
// =================================================================

const UnifiedAddressSection = ({
  setAddress,
  hotelData,
}: {
  address: string;
  setAddress: (addr: string) => void;
  deliveryInfo: DeliveryInfo | null;
  hotelData: HotelData;
}) => {
  const { userData: user } = useAuthStore();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(
    null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const savedAddresses = ((user as any)?.addresses || []) as SavedAddress[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (savedAddresses.length === 0) return;
    const defaultAddress =
      savedAddresses.find((addr) => addr.isDefault) || savedAddresses[0];
    if (
      defaultAddress &&
      defaultAddress.id !== selectedAddressId &&
      !selectedAddressId
    ) {
      handleAddressSelect(defaultAddress);
    }
  }, [savedAddresses, selectedAddressId]);

  const saveAddressesForUser = async (addresses: SavedAddress[]) => {
    try {
      if (!user || (user as any).role !== "user") {
        toast.error("Login to save addresses");
        return false;
      }

      await fetchFromHasura(updateUserAddressesMutation, {
        id: user.id,
        addresses: addresses,
      });

      useAuthStore.setState({
        userData: {
          ...user,
          addresses: addresses,
        } as any,
      });

      return true;
    } catch (error) {
      console.error("Error saving addresses:", error);
      toast.error("Failed to save addresses");
      return false;
    }
  };

  const handleAddressSelect = (addr: SavedAddress | null) => {
    setSelectedAddressId(addr?.id || null);

    const fullAddress =
      addr?.address ||
      [
        addr?.flat_no,
        addr?.house_no,
        addr?.road_no,
        addr?.street,
        addr?.area,
        addr?.district,
        addr?.landmark,
        addr?.city,
        addr?.pincode,
      ]
        .filter(Boolean)
        .join(", ");
    setAddress(fullAddress);

    if (addr?.latitude && addr?.longitude) {
      const locationData = {
        state: {
          coords: {
            lat: addr.latitude,
            lng: addr.longitude,
          },
        },
      };
      localStorage?.setItem(
        "user-location-store",
        JSON.stringify(locationData),
      );
    }

    if (addr?.latitude && addr?.longitude) {
      useOrderStore.getState().setUserCoordinates({
        lat: addr.latitude,
        lng: addr.longitude,
      });
    } else {
      useOrderStore.getState().setUserCoordinates(null);
    }

    setShowDropdown(false);
  };

  const handleAddressSaved = async (addr: SavedAddress) => {
    const existing = [...savedAddresses];
    const index = existing.findIndex((a) => a.id === addr.id);

    if (index >= 0) {
      existing[index] = addr;
    } else {
      existing.push(addr);
    }

    const success = await saveAddressesForUser(existing);
    if (success) {
      setEditingAddress(null);
      handleAddressSelect(addr);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    const updated = savedAddresses.filter((a) => a.id !== addressId);
    const success = await saveAddressesForUser(updated);
    if (success) {
      if (selectedAddressId === addressId) {
        setSelectedAddressId(null);
        setAddress("");
        setEditingAddress(null);
        handleAddressSelect(null);
      }
      toast.success("Address deleted successfully");
    }
  };

  const selectedAddress = savedAddresses.find(
    (a) => a.id === selectedAddressId,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#B5581A]" />
            <h3 className="font-semibold text-gray-900 text-base">
              Delivery Address
            </h3>
          </div>
          <button
            onClick={() => {
              setEditingAddress(null);
              setShowAddressModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#B5581A] border border-[#B5581A]/30 rounded-lg hover:bg-[#F4E0D0]/30 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add New
          </button>
        </div>

        {/* Address Selection Dropdown */}
        {savedAddresses.length > 0 && (
          <div className="relative mb-3" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full p-4 border border-stone-200 rounded-xl bg-stone-50 text-left flex justify-between items-center hover:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {selectedAddress?.label === "Home" && (
                  <Home className="h-4 w-4 text-stone-600" />
                )}
                {selectedAddress?.label === "Work" && (
                  <Briefcase className="h-4 w-4 text-stone-600" />
                )}
                {selectedAddress?.label !== "Home" &&
                  selectedAddress?.label !== "Work" && (
                    <MapPin className="h-4 w-4 text-stone-600" />
                  )}
                <span className="text-sm font-medium text-gray-900">
                  {selectedAddress
                    ? `${selectedAddress.label}${
                        selectedAddress.customLabel
                          ? ` (${selectedAddress.customLabel})`
                          : ""
                      }`
                    : "Select address"}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-stone-600 transition-transform ${
                  showDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
                >
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0 transition-colors"
                      onClick={() => handleAddressSelect(addr)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {addr.label === "Home" && (
                            <Home className="h-4 w-4 text-stone-600 mt-0.5" />
                          )}
                          {addr.label === "Work" && (
                            <Briefcase className="h-4 w-4 text-stone-600 mt-0.5" />
                          )}
                          {addr.label !== "Home" && addr.label !== "Work" && (
                            <MapPin className="h-4 w-4 text-stone-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {addr.label}
                              {addr.customLabel ? ` (${addr.customLabel})` : ""}
                            </div>
                            <div className="text-xs text-stone-600 mt-1 line-clamp-2">
                              {addr.address ||
                                [
                                  addr.flat_no,
                                  addr.house_no,
                                  addr.area,
                                  addr.city,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Selected Address Display */}
        {selectedAddress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-[#F4E0D0]/20 to-transparent rounded-xl p-4 border border-[#B5581A]/20"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900">
                    {selectedAddress.label}
                    {selectedAddress.customLabel
                      ? ` (${selectedAddress.customLabel})`
                      : ""}
                  </span>
                  {selectedAddress.isDefault && (
                    <span className="text-xs bg-[#B5581A] text-white px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">
                  {selectedAddress.address ||
                    [
                      selectedAddress.flat_no,
                      selectedAddress.house_no,
                      selectedAddress.road_no,
                      selectedAddress.street,
                      selectedAddress.area,
                      selectedAddress.district,
                      selectedAddress.landmark,
                      selectedAddress.city,
                      selectedAddress.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingAddress(selectedAddress);
                    setShowAddressModal(true);
                  }}
                  className="p-2 rounded-lg hover:bg-white transition-colors"
                >
                  <Edit className="h-4 w-4 text-stone-600" />
                </button>
                <button
                  onClick={() => handleDeleteAddress(selectedAddress.id)}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {savedAddresses.length === 0 && (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-600">No saved addresses yet</p>
            <p className="text-xs text-stone-500 mt-1">
              Add your first address to get started
            </p>
          </div>
        )}
      </div>

      {/* Address Management Modal */}
      <AddressManagementModal
        open={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSaved={handleAddressSaved}
        editAddress={editingAddress}
        hotelData={hotelData}
      />
    </motion.div>
  );
};

// =================================================================
// Modern Order Status Dialog
// =================================================================

const OrderStatusDialog = ({
  status,
  onClose,
}: {
  status: "idle" | "loading" | "success";
  onClose: () => void;
}) => {
  const [loadingText, setLoadingText] = useState("Getting your items...");

  useEffect(() => {
    if (status === "loading") {
      setLoadingText("Getting your items...");
      const texts = ["Preparing your order...", "Finalizing your order..."];
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < texts.length) {
          setLoadingText(texts[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [status]);

  return (
    <AnimatePresence>
      {status !== "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[7000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center text-white"
            >
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-white" />
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingText}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="mt-6 text-2xl font-semibold"
                >
                  {loadingText}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center text-white p-8  rounded-2xl shadow-lg flex flex-col items-center max-w-md mx-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                }}
              >
                <CheckCircle2 className="w-24 h-24 text-green-400 mx-auto" />
              </motion.div>
              <h2 className="mt-6 text-3xl font-bold">
                Order Placed Successfully!
              </h2>
              <button
                onClick={onClose}
                className="mt-8 px-8 py-3 bg-white text-black rounded-xl hover:bg-gray-200 font-semibold transition-colors"
              >
                Close
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =================================================================
// Modern Items Card
// =================================================================

const ItemsCard = ({
  items,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  currency,
}: {
  items: OrderItem[];
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  removeItem: (id: string) => void;
  currency: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
    >
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-base mb-4">
          Your Order
        </h3>
        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex justify-between items-center py-3 border-b border-stone-100 last:border-b-0"
            >
              <div className="flex-1">
                <DescriptionWithTextBreak
                  spanClassName="text-sm font-medium text-gray-900"
                  accent="black"
                  maxChars={25}
                >
                  {item.name}
                </DescriptionWithTextBreak>
                <p className="text-xs text-stone-500 mt-0.5">
                  {item.category.name}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-1">
                  <button
                    onClick={() => {
                      if (item.quantity > 1) {
                        decreaseQuantity(item.id as string);
                      } else {
                        removeItem(item.id as string);
                      }
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white transition-colors text-stone-600 font-semibold"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => increaseQuantity(item.id as string)}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white transition-colors text-[#B5581A] font-semibold"
                  >
                    +
                  </button>
                </div>
                <span className="font-semibold text-gray-900 min-w-[70px] text-right">
                  {currency}
                  {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// =================================================================
// Modern Bill Card
// =================================================================

interface BillCardProps {
  items: OrderItem[];
  currency: string;
  gstPercentage?: number;
  deliveryInfo: DeliveryInfo | null;
  isDelivery: boolean;
  hotelData: HotelData;
  qrGroup: QrGroup | null;
}

const BillCard = ({
  items,
  currency,
  gstPercentage,
  deliveryInfo,
  isDelivery,
  hotelData,
  qrGroup,
}: BillCardProps) => {
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const qrExtraCharges = qrGroup?.extra_charge
    ? getExtraCharge(
        items,
        qrGroup.extra_charge,
        qrGroup.charge_type || "FLAT_FEE",
      )
    : 0;

  const deliveryCharges =
    isDelivery && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange
      ? deliveryInfo.cost
      : 0;

  const gstAmount = (subtotal * (gstPercentage || 0)) / 100;
  const grandTotal = subtotal + qrExtraCharges + gstAmount + deliveryCharges;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#F4E0D0]/20 to-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
    >
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-base mb-4">
          Bill Summary
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Item Total</span>
            <span className="font-medium text-gray-900">
              {currency}
              {subtotal.toFixed(2)}
            </span>
          </div>

          {qrGroup && qrExtraCharges > 0 && (
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-stone-600">
                  {qrGroup.name || "Service Charge"}
                </span>
                <p className="text-xs text-stone-500">
                  {qrGroup.charge_type === "PER_ITEM" ? "Per item" : "Fixed"}
                </p>
              </div>
              <span className="font-medium text-gray-900">
                {currency}
                {qrExtraCharges.toFixed(2)}
              </span>
            </div>
          )}

          {gstPercentage ? (
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">
                {hotelData?.country === "United Arab Emirates" ? "VAT" : "GST"}{" "}
                ({gstPercentage}%)
              </span>
              <span className="font-medium text-gray-900">
                {currency}
                {gstAmount.toFixed(2)}
              </span>
            </div>
          ) : null}

          {isDelivery && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange && (
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-stone-600">Delivery Charge</span>
                <p className="text-xs text-stone-500">
                  {deliveryInfo.distance.toFixed(1)} km
                </p>
              </div>
              <span className="font-medium text-gray-900">
                {currency}
                {deliveryInfo.cost.toFixed(2)}
              </span>
            </div>
          )}

          <div className="border-t border-stone-200 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total Amount</span>
              <span className="font-bold text-xl text-[#B5581A]">
                {currency}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// =================================================================
// Modern Order Type Card
// =================================================================

const OrderTypeCard = ({
  orderType,
  setOrderType,
}: {
  orderType: "takeaway" | "delivery" | null;
  setOrderType: (type: "takeaway" | "delivery") => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5"
    >
      <h3 className="font-semibold text-gray-900 text-base mb-4">Order Type</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setOrderType("takeaway")}
          className={`p-4 rounded-xl border-2 transition-all text-sm font-medium ${
            orderType === "takeaway"
              ? "border-[#B5581A] bg-[#F4E0D0]/30 text-[#B5581A]"
              : "border-stone-200 hover:border-stone-300 text-stone-600"
          }`}
        >
          Takeaway
        </button>
        <button
          onClick={() => setOrderType("delivery")}
          className={`p-4 rounded-xl border-2 transition-all text-sm font-medium ${
            orderType === "delivery"
              ? "border-[#B5581A] bg-[#F4E0D0]/30 text-[#B5581A]"
              : "border-stone-200 hover:border-stone-300 text-stone-600"
          }`}
        >
          Delivery
        </button>
      </div>
    </motion.div>
  );
};

// =================================================================
// Multi WhatsApp Card Component
// =================================================================

const MultiWhatsappCard = ({
  hotelData,
  selectedLocation,
  setSelectedLocation,
}: {
  hotelData: HotelData;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
}) => {
  const hasMultiWhatsapp =
    getFeatures(hotelData?.feature_flags || "")?.multiwhatsapp?.enabled &&
    hotelData?.whatsapp_numbers?.length > 0;

  if (!hasMultiWhatsapp) return null;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5"
      ref={dropdownRef}
    >
      <h3 className="font-semibold text-gray-900 text-base mb-4">
        Hotel Location
      </h3>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 border border-stone-200 rounded-xl bg-stone-50 text-left flex justify-between items-center hover:bg-stone-100 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900">
            {selectedLocation ? selectedLocation.toUpperCase() : "Select Area"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-stone-600 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto"
            >
              <div
                className="p-3 hover:bg-stone-50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedLocation("");
                  setIsOpen(false);
                }}
              >
                <span className="text-sm text-stone-600">Select Area</span>
              </div>
              {hotelData.whatsapp_numbers.map((item) => (
                <div
                  key={item.area}
                  className="p-3 hover:bg-stone-50 cursor-pointer border-t border-stone-100 transition-colors"
                  onClick={() => {
                    setSelectedLocation(item.area);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-sm font-medium text-gray-900">
                    {item.area.toUpperCase()}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// =================================================================
// Table Number Card
// =================================================================

const TableNumberCard = ({
  tableNumber,
  hotelData,
  tableName,
}: {
  tableNumber: number;
  hotelData: HotelData;
  tableName?: string;
}) => {
  const isRoom = hotelData?.id === "33f5474e-4644-4e47-a327-94684c71b170";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#F4E0D0]/20 to-white rounded-2xl shadow-sm border border-stone-200 p-5"
    >
      <h3 className="font-semibold text-gray-900 text-base mb-3">
        {isRoom ? "Room" : "Table"} Information
      </h3>
      <div className="flex items-center gap-2">
        {tableName ? (
          <span className="text-2xl font-bold text-[#B5581A]">{tableName}</span>
        ) : (
          <>
            {!isRoom && (
              <span className="text-sm text-stone-600">Table Number:</span>
            )}
            <span className="text-2xl font-bold text-[#B5581A]">
              {tableNumber}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
};

// =================================================================
// Login Card
// =================================================================

const LoginCard = ({
  setShowLoginDrawer,
}: {
  setShowLoginDrawer: (show: boolean) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#F4E0D0]/30 to-white rounded-2xl shadow-sm border border-[#B5581A]/30 p-6"
    >
      <h3 className="font-bold text-gray-900 text-lg mb-2">Almost there!</h3>
      <p className="text-stone-600 mb-4 text-sm">
        Login or create account to place your order
      </p>
      <button
        onClick={() => setShowLoginDrawer(true)}
        className="w-full px-6 py-3.5 bg-[#B5581A] text-white rounded-xl hover:bg-[#a64e2a] transition-all duration-300 font-semibold shadow-lg shadow-[#B5581A]/20"
      >
        Continue with Phone Number
      </button>
    </motion.div>
  );
};

// =================================================================
// Login Drawer
// =================================================================

const LoginDrawer = ({
  showLoginDrawer,
  setShowLoginDrawer,
  hotelId,
  hotelData,
  onLoginSuccess,
}: {
  showLoginDrawer: boolean;
  setShowLoginDrawer: (show: boolean) => void;
  hotelId: string;
  hotelData: HotelData;
  onLoginSuccess: () => void;
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithPhone } = useAuthStore();

  const handleLogin = async () => {
    const countryCode = hotelData?.country_code?.replace(/[\+\s]/g, "") || "91";
    const phoneDigits = getPhoneDigitsForCountry(countryCode);

    if (!phoneNumber || !validatePhoneNumber(phoneNumber, countryCode)) {
      toast.error(getPhoneValidationError(countryCode));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInWithPhone(phoneNumber, hotelId, {
        country: hotelData?.country || "India",
        countryCode,
        callingCode: hotelData?.country_code || "+91",
        phoneDigits,
      });
      if (result) {
        toast.success("Logged in successfully");
        onLoginSuccess();
        setShowLoginDrawer(false);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showLoginDrawer) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
        onClick={() => setShowLoginDrawer(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
          className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative border border-stone-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setShowLoginDrawer(false)}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone-100 transition-all duration-200 group"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-stone-500 group-hover:text-stone-700" />
          </button>

          {/* Header */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Welcome Back
              </h2>
              <p className="text-stone-600 text-[15px] leading-relaxed">
                Please enter your phone number to review your order
              </p>
            </motion.div>
          </div>

          {/* Phone Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Label
              htmlFor="phone"
              className="text-sm font-semibold text-gray-900 mb-3 block"
            >
              Phone Number
              {hotelData?.country && (
                <span className="text-stone-500 font-normal ml-2 text-xs">
                  ({hotelData.country})
                </span>
              )}
            </Label>
            <div className="flex gap-3">
              <div className="flex items-center justify-center px-5 bg-[#F4E0D0]/30 rounded-2xl text-base font-bold text-[#B5581A] border border-[#B5581A]/20">
                {hotelData?.country_code || "+91"}
              </div>
              <Input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => {
                  const countryCode =
                    hotelData?.country_code?.replace(/[\+\s]/g, "") || "91";
                  const maxDigits = getPhoneDigitsForCountry(countryCode);
                  setPhoneNumber(
                    e.target.value.replace(/\D/g, "").slice(0, maxDigits),
                  );
                }}
                placeholder="Enter your phone number"
                className="flex-1 rounded-2xl text-gray-900 placeholder:text-gray-400 bg-white border-stone-200 focus:border-[#B5581A] focus:ring-2 focus:ring-[#B5581A]/20 h-14 text-base px-5 transition-all duration-200"
                autoFocus
              />
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <button
              onClick={handleLogin}
              disabled={isSubmitting || !phoneNumber}
              className="w-full px-6 py-4 bg-[#F4E0D0]/70 text-[#B5581A] rounded-full hover:bg-[#B5581A] hover:text-white border border-[#B5581A]/30 hover:border-[#B5581A] transition-all duration-300 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Continue"
              )}
            </button>

            <button
              onClick={() => setShowLoginDrawer(false)}
              className="w-full px-6 py-3.5 rounded-full border border-stone-300 bg-transparent text-stone-800 hover:bg-stone-100 hover:text-stone-900 hover:border-stone-500 transition-all duration-200 font-medium text-base"
            >
              Cancel
            </button>
          </motion.div>

          {/* Privacy Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-stone-500 text-center mt-6 leading-relaxed"
          >
            By continuing, you agree to our{" "}
            <span className="text-[#B5581A] hover:underline cursor-pointer">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-[#B5581A] hover:underline cursor-pointer">
              Privacy Policy
            </span>
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// =================================================================
// Main PlaceOrderModal Component
// =================================================================

const PlaceOrderModal = ({
  hotelData,
  tableNumber,
  getWhatsappLink,
  qrId,
  qrGroup,
  tableName,
}: {
  hotelData: HotelData;
  tableNumber: number;
  getWhatsappLink: (orderId: string) => string;
  qrId: string | null;
  qrGroup: QrGroup | null;
  tableName?: string;
}) => {
  const {
    open_place_order_modal,
    setOpenDrawerBottom,
    setOpenPlaceOrderModal,
    items,
    totalPrice,
    orderId,
    placeOrder,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    coordinates: selectedCoords,
    userAddress: address,
    setUserAddress: setAddress,
    clearOrder,
    deliveryInfo,
    orderNote,
    setOrderNote,
    orderType,
    setOrderType,
  } = useOrderStore();

  const { userData: user } = useAuthStore();

  const [showLoginDrawer, setShowLoginDrawer] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const [orderStatus, setOrderStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsAndroid(/Android/i.test(navigator.userAgent));
    }
  }, []);

  const isDelivery =
    tableNumber === 0 ? orderType === "delivery" : !tableNumber;
  const hasDelivery = hotelData?.geo_location;
  const isQrScan = qrId !== null && tableNumber !== 0;

  useEffect(() => {
    if (open_place_order_modal && items?.length === 0) {
      setOpenPlaceOrderModal(false);
      setOpenDrawerBottom(true);
    }
  }, [
    open_place_order_modal,
    items,
    setOpenDrawerBottom,
    setOpenPlaceOrderModal,
  ]);

  useEffect(() => {
    if (open_place_order_modal && tableNumber === 0 && !orderType) {
      setOrderType("delivery");
    }
  }, [open_place_order_modal, tableNumber, orderType, setOrderType]);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        if (windowHeight - currentHeight > 150) {
          setKeyboardOpen(true);
        } else {
          setKeyboardOpen(false);
        }
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  const hasMultiWhatsapp =
    getFeatures(hotelData?.feature_flags || "")?.multiwhatsapp?.enabled &&
    hotelData?.whatsapp_numbers?.length > 0;

  useEffect(() => {
    if (
      selectedLocation &&
      hotelData.whatsapp_numbers?.some((item) => item.area === selectedLocation)
    ) {
      return;
    }
    const savedArea = localStorage?.getItem(
      `hotel-${hotelData.id}-selected-area`,
    );
    if (
      savedArea &&
      hotelData.whatsapp_numbers?.some((item) => item.area === savedArea)
    ) {
      setSelectedLocation(savedArea);
      return;
    }
    const selectedPhone = localStorage?.getItem(
      `hotel-${hotelData.id}-whatsapp-area`,
    );
    if (selectedPhone) {
      const location = hotelData.whatsapp_numbers?.find(
        (item) => item.number === selectedPhone,
      );
      if (location) {
        setSelectedLocation(location.area);
      }
    } else {
      setSelectedLocation("");
    }
  }, [hotelData.id, hotelData.whatsapp_numbers, selectedLocation]);

  useEffect(() => {
    if (user && !selectedLocation) {
      const savedArea = localStorage?.getItem(
        `hotel-${hotelData.id}-selected-area`,
      );
      if (
        savedArea &&
        hotelData.whatsapp_numbers?.some((item) => item.area === savedArea)
      ) {
        setSelectedLocation(savedArea);
      }
    }
  }, [user, selectedLocation, hotelData.id, hotelData.whatsapp_numbers]);

  const handleSelectHotelLocation = (location: string | null) => {
    setSelectedLocation(location || "");
    if (location) {
      const phoneNumber = hotelData.whatsapp_numbers?.find(
        (item) => item.area === location,
      )?.number;
      localStorage?.setItem(
        `hotel-${hotelData.id}-whatsapp-area`,
        phoneNumber || "",
      );
      localStorage?.setItem(`hotel-${hotelData.id}-selected-area`, location);
    } else {
      localStorage?.removeItem(`hotel-${hotelData.id}-whatsapp-area`);
      localStorage?.removeItem(`hotel-${hotelData.id}-selected-area`);
    }
  };

  useEffect(() => {
    const checkGeolocationPermission = async () => {
      try {
        if (navigator.permissions) {
          const permissionStatus = await navigator.permissions.query({
            name: "geolocation",
          });
          if (permissionStatus.state === "denied") {
            useLocationStore.setState({
              error:
                "Location permission is denied. Please enable it in your browser settings.",
              isLoading: false,
            });
          }
        }
      } catch (error) {
        console.error("Error checking geolocation permission:", error);
      }
    };
    checkGeolocationPermission();
  }, []);

  useEffect(() => {
    if (
      isDelivery &&
      hasDelivery &&
      selectedCoords !== null &&
      !isQrScan &&
      orderType === "delivery"
    ) {
      calculateDeliveryDistanceAndCost(hotelData as HotelData);
    }
  }, [selectedCoords, isDelivery, hasDelivery, isQrScan, orderType, hotelData]);

  const handlePlaceOrder = async (onSuccessCallback?: () => void) => {
    if (tableNumber === 0 && !orderType) {
      toast.error("Please select an order type");
      return;
    }

    if (orderType === "delivery" && !address?.trim()) {
      toast.error("Please select a delivery address");
      return;
    }

    if (isDelivery) {
      const needLocation =
        hotelData?.delivery_rules?.needDeliveryLocation ?? true;
      if (!address?.trim()) {
        toast.error("Please enter your delivery address");
        return;
      }

      if (needLocation) {
        if (hasDelivery && !selectedCoords) {
          toast.error("Please select your location on the map");
          return;
        }

        if (deliveryInfo?.isOutOfRange) {
          toast.error("Delivery is not available to your location");
          return;
        }
      }
    }

    if (hasMultiWhatsapp && !selectedLocation) {
      toast.error("Please select a hotel location");
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setOrderStatus("loading");

    try {
      const subtotal =
        items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
      const gstAmount = getGstAmount(
        subtotal,
        hotelData?.gst_percentage as number,
      );
      const extraCharges = [];

      if (isQrScan && qrGroup && qrGroup.name) {
        const qrChargeAmount = getExtraCharge(
          items || [],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE",
        );
        if (qrChargeAmount > 0) {
          extraCharges.push({
            name: qrGroup.name,
            amount: qrChargeAmount,
            charge_type: qrGroup.charge_type || "FLAT_FEE",
          });
        }
      }

      if (
        !isQrScan &&
        tableNumber === 0 &&
        qrGroup &&
        qrGroup.name &&
        (orderType === "delivery" || orderType === "takeaway")
      ) {
        const table0ChargeAmount = getExtraCharge(
          items || [],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE",
        );
        if (table0ChargeAmount > 0) {
          extraCharges.push({
            name: qrGroup.name,
            amount: table0ChargeAmount,
            charge_type: qrGroup.charge_type || "FLAT_FEE",
          });
        }
      }

      if (
        !isQrScan &&
        deliveryInfo?.cost &&
        !deliveryInfo?.isOutOfRange &&
        orderType === "delivery"
      ) {
        extraCharges.push({
          name: "Delivery Charge",
          amount: deliveryInfo.cost,
          charge_type: "FLAT_FEE",
        });
      }

      const result = await placeOrder(
        hotelData,
        tableNumber,
        qrId as string,
        gstAmount,
        extraCharges.length > 0 ? extraCharges : null,
        undefined,
        orderNote || "",
        tableName,
      );

      if (result) {
        if (result.id) {
          localStorage?.setItem("last-order-id", result.id);
        }

        if (onSuccessCallback) {
          onSuccessCallback();
        }
        setOrderStatus("success");
      } else {
        toast.error("Failed to place order. Please try again.");
        setOrderStatus("idle");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order. Please try again.");
      setOrderStatus("idle");
    }
  };

  const handleLoginSuccess = () => {
    const savedArea = localStorage?.getItem(
      `hotel-${hotelData.id}-selected-area`,
    );
    if (savedArea && !selectedLocation) {
      setSelectedLocation(savedArea);
    }
    setShowLoginDrawer(false);
  };

  const handleCloseSuccessDialog = () => {
    setAddress("");
    setOrderNote("");
    clearOrder();
    setOpenPlaceOrderModal(false);
    setOrderStatus("idle");
  };

  const minimumOrderAmount = deliveryInfo?.minimumOrderAmount || 0;

  const isPlaceOrderDisabled =
    orderStatus === "loading" ||
    (tableNumber === 0 && !orderType) ||
    (isDelivery &&
      hasDelivery &&
      !isQrScan &&
      (!address ||
        ((hotelData?.delivery_rules?.needDeliveryLocation ?? true) &&
          !selectedCoords))) ||
    (isDelivery && deliveryInfo?.isOutOfRange) ||
    (hasMultiWhatsapp && !selectedLocation);

  const { qrData } = useQrDataStore();

  return (
    <>
      <div
        className={`fixed inset-0 z-[1000] bg-stone-50 ${
          open_place_order_modal ? "block" : "hidden"
        }`}
      >
        {/* Modern Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 shadow-sm z-10">
          <div className="flex items-center gap-4 p-4">
            <button
              onClick={() => {
                setOpenPlaceOrderModal(false);
                setOpenDrawerBottom(true);
              }}
              className="p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-stone-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Review Your Order
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                {items?.length || 0} item{(items?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 pb-32 overflow-y-auto max-h-[calc(100vh-80px)]">
          {(items?.length ?? 0) > 0 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <ItemsCard
                items={items || []}
                increaseQuantity={increaseQuantity}
                decreaseQuantity={decreaseQuantity}
                removeItem={removeItem}
                currency={hotelData?.currency || "₹"}
              />

              {tableNumber === 0 && (
                <OrderTypeCard
                  orderType={orderType}
                  setOrderType={setOrderType}
                />
              )}

              <MultiWhatsappCard
                hotelData={hotelData}
                selectedLocation={selectedLocation}
                setSelectedLocation={handleSelectHotelLocation}
              />

              {isQrScan ? (
                <TableNumberCard
                  hotelData={hotelData}
                  tableNumber={tableNumber}
                  tableName={qrData?.table_name || undefined}
                />
              ) : isDelivery && orderType === "delivery" ? (
                <UnifiedAddressSection
                  address={address || ""}
                  setAddress={setAddress}
                  deliveryInfo={deliveryInfo}
                  hotelData={hotelData}
                />
              ) : null}

              <BillCard
                items={items || []}
                currency={hotelData?.currency || "₹"}
                gstPercentage={hotelData?.gst_percentage}
                deliveryInfo={deliveryInfo}
                isDelivery={isDelivery && !isQrScan && orderType === "delivery"}
                qrGroup={qrGroup}
                hotelData={hotelData}
              />

              {/* Order Note */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5"
              >
                <h3 className="font-semibold text-gray-900 text-base mb-3">
                  Special Instructions
                </h3>
                <Textarea
                  placeholder="Add cooking instructions, allergies, or delivery notes..."
                  value={orderNote ?? ""}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="resize-none rounded-lg border-stone-200 text-gray-900 placeholder:text-gray-400"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-stone-500 mt-2 text-right">
                  {(orderNote ?? "").length}/500 characters
                </div>
              </motion.div>

              {!user && <LoginCard setShowLoginDrawer={setShowLoginDrawer} />}

              {isDelivery &&
                !isQrScan &&
                orderType === "delivery" &&
                deliveryInfo?.isOutOfRange && (
                  <div className="text-sm text-red-600 p-4 bg-red-50 rounded-xl text-center border border-red-200">
                    ⚠️ Delivery is not available to your selected location
                  </div>
                )}

              {(items?.length === 0 ||
                (isDelivery &&
                  orderType === "delivery" &&
                  (totalPrice ?? 0) < minimumOrderAmount)) && (
                <div className="text-sm text-amber-700 p-4 bg-amber-50 rounded-xl text-center border border-amber-200">
                  ⚠️ Minimum order amount for delivery is{" "}
                  {hotelData?.currency || "₹"}
                  {deliveryInfo?.minimumOrderAmount.toFixed(2)}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                {user?.role !== "partner" && user?.role !== "superadmin" ? (
                  <>
                    {isAndroid ? (
                      <button
                        onClick={() =>
                          handlePlaceOrder(() => {
                            if (!hotelData.petpooja_restaurant_id) {
                              const whatsappLink = getWhatsappLink(
                                orderId as string,
                              );
                              window.open(whatsappLink, "_blank");
                            }
                          })
                        }
                        disabled={
                          isPlaceOrderDisabled ||
                          !user ||
                          items?.length === 0 ||
                          (isDelivery &&
                            orderType === "delivery" &&
                            (totalPrice ?? 0) < minimumOrderAmount)
                        }
                        className="w-full px-6 py-4 bg-[#B5581A] text-white rounded-xl hover:bg-[#a64e2a] transition-all duration-300 font-semibold shadow-lg shadow-[#B5581A]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        {orderStatus === "loading" ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Placing Order...
                          </span>
                        ) : (
                          "Place Order"
                        )}
                      </button>
                    ) : (
                      <>
                        {hotelData.petpooja_restaurant_id ? (
                          <button
                            onClick={() => handlePlaceOrder()}
                            disabled={
                              isPlaceOrderDisabled ||
                              !user ||
                              items?.length === 0 ||
                              (isDelivery &&
                                orderType === "delivery" &&
                                (totalPrice ?? 0) < minimumOrderAmount)
                            }
                            className="w-full px-6 py-4 bg-[#B5581A] text-white rounded-xl hover:bg-[#a64e2a] transition-all duration-300 font-semibold shadow-lg shadow-[#B5581A]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                          >
                            {orderStatus === "loading" ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Placing Order...
                              </span>
                            ) : (
                              "Place Order"
                            )}
                          </button>
                        ) : (
                          <Link
                            href={getWhatsappLink(orderId as string)}
                            target="_blank"
                            onClick={(e) => {
                              const isDisabled =
                                isPlaceOrderDisabled ||
                                !user ||
                                items?.length === 0 ||
                                (isDelivery &&
                                  orderType === "delivery" &&
                                  (totalPrice ?? 0) < minimumOrderAmount);

                              if (isDisabled) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <button
                              onClick={() => handlePlaceOrder()}
                              disabled={
                                isPlaceOrderDisabled ||
                                !user ||
                                items?.length === 0 ||
                                (isDelivery &&
                                  orderType === "delivery" &&
                                  (totalPrice ?? 0) < minimumOrderAmount)
                              }
                              className="w-full px-6 py-4 bg-[#B5581A] text-white rounded-xl hover:bg-[#a64e2a] transition-all duration-300 font-semibold shadow-lg shadow-[#B5581A]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                              {orderStatus === "loading" ? (
                                <span className="flex items-center justify-center gap-2">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  Placing Order...
                                </span>
                              ) : (
                                "Place Order"
                              )}
                            </button>
                          </Link>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-red-600 text-center text-sm bg-red-50 py-3 rounded-xl border border-red-200">
                    Login as user to place orders
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t h-4"
          style={{
            bottom: keyboardOpen
              ? `${window.visualViewport?.offsetTop || 0}px`
              : "0",
          }}
        />

        <LoginDrawer
          showLoginDrawer={showLoginDrawer}
          setShowLoginDrawer={setShowLoginDrawer}
          hotelId={hotelData?.id || ""}
          hotelData={hotelData}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>

      <OrderStatusDialog
        status={orderStatus}
        onClose={handleCloseSuccessDialog}
      />
    </>
  );
};

export default PlaceOrderModal;
