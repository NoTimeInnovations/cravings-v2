import { Offer } from "@/store/offerStore_hasura";

export type PageContext = 'hotels' | 'offers' | 'qrscan';

export const filterOffersByType = (offers: Offer[], pageContext: PageContext): Offer[] => {
  return offers.filter(offer => {
    const offerType = offer.offer_type || 'all';
    
    switch (offerType) {
      case 'all':
        return true; // Show on all pages
      case 'delivery':
        return pageContext === 'hotels' || pageContext === 'offers';
      case 'dine_in':
        return pageContext === 'qrscan';
      default:
        return true; // Default to showing all
    }
  });
}; 