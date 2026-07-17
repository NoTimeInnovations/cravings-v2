"use client";
import React, { useState } from "react";
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
  onBack,
  footer,
  extraIcon,
}: {
  hoteldata: HotelData;
  onBack?: () => void;
  footer?: React.ReactNode;
  /** Trailing icon cluster on the identity row (search + language switcher). */
  extraIcon?: React.ReactNode;
}) {
  const storeBanner = hoteldata?.store_banner as string | undefined;
  const [bannerError, setBannerError] = useState(false);
  const showBanner = !!storeBanner && !bannerError;

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
        {/* Logo — shown in full (no border / rounding / crop). Fixed compact
            height with auto width so the logo keeps its aspect ratio (wide logos
            get wider, not a taller header). */}
        <div className="flex h-[52px] shrink-0 items-center justify-center">
          {showBanner ? (
            isVideoUrl(storeBanner as string) ? (
              <video
                src={storeBanner}
                poster={getVideoThumbnailUrl(storeBanner as string)}
                preload="metadata"
                muted
                playsInline
                className="h-full w-auto max-w-[130px] object-contain"
              />
            ) : (
              <img
                src={storeBanner}
                alt={hoteldata?.store_name}
                className="h-full w-auto max-w-[130px] object-contain"
                onError={() => setBannerError(true)}
              />
            )
          ) : (
            <span className="text-2xl">🍽️</span>
          )}
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
