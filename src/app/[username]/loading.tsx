import SplashLoaderServer from "@/components/SplashLoaderServer";
import { headers } from "next/headers";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerSplashQuery } from "@/api/partners";
import { unstable_cache } from "next/cache";

// The loading splash shows the store banner as its logo. When a partner has no
// banner, fall back to the hero section image from their website config so the
// splash still shows a relevant image instead of just the initial letter.
function getHeroImage(rawConfig: unknown): string {
  if (!rawConfig) return "";
  let config: any = rawConfig;
  if (typeof rawConfig === "string") {
    try {
      config = JSON.parse(rawConfig);
    } catch {
      return "";
    }
  }
  const images = config?.hero?.collage_images;
  return Array.isArray(images) ? images.find((u: unknown) => !!u) || "" : "";
}

const getStoreSplash = unstable_cache(
  async (username: string) => {
    try {
      const res = await fetchFromHasura(getPartnerSplashQuery, { username });
      const partner = res?.partners?.[0];
      if (!partner) return null;
      // Banner takes priority; the hero image is the default fallback.
      const banner = partner.store_banner || getHeroImage(partner.website_config);
      return {
        name: partner.store_name,
        banner,
        storefrontSettings: partner.storefront_settings ?? null,
      };
    } catch {
      return null;
    }
  },
  ["store-splash"],
  { revalidate: 3600 }
);

export default async function Loading() {
  const pathname = (await headers()).get("x-pathname") || "";
  const username = pathname.split("/").filter(Boolean)[0] || "";
  const splash = username ? await getStoreSplash(username) : null;
  const initial = splash?.name?.charAt(0)?.toUpperCase() || username.charAt(0)?.toUpperCase() || "M";

  return (
    <SplashLoaderServer
      initial={initial}
      storeName={splash?.name}
      storeBanner={splash?.banner}
      storefrontSettings={splash?.storefrontSettings}
      username={username}
    />
  );
}
