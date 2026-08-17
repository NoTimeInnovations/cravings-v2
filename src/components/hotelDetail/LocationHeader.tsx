"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { trackMaps } from "@/lib/mapsUsage";
import { MapPin, ChevronDown, X } from "lucide-react";
import { useLocationStore } from "@/store/geolocationStore";
import useOrderStore from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { createPortal } from "react-dom";
import { calculateDeliveryDistanceAndCost } from "./OrderDrawer";
import { setOnboardingDataCookie } from "@/app/auth/actions";
import {
  saveLastDeliveryLocation,
  OPEN_LOCATION_PICKER_EVENT,
  type LocationPickerRequest,
} from "@/lib/deliveryLocation";
import AddressPickerBody from "./placeOrder/AddressPickerBody";
import AddressPickerV2 from "./placeOrder/AddressPickerV2";
import type { SavedAddress } from "./placeOrder/AddressManagementModal";
import { upsertLocalAddress } from "@/lib/localAddresses";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserAddressesMutation } from "@/api/auth";
import { toast } from "sonner";
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

/**
 * The "DELIVER TO" bar on the Default / Compact / Sidebar layouts, and the
 * address picker behind it.
 *
 * The picker body is AddressPickerBody — the SAME component V3/V4/V5/V6 and both
 * checkouts use. It used to be a bespoke sheet here: a Places search box plus a
 * "Recent Locations" list kept under its own `recent-delivery-locations`
 * localStorage key. That sheet showed the customer's saved addresses nowhere at
 * all, so on these three layouts "Change location" — from the header, or from
 * the "Deliver to this address?" confirm sheet before checkout — offered a
 * history of places recently USED and no way to pick the Home or Office address
 * they had already saved. Everything it wrote also landed in a key no other
 * screen read, so a location chosen here never became a saved address and never
 * showed as selected at checkout.
 *
 * Sharing the component makes one address list, ordered by what was last
 * SELECTED, reachable from every layout.
 */
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
  const [displayAddress, setDisplayAddress] = useState<string>("");
  // Map fine-tune / new-address form, for search results and "Add New Address".
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapInitial, setMapInitial] = useState<
    { address?: string; coords: { lat: number; lng: number } } | null
  >(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const { coords } = useLocationStore();
  const { userAddress, setUserAddress, setUserCoordinates } = useOrderStore();
  const { userData: authUser } = useAuthStore();

  const savedAddresses = useMemo(
    () => (((authUser as any)?.addresses || []) as SavedAddress[]),
    [(authUser as any)?.addresses],
  );

  const partnerCoords = useMemo(() => {
    const c = (hoteldata?.geo_location as any)?.coordinates;
    // GeoJSON is [lng, lat]; swapping them yields a plausible but wrong distance.
    return Array.isArray(c) && c.length >= 2 ? { lat: c[1], lng: c[0] } : null;
  }, [hoteldata?.geo_location]);

  const deliveryRadius = hoteldata?.delivery_rules?.delivery_radius || 0;
  const storeName = hoteldata?.store_name || "";
  const storeLocation =
    hoteldata?.location_details || hoteldata?.district || hoteldata?.country || "";

  const googleReverseGeocode = useCallback(
    (lat: number, lng: number): Promise<string | null> => {
      if (!isLoaded) return Promise.resolve(null);
      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        void trackMaps({ api: "geocode", partnerId: hoteldata?.id, source: "location_header" });
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          resolve(status === "OK" && results?.[0] ? results[0].formatted_address : null);
        });
      });
    },
    [isLoaded, hoteldata?.id],
  );

  // The delivery-location confirm sheet (View Cart) asks for the picker by
  // event rather than holding a ref, because it renders from OrderDrawer — a
  // different subtree, and in some layouts a different portal.
  useEffect(() => {
    const onRequest = (e: Event) => {
      // Tell the caller a picker really opened — it falls back to checkout
      // otherwise, since this component is not mounted on every screen.
      const detail = (e as CustomEvent<LocationPickerRequest>).detail;
      if (detail) detail.handled = true;
      setShowPicker(true);
    };
    window.addEventListener(OPEN_LOCATION_PICKER_EVENT, onRequest);
    return () => window.removeEventListener(OPEN_LOCATION_PICKER_EVENT, onRequest);
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

  /**
   * Commit a chosen delivery location: store, device record, cookie, then the
   * radius check.
   *
   * Coords are optional because a partner that doesn't require a pin can deliver
   * to a plain address; the distance check is simply skipped there rather than
   * the choice being rejected.
   */
  const commitLocation = useCallback(
    async (chosen: string, next: { lat: number; lng: number } | null) => {
      if (!chosen.trim() && !next) return;
      if (next) {
        setUserCoordinates(next);
        useLocationStore.getState().setCoords(next);
      }
      setUserAddress(chosen);
      setDisplayAddress(chosen);

      // Persist the choice, or it survives only until the next reload: the order
      // store IS persisted, but OnboardingFlow restores `onboarding_data` over it
      // on every mount, and this picker never used to write that. The customer saw
      // their new address revert to the old one — see src/lib/deliveryLocation.ts.
      // localStorage first (synchronous, so the restore has it immediately), then
      // the cookie, which is what the server reads for the SSR skip decision.
      saveLastDeliveryLocation(hoteldata?.id, chosen, next);
      if (hoteldata?.id) {
        // Fire-and-forget: a failed cookie write must not block the picker
        // closing, and localStorage above already carries the restore.
        setOnboardingDataCookie(hoteldata.id, { address: chosen, coords: next }).catch(
          () => {},
        );
      }

      setShowPicker(false);

      if (!next) return;
      await calculateDeliveryDistanceAndCost(hoteldata, next);
      // Read the result after the store settles rather than trusting a return
      // value the function doesn't give us.
      setTimeout(() => {
        if (useOrderStore.getState().deliveryInfo?.isOutOfRange) setShowUnavailable(true);
      }, 500);
    },
    [hoteldata, setUserAddress, setUserCoordinates],
  );

  /** A freshly-entered address from the map/details form: save it to the
   *  customer's list (local always, DB when signed in) and select it. */
  const persistAndCommit = useCallback(
    async (saved: SavedAddress) => {
      const fullAddress =
        saved.address ||
        [saved.flat_no, saved.house_no, saved.area, saved.city].filter(Boolean).join(", ");
      const next =
        saved.latitude != null && saved.longitude != null
          ? { lat: saved.latitude, lng: saved.longitude }
          : null;
      const stamped = { ...saved, savedAt: Date.now() };
      upsertLocalAddress(stamped, Date.now());
      if (authUser && (authUser as any).role === "user") {
        const existing = [...savedAddresses];
        const idx = existing.findIndex((x) => x.id === stamped.id);
        if (idx >= 0) existing[idx] = stamped;
        else existing.push(stamped);
        try {
          await fetchFromHasura(updateUserAddressesMutation, {
            id: authUser.id,
            addresses: existing,
          });
          useAuthStore.setState({
            userData: { ...(authUser as any), addresses: existing } as any,
          });
        } catch {
          toast.error("Failed to save address");
        }
      }
      setMapPickerOpen(false);
      setMapInitial(null);
      await commitLocation(fullAddress, next);
    },
    [authUser, savedAddresses, commitLocation],
  );

  const deleteSavedAddress = useCallback(
    async (id: string) => {
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
    },
    [authUser, savedAddresses],
  );

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
          <p className="text-white text-[14px] font-semibold truncate">{shortAddress}</p>
        </div>
      </div>

      {/* Location Picker Bottom Sheet */}
      {showPicker && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setShowPicker(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-gray-50 rounded-t-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 bg-white flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Choose a Location</h3>
              <button
                onClick={() => setShowPicker(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Brand / Outlet row */}
            {brandHeader && (
              <button
                type="button"
                onClick={() => { setShowPicker(false); brandHeader.onChange(); }}
                className="shrink-0 w-full flex items-center gap-3 px-5 py-3 bg-white border-b hover:bg-gray-100 transition-colors text-left"
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

            {/* Saved addresses + search + current location — the same body the
                other layouts and both checkouts render. */}
            <div className="flex min-h-0 flex-1 flex-col pt-3">
              <AddressPickerBody
                currentAddress={userAddress || ""}
                onSelect={(addr, next) => { void commitLocation(addr, next); }}
                onPickForMap={(addr, next) => {
                  setMapInitial(next ? { address: addr, coords: next } : null);
                  setMapPickerOpen(true);
                }}
                onAddNew={() => {
                  setMapInitial(null);
                  setMapPickerOpen(true);
                }}
                savedAddresses={savedAddresses}
                onDeleteSaved={deleteSavedAddress}
                partnerCoords={partnerCoords}
                partnerId={hoteldata?.id}
                accent={accent}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Map picker for new / searched delivery addresses.
          Mounted only while open: its useLoadScript sits ABOVE its own
          `if (!open) return null`, so keeping it mounted would run the maps
          loader on every page view of these three layouts — the busiest ones —
          for a sheet most customers never open. A fresh mount per open is also
          the correct starting state for a form. */}
      {mapPickerOpen && (
        <AddressPickerV2
          open
          onClose={() => { setMapPickerOpen(false); setMapInitial(null); }}
          onSaved={(saved) => { void persistAndCommit(saved); }}
          hotelData={hoteldata}
          accent={accent}
          initialPick={mapInitial}
        />
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
              We are currently serving within {deliveryRadius} km from <span translate="no" className="notranslate">{storeLocation || storeName}</span>. Your selected location is outside our delivery area.
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
