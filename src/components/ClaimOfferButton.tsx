import React from "react";
import { Button } from "./ui/button";
import { CountdownTimer } from "./CountdownTimer";
import { Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { Offer } from "@/store/offerStore_hasura";

type ClaimOfferButtonProps = {
  offer: Offer;
  isClaimed: boolean;
  offersClaimable: number;
  setShowTicket: (show: boolean) => void;
  handleClaimOffer: () => void;
};

const buttonConfig = {
  upcoming: {
    text: (offer: Offer) => (
      <>
        Offer Activates in:{" "}
        <CountdownTimer
          endTime={offer.end_time}
          upcoming={
            new Date(offer.start_time).setHours(0, 0, 0, 0) >
            new Date().setHours(0, 0, 0, 0)
          }
        />
      </>
    ),
    className: "bg-gray-100 text-[#E63946] shadow-xl border border-gray-200",
    disabled: true,
  },
  claimed: {
    text: "View Ticket",
    className: "bg-green-600 hover:bg-green-700",
    disabled: false,
  },
  available: {
    text: "Claim Offer",
    className: "bg-orange-600 hover:bg-orange-700",
    disabled: false,
  },
  offerNotClaimable: {
    text: "",
    className: "bg-red-400 cursor-not-allowed disabled:opacity-70",
    disabled: false,
  },
};

const getButtonState = (
  offer: Offer,
  isClaimed: boolean,
  offersClaimable: number
) => {
  if (new Date(offer.start_time) > new Date()) {
    return "upcoming";
  }
  if (isClaimed) {
    return "claimed";
  }
  if (offersClaimable >= offer.menu.price - (offer.offer_price ?? 0)) {
    return "available";
  }
  return "offerNotClaimable";
};

const ClaimOfferButton: React.FC<ClaimOfferButtonProps> = ({
  offer,
  isClaimed,
  offersClaimable,
  setShowTicket,
  handleClaimOffer,
}) => {
  const buttonState = getButtonState(offer, isClaimed, offersClaimable);
  const { text, className, disabled } = buttonConfig[buttonState];
  const router = useRouter();

  return (
    <Button
      disabled={disabled}
      onClick={() => {
        if (isClaimed) {
          setShowTicket(true);
        } else if (offersClaimable >= offer.menu.price - (offer.offer_price ?? 0)) {
          handleClaimOffer();
        } else {
          router.push("/coupons");
        }
      }}
      className={`w-full py-3 text-[16px] font-semibold transition-all ${className}`}
    >
      {buttonState === "available" && (
        <div className="flex items-center">
          <span>-{offer.menu.price - (offer.offer_price ?? 0)}</span>
          <Banknote className="w-4 h-4 mr-2 ml-1" />
          {typeof text === "function" ? text(offer) : text}
        </div>
      )}
      {buttonState !== "available" && (
        <div className="flex flex-col">
          {typeof text === "function" ? text(offer) : text}
          {buttonState === "offerNotClaimable" && (
            <span className="text-sm text-white">
              You need {offer.menu.price - (offer.offer_price ?? 0) - offersClaimable}{" "}
              Rs more
            </span>
          )}
        </div>
      )}
    </Button>
  );
};

export default ClaimOfferButton;
