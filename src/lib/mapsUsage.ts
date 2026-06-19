// Client-side Google Maps usage metering. Wraps the trackGoogleApi server action
// and stamps every request with a per-checkout "maps session id" (sessionStorage)
// so that, once an order is placed, all the address-selection requests
// (autocomplete / place_details / geocode / map load) can be retro-attributed to
// that order via linkMapsUsageToOrder.

import { trackGoogleApi, type GoogleApi } from "@/app/actions/trackGoogleApi";

const KEY = "maps_session_id";

// Returns the current maps session id, creating one if none exists yet.
export function getMapsSessionId(): string {
  if (typeof window === "undefined") return "";
  let v = sessionStorage.getItem(KEY);
  if (!v) {
    v = crypto.randomUUID();
    sessionStorage.setItem(KEY, v);
  }
  return v;
}

// Reads the current session id without creating one (for the order link step).
export function peekMapsSessionId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(KEY) || "";
}

// Starts a fresh session — called after an order is placed so the next order's
// maps requests don't get linked to the previous order.
export function resetMapsSession(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
}

// Meter one Google Maps request from the client (fire-and-forget).
export function trackMaps(input: {
  api: GoogleApi;
  partnerId?: string | null;
  orderId?: string | null;
  source?: string | null;
}): void {
  void trackGoogleApi({ ...input, sessionId: getMapsSessionId() });
}
