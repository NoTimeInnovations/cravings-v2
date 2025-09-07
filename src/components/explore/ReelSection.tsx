"use client";

import React, { useState, useMemo } from "react";
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";
import InstaReelEmbed from "../InstaReelEmbeded";
import SideActionButtons from "./SideActionButtons";
import ScrollDownIndicator from "./ScrollDownIndicator";
import VideoStats from "./VideoStats";

// A simple SVG component for the navigation arrows
const ArrowIcon = ({
  direction = "left",
}: {
  direction?: "left" | "right";
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d={direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
    />
  </svg>
);

const ReelSection = ({
  decrypted,
  allOfferReels,
  setCurrentIndex,
  currentIndex = 0,
}: {
  decrypted: { id: string; role: string } | null;
  allOfferReels: CommonOffer[];
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  currentIndex: number;
}) => {
  const currentOffer = allOfferReels[currentIndex];

  const nextReel = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === allOfferReels.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevReel = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? allOfferReels.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className="lg:col-span-5 xl:col-span-4">
      <div className="sticky top-8">
        <div className="relative">
          <div className="relative">
            {/* Reel Container */}
            <div className="relative w-full max-w-[245px] mx-auto h-[400px] bg-black rounded-3xl overflow-hidden shadow-xl">
              {/* Carousel Track */}
              <div
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {allOfferReels.map((offer, index) => (
                  <div key={offer.id} className="w-full h-full flex-shrink-0">
                    {index === currentIndex ? (
                      <InstaReelEmbed
                        // By adding a key, React will re-mount the component on change,
                        // making it 'autoplay-ready' for the user to tap.
                        key={offer.id} 
                        image={offer.image_url}
                        url={offer.insta_link as string}
                      />
                    ) : (
                      <img
                        src={offer.image_url}
                        alt="Reel thumbnail"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Reel UI Overlay (actions for the current reel) */}
              <div className="absolute inset-0 pointer-events-none">
                <SideActionButtons
                  commonOffer={currentOffer}
                  user={decrypted}
                />
              </div>
            </div>

            {/* Navigation Arrows */}
            {allOfferReels.length > 1 && (
              <>
                <button
                  onClick={prevReel}
                  className="absolute left-0 top-1/2 z-10 p-1 -translate-y-1/2 bg-black bg-opacity-40 hover:bg-opacity-60 rounded-full text-white transition-opacity"
                  aria-label="Previous reel"
                >
                  <ArrowIcon direction="left" />
                </button>
                <button
                  onClick={nextReel}
                  className="absolute right-0 top-1/2 z-10 p-1 -translate-y-1/2 bg-black bg-opacity-40 hover:bg-opacity-60 rounded-full text-white transition-opacity"
                  aria-label="Next reel"
                >
                  <ArrowIcon direction="right" />
                </button>
              </>
            )}
          </div>

          <ScrollDownIndicator />

          {/* Video Stats (for the current reel) */}
          <VideoStats commonOffer={currentOffer} />
        </div>
      </div>
    </div>
  );
};

export default ReelSection;