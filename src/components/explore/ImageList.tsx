"use client";
import React, { useEffect, useState } from "react";
import ImageReel from "./ImageReel";
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";
import InstaReelEmbeded from "@/components/InstaReelEmbeded";
import { Instagram, Video } from "lucide-react";
import { InstagramLogoIcon } from "@radix-ui/react-icons";

const ImageList = ({
  images,
  commonOffer,
}: {
  images: string[];
  commonOffer: CommonOffer;
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  const openReel = (index: number) => {
    setSelectedImageIndex(index);
    document.body.style.overflow = "hidden"; // Prevent background scroll
  };

  const closeReel = () => {
    setSelectedImageIndex(null);
    document.body.style.overflow = "auto"; // Restore background scroll
  };

  if (isAndroid) {
    return (
      <div className="relative">
        <div className="grid grid-cols-2 gap-2">
          <div
            key={0}
            onClick={() => openReel(0)}
            className="relative cursor-pointer aspect-[4/5] overflow-hidden rounded-lg group"
          >
            <img
              src={commonOffer.image_url}
              alt={`Thumbnail ${0 + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 blur-md brightness-75"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white text-lg font-bold ">
              <Instagram size={30} />
              View Reel
            </div>
          </div>
          {images.map((image, index) => (
            <div
              key={index + 1}
              onClick={() => openReel(index + 1)}
              className="relative cursor-pointer aspect-[4/5] overflow-hidden rounded-lg group"
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 2}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
            </div>
          ))}
        </div>

        {selectedImageIndex !== null && (
          <ImageReel
            commonOffer={commonOffer}
            images={images}
            selectedIndex={selectedImageIndex}
            onClose={closeReel}
          />
        )}
      </div>
    );
  } else {
    return null;
  }
};

export default ImageList;
