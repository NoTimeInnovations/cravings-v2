// src/components/ImageReel.tsx
import React, { useEffect, useRef, useState } from "react";
import { CloseIcon, LikeIcon, ShareIcon } from "./Icons";
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";
import InstaReelEmbed from "../InstaReelEmbeded";

const ImageReel = ({
  commonOffer,
  images,
  selectedIndex,
  onClose,
}: {
  commonOffer: CommonOffer;
  images: string[];
  selectedIndex: number;
  onClose: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Effect to handle scroll and update the current index
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const handleScroll = () => {
        const newIndex = Math.round(
          container.scrollLeft / container.clientWidth
        );
        setCurrentIndex(newIndex);
      };
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // Effect to scroll to the correct image when the component opens
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollLeft = selectedIndex * container.clientWidth;
    }
  }, [selectedIndex]);

  const handleShare = async (url: string) => {
    try {
      await navigator.share({ title: "Check out this image!", url });
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Sharing is not supported on this browser.");
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex flex-col items-center justify-center bg-black bg-opacity-90">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white"
      >
        <CloseIcon className="h-8 w-8" />
      </button>
      {/* Main horizontal scrolling container */}
      <div
        ref={scrollContainerRef}
        className="h-full w-full flex snap-x snap-mandatory overflow-x-scroll scrollbar-hide"
      >
        <div
          key={0}
          className="relative h-full w-full flex-shrink-0 snap-center flex items-center justify-center"
        >
          <InstaReelEmbed
            image={commonOffer.image_url}
            url={commonOffer.insta_link as string}
          />
        </div>
        {images.map((image, index) => {
          return (
            <div
              key={index + 1}
              className="relative h-full w-full flex-shrink-0 snap-center flex items-center justify-center"
            >
              <img
                src={image}
                alt={`Reel image ${index + 1}`}
                className="max-h-full max-w-full object-contain"
              />
              {/* <div className="absolute bottom-10 right-4 flex flex-col items-center space-y-6 text-white">
              <button>
                <LikeIcon className="h-8 w-8" />
              </button>
              <button onClick={() => handleShare(image)}>
                <ShareIcon className="h-8 w-8" />
              </button>
            </div> */}
            </div>
          );
        })}
      </div>
      {/* Pagination dots indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <div
            key={`dot-${index}`}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              currentIndex === index ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageReel;
