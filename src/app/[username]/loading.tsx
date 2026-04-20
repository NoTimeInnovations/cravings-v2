import SplashLoaderServer from "@/components/SplashLoaderServer";
import { headers } from "next/headers";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerSplashQuery } from "@/api/partners";
import { unstable_cache } from "next/cache";

const getStoreSplash = unstable_cache(
  async (username: string) => {
    try {
      const res = await fetchFromHasura(getPartnerSplashQuery, { username });
      const partner = res?.partners?.[0];
      if (!partner) return null;
      return { name: partner.store_name, banner: partner.store_banner };
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
    />
  );
}
