"use client";
import React from "react";
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

const ShareExploreItemBtn = ({ offer }: { offer: CommonOffer }) => {
  const handleShare = async () => {
    try {
      const message = `*🚨 KIDILAN FOOD SPOT ALERT 🚨*\n\n🎉 *${offer.partner_name}* is offering *${offer.item_name}*${offer.price > 0 ? ` at *₹${offer.price}*!` : ''} 🌟\n\n🔗 View offer: https://www.cravings.live/explore/${offer.id}\n\nDon't miss out on this amazing offer from *Cravings*! 🍽️✨`;

      const shareData = {
        title: `KIDILAN FOOD SPOT ALERT`,
        text: message,
      };

      if (navigator.share) {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
        });
      } else {
        await navigator.clipboard.writeText(`${message}\n${offer.image_url}`);
        toast.info("Offer details copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing the offer:", error);
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Failed to share the offer. Please try again.");
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="text-orange-500 flex items-start gap-1 mt-3"
    >
      <Share2 size={23} />
      Share
    </button>
  );
};

export default ShareExploreItemBtn;
