"use client";
import React, { useMemo, useState } from "react";
import { MapPin, Phone, ArrowLeft } from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { getPartnerMapsUrl } from "@/lib/getPartnerMapsUrl";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import type { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";

/**
 * V6 ("Grocery") brand + address header — a single white card at the top of the
 * home view. Top row: an optional back button, the store logo on the left of the
 * store name, and contact icons (WhatsApp + location first, then phone / Instagram
 * as fallbacks) on the right. Optional `footer` row (below a divider) hosts the
 * address / order-type selector, so the store identity and the address live in
 * ONE section instead of two duplicate cards. Logo + social-link logic mirrors
 * V3's store-identity hero so behaviour is consistent across themes.
 */

export default function V6BrandHeader({
  hoteldata,
  socialLinks,
  accent,
  onBack,
  footer,
}: {
  hoteldata: HotelData;
  socialLinks?: SocialLinks | null;
  accent: string;
  onBack?: () => void;
  footer?: React.ReactNode;
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

  const phoneHref = socialLinks?.phone ? `tel:${socialLinks.phone}` : null;
  const whatsappHref = socialLinks?.whatsapp || null;
  const instagramHref = socialLinks?.instagram || null;
  const mapHref = getPartnerMapsUrl(hoteldata);

  const iconBtn =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06] transition hover:bg-gray-50 active:scale-95";

  // Priority order — WhatsApp + location first (as requested), phone / Instagram
  // only as fallbacks when those two aren't set. Capped at 2 so the icon group
  // stays clear of the global floating language/profile badge that hovers over
  // the top-right corner.
  const contacts = [
    whatsappHref && { key: "wa", href: whatsappHref, external: true, label: "WhatsApp", icon: <FaWhatsapp size={17} style={{ color: "#25D366" }} /> },
    mapHref && { key: "map", href: mapHref, external: true, label: "Location", icon: <MapPin className="h-[17px] w-[17px]" style={{ color: accent }} /> },
    phoneHref && { key: "phone", href: phoneHref, external: false, label: "Call", icon: <Phone className="h-4 w-4 text-gray-700" /> },
    instagramHref && { key: "ig", href: instagramHref, external: true, label: "Instagram", icon: <FaInstagram size={16} className="text-gray-700" /> },
  ].filter(Boolean).slice(0, 2) as { key: string; href: string; external: boolean; label: string; icon: React.ReactNode }[];

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
      {/* Logo */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-black/5"
        style={{ background: bannerLogo.bgColor || "#ffffff" }}
      >
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

      {/* Contact icons — WhatsApp + location first, per the brand-bar request.
          mr-12 reserves the top-right corner for the global floating
          language/profile badge (fixed right-4, ~48px) so the last icon clears
          it with a small gap. */}
      {contacts.length > 0 && (
        <div className="mr-12 flex shrink-0 items-center gap-1.5">
          {contacts.map((c) => (
            <a
              key={c.key}
              href={c.href}
              aria-label={c.label}
              className={iconBtn}
              {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {c.icon}
            </a>
          ))}
        </div>
      )}
      </div>

      {/* ===== Address / order-type selector (footer) ===== */}
      {footer && <div className="mt-2.5 border-t border-gray-100 pt-2.5">{footer}</div>}
    </div>
  );
}
