// Builds the "open in Google Maps" URL for a partner's location.
//
// Goal: show the BUSINESS NAME in Google Maps, never a bare lat,lng pin.
// Priority:
//   1. place_id  → Maps resolves the actual listing (name, reviews, hours).
//                  We still pass store_name as the query so the label is the
//                  business name even before the place_id resolves.
//   2. store_name → search by name (+ locality for disambiguation) so Maps
//                   shows the business name instead of coordinates.
//   3. coordinates → last-resort lat,lng pin (no name available).
//   4. a raw location URL/string if that's all we have.

export interface PartnerMapFields {
  store_name?: string | null;
  place_id?: string | null;
  geo_location?: { coordinates?: number[] | null } | null;
  location?: string | null;
  location_details?: string | null;
  district?: string | null;
}

export const getPartnerMapsUrl = (p: PartnerMapFields | null | undefined): string | null => {
  if (!p) return null;

  const name = (p.store_name || "").trim();
  const nameQuery = name ? encodeURIComponent(name) : "";

  // 1. Real Google Place — best match, shows the actual listing.
  if (p.place_id) {
    return `https://www.google.com/maps/search/?api=1&query=${nameQuery || "place"}&query_place_id=${p.place_id}`;
  }

  // 2. Known name — search by name (+ locality) so the business name shows.
  if (name) {
    const locality = (p.location_details || p.district || "").trim();
    const query = locality ? `${name} ${locality}` : name;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  // 3. Coordinates only.
  const coords = p.geo_location?.coordinates;
  if (coords && coords.length === 2 && (coords[0] !== 0 || coords[1] !== 0)) {
    return `https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`;
  }

  // 4. Raw location string/link.
  if (p.location) return p.location;

  return null;
};
