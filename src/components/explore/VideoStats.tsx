"use client";
import React from "react";
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";
import { formatCompactNumber } from "@/utils/formatNumber";
import { useViewTracker } from "@/hooks/useViewTracker";

const VideoStats = ({ commonOffer }: { commonOffer: CommonOffer }) => {
  useViewTracker(commonOffer);
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto">
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <div className="text-orange-500 font-bold text-lg">
          {formatCompactNumber(commonOffer?.no_of_views || 0)}
        </div>
        <div className="text-gray-600 text-sm">Views</div>
      </div>
      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
        <div className="text-red-500 font-bold text-lg">
          {formatCompactNumber(commonOffer?.no_of_likes || 0)}❤
        </div>
        <div className="text-gray-600 text-sm">Likes</div>
      </div>
    </div>
  );
};

export default VideoStats;
