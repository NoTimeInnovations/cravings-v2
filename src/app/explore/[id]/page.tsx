import { getCommonOfferById } from "@/api/common_offers";
import { getAuthCookie, getTempUserIdCookie } from "@/app/auth/actions";
import DeleteExploreOfferBtn from "@/components/explore/DeleteExploreOfferBtn";
import ExploreDetail from "@/components/explore/ExploreDetail";
// import GeoAddress from "@/components/explore/geoAddress";
import ImageList from "@/components/explore/ImageList";
import ResendOfferMsgBtn from "@/components/explore/ResendOfferMsgBtn";
import ScrollDownIndicator from "@/components/explore/ScrollDownIndicator";
import ShareExploreItemBtn from "@/components/explore/ShareExploreItemBtn";
import SideActionButtons from "@/components/explore/SideActionButtons";
import VideoStats from "@/components/explore/VideoStats";
import InstaReelEmbed from "@/components/InstaReelEmbeded";
import ReportReelModal from "@/components/ReportReelModal";
import { CommonOffer } from "@/components/superAdmin/OfferUploadSuperAdmin";
import { decryptText } from "@/lib/encrtption";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { InstagramLogoIcon } from "@radix-ui/react-icons";
import {
  Hotel,
  Map,
  MapPin,
  UtensilsCrossed,
  Star,
  Clock,
  Heart,
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Phone,
} from "lucide-react";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import Link from "next/link";
import React from "react";
import { FaWhatsapp } from "react-icons/fa";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookies = await getAuthCookie();
  const tempId = await getTempUserIdCookie();

  const userId = cookies?.id || tempId;

  const getOffer = unstable_cache(
    async (id: string) => {
      if (!id) {
        throw new Error("offer ID not found");
      }
      const offers = await fetchFromHasura(getCommonOfferById, {
        id: id,
        user_id: userId,
      });

      if (offers.common_offers_by_pk === null) {
        throw new Error("Deal not found");
      }

      return offers.common_offers_by_pk as CommonOffer;
    },
    [id],
    { tags: [id] }
  );

  const commonOffer = await getOffer(id);

  if (!commonOffer) {
    throw new Error("Offer not found");
  }

  return {
    title: commonOffer.item_name,
    icons: [commonOffer.image_url],
    description: `*KIDILAN FOOD SPOT ALERT* 🚨\n\n🎉 *${
      commonOffer.partner_name
    }* is offering *${commonOffer.item_name}* at *₹${
      commonOffer.price
    }*! 🌟\n\n${
      commonOffer.insta_link ? `📱 Instagram: ${commonOffer.insta_link}\n` : ""
    }🔗 View offer: www.cravings.live/explore/${
      commonOffer.id
    }\n\nDon't miss out on this amazing offer from *Cravings*! 🍽️✨`,
    openGraph: {
      images: [commonOffer.image_url],
      title: commonOffer.item_name,
      description: `*KIDILAN FOOD SPOT ALERT* 🚨\n\n🎉 *${
        commonOffer.partner_name
      }* is offering *${commonOffer.item_name}* at *₹${
        commonOffer.price
      }*! 🌟\n\n${
        commonOffer.insta_link
          ? `📱 Instagram: ${commonOffer.insta_link}\n`
          : ""
      }🔗 View offer: www.cravings.live/explore/${
        commonOffer.id
      }\n\nDon't miss out on this amazing offer from *Cravings*! 🍽️✨`,
    },
  };
}

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const authToken = (await cookies()).get("new_auth_token")?.value;
  const tempId = (await cookies()).get("temp_user_id")?.value;

  
  let geoData: any = null;
  
  let decrypted = authToken
  ? (decryptText(authToken) as { id: string; role: string })
  : null;

  const userId = decrypted?.id || tempId;

  const role = decrypted?.role || "user";


  const getCommonOffer = await unstable_cache(
    async () => {
      
      return fetchFromHasura(getCommonOfferById, {
        id: id,
        user_id: userId,
      });
    },
    ["common-offers", id],
    {
      tags: ["common-offers", id],
    }
  );

  const {
    common_offers_by_pk: commonOffer,
  }: {
    common_offers_by_pk: CommonOffer;
  } = await getCommonOffer();

  return <ExploreDetail commonOffer={commonOffer} decrypted={decrypted} />;
};

export default page;
