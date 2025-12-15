import { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";

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
    whatsapp: (hoteldata?.whatsapp_numbers?.[0] || hoteldata?.phone) ? `https://wa.me/${hoteldata?.country_code || "+91"}${hoteldata?.whatsapp_numbers?.[0] ? hoteldata.whatsapp_numbers[0]?.number : hoteldata?.phone
      }` : undefined,
    googleReview: undefined,
    location: hoteldata?.location || undefined,
    phone: hoteldata?.phone ? `${hoteldata?.country_code || "+91"}${hoteldata?.phone}` : undefined,
  };
};
