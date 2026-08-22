"use client";

/**
 * RESTAURANTS NEARBY (superadmin) — "which WhatsApp-connected restaurants are
 * around this spot?"
 *
 * Type an address (Google Places autocomplete) OR drop a pin on the map, pick a
 * radius, and hit Search. The panel lists every ACTIVE RESTAURANT near that point
 * that has a connected WhatsApp Business number, sorted by distance, each with its
 * live open/closed state, today's hours, and its WhatsApp number. A "Copy list"
 * button lays the whole thing out as plain text to paste straight to a customer
 * asking "what's open near me?".
 *
 * "WhatsApp connected" = the partner has a whatsapp_business_integrations row with
 * a display_phone. That connected number is the only number shown — never any
 * other partner phone.
 *
 * Open/closed is computed exactly the way the customer storefront does it
 * (see src/screens/HotelMenuPage_v2.tsx): the manual `is_shop_open === false`
 * override wins, otherwise the working-hours schedule decides.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  GoogleMap,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";
import {
  Clock,
  Copy,
  Loader2,
  LocateFixed,
  MapPin,
  MessageCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  describeDay,
  describeNextOpen,
  formatTime12h,
  isStoreOpen,
  localNow,
  storeHoursFromSettings,
  type OpenState,
} from "@/lib/storeHours";

// Module-level so the array identity is stable — a fresh array each render makes
// useLoadScript think the config changed and warn about reloading the script.
const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = [
  "places",
];

// Bengaluru — the same fallback centre the partner dashboard's map uses.
const FALLBACK_CENTER = { lat: 12.9716, lng: 77.5946 };

// get_all_partners is a SETOF partners function (Hasura exposes an aggregate for
// it), so we can select any partner column alongside the computed distance.
const NEARBY_QUERY = `
query SuperadminNearbyPartners(
  $user_lat: float8!,
  $user_lng: float8!,
  $limit: Int
) {
  get_all_partners(
    args: {
      user_lat: $user_lat,
      user_lng: $user_lng,
      result_limit: $limit,
      result_offset: 0,
      district_filter: "%",
      search_query: "%",
      business_type_filter: "restaurant",
      status_filter: "active"
    }
  ) {
    id
    store_name
    location
    district
    timezone
    is_shop_open
    storefront_settings
    distance_meters(args: { user_lat: $user_lat, user_lng: $user_lng })
  }
}
`;

// The WhatsApp Business number per partner. Primary first so it's the one we keep.
const WA_QUERY = `
query SuperadminPartnerWhatsApp($ids: [uuid!]!) {
  whatsapp_business_integrations(
    where: { partner_id: { _in: $ids } }
    order_by: { is_primary: desc }
  ) {
    partner_id
    display_phone
  }
}
`;

interface NearbyPartner {
  id: string;
  store_name: string | null;
  location: string | null;
  district: string | null;
  timezone: string | null;
  is_shop_open: boolean | null;
  storefront_settings: unknown;
  distance_meters: number | null;
}

interface RowView {
  partner: NearbyPartner;
  /** The connected WhatsApp Business number — the only number shown. */
  waPhone: string;
  openNow: boolean;
  /** "Closes at 10:00 PM" / "Opens tomorrow at 9:00 AM" / "Manually closed". */
  statusLine: string;
  /** Today's configured window, e.g. "9:00 AM – 10:00 PM" or "No hours set". */
  todayHours: string;
  distanceKm: number | null;
}

const RADIUS_OPTIONS = [1, 2, 5, 10, 25, 50] as const;

function formatDistance(km: number | null): string {
  if (km == null) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Fold one partner row into everything the list and the copied text need. */
function toRowView(p: NearbyPartner, waPhone: string): RowView {
  const tz = p.timezone || "Asia/Kolkata";
  const hours = storeHoursFromSettings(p.storefront_settings);
  const state: OpenState = isStoreOpen(hours, tz);
  const manuallyClosed = p.is_shop_open === false;
  const openNow = !manuallyClosed && state.open;

  const at = localNow(tz);
  let statusLine: string;
  if (manuallyClosed) {
    statusLine = "Manually closed";
  } else if (state.open) {
    statusLine = state.closesAt
      ? `Closes at ${formatTime12h(state.closesAt)}`
      : "Open now";
  } else {
    statusLine = describeNextOpen(state, at.date) ?? "Closed";
  }

  // hours === null means no schedule configured → always open in this app.
  const todayHours = hours ? describeDay(hours.days[at.weekday]) : "No hours set";

  const distanceKm =
    p.distance_meters != null ? p.distance_meters / 1000 : null;

  return { partner: p, waPhone, openNow, statusLine, todayHours, distanceKm };
}

export default function RestaurantsNearby() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [addressLabel, setAddressLabel] = useState("");
  const [radiusKm, setRadiusKm] = useState<number>(5);

  const [rows, setRows] = useState<RowView[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // The address the current results belong to, for the copy header — stays put
  // even if the operator moves the pin before searching again.
  const [resultLabel, setResultLabel] = useState("");

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!isLoaded) return;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]?.formatted_address) {
          setAddressLabel(results[0].formatted_address);
        } else {
          setAddressLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      });
    },
    [isLoaded],
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCenter({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [reverseGeocode],
  );

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setCenter({ lat, lng });
    setAddressLabel(place.formatted_address || place.name || "");
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(15);
    }
  }, []);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter({ lat, lng });
        reverseGeocode(lat, lng);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(14);
        }
      },
      () => toast.error("Couldn't get your current location."),
    );
  }, [reverseGeocode]);

  // Fetch on demand — only when Search is clicked. The nearby function returns
  // nearest-first; we over-fetch then trim to the radius client-side (there's no
  // radius arg). A second query pulls each partner's WhatsApp number, and only
  // partners that have one are kept.
  const doSearch = useCallback(async () => {
    if (!center) {
      toast.error("Pick a location on the map or search an address first.");
      return;
    }
    setLoading(true);
    setSearched(true);
    setResultLabel(
      addressLabel || `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`,
    );
    try {
      const res = await fetchFromHasura(NEARBY_QUERY, {
        user_lat: center.lat,
        user_lng: center.lng,
        limit: 300,
      });
      const list: NearbyPartner[] = res?.get_all_partners ?? [];
      const ids = list.map((p) => p.id);

      const waByPartner = new Map<string, string>();
      if (ids.length) {
        const wa = await fetchFromHasura(WA_QUERY, { ids });
        for (const r of wa?.whatsapp_business_integrations ?? []) {
          if (!r.partner_id || !r.display_phone) continue;
          // is_primary desc ordering means the first hit is the primary number.
          if (!waByPartner.has(r.partner_id)) {
            waByPartner.set(r.partner_id, r.display_phone);
          }
        }
      }

      const built = list
        .filter((p) => waByPartner.has(p.id))
        .map((p) => toRowView(p, waByPartner.get(p.id)!));
      setRows(built);
    } catch (err) {
      console.error("Nearby restaurants fetch failed", err);
      toast.error("Couldn't load nearby restaurants.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [center, addressLabel]);

  const visibleRows = useMemo(
    () => rows.filter((r) => r.distanceKm != null && r.distanceKm <= radiusKm),
    [rows, radiusKm],
  );

  const openCount = useMemo(
    () => visibleRows.filter((r) => r.openNow).length,
    [visibleRows],
  );

  const copyList = useCallback(() => {
    if (!visibleRows.length) {
      toast.error("Nothing to copy yet.");
      return;
    }
    const header = `Restaurants near ${resultLabel || "the selected point"} (within ${radiusKm} km)`;
    const body = visibleRows
      .map((r, i) => {
        const name = r.partner.store_name || "Unnamed";
        const dist = formatDistance(r.distanceKm);
        const parts = [
          `${i + 1}. ${name} — ${dist}`,
          `   ${r.openNow ? "🟢 Open" : "🔴 Closed"} · ${r.statusLine}`,
          `   Hours today: ${r.todayHours}`,
          `   WhatsApp: ${r.waPhone}`,
        ];
        if (r.partner.location) parts.push(`   ${r.partner.location}`);
        return parts.join("\n");
      })
      .join("\n\n");
    const text = `${header}\n\n${body}`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`Copied ${visibleRows.length} restaurants.`))
      .catch(() => toast.error("Copy failed."));
  }, [visibleRows, resultLabel, radiusKm]);

  const copyRow = useCallback((r: RowView) => {
    const name = r.partner.store_name || "Unnamed";
    const lines = [
      `${name} — ${formatDistance(r.distanceKm)}`,
      `${r.openNow ? "🟢 Open" : "🔴 Closed"} · ${r.statusLine}`,
      `Hours today: ${r.todayHours}`,
      `WhatsApp: ${r.waPhone}`,
    ];
    if (r.partner.location) lines.push(r.partner.location);
    navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => toast.success("Copied."))
      .catch(() => toast.error("Copy failed."));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Search + map picker */}
      <div className="rounded-xl border-2 border-[#ffba79]/20 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            {isLoaded ? (
              <Autocomplete
                onLoad={(ac) => {
                  autocompleteRef.current = ac;
                }}
                onPlaceChanged={onPlaceChanged}
                fields={["geometry", "formatted_address", "name"]}
              >
                <Input
                  className="pl-9"
                  placeholder="Type an area, landmark or address…"
                />
              </Autocomplete>
            ) : (
              <Input className="pl-9" placeholder="Loading maps…" disabled />
            )}
          </div>
          <Button
            variant="outline"
            onClick={useCurrentLocation}
            className="shrink-0"
          >
            <LocateFixed className="mr-2 h-4 w-4" />
            Current location
          </Button>
        </div>

        <div className="mt-3 h-[320px] w-full overflow-hidden rounded-lg bg-gray-100">
          {loadError ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500">
              Google Maps could not load. Check the maps API key and try again.
            </div>
          ) : isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={center ?? FALLBACK_CENTER}
              zoom={center ? 14 : 11}
              onLoad={(map) => {
                mapRef.current = map;
              }}
              onClick={handleMapClick}
              options={{ streetViewControl: false, mapTypeControl: false }}
            >
              {center && <Marker position={center} />}
            </GoogleMap>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <p className="mt-2 flex items-start gap-2 text-xs text-gray-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" />
          <span>
            {center
              ? addressLabel ||
                `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`
              : "Search an address or tap the map to set a point."}
          </span>
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          Radius
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>

        <Button
          onClick={doSearch}
          disabled={!center || loading}
          className="bg-orange-600 text-white hover:bg-orange-700"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Search
        </Button>

        <div className="ml-auto flex items-center gap-3">
          {searched && !loading && (
            <span className="text-sm text-gray-600">
              {visibleRows.length} found · {openCount} open now
            </span>
          )}
          <Button
            variant="outline"
            onClick={copyList}
            disabled={!visibleRows.length}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy list
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border-2 border-[#ffba79]/20 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading nearby restaurants…
          </div>
        ) : !searched ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Pick a location, choose a radius, then hit Search.
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No WhatsApp-connected restaurants within {radiusKm} km of this point.
            {rows.length > 0 && " Try widening the radius."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleRows.map((r) => (
              <li
                key={r.partner.id}
                className="flex items-start gap-3 p-4 hover:bg-orange-50/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {r.partner.store_name || "Unnamed"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.openNow
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {r.openNow ? "Open" : "Closed"}
                    </span>
                    <span className="text-xs font-medium text-orange-600">
                      {formatDistance(r.distanceKm)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {r.statusLine}
                    </span>
                    <span className="text-gray-500">Today: {r.todayHours}</span>
                  </div>

                  <p className="mt-1 flex items-center gap-1 text-sm font-medium text-green-700">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {r.waPhone}
                  </p>

                  {r.partner.location && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                      {r.partner.location}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyRow(r)}
                  title="Copy this restaurant"
                  className="shrink-0 text-gray-400 hover:text-orange-600"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
