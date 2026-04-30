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

export function getDisplayLegalName(p: LegalPartnerInfo): string {
  return p.official_name?.trim() || p.store_name;
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
