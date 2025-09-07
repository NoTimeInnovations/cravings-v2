import { useEffect } from "react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";
import { CommonOffer } from "@/components/superAdmin/OfferUploadSuperAdmin";
import { getAuthCookie, getTempUserIdCookie } from "@/app/auth/actions";

const TRACK_OFFER_VIEW = `
  mutation TrackOfferView($userId: String!, $offerId: uuid!, $now: timestamptz!) {
    insert_common_offers_viewed_by(
      objects: {
        user_id: $userId,
        common_offer_id: $offerId,
        created_at: $now
      },
      on_conflict: {
        constraint: common_offers_viewed_by_common_offer_id_user_id_key,
        update_columns: [created_at]
      }
    ) {
      returning {
        user_id
        common_offer_id
        created_at
      }
    }
  }
`;

export const useViewTracker = (commonOffer: CommonOffer) => {
  useEffect(() => {
    if (!commonOffer.id) {
      return;
    }

    const trackView = async () => {
      try {
        const hasViewed =
          (commonOffer.common_offers_viewed_bies?.length ?? 0) > 0;

        const cookies = await getAuthCookie();
        const tempUserId = await getTempUserIdCookie();
        const userId = cookies?.id || tempUserId;

        if (!hasViewed) {
          await fetchFromHasura(TRACK_OFFER_VIEW, {
            userId,
            offerId: commonOffer.id,
            now: new Date().toISOString(),
          });
          await revalidateTag(commonOffer.id);
        }
      } catch (error) {
        console.error("Failed to track view:", error);
      }
    };

    trackView();
  }, []);
};
