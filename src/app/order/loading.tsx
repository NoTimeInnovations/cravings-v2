import OfferLoadinPage from "@/components/OfferLoadinPage";
import { getStoreThemeCookie } from "@/app/auth/actions";

export default async function Loading() {
  const theme = await getStoreThemeCookie();
  return <OfferLoadinPage message="Loading order..." storeBanner={theme?.banner} bg={theme?.bg} />;
}
