"use client";

import Image from "next/image";
import { Truck, ShoppingBag } from "lucide-react";

interface OrderTypeScreenProps {
  storeBanner?: string;
  storeName: string;
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
  hasDelivery,
  hasOrdering,
  onSelect,
  onSkip,
  onChangeLocation,
  deliveryAvailable = true,
}: OrderTypeScreenProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header with skip */}
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="w-12" />
        {storeBanner ? (
          <div className="w-16 h-16 rounded-full overflow-hidden border border-[#E5E7EB] bg-white">
            <Image
              src={storeBanner}
              alt={storeName}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold bg-[#14532D]">
            {storeName?.charAt(0) || "M"}
          </div>
        )}
        <button
          onClick={onSkip}
          className="text-sm font-semibold text-[#6B7280] hover:text-[#374151] w-12 text-right"
        >
          SKIP
        </button>
      </div>

      <div className="flex-1 px-6 pt-8">
        <h2 className="text-[#111827] font-bold text-xl text-center mb-1">
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
              className="flex items-center gap-4 border border-[#E5E7EB] rounded-xl p-4 hover:border-[#F26522]/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#FFF3EC]">
                <Truck className="w-6 h-6 text-[#F26522]" />
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
              className="flex items-center gap-4 border border-[#E5E7EB] rounded-xl p-4 hover:border-[#F26522]/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#FFF3EC]">
                <ShoppingBag className="w-6 h-6 text-[#F26522]" />
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
          <p className="text-center text-[#6B7280] text-xs mt-6">
            Delivery not available in your selected location.{" "}
            <button
              onClick={onChangeLocation}
              className="font-semibold text-[#F26522] underline"
            >
              Change Your Location
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
