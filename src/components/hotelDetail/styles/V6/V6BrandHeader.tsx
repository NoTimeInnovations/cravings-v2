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

  // Subtle food-doodle watermark (line-art icons) tinted with the theme accent.
  const doodleUrl = useMemo(() => {
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='120' viewBox='0 0 150 120' fill='none' stroke='${accent}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>` +
      `<path d='M18 40h20v12a10 10 0 0 1-20 0z'/><path d='M38 42a6 6 0 0 1 0 10'/><path d='M23 34q3-5 0-10M31 34q3-5 0-10'/>` +
      `<circle cx='95' cy='24' r='9'/><path d='M86 30l9 22 9-22'/>` +
      `<path d='M20 88a18 10 0 0 1 36 0z'/><path d='M22 94h32M24 99h28'/><path d='M20 100a18 8 0 0 0 36 0'/>` +
      `<circle cx='115' cy='88' r='15'/><circle cx='115' cy='88' r='6'/>` +
      `<path d='M132 18v30M128 18v9M136 18v9M128 27h8'/><path d='M147 18v30M147 18c-4 4-4 12 0 15'/>` +
      `</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [accent]);

  return (
    <div className="relative rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.03]">
      {/* Food-doodle watermark — fills from the right, fading out toward the
          logo/name on the left (≈ half the banner). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
        style={{
          backgroundImage: doodleUrl,
          backgroundSize: "132px 106px",
          opacity: 0.1,
          WebkitMaskImage: "linear-gradient(to left, #000 0%, #000 48%, transparent 82%)",
          maskImage: "linear-gradient(to left, #000 0%, #000 48%, transparent 82%)",
        }}
      />
      {/* ===== Identity row ===== */}
      <div className="relative z-10 flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-800 ring-1 ring-black/[0.06] transition hover:bg-gray-50 active:scale-95"
          >
            <ArrowLeft className="h-[17px] w-[17px]" />
          </button>
        )}
        {/* Logo — circular with a very light neutral border + inner padding gap.
            The inner ring clips the partner-scaled logo so the border + padding
            are preserved (logo fills the inner circle, not edge-to-edge). */}
        <div
          className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-full border border-black/[0.06] p-0.5"
          style={{ background: bannerLogo.bgColor || "#ffffff" }}
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
      {footer && <div className="relative z-10 mt-2.5 border-t border-gray-100 pt-2.5">{footer}</div>}
    </div>
  );
}
