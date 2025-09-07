import {
  getPartnerAndOffersQuery,
  getPartnerSubscriptionQuery,
} from "@/api/partners";
import { GET_QR_TABLE, INCREMENT_QR_CODE_SCAN_COUNT } from "@/api/qrcodes";
import {
  getAuthCookie,
  getQrScanCookie,
  setQrScanCookie,
} from "@/app/auth/actions";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
import { getFeatures } from "@/lib/getFeatures";
import { getSocialLinks } from "@/lib/getSocialLinks";
import { fetchFromHasura } from "@/lib/hasuraClient";
import HotelMenuPage from "@/screens/HotelMenuPage_v2";
import QrPayment from "@/screens/QrPayment";
import { Offer } from "@/store/offerStore_hasura";
import { AlertTriangle } from "lucide-react";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { Metadata } from "next";
import React from "react";
import { filterOffersByType } from "@/lib/offerFilters";

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string[] }>;
}): Promise<Metadata> {
  const { id: qrIds } = await params;

  const qrId = isUUID(qrIds?.[0] || "") ? qrIds?.[0] : qrIds?.[1];

  const getHotelData = unstable_cache(
    async (id: string) => {
      try {

        const { qr_codes } = await fetchFromHasura(GET_QR_TABLE, {
          id: qrId,
        });

        const hotelId = qr_codes?.[0].partner_id;

        const partnerData = await fetchFromHasura(getPartnerAndOffersQuery, {
          id: hotelId,
          offer_types: ["dine_in" , "all"]
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
    [qrId as string, "hotel-data"],
    { tags: [qrId as string, "hotel-data"] }
  );

  const hotel = await getHotelData(qrId);
  // console.log("partnerdata",hotel);

  if (!hotel) {
    throw new Error("Hotel not found");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cravings.live';
  const defaultBanner = `${baseUrl}/image_placeholder.webp`;
  const storeBanner = hotel.store_banner ? (hotel.store_banner.startsWith('http') ? hotel.store_banner : `${baseUrl}${hotel.store_banner}`) : defaultBanner;

  return {
    title: hotel.store_name,
    icons: [storeBanner],
    description:
      hotel.description ||
      "Welcome to " + hotel.store_name + "! Enjoy a comfortable stay with us.",
    openGraph: {
      images: [storeBanner],
      title: hotel.store_name,
      description:
        hotel.description ||
        "Welcome to " +
          hotel.store_name +
          "! Enjoy a comfortable stay with us.",
    },
  };
}


const page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ [key: string]: string | undefined }>;
  searchParams: Promise<{ query: string; qrScan: string, cat: string }>;
}) => {



  const { id: qrId } = await params;

  // Validate and find the correct UUID from the path segments
  let validQrId: string | null = null;

  if (qrId && Array.isArray(qrId)) {
    // Check each segment for a valid UUID
    for (const segment of qrId) {
      if (segment && isUUID(segment)) {
        validQrId = segment;
        break;
      }
    }
  } else if (qrId && isUUID(qrId)) {
    validQrId = qrId;
  }

  if (!validQrId) {
    // No valid UUID found, return an error page
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-4 text-center">
            <div className="space-y-2">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
              <h2 className="text-2xl font-bold tracking-tight">
                Invalid QR Code
              </h2>
              <p className="text-muted-foreground">
                The QR code you scanned is not valid or has expired.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please scan a valid QR code or contact staff for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { qr_codes } = await fetchFromHasura(GET_QR_TABLE, {
    id: validQrId,
  });

  // Check if QR code exists
  if (!qr_codes || qr_codes.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-4 text-center">
            <div className="space-y-2">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
              <h2 className="text-2xl font-bold tracking-tight">
                QR Code Not Found
              </h2>
              <p className="text-muted-foreground">
                The QR code you scanned could not be found in our system.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please scan a valid QR code or contact staff for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tableNumber = qr_codes?.[0].table_number;

  // console.log("Table Number:", tableNumber);

  // if (tableNumber !== 0) {
  const { query: search  , cat} = await searchParams;
  const auth = await getAuthCookie();
  const hotelId = qr_codes?.[0].partner_id;

  const getHotelData = unstable_cache(
    async (id: string) => {
      try {
        const partnerData = await fetchFromHasura(getPartnerAndOffersQuery, {
          id,
          offer_types: ["dine_in" , "all"]
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

  const hoteldata = hotelId ? await getHotelData(hotelId) : null;
  const offers = hoteldata?.offers;

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
    
    // Filter offers based on offer_type for QR scan page
    filteredOffers = filterOffersByType(filteredOffers, 'qrscan');
  }

  const theme = (
    typeof hoteldata?.theme === "string"
      ? JSON.parse(hoteldata?.theme)
      : hoteldata?.theme || {}
  ) as ThemeConfig;

  const socialLinks = getSocialLinks(hoteldata as HotelData);

  const menuItemWithOfferPrice = hoteldata?.menus?.map((item) => {
    return {
      ...item,
      price: item.offers?.[0]?.offer_price || item.price,
    };
  });

  const hotelDataWithOfferPrice = {
    ...hoteldata,
    menus: menuItemWithOfferPrice,
  };

  if (hoteldata) {
    const features = getFeatures(hoteldata.feature_flags as string);
    const isOrderingEnabled = features?.ordering.enabled && tableNumber !== 0;
    const isDeliveryEnabled = features?.delivery.enabled && tableNumber === 0;

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
              <p className="font-medium text-sm sm:text-base">
                Contact Support:
              </p>
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


    // if (isOrderingEnabled || isDeliveryEnabled) {
    return (
      <HotelMenuPage
        socialLinks={socialLinks}
        auth={auth}
        hoteldata={hotelDataWithOfferPrice as HotelData}
        offers={filteredOffers}
        tableNumber={tableNumber}
        theme={theme}
        qrData={qr_codes[0]}
        qrGroup={qr_codes[0].qr_group}
        qrId={validQrId}
        selectedCategory={ cat }
      />
    );
    // }

    // return (
    //   <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
    //     <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
    //       <div className="flex flex-col space-y-4 text-center">
    //         <div className="space-y-2">
    //           <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500" />
    //           <h2 className="text-2xl font-bold tracking-tight">
    //             Access Restricted
    //           </h2>
    //           <p className="text-muted-foreground">
    //             {tableNumber === 0
    //               ? "Delivery is not enabled for this hotel."
    //               : "In-restaurant ordering is not enabled for this hotel."}
    //           </p>
    //         </div>
    //         <p className="text-sm text-muted-foreground">
    //           Please contact staff for assistance.
    //         </p>
    //       </div>
    //     </div>
    //   </div>
    // );
  }

  // } else {
  //   return <QrPayment />;
  // }
};

export default page;
