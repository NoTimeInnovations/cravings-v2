"use client";

import Image from "next/image";
import { Truck, ShoppingBag, Bike, Store } from "lucide-react";

interface OrderTypeScreenProps {
  storeBanner?: string;
  storeName: string;
  themeBg?: string;
  hasDelivery: boolean;
  hasOrdering: boolean;
  onSelect: (type: "delivery" | "takeaway") => void;
  onSkip: () => void;
  onChangeLocation?: () => void;
  deliveryAvailable?: boolean;
}

export default function OrderTypeScreen({
  storeBanner,
  storeName,
  themeBg,
  hasDelivery,
  hasOrdering,
  onSelect,
  onSkip,
  onChangeLocation,
  deliveryAvailable = true,
}: OrderTypeScreenProps) {
  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: themeBg || '#14532D' }}>
      {/* Top section with logo + skip */}
      <div className="relative flex flex-col items-center justify-center px-6 pt-12 pb-8">
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-sm font-semibold text-white/80 hover:text-white"
        >
          SKIP
        </button>
        {storeBanner ? (
          <div className="w-20 h-20 rounded-[20px] overflow-hidden border-4 border-white/20 bg-white">
            <Image
              src={storeBanner}
              alt={storeName}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-[20px] flex items-center justify-center text-white text-2xl font-bold bg-[#1E6B3A]">
            {storeName?.charAt(0) || "M"}
          </div>
        )}
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-10 pb-8">
        <h2 className="text-[#111827] font-bold text-center mb-1">
          How would you like your order?
        </h2>
        <p className="text-[#6B7280] text-sm text-center mb-8">
          Pick an option to get started
        </p>

        <div className="flex flex-col gap-3">
          {/* Delivery option */}
          {hasDelivery && (
            <button
              onClick={() => onSelect("delivery")}
              className="flex items-center gap-4 border border-[#D6D6D6] rounded-xl p-4 hover:border-[#FF5301]/40 transition-colors shadow-sm shadow-black/20"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#FF5301]">
                <Bike className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[#111827] font-semibold text-base">
                  Delivery
                </p>
                <p className="text-[#9CA3AF] text-xs">
                  Delivered to your doorstep
                </p>
              </div>
            </button>
          )}

          {/* Takeaway option */}
          {hasOrdering && (
            <button
              onClick={() => onSelect("takeaway")}
              className="flex items-center gap-4 border border-[#D6D6D6] rounded-xl p-4 hover:border-[#FF5301]/40 transition-colors shadow-sm shadow-black/20"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#FF5301]">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[#111827] font-semibold text-base">
                  Takeaway
                </p>
                <p className="text-[#9CA3AF] text-xs">
                  Pick up from an outlet
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Delivery not available message */}
        {hasDelivery && !deliveryAvailable && onChangeLocation && (
          <p className="text-center text-[#6B7280] text-sm mt-8">
            Delivery not available in your selected location.
            <br />
            <button
              onClick={onChangeLocation}
              className="font-semibold text-[#FF5301] mt-1"
            >
              Change Your Location
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
