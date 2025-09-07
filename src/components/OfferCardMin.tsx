"use client";
import React from "react";
import { Card } from "./ui/card";
import Image from "next/image";
import DiscountBadge from "./DiscountBadge";import { Offer } from "@/store/offerStore_hasura";
import Img from "./Img";
;

const OfferCardMin = ({
  offer,
  discount,
  onClick,
}: {
  offer: Offer;
  discount: number;
  isUpcoming?: boolean;
  onClick?: () => void;
}) => {
  // Calculate the original price based on variant if available
  const getOriginalPrice = () => {
    if (offer.variant) {
      return offer.variant.price;
    }
    return offer.menu.price;
  };
  
  const originalPrice = getOriginalPrice();
  
  return (
    <div
      className="cursor-pointer group-active:scale-95 h-full transition-all"
      onClick={onClick}
    >
      <Card
        key={offer.id}
        className="overflow-hidden hover:shadow-xl relative h-full rounded-3xl"
      >
        {/* image container  */}
        <div className="relative">
          <Img
            src={offer.menu.image_url !== "" ? offer.menu.image_url : "/image_placeholder.png"}
            alt={offer.menu.name}
            width={300}
            height={300}
            className="w-full h-48 object-cover"
          />

          <div className="grid bg-gradient-to-t from-black to-transparentr p-3 absolute bottom-0 left-0 w-full">
            <span className="text-white/70 line-through text-sm">
              ₹{originalPrice.toFixed(0)}
            </span>
            <span className="text-2xl font-bold text-white">
              ₹{(offer.offer_price ?? 0).toFixed(0)}
            </span>

            <div className="font-bold md:text-xl text-white">
              {offer.menu.name}
              {offer.variant && (
                <span className="text-sm font-normal text-white/80 ml-2">
                  ({offer.variant.name})
                </span>
              )}
            </div>
          </div>
        </div>

        <DiscountBadge discount={discount} />
      </Card>
    </div>
  );
};

export default OfferCardMin;
