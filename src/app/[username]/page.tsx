import { getPartnerByUsernameQuery } from "@/api/partners";
import {
  getBranchByParentPartnerIdQuery,
  getPartnerBranchInfoQuery,
  type BranchContext,
} from "@/api/branches";
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

async function getBranchContextForParent(
  parentPartnerId: string,
): Promise<BranchContext | null> {
  try {
    const res = await fetchFromHasura(getBranchByParentPartnerIdQuery, {
      parent_partner_id: parentPartnerId,
    });
    const branch = res?.branches?.[0];
    if (!branch) return null;
    return branch as BranchContext;
  } catch (error) {
    console.error("Error fetching branch context:", error);
    return null;
  }
}

export interface BrandLinkInfo {
  brandName: string;
  parentUsername: string;
}

async function getBrandLinkForOutlet(
  outletPartnerId: string,
): Promise<BrandLinkInfo | null> {
  try {
    const res = await fetchFromHasura(getPartnerBranchInfoQuery, {
      partner_id: outletPartnerId,
    });
    const row = res?.partners_by_pk;
    const branch = row?.branch;
    if (!branch) return null;
    // Only surface "Change outlet" on child outlets, not on the parent itself.
    if (branch.parent_partner_id === outletPartnerId) return null;
    const parentUsername = branch.parent_partner?.username;
    if (!parentUsername) return null;
    return { brandName: branch.name, parentUsername };
  } catch (error) {
    console.error("Error fetching brand link:", error);
    return null;
  }
}

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
  searchParams: Promise<{ query: string; qrScan: boolean; cat: string; category: string; hide: string; orderType?: string; fromBrand?: string }>;
  params: Promise<{ username: string }>;
}) => {
  const { username } = await params;
  const sp = await searchParams;
  const { query: search, cat, category, hide, orderType: orderTypeParam, fromBrand } = sp;
  const selectedCat = category || cat;
  const hideOtherCategories = hide === "others" && !!selectedCat;
  // ?orderType=&fromBrand=1 are routing params from a brand-parent redirect.
  // They shouldn't trigger the "user came from search" branch that skips the
  // splash/notices, since they're an internal handoff.
  const userVisibleParamKeys = Object.keys(sp).filter(
    (k) => k !== "orderType" && k !== "fromBrand",
  );
  const hasSearchParams = userVisibleParamKeys.some(
    (k) => (sp as any)[k] != null && (sp as any)[k] !== "",
  );
  const preselectedOrderType =
    orderTypeParam === "delivery" || orderTypeParam === "takeaway"
      ? orderTypeParam
      : null;
  const auth = await getAuthCookie();

  const partnerId = await getPartnerIdByUsername(username);

  if (!partnerId) {
    notFound();
  }

  const { pageStatus, data, partnerContact } = await processHotelPage(partnerId, search, selectedCat);

  const partnerPhone = partnerContact?.phone ?? null;
  const partnerName = partnerContact?.storeName ?? null;

  if (pageStatus.status === "scan_limit_reached") {
    return <ScanLimitReachedCard partnerPhone={partnerPhone} partnerName={partnerName} />;
  }
  if (pageStatus.status === "subscription_expired") {
    return <SubscriptionExpiredCard partnerPhone={partnerPhone} partnerName={partnerName} />;
  }
  if (pageStatus.status === "inactive") {
    return <SubscriptionInactiveCard partnerPhone={partnerPhone} partnerName={partnerName} />;
  }
  if (pageStatus.status === "not_found" || !data) {
    notFound();
  }

  const orderSession = await getOrderSessionCookie(partnerId);
  const onboardingCompleted = !!orderSession;

  const branchContext = await getBranchContextForParent(partnerId);
  // For child outlets, fetch the parent so we can offer "Change outlet".
  const brandLink = branchContext
    ? null
    : await getBrandLinkForOutlet(partnerId);

  const deliveryRules = (data.hotelData as any)?.delivery_rules;
  const hotelTimezone = (data.hotelData as any)?.timezone || "Asia/Kolkata";
  const isDeliveryActive = deliveryRules?.isDeliveryActive ?? true;
  const initialDeliveryOpen =
    isDeliveryActive && isWithinTimeWindow(deliveryRules?.delivery_time_allowed, hotelTimezone);
  const initialTakeawayOpen = isWithinTimeWindow(deliveryRules?.takeaway_time_allowed, hotelTimezone);

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
      hotelTimezone={hotelTimezone}
      branchContext={branchContext}
      preselectedOrderType={preselectedOrderType}
      brandLink={brandLink}
    />
  );
};

export default UsernamePage;
