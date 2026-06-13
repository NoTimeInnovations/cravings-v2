"use server";

/**
 * Reverse Qatar GIS (QARS) lookup: given a rough map pin (lat/lng), find the
 * nearest Qatar building and return its exact coordinates + blue-plate address
 * (Zone / Street / Building). Used to refine a Google Maps pin to the precise
 * building without the user typing anything.
 *
 * Must run server-side (the GIS endpoint has no CORS header and returns
 * text/plain). The layer is a point layer, so we query buildings within a
 * small radius of the pin and pick the closest.
 */

const QARS_URL =
  "https://services.gisqatar.org.qa/server/rest/services/Vector/QARS_wgs84/MapServer/0/query";

export interface QarsReverseResult {
  zone: number;
  street: number;
  building: number;
  qars: string | null;
  /** [longitude, latitude] of the building — exact WGS84. */
  coordinates: [number, number];
  /** Distance from the input pin to the building, in metres. */
  distanceMeters: number;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export default async function reverseQarsFromCoord(
  lat: number,
  lng: number,
  radiusMeters = 80,
): Promise<QarsReverseResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("lat/lng must be numbers");
  }

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    distance: String(radiusMeters),
    units: "esriSRUnit_Meter",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "ZONE_NO,STREET_NO,BUILDING_NO,QARS,X_COORD,Y_COORD",
    returnGeometry: "false",
    outSR: "4326",
    f: "json",
  });

  const res = await fetch(`${QARS_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Qatar GIS request failed: ${res.status}`);
  }

  const data = JSON.parse(await res.text());
  if (data?.error) {
    throw new Error(data.error?.message || "Qatar GIS returned an error");
  }

  const features: any[] = data?.features ?? [];
  let best: any = null;
  let bestDist = Infinity;
  for (const f of features) {
    const a = f?.attributes;
    if (!a || typeof a.X_COORD !== "number" || typeof a.Y_COORD !== "number") {
      continue;
    }
    const d = haversineMeters(lat, lng, a.Y_COORD, a.X_COORD);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }

  if (!best) return null; // no building within the radius

  return {
    zone: best.ZONE_NO,
    street: best.STREET_NO,
    building: best.BUILDING_NO,
    qars: typeof best.QARS === "string" ? best.QARS : null,
    coordinates: [best.X_COORD, best.Y_COORD],
    distanceMeters: Math.round(bestDist),
  };
}
