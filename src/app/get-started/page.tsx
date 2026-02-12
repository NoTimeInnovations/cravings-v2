import { headers } from "next/headers";
import { getDomainConfig } from "@/lib/domain-utils";
import GetStartedClient from "@/components/get-started/GetStartedClient";
import { countryCodes } from "@/utils/countryCodes";

// Map 2-letter ISO codes to full country names
const isoToCountry: Record<string, string> = {
    "AF": "Afghanistan", "AL": "Albania", "DZ": "Algeria", "AD": "Andorra", "AO": "Angola",
    "AR": "Argentina", "AU": "Australia", "AT": "Austria", "BD": "Bangladesh", "BE": "Belgium",
    "BT": "Bhutan", "BR": "Brazil", "CA": "Canada", "CN": "China", "DK": "Denmark",
    "EG": "Egypt", "FI": "Finland", "FR": "France", "DE": "Germany", "GR": "Greece",
    "HK": "Hong Kong", "IN": "India", "ID": "Indonesia", "IE": "Ireland", "IT": "Italy",
    "JP": "Japan", "KE": "Kenya", "KW": "Kuwait", "MY": "Malaysia", "MX": "Mexico",
    "NP": "Nepal", "NL": "Netherlands", "NZ": "New Zealand", "NG": "Nigeria", "NO": "Norway",
    "OM": "Oman", "PK": "Pakistan", "PH": "Philippines", "QA": "Qatar", "RU": "Russia",
    "SA": "Saudi Arabia", "SG": "Singapore", "ZA": "South Africa", "KR": "South Korea",
    "ES": "Spain", "LK": "Sri Lanka", "SE": "Sweden", "CH": "Switzerland", "TH": "Thailand",
    "TR": "Turkey", "AE": "United Arab Emirates", "GB": "United Kingdom", "US": "United States",
    "VN": "Vietnam"
};

export default async function GetStartedPage() {
    const headerList = await headers();
    const host = headerList.get("host");
    const config = getDomainConfig(host);

    // Get country from request header (set by middleware/proxy)
    const countryCode = headerList.get("x-user-country") || "";
    const detectedCountry = isoToCountry[countryCode] || "";
    
    // Validate detected country exists in our countryCodes list
    const validCountry = countryCodes.some(c => c.country === detectedCountry) ? detectedCountry : "";

    // Get-started page has a light background, so prefer the "logowhite" (which is usually the colored/dark version suitable for white backgrounds)
    // If logowhite is not set (e.g. Cravings or missing config), fallback to logo.
    // Note: In domains.json, "logowhite" for MenuThere is /menuthere-orange.png, which works on white.
    // "logo" is /menuthere-white.png, which works on dark.
    const pageLogo = config.logowhite || config.logo;

    return <GetStartedClient appName="MenuThere" logo={pageLogo} defaultCountry={validCountry} />;
}
