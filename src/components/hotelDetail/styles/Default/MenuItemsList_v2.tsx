"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { isItemVisibleForStorefront } from "@/lib/visibility";
import { Category, formatDisplayName } from "@/store/categoryStore_hasura";
import ItemCard from "./ItemCard";
import { Offer } from "@/store/offerStore_hasura";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MenuItemsList = ({
  styles,
  items,
  categories,
  hotelData,
  setSelectedCategory,
  selectedCategory: selectedCategoryProp,
  currency,
  tableNumber,
}: {
  styles: Styles;
  items: HotelDataMenus[];
  categories: Category[];
  hotelData: HotelData;
  setSelectedCategory: (category: string) => void;
  selectedCategory?: string;
  currency: string;
  tableNumber: number;
}) => {
  const selectedCat = selectedCategoryProp || "all";
  const isOfferCategory = selectedCat === "Offer";
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");

  // Swipe navigation between categories
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef(false);
  const itemsRef = useRef<HTMLDivElement>(null);
  const allCats = useMemo(() => ["all", ...categories.map(c => c.name)], [categories]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    if (itemsRef.current) {
      itemsRef.current.style.transition = 'none';
    }
  }, []);

  // Native touchmove with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = itemsRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (!isDragging.current) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          isDragging.current = true;
        } else if (Math.abs(dy) > 10) return;
      }
      if (isDragging.current) {
        e.preventDefault(); // Prevent browser overscroll/bounce
        const damped = dx * 0.35;
        el.style.transform = `translateX(${damped}px)`;
        el.style.opacity = `${1 - Math.min(Math.abs(dx) / 600, 0.4)}`;
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (!isDragging.current || !itemsRef.current) {
      if (itemsRef.current) {
        itemsRef.current.style.transform = '';
        itemsRef.current.style.opacity = '';
      }
      return;
    }
    const currentIdx = allCats.indexOf(selectedCat);
    const goNext = dx < -60 && currentIdx < allCats.length - 1;
    const goPrev = dx > 60 && currentIdx > 0;

    if (goNext || goPrev) {
      itemsRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      itemsRef.current.style.transform = `translateX(${dx < 0 ? '-100%' : '100%'})`;
      itemsRef.current.style.opacity = '0';
      setTimeout(() => {
        if (goNext) setSelectedCategory(allCats[currentIdx + 1]);
        else setSelectedCategory(allCats[currentIdx - 1]);
        if (itemsRef.current) {
          itemsRef.current.style.transition = 'none';
          itemsRef.current.style.transform = `translateX(${dx < 0 ? '40%' : '-40%'})`;
          itemsRef.current.style.opacity = '0';
          requestAnimationFrame(() => {
            if (itemsRef.current) {
              itemsRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
              itemsRef.current.style.transform = 'translateX(0)';
              itemsRef.current.style.opacity = '1';
            }
          });
        }
      }, 200);
    } else {
      itemsRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
      itemsRef.current.style.transform = 'translateX(0)';
      itemsRef.current.style.opacity = '1';
    }
    isDragging.current = false;
  }, [allCats, selectedCat, setSelectedCategory]);

  // Check if any menu items have is_veg set (not null)
  const hasVegFilter = useMemo(() => {
    return hotelData?.menus?.some(
      (item) => item.is_veg !== null && item.is_veg !== undefined
    );
  }, [hotelData?.menus]);

  // Filter items based on veg/non-veg selection + visibility config
  const filteredItems = useMemo(() => {
    const tz = (hotelData as any)?.timezone || "Asia/Kolkata";
    const base = items.filter((item) => isItemVisibleForStorefront(item as any, tz));
    if (vegFilter === "all" || !hasVegFilter) return base;
    return base.filter((item) => {
      if (vegFilter === "veg") return item.is_veg === true;
      if (vegFilter === "non-veg") return item.is_veg === false;
      return true;
    });
  }, [items, vegFilter, hasVegFilter, hotelData]);

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

      {/* Veg/Non-Veg Filter - only show if menu has items with is_veg set */}
      {hasVegFilter && (
        <div
          className="sticky top-0 z-20 w-full transition-all"
          style={{
            backgroundColor: styles.backgroundColor,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div className="px-[8%] flex justify-center gap-3 flex-wrap py-3">
            <button
              onClick={() => setVegFilter("all")}
              style={{
                ...styles.border,
                color:
                  vegFilter === "all" ? styles.backgroundColor : styles.color,
                backgroundColor:
                  vegFilter === "all" ? styles.accent : styles.backgroundColor,
                borderColor: styles.border.borderColor,
              }}
              className="font-semibold text-sm text-nowrap rounded-full px-4 py-2 border transition-colors"
            >
              All
            </button>
            <button
              onClick={() => setVegFilter("veg")}
              style={{
                ...styles.border,
                color: vegFilter === "veg" ? "white" : styles.color,
                backgroundColor:
                  vegFilter === "veg" ? "#22c55e" : styles.backgroundColor,
                borderColor:
                  vegFilter === "veg" ? "#22c55e" : styles.border.borderColor,
              }}
              className="font-semibold text-sm text-nowrap rounded-full px-4 py-2 flex items-center gap-1 border transition-colors"
            >
              <div
                className={`w-2.5 h-2.5 border-[1.5px] ${
                  vegFilter === "veg" ? "border-white" : "border-green-600"
                } flex items-center justify-center`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    vegFilter === "veg" ? "bg-white" : "bg-green-600"
                  }`}
                ></div>
              </div>
              Veg
            </button>
            <button
              onClick={() => setVegFilter("non-veg")}
              style={{
                ...styles.border,
                color: vegFilter === "non-veg" ? "white" : styles.color,
                backgroundColor:
                  vegFilter === "non-veg" ? "#ef4444" : styles.backgroundColor,
                borderColor:
                  vegFilter === "non-veg"
                    ? "#ef4444"
                    : styles.border.borderColor,
              }}
              className="font-semibold text-sm text-nowrap rounded-full px-4 py-2 flex items-center gap-1 border transition-colors"
            >
              <div
                className={`w-2.5 h-2.5 border-[1.5px] ${
                  vegFilter === "non-veg" ? "border-white" : "border-red-600"
                } flex items-center justify-center`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    vegFilter === "non-veg" ? "bg-white" : "bg-red-600"
                  }`}
                ></div>
              </div>
              Non-Veg
            </button>
          </div>
        </div>
      )}

      {/* Swipe hint + item count */}
      <div className="px-[8%] flex items-center justify-between">
        <span className="text-[11px] font-medium opacity-50">{filteredItems?.length || 0} items</span>
        <div className="flex items-center gap-1 text-[10px] font-medium opacity-40">
          <ChevronLeft size={12} />
          <span>Swipe for more</span>
          <ChevronRight size={12} />
        </div>
      </div>

      {/* items  */}
      <div className="overflow-hidden">
      <div ref={itemsRef} id="menu-items" className="px-[8%] grid h-fit gap-3 rounded-3xl" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {filteredItems
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
    </div>
  );
};

export default MenuItemsList;
