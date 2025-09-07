import Admin from "@/screens/Admin";
import React from "react";
import { getAuthCookie } from "../auth/actions";
import { unstable_cache } from "next/cache";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getPartnerAndOffersQuery,
  getPartnerSubscriptionQuery,
} from "@/api/partners";

import { Partner } from "@/store/authStore";
import OfferLoadinPage from "@/components/OfferLoadinPage";

const page = async () => {
  const userId = (await getAuthCookie())?.id;

  if(!userId) {
    return <OfferLoadinPage message="Loading..." />
  }

  const getParnterData = unstable_cache(
    async () => {
      try {
        return fetchFromHasura(getPartnerAndOffersQuery, {
          id: userId,
          offer_types: ["delivery" , "all" , "dine_in"]
        });
      } catch (error) {
        console.error("Error fetching partner data:", error);
        return null;
      }
    },
    [userId as string, "partner-data"],
    { tags: [userId as string, "partner-data"] }
  );

  const userDataResponse = await getParnterData();
  const userData = userDataResponse?.partners[0];
  const getLastSubscription = await fetchFromHasura(
    getPartnerSubscriptionQuery,
    {
      partnerId: userId,
    }
  );

  const lastSubscription = getLastSubscription?.partner_subscriptions[0];

  if (userData?.status !== "active") {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-orange-50 to-orange-100 flex justify-center items-center">
        <div className="max-w-2xl w-full p-6 bg-white border-4 border-orange-500 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-orange-600 mb-4">
            {new Date(lastSubscription?.expiry_date) < new Date()
              ? "Hotel Subscription Expired"
              : "Hotel is currently inactive / under verification"}
          </h2>
          <p className="text-gray-900 mb-4">
            {new Date(lastSubscription?.expiry_date) < new Date()
              ? "Your subscription has expired. Please renew your subscription to continue using the services."
              : "This hotel is currently inactive / under verification. Please contact support for more information."}
            please call{" "}
            <span className="font-bold text-orange-600">+91 6238969297</span>.
          </p>
        </div>
      </div>
    );
  } else {
    return <Admin userData={userData as Partner} />;
  }
};

export default page;
