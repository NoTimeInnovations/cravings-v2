"use client";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

const DefaultBannerCarousel = ({ banners, accent }: { banners: string[]; accent: string }) => {
  const items = banners.slice(0, 5);
  const count = items.length;
  const isMultiple = count > 1;
  const extended = useMemo(() => isMultiple ? [items[count - 1], ...items, items[0]] : items, [items, count, isMultiple]);
  const [index, setIndex] = useState(isMultiple ? 1 : 0);
  const [transitioning, setTransitioning] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef(0);
  const deltaX = useRef(0);
  const realIndex = isMultiple ? ((index - 1 + count) % count) : 0;

  const resetAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (!isMultiple) return;
    autoRef.current = setInterval(() => { setTransitioning(true); setIndex((p) => p + 1); }, 3500);
  }, [isMultiple]);

  useEffect(() => { resetAuto(); return () => { if (autoRef.current) clearInterval(autoRef.current); }; }, [resetAuto]);

  useEffect(() => {
    if (!isMultiple) return;
    if (index === 0 || index === count + 1) {
      const t = setTimeout(() => { setTransitioning(false); setIndex(index === 0 ? count : 1); }, 500);
      return () => clearTimeout(t);
    }
  }, [index, count, isMultiple]);

  useEffect(() => { if (!transitioning) { const t = setTimeout(() => setTransitioning(true), 50); return () => clearTimeout(t); } }, [transitioning]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: "180px" }}
      onTouchStart={isMultiple ? (e) => { touchX.current = e.touches[0].clientX; deltaX.current = 0; if (autoRef.current) clearInterval(autoRef.current); } : undefined}
      onTouchMove={isMultiple ? (e) => { deltaX.current = e.touches[0].clientX - touchX.current; if (trackRef.current) { const w = trackRef.current.parentElement?.offsetWidth || 0; trackRef.current.style.transition = "none"; trackRef.current.style.transform = `translateX(${-index * w + deltaX.current}px)`; } } : undefined}
      onTouchEnd={isMultiple ? () => { setTransitioning(true); if (trackRef.current) { trackRef.current.style.transition = ""; trackRef.current.style.transform = ""; } if (deltaX.current < -50) setIndex((p) => p + 1); else if (deltaX.current > 50) setIndex((p) => p - 1); resetAuto(); } : undefined}
    >
      <div ref={trackRef} className="flex h-full" style={{ transform: `translateX(-${index * 100}%)`, transition: transitioning ? "transform 500ms ease-in-out" : "none" }}>
        {extended.map((url, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0">
            {isVideoUrl(url) ? (
              <video src={url} poster={getVideoThumbnailUrl(url)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={url} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>
      {isMultiple && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_, idx) => (
            <button key={idx} onClick={() => { setTransitioning(true); setIndex(idx + 1); resetAuto(); }}
              className="rounded-full transition-all duration-300"
              style={{ width: realIndex === idx ? 16 : 6, height: 6, backgroundColor: realIndex === idx ? accent : "rgba(255,255,255,0.5)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HotelBanner = ({ styles, hoteldata }: { styles: Styles; hoteldata: HotelData }) => {
  const bannerMode = (hoteldata as any)?.delivery_rules?.banner_mode || "single";
  const carouselBanners: string[] = (hoteldata as any)?.delivery_rules?.carousel_banners || [];

  // Carousel mode - show full-width carousel
  if (bannerMode === "carousel" && carouselBanners.length > 0) {
    return <DefaultBannerCarousel banners={carouselBanners} accent={styles.accent || "#ea580c"} />;
  }

  // Single banner mode - original circular avatar
  const bannerSrc = hoteldata?.store_banner || "/image_placeholder.png";
  const isVideo = isVideoUrl(bannerSrc);
  const posterSrc = isVideo ? getVideoThumbnailUrl(bannerSrc) : undefined;

  return (
    <Dialog>
      <DialogTrigger>
        <div
          style={styles.border}
          className="relative h-[130px] aspect-square rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        >
          {isVideo ? (
            <video
              src={bannerSrc}
              poster={posterSrc}
              preload="metadata"
              autoPlay muted loop playsInline
              className="object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <img
              src={bannerSrc}
              alt={hoteldata?.store_name}
              className="object-cover"
              fetchPriority="high"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>
      </DialogTrigger>

      <DialogContent className="w-full max-w-4xl h-[90vh] bg-transparent border-none">
        <DialogTitle className="hidden">
          {hoteldata?.store_name}
        </DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          <DialogClose className="absolute right-4 top-4 z-10 bg-black/50 rounded-full p-2">
            <X className="text-white" size={24} />
          </DialogClose>

          {isVideo ? (
            <video
              src={bannerSrc}
              poster={posterSrc}
              preload="metadata"
              autoPlay muted loop playsInline controls
              className="object-contain"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <img
              src={bannerSrc}
              alt={hoteldata?.store_name}
              className="object-contain"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelBanner;