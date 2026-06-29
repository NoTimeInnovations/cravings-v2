"use server";

import { trackGoogleApi } from "@/app/actions/trackGoogleApi";

/**
 * Google Place Details lookup for the quick-signup flow.
 *
 * The client picks a place via Places Autocomplete and sends us the `place_id`
 * (plus the autocomplete session token, which lets Google bill the
 * autocomplete + details pair as a single charge). We hit Place Details
 * server-side so the API key never reaches the browser.
 */

export interface GoogleReview {
  authorName: string;
  authorUrl: string | null;
  profilePhotoUrl: string | null;
  rating: number;
  relativeTime: string;
  text: string;
  timeUnix: number;
}

export interface GoogleBusinessData {
  name: string;
  placeId: string;
  formattedAddress: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  country: string | null;
  state: string | null;
  district: string | null;
  rating: number | null;
  totalRatings: number | null;
  website: string | null;
  types: string[];
  photoUrls: string[];
  // weekday_text from opening_hours, e.g. "Monday: 9:00 AM – 11:00 PM"
  weekdayHours: string[];
  reviews: GoogleReview[];
}

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function pickComponent(
  components: AddressComponent[] | undefined,
  type: string,
): string | null {
  if (!components) return null;
  return components.find((c) => c.types.includes(type))?.long_name || null;
}

// Reduce a Google phone string to bare digits only — no "+", no country code,
// no spaces/brackets/dashes. We prefer `formatted_phone_number` (the national
// format, which already excludes the country code) over the international one,
// then strip every non-digit. e.g. "+91 98765 43210" → national "098765 43210"
// → "09876543210"; "098765 43210" → "09876543210". A leading trunk "0" is left
// as-is (still a digit) — the requirement is "digits only, no country code".
function toDigitsOnly(
  national?: string | null,
  international?: string | null,
): string | null {
  const raw = national || international;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

export async function extractGoogleBusinessDataByPlaceId(
  placeId: string,
  sessionToken?: string,
): Promise<GoogleBusinessData> {
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Set GOOGLE_PLACES_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) on the server.",
    );
  }
  if (!placeId?.trim()) throw new Error("placeId is required");

  const fields = [
    "name",
    "formatted_address",
    "address_components",
    "international_phone_number",
    "formatted_phone_number",
    "geometry/location",
    "photos",
    "rating",
    "user_ratings_total",
    "website",
    "types",
    "opening_hours",
    "reviews",
  ].join(",");

  const url = new URL(`${PLACES_BASE}/details/json`);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", fields);
  url.searchParams.set("key", apiKey);
  if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);

  const res = await fetch(url.toString());
  // Meter the Place Details request for usage analytics.
  await trackGoogleApi({ api: "place_details", source: "signup_place_details" });
  const json = (await res.json()) as any;
  if (json.status !== "OK" || !json.result) {
    throw new Error(
      `Google Places lookup failed: ${json.status || "unknown"}`,
    );
  }
  const r = json.result;

  const photoRefs: string[] = (r.photos || [])
    .slice(0, 5)
    .map((p: any) => p.photo_reference);
  const photoUrls = photoRefs.map(
    (ref) =>
      `${PLACES_BASE}/photo?maxwidth=1600&photo_reference=${ref}&key=${apiKey}`,
  );

  const weekdayHours: string[] = r.opening_hours?.weekday_text ?? [];

  const reviews: GoogleReview[] = (r.reviews || []).map((rev: any) => ({
    authorName: rev.author_name || "Guest",
    authorUrl: rev.author_url ?? null,
    profilePhotoUrl: rev.profile_photo_url ?? null,
    rating: typeof rev.rating === "number" ? rev.rating : 5,
    relativeTime: rev.relative_time_description || "",
    text: rev.text || "",
    timeUnix: rev.time || 0,
  }));

  return {
    name: r.name,
    placeId,
    formattedAddress: r.formatted_address || "",
    phone: toDigitsOnly(
      r.formatted_phone_number,
      r.international_phone_number,
    ),
    lat: r.geometry?.location?.lat ?? null,
    lng: r.geometry?.location?.lng ?? null,
    country: pickComponent(r.address_components, "country"),
    state: pickComponent(r.address_components, "administrative_area_level_1"),
    district:
      pickComponent(r.address_components, "administrative_area_level_2") ||
      pickComponent(r.address_components, "locality"),
    rating: r.rating ?? null,
    totalRatings: r.user_ratings_total ?? null,
    website: r.website ?? null,
    types: r.types ?? [],
    photoUrls,
    weekdayHours,
    reviews,
  };
}
