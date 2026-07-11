import { headers } from "next/headers";
import GetStartedClient from "@/components/get-started/GetStartedClient";
import { getCountryByIso } from "@/lib/countries";

export default async function GetStartedPage() {
  const headerList = await headers();

  // Country is detected from the request header (set by middleware/proxy) as an
  // ISO 3166-1 alpha-2 code and resolved to a display name against the full
  // country list. Empty when unknown, so the picker just starts blank.
  const countryCode = headerList.get("x-user-country") || "";
  const defaultCountry = getCountryByIso(countryCode)?.name || "";

  return (
    <GetStartedClient
      appName="Menuthere"
      logo="/menuthere-logo-new.png"
      defaultCountry={defaultCountry}
    />
  );
}
