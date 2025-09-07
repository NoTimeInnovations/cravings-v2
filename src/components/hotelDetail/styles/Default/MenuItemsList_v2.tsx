"use client";

import React from "react";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { Category, formatDisplayName } from "@/store/categoryStore_hasura";
import ItemCard from "./ItemCard";
import { useSearchParams } from "next/navigation";
import { Offer } from "@/store/offerStore_hasura";

const MenuItemsList = ({
  styles,
  items,
  categories,
  hotelData,
  setSelectedCategory,
  currency,
  tableNumber,
}: {
  styles: Styles;
  items: HotelDataMenus[];
  categories: Category[];
  hotelData: HotelData;
  setSelectedCategory: (category: string) => void;
  currency: string;
  tableNumber: number;
}) => {
  const serachParaams = useSearchParams();
  const selectedCat = serachParaams.get("cat") || "all";
  const isOfferCategory = selectedCat === "Offer";


  return (
    <div className="flex flex-col gap-6">
      {/* categories  */}
      <div
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
          paddingLeft: "8%",
          scrollPaddingLeft: "8%",
          paddingRight: "8%",
          scrollPaddingRight: "8%",
        }}
        // className="flex gap-x-2 overflow-x-scroll scrollbar-hidden "
        className="flex gap-2 flex-wrap justify-start"
      >
        <button
          onClick={() => {
            setSelectedCategory("all");
            window.scrollTo({
              top: document.getElementById("menu-items")?.offsetTop,
              behavior: "smooth",
            });
          }}
          style={{
            ...styles.border,
            color: selectedCat === "all" ? "white" : "black",
            backgroundColor: selectedCat === "all" ? styles.accent : "white",
          }}
          // className="font-semibold capitalize text-nowrap rounded-full px-5 py-[10px] snap-start flex-shrink-0"
          className="font-semibold capitalize text-xs text-nowrap rounded-full px-5 py-[10px] snap-start flex-shrink-0"
          key={"all"}
        >
          All
        </button>

        {categories.map((category, index) => (
          <button
            onClick={() => {
              setSelectedCategory(category.name);
              window.scrollTo({
                top: document.getElementById("menu-items")?.offsetTop,
                behavior: "smooth",
              });
            }}
            style={{
              ...styles.border,
              color: selectedCat === category.name ? "white" : "black",
              backgroundColor:
                selectedCat === category.name ? styles.accent : "white",
            }}
            // className="font-semibold capitalize text-nowrap rounded-full px-5 py-[10px] snap-start flex-shrink-0"
            className="font-semibold capitalize text-xs text-nowrap rounded-full px-5 py-[10px] snap-start flex-shrink-0"
            key={category.id + index + category.name}
          >
            {formatDisplayName(category.name)}
          </button>
        ))}
      </div>

      {/* items  */}
      <div id="menu-items" className="px-[8%] grid h-fit gap-3 rounded-3xl ">
        {items
          ?.sort((a, b) => {
            // First, sort by priority
            const priorityDiff = (a.priority ?? 0) - (b.priority ?? 0);
            if (priorityDiff !== 0) return priorityDiff;

            // In offer category, prioritize upcoming offers first, then sort by start time
            if (selectedCat === "Offer" || selectedCat === "offers") {
              const aOffers = hotelData.offers?.filter((o) => o.menu && o.menu.id === a.id) || [];
              const bOffers = hotelData.offers?.filter((o) => o.menu && o.menu.id === b.id) || [];

              const now = new Date();
              const aHasUpcoming = aOffers.some(offer => new Date(offer.start_time) > now);
              const bHasUpcoming = bOffers.some(offer => new Date(offer.start_time) > now);

              // Put upcoming offers first (highest priority)
              if (aHasUpcoming && !bHasUpcoming) {
                return -1; // a comes first
              }
              if (!aHasUpcoming && bHasUpcoming) {
                return 1; // b comes first
              }

              // If both are upcoming or both are active, sort by start time (newer on top)
              if (aOffers.length > 0 && bOffers.length > 0) {
                const aEarliestStart = Math.min(...aOffers.map(o => new Date(o.start_time).getTime()));
                const bEarliestStart = Math.min(...bOffers.map(o => new Date(o.start_time).getTime()));
                return bEarliestStart - aEarliestStart;
              } else if (aOffers.length > 0) {
                return -1; // a has offers, b doesn't - a comes first
              } else if (bOffers.length > 0) {
                return 1; // b has offers, a doesn't - b comes first
              }
            }

            return 0;
          })
          ?.map((item) => {
            let offerPrice = item.price;
            let oldPrice = item.price;
            let discountPercent = 0;
            let hasMultipleVariantsOnOffer = false;
            let isOfferItem = false;
            let isUpcomingOffer = false;
            let activeOffers: Offer[] = [];
            let upcomingOffers: Offer[] = [];

            // Always check for offers for this item, regardless of category
            const itemOffers = hotelData.offers?.filter((o) => o.menu && o.menu.id === item.id) || [];

            if (itemOffers.length > 0) {
              isOfferItem = true;

              // Check for upcoming offers (start_time > current time)
              const now = new Date();
              upcomingOffers = itemOffers.filter(offer => new Date(offer.start_time) > now);
              activeOffers = itemOffers.filter(offer => new Date(offer.start_time) <= now);

              // If there are upcoming offers, mark as upcoming
              if (upcomingOffers.length > 0) {
                isUpcomingOffer = true;
              }

              if (isUpcomingOffer) {
                // For upcoming offers, show offer price as main, original price as strikethrough
                if (upcomingOffers.length > 1) {
                  // Multiple variants on upcoming offer
                  hasMultipleVariantsOnOffer = true;
                  const lowestOfferPrice = Math.min(...upcomingOffers.map(o => o.offer_price || 0));
                  const lowestOriginalPrice = Math.min(...upcomingOffers.map(o =>
                    o.variant ? o.variant.price : (o.menu?.price || 0)
                  ));

                  // For upcoming offers: show offer price as main, original price as strikethrough
                  offerPrice = lowestOfferPrice; // Main displayed price (offer)
                  oldPrice = lowestOriginalPrice; // Strikethrough price (original price)

                  if (lowestOriginalPrice > lowestOfferPrice) {
                    discountPercent = Math.round(((lowestOriginalPrice - lowestOfferPrice) / lowestOriginalPrice) * 100);
                  }
                } else if (upcomingOffers.length === 1) {
                  // Single variant on upcoming offer
                  const offer = upcomingOffers[0];
                  const originalPrice = offer?.variant ? offer.variant.price : (offer?.menu?.price || item.price);
                  const futureOfferPrice = typeof offer?.offer_price === 'number' ? offer.offer_price : item.price;

                  // For upcoming offers: show offer price as main, original price as strikethrough
                  offerPrice = futureOfferPrice; // Main displayed price (offer)
                  oldPrice = originalPrice; // Strikethrough price (original price)

                  if (originalPrice > futureOfferPrice) {
                    discountPercent = Math.round(((originalPrice - futureOfferPrice) / originalPrice) * 100);
                  }
                }
              } else {
                // For active offers, use the existing logic
                const offersToUse = activeOffers;

                if (offersToUse.length > 1) {
                  // Multiple variants on offer - show "See Options" button
                  hasMultipleVariantsOnOffer = true;
                  // Use the lowest offer price for display
                  const lowestOfferPrice = Math.min(...offersToUse.map(o => o.offer_price || 0));
                  offerPrice = lowestOfferPrice;

                  // For multiple variants, we don't need oldPrice since we're showing "From" price
                  oldPrice = item.price; // This won't be used for display

                  // Calculate discount based on the lowest offer price vs the lowest original price
                  const lowestOriginalPrice = Math.min(...offersToUse.map(o =>
                    o.variant ? o.variant.price : (o.menu?.price || 0)
                  ));
                  if (lowestOriginalPrice > lowestOfferPrice) {
                    discountPercent = Math.round(((lowestOriginalPrice - lowestOfferPrice) / lowestOriginalPrice) * 100);
                  }
                } else if (offersToUse.length === 1) {
                  // Single variant on offer
                  const offer = offersToUse[0];
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
            }

            // Don't show variant name in display name for items with multiple variants on offer
            const displayName = hasMultipleVariantsOnOffer ? item.name : item.name;

            return (
              <ItemCard
                hotelData={hotelData}
                feature_flags={hotelData?.feature_flags}
                currency={currency}
                key={item.id}
                item={item}
                styles={styles}
                tableNumber={tableNumber}
                isOfferItem={isOfferItem}
                offerPrice={offerPrice}
                oldPrice={oldPrice}
                discountPercent={discountPercent}
                displayName={displayName}
                hasMultipleVariantsOnOffer={hasMultipleVariantsOnOffer}
                currentCategory={selectedCat}
                isOfferCategory={isOfferCategory}
                isUpcomingOffer={isUpcomingOffer}
                activeOffers={isUpcomingOffer ? upcomingOffers : activeOffers}
              />
            );
          })}
      </div>
    </div>
  );
};

export default MenuItemsList;
