"use client";

import { Heart, Share2 } from "lucide-react";
import React, { useEffect, useRef } from "react"; // ✨ Import useRef
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { toast } from "sonner";
import { revalidateTag } from "@/app/actions/revalidate";

const SideActionButtons = ({
  commonOffer,
  user,
}: {
  commonOffer: CommonOffer;
  user: { id: string; role: string } | null;
}) => {


  const [isLiked, setIsLiked] = React.useState(
    commonOffer?.common_offers_liked_bies?.some(
      (like) => like.user_id === (user?.id || "")
    ) || false
  );

  useEffect(() => {
    setIsLiked(
      commonOffer?.common_offers_liked_bies?.some(
        (like) => like.user_id === (user?.id || "")
      ) || false
    );
  }, [commonOffer, user]);

  // ✨ Ref to store the timestamps of recent clicks
  const likeClickTimestamps = useRef<number[]>([]);

  const handleLikeToggle = async () => {
    if (!user) {
      toast.error("You must be logged in to like an offer.");
      console.error("User is not logged in.");
      return;
    }

    const originalIsLiked = isLiked;
    setIsLiked(!originalIsLiked);

    try {
      if (originalIsLiked) {
        const unlikeMutation = `
          mutation UnlikeOffer {
            delete_common_offers_liked_by(where: {
              _and: [
                { user_id: { _eq: "${user.id}" } },
                { common_offer_id: { _eq: "${commonOffer.id}" } }
              ]
            }) {
              affected_rows
            }
          }
        `;
        await fetchFromHasura(unlikeMutation);
      } else {
        const likeMutation = `
          mutation LikeOffer {
            insert_common_offers_liked_by_one(
              object: {
                user_id: "${user.id}",
                common_offer_id: "${commonOffer.id}"
              },
              on_conflict: {
                constraint: common_offers_liked_by_pkey,
                update_columns: []
              }
            ) {
              common_offer_id
            }
          }
        `;
        await fetchFromHasura(likeMutation);
      }

      await revalidateTag(commonOffer.id);
    } catch (error) {
      console.error("Failed to update like status:", error);
      setIsLiked(originalIsLiked);
    }
  };

  // ✨ New rate-limiting wrapper function
  const handleLikeClick = () => {
    const now = Date.now();
    const twoSecondsAgo = now - 2000;

    // 1. Filter out timestamps older than 2 seconds
    likeClickTimestamps.current = likeClickTimestamps.current.filter(
      (timestamp) => timestamp > twoSecondsAgo
    );

    // 2. Check if there have been 2 or more clicks in the last 2 seconds
    if (likeClickTimestamps.current.length >= 2) {
      console.warn("Rate limit exceeded for like button.");
      toast.info("You're clicking too fast!");
      return; // Block the click
    }

    // 3. Add the new timestamp and proceed with the original logic
    likeClickTimestamps.current.push(now);
    handleLikeToggle();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this offer!",
          url: `https://cravings.live/explore/${commonOffer.id}`,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      alert("Sharing is not supported on this browser.");
    }
  };

  return (
    <div className="absolute right-3 bottom-20 flex flex-col items-center pointer-events-auto z-[15] space-y-2">
      {/* Like Button */}
      <div className="flex flex-col items-center">
        <button
          onClick={handleLikeClick} // ✨ Use the new rate-limited handler
          className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors focus:outline-none"
          aria-label={isLiked ? "Unlike offer" : "Like offer"}
        >
          <Heart
            className={`w-6 h-6 transition-colors ${
              isLiked ? "text-red-500 fill-current" : "text-white"
            }`}
          />
        </button>
      </div>

      {/* Share Button */}
      <div className="flex flex-col items-center">
        <button
          onClick={handleShare}
          className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors focus:outline-none"
          aria-label="Share offer"
        >
          <Share2 className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default SideActionButtons;