"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  GoogleMap,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Module-level so the array identity is stable — a new array every render makes
// useLoadScript think the config changed and warn about reloading the script.
const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = [
  "places",
];

/** Everything a dropped pin tells us about the place. */
export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
  district: string;
  state: string;
  country: string;
  placeId: string;
}

/**
 * Search / click / drag a pin to set the restaurant's exact location.
 *
 * Lifted from the partner dashboard's Settings → Location map (the only map
 * picker in the app; it's inlined there, not shared), with the styling moved
 * onto theme tokens so it works in the marketplace dashboard's dark mode.
 */
export function MapPickerModal({
  open,
  initialLat,
  initialLng,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  initialLat: number | null;
  initialLng: number | null;
  onCancel: () => void;
  onConfirm: (picked: PickedLocation) => void;
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng }
      : null,
  );
  const [address, setAddress] = useState("");
  const [parts, setParts] = useState({ district: "", state: "", country: "" });
  const [placeId, setPlaceId] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Re-seed from the form every time the modal is reopened, so reopening after
  // a pick shows the pin where the operator left it.
  useEffect(() => {
    if (!open) return;
    setSelected(
      initialLat != null && initialLng != null
        ? { lat: initialLat, lng: initialLng }
        : null,
    );
  }, [open, initialLat, initialLng]);

  // Pull district / state / country out of a Google address-components array so
  // the saved row reflects the place that was picked, not just its address line.
  const applyAddressParts = useCallback(
    (components?: google.maps.GeocoderAddressComponent[]) => {
      if (!components?.length) return;
      const get = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name || "";
      setParts({
        district: get("administrative_area_level_2") || get("locality"),
        state: get("administrative_area_level_1"),
        country: get("country"),
      });
    },
    [],
  );

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!isLoaded) return;
      setGeocoding(true);
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setGeocoding(false);
        if (status === "OK" && results?.[0]) {
          if (results[0].formatted_address) setAddress(results[0].formatted_address);
          if (results[0].place_id) setPlaceId(results[0].place_id);
          applyAddressParts(results[0].address_components);
        }
      });
    },
    [isLoaded, applyAddressParts],
  );

  const handlePinMoved = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setSelected({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [reverseGeocode],
  );

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setSelected({ lat, lng });
    if (place.place_id) setPlaceId(place.place_id);
    if (place.formatted_address) setAddress(place.formatted_address);
    applyAddressParts(place.address_components);
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(16);
    }
  }, [applyAddressParts]);

  if (!open) return null;

  return (
    // Above the Add-restaurant panel (z-[10000]) that opened it.
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-3">
      <div className="flex h-[86dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold tracking-tight">Pick the location</h3>
          {isLoaded && (
            <div className="w-full sm:max-w-sm">
              <Autocomplete
                onLoad={(ac) => {
                  autocompleteRef.current = ac;
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
                <Input placeholder="Search an address or landmark" />
              </Autocomplete>
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1 bg-muted/20">
          {loadError ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Google Maps could not load. Check the maps API key and try again.
            </div>
          ) : isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={{
                // Bengaluru is the fallback centre (same default the partner
                // dashboard uses) when there's nothing to centre on yet.
                lat: selected?.lat ?? 12.9716,
                lng: selected?.lng ?? 77.5946,
              }}
              zoom={selected ? 16 : 12}
              onLoad={(map) => {
                mapRef.current = map;
              }}
              onClick={handlePinMoved}
              options={{ streetViewControl: false, mapTypeControl: false }}
            >
              {selected && (
                <Marker
                  position={selected}
                  draggable
                  onDragEnd={handlePinMoved}
                />
              )}
            </GoogleMap>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex min-w-0 items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" />
            <span className="min-w-0 flex-1">
              {geocoding
                ? "Looking up the address…"
                : selected
                  ? address || `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`
                  : "Tap the map or search to drop a pin."}
            </span>
          </p>
          <div className="flex shrink-0 justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              disabled={!selected}
              onClick={() =>
                selected &&
                onConfirm({
                  lat: selected.lat,
                  lng: selected.lng,
                  address,
                  district: parts.district,
                  state: parts.state,
                  country: parts.country,
                  placeId,
                })
              }
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              Use this location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
