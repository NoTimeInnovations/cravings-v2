"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import React from "react";
import HeadingWithAccent from "../../../HeadingWithAccent";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { Carousel, CarouselContent, CarouselItem } from "../../../ui/carousel";
import ItemCard from "./ItemCard";
import Autoplay from "embla-carousel-autoplay";

const PopularItemsList = ({
  items,
  currency,
  hotelData,
  styles,
  tableNumber,
}: {
  items: HotelDataMenus[];
  styles: Styles;
  hotelData: HotelData;
  currency: string;
  tableNumber: number;
}) => {
  return (
    <div className="flex flex-col gap-6 my-5">
      <HeadingWithAccent
        className="text-3xl font-black text-center"
        accent={styles.accent}
      >
        Must Try
      </HeadingWithAccent>

      <Carousel
        className="h-full"
        plugins={[
          Autoplay({
            delay: 2000,
          }),
        ]}
      >
        <CarouselContent className="pl-[8%] mr-[8%] h-full pt-4">
          {items.map((item, index) => {
            let offerPrice = item.price;
            let oldPrice = item.price;
            let discountPercent = 0;
            let hasMultipleVariantsOnOffer = false;
            let isOfferItem = false;
            
            // Always check for offers for this item, regardless of category
            const itemOffers = hotelData.offers?.filter((o) => o.menu && o.menu.id === item.id) || [];
            
            if (itemOffers.length > 0) {
              isOfferItem = true;
              
              if (itemOffers.length > 1) {
                // Multiple variants on offer - show "See Options" button
                hasMultipleVariantsOnOffer = true;
                // Use the lowest offer price for display
                const lowestOfferPrice = Math.min(...itemOffers.map(o => o.offer_price || 0));
                offerPrice = lowestOfferPrice;
                
                // For multiple variants, we don't need oldPrice since we're showing "From" price
                oldPrice = item.price; // This won't be used for display
                
                // Calculate discount based on the lowest offer price vs the lowest original price
                const lowestOriginalPrice = Math.min(...itemOffers.map(o => 
                  o.variant ? o.variant.price : (o.menu?.price || 0)
                ));
                if (lowestOriginalPrice > lowestOfferPrice) {
                  discountPercent = Math.round(((lowestOriginalPrice - lowestOfferPrice) / lowestOriginalPrice) * 100);
                }
              } else if (itemOffers.length === 1) {
                // Single variant on offer
                const offer = itemOffers[0];
                offerPrice = typeof offer?.offer_price === 'number' ? offer.offer_price : item.price;
                
                if (offer?.variant) {
                  oldPrice = offer.variant.price;
                } else {
                  oldPrice = typeof offer?.menu?.price === 'number' ? offer.menu.price : item.price;
                }
                
                if (typeof offer?.offer_price === 'number' && oldPrice > offer.offer_price) {
                  discountPercent = Math.round(((oldPrice - offer.offer_price) / oldPrice) * 100);
                }
              }
            }
            
            return (
              <CarouselItem key={`popular-${item.name + index}`}>
                <ItemCard 
                  hotelData={hotelData} 
                  tableNumber={tableNumber} 
                  feature_flags={hotelData?.feature_flags} 
                  currency={currency} 
                  item={item} 
                  styles={styles} 
                  className="h-full"
                  isOfferItem={isOfferItem}
                  offerPrice={offerPrice}
                  oldPrice={oldPrice}
                  discountPercent={discountPercent}
                  hasMultipleVariantsOnOffer={hasMultipleVariantsOnOffer}
                  currentCategory="all"
                  isOfferCategory={false}
                />
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
};

export default PopularItemsList;
