"use server";

/**
 * Resolve a Qatar "blue plate" address (Zone / Street / Building) into WGS84
 * coordinates using the official Qatar GIS (QARS) ArcGIS REST service.
 *
 * Must run server-side: the GIS endpoint sends `Content-Type: text/plain`,
 * has no CORS header, and no auth token, so a browser fetch would be blocked.
 *
 * The service returns X_COORD (longitude) and Y_COORD (latitude) already in
 * WGS84 (wkid 4326), so they map directly to our GeoJSON `[lng, lat]` order.
 */

const QARS_URL =
  "https://services.gisqatar.org.qa/server/rest/services/Vector/QARS_wgs84/MapServer/0/query";

export interface QarsResult {
  /** GeoJSON Point geometry, ready to store in `geo_location`. */
  geo_location: { type: "Point"; coordinates: [number, number] };
  /** [longitude, latitude] convenience copy. */
  coordinates: [number, number];
  /** Combined QARS code, e.g. "3508770041". */
  qars: string | null;
}

export default async function convertQarsToCoord(
  zone: number,
  street: number,
  building: number
): Promise<QarsResult | null> {
  if (!Number.isFinite(zone) || !Number.isFinite(street) || !Number.isFinite(building)) {
    throw new Error("Zone, street and building must be numbers");
  }

  const where = `zone_no=${zone} and street_no=${street} and building_no=${building}`;
  const params = new URLSearchParams({
    where,
    outFields: "X_COORD,Y_COORD,QARS",
    returnGeometry: "false",
    f: "json",
  });

  const res = await fetch(`${QARS_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Qatar GIS request failed: ${res.status}`);
  }

  // Server responds with text/plain, so parse the text explicitly.
  const data = JSON.parse(await res.text());

  if (data?.error) {
    throw new Error(data.error?.message || "Qatar GIS returned an error");
  }

  const attrs = data?.features?.[0]?.attributes;
  if (!attrs || typeof attrs.X_COORD !== "number" || typeof attrs.Y_COORD !== "number") {
    return null; // no building matched that Zone / Street / Building
  }

  const coordinates: [number, number] = [attrs.X_COORD, attrs.Y_COORD]; // [lng, lat]
  return {
    geo_location: { type: "Point", coordinates },
    coordinates,
    qars: typeof attrs.QARS === "string" ? attrs.QARS : null,
  };
}
