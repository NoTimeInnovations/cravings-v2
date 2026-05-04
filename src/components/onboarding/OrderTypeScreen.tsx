"use client";

import { useState, useEffect } from "react";
import { Bike, Store, Clock, ChevronLeft } from "lucide-react";
import { isWithinTimeWindow, formatTime12h } from "@/lib/isWithinTimeWindow";

interface OrderTypeScreenProps {
  storeBanner?: string;
  storeName: string;
  themeBg?: string;
  hasDelivery: boolean;
  hasOrdering: boolean;
  onSelect: (type: "delivery" | "takeaway") => void;
  onSkip: () => void;
  onBack?: () => void;
  onChangeLocation?: () => void;
  deliveryAvailable?: boolean;
  isDeliveryActive?: boolean;
  takeawayTimeAllowed?: { from: string; to: string } | null;
  deliveryTimeAllowed?: { from: string; to: string } | null;
  initialDeliveryOpen?: boolean;
  initialTakeawayOpen?: boolean;
  hotelTimezone?: string;
  accent?: string;
}

export default function OrderTypeScreen({
  hasDelivery,
  hasOrdering,
  onSelect,
  onSkip,
  onBack,
  onChangeLocation,
  deliveryAvailable = true,
  isDeliveryActive = true,
  takeawayTimeAllowed,
  deliveryTimeAllowed,
  initialDeliveryOpen,
  initialTakeawayOpen,
  hotelTimezone,
  accent = "#1f2937",
}: OrderTypeScreenProps) {
  // Server pre-computes open state in the hotel's timezone and passes it via
  // initial props — first render matches SSR (no hydration mismatch). The
  // effect below re-runs the check on the client so the state stays correct
  // if the user keeps the screen open across a window boundary.
  const [isTakeawayOpen, setIsTakeawayOpen] = useState(
    initialTakeawayOpen ?? true,
  );
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(
    initialDeliveryOpen ?? true,
  );
  const [mode, setMode] = useState<"delivery" | "takeaway">(
    hasDelivery && (initialDeliveryOpen ?? true) ? "delivery" : "takeaway",
  );

  useEffect(() => {
    const takeawayOpen = isWithinTimeWindow(takeawayTimeAllowed, hotelTimezone);
    const deliveryOpen =
      isDeliveryActive && isWithinTimeWindow(deliveryTimeAllowed, hotelTimezone);
    setIsTakeawayOpen(takeawayOpen);
    setIsDeliveryOpen(deliveryOpen);
    setMode((prev) => {
      if (prev === "delivery" && !deliveryOpen && takeawayOpen) return "takeaway";
      if (prev === "takeaway" && !takeawayOpen && deliveryOpen) return "delivery";
      return prev;
    });
  }, [takeawayTimeAllowed, deliveryTimeAllowed, isDeliveryActive, hotelTimezone]);

  return (
    <div className="flex flex-col min-h-dvh bg-white pt-[60px] lg:pt-16 mx-auto w-full md:max-w-md relative" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-3 px-4 py-3.5 lg:max-w-md lg:mx-auto">
          <button
            onClick={onBack || onSkip}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition active:opacity-60"
          >
            <ChevronLeft className="w-[18px] h-[18px] text-gray-900" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
       <div className="px-6 lg:max-w-md lg:mx-auto">
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-gray-900">
          How would you like your order?
        </h1>
        <p className="mt-2.5 text-sm text-gray-500">
          You can change this anytime.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          {/* Delivery */}
          {hasDelivery && (
            <button
              onClick={() => {
                if (!isDeliveryOpen) return;
                setMode("delivery");
              }}
              disabled={!isDeliveryOpen}
              className={`w-full p-[18px] rounded-[18px] cursor-pointer bg-white flex items-center gap-3.5 transition-all duration-150 ${
                !isDeliveryOpen
                  ? "opacity-50 cursor-not-allowed border-[1.5px] border-gray-200"
                  : mode === "delivery"
                    ? "border-[1.5px] shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                    : "border-[1.5px] border-gray-200 shadow-sm"
              }`}
              style={mode === "delivery" && isDeliveryOpen ? { borderColor: accent } : undefined}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                !isDeliveryOpen ? "bg-gray-200" : mode === "delivery" ? "" : "bg-gray-100"
              }`} style={mode === "delivery" && isDeliveryOpen ? { backgroundColor: accent } : undefined}>
                <Bike className="w-[22px] h-[22px]" style={{ color: mode === "delivery" && isDeliveryOpen ? "#fff" : "#111827" }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-gray-900 tracking-tight">Delivery</p>
                <p className="text-[13px] text-gray-500 mt-0.5">Delivered to your doorstep</p>
                {!isDeliveryOpen && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {!isDeliveryActive
                      ? "Currently unavailable"
                      : deliveryTimeAllowed
                        ? `Available ${formatTime12h(deliveryTimeAllowed.from)} - ${formatTime12h(deliveryTimeAllowed.to)}`
                        : "Currently unavailable"}
                  </p>
                )}
              </div>
              <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center bg-white shrink-0 ${
                mode === "delivery" && isDeliveryOpen ? "" : "border-gray-300"
              }`} style={mode === "delivery" && isDeliveryOpen ? { borderColor: accent } : undefined}>
                {mode === "delivery" && isDeliveryOpen && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                )}
              </div>
            </button>
          )}

          {/* Takeaway */}
          {hasOrdering && (
            <button
              onClick={() => {
                if (!isTakeawayOpen) return;
                setMode("takeaway");
              }}
              disabled={!isTakeawayOpen}
              className={`w-full p-[18px] rounded-[18px] cursor-pointer bg-white flex items-center gap-3.5 transition-all duration-150 ${
                !isTakeawayOpen
                  ? "opacity-50 cursor-not-allowed border-[1.5px] border-gray-200"
                  : mode === "takeaway"
                    ? "border-[1.5px] shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                    : "border-[1.5px] border-gray-200 shadow-sm"
              }`}
              style={mode === "takeaway" && isTakeawayOpen ? { borderColor: accent } : undefined}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                !isTakeawayOpen ? "bg-gray-200" : mode === "takeaway" ? "" : "bg-gray-100"
              }`} style={mode === "takeaway" && isTakeawayOpen ? { backgroundColor: accent } : undefined}>
                <Store className="w-[22px] h-[22px]" style={{ color: mode === "takeaway" && isTakeawayOpen ? "#fff" : "#111827" }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-gray-900 tracking-tight">Takeaway</p>
                <p className="text-[13px] text-gray-500 mt-0.5">Pick up from an outlet</p>
                {!isTakeawayOpen && takeawayTimeAllowed && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Available {formatTime12h(takeawayTimeAllowed.from)} - {formatTime12h(takeawayTimeAllowed.to)}
                  </p>
                )}
              </div>
              <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center bg-white shrink-0 ${
                mode === "takeaway" && isTakeawayOpen ? "" : "border-gray-300"
              }`} style={mode === "takeaway" && isTakeawayOpen ? { borderColor: accent } : undefined}>
                {mode === "takeaway" && isTakeawayOpen && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                )}
              </div>
            </button>
          )}
        </div>

        {/* Change location */}
        {hasDelivery && !deliveryAvailable && onChangeLocation && (
          <p className="text-center text-gray-500 text-sm mt-8">
            Delivery not available here.{" "}
            <button onClick={onChangeLocation} className="font-semibold text-gray-900">
              Change location
            </button>
          </p>
        )}
       </div>
      </div>

      {/* Sticky CTA */}
      <div className="absolute left-0 right-0 bottom-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30">
       <div className="px-4 pt-3.5 pb-8 lg:max-w-md lg:mx-auto">
        {(!isDeliveryOpen || !hasDelivery) && (!isTakeawayOpen || !hasOrdering) ? (
          <button
            onClick={onSkip}
            className="w-full h-[52px] rounded-[14px] text-white font-semibold text-base flex items-center justify-center transition active:scale-[0.98]"
            style={{ backgroundColor: accent }}
          >
            Explore Menu
          </button>
        ) : (
          <button
            onClick={() => onSelect(mode)}
            disabled={
              (mode === "delivery" && !isDeliveryOpen) ||
              (mode === "takeaway" && !isTakeawayOpen)
            }
            className="w-full h-[52px] rounded-[14px] text-white font-semibold text-base flex items-center justify-center transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            Continue with {mode === "delivery" ? "Delivery" : "Takeaway"}
          </button>
        )}
       </div>
      </div>
    </div>
  );
}
