"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Image from "next/image";
import { Clock, MapPin, Route, UtensilsCrossed } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";
import DiscountBadge from "./DiscountBadge";
import { useRouter } from "next/navigation";
import { Offer } from "@/store/offerStore_hasura";
import Img from "./Img";

const OfferCard = ({
  offer,
  discount,
  isUpcoming,
  onClick,
}: {
  offer: Offer;
  discount: number;
  isUpcoming: boolean;
  onClick?: () => void;
}) => {
  const router = useRouter();

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
      onClick={onClick ? onClick : () => router.push(`/offers/${offer.id}`)}
    >
      <Card
        key={offer.id}
        className="overflow-hidden hover:shadow-xl relative h-full pb-1 group-active:bg-orange-200 transition-all"
      >
        {/* image container  */}
        <div className="relative">
          <Img
            src={offer.menu.image_url || "/image_placeholder.png"}
            alt={offer.menu.name}
            width={200}
            height={200}
            className="w-full h-32 object-cover"
          />

          <div className="absolute bottom-0  p-3  left-0 flex items-end bg-gradient-to-t from-black to-transparent w-full">
            <div className="grid w-full">
              {(originalPrice ?? 0) > 0 && (
                <span className="text-white/70 line-through text-sm">
                  ₹{originalPrice.toFixed(0)}
                </span>
              )}
              {(offer.offer_price ?? 0) > 0 && (
                <span className="text-2xl font-bold text-white">
                  ₹{(offer.offer_price ?? 0).toFixed(0)}
                </span>
              )}
            </div>

            {/* <div className="text-sm font-bold text-orange-500 flex items-center gap-1">
              <span>★</span>
            </div> */}
          </div>
        </div>

        <CardHeader className="p-3 md:p-5 space-y-0">
          <CardTitle className="font-bold md:text-xl text-balance">
            {offer.menu.name}
            {offer.variant && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({offer.variant.name})
              </span>
            )}
          </CardTitle>
        </CardHeader>

        {
          ((offer?.menu?.price ?? 0 > 0) && (offer?.offer_price ?? 0 > 0)) ? (
            <DiscountBadge discount={discount} />
          ) : null
        }
        <CardContent className="p-3 md:p-5 md:pt-0 pt-0">
          <div className="">
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    <CountdownTimer
                      endTime={offer.end_time}
                      upcoming={
                        new Date(offer.start_time).setHours(0, 0, 0, 0) >
                        new Date().setHours(0, 0, 0, 0)
                      }
                    />
                  </div>

                  {offer?.partner?.district ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-4 h-4 mr-2" />
                      {offer.partner?.district}
                    </div>
                  ) : null}

                  {offer?.partner?.store_name ? (
                    <p className="text-sm text-gray-800 flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>{offer.partner?.store_name}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfferCard;
