import SplashLoaderServer from "@/components/SplashLoaderServer";
import { getStoreThemeCookie } from "@/app/auth/actions";

export default async function Loading() {
  const theme = await getStoreThemeCookie();
  const initial = theme?.name?.charAt(0)?.toUpperCase() || "M";
  return <SplashLoaderServer initial={initial} storeName={theme?.name} storeBanner={theme?.banner} />;
}
