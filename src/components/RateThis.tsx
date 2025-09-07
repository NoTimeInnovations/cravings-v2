"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Partner } from "@/store/authStore";
import { Styles } from "@/screens/HotelMenuPage_v2";
import HeadingWithAccent from "./HeadingWithAccent";

interface RateThisProps {
  type: "hotel" | "menuItem";
  itemId?: string;
  hotel: Partner;
  styles: Styles;
}

const hotelsWhoWant5Star = [
  {
    id: "17c053ec-4f5d-4af0-b5a8-7955ecd8f027",
    store_name: "ZAHAR AL MANDI"
  }
];

const RateThis = ({ type, hotel, styles }: RateThisProps) => {
  const { id } = useParams();
  const itemId = id || "";
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  // Check if current hotel is in the special list
  const isSpecialHotel = hotelsWhoWant5Star.some(h => h.id === hotel.id);

  useEffect(() => {
    const savedRating = localStorage?.getItem(`${type}_${itemId}_rating`);
    if (savedRating) {
      setRating(parseInt(savedRating));
      setHasRated(true);
    }
  }, [itemId, type]);

  const handleStarClick = (star: number) => {
    if (hasRated) return;

    setRating(star);
    localStorage?.setItem(`${type}_${itemId}_rating`, star.toString());
    setHasRated(true);

    // Determine if we should redirect based on hotel type
    const shouldRedirect = isSpecialHotel ? star === 5 : star >= 4;

    if (shouldRedirect) {
      setIsLoading(true);
      setTimeout(() => {
        window.open(
          hotel.place_id
            ? `https://search.google.com/local/writereview?placeid=${hotel.place_id}`
            : hotel.location,
          "_blank",
          "noopener,noreferrer"
        );
        setIsLoading(false);
        setRating(star);
      }, 2000);
    }
  };

  return (
    <div className="grid gap-5 flex-1 w-full">
      <div>
        <HeadingWithAccent
          accent={styles.accent}
          className="text-2xl font-black sm:text-4xl text-center"
        >
          Rate this {type === "hotel" ? "Business" : "Item"}
        </HeadingWithAccent>
        <p className="text-sm text-gray-500 text-center sm:text-base">
          {hasRated ? "Thanks for your rating!" : "Tell others what you think"}
          {isSpecialHotel && (
            <span className="block mt-1 text-xs">
              (Only 5-star ratings will redirect to Google Reviews)
            </span>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <p>Redirecting to Google Reviews...</p>
          {/* You can add a spinner here if you want */}
        </div>
      ) : (
        <div className="flex justify-between gap-1 sm:max-w-lg sm:mx-auto">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              disabled={hasRated}
              style={{
                color:
                  star <= (hoveredRating || rating)
                    ? styles.accent
                    : `${styles.color}`,
                transition: "color 0.2s ease-in-out",
                opacity: star <= (hoveredRating || rating) ? 1 : 0.2,
              }}
              className={`text-4xl cursor-pointer ${
                hasRated ? "cursor-default" : "cursor-pointer"
              }`}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => !hasRated && setHoveredRating(star)}
              onMouseLeave={() => !hasRated && setHoveredRating(0)}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {hasRated && (
        <p className="text-sm text-gray-500 text-center">
          {rating >= (isSpecialHotel ? 5 : 4)
            ? "Thank you for your positive rating!"
            : "Thanks for your feedback!"}
        </p>
      )}
    </div>
  );
};

export default RateThis;