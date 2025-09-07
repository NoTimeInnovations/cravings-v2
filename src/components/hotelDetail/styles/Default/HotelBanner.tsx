"use client";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import React from "react";
import Img from "@/components/Img";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

const HotelBanner = ({ styles, hoteldata }: { styles: Styles; hoteldata: HotelData }) => {
  return (
    <Dialog>
      <DialogTrigger>
        <div
          style={styles.border}
          className="relative h-[130px] aspect-square rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        >
          <Img
            src={hoteldata?.store_banner || "/image_placeholder.png"}
            alt={hoteldata?.store_name}
            className="w-full h-full object-cover"
          />
        </div>
      </DialogTrigger>
      
      <DialogContent className="w-full max-w-4xl h-[90vh] bg-transparent border-none">
        <DialogTitle className="hidden">
          {hoteldata?.store_name}
        </DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close button */}
          <DialogClose className="absolute right-4 top-4 z-10 bg-black/50 rounded-full p-2">
            <X className="text-white" size={24} />
          </DialogClose>
          
          {/* Full-size image */}
          <Img
            src={hoteldata?.store_banner || "/image_placeholder.png"}
            alt={hoteldata?.store_name}
            className="w-full h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelBanner;