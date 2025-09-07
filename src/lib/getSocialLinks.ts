import { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";

const safeParseJson = (input: any) => {
  try {
    return typeof input === "string" ? JSON.parse(input) : input || {};
  } catch (e) {
    console.error("Error parsing social links:", e);
    return {};
  }
};

export const getSocialLinks = (hoteldata: HotelData): SocialLinks => {
  const socialLinksData = safeParseJson(hoteldata?.social_links);
  const instaLink = socialLinksData?.instagram;

  return {
    instagram: instaLink || undefined,
    whatsapp: (hoteldata?.whatsapp_numbers?.[0] || hoteldata?.phone) ? `https://wa.me/${hoteldata?.country_code || "+91"}${
      hoteldata?.whatsapp_numbers?.[0] ? hoteldata.whatsapp_numbers[0]?.number : hoteldata?.phone
    }` : undefined,
    googleReview: undefined,
    location: hoteldata?.location || undefined,
    phone: hoteldata?.phone ? `${hoteldata?.country_code || "+91"}${hoteldata?.phone}` : undefined,
  };
};
