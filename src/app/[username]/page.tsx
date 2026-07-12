import { getPartnerByUsernameQuery } from "@/api/partners";
import {
  getBranchByParentPartnerIdQuery,
  getPartnerBranchInfoQuery,
  type BranchContext,
} from "@/api/branches";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { processHotelPage, fetchHotelMetadata } from "@/lib/hotelDataFetcher";
import HotelMenuPage from "@/screens/HotelMenuPage_v2";
import { getAuthCookie, getOrderSessionCookie, getOnboardingDataCookie, getSessionOrderTypeCookie } from "@/app/auth/actions";
import { evaluateSkipOnboarding } from "@/lib/onboardingSession";
import { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import {
  ScanLimitReachedCard,
  SubscriptionInactiveCard,
} from "@/components/SubscriptionStatusCards";
import { ExpiredOrderLinkCard } from "@/components/ExpiredOrderLinkCard";
import { verifyOrderLinkToken } from "@/lib/whatsappFlow/orderLink";
import OrderLinkAutoLogin from "@/components/OrderLinkAutoLogin";

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

  // WhatsApp order link: if the customer opened an expired link, prompt them to
  // message "hi" for a fresh one. Only triggers for an expired token — direct
  // visits and valid links are unaffected.
  const olt = (sp as any).olt as string | undefined;
  const oltStatus = olt ? verifyOrderLinkToken(partnerId, olt) : null;
  // Only a genuinely EXPIRED token shows the block screen. We no longer block
  // "already used": order links are personal + expiring, and the single-use
  // lock was wrongly blocking legitimate re-opens (WhatsApp in-app browser vs
  // system browser, re-taps, preview crawlers). See autoLoginFromOrderToken.
  const oltBlocked = !!oltStatus?.expired;
  if (oltBlocked) {
    const info = await fetchFromHasura(
      `query OrderLinkInfo($p: uuid!) {
        whatsapp_business_integrations(where: {partner_id: {_eq: $p}}, order_by: {is_primary: desc, updated_at: asc}, limit: 1) { display_phone }
        partners_by_pk(id: $p) { store_name }
      }`,
      { p: partnerId },
    ).catch(() => null);
    // Use the partner's CONNECTED WhatsApp number (the one running the welcome
    // flow — what customers must message for a fresh link). Not partner.phone,
    // which is just a contact field and may be junk.
    const waNumber =
      info?.whatsapp_business_integrations?.[0]?.display_phone ?? null;
    return (
      <ExpiredOrderLinkCard
        storeName={info?.partners_by_pk?.store_name ?? null}
        waNumber={waNumber}
        reason="expired"
      />
    );
  }

  const { pageStatus, data, partnerContact } = await processHotelPage(partnerId, search, selectedCat);

  const partnerPhone = partnerContact?.phone ?? null;
  const partnerName = partnerContact?.storeName ?? null;

  if (pageStatus.status === "scan_limit_reached") {
    return <ScanLimitReachedCard partnerPhone={partnerPhone} partnerName={partnerName} />;
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

  // Skip the onboarding order-type overlay in the SSR HTML when the customer
  // already chose delivery/takeaway this browser session (+ a saved address for
  // delivery). Computed on the server from cookies so the overlay is never in
  // the initial HTML — no flash on reload.
  const sessionOrderType = await getSessionOrderTypeCookie(partnerId);
  const savedOnboarding = sessionOrderType
    ? await getOnboardingDataCookie(partnerId)
    : null;
  const initialSkipOnboarding = evaluateSkipOnboarding({
    sessionOrderType,
    hasSavedDeliveryAddress: !!(savedOnboarding?.address && savedOnboarding?.coords),
    featureFlags: (data.hotelData as any)?.feature_flags,
    orderTypesEnabled: (data.hotelData as any)?.order_types_enabled,
    tableNumber: 0,
    isBrandParent: !!(branchContext && branchContext.outlets.length > 0),
  });

  const deliveryRules = (data.hotelData as any)?.delivery_rules;
  const hotelTimezone = (data.hotelData as any)?.timezone || "Asia/Kolkata";
  const isDeliveryActive = deliveryRules?.isDeliveryActive ?? true;
  const initialDeliveryOpen =
    isDeliveryActive && isWithinTimeWindow(deliveryRules?.delivery_time_allowed, hotelTimezone);
  const initialTakeawayOpen = isWithinTimeWindow(deliveryRules?.takeaway_time_allowed, hotelTimezone);

  // A valid WhatsApp order-link token that carries a user id silently logs that
  // customer in (no OTP). The link is personal — issued to one customer's
  // WhatsApp — so it runs when nobody is signed in OR when a DIFFERENT customer
  // is signed in (it switches to the link's customer). A partner/superadmin
  // session is never overridden, and an already-correct session is a no-op.
  // The cookie can't be set during a server render, so a tiny client component
  // does it via a server action, then refreshes.
  // A valid token carries a customer either as a userId (legacy signed token) or
  // an encrypted phone (resolved to a user id inside the auto-login action). For
  // a phone token we can't compare against the current session at render time,
  // so we attempt the auto-login and let the action no-op if it's already the
  // same customer. A staff (non-user) session is never overridden.
  const oltUserId = oltStatus?.valid ? oltStatus.userId : null;
  const oltCarriesCustomer = !!(oltStatus?.valid && (oltStatus.userId || oltStatus.phone));
  const autoLoginToken =
    olt &&
    oltCarriesCustomer &&
    (!auth || auth.role === "user") &&
    !(auth?.role === "user" && oltUserId && auth.id === oltUserId)
      ? olt
      : null;

  return (
    <>
      {autoLoginToken && (
        <OrderLinkAutoLogin partnerId={partnerId} token={autoLoginToken} />
      )}
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
      initialSkipOnboarding={initialSkipOnboarding}
    />
    </>
  );
};

export default UsernamePage;
