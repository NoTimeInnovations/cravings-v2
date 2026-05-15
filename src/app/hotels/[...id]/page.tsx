import {
  getPartnerAndOffersQuery,
  getPartnerSubscriptionQuery,
} from "@/api/partners";
import { GET_QR_CODES_WITH_GROUPS_BY_PARTNER } from "@/api/qrcodes";
import { fetchFromHasura } from "@/lib/hasuraClient";
import HotelMenuPage from "@/screens/HotelMenuPage_v2";
import { MenuItem } from "@/store/menuStore_hasura";
import { Offer } from "@/store/offerStore_hasura";
import { unstable_cache } from "next/cache";
import React from "react";
import { Partner } from "@/store/authStore";
import { getAuthCookie, getOrderSessionCookie } from "@/app/auth/actions";
import { ThemeConfig, DEFAULT_THEME } from "@/components/hotelDetail/ThemeChangeButton";
import { Metadata, Viewport } from "next";
import { getSocialLinks } from "@/lib/getSocialLinks";
import { usePartnerStore } from "@/store/usePartnerStore";
import { filterOffersByType } from "@/lib/offerFilters";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import { startOfMonth, endOfMonth } from "date-fns";
// import getTimestampWithTimezone from "@/lib/getTimeStampWithTimezon";

import { AlertTriangle } from "lucide-react";
import {
  ScanLimitReachedCard,
  SubscriptionExpiredCard,
  SubscriptionInactiveCard
} from "@/components/SubscriptionStatusCards";


import { headers } from "next/headers";
import { getDomainConfig } from "@/lib/domain-utils";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string[] }>;
}): Promise<Metadata> {
  const { id: hotelIds } = await params;

  const hotelId = isUUID(hotelIds?.[0] || "") ? hotelIds?.[0] : hotelIds?.[1];

  const getHotelData = unstable_cache(
    async (id: string) => {
      try {
        const partnerData = await fetchFromHasura(getPartnerAndOffersQuery, {
          id,
          offer_types: ["delivery", "all"]
        });

        if (!partnerData?.partners?.[0]) return null;

        return {
          id,
          ...partnerData.partners[0],
        } as HotelData;
      } catch (error) {
        console.error("Error fetching hotel data:", error);
        return null;
      }
    },
    [hotelId as string, "hotel-data"],
    { tags: [hotelId as string, "hotel-data"], revalidate: 60 }
  );

  const hotel = await getHotelData(hotelId);

  if (!hotel) {
    throw new Error("Hotel not found");
  }

  // Build a human-readable location label — prefer structured fields over the raw
  // `location` field which may contain a Google Maps URL.
  const locationLabel =
    hotel.location_details?.trim() ||
    [hotel.district, hotel.country]
      .filter(Boolean)
      .join(", ") ||
    null;

  const seoTitle = `Menu of ${hotel.store_name}${locationLabel ? ` - ${locationLabel}` : ''}`;
  const seoDescription = hotel.description?.trim() ||
    `Explore the full menu of ${hotel.store_name}${locationLabel ? ` in ${locationLabel}` : ''}. Browse dishes, prices, and daily specials. Order online or scan QR code.`;

  // Noindex test/placeholder accounts
  const TEST_SLUGS = new Set(["sample", "newtest", "test", "demo", "testhotel", "new"]);
  const nameSlug = (hotel.store_name || "").replace(/\s+/g, "-").toLowerCase().replace(/^-+|-+$/g, "");
  const isTestAccount = TEST_SLUGS.has(nameSlug);

  const slug = encodeURIComponent((hotel.store_name || "").replace(/\s+/g, "-"));
  const canonicalUrl = `https://menuthere.com/hotels/${slug}/${hotelId}`;

  // For video banners, use the thumbnail for meta images/icons
  const bannerUrl = hotel.store_banner || "/hotelDetailsBanner.jpeg";
  const metaImage = isVideoUrl(bannerUrl)
    ? getVideoThumbnailUrl(bannerUrl)
    : bannerUrl;

  return {
    title: seoTitle,
    icons: [metaImage],
    description: seoDescription,
    alternates: { canonical: canonicalUrl },
    robots: isTestAccount
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      images: [metaImage],
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ id: string[] }>;
}): Promise<Viewport> {
  const { id: hotelIds } = await params;
  const hotelId = isUUID(hotelIds?.[0] || "") ? hotelIds?.[0] : hotelIds?.[1];

  try {
    const partnerData = await fetchFromHasura(getPartnerAndOffersQuery, {
      id: hotelId,
      offer_types: ["delivery", "all"]
    });
    const hotel = partnerData?.partners?.[0];
    const hotelTheme: ThemeConfig | null = typeof hotel?.theme === "string"
      ? JSON.parse(hotel.theme)
      : hotel?.theme || null;
    return { themeColor: hotelTheme?.colors?.bg || "#ffffff" };
  } catch {
    return { themeColor: "#ffffff" };
  }
}

export interface HotelDataMenus extends Omit<MenuItem, "category"> {
  category: {
    name: string;
    id: string;
    priority: number;
    is_active?: boolean;
  };
  offers: {
    offer_price: number;
  }[];
  variantSelections?: any;
}

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export interface HotelData extends Partner {
  offers: (Offer & {
    variant?: {
      name: string;
      price: number;
    };
  })[];
  menus: HotelDataMenus[];
  fillteredMenus: HotelDataMenus[];
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  googleReview?: string;
  location?: string;
  phone?: string;
  zomato?: string;
  uberEats?: string;
  talabat?: string;
  doordash?: string;
  playstore?: string;
  appstore?: string;
}

const HotelPage = async ({
  searchParams,
  params,
}: {
  searchParams: Promise<{ query: string; qrScan: boolean; cat: string }>;
  params: Promise<{ [key: string]: string | undefined }>;
}) => {
  const sp = await searchParams;
  const { query: search, qrScan, cat } = sp;
  const hasSearchParams = Object.values(sp).some((v) => v != null && v !== "");
  const { id } = await params;
  const auth = await getAuthCookie();

  const hotelId = isUUID(id?.[0] || "") ? id?.[0] : id?.[1];

  const getHotelData = unstable_cache(
    async (id: string) => {
      try {
        return fetchFromHasura(getPartnerAndOffersQuery, {
          id,
          offer_types: ["delivery", "all"]
        });
      } catch (error) {
        console.error("Error fetching hotel data:", error);
        return null;
      }
    },
    [hotelId as string, "hotel-data"],
    { tags: [hotelId as string, "hotel-data"], revalidate: 60 }
  );

  let hoteldata = hotelId
    ? ((await getHotelData(hotelId))?.partners[0] as HotelData)
    : null;

  if (hoteldata?.offers) {
    const today = new Date().setHours(0, 0, 0, 0);
    hoteldata.offers = hoteldata.offers.filter(
      (offer) => new Date(offer.end_time).setHours(0, 0, 0, 0) >= today
    );
  }

  const offers = hoteldata?.offers;

  // Cleanup expired custom menu items
  if (hoteldata?.id) {
    try {
      const { cleanupExpiredCustomItems } = await import('@/api/offers');
      await fetchFromHasura(cleanupExpiredCustomItems, {
        partner_id: hoteldata.id
      });
    } catch (error) {
      console.error("Error cleaning up expired custom items:", error);
    }
  }

  // Parse variant JSON for offers + deduplicate same item/variant keeping highest discount
  if (hoteldata?.offers) {
    const parsed = hoteldata.offers.map((offer: any) => {
      let parsedVariant = undefined;
      if (offer.variant) {
        if (typeof offer.variant === 'string') {
          try {
            const parsedJson = JSON.parse(offer.variant);
            parsedVariant = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;
          } catch (error) {
            console.error("Error parsing variant JSON in hotel data:", error);
          }
        } else {
          parsedVariant = offer.variant;
        }
      }
      return {
        ...offer,
        variant: parsedVariant,
      } as Offer;
    });

    // Deduplicate by key: menu.id + variant.name (or base) and keep the best discount
    const keyFor = (o: Offer) => `${o.menu?.id || ''}|${o.variant ? (o.variant as any).name : 'base'}`;
    const getOriginal = (o: Offer) => (o.variant && (o.variant as any)?.price != null) ? Number((o.variant as any).price) : Number(o.menu?.price || 0);
    const getPct = (o: Offer) => {
      const orig = getOriginal(o);
      const disc = Number(o.offer_price || 0);
      if (!orig || orig <= 0) return 0;
      return Math.round(((orig - disc) / orig) * 100);
    };

    const bestByKey = new Map<string, Offer>();
    parsed.forEach((o) => {
      const k = keyFor(o);
      const existing = bestByKey.get(k);
      if (!existing) {
        bestByKey.set(k, o);
      } else {
        const better = getPct(o) > getPct(existing) ? o : existing;
        bestByKey.set(k, better);
      }
    });

    const deduped = Array.from(bestByKey.values());
    if (parsed.length !== deduped.length) {
      console.log("[Hotels Page] Deduped offers:", { before: parsed.length, after: deduped.length });
    }
    hoteldata.offers = deduped as any;
  }

  let filteredOffers: Offer[] = [];
  if (offers) {
    const today = new Date().setHours(0, 0, 0, 0);
    filteredOffers = search
      ? offers
        .filter(
          (offer) => new Date(offer.end_time).setHours(0, 0, 0, 0) < today
        )
        .filter((offer) =>
          Object.values(offer).some((value) =>
            String(value).toLowerCase().includes(search.trim().toLowerCase())
          )
        )
      : offers.filter(
        (offer) => new Date(offer.end_time).setHours(0, 0, 0, 0) >= today
      );

    // Filter offers based on offer_type for hotels page
    filteredOffers = filterOffersByType(filteredOffers, 'hotels');
  }

  // Use the store to fetch UPI data
  const upiData = {
    userId: hoteldata?.id || "",
    upiId: hoteldata?.upi_id || "fake-dummy-not-from-db@okaxis",
  };

  const theme = (
    typeof hoteldata?.theme === "string"
      ? JSON.parse(hoteldata?.theme)
      : hoteldata?.theme || null
  ) as ThemeConfig | null ?? DEFAULT_THEME;

  const socialLinks = getSocialLinks(hoteldata as HotelData);

  // Fetch QR codes with groups to find table 0 extra charges
  let table0QrGroup = null;
  try {
    const qrCodesResponse = hoteldata?.id ? await fetchFromHasura(
      GET_QR_CODES_WITH_GROUPS_BY_PARTNER,
      {
        partner_id: hoteldata.id,
      }
    ) : null;

    if (qrCodesResponse?.qr_codes) {
      // Find QR code with table_number = 0
      const table0QrCode = qrCodesResponse.qr_codes.find(
        (qr: any) => qr.table_number === 0 && qr.qr_group
      );

      if (table0QrCode?.qr_group) {
        // Transform the extra_charge to handle both old numeric format and new JSON format
        const extraCharge = table0QrCode.qr_group.extra_charge;
        const transformedExtraCharge = Array.isArray(extraCharge)
          ? extraCharge
          : typeof extraCharge === "number"
            ? [{ min_amount: 0, max_amount: null, charge: extraCharge }]
            : typeof extraCharge === "object" && extraCharge?.rules
              ? extraCharge.rules
              : [{ min_amount: 0, max_amount: null, charge: 0 }];

        table0QrGroup = {
          id: table0QrCode.qr_group.id,
          name: table0QrCode.qr_group.name,
          extra_charge: transformedExtraCharge,
          charge_type: table0QrCode.qr_group.charge_type || "FLAT_FEE",
        };
      }
    }
  } catch (error) {
    console.error("Error fetching QR codes:", error);
  }

  const partnerPriceAdjustment = hoteldata?.price_adjustment || 0;

  const menuItemWithOfferPrice = hoteldata?.menus
    ?.map((item: any) => {
      const deliveryBase = item.delivery_price ?? item.price;
      const offerPrice = item.offers?.[0]?.offer_price;
      // If offer exists, apply the same discount amount to delivery base price
      const finalPrice = offerPrice != null && item.price > 0
        ? Math.max(0, deliveryBase - (item.price - offerPrice))
        : deliveryBase;
      return {
        ...item,
        price: Math.max(0, finalPrice + partnerPriceAdjustment),
        variants: item.variants?.map((v: any) => ({
          ...v,
          price: Math.max(0, (v.delivery_price ?? v.price ?? 0) + partnerPriceAdjustment),
        })),
      };
    });

  // Adjust offer prices for delivery_price and partner price adjustment
  {
    const deliveryPriceMap = new Map<string, number | undefined>();
    hoteldata?.menus?.forEach((m: any) => {
      if (m.id) deliveryPriceMap.set(m.id, m.delivery_price);
    });

    filteredOffers = filteredOffers.map((offer) => {
      const menuId = offer.menu?.id;
      const originalPrice = offer.menu?.price || 0;
      const deliveryPrice = menuId ? deliveryPriceMap.get(menuId) : undefined;
      const deliveryDelta = deliveryPrice != null ? deliveryPrice - originalPrice : 0;

      const variantDeliveryDelta = offer.variant
        ? (() => {
            const menuItem = hoteldata?.menus?.find((m: any) => m.id === menuId);
            const matchingVariant = menuItem?.variants?.find((v: any) => v.name === (offer.variant as any)?.name);
            if (matchingVariant?.delivery_price != null) {
              return matchingVariant.delivery_price - ((offer.variant as any)?.price || 0);
            }
            return deliveryDelta;
          })()
        : deliveryDelta;

      return {
        ...offer,
        offer_price: Math.max(0, (offer.offer_price || 0) + variantDeliveryDelta + partnerPriceAdjustment),
        menu: {
          ...offer.menu,
          price: Math.max(0, originalPrice + deliveryDelta + partnerPriceAdjustment),
        },
        ...(offer.variant ? {
          variant: {
            ...offer.variant,
            price: ((offer.variant as any)?.price || 0) + variantDeliveryDelta,
          },
        } : {}),
      };
    });
  }

  let hotelDataWithOfferPrice = {
    ...hoteldata,
    menus: menuItemWithOfferPrice,
  };

  // Fetch fresh subscription details for scan limit checks (uncached)
  const freshSubscriptionRes = hoteldata?.id ? await fetchFromHasura(
    getPartnerSubscriptionQuery,
    {
      partnerId: hoteldata.id,
    }
  ) : null;
  const freshSubscription = freshSubscriptionRes?.partner_subscriptions?.[0];

  // --- Subscription & Scan Limit Logic ---
  const sub = freshSubscription?.subscription_details || hoteldata?.subscription_details;
  const isInternational = hoteldata?.country !== "India" && hoteldata?.country !== "IN";
  const subPlan = sub?.plan;

  if (isInternational && sub && hoteldata) {
    const plans = await import("@/data/plans.json").then(mod => mod.default);
    const planDetails = plans.international.find((p: any) => p.id === subPlan?.id);

    if (planDetails) {
      const now = new Date();
      const startDate = startOfMonth(now).toISOString();
      const endDate = endOfMonth(now).toISOString();

      const GET_PARTNER_QR_IDS = `
          query GetPartnerQrIds($partner_id: uuid!) {
            qr_codes(where: {partner_id: {_eq: $partner_id}}) {
              id
            }
          }
        `;

      const qrRes = await fetchFromHasura(GET_PARTNER_QR_IDS, {
        partner_id: hoteldata.id,
      });
      const qrIds = qrRes?.qr_codes?.map((qr: any) => qr.id) || [];

      let currentTotalScans = 0;
      if (qrIds.length > 0) {
        const GET_PARTNER_MONTHLY_SCANS = `
            query GetPartnerMonthlyScans($qr_ids: [uuid!], $startDate: timestamptz!, $endDate: timestamptz!) {
              qr_scans_aggregate(where: {
                qr_id: {_in: $qr_ids},
                created_at: {_gte: $startDate, _lte: $endDate}
              }) {
                aggregate {
                  count
                }
              }
            }
          `;

        const scanStats = await fetchFromHasura(GET_PARTNER_MONTHLY_SCANS, {
          qr_ids: qrIds,
          startDate,
          endDate,
        });
        currentTotalScans = scanStats?.qr_scans_aggregate?.aggregate?.count || 0;
      }

      const limit = (planDetails as any).max_scan_count ?? planDetails.scan_limit ?? 1000;
      const isUnlimited = limit === -1;

      // CHECK LIMIT
      if (!isUnlimited && currentTotalScans >= limit) {
        return (
          <ScanLimitReachedCard
            partnerPhone={hoteldata?.phone ?? null}
            partnerName={hoteldata?.store_name ?? null}
          />
        );
      }
    }
  }

  // Check for Subscription Expiry
  const expiryDateStr = sub?.expiryDate || freshSubscription?.expiry_date;
  const isExpired = expiryDateStr && new Date(expiryDateStr) < new Date();

  if (isExpired) {
    return (
      <SubscriptionExpiredCard
        partnerPhone={hoteldata?.phone ?? null}
        partnerName={hoteldata?.store_name ?? null}
      />
    );
  }

  if (hoteldata?.status === "inactive") {
    return (
      <SubscriptionInactiveCard
        partnerPhone={hoteldata?.phone ?? null}
        partnerName={hoteldata?.store_name ?? null}
      />
    );
  }

  let filteredMenus: HotelDataMenus[] = [];
  const hotelMenus = hotelDataWithOfferPrice?.menus || [];

  if (hotelMenus && hotelMenus.length > 0) {
    if (cat === "all" || !cat) {
      const sortedItems = [...(hotelMenus ?? [])].sort((a, b) => {
        if (a.image_url.length && !b.image_url.length) return -1;
        if (!a.image_url.length && b.image_url.length) return 1;
        filteredMenus.push({
          ...a,
        });
        return 0;
      });
      const sortByCategoryPriority: any = (
        a: HotelDataMenus,
        b: HotelDataMenus
      ) => {
        const categoryA = a.category.priority || 0;
        const categoryB = b.category.priority || 0;
        return categoryA - categoryB;
      };
      sortedItems.sort(sortByCategoryPriority);
      filteredMenus = sortedItems.map((item) => ({
        ...item,
      }));
    } else {
      const filteredItems = (hotelMenus ?? []).filter(
        (item) => item.category.name === cat
      );
      const sortedItems = [...filteredItems].sort((a, b) => {
        if (a.image_url.length && !b.image_url.length) return -1;
        if (!a.image_url.length && b.image_url.length) return 1;
        filteredMenus.push({
          ...a,
        });
        return 0;
      });

      filteredMenus = sortedItems.map((item) => ({
        ...item,
      }));

    }
  }

  if (hotelDataWithOfferPrice) {
    hotelDataWithOfferPrice = {
      ...hotelDataWithOfferPrice,
      fillteredMenus: filteredMenus,
    }
  }

  // Restaurant + Menu JSON-LD schema
  const restaurantSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: hoteldata?.store_name,
    ...(hoteldata?.phone && { telephone: hoteldata.phone }),
    ...(hoteldata?.location && {
      address: {
        "@type": "PostalAddress",
        streetAddress: hoteldata.location,
        addressCountry: hoteldata?.country || "IN",
      },
    }),
    ...(hoteldata?.store_banner && { image: hoteldata.store_banner }),
    ...(hoteldata?.description && { description: hoteldata.description }),
    url: `https://menuthere.com/hotels/${encodeURIComponent((hoteldata?.store_name || "").replace(/\s+/g, "-"))}/${hoteldata?.id}`,
    ...(filteredMenus.length > 0 && {
      hasMenu: {
        "@type": "Menu",
        hasMenuSection: Object.values(
          filteredMenus.reduce((acc: Record<string, unknown[]>, item) => {
            const cat = item.category?.name || "Menu";
            if (!acc[cat]) acc[cat] = [];
            (acc[cat] as unknown[]).push({
              "@type": "MenuItem",
              name: item.name,
              ...(item.description && { description: item.description }),
              offers: {
                "@type": "Offer",
                price: String(item.price || 0),
                priceCurrency: (hoteldata?.country === "India" || hoteldata?.country === "IN") ? "INR" : "USD",
              },
            });
            return acc;
          }, {})
        ).map((items, idx) => ({
          "@type": "MenuSection",
          name: filteredMenus.find((m) => m.category?.name)?.category?.name || `Section ${idx + 1}`,
          hasMenuItem: items,
        })),
      },
    }),
  };

  const deliveryRules = (hotelDataWithOfferPrice as any)?.delivery_rules;
  const hotelTimezone = (hotelDataWithOfferPrice as any)?.timezone || "Asia/Kolkata";
  const isDeliveryActive = deliveryRules?.isDeliveryActive ?? true;
  const initialDeliveryOpen =
    isDeliveryActive && isWithinTimeWindow(deliveryRules?.delivery_time_allowed, hotelTimezone);
  const initialTakeawayOpen = isWithinTimeWindow(deliveryRules?.takeaway_time_allowed, hotelTimezone);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
      />
      <HotelMenuPage
        socialLinks={socialLinks}
        offers={filteredOffers}
        hoteldata={hotelDataWithOfferPrice as HotelData}
        auth={auth || null}
        theme={theme}
        tableNumber={0}
        qrId={null}
        qrGroup={table0QrGroup}
        selectedCategory={cat}
        onboardingCompleted={!!(await getOrderSessionCookie(hotelId!))}
        skipStorefront={hasSearchParams}
        initialDeliveryOpen={initialDeliveryOpen}
        initialTakeawayOpen={initialTakeawayOpen}
        hotelTimezone={hotelTimezone}
      />
    </>
  );
};

export default HotelPage;
