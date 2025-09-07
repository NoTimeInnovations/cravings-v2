import { getOffers } from "@/api/offers";
import { fetchFromHasura } from "@/lib/hasuraClient";
import Offers from "@/screens/Offers";
import { unstable_cache } from "next/cache";
import React from "react";
import { filterOffersByType } from "@/lib/offerFilters";

const OfferMainPage = async () => {
  
  const getCachedOffers = await unstable_cache(
    async () => {
      return fetchFromHasura(getOffers);
    },
    ["all-offers", "offers"],
    {
      tags: ["all-offers", "offers"],
    }
  );


  const { offers } = await getCachedOffers();

  // Filter offers based on offer_type for offers page
  const filteredOffers = filterOffersByType(offers, 'offers');

  return <Offers offers={filteredOffers} />;
};

export default OfferMainPage;
