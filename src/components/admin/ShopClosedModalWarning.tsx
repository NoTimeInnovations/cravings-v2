import { useAuthStore } from "@/store/authStore";
import React from "react";
import Link from "next/link";

const ShopClosedModalWarning = ({
  isShopOpen,
  hotelId,
}: {
  isShopOpen: boolean;
  hotelId: string;
}) => {
  const { userData } = useAuthStore();

  if (isShopOpen) return null;

  return (
    <>
      {/* Background overlay with blur */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[52]"></div>
      
      {/* Centered modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[54]">
        <div className="max-w-2xl w-full mx-4">
          {/* Banner with ribbon ends */}
          <div className="relative bg-red-600 text-white py-4 px-6 rounded-md shadow-xl animate-bounce">
            {/* Ribbon ends */}
            <div className="absolute -top-2 left-0 w-0 h-0 
                border-l-[15px] border-l-transparent
                border-b-[15px] border-b-red-800
                border-r-[15px] border-r-transparent">
            </div>
            <div className="absolute -top-2 right-0 w-0 h-0 
                border-l-[15px] border-l-transparent
                border-b-[15px] border-b-red-800
                border-r-[15px] border-r-transparent">
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-center">SHOP CURRENTLY CLOSED</h3>
              </div>
              <p className="mt-2 text-center">This hotel is not accepting orders at the moment</p>
              
              {userData?.id === hotelId && (
                <Link 
                  href="/profile"
                  className="mt-3 bg-white text-red-600 hover:bg-gray-100 font-semibold py-2 px-6 rounded-full shadow-md transition-all duration-200 transform hover:scale-105"
                >
                  Open My Hotel
                </Link>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopClosedModalWarning;