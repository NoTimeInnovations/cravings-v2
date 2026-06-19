"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";

// Google Maps Platform request types we meter. "request count" granularity:
// one row = one billable-ish request to Google.
export type GoogleApi =
  | "autocomplete" // Places Autocomplete (per keystroke request)
  | "place_details" // Place Details
  | "geocode" // Geocoding / reverse geocoding
  | "maps_js" // Maps JS dynamic map load
  | "directions" // Directions / Routes
  | "other";

const INSERT = `
  mutation TrackGoogleApi($obj: google_api_usage_insert_input!) {
    insert_google_api_usage_one(object: $obj) { id }
  }
`;

/**
 * Records a single Google Maps Platform request for superadmin usage analytics.
 * Fire-and-forget and fully swallowed on error — usage metering must never break
 * a user flow. Callable from the server or (as a server action) from the client.
 */
export async function trackGoogleApi(input: {
  api: GoogleApi;
  partnerId?: string | null;
  orderId?: string | null;
  source?: string | null;
}): Promise<void> {
  try {
    await fetchFromHasura(INSERT, {
      obj: {
        api: input.api,
        partner_id: input.partnerId || null,
        order_id: input.orderId || null,
        source: input.source || null,
      },
    });
  } catch (e) {
    console.warn("[trackGoogleApi] failed", e);
  }
}
