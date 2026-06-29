import { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";
import { getPartnerMapsUrl } from "@/lib/getPartnerMapsUrl";

const safeParseJson = (input: any) => {
  try {
    return typeof input === "string" ? JSON.parse(input) : input || {};
  } catch (e) {
    // If parsing fails, it might be a raw string
    return input || {};
  }
};

export const getSocialLinks = (hoteldata: HotelData): SocialLinks => {
  let socialLinksData = safeParseJson(hoteldata?.social_links);

  // If the data is just a string (likely a direct URL), assume it's the instagram link
  if (typeof socialLinksData === "string") {
    socialLinksData = { instagram: socialLinksData };
  }

  const instaLink = socialLinksData?.instagram;

  return {
    instagram: instaLink || undefined,
    facebook: socialLinksData?.facebook || undefined,
    whatsapp: (hoteldata?.whatsapp_numbers?.[0] || hoteldata?.phone) ? `https://wa.me/${hoteldata?.country_code || "+91"}${hoteldata?.whatsapp_numbers?.[0] ? hoteldata.whatsapp_numbers[0]?.number : hoteldata?.phone
      }` : undefined,
    googleReview: undefined,
    // Build a proper "open in Maps" URL (place_id / name / coords first, raw
    // location string only as last resort) so the link works even though
    // partners.location now holds a plain address rather than a Maps URL.
    location: getPartnerMapsUrl(hoteldata as any) || undefined,
    phone: hoteldata?.phone ? `${hoteldata?.country_code || "+91"}${hoteldata?.phone}` : undefined,
    zomato: socialLinksData?.zomato || undefined,
    uberEats: socialLinksData?.uberEats || undefined,
    talabat: socialLinksData?.talabat || undefined,
    doordash: socialLinksData?.doordash || undefined,
    playstore: socialLinksData?.playstore || undefined,
    appstore: socialLinksData?.appstore || undefined,
  };
};
