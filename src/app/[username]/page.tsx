import { getPartnerByUsernameQuery } from "@/api/partners";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { processHotelPage, fetchHotelMetadata } from "@/lib/hotelDataFetcher";
import HotelMenuPage from "@/screens/HotelMenuPage_v2";
import { getAuthCookie } from "@/app/auth/actions";
import { Metadata } from "next";
import { notFound } from "next/navigation";
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

  const seoTitle = `Menu of ${hotel.store_name}${hotel.location ? ` - ${hotel.location}` : ""} | Powered by Menuthere`;
  const seoDescription =
    hotel.description?.trim() ||
    `Explore the full menu of ${hotel.store_name}${hotel.location ? ` in ${hotel.location}` : ""}. Browse dishes, prices, and daily specials. Order online or scan QR code.`;

  return {
    title: seoTitle,
    icons: [hotel.store_banner || "/hotelDetailsBanner.jpeg"],
    description: seoDescription,
    openGraph: {
      images: [hotel.store_banner || "/hotelDetailsBanner.jpeg"],
      title: seoTitle,
      description: seoDescription,
    },
  };
}

const UsernamePage = async ({
  searchParams,
  params,
}: {
  searchParams: Promise<{ query: string; qrScan: boolean; cat: string }>;
  params: Promise<{ username: string }>;
}) => {
  const { username } = await params;
  const { query: search, cat } = await searchParams;
  const auth = await getAuthCookie();

  const partnerId = await getPartnerIdByUsername(username);

  if (!partnerId) {
    notFound();
  }

  const { pageStatus, data } = await processHotelPage(partnerId, search, cat);

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
    />
  );
};

export default UsernamePage;
