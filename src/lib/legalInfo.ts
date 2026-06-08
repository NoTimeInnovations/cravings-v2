import { getPartnerLegalByUsernameQuery } from "@/api/partners";
import { fetchFromHasura } from "@/lib/hasuraClient";

export interface LegalPartnerInfo {
  id: string;
  username: string;
  store_name: string;
  official_name: string | null;
  about_us: string | null;
  operating_address: string | null;
  official_email_id: string | null;
  official_phone_number: string | null;
  phone: string | null;
  email: string | null;
}

export async function getLegalPartnerByUsername(
  username: string
): Promise<LegalPartnerInfo | null> {
  try {
    const result = await fetchFromHasura(getPartnerLegalByUsernameQuery, {
      username,
    });
    return result?.partners?.[0] || null;
  } catch (error) {
    console.error("Error fetching legal info:", error);
    return null;
  }
}

/**
 * Brand name — the public-facing identity (store name). This is the name shown
 * everywhere by default. A partner always has a brand name.
 */
export function getBrandName(p: LegalPartnerInfo): string {
  return (p.store_name || "").trim();
}

/**
 * Legal entity name ("Merchant Legal Entity Name") as set in Official Settings.
 * Returns null when the partner has not provided one — in that case only the
 * brand name should be displayed.
 */
export function getLegalName(p: LegalPartnerInfo): string | null {
  return p.official_name?.trim() || null;
}

/**
 * True only when a legal entity name has been provided AND it is meaningfully
 * different from the brand name. Drives whether we surface the legal entity
 * alongside the brand (e.g. "Brand, operated by Legal Entity").
 */
export function hasDistinctLegalName(p: LegalPartnerInfo): boolean {
  const legal = getLegalName(p);
  if (!legal) return false;
  return legal.toLowerCase() !== getBrandName(p).toLowerCase();
}

/**
 * The value to show against a "Merchant Legal Entity Name" label. Falls back to
 * the brand name so the field is never blank, but prefers the legal entity.
 */
export function getMerchantEntityName(p: LegalPartnerInfo): string {
  return getLegalName(p) || getBrandName(p);
}

/**
 * The phrase used for the FIRST mention of the business in a legal document.
 *   - no distinct legal name:  "Brand"
 *   - distinct legal name set:  "Brand (operated by Legal Entity)"
 * Subsequent mentions should use {@link getBrandName} (or "we"/"us").
 */
export function getLegalEntityPhrase(p: LegalPartnerInfo): string {
  const brand = getBrandName(p);
  if (!hasDistinctLegalName(p)) return brand;
  return `${brand} (operated by ${getLegalName(p)})`;
}

/**
 * Public display name used for page titles / metadata. Always the brand name —
 * the legal entity is reserved for the body of policy pages.
 */
export function getDisplayLegalName(p: LegalPartnerInfo): string {
  return getBrandName(p);
}

export function getContactEmail(p: LegalPartnerInfo): string | null {
  return p.official_email_id?.trim() || p.email || null;
}

export function getContactPhone(p: LegalPartnerInfo): string | null {
  return p.official_phone_number?.trim() || p.phone || null;
}

/**
 * Best-effort extraction of "City, State" from operating_address for use as
 * the Terms & Conditions jurisdiction. Indian addresses commonly end with
 * "..., CITY, STATE, PIN: 682018" or "..., CITY, STATE - 682018".
 * Falls back to "India" if a city/state pair can't be confidently parsed.
 */
export function getJurisdiction(p: LegalPartnerInfo): string {
  const addr = p.operating_address?.trim();
  if (!addr) return "India";

  const cleaned = addr
    .replace(/PIN[:\s]*\d{6}/i, "")
    .replace(/\b\d{6}\b/g, "")
    .replace(/[-–]\s*$/g, "");

  const parts = cleaned
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const state = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    if (city && state) return `${city.toUpperCase()}, ${state.toUpperCase()}`;
  }
  return "India";
}
