"use client";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import React, { useState, useEffect, useRef } from "react";
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
  const [current, setCurrent] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    interval.current = setInterval(() => setCurrent((p) => (p + 1) % banners.length), 3500);
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [banners.length]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: "180px" }}>
      <div className="flex transition-transform duration-500 ease-in-out h-full" style={{ transform: `translateX(-${current * 100}%)` }}>
        {banners.slice(0, 5).map((url, idx) => (
          <div key={idx} className="min-w-full h-full flex-shrink-0">
            {isVideoUrl(url) ? (
              <video src={url} poster={getVideoThumbnailUrl(url)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={url} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setCurrent(idx); if (interval.current) clearInterval(interval.current); interval.current = setInterval(() => setCurrent((p) => (p + 1) % banners.length), 3500); }}
              className="rounded-full transition-all duration-300"
              style={{ width: current === idx ? 16 : 6, height: 6, backgroundColor: current === idx ? accent : "rgba(255,255,255,0.5)" }}
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