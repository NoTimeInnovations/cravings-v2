import ReelAnalytics from "@/components/reelAnalytics/ReelAnalytics";
import { fetchFromHasura } from "@/lib/hasuraClient";
import React from "react";

const page = () => {
    
  const fetchAllCommonOffers = async () => {
    try {
      return fetchFromHasura(`
query MyQuery {
   common_offers {
        created_at
        coordinates
        district
        id
        insta_link
        item_name
        no_of_likes
        no_of_views
        partner_id
        partner_name
        price
        tags
   }
   common_offers_liked_by {
      id
      user_id
      created_at
      common_offer {
				created_at
        coordinates
        district
        id
        insta_link
        item_name
        no_of_likes
        no_of_views
        partner_id
        partner_name
        price
        tags
      }
    }
  
  	common_offers_viewed_by {
      id
      user_id
      created_at
      common_offer {
				created_at
        coordinates
        district
        id
        insta_link
        item_name
        no_of_likes
        no_of_views
        partner_id
        partner_name
        price
        tags
      }
    }
}

`);
    } catch (error) {
      console.log("Error fetching all common offers:", error);
    }
  };

  const getCommonOffers = fetchAllCommonOffers();


  return <ReelAnalytics getCommonOffers={getCommonOffers} />
};

export default page;
