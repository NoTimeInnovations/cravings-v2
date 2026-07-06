// Single source of truth for delivery road distance so the address picker, the
// radius check, and checkout all agree. Direction matters — Mapbox driving
// distance is asymmetric (one-ways / turn restrictions) — so ALWAYS call it the
// same way: origin = the delivery address, destination = the store. That mirrors
// how calculateDeliveryDistanceAndCost builds its request, so the number the
// picker shows equals the number checkout charges.

export type LatLng = { lat: number; lng: number };

/**
 * Driving distance in km from `from` to `to` via Mapbox Directions, or null if
 * Mapbox is unreachable / no token / no route (caller falls back to straight-line).
 * For delivery, call as roadDistanceKm(address, store).
 */
export async function roadDistanceKm(
  from: LatLng,
  to: LatLng,
): Promise<number | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const d = data?.routes?.[0]?.distance;
    return typeof d === "number" ? d / 1000 : null;
  } catch {
    return null;
  }
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
