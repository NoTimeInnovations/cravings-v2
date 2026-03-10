"use client";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import React from "react";
import { isVideoUrl } from "@/lib/mediaUtils";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

const HotelBanner = ({ styles, hoteldata }: { styles: Styles; hoteldata: HotelData }) => {
  const bannerSrc = hoteldata?.store_banner || "/image_placeholder.png";
  const isVideo = isVideoUrl(bannerSrc);

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