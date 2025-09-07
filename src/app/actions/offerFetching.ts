"use server";

import { Offer } from "@/store/offerStore_hasura";
import { isHotelNear } from "./isHotelNear";
import Fuse from "fuse.js";
import { CommonOffer } from "@/components/superAdmin/OfferUploadSuperAdmin";

export const filterAndSortOffers = async ({
  offers,
  activeTab = "all",
  searchQuery = "",
  location = null,
  lat,
  lon,
}: {
  offers: Offer[];
  activeTab?: string;
  searchQuery?: string;
  location?: string | null;
  lat: number;
  lon: number;
}) => {
  // Convert search query to lowercase for case-insensitive matching
  const query = searchQuery.toLowerCase();

  // Filter offers based on validity and location
  const currentOffers = offers.filter((offer) => {
    const matchesLocation = !location || offer.partner?.district === location;
    const isValid = new Date(offer.end_time).setHours(0,0,0,0) > new Date().setHours(0,0,0,0);
    return matchesLocation && isValid;
  });

  // // Add the distance to each offer
  // const offersWithDistancePromises = currentOffers.map(async (offer) => {
  //   const distance = await isHotelNear(offer.partner?.location as string, { lat, lon });
  //   return { ...offer, distance }; // Attach the distance to each offer
  // });

  // const offersWithDistance = await Promise.all(offersWithDistancePromises);

  // Configure Fuse.js for fuzzy searching
  const fuseOptions = {
    keys: [
      "dishName",
      "hotelName",
      "newPrice",
      "originalPrice",
      "hotelName",
      "distance",
      "newPrice"
    ],
    includeScore: true, // Include match score for sorting
    threshold: 0.3, // Adjust the threshold for fuzzy matching (0 = exact match, 1 = very loose match)
    ignoreLocation: true, // Search across the entire string
    minMatchCharLength: 2, // Minimum number of characters to match
  };

  // Create a Fuse instance with the offers
  const fuse = new Fuse(currentOffers, fuseOptions);

  // Perform fuzzy search if there's a search query
  let allOffers = currentOffers;
  if (query) {
    const fuseResults = fuse.search(query);
    allOffers = fuseResults.map((result) => result.item);
  }

  // Log invalid distances for debugging
  // allOffers.forEach((offer) => {
  //   if (typeof offer.distance !== "number") {
  //     console.error(`Invalid distance for offer ${offer.id}:`, offer.distance);
  //   }
  // });

  // Sorting logic based on active tab
  if (activeTab === "popular") {
    // Sort by enquiries (descending order)
    allOffers.sort((a: Offer, b: Offer) => b.enquiries - a.enquiries);
  } else if (activeTab === "money saver") {
    // Sort by discount percentage (descending order)
    allOffers.sort((a: Offer, b: Offer) => {
      // Add null checks and default values
      const menuPriceA = a.menu?.price ?? 0;
      const offerPriceA = a.offer_price ?? 0;
      const menuPriceB = b.menu?.price ?? 0;
      const offerPriceB = b.offer_price ?? 0;
      
      // Avoid division by zero
      const discountA = menuPriceA > 0 
        ? ((menuPriceA - offerPriceA) / menuPriceA) * 100 
        : 0;
      const discountB = menuPriceB > 0 
        ? ((menuPriceB - offerPriceB) / menuPriceB) * 100 
        : 0;
      
      return discountB - discountA; // Higher discount comes first
    });
  } else {
    // Default sorting: sort by creation date (newest first) and then by distance
    allOffers.sort(
      (a: Offer, b: Offer) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    // allOffers.sort((a, b) => a.distance - b.distance);
  }

  return allOffers;
};


export const filterAndSortCommonOffers = async ({
  offers,
  searchQuery = "",
  location = null,
}: {
  offers: CommonOffer[];
  searchQuery?: string;
  location?: string | null;
}) => {
  // Convert search query to lowercase for case-insensitive matching
  const query = searchQuery.toLowerCase();

  // Filter offers based on validity and location
  const currentOffers = offers.filter((offer) => {
    const matchesLocation = !location || offer.district.toLowerCase() === location.toLowerCase();
    return matchesLocation;
  });

  // Configure Fuse.js for fuzzy searching
  const fuseOptions = {
    keys: [
      "item_name",
      "partner_name",
      "price",
      "description",
      "district",
    ],
    includeScore: true,
    threshold: 0.3, 
    ignoreLocation: true, 
    minMatchCharLength: 2,
  };

  // Create a Fuse instance with the offers
  const fuse = new Fuse(currentOffers, fuseOptions);

  // Perform fuzzy search if there's a search query
  let allOffers = currentOffers;
  if (query) {
    const fuseResults = fuse.search(query);
    allOffers = fuseResults.map((result) => result.item);
  }


  return allOffers;
};