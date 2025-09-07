import React from "react";
import { getAuthCookie } from "../auth/actions";
import LoginPartner from "@/components/customOfferAndPormotion/LoginPartner";
import CreatePromotionForm from "@/components/customOfferAndPormotion/CreatePromotionForm";
import { CreateCustomOfferForm } from "@/components/customOfferAndPormotion/CreateCustomOfferForm";

const page = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) => {
  const cookies = await getAuthCookie();
  const type = (await searchParams)?.type;

  if (cookies?.id) {
    if (type === "offer") {
      return (
        <div className="min-h-[80vh] bg-gray-50">
          <CreateCustomOfferForm />
        </div>
      );
    } else if (type === "promotion") {
      return <CreatePromotionForm />;
    } else {
      return (
        <div className="min-h-[80dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            <a
              href="/create-offer-promotion?type=offer"
              className="w-72 h-48 flex flex-col items-center justify-center rounded-xl shadow-lg bg-orange-600 text-white hover:bg-orange-700 transition-all duration-200 cursor-pointer"
            >
              <span className="text-4xl mb-2">🎁</span>
              <span className="text-xl font-bold mb-1">Create New Offer</span>
              <span className="text-sm opacity-80">
                Special deals for your customers
              </span>
            </a>
            <a
              href="/create-offer-promotion?type=promotion"
              className="w-72 h-48 flex flex-col items-center justify-center rounded-xl shadow-lg bg-orange-600 text-white hover:bg-orange-700 transition-all duration-200 cursor-pointer"
            >
              <span className="text-4xl mb-2">📢</span>
              <span className="text-xl font-bold mb-1">Create Promotion</span>
              <span className="text-sm opacity-80">
                Promote your restaurant dishes
              </span>
            </a>
          </div>
        </div>
      );
    }
  } else {
    return <LoginPartner />;
  }
};
export default page;
