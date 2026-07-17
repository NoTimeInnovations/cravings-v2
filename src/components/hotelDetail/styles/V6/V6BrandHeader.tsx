"use client";
import React, { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import type { HotelData } from "@/app/hotels/[...id]/page";

/**
 * V6 ("Grocery") brand + address header — a single white card at the top of the
 * home view. Top row: an optional back button, the store logo on the left of the
 * store name, and a trailing icon cluster (`extraIcon` — the search + language
 * controls). Optional `footer` row (below a divider) hosts the address /
 * order-type selector, so the store identity and the address live in ONE section
 * instead of two duplicate cards. Logo logic mirrors V3's store-identity hero.
 */

export default function V6BrandHeader({
  hoteldata,
  accent,
  onBack,
  footer,
  extraIcon,
}: {
  hoteldata: HotelData;
  /** Theme accent — used for the circular logo border. */
  accent: string;
  onBack?: () => void;
  footer?: React.ReactNode;
  /** Trailing icon cluster on the identity row (search + language switcher). */
  extraIcon?: React.ReactNode;
}) {
  const storeBanner = hoteldata?.store_banner as string | undefined;
  const [bannerError, setBannerError] = useState(false);
  const showBanner = !!storeBanner && !bannerError;

  // bannerLogo scale/bg come from storefront_settings.bannerLogo (same as V3).
  const bannerLogo = useMemo(() => {
    const raw = (hoteldata as any)?.storefront_settings;
    let parsed: any = null;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      parsed = null;
    }
    const bl = parsed?.bannerLogo;
    const rawScale = typeof bl?.scale === "number" ? bl.scale : 100;
    const scale = Math.min(5, Math.max(0.5, rawScale / 100));
    const bgColor = typeof bl?.bgColor === "string" && bl.bgColor ? bl.bgColor : null;
    return { scale, bgColor };
  }, [(hoteldata as any)?.storefront_settings]);

  const subtitle =
    (hoteldata as any)?.store_tagline ||
    (hoteldata as any)?.location_details ||
    (hoteldata as any)?.district ||
    (hoteldata as any)?.country ||
    "";

  return (
    <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.03]">
      {/* ===== Identity row ===== */}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-800 ring-1 ring-black/[0.06] transition hover:bg-gray-50 active:scale-95"
          >
            <ArrowLeft className="h-[17px] w-[17px]" />
          </button>
        )}
        {/* Logo — circular with a theme-colored border and an inner white
            padding gap. The inner ring clips the partner-scaled logo so the
            border + padding are always preserved (logo fills the inner circle,
            not edge-to-edge against the border). */}
        <div
          className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-full border-[1.5px] p-0.5"
          style={{ borderColor: accent, background: bannerLogo.bgColor || "#ffffff" }}
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
            {showBanner ? (
              isVideoUrl(storeBanner as string) ? (
                <video
                  src={storeBanner}
                  poster={getVideoThumbnailUrl(storeBanner as string)}
                  preload="metadata"
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                  style={{ transform: `scale(${bannerLogo.scale})` }}
                />
              ) : (
                <img
                  src={storeBanner}
                  alt={hoteldata?.store_name}
                  className="h-full w-full object-contain"
                  style={{ transform: `scale(${bannerLogo.scale})` }}
                  onError={() => setBannerError(true)}
                />
              )
            ) : (
              <span className="text-xl">🍽️</span>
            )}
          </div>
        </div>

        {/* Store name + subtitle */}
        <div className="min-w-0 flex-1">
          <h1 translate="no" className="notranslate truncate text-[15px] font-extrabold tracking-tight text-gray-900">
            {hoteldata?.store_name}
          </h1>
          {subtitle && <p className="truncate text-[11px] font-medium text-gray-400">{subtitle}</p>}
        </div>

        {/* Trailing controls — search + language switcher. */}
        {extraIcon && <div className="flex shrink-0 items-center gap-1.5">{extraIcon}</div>}
      </div>

      {/* ===== Address / order-type selector (footer) ===== */}
      {footer && <div className="mt-2.5 border-t border-gray-100 pt-2.5">{footer}</div>}
    </div>
  );
}
