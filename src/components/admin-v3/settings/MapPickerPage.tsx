"use client";

import * as React from "react";
import { Loader2, MapPin } from "lucide-react";
import {
  Autocomplete,
  GoogleMap,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";

import { V3Card, AdminV3Button } from "../ui/primitives";
import { useDeclareSubPage } from "./controls";

/**
 * Drag-a-pin location picker for Store profile → Address.
 *
 * A sub-PAGE, not a dialog: it replaces the Address card in place and comes
 * back with a back arrow, the same way Delivery Pool swaps in Add rider and
 * Settings. A map is the wrong shape for a modal — it wants the width, and a
 * dialog put the Places dropdown outside the dialog's own DOM, where Radix
 * reads picking a suggestion as an outside click.
 *
 * Same behaviour admin-v2's LocationSettings has — search, click or drag to
 * place the pin, then reverse-geocode so the address text follows the pin — but
 * it hands the result back instead of saving. The Address tab is a
 * useSectionDraft form with one Save button for the whole card, so writing here
 * would bypass it and half-save the tab.
 *
 * `libraries` MUST be module-level and never rebuilt: useLoadScript compares it
 * by identity, and a fresh array each render makes it tear the script down and
 * reload it in a loop.
 */
const LIBRARIES: "places"[] = ["places"];

/** Bengaluru — only ever used when a store has no pin and no search yet. */
const FALLBACK = { lat: 12.9716, lng: 77.5946 };

export interface PickedPlace {
  lat: number;
  lng: number;
  /** Formatted address; empty when the geocoder gave us nothing usable. */
  address: string;
  district: string;
  state: string;
  country: string;
  placeId: string;
}

export function MapPickerPage({
  lat,
  lng,
  onBack,
  onPick,
}: {
  /** Current pin, or 0/0 when the store has never set one. */
  lat: number;
  lng: number;
  onBack: () => void;
  onPick: (place: PickedPlace) => void;
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const mapRef = React.useRef<google.maps.Map | null>(null);
  const acRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  const [picked, setPicked] = React.useState<PickedPlace | null>(null);
  const [geocoding, setGeocoding] = React.useState(false);

  const hasSaved = !!(lat && lng);
  const center = picked
    ? { lat: picked.lat, lng: picked.lng }
    : hasSaved
      ? { lat, lng }
      : FALLBACK;

  /**
   * Pull the administrative parts out of a Google components array.
   *
   * The formatted address alone is not enough: the City/State/Country fields on
   * the tab are separate columns, and moving the pin to another city without
   * this leaves them describing the OLD place.
   */
  const partsOf = (components?: google.maps.GeocoderAddressComponent[]) => {
    const get = (type: string) =>
      components?.find((c) => c.types.includes(type))?.long_name || "";
    return {
      district: get("administrative_area_level_2") || get("locality"),
      state: get("administrative_area_level_1"),
      country: get("country"),
    };
  };

  const reverseGeocode = React.useCallback(
    (nextLat: number, nextLng: number) => {
      // Show the pin immediately; the address catches up when Google answers.
      setPicked({
        lat: nextLat,
        lng: nextLng,
        address: "",
        district: "",
        state: "",
        country: "",
        placeId: "",
      });
      if (!isLoaded) return;
      setGeocoding(true);
      new google.maps.Geocoder().geocode(
        { location: { lat: nextLat, lng: nextLng } },
        (results, status) => {
          setGeocoding(false);
          const hit = status === "OK" ? results?.[0] : undefined;
          if (!hit) return;
          setPicked({
            lat: nextLat,
            lng: nextLng,
            address: hit.formatted_address || "",
            placeId: hit.place_id || "",
            ...partsOf(hit.address_components),
          });
        },
      );
    },
    [isLoaded],
  );

  const onPlaceChanged = React.useCallback(() => {
    const place = acRef.current?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;
    const nextLat = loc.lat();
    const nextLng = loc.lng();
    setPicked({
      lat: nextLat,
      lng: nextLng,
      address: place?.formatted_address || "",
      placeId: place?.place_id || "",
      ...partsOf(place?.address_components),
    });
    mapRef.current?.panTo({ lat: nextLat, lng: nextLng });
    mapRef.current?.setZoom(16);
  }, []);

  const noKey = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Hand the breadcrumb (`Settings / Store profile / Select location`), the hint
  // line and the back arrow to the Settings shell, which also hides the tab bar
  // while this is up. Clears itself on unmount.
  useDeclareSubPage({
    title: "Select location",
    hint: "Search for your store, or tap the map to drop the pin. Drag it to fine-tune — the address fields follow the pin.",
    onBack,
  });

  return (
    <V3Card className="overflow-hidden">
      {isLoaded && (
        <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
          <Autocomplete
            onLoad={(ac) => {
              acRef.current = ac;
            }}
            onPlaceChanged={onPlaceChanged}
            fields={[
              "address_components",
              "geometry",
              "formatted_address",
              "place_id",
              "name",
            ]}
          >
            <input
              type="text"
              placeholder="Search for your store or an address…"
              translate="no"
              className="notranslate h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal leading-none text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            />
          </Autocomplete>
        </div>
      )}

      {/* An explicit height, because GoogleMap fills its box and the box has
            no content of its own to size against. */}
      <div className="relative h-[300px] bg-zinc-100 lg:h-[380px] dark:bg-zinc-800">
        {noKey || loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <MapPin className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
            <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
              The map could not load
            </p>
            <p className="max-w-[360px] text-[12px] leading-[1.5] text-zinc-500 dark:text-zinc-400">
              {noKey
                ? "No Google Maps key is configured for this environment."
                : "Google Maps failed to load. Check the connection and try again."}{" "}
              You can still type the latitude and longitude by hand.
            </p>
          </div>
        ) : !isLoaded ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={center}
            zoom={hasSaved || picked ? 16 : 12}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            onClick={(e) => {
              if (e.latLng) reverseGeocode(e.latLng.lat(), e.latLng.lng());
            }}
            options={{ streetViewControl: false, mapTypeControl: false }}
          >
            {(picked || hasSaved) && (
              <Marker
                position={
                  picked ? { lat: picked.lat, lng: picked.lng } : { lat, lng }
                }
                draggable
                onDragEnd={(e) => {
                  if (e.latLng) reverseGeocode(e.latLng.lat(), e.latLng.lng());
                }}
              />
            )}
          </GoogleMap>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 gap-y-2.5 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
        <div className="min-w-0 flex-[1_1_240px]">
          {picked ? (
            <>
              <div
                translate="no"
                className="notranslate text-[12.5px] font-medium leading-snug text-zinc-950 dark:text-zinc-50"
              >
                {picked.address ||
                  (geocoding ? "Looking up the address…" : "Pin set")}
              </div>
              <div className="mt-0.5 text-[12px] leading-snug tabular-nums text-zinc-400 dark:text-zinc-500">
                {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}
              </div>
            </>
          ) : (
            <div className="text-[12.5px] leading-snug text-zinc-400 dark:text-zinc-500">
              {hasSaved
                ? "Drag the pin or tap the map to move it."
                : "No pin yet — search, or tap the map to place one."}
            </div>
          )}
        </div>

        <div className="ml-auto flex gap-2">
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3.5 text-[13px]"
            onClick={onBack}
          >
            Cancel
          </AdminV3Button>
          {/* Confirming only fills the form — the tab's own Save button is
                still what writes it, same as every other field here. */}
          <AdminV3Button
            variant="primary"
            className="h-[34px] px-3.5 text-[13px] font-medium"
            disabled={!picked}
            onClick={() => {
              if (!picked) return;
              onPick(picked);
              onBack();
            }}
          >
            Use this location
          </AdminV3Button>
        </div>
      </div>
    </V3Card>
  );
}
