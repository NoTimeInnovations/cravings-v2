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
import { getAuthCookie } from "@/app/auth/actions";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
import { Metadata } from "next";
import { getSocialLinks } from "@/lib/getSocialLinks";
import { usePartnerStore } from "@/store/usePartnerStore";
import { filterOffersByType } from "@/lib/offerFilters";
import { startOfMonth, endOfMonth } from "date-fns";
// import getTimestampWithTimezone from "@/lib/getTimeStampWithTimezon";

import { AlertTriangle } from "lucide-react";
import {
  ScanLimitReachedCard,
  SubscriptionExpiredCard,
  SubscriptionInactiveCard
} from "@/components/SubscriptionStatusCards";


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
    { tags: [hotelId as string, "hotel-data"] }
  );

  const hotel = await getHotelData(hotelId);

  if (!hotel) {
    throw new Error("Hotel not found");
  }

  return {
    title: hotel.store_name,
    icons: [hotel.store_banner || "/hotelDetailsBanner.jpeg"],
    description:
      hotel.description ||
      "Welcome to " + hotel.store_name + "! Enjoy a comfortable stay with us.",
    openGraph: {
      images: [hotel.store_banner || "/hotelDetailsBanner.jpeg"],
      title: hotel.store_name,
      description:
        hotel.description ||
        "Welcome to " +
        hotel.store_name +
        "! Enjoy a comfortable stay with us.",
    },
  };
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
  whatsapp?: string;
  googleReview?: string;
  location?: string;
  phone?: string;
}

const HotelPage = async ({
  searchParams,
  params,
}: {
  searchParams: Promise<{ query: string; qrScan: boolean; cat: string }>;
  params: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { query: search, qrScan, cat } = await searchParams;
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
    { tags: [hotelId as string, "hotel-data"] }
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
      : hoteldata?.theme || {}
  ) as ThemeConfig;

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

  const menuItemWithOfferPrice = hoteldata?.menus?.map((item) => {
    return {
      ...item,
      price: item.offers?.[0]?.offer_price || item.price,
    };
  });

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
  const isInternational = hoteldata?.country !== "IN";
  const subPlan = sub?.plan;

  if (isInternational && sub && hoteldata) {
    const plans = await import("@/data/plans.json").then(mod => mod.default);
    const planDetails = plans.international.find((p: any) => p.id === subPlan?.id);

    if (planDetails) {
      const now = new Date();
      const startDate = startOfMonth(now).toISOString();
      const endDate = endOfMonth(now).toISOString();

      const GET_PARTNER_MONTHLY_SCANS = `
          query GetPartnerMonthlyScans($partner_id: uuid!, $startDate: timestamptz!, $endDate: timestamptz!) {
            qr_scans_aggregate(where: {
              qr_code: { partner_id: {_eq: $partner_id} },
              created_at: {_gte: $startDate, _lte: $endDate}
            }) {
              aggregate {
                count
              }
            }
          }
        `;

      const scanStats = await fetchFromHasura(GET_PARTNER_MONTHLY_SCANS, {
        partner_id: hoteldata.id,
        startDate,
        endDate
      });
      const currentTotalScans = scanStats?.qr_scans_aggregate?.aggregate?.count || 0;

      const limit = planDetails.max_scan_count ?? planDetails.scan_limit ?? 1000;
      const isUnlimited = limit === -1;

      // CHECK LIMIT
      if (!isUnlimited && currentTotalScans >= limit) {
        return <ScanLimitReachedCard />;
      }
    }
  }

  // Check for Subscription Expiry
  const expiryDateStr = sub?.expiryDate || freshSubscription?.expiry_date;
  const isExpired = expiryDateStr && new Date(expiryDateStr) < new Date();

  if (isExpired) {
    return <SubscriptionExpiredCard />;
  }

  if (hoteldata?.status === "inactive") {
    return <SubscriptionInactiveCard />;
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
          price: a.offers?.[0]?.offer_price || a.price,
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
        price: item.offers?.[0]?.offer_price || item.price,
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
          price: a.offers?.[0]?.offer_price || a.price,
        });
        return 0;
      });

      filteredMenus = sortedItems.map((item) => ({
        ...item,
        price: item.offers?.[0]?.offer_price || item.price,
      }));

    }
  }

  if (hotelDataWithOfferPrice) {
    hotelDataWithOfferPrice = {
      ...hotelDataWithOfferPrice,
      fillteredMenus: filteredMenus,
    }
  }

  return (
    <>
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
      />
    </>
  );
};

export default HotelPage;
