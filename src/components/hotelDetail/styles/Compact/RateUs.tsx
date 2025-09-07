"use client";

import React, { useState, useEffect } from "react";
import { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import useOrderStore from "@/store/orderStore";

const RateUs: React.FC<{ hoteldata: HotelData; socialLinks: SocialLinks }> = ({
  hoteldata,
  socialLinks,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [isMoveUp, setMoveUp] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { order , items } = useOrderStore();
  const [hasItems, setHasItems] = useState(false);

  const ratingKey = hoteldata?.id ? `rating_${hoteldata.id}` : "";

  useEffect(() => {
    if (!ratingKey) return;
    const savedRating = localStorage?.getItem(ratingKey);
    if (savedRating) {
      setRating(parseInt(savedRating, 10));
      setHasRated(true);
    }
  }, [ratingKey]);

  useEffect(() => {
    if ((items?.length ?? 0) > 0) {
      setHasItems(true);
    }else{
      setHasItems(false);
    }
  }, [items]);

  const handleStarClick = (index: number) => {
    if (hasRated || !ratingKey) return;

    const newRating = index + 1;
    setRating(newRating);
    localStorage?.setItem(ratingKey, newRating.toString());
    setHasRated(true);

    if (newRating === 5) {
      const reviewUrl =
        socialLinks?.googleReview ||
        (hoteldata?.place_id
          ? `https://search.google.com/local/writereview?placeid=${hoteldata.place_id}`
          : null);
      if (reviewUrl) {
        window.open(reviewUrl, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => {
        handleModalOpenChange(false);
      }, 500);
    } else {
      setShowThankYou(true);
      setTimeout(() => {
        handleModalOpenChange(false);
      }, 2000);
    }
  };

  const resetRatingsOnClose = () => {
    setShowThankYou(false);
    // If user has rated, keep their rating displayed, otherwise reset hover
    if (!hasRated) {
      setHoverRating(0);
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      resetRatingsOnClose();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - move drrawer down
        setMoveUp(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up -  move drawer up
        setMoveUp(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const canRate = socialLinks?.googleReview || hoteldata?.place_id || !hasRated;

  return (
    <>
      {(canRate && !hasRated) && (
        <Button
          onClick={() => handleModalOpenChange(true)}
          className={`fixed left-4 z-50 shadow-lg rounded-full transition-all duration-500 ${isMoveUp ? hasItems ? "bottom-44" : "bottom-20" : hasItems ? "bottom-28" : "bottom-4"}`}
        >
          <Star className="mr-2 h-4 w-4" /> Rate Us
        </Button>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => handleModalOpenChange(false)}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {showThankYou ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <h3 className="text-xl font-semibold">Thank you!</h3>
                <p className="text-gray-600">We appreciate your feedback.</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {hasRated ? "You have rated" : "Rate our service"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {hasRated
                      ? "Thanks for your feedback!"
                      : "Your feedback helps us improve."}
                  </p>
                </div>

                <div className="flex justify-center py-6">
                  {[...Array(5)].map((_, index) => {
                    const starValue = index + 1;
                    return (
                      <Star
                        key={index}
                        className={`h-10 w-10 transition-transform duration-200 ${
                          hasRated
                            ? "cursor-default"
                            : "cursor-pointer hover:scale-125"
                        }`}
                        fill={
                          starValue <= (hoverRating || rating)
                            ? "#FFD700"
                            : "#E5E7EB"
                        }
                        stroke={
                          starValue <= (hoverRating || rating)
                            ? "#FFD700"
                            : "#E5E7EB"
                        }
                        onClick={() => handleStarClick(index)}
                        onMouseEnter={() =>
                          !hasRated && setHoverRating(starValue)
                        }
                        onMouseLeave={() => !hasRated && setHoverRating(0)}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RateUs;
