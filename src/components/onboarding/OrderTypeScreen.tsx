"use client";

import Image from "next/image";
import { Bike, Store, Clock } from "lucide-react";
import { isWithinTimeWindow, formatTime12h } from "@/lib/isWithinTimeWindow";

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
  isDeliveryActive?: boolean;
  takeawayTimeAllowed?: { from: string; to: string } | null;
  deliveryTimeAllowed?: { from: string; to: string } | null;
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
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
  isDeliveryActive = true,
  takeawayTimeAllowed,
  deliveryTimeAllowed,
}: OrderTypeScreenProps) {
  const isTakeawayOpen = isWithinTimeWindow(takeawayTimeAllowed);
  const isDeliveryOpen = isDeliveryActive && isWithinTimeWindow(deliveryTimeAllowed);
  const lightBg = isLightColor(themeBg || "#14532D");

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: themeBg || '#14532D' }}>
      {/* Top section — logo + image (same as login) */}
      <div className="relative flex-1 min-h-[250px]">
        {/* Logo + Store name */}
        <div className="absolute top-0 left-0 right-0 bottom-1/2 flex flex-col items-center justify-center px-6 z-10 gap-3">
          {storeBanner ? (
            <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 bg-white shadow-lg ${lightBg ? "border-black/20" : "border-white/20"}`}>
              <Image
                src={storeBanner}
                alt={storeName}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${lightBg ? "bg-black/10 text-black" : "bg-white/10 text-white"}`}>
              {storeName?.charAt(0) || "M"}
            </div>
          )}
          <h1 className={`text-xl font-black leading-tight text-center ${lightBg ? "text-black" : "text-white"}`}>
            How would you like your order?
          </h1>
        </div>

        {/* Hero image — anchored to bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-[2]">
          <Image
            src="/loginscreenimage.png"
            alt="Food"
            width={600}
            height={400}
            className="w-full object-cover"
          />
        </div>
      </div>

      {/* Bottom white card */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 z-10 relative -mt-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[#6B7280] text-sm font-medium">
            Pick an option to get started
          </p>
          <button
            onClick={onSkip}
            className="text-xs font-semibold text-[#9CA3AF] hover:text-[#6B7280]"
          >
            SKIP
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Delivery option */}
          {hasDelivery && (
            <button
              onClick={() => isDeliveryOpen && onSelect("delivery")}
              disabled={!isDeliveryOpen}
              className={`flex items-center gap-4 border rounded-xl p-4 transition-colors shadow-sm shadow-black/20 ${
                !isDeliveryOpen
                  ? "border-gray-200 opacity-50 cursor-not-allowed"
                  : "border-[#D6D6D6] hover:border-[#FF5301]/40"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${!isDeliveryOpen ? "bg-gray-400" : "bg-[#FF5301]"}`}>
                <Bike className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[#111827] font-semibold text-base">
                  Delivery
                </p>
                <p className="text-[#9CA3AF] text-xs">
                  Delivered to your doorstep
                </p>
                {!isDeliveryOpen && (
                  <p className="text-[#EF4444] text-xs mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {!isDeliveryActive
                      ? "Delivery is currently unavailable"
                      : deliveryTimeAllowed
                        ? `Available ${formatTime12h(deliveryTimeAllowed.from)} - ${formatTime12h(deliveryTimeAllowed.to)}`
                        : "Currently unavailable"}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Takeaway option */}
          {hasOrdering && (
            <button
              onClick={() => isTakeawayOpen && onSelect("takeaway")}
              disabled={!isTakeawayOpen}
              className={`flex items-center gap-4 border rounded-xl p-4 transition-colors shadow-sm shadow-black/20 ${
                !isTakeawayOpen
                  ? "border-gray-200 opacity-50 cursor-not-allowed"
                  : "border-[#D6D6D6] hover:border-[#FF5301]/40"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${!isTakeawayOpen ? "bg-gray-400" : "bg-[#FF5301]"}`}>
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[#111827] font-semibold text-base">
                  Takeaway
                </p>
                <p className="text-[#9CA3AF] text-xs">
                  Pick up from an outlet
                </p>
                {!isTakeawayOpen && takeawayTimeAllowed && (
                  <p className="text-[#EF4444] text-xs mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Available {formatTime12h(takeawayTimeAllowed.from)} - {formatTime12h(takeawayTimeAllowed.to)}
                  </p>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Delivery not available message */}
        {hasDelivery && !deliveryAvailable && onChangeLocation && (
          <p className="text-center text-[#6B7280] text-sm mt-6">
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
