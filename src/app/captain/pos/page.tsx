import React from "react";
// import { POSMenuItems } from "@/components/pos/POSMenuItems";
// import { POSCart } from "@/components/pos/POSCart";
import Link from "next/link";
import { RiBillLine } from "react-icons/ri";
// import { PostCheckoutModal } from "@/components/admin/pos/PostCheckoutModal";
// import { EditOrderModal } from "@/components/admin/pos/EditOrderModal";
import OfferLoadinPage from "@/components/OfferLoadinPage";
import { getAuthCookie } from "@/app/auth/actions";
import { redirect } from "next/navigation";
import { getFeatures } from "@/lib/getFeatures";
// import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { CaptainPOS} from "./CaptainPOS";
import{ Captaincart} from "./Captaincart"
import AuthInitializer from "@/providers/AuthInitializer";
import { CaptainCheckoutModal } from "./CaptainCheckoutModal";
import { EditCaptainOrderModal } from "./EditCaptainOrderModal";

const Page = async () => {
  const cookies = await getAuthCookie();

  // Check if user is a captain
  if (cookies?.role !== "captain") {
    redirect("/captainlogin");
  }

  if (!cookies?.id) {
    return <OfferLoadinPage message="Loading POS..." />;
  }

  return (
    <>
      <AuthInitializer />
      <div className="container mx-auto py-8 px-4">
        <div className="flex-none p-4 border-b bg-white">
          <div className="container mx-auto">
            <div className="flex justify-between items-center">
              <h1 className="text-xl sm:text-2xl font-bold">POS System</h1>
              <Link
                href="/captain"
                className="bg-black text-white hover:text-black border-2 hover:border-black hover:bg-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 text-sm sm:text-base"
              >
                <RiBillLine className="w-4 h-4" />
                <span className="hidden sm:inline">Show Orders</span>
                <span className="sm:hidden">Orders</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="pb-[500px]">
          <CaptainPOS />
          <Captaincart />
        </div>
        <CaptainCheckoutModal />
       
      </div>
    </>
  );
};

export default Page;
