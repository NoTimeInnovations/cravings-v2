"use client";

import { useState, useEffect } from "react";
import { Bike, Store, Clock, ChevronLeft, Utensils, Phone, MapPin, Star } from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { isWithinTimeWindow, formatTime12h } from "@/lib/isWithinTimeWindow";
import { DEFAULT_BRAND_COLOR_HEX } from "@/lib/brandColor";

interface OrderTypeScreenProps {
  storeBanner?: string;
  storeName: string;
  themeBg?: string;
  hasDelivery: boolean;
  hasOrdering: boolean;
  /** Dine-in table reservation available (order-type enabled + prebooking feature on). */
  hasDineIn?: boolean;
  onSelect: (type: "delivery" | "takeaway" | "dine_in") => void;
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
  /** Store identity shown at the top (logo/name passed via storeBanner/storeName). */
  locationText?: string;
  socialLinks?: { phone?: string; whatsapp?: string; instagram?: string; googleReview?: string } | null;
  mapHref?: string | null;
}

export default function OrderTypeScreen({
  hasDelivery,
  hasOrdering,
  hasDineIn = false,
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
  accent = DEFAULT_BRAND_COLOR_HEX,
  storeBanner,
  storeName,
  locationText,
  socialLinks,
  mapHref,
}: OrderTypeScreenProps) {
  const phoneHref = socialLinks?.phone ? `tel:${socialLinks.phone}` : null;
  const whatsappHref = socialLinks?.whatsapp || null;
  const instagramHref = socialLinks?.instagram || null;
  const reviewHref = socialLinks?.googleReview || null;
  const hasContacts = !!(phoneHref || whatsappHref || mapHref || instagramHref || reviewHref);
  const heroGradient = `linear-gradient(160deg, ${accent} 0%, color-mix(in srgb, ${accent} 72%, #000) 100%)`;
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
  const pickDefault = (): "delivery" | "takeaway" | "dine_in" => {
    if (hasDelivery && (initialDeliveryOpen ?? true)) return "delivery";
    if (hasOrdering && (initialTakeawayOpen ?? true)) return "takeaway";
    if (hasDineIn) return "dine_in";
    return "delivery";
  };
  const [mode, setMode] = useState<"delivery" | "takeaway" | "dine_in">(pickDefault());

  useEffect(() => {
    const takeawayOpen = isWithinTimeWindow(takeawayTimeAllowed, hotelTimezone);
    const deliveryOpen =
      isDeliveryActive && isWithinTimeWindow(deliveryTimeAllowed, hotelTimezone);
    setIsTakeawayOpen(takeawayOpen);
    setIsDeliveryOpen(deliveryOpen);
    setMode((prev) => {
      // Dine-in is always selectable (slot validity is handled at checkout).
      const selectable =
        prev === "delivery" ? hasDelivery && deliveryOpen
        : prev === "takeaway" ? hasOrdering && takeawayOpen
        : hasDineIn;
      if (selectable) return prev;
      if (hasDelivery && deliveryOpen) return "delivery";
      if (hasOrdering && takeawayOpen) return "takeaway";
      if (hasDineIn) return "dine_in";
      return prev;
    });
  }, [takeawayTimeAllowed, deliveryTimeAllowed, isDeliveryActive, hotelTimezone, hasDelivery, hasOrdering, hasDineIn]);

  return (
    <div className="relative flex min-h-dvh flex-col mx-auto w-full md:max-w-md" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: heroGradient }}>
      {/* Branded hero header */}
      <div className="relative px-6 pt-[40px] pb-8 text-white">
        <button
          onClick={onBack || onSkip}
          className="absolute left-5 top-[36px] flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition active:opacity-70"
        >
          <ChevronLeft className="h-[18px] w-[18px] text-gray-900" />
        </button>

        <div className="mt-5 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-white shadow-md">
            {storeBanner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storeBanner} alt={storeName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl text-white">🍽️</span>
            )}
          </div>
          {storeName && <h2 className="mt-2.5 text-lg font-bold tracking-tight">{storeName}</h2>}
          {locationText && <p className="mt-0.5 text-[13px] text-white/70">{locationText}</p>}

          {hasContacts && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {phoneHref && (
                <a href={phoneHref} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 transition active:scale-95">
                  <Phone className="h-4 w-4 text-white" />
                </a>
              )}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 transition active:scale-95">
                  <FaWhatsapp size={16} className="text-white" />
                </a>
              )}
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 transition active:scale-95">
                  <MapPin className="h-4 w-4 text-white" />
                </a>
              )}
              {instagramHref && (
                <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 transition active:scale-95">
                  <FaInstagram size={16} className="text-white" />
                </a>
              )}
              {reviewHref && (
                <a href={reviewHref} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 transition active:scale-95">
                  <Star className="h-4 w-4 text-white" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* White content sheet */}
      <div className="relative z-[1] -mt-5 flex-1 rounded-t-[28px] bg-white px-6 pt-5 pb-[112px] shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight text-gray-900">
          How would you like your order?
        </h1>
        <p className="mt-1.5 text-[13px] text-gray-500">
          You can change this anytime.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {/* Delivery */}
          {hasDelivery && (
            <button
              onClick={() => {
                if (!isDeliveryOpen) return;
                setMode("delivery");
              }}
              disabled={!isDeliveryOpen}
              className={`w-full p-3.5 rounded-2xl cursor-pointer bg-white flex items-center gap-3 transition-all duration-150 ${
                !isDeliveryOpen
                  ? "opacity-50 cursor-not-allowed border-[1.5px] border-gray-200"
                  : mode === "delivery"
                    ? "border-[1.5px] shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                    : "border-[1.5px] border-gray-200 shadow-sm"
              }`}
              style={mode === "delivery" && isDeliveryOpen ? { borderColor: accent } : undefined}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                !isDeliveryOpen ? "bg-gray-200" : mode === "delivery" ? "" : "bg-gray-100"
              }`} style={mode === "delivery" && isDeliveryOpen ? { backgroundColor: accent } : undefined}>
                <Bike className="w-5 h-5" style={{ color: mode === "delivery" && isDeliveryOpen ? "#fff" : "#111827" }} />
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
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white shrink-0 ${
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
              className={`w-full p-3.5 rounded-2xl cursor-pointer bg-white flex items-center gap-3 transition-all duration-150 ${
                !isTakeawayOpen
                  ? "opacity-50 cursor-not-allowed border-[1.5px] border-gray-200"
                  : mode === "takeaway"
                    ? "border-[1.5px] shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                    : "border-[1.5px] border-gray-200 shadow-sm"
              }`}
              style={mode === "takeaway" && isTakeawayOpen ? { borderColor: accent } : undefined}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                !isTakeawayOpen ? "bg-gray-200" : mode === "takeaway" ? "" : "bg-gray-100"
              }`} style={mode === "takeaway" && isTakeawayOpen ? { backgroundColor: accent } : undefined}>
                <Store className="w-5 h-5" style={{ color: mode === "takeaway" && isTakeawayOpen ? "#fff" : "#111827" }} />
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
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white shrink-0 ${
                mode === "takeaway" && isTakeawayOpen ? "" : "border-gray-300"
              }`} style={mode === "takeaway" && isTakeawayOpen ? { borderColor: accent } : undefined}>
                {mode === "takeaway" && isTakeawayOpen && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                )}
              </div>
            </button>
          )}

          {/* Dine-in (table reservation) */}
          {hasDineIn && (
            <button
              onClick={() => setMode("dine_in")}
              className={`w-full p-3.5 rounded-2xl cursor-pointer bg-white flex items-center gap-3 transition-all duration-150 ${
                mode === "dine_in"
                  ? "border-[1.5px] shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                  : "border-[1.5px] border-gray-200 shadow-sm"
              }`}
              style={mode === "dine_in" ? { borderColor: accent } : undefined}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                mode === "dine_in" ? "" : "bg-gray-100"
              }`} style={mode === "dine_in" ? { backgroundColor: accent } : undefined}>
                <Utensils className="w-5 h-5" style={{ color: mode === "dine_in" ? "#fff" : "#111827" }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-gray-900 tracking-tight">Dine-in</p>
                <p className="text-[13px] text-gray-500 mt-0.5">Book a table for later</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white shrink-0 ${
                mode === "dine_in" ? "" : "border-gray-300"
              }`} style={mode === "dine_in" ? { borderColor: accent } : undefined}>
                {mode === "dine_in" && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                )}
              </div>
            </button>
          )}
        </div>

        {/* Change location */}
        {hasDelivery && !deliveryAvailable && onChangeLocation && (
          <p className="text-center text-gray-500 text-sm mt-6">
            Delivery not available here.{" "}
            <button onClick={onChangeLocation} className="font-semibold text-gray-900">
              Change location
            </button>
          </p>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="absolute left-0 right-0 bottom-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30">
       <div className="px-4 pt-3 pb-5 lg:max-w-md lg:mx-auto">
        {(!isDeliveryOpen || !hasDelivery) && (!isTakeawayOpen || !hasOrdering) && !hasDineIn ? (
          <button
            onClick={onSkip}
            className="w-full h-[48px] rounded-[14px] text-white font-semibold text-base flex items-center justify-center transition active:scale-[0.98]"
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
            className="w-full h-[48px] rounded-[14px] text-white font-semibold text-base flex items-center justify-center transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            Continue with {mode === "delivery" ? "Delivery" : mode === "takeaway" ? "Takeaway" : "Dine-in"}
          </button>
        )}
       </div>
      </div>
    </div>
  );
}
