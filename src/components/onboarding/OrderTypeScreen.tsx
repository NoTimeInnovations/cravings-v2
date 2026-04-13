"use client";

import Image from "next/image";
import { Truck, ShoppingBag } from "lucide-react";

interface OrderTypeScreenProps {
  storeBanner?: string;
  storeName: string;
  accentColor: string;
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
  accentColor,
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
          <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
            <Image
              src={storeBanner}
              alt={storeName}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: accentColor }}
          >
            {storeName?.charAt(0) || "M"}
          </div>
        )}
        <button
          onClick={onSkip}
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 w-12 text-right"
        >
          SKIP
        </button>
      </div>

      <div className="flex-1 px-6 pt-8">
        <h2 className="text-gray-900 font-bold text-xl text-center mb-1">
          How would you like your order?
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          Pick an option to get started
        </p>

        <div className="flex flex-col gap-3">
          {/* Delivery option */}
          {hasDelivery && (
            <button
              onClick={() => onSelect("delivery")}
              className="flex items-center gap-4 border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Truck className="w-6 h-6" style={{ color: accentColor }} />
              </div>
              <div className="text-left">
                <p className="text-gray-900 font-semibold text-base">
                  Delivery
                </p>
                <p className="text-gray-400 text-xs">
                  Delivered to your doorstep
                </p>
              </div>
            </button>
          )}

          {/* Takeaway option */}
          {hasOrdering && (
            <button
              onClick={() => onSelect("takeaway")}
              className="flex items-center gap-4 border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <ShoppingBag className="w-6 h-6" style={{ color: accentColor }} />
              </div>
              <div className="text-left">
                <p className="text-gray-900 font-semibold text-base">
                  Takeaway
                </p>
                <p className="text-gray-400 text-xs">
                  Pick up from an outlet
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Delivery not available message */}
        {hasDelivery && !deliveryAvailable && onChangeLocation && (
          <p className="text-center text-gray-500 text-xs mt-6">
            Delivery not available in your selected location.{" "}
            <button
              onClick={onChangeLocation}
              className="font-semibold underline"
              style={{ color: accentColor }}
            >
              Change Your Location
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
