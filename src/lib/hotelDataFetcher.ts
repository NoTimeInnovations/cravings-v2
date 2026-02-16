import {
  getPartnerAndOffersQuery,
  getPartnerSubscriptionQuery,
} from "@/api/partners";
import { GET_QR_CODES_WITH_GROUPS_BY_PARTNER } from "@/api/qrcodes";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Offer } from "@/store/offerStore_hasura";
import { unstable_cache } from "next/cache";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
import { getSocialLinks } from "@/lib/getSocialLinks";
import { filterOffersByType } from "@/lib/offerFilters";
import { startOfMonth, endOfMonth } from "date-fns";
import { HotelData, HotelDataMenus, SocialLinks } from "@/app/hotels/[...id]/page";

export type HotelPageStatus =
  | { status: "ok" }
  | { status: "scan_limit_reached" }
  | { status: "subscription_expired" }
  | { status: "inactive" }
  | { status: "not_found" };

export interface HotelPageData {
  hotelData: HotelData;
  filteredOffers: Offer[];
  theme: ThemeConfig;
  socialLinks: SocialLinks;
  table0QrGroup: any;
  selectedCategory: string;
}

export async function fetchHotelDataById(hotelId: string) {
  const getHotelData = unstable_cache(
    async (id: string) => {
      try {
        return fetchFromHasura(getPartnerAndOffersQuery, {
          id,
          offer_types: ["delivery", "all"],
        });
      } catch (error) {
        console.error("Error fetching hotel data:", error);
        return null;
      }
    },
    [hotelId, "hotel-data"],
    { tags: [hotelId, "hotel-data"] }
  );

  const raw = await getHotelData(hotelId);
  return raw?.partners?.[0] as HotelData | null;
}

export async function fetchHotelMetadata(hotelId: string) {
  const getHotelData = unstable_cache(
    async (id: string) => {
      try {
        const partnerData = await fetchFromHasura(getPartnerAndOffersQuery, {
          id,
          offer_types: ["delivery", "all"],
        });
        if (!partnerData?.partners?.[0]) return null;
        return { id, ...partnerData.partners[0] } as HotelData;
      } catch (error) {
        console.error("Error fetching hotel data:", error);
        return null;
      }
    },
    [hotelId, "hotel-data"],
    { tags: [hotelId, "hotel-data"] }
  );

  return getHotelData(hotelId);
}

export async function processHotelPage(
  hotelId: string,
  search: string | undefined,
  cat: string | undefined
): Promise<{ pageStatus: HotelPageStatus; data?: HotelPageData }> {
  let hoteldata = await fetchHotelDataById(hotelId);

  if (!hoteldata) {
    return { pageStatus: { status: "not_found" } };
  }

  // Filter expired offers
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
      const { cleanupExpiredCustomItems } = await import("@/api/offers");
      await fetchFromHasura(cleanupExpiredCustomItems, {
        partner_id: hoteldata.id,
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
        if (typeof offer.variant === "string") {
          try {
            const parsedJson = JSON.parse(offer.variant);
            parsedVariant = Array.isArray(parsedJson)
              ? parsedJson[0]
              : parsedJson;
          } catch (error) {
            console.error("Error parsing variant JSON in hotel data:", error);
          }
        } else {
          parsedVariant = offer.variant;
        }
      }
      return { ...offer, variant: parsedVariant } as Offer;
    });

    const keyFor = (o: Offer) =>
      `${o.menu?.id || ""}|${o.variant ? (o.variant as any).name : "base"}`;
    const getOriginal = (o: Offer) =>
      o.variant && (o.variant as any)?.price != null
        ? Number((o.variant as any).price)
        : Number(o.menu?.price || 0);
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
      console.log("[Hotels Page] Deduped offers:", {
        before: parsed.length,
        after: deduped.length,
      });
    }
    hoteldata.offers = deduped as any;
  }

  // Filter offers
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

    filteredOffers = filterOffersByType(filteredOffers, "hotels");
  }

  const theme = (
    typeof hoteldata?.theme === "string"
      ? JSON.parse(hoteldata?.theme)
      : hoteldata?.theme || {}
  ) as ThemeConfig;

  const socialLinks = getSocialLinks(hoteldata as HotelData);

  // Fetch QR codes with groups to find table 0 extra charges
  let table0QrGroup = null;
  try {
    const qrCodesResponse = hoteldata?.id
      ? await fetchFromHasura(GET_QR_CODES_WITH_GROUPS_BY_PARTNER, {
          partner_id: hoteldata.id,
        })
      : null;

    if (qrCodesResponse?.qr_codes) {
      const table0QrCode = qrCodesResponse.qr_codes.find(
        (qr: any) => qr.table_number === 0 && qr.qr_group
      );

      if (table0QrCode?.qr_group) {
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

  const menuItemWithOfferPrice = hoteldata?.menus?.map((item) => ({
    ...item,
    price: item.offers?.[0]?.offer_price || item.price,
  }));

  let hotelDataWithOfferPrice = {
    ...hoteldata,
    menus: menuItemWithOfferPrice,
  };

  // Fetch fresh subscription details for scan limit checks (uncached)
  const freshSubscriptionRes = hoteldata?.id
    ? await fetchFromHasura(getPartnerSubscriptionQuery, {
        partnerId: hoteldata.id,
      })
    : null;
  const freshSubscription = freshSubscriptionRes?.partner_subscriptions?.[0];

  // --- Subscription & Scan Limit Logic ---
  const sub =
    freshSubscription?.subscription_details ||
    hoteldata?.subscription_details;
  const isInternational = hoteldata?.country !== "IN";
  const subPlan = sub?.plan;

  if (isInternational && sub && hoteldata) {
    const plans = await import("@/data/plans.json").then((mod) => mod.default);
    const planDetails = plans.international.find(
      (p: any) => p.id === subPlan?.id
    );

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
        endDate,
      });
      const currentTotalScans =
        scanStats?.qr_scans_aggregate?.aggregate?.count || 0;

      const limit =
        planDetails.max_scan_count ?? planDetails.scan_limit ?? 1000;
      const isUnlimited = limit === -1;

      if (!isUnlimited && currentTotalScans >= limit) {
        return { pageStatus: { status: "scan_limit_reached" } };
      }
    }
  }

  // Check for Subscription Expiry
  const expiryDateStr = sub?.expiryDate || freshSubscription?.expiry_date;
  const isExpired = expiryDateStr && new Date(expiryDateStr) < new Date();

  if (isExpired) {
    return { pageStatus: { status: "subscription_expired" } };
  }

  if (hoteldata?.status === "inactive") {
    return { pageStatus: { status: "inactive" } };
  }

  // Filter and sort menus
  let filteredMenus: HotelDataMenus[] = [];
  const hotelMenus = hotelDataWithOfferPrice?.menus || [];

  if (hotelMenus && hotelMenus.length > 0) {
    if (cat === "all" || !cat) {
      const sortedItems = [...(hotelMenus ?? [])].sort((a, b) => {
        if (a.image_url.length && !b.image_url.length) return -1;
        if (!a.image_url.length && b.image_url.length) return 1;
        return 0;
      });
      const sortByCategoryPriority = (a: HotelDataMenus, b: HotelDataMenus) => {
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
    };
  }

  return {
    pageStatus: { status: "ok" },
    data: {
      hotelData: hotelDataWithOfferPrice as HotelData,
      filteredOffers,
      theme,
      socialLinks,
      table0QrGroup,
      selectedCategory: cat || "",
    },
  };
}
