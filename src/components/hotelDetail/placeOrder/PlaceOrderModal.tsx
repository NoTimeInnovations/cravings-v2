"use client";
import useOrderStore, { OrderItem } from "@/store/orderStore";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore, User } from "@/store/authStore";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  LocateFixed,
  X,
  CheckCircle2,
  Edit,
  Trash2,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useLocationStore } from "@/store/geolocationStore";
import mapboxgl, { LngLatLike, IControl } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
};

// Add type for deliveryInfo
interface DeliveryInfo {
  distance: number;
  cost: number;
  ratePerKm: number;
  isOutOfRange: boolean;
  minimumOrderAmount: number;
}

// Add type for MapboxGeocoder
type MapboxGeocoder = IControl & {
  on: (
    event: string,
    callback: (e: {
      result: { center: [number, number]; place_name: string };
    }) => void
  ) => void;
};

// =================================================================
// Full-Page Address Management Component
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
  const [coordinates, setCoordinates] = useState<{lat: number; lng: number} | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

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
      if (editAddress.latitude && editAddress.longitude) {
        setCoordinates({lat: editAddress.latitude, lng: editAddress.longitude});
      }
    } else {
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
      setPincode("");
      setCoordinates(null);
    }
  }, [editAddress, open]);

  const getCurrentLocation = () => {
    console.log("REFRESH LOCATION");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          reverseGeocodeNominatim(latitude, longitude);
          toast.success("Location Displayed successfully");
        },
        (error) => {
          toast.error("Unable to get your location");
          console.error(error);
        }
      );
    }
  };

  useEffect(() => {
    if (coordinates && !pincode) {
      reverseGeocodeNominatim(coordinates.lat, coordinates.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates]);

  const initializeMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      toast.error("Mapbox token missing. Please set NEXT_PUBLIC_MAPBOX_TOKEN environment variable");
      return;
    }
    mapboxgl.accessToken = token as string;

    mapInstanceRef.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: coordinates ? [coordinates.lng, coordinates.lat] : [76.322455, 10.050525],
      zoom: 10,
      accessToken: token,
    });

    mapInstanceRef.current.on('load', () => {
      if (hotelData?.geo_location?.coordinates) {
        const [lng, lat] = hotelData.geo_location.coordinates;
        const el = document.createElement('div');
        el.className = 'w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg';
        el.style.backgroundImage = `url(${hotelData.store_banner})`;
        el.style.backgroundSize = 'cover';

        new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(mapInstanceRef.current!);
      }
    });

    mapInstanceRef.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setCoordinates({ lat, lng });
      
      if (markerRef.current) {
        markerRef.current.remove();
      }
      markerRef.current = new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current!);

      reverseGeocodeNominatim(lat, lng);
    });

    if (coordinates) {
      markerRef.current = new mapboxgl.Marker()
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(mapInstanceRef.current);
    }
  };

  useEffect(() => {
    if (showMap && open) {
      setTimeout(initializeMap, 100);
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap, open]);

  const isFormValid = () => {
    return (
      !!label &&
      !!(flatNo || houseNo) &&
      !!(street || roadNo) &&
      !!area &&
      !!city &&
      !!pincode &&
      coordinates !== null
    );
  };

  // ✅ CHANGE 1: This function now resets to the choice screen
  const resetLocationSelection = () => {
    setCoordinates(null);
    setShowMap(false); // Set to false to show the choice screen
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  const reverseGeocodeNominatim = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=18&countrycodes=in&accept-language=en`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Origin': window.location.origin,
          'User-Agent': 'CravingsApp/1.0 (your-email@example.com)'
        },
        mode: 'cors',
      });
      if (!res.ok) {
        console.error('Nominatim response not ok', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      const addr = data?.address || {};
      const districtVal = addr.state_district || addr.district || addr.county || "";
      const cityVal = addr.city || addr.town || addr.village || "";
      const postcode = addr.postcode || "";
      const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || "";

      if (districtVal) setDistrict(districtVal);
      if (cityVal) setCity(cityVal);
      if (postcode) {
        setPincode(postcode);
      } else {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (token) {
          try {
            const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=postcode,address,place&language=en&access_token=${token}`;
            const mbRes = await fetch(mapboxUrl);
            const mbData = await mbRes.json();
            const features = mbData?.features || [];
            let mbPostcode = "";
            for (const f of features) {
              if (f.place_type?.includes('postcode')) {
                mbPostcode = f.text || f.properties?.short_code || "";
              }
              if (!mbPostcode && Array.isArray(f.context)) {
                const pc = f.context.find((c: any) => (c.id as string)?.startsWith('postcode.'));
                if (pc) mbPostcode = pc.text || pc.properties?.short_code || "";
              }
              if (mbPostcode) break;
            }
            if (mbPostcode) setPincode(mbPostcode);
          } catch (err) {
            console.error('Mapbox fallback geocode failed', err);
          }
        }
      }
      if (neighbourhood && !area) setArea(neighbourhood);
    } catch (e) {
      console.error('Nominatim reverse geocode failed', e);
    }
  };

  const handleSave = async () => {
    if (!coordinates) {
      toast.error("Please select a location on the map or use your current location");
      return;
    }

    if (!isFormValid()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (label === "Other" && !customLabel.trim()) {
      toast.error("Please provide a custom label");
      return;
    }

    setSaving(true);
    try {
      const fullAddress = [flatNo, houseNo, roadNo, street, area, district, landmark ? `near ${landmark}` : null, city, pincode]
        .filter(Boolean)
        .join(", ");

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
      toast.success(editAddress ? "Address updated successfully" : "Address saved successfully");
    } catch (error) {
      toast.error("Failed to save address");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-white h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {editAddress ? "Edit Address" : "Add New Address"}
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-h-[calc(100vh-140px)]">
        {/* Location Selection */}
        {/* This block shows the choice buttons */}
        {!coordinates && !showMap ? (
          <div className="space-y-3">
            <Button
              onClick={getCurrentLocation}
              className="w-full"
              variant="outline"
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              Use My Current Location
            </Button>

            <div className="flex items-center">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-3 text-xs text-gray-500">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Button
              onClick={() => setShowMap(true)}
              className="w-full"
              variant="outline"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Select Location on Map
            </Button>
          </div>
        ) : !showMap ? ( // This block shows the "Change location" button when coordinates are set
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-green-50 text-green-700 border border-green-200">
              Location selected successfully
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={resetLocationSelection}
            >
              Change location
            </Button>
          </div>
        ) : null}

        {/* Map */}
        {showMap && (
           <div className="space-y-3">
            <div className="h-80 rounded-lg overflow-hidden border">
              <div ref={mapRef} className="w-full h-full" />
            </div>
             {/* ✅ CHANGE 2: Add a Cancel button next to the Confirm button */}
            <div className="flex gap-2">
                <Button 
                    variant="outline"
                    onClick={() => setShowMap(false)} 
                    className="w-full"
                >
                    Cancel
                </Button>
                <Button 
                    onClick={() => setShowMap(false)} 
                    className="w-full"
                    disabled={!coordinates}
                >
                    Confirm Location
                </Button>
            </div>
          </div>
        )}

        {/* Address Form */}
        <div className="space-y-4">
          {/* Label Selection */}
          <div>
            <Label className="text-sm font-medium">Address Label</Label>
            <div className="flex gap-2 mt-2">
              {["Home", "Work", "Other"].map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={label === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLabel(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
            {label === "Other" && (
              <Input
                placeholder="Name of Location"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          <div>
            <Label htmlFor="house_flat">Flat No / House No *</Label>
            <Input
              id="house_flat"
              placeholder="Flat No / House No"
              value={flatNo || houseNo}
              onChange={(e) => {
                setFlatNo(e.target.value);
                setHouseNo("");
              }}
              required
            />
          </div>

          <div>
            <Label htmlFor="road_street">Road Name / Street Name *</Label>
            <Input
              id="road_street"
              placeholder="Road Name / Street Name"
              value={street || roadNo}
              onChange={(e) => {
                setStreet(e.target.value);
                setRoadNo("");
              }}
              required
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Area/Locality *</Label>
            <Input
              placeholder="Area or Locality"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            />
          </div>

          <div>
            <Label className="text-sm font-medium">District</Label>
            <Input
              placeholder="District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Landmark</Label>
            <Input
              placeholder="Landmark (Optional)"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">City *</Label>
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Pincode *</Label>
              <Input
                placeholder="Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-white">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            editAddress ? "Update Address" : "Save Address"
          )}
        </Button>
      </div>
    </div>
  );
};

// =================================================================
// Unified Address Section Component
// =================================================================

const UnifiedAddressSection = ({
  address,
  setAddress,
  deliveryInfo,
  hotelData, // <-- MODIFICATION: Added hotelData prop
}: {
  address: string;
  setAddress: (addr: string) => void;
  deliveryInfo: DeliveryInfo | null;
  hotelData: HotelData; // <-- MODIFICATION: Added hotelData prop type
}) => {
    const { userData: user } = useAuthStore();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const savedAddresses = ((user as any)?.addresses || []) as SavedAddress[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (savedAddresses.length === 0) {
      return;
    }
    const defaultAddress = savedAddresses.find(addr => addr.isDefault) || savedAddresses[0];
    if (defaultAddress && defaultAddress.id !== selectedAddressId && !selectedAddressId) {
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
        } as any
      });
      
      return true;
    } catch (error) {
      console.error("Error saving addresses:", error);
      toast.error("Failed to save addresses");
      return false;
    }
  };

  const handleAddressSelect = (addr: SavedAddress | null) => {
    console.log("Selected Address:", addr);
    setSelectedAddressId(addr?.id || null);

    const fullAddress = addr?.address || [
      addr?.flat_no,
      addr?.house_no,
      addr?.road_no,
      addr?.street,
      addr?.area,
      addr?.district,
      addr?.landmark,
      addr?.city,
      addr?.pincode,
    ].filter(Boolean).join(", ");
    setAddress(fullAddress);
    
    if (addr?.latitude && addr?.longitude) {
      const locationData = {
        state: {
          coords: {
            lat: addr.latitude,
            lng: addr.longitude
          }
        }
      };
      localStorage?.setItem('user-location-store', JSON.stringify(locationData));
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
    const index = existing.findIndex(a => a.id === addr.id);

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
    const updated = savedAddresses.filter(a => a.id !== addressId);
    const success = await saveAddressesForUser(updated);
    if (success) {
      if (selectedAddressId === addressId) {
        setSelectedAddressId(null);
        setAddress("");
        setEditingAddress(null);
        handleAddressSelect(null)
      }
      toast.success("Address deleted successfully");
    }
  };

  const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);


  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">Delivery Address</h3>
        <Button
          variant="outline"
          className="border border-black hover:bg-gray-200"
          size="sm"
          onClick={() => {
            setEditingAddress(null);
            setShowAddressModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Address
        </Button>
      </div>

      {/* Address Dropdown */}
      <div className="relative mb-3" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full p-3 border rounded-md bg-white text-left flex justify-between items-center hover:bg-gray-50"
        >
          <span className="text-sm">
            {selectedAddress 
              ? `${selectedAddress.label}${selectedAddress.customLabel ? ` (${selectedAddress.customLabel})` : ""}`
              : "Select address"
            }
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
            {savedAddresses.length > 0 ? (
              savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => handleAddressSelect(addr)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {addr.label}{addr.customLabel ? ` (${addr.customLabel})` : ""}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {addr.address || [addr.flat_no, addr.house_no, addr.area, addr.district, addr.city].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-gray-500">No saved addresses</div>
            )}
          </div>
        )}
      </div>

      {/* Selected Address Display - Expanded but dropdown remains */}
      {selectedAddress && (
        <div className="border rounded-lg p-4 mb-3 bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-medium text-base mb-2">
                {selectedAddress.label}{selectedAddress.customLabel ? ` (${selectedAddress.customLabel})` : ""}
                {selectedAddress.isDefault && (
                  <span className="ml-2 text-xs bg-black text-white px-2 py-0.5 rounded">Default</span>
                )}
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {selectedAddress.address || [
                  selectedAddress.flat_no,
                  selectedAddress.house_no,
                  selectedAddress.road_no,
                  selectedAddress.street,
                  selectedAddress.area,
                  selectedAddress.district,
                  selectedAddress.landmark,
                  selectedAddress.city,
                  selectedAddress.pincode
                ].filter(Boolean).join(", ")}
              </div>
            </div>
            <div className="flex gap-2 ml-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingAddress(selectedAddress);
                  setShowAddressModal(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAddress(selectedAddress.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Address Management Modal */}
      <AddressManagementModal
        open={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSaved={handleAddressSaved}
        editAddress={editingAddress}
        hotelData={hotelData} // <-- MODIFICATION: Pass hotelData down
      />
    </div>
  );
};

// =================================================================
// New Order Status Dialog Component
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
      setLoadingText("Getting your items..."); // Reset on open
      const texts = ["Preparing your order...", "Finalizing your order..."];
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < texts.length) {
          setLoadingText(texts[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 2000); // Change text every 2 seconds
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
              className="text-center text-white p-8 bg-black/30 rounded-2xl shadow-lg flex flex-col items-center"
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
              <p className="mt-2 text-gray-300">
                Your order is confirmed and is being prepared.
              </p>
              <Button
                onClick={onClose}
                className="mt-8 bg-white text-black hover:bg-gray-200"
              >
                Close
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =================================================================
// Unchanged Components (OrderTypeCard, MultiWhatsappCard, etc.)
// =================================================================

// Order Type Card Component
const OrderTypeCard = ({
  orderType,
  setOrderType,
}: {
  orderType: "takeaway" | "delivery" | null;
  setOrderType: (type: "takeaway" | "delivery") => void;
}) => {
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

  const options = [
    { value: "takeaway", label: "Takeaway" },
    { value: "delivery", label: "Delivery" },
  ];

  return (
    <div className="border rounded-lg p-4 bg-white relative" ref={dropdownRef}>
      <h3 className="font-medium mb-3">Order Type</h3>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-3 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black text-left flex justify-between items-center"
        >
          <span>
            {orderType
              ? options.find((opt) => opt.value === orderType)?.label
              : "Select order type"}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
            <div
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setOrderType("takeaway");
                setIsOpen(false);
              }}
            >
              Takeaway
            </div>
            <div
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setOrderType("delivery");
                setIsOpen(false);
              }}
            >
              Delivery
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Multi WhatsApp Card Component
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
    <div className="border rounded-lg p-4 bg-white relative" ref={dropdownRef}>
      <h3 className="font-medium mb-3">Select Hotel Location</h3>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-3 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black text-left flex justify-between items-center"
        >
          <span>
            {selectedLocation ? selectedLocation.toUpperCase() : "Select Area"}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
            <div
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setSelectedLocation("");
                setIsOpen(false);
              }}
            >
              Select Area
            </div>
            {hotelData.whatsapp_numbers.map((item) => (
              <div
                key={item.area}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setSelectedLocation(item.area);
                  setIsOpen(false);
                }}
              >
                {item.area.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="font-bold text-lg mb-3">Your Order</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center border-b pb-2 gap-5"
          >
            <div>
              <DescriptionWithTextBreak
                spanClassName="text-sm text-black"
                accent="black"
                maxChars={15}
              >
                {item.name}
              </DescriptionWithTextBreak>
              <p className="text-xs text-gray-500">{item.category.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (item.quantity > 1) {
                      decreaseQuantity(item.id as string);
                    } else {
                      removeItem(item.id as string);
                    }
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center border"
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => increaseQuantity(item.id as string)}
                  className="w-6 h-6 rounded-full flex items-center justify-center border"
                >
                  +
                </button>
              </div>
              <span className="font-medium min-w-[60px] text-right">
                {currency}
                {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TableNumberCard = ({
  tableNumber,
  tableName,
}: {
  tableNumber: number;
  tableName?: string;
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="font-bold text-lg mb-3">Table Information</h3>

      {!tableName && (
        <div className="flex items-center text-sm gap-2">
          <span className="font-medium">Table Number:</span>
          <span className="text-lg font-semibold">{tableNumber}</span>
        </div>
      )}

      {tableName && (
        <div className="flex items-center text-sm gap-2">
          <span className="font-medium">Table Name:</span>
          <span className="text-lg font-semibold"> {tableName}</span>
        </div>
      )}
    </div>
  );
};

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
    0
  );

  const qrExtraCharges = qrGroup?.extra_charge
    ? getExtraCharge(
        items,
        qrGroup.extra_charge,
        qrGroup.charge_type || "FLAT_FEE"
      )
    : 0;

  const deliveryCharges =
    isDelivery && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange
      ? deliveryInfo.cost
      : 0;

  const taxableAmount = subtotal + qrExtraCharges;
  const gstAmount = (taxableAmount * (gstPercentage || 0)) / 100;

  const grandTotal = subtotal + qrExtraCharges + gstAmount + deliveryCharges;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold text-lg mb-3">Bill Summary</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Items Subtotal</span>
          <span>
            {currency}
            {subtotal.toFixed(2)}
          </span>
        </div>

        {qrGroup && qrExtraCharges > 0 ? (
          <div className="flex justify-between">
            <div>
              <span>{qrGroup.name || "Service Charge"}</span>
              <p className="text-xs text-gray-500">
                {qrGroup.charge_type === "PER_ITEM"
                  ? "Per item charge"
                  : "Fixed charge"}
              </p>
            </div>
            <span>
              {currency}
              {qrExtraCharges.toFixed(2)}
            </span>
          </div>
        ) : null}

        {gstPercentage ? (
          <div className="flex justify-between">
            <span>{`${hotelData?.country === "United Arab Emirates" ? "VAT" : "GST"} (${gstPercentage}%)`}</span>
            <span>
              {currency}
              {gstAmount.toFixed(2)}
            </span>
          </div>
        ) : null}

        {isDelivery && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange ? (
          <div className="flex justify-between">
            <div>
              <span>Delivery Charge</span>
              <p className="text-xs text-gray-500">
                Distance: {deliveryInfo.distance} km
              </p>
            </div>
            <span>
              {currency}
              {deliveryInfo.cost.toFixed(2)}
            </span>
          </div>
        ) : null}

        <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
          <span>Grand Total</span>
          <span>
            {currency}
            {grandTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

const LoginCard = ({
  setShowLoginDrawer,
}: {
  setShowLoginDrawer: (show: boolean) => void;
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="font-bold text-lg mb-2">Almost there!</h3>
      <p className="text-gray-600 mb-4">
        Login/create account quickly to place order
      </p>
      <Button onClick={() => setShowLoginDrawer(true)} className="w-full">
        Proceed with Phone Number
      </Button>
    </div>
  );
};

const LoginDrawer = ({
  showLoginDrawer,
  setShowLoginDrawer,
  hotelId,
  onLoginSuccess,
}: {
  showLoginDrawer: boolean;
  setShowLoginDrawer: (show: boolean) => void;
  hotelId: string;
  onLoginSuccess: () => void;
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithPhone } = useAuthStore();

  const handleLogin = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInWithPhone(phoneNumber, hotelId);
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 w-[90vw] max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-2">Login</h2>
        <p className="text-gray-600 mb-4">Enter your phone number to proceed</p>
        <div className="mb-4">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            type="tel"
            id="phone"
            value={phoneNumber}
            onChange={(e) =>
              setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="Enter your phone number"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowLoginDrawer(false)}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLogin}
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Continuing...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// Main PlaceOrderModal Component (Updated Logic)
// =================================================================

const PlaceOrderModal = ({
  hotelData,
  tableNumber,
  getWhatsappLink,
  qrId,
  qrGroup,
}: {
  hotelData: HotelData;
  tableNumber: number;
  getWhatsappLink: (orderId: string) => string;
  qrId: string | null;
  qrGroup: QrGroup | null;
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
  
  const [orderStatus, setOrderStatus] = useState<"idle" | "loading" | "success">(
    "idle"
  );

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
  }, [open_place_order_modal, items, setOpenDrawerBottom, setOpenPlaceOrderModal]);

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
      `hotel-${hotelData.id}-selected-area`
    );
    if (
      savedArea &&
      hotelData.whatsapp_numbers?.some((item) => item.area === savedArea)
    ) {
      setSelectedLocation(savedArea);
      return;
    }
    const selectedPhone = localStorage?.getItem(
      `hotel-${hotelData.id}-whatsapp-area`
    );
    if (selectedPhone) {
      const location = hotelData.whatsapp_numbers?.find(
        (item) => item.number === selectedPhone
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
        `hotel-${hotelData.id}-selected-area`
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
        (item) => item.area === location
      )?.number;
      localStorage?.setItem(
        `hotel-${hotelData.id}-whatsapp-area`,
        phoneNumber || ""
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

    // Check if address is selected for delivery orders
    if (orderType === 'delivery' && !address?.trim()) {
      toast.error("Please select a delivery address");
      return;
    }

    // Enhanced delivery address validation
    if (isDelivery) {
      if (hotelData?.delivery_rules?.needDeliveryLocation ?? true) {
        if (!address?.trim()) {
          toast.error("Please enter your delivery address");
          return;
        }
        
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
        hotelData?.gst_percentage as number
      );
      const extraCharges = [];

      if (isQrScan && qrGroup && qrGroup.name) {
        const qrChargeAmount = getExtraCharge(
          items || [],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE"
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
        orderType === "delivery"
      ) {
        const table0ChargeAmount = getExtraCharge(
          items || [],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE"
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
        orderNote || ""
      );

      if (result) {
        // Store order ID in localStorage for WhatsApp message
        if (result.id) {
          localStorage?.setItem('last-order-id', result.id);
        }
        
        // Execute callback first (for Android), then show success screen.
        if (onSuccessCallback) {
          onSuccessCallback();
        }
        setOrderStatus("success");
      } else {
        toast.error("Failed to place order. Please try again.");
        setOrderStatus("idle"); // Reset on failure
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order. Please try again.");
      setOrderStatus("idle"); // Reset on error
    }
  };

  const handleLoginSuccess = () => {
    const savedArea = localStorage?.getItem(
      `hotel-${hotelData.id}-selected-area`
    );
    if (savedArea && !selectedLocation) {
      setSelectedLocation(savedArea);
    }
    setShowLoginDrawer(false);
  };

  const handleCloseSuccessDialog = () => {
    setAddress('');
    setOrderNote('');
    clearOrder();
    setOpenPlaceOrderModal(false);
    setOrderStatus('idle');
  };

  const minimumOrderAmount = deliveryInfo?.minimumOrderAmount || 0;

const isPlaceOrderDisabled =
  orderStatus === "loading" ||                                           // Condition 1
  (tableNumber === 0 && !orderType) ||                                 // Condition 2
  (isDelivery && hasDelivery && !isQrScan && (!address || !selectedCoords)) || // Condition 3
  (isDelivery && deliveryInfo?.isOutOfRange) ||                          // Condition 4
  (hasMultiWhatsapp && !selectedLocation);                               // Condition 5

  const { qrData } = useQrDataStore();

  return (
    <>
      <div
        className={`fixed inset-0 z-[600] bg-gray-50 text-black ${
          open_place_order_modal ? "block" : "hidden"
        }`}
      >
        <div className="sticky top-0 bg-white border-b">
          <div className="flex items-center gap-4 p-4">
            <button
              onClick={() => {
                setOpenPlaceOrderModal(false);
                setOpenDrawerBottom(true);
              }}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Review Your Order</h1>
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

              {tableNumber === 0 && hasMultiWhatsapp && (
                <div className="h-2"></div>
              )}

              <MultiWhatsappCard
                hotelData={hotelData}
                selectedLocation={selectedLocation}
                setSelectedLocation={handleSelectHotelLocation}
              />

              {isQrScan ? (
                <>
                  <TableNumberCard
                    tableNumber={tableNumber}
                    tableName={qrData?.table_name || undefined}
                  />
                </>
              ) : isDelivery &&
                orderType === "delivery" &&
                (hotelData?.delivery_rules?.needDeliveryLocation ?? true) ? (
                <UnifiedAddressSection
                  address={address || ""}
                  setAddress={setAddress}
                  deliveryInfo={deliveryInfo}
                  hotelData={hotelData} // <-- MODIFICATION: Pass hotelData down
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

              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-medium mb-3">Order Note</h3>
                <textarea
                  placeholder="Add any special instructions or notes for this order..."
                  value={orderNote ?? ""}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full p-3 border rounded-md resize-none bg-white text-black"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-black bg-white mt-1">
                  {(orderNote ?? "").length}/500 characters
                </div>
              </div>

              {!user && <LoginCard setShowLoginDrawer={setShowLoginDrawer} />}

              {isDelivery &&
                !isQrScan &&
                orderType === "delivery" &&
                deliveryInfo?.isOutOfRange && (
                  <div className="text-sm text-red-600 p-2 bg-red-50 rounded text-center">
                    Delivery is not available to your selected location
                  </div>
                )}

              {(items?.length === 0 ||
                (isDelivery &&
                  orderType === "delivery" &&
                  (totalPrice ?? 0) < minimumOrderAmount)) && (
                <div className="text-sm text-red-600 p-2 bg-red-50 rounded text-center">
                  Minimum order amount for delivery is
                  {hotelData?.currency || "₹"}
                  {deliveryInfo?.minimumOrderAmount.toFixed(2)}
                </div>
              )}

              <div className="flex flex-col gap-3 mt-6">
                {(user?.role !== "partner" && user?.role !== "superadmin") ? (
                  <>
                    {isAndroid ? (
                      <Button
                        onClick={() =>
                          handlePlaceOrder(() => {
                            const whatsappLink = getWhatsappLink(orderId as string);
                            window.open(whatsappLink, "_blank");
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
                        className="w-full"
                      >
                        {orderStatus === "loading" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Placing Order...
                          </>
                        ) : (
                          "Place Order"
                        )}
                      </Button>
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
                        <Button
                          onClick={() => handlePlaceOrder()}
                          disabled={
                            isPlaceOrderDisabled ||
                            !user ||
                            items?.length === 0 ||
                            (isDelivery &&
                              orderType === "delivery" &&
                              (totalPrice ?? 0) < minimumOrderAmount)
                          }
                          className="w-full"
                        >
                          {orderStatus === "loading" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Placing Order...
                            </>
                          ) : (
                            "Place Order"
                          )}
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="text-red-500 text-center text-sm bg-red-50 py-2 rounded-sm">
                    {" "}
                    Login as user to place orders{" "}
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpenPlaceOrderModal(false);
                    setOpenDrawerBottom(true);
                  }}
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t h-4 "
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
          onLoginSuccess={handleLoginSuccess}
        />
      </div>

      <OrderStatusDialog status={orderStatus} onClose={handleCloseSuccessDialog} />
    </>
  );
};

export default PlaceOrderModal;