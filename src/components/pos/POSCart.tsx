"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExtraCharge, usePOSStore } from "@/store/posStore";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Partner, useAuthStore } from "@/store/authStore";

interface POSCartProps {
  onViewOrder: () => void;
}

export const POSCart = ({ onViewOrder }: POSCartProps) => {
  const {
    cartItems,
    totalAmount,
  } = usePOSStore();
  
  const { userData } = useAuthStore();
  const partnerData = userData as Partner;
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY === 0) {
        setIsScrolledUp(true);
      } else {
        setIsScrolledUp(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const getGstAmount = (price: number, gstPercentage: number) => {
    return (price * gstPercentage) / 100;
  };

  // Calculate totals
  const foodSubtotal = totalAmount;
  const gstAmount = getGstAmount(foodSubtotal, partnerData?.gst_percentage || 0);
  const grandTotal = foodSubtotal + gstAmount;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg transition-all duration-300 ${
        cartItems.length > 0 ? 'translate-y-0' : 'translate-y-full'
      } ${isScrolledUp ? 'pb-16' : ''}`}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            {/* price */}
            <div className="flex gap-2 text-nowrap font-extrabold text-lg sm:text-xl lg:text-2xl">
              <div>PRICE :</div>
              <div>
                {partnerData?.currency || "$"}
                {grandTotal.toFixed(2)}
              </div>
            </div>

            {/* total Items */}
            <div className="inline-flex flex-nowrap text-nowrap gap-2 font-medium text-black/50 text-sm">
              <div>Total Items :</div>
              <div>{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</div>
            </div>
          </div>

          <Button 
            onClick={() => {
              if (cartItems.length === 0) {
                toast.error("Cart is empty. Please add items before viewing the order.");
                return;
              }
              onViewOrder();
            }}
            className="bg-black hover:bg-black/90 text-white font-semibold text-sm sm:text-base flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg min-w-[140px] justify-center"
          >
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" /> 
            <span>View Order</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
