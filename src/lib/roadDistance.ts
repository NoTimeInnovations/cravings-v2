// Single source of truth for delivery road distance so the address picker, the
// radius check, and checkout all agree.
//
// Mapbox driving distance is DIRECTIONAL: A→B and B→A can differ a lot where the
// road network has one-ways / turn restrictions (e.g. a hostel inside a campus
// with one-way roads). A real case: store→customer routed 3.2 km (matching Google
// Maps) but customer→store routed 7.4 km — so measuring only the "customer→store"
// leg made the app show 7.4 km for a trip Google Maps calls 3.2 km.
//
// For "how far is this address from the store" we want the shorter of the two
// legs — that's the actual delivery trip the rider drives and it matches what a
// customer sees in Google Maps. So we query BOTH directions and take the min.
// (Google Distance Matrix is intentionally not used: the legacy Distance Matrix
// API is disabled on our Cloud project, and Mapbox already matches Google Maps
// for a given direction, so the JS SDK path only added a failing round-trip.)

export type LatLng = { lat: number; lng: number };

/**
 * Driving distance in km between `from` and `to` via the Mapbox Directions API.
 * Because driving distance is directional, this measures BOTH directions and
 * returns the shorter one — the real delivery leg, which matches Google Maps and
 * is stable regardless of which point the caller passes first.
 * Returns null when Mapbox is unreachable (caller falls back to haversine).
 * For delivery, call as roadDistanceKm(address, store).
 */
export async function roadDistanceKm(
  from: LatLng,
  to: LatLng,
): Promise<number | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const legKm = async (a: LatLng, b: LatLng): Promise<number | null> => {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}?access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const d = data?.routes?.[0]?.distance;
      return typeof d === "number" ? d / 1000 : null; // metres → km
    } catch {
      return null;
    }
  };

  // Query both directions in parallel — same latency as one call — and take the
  // shorter leg so a one-way detour on the return trip can't inflate the distance.
  const [ab, ba] = await Promise.all([legKm(from, to), legKm(to, from)]);
  const legs = [ab, ba].filter((v): v is number => v != null);
  if (legs.length === 0) return null;
  return Math.min(...legs);
}

/** Straight-line (haversine) km — fallback when Mapbox is unavailable. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
