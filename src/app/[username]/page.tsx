import { getPartnerByUsernameQuery } from "@/api/partners";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { processHotelPage, fetchHotelMetadata } from "@/lib/hotelDataFetcher";
import HotelMenuPage from "@/screens/HotelMenuPage_v2";
import { getAuthCookie, getOrderSessionCookie } from "@/app/auth/actions";
import { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import {
  ScanLimitReachedCard,
  SubscriptionExpiredCard,
  SubscriptionInactiveCard,
} from "@/components/SubscriptionStatusCards";

async function getPartnerIdByUsername(username: string): Promise<string | null> {
  try {
    const result = await fetchFromHasura(getPartnerByUsernameQuery, { username });
    return result?.partners?.[0]?.id || null;
  } catch (error) {
    console.error("Error fetching partner by username:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const partnerId = await getPartnerIdByUsername(username);

  if (!partnerId) {
    return { title: "Not Found" };
  }

  const hotel = await fetchHotelMetadata(partnerId);

  if (!hotel) {
    return { title: "Not Found" };
  }

  const locationLabel =
    hotel.location_details?.trim() ||
    [hotel.district, hotel.country].filter(Boolean).join(", ") ||
    null;

  const seoTitle = `Menu of ${hotel.store_name}${locationLabel ? ` - ${locationLabel}` : ""}`;
  const seoDescription =
    hotel.description?.trim() ||
    `Explore the full menu of ${hotel.store_name}${locationLabel ? ` in ${locationLabel}` : ""}. Browse dishes, prices, and daily specials. Order online or scan QR code.`;

  const bannerUrl = hotel.store_banner || "/hotelDetailsBanner.jpeg";
  const metaImage = isVideoUrl(bannerUrl) ? getVideoThumbnailUrl(bannerUrl) : bannerUrl;

  return {
    title: seoTitle,
    icons: [metaImage],
    description: seoDescription,
    manifest: `/api/manifest/${username}`,
    openGraph: {
      images: [metaImage],
      title: seoTitle,
      description: seoDescription,
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Viewport> {
  const { username } = await params;
  const partnerId = await getPartnerIdByUsername(username);

  if (!partnerId) return { themeColor: "#ffffff" };

  const hotel = await fetchHotelMetadata(partnerId);
  const theme = typeof (hotel as any)?.theme === "string"
    ? JSON.parse((hotel as any).theme)
    : (hotel as any)?.theme || null;

  return { themeColor: theme?.colors?.bg || "#ffffff" };
}

const UsernamePage = async ({
  searchParams,
  params,
}: {
  searchParams: Promise<{ query: string; qrScan: boolean; cat: string; category: string; hide: string }>;
  params: Promise<{ username: string }>;
}) => {
  const { username } = await params;
  const sp = await searchParams;
  const { query: search, cat, category, hide } = sp;
  const selectedCat = category || cat;
  const hideOtherCategories = hide === "others" && !!selectedCat;
  const hasSearchParams = Object.values(sp).some((v) => v != null && v !== "");
  const auth = await getAuthCookie();

  const partnerId = await getPartnerIdByUsername(username);

  if (!partnerId) {
    notFound();
  }

  const { pageStatus, data } = await processHotelPage(partnerId, search, selectedCat);

  if (pageStatus.status === "scan_limit_reached") {
    return <ScanLimitReachedCard />;
  }
  if (pageStatus.status === "subscription_expired") {
    return <SubscriptionExpiredCard />;
  }
  if (pageStatus.status === "inactive") {
    return <SubscriptionInactiveCard />;
  }
  if (pageStatus.status === "not_found" || !data) {
    notFound();
  }

  const orderSession = await getOrderSessionCookie(partnerId);
  const onboardingCompleted = !!orderSession;

  const deliveryRules = (data.hotelData as any)?.delivery_rules;
  const isDeliveryActive = deliveryRules?.isDeliveryActive ?? true;
  const initialDeliveryOpen =
    isDeliveryActive && isWithinTimeWindow(deliveryRules?.delivery_time_allowed);
  const initialTakeawayOpen = isWithinTimeWindow(deliveryRules?.takeaway_time_allowed);

  return (
    <HotelMenuPage
      socialLinks={data.socialLinks}
      offers={data.filteredOffers}
      hoteldata={data.hotelData}
      auth={auth || null}
      theme={data.theme}
      tableNumber={0}
      qrId={null}
      qrGroup={data.table0QrGroup}
      selectedCategory={data.selectedCategory}
      hideOtherCategories={hideOtherCategories}
      onboardingCompleted={onboardingCompleted}
      skipNotices={hasSearchParams}
      skipStorefront={hasSearchParams}
      initialDeliveryOpen={initialDeliveryOpen}
      initialTakeawayOpen={initialTakeawayOpen}
    />
  );
};

export default UsernamePage;
