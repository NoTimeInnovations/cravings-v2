import { headers } from "next/headers";
import { getDomainConfig } from "@/lib/domain-utils";
import GetStartedClient from "@/components/get-started/GetStartedClient";

export default async function GetStartedPage() {
    const headerList = await headers();
    const host = headerList.get("host");
    const config = getDomainConfig(host);

    // Get-started page has a light background, so prefer the "logowhite" (which is usually the colored/dark version suitable for white backgrounds)
    // If logowhite is not set (e.g. Cravings or missing config), fallback to logo.
    // Note: In domains.json, "logowhite" for MenuThere is /menuthere-orange.png, which works on white.
    // "logo" is /menuthere-white.png, which works on dark.
    const pageLogo = config.logowhite || config.logo;

    return <GetStartedClient appName={config.name} logo={pageLogo} />;
}
