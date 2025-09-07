// claimedOffersStore.ts
import { create } from "zustand";
import { Offer, useOfferStore } from "./offerStore_hasura";
import { Partner, useAuthStore, User } from "./authStore";
import getTimestampWithTimezone from "@/lib/getTimeStampWithTimezon";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { addClaimedOffer, getClaimedOffersByOfferId } from "@/api/claimedOffers";

interface ClaimedOffer {
  id: string;
  claimed_time: string;
  offer?: Offer;
  partner?: Partner;
  user?: User;
}

interface ClaimedOffersState {
  claimedOffers: ClaimedOffer[];
  addClaimedOffer: (offer: Offer) => Promise<void>;
  fetchCalimedOfferByOfferId: (offerId: string) => Promise<void>;
}

export const useClaimedOffersStore = create<ClaimedOffersState>((set, get) => ({
  claimedOffers: [],

  addClaimedOffer: async (offer: Offer) => {
    try {
      const incrementOfferEnquiry = useOfferStore.getState().incrementOfferEnquiry;
      const user = useAuthStore.getState().userData;

      if (!user) {
        throw new Error("User not found");
      }

      if(user.role === "partner"){
        throw new Error("User is a partner and cannot claim offers");
      }

      const isClaimed = await fetchFromHasura(getClaimedOffersByOfferId, {
        offer_id: offer.id,
        user_id: user?.id ?? "",
      });

      if(isClaimed.offers_claimed.length > 0) {
        throw new Error("Offer already claimed");
      }

      const newClaim = {
        claimed_time: new Date().toISOString(),
        offer_id: offer.id,
        user_id: user?.id ?? "",
        partner_id: offer.partner?.id ?? "",
      };

      const addedCalim = await fetchFromHasura(addClaimedOffer, newClaim);
      await incrementOfferEnquiry(offer.id);

      set({
        claimedOffers: [
          ...get().claimedOffers,
          addedCalim.insert_offers_claimed.returning[0],
        ],
      });
    } catch (error) {
      console.error(error);
    }
  },

  fetchCalimedOfferByOfferId : async (offerId: string) => {
    try {
      const user = useAuthStore.getState().userData;

      if (!user) {
        throw new Error("User not found");
      }
      
      if(!offerId){
        throw new Error("Offer ID not found");
      }

      const claimedOffers = await fetchFromHasura(getClaimedOffersByOfferId, {
        offer_id: offerId,
        user_id: user?.id ?? "",
      });

      set({
        claimedOffers: [
          ...get().claimedOffers,
          ...claimedOffers.offers_claimed,
        ],
      });
      
    } catch (error) {
      console.error(error)
    }
  }
}));
