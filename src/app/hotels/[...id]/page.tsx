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
// import getTimestampWithTimezone from "@/lib/getTimeStampWithTimezon";

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
          offer_types: ["delivery" , "all"]
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
          offer_types: ["delivery" , "all"]
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

  // Parse variant JSON for offers
  if (hoteldata?.offers) {
    hoteldata.offers = hoteldata.offers.map((offer: any) => {
      let parsedVariant = undefined;
      if (offer.variant) {
        // Handle both string (JSON) and object formats for backward compatibility
        if (typeof offer.variant === 'string') {
          try {
            const parsed = JSON.parse(offer.variant);
            parsedVariant = Array.isArray(parsed) ? parsed[0] : parsed;
          } catch (error) {
            console.error("Error parsing variant JSON in hotel data:", error);
          }
        } else {
          // Direct object format
          parsedVariant = offer.variant;
        }
      }
      return {
        ...offer,
        variant: parsedVariant,
      };
    });
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
    const qrCodesResponse = await fetchFromHasura(
      GET_QR_CODES_WITH_GROUPS_BY_PARTNER,
      {
        partner_id: hoteldata?.id || "",
      }
    );

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

  const getLastSubscription = await fetchFromHasura(
    getPartnerSubscriptionQuery,
    {
      partnerId: hoteldata?.id || "",
    }
  );

  const lastSubscription = getLastSubscription?.partner_subscriptions?.[0];

  if (hoteldata?.status === "inactive") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 py-8">
        <div className="text-center p-4 sm:p-8 bg-white rounded-3xl shadow-lg w-full max-w-[90%] sm:max-w-md mx-auto">
          <h1 className="text-xl sm:text-3xl font-bold mb-4 text-orange-600">
            {new Date(lastSubscription?.expiry_date) < new Date()
              ? "Hotel Subscription Expired"
              : "Hotel is Currently Inactive"}
          </h1>
          <p className="mb-6 text-sm sm:text-base text-gray-600">
            This hotel is temporarily unavailable. For assistance, please
            contact our support team.
          </p>
          <div className="text-gray-700 bg-gray-100 p-4 rounded-md">
            <p className="font-medium text-sm sm:text-base">Contact Support:</p>
            <a
              href="tel:+916238969297"
              className="text-blue-600 hover:text-blue-800 block mt-2 text-sm sm:text-base"
            >
              +91 6238969297
            </a>
          </div>
        </div>
      </div>
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
        selectedCategory={ cat }
      />
    </>
  );
};

export default HotelPage;
