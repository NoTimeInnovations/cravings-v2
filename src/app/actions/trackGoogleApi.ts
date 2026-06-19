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

const LINK = `
  mutation LinkMapsUsage($sessionId: String!, $orderId: uuid!) {
    update_google_api_usage(
      where: { session_id: { _eq: $sessionId }, order_id: { _is_null: true } }
      _set: { order_id: $orderId }
    ) { affected_rows }
  }
`;

/**
 * Attributes the Maps requests of a checkout session to the order it produced.
 * Address selection (autocomplete / details / geocode / map load) happens before
 * the order exists, so those rows are tagged with a session_id; once the order is
 * placed we stamp them with order_id. Called from placeOrder.
 */
export async function linkMapsUsageToOrder(
  sessionId: string,
  orderId: string,
): Promise<void> {
  if (!sessionId || !orderId) return;
  try {
    await fetchFromHasura(LINK, { sessionId, orderId });
  } catch (e) {
    console.warn("[linkMapsUsageToOrder] failed", e);
  }
}

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
  // Per-checkout maps session — lets order placement retro-link these requests
  // to the order that the address selection led to (see linkMapsUsageToOrder).
  sessionId?: string | null;
}): Promise<void> {
  try {
    await fetchFromHasura(INSERT, {
      obj: {
        api: input.api,
        partner_id: input.partnerId || null,
        order_id: input.orderId || null,
        source: input.source || null,
        session_id: input.sessionId || null,
      },
    });
  } catch (e) {
    console.warn("[trackGoogleApi] failed", e);
  }
}
