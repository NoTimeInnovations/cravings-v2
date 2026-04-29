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
