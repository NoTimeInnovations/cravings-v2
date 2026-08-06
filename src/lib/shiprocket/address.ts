// SERVER-ONLY. Turn one of our orders into the destination fields Shiprocket's
// parcel API demands.
//
// The problem this file exists to solve: parcel mode REQUIRES billing_pincode,
// billing_city, billing_state and billing_country on every order-create, and we do
// not store any of them. The address picker geocodes a pincode at checkout but
// folds it into the single `delivery_address` text column, so by dispatch time the
// structure is gone.
//
// So we recover it in two steps — read the pincode straight out of the address
// text, and only reverse-geocode when that fails. The regex path costs nothing and
// covers the common case (Google's formatted address almost always carries the
// PIN); the geocode is the fallback for hand-typed addresses.

import { trackGoogleApi } from "@/app/actions/trackGoogleApi";

if (typeof window !== "undefined") {
  throw new Error("src/lib/shiprocket/address.ts is server-only.");
}

export interface ResolvedAddress {
  pincode: string;
  city: string;
  state: string;
  country: string;
}

/**
 * An Indian PIN is six digits starting 1-9. Anchored on word boundaries so it does
 * not match the tail of a phone number or a house number like "560001A".
 */
const PIN_RE = /\b([1-9]\d{5})\b/;

export function extractPincode(address: string | null | undefined): string | null {
  if (!address) return null;
  // Search from the end: an address ends with its PIN, while a leading six-digit
  // run is far more likely to be a building or plot number.
  const matches = [...String(address).matchAll(new RegExp(PIN_RE.source, "g"))];
  const last = matches[matches.length - 1];
  return last ? last[1] : null;
}

function mapsKey(): string | null {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  );
}

/**
 * Reverse-geocode a drop pin into postal components.
 *
 * Best-effort: returns null on any failure so the caller reports a clear
 * "no pincode on this address" instead of an opaque Google error.
 */
async function reverseGeocode(
  lat: number,
  lng: number,
  partnerId?: string | null,
): Promise<Partial<ResolvedAddress> | null> {
  const key = mapsKey();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`,
      { signal: AbortSignal.timeout(10_000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = await res.json();
    // Bill the call to the same meter every other Google usage in this repo uses.
    trackGoogleApi({ api: "geocode", partnerId, source: "shiprocket_dispatch" }).catch(() => {});

    // Google answers a rejected or throttled key with HTTP 200 and an empty
    // results array. Without this check that reads as "no postal code here" and
    // silently degrades every shipment to the store's own city — the exact bug
    // this function exists to prevent, with nothing in the logs to notice it by.
    if (body?.status && body.status !== "OK") {
      console.warn(`[shiprocket] reverse geocode returned ${body.status}`);
      return null;
    }

    // Flatten EVERY result, not just results[0]. Google ranks results by
    // specificity, and for a roadside or rural drop pin the first entry is often a
    // `route` or `plus_code` with no postal_code while a later entry carries it.
    // Reading only the first would fail the dispatch for an address Google could
    // in fact locate.
    const components: any[] = Array.isArray(body?.results)
      ? body.results.flatMap((r: any) => r?.address_components ?? [])
      : [];
    const pick = (type: string, useShort = false): string | null => {
      const c = components.find((x) => Array.isArray(x?.types) && x.types.includes(type));
      return c ? (useShort ? c.short_name : c.long_name) : null;
    };
    const out: Partial<ResolvedAddress> = {};
    const pin = pick("postal_code");
    if (pin) out.pincode = String(pin).replace(/\D/g, "").slice(0, 6);
    const city = pick("locality") || pick("administrative_area_level_3") || pick("administrative_area_level_2");
    if (city) out.city = city;
    const state = pick("administrative_area_level_1");
    if (state) out.state = state;
    const country = pick("country");
    if (country) out.country = country;
    return out;
  } catch {
    return null;
  }
}

/**
 * Resolve the destination fields for a parcel shipment.
 *
 * Two sources, and they are used for different things.
 *
 * The map pin is geocoded whenever we have one, because it is the only source of
 * city and state. The regex gets us a PIN and NOTHING else, so without a geocode
 * city/state fall back to the STORE's — which is wrong for exactly the shipments
 * that matter, the ones going to another town. A label carrying the shop's own
 * state is how a courier misroutes a parcel. One geocode per shipment is a fine
 * price for that.
 *
 * For the PIN specifically, the customer's typed address wins when both sources
 * have one and they disagree. A dropped pin routinely snaps to a building
 * centroid or the far side of a PIN boundary, and the courier reads the address
 * line printed on the label — booking against a PIN the label contradicts is
 * itself a misroute. When they disagree we also DROP the geocoded city/state, so
 * the three destination fields are never a mix of two places; the fallback then
 * supplies them and the disagreement is logged.
 *
 * The regex remains the sole source for orders with no pin (POS, hand-typed
 * addresses) and whenever Google is unavailable.
 *
 * The PIN itself is never guessed: it decides serviceability and rate, so we fail
 * rather than ship to a made-up one.
 */
export async function resolveDestination(input: {
  address: string | null | undefined;
  coords: { lat: number; lng: number } | null;
  fallback: { city?: string | null; state?: string | null; country?: string | null };
  partnerId?: string | null;
}): Promise<{ ok: true; data: ResolvedAddress } | { ok: false; message: string }> {
  const textPin = extractPincode(input.address);

  let pincode: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let country: string | null = null;

  if (input.coords) {
    const geo = await reverseGeocode(input.coords.lat, input.coords.lng, input.partnerId);
    if (geo?.pincode && /^[1-9]\d{5}$/.test(geo.pincode)) pincode = geo.pincode;
    city = geo?.city ?? null;
    state = geo?.state ?? null;
    country = geo?.country ?? null;
  }

  if (pincode && textPin && pincode !== textPin) {
    console.warn(
      `[shiprocket] PIN mismatch — map pin says ${pincode}, address text says ${textPin}. Using the address text.`,
    );
    pincode = textPin;
    // The pin is describing a different place, so its city/state would contradict
    // the PIN we just chose — "New Delhi, Delhi - 201301" is a Noida PIN on a
    // Delhi label, which couriers reject. Drop them and let the fallback answer.
    city = null;
    state = null;
    country = null;
  }
  // Fall back to the address text when the pin is missing or the geocode failed.
  if (!pincode) pincode = textPin;

  if (!pincode) {
    return {
      ok: false,
      message:
        "This order's delivery address has no PIN code and could not be located on the map. Shiprocket needs a PIN code to quote a courier — add a PIN code to the address and try again.",
    };
  }

  return {
    ok: true,
    data: {
      pincode,
      // Store city/state remain the last resort. They are wrong for out-of-town
      // parcels, but Shiprocket rejects the order outright if these are empty, and
      // it routes on the PIN code — so a stale city is recoverable where a refusal
      // is not.
      city: (city || input.fallback.city || "").trim() || "NA",
      state: (state || input.fallback.state || "").trim() || "NA",
      country: (country || input.fallback.country || "").trim() || "India",
    },
  };
}
