"use client";
import React, { useState, useEffect, useRef } from "react";
import { DefaultHotelPageProps } from "../Default/Default";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import ThemeChangeButton from "../../ThemeChangeButton";
import ItemCard from "./ItemCard";
import { MapPin } from "lucide-react";
import SocialLinks from "./SocialLinks";
import RateUs from "./RateUs";
import CategoryListBtn from "./CategoryListBtn";
import SearchItems from "./SearchItems";
import OffersList from "./OffersList";
import { Offer } from "@/store/offerStore_hasura";
import { ThemeConfig } from "tailwindcss/types/config";

const Compact = ({
  styles,
  theme,
  open_place_order_modal,
  hoteldata,
  socialLinks,
  offers,
  tableNumber,
  auth,
  topItems,
  items,
  pathname,
  categories,
  setSelectedCategory,
  qrGroup,
  qrId,
}: DefaultHotelPageProps) => {
  const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const categoryHeadersRef = useRef<(HTMLHeadingElement | null)[]>([]);
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const categoryElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const isOwner = auth && hoteldata ? auth?.id === hoteldata?.id : false;
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const hasOffers = offers && offers.length > 0;

  useEffect(() => {
    const handleScroll = () => {
      // Added a buffer to the sticky position for more accurate detection
      const scrollPosition = window.scrollY + 70;
      let currentActiveIndex = 0;

      // Find which category header is currently at or above the scroll position
      for (let i = 0; i < categoryHeadersRef.current.length; i++) {
        const header = categoryHeadersRef.current[i];
        if (header && header.offsetTop <= scrollPosition) {
          currentActiveIndex = i;
        } else {
          break;
        }
      }

      if (currentActiveIndex !== activeCatIndex) {
        setActiveCatIndex(currentActiveIndex);
        scrollCategoryIntoView(currentActiveIndex);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories, activeCatIndex]);

  useEffect(() => {
    // Update border position whenever activeCatIndex changes
    updateBorderPosition(activeCatIndex);
  }, [activeCatIndex]);

  const scrollCategoryIntoView = (index: number) => {
    const container = categoriesContainerRef.current;
    if (!container) return;

    const categoryElement = categoryElementsRef.current[index];
    if (!categoryElement) return;

    const containerRect = container.getBoundingClientRect();
    const categoryRect = categoryElement.getBoundingClientRect();

    // Scroll horizontally if the active category tab is not fully visible
    if (categoryRect.left < containerRect.left) {
      container.scrollTo({
        left:
          container.scrollLeft + (categoryRect.left - containerRect.left) - 10,
        behavior: "smooth",
      });
    } else if (categoryRect.right > containerRect.right) {
      container.scrollTo({
        left:
          container.scrollLeft +
          (categoryRect.right - containerRect.right) +
          10,
        behavior: "smooth",
      });
    }
  };

  const updateBorderPosition = (index: number) => {
    const container = categoriesContainerRef.current;
    const border = borderRef.current;
    const activeCategory = categoryElementsRef.current[index];

    if (!container || !border || !activeCategory) return;

    const containerRect = container.getBoundingClientRect();
    const categoryRect = activeCategory.getBoundingClientRect();

    // Calculate position relative to the scrollable container
    const left = categoryRect.left - containerRect.left + container.scrollLeft;
    const width = categoryRect.width;

    // Apply the new position and width to the animated border
    border.style.transform = `translateX(${left}px)`;
    border.style.width = `${width}px`;
  };

  const handleCategoryClick = (index: number, category: any) => {
    setActiveCatIndex(index);
    const element = document.getElementById(category.name);
    if (element) {
      const offset = 100; // Offset to account for sticky headers
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    scrollCategoryIntoView(index);
  };

  // Memoize the category list to prevent re-creation on every render
  // UPDATED: Remove "Offer" category from compact design
  const allCategories = React.useMemo(
    () => [
      ...(hasOffers ? [{ id: "offers", name: "Offers" }] : []),
      ...(topItems && topItems.length > 0
        ? [{ id: "must-try", name: "must_try" }]
        : []),
      ...categories.filter(category => category.name !== "Offer"),
    ],
    [categories, topItems, hasOffers]
  );

  return (
    <>
      <main
        style={{
          color: styles?.color || "#000",
          backgroundColor: styles?.backgroundColor || "#fff",
        }}
        className="max-w-xl mx-auto relative pb-40 "
      >
        {/* category list btn  */}
        <CategoryListBtn categories={allCategories} />

        {/* rateusbtn  */}
        <RateUs hoteldata={hoteldata} socialLinks={socialLinks} />

        {/* hotel banner */}
        <div className="relative">
          {/* image */}
          <div className="w-full h-[30vh] relative overflow-hidden">
            <img
              src={hoteldata?.store_banner}
              alt="Hotel Logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* hotel details */}
          <div className="absolute bottom-0 gap-2 left-0 w-full p-5 bg-gradient-to-t from-black to-transparent text-white">
            <h1 className="text-xl font-semibold w-[200px]">
              {hoteldata?.store_name}
            </h1>
            {(hoteldata?.district || hoteldata?.country || hoteldata?.location_details) && (
              <div className="inline-flex gap-2 text-sm">
                <MapPin size={15} />
                <span>{hoteldata.location_details || hoteldata.district || hoteldata.country}</span>
              </div>
            )}
          </div>
        </div>

        {/* social links */}
        {/* REMOVED: `hasOffers` check and the OffersList button from here */}
        {(socialLinks || isOwner) && (
          <div
            style={{
              borderColor: styles?.border?.borderColor || "#0000001D",
            }}
            className="flex overflow-x-auto scrollbar-hide gap-2 p-4 border-b-[1px] z-20"
          >
            <SocialLinks socialLinks={socialLinks} />
            {isOwner && (
              <div
                onClick={() => setIsThemeDialogOpen(true)}
                className="flex items-center gap-2 border-[1px] border-gray-300 p-2 rounded-md bg-gray-50 cursor-pointer"
              >
                <ThemeChangeButton
                  isOpen={isThemeDialogOpen}
                  iconSize={15}
                  hotelData={hoteldata}
                  theme={
                    {
                      ...theme,
                      colors: {
                        ...theme?.colors,
                        text: "#000",
                      },
                    } as typeof theme
                  }
                />
                <span className="text-xs text-nowrap text-gray-500">
                  Change Theme
                </span>
              </div>
            )}
          </div>
        )}

        {/* search btn  */}
        <div className="p-4">
          {/* search  */}
          <SearchItems
            menu={hoteldata?.menus}
            hoteldata={hoteldata}
            styles={styles}
            tableNumber={tableNumber}
          />
        </div>

        {/* Categories Navigation */}
        <div
          style={{
            backgroundColor: styles?.backgroundColor || "#fff",
            color: styles?.color || "#000",
            borderColor: styles?.border?.borderColor || "#0000001D",
          }}
          ref={categoriesContainerRef}
          className="overflow-x-auto w-full flex gap-2 p-2 sticky top-0 z-10 shadow-md scrollbar-hide border-[1px] "
          onScroll={() => updateBorderPosition(activeCatIndex)}
        >
          {/* Animated border element */}
          <div
            ref={borderRef}
            className="absolute bottom-0 left-0 h-0.5 transition-all duration-300 ease-in-out "
            style={{
              backgroundColor: styles?.accent || "#000",
              width: "0px", // Initial width set to 0, updated by useEffect
            }}
          />

          {allCategories.map((category, index) => (
            <div
              ref={(el) => {
                categoryElementsRef.current[index] = el;
              }}
              style={{
                color:
                  activeCatIndex === index
                    ? styles?.accent || "#000"
                    : styles?.color + "80" || "gray",
              }}
              onClick={() => handleCategoryClick(index, category)}
              key={category.id}
              className={`p-3 text-nowrap cursor-pointer ${
                activeCatIndex === index ? "font-semibold" : "font-medium"
              } flex-shrink-0`}
            >
              {formatDisplayName(category.name)}
            </div>
          ))}
        </div>

        {/* Categories Content */}
        <div className="grid gap-4 p-4">
          {allCategories
            .sort((a, b) => (a.priority || 0) - (b.priority || 0))
            .map((category, index) => {
              // Conditionally determine the list of items to render for other categories.
              let itemsToDisplay = [];

              switch (category.id) {
                case "offers":
                  // Create a Set of menu IDs for faster lookups.
                  const offerMenuIdSet = new Set(
                    offers.map((offer) => offer.menu.id)
                  );
                  // Filter 'hoteldata.menus' by checking for the item's ID in the Set.
                  itemsToDisplay = hoteldata?.menus.filter((item) =>
                    offerMenuIdSet.has(item.id as string)
                  );
                  break;
                case "must-try":
                  // If the category is "must_try", display the top items.
                  itemsToDisplay = topItems;
                  break;
                default:
                  itemsToDisplay = hoteldata?.menus.filter(
                    (item) => item.category.id === category.id
                  );
              }

              // Do not render the category section if there are no items to display.
              if (!itemsToDisplay || itemsToDisplay.length === 0) {
                return null;
              }

              itemsToDisplay.sort((a, b) => {
                return (a.priority || 0) - (b.priority || 0);
              });

              return (
                <section key={category.id} id={category.name} className="py-4">
                  <h2
                    ref={(el) => {
                      categoryHeadersRef.current[index] = el;
                    }}
                    style={{
                      color: styles?.accent || "#000",
                      backgroundColor: styles?.backgroundColor || "#fff",
                    }}
                    className="text-xl font-bold sticky top-[64px] z-[9] py-4"
                  >
                    {formatDisplayName(category.name)}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 divide-y-2 divide-gray-200">
                    {itemsToDisplay.map((item) => {
                      // Find all offers for this item
                      const itemOffers = offers?.filter(
                        (offer) => offer.menu.id === item.id
                      ) || [];
                      
                      let offerData = undefined;
                      let hasMultipleVariantsOnOffer = false;
                      let isUpcomingOffer = false;
                      let activeOffers: any[] = [];
                      let upcomingOffers: any[] = [];
                      
                      if (itemOffers.length > 0) {
                        // Check for upcoming offers (start_time > current time)
                        const now = new Date();
                        upcomingOffers = itemOffers.filter(offer => new Date(offer.start_time) > now);
                        activeOffers = itemOffers.filter(offer => new Date(offer.start_time) <= now);
                        
                        // If there are upcoming offers, mark as upcoming
                        if (upcomingOffers.length > 0) {
                          isUpcomingOffer = true;
                        }
                        
                        if (isUpcomingOffer) {
                          // For upcoming offers, ONLY show original price - don't use offer price at all
                          if (upcomingOffers.length > 1) {
                            // Multiple variants on upcoming offer
                            hasMultipleVariantsOnOffer = true;
                            const lowestOfferPrice = Math.min(...upcomingOffers.map(o => o.offer_price || 0));
                            const lowestOriginalPrice = Math.min(...upcomingOffers.map(o => 
                              o.variant ? o.variant.price : (o.menu?.price || 0)
                            ));
                            
                            // For upcoming offers: show original price as main, offer price as strikethrough
                            offerData = {
                              ...upcomingOffers[0],
                              offer_price: lowestOriginalPrice, // Main displayed price (original)
                              menu: { ...upcomingOffers[0].menu, price: lowestOfferPrice }, // Future offer price for strikethrough
                            };
                          } else if (upcomingOffers.length === 1) {
                            // Single variant on upcoming offer
                            const offer = upcomingOffers[0];
                            const originalPrice = offer?.variant ? offer.variant.price : (offer?.menu?.price || item.price);
                            const futureOfferPrice = typeof offer?.offer_price === 'number' ? offer.offer_price : item.price;
                            
                            // For upcoming offers: show original price as main, offer price as strikethrough
                            offerData = {
                              ...offer,
                              offer_price: originalPrice, // Main displayed price (original)
                              menu: { ...offer.menu, price: futureOfferPrice }, // Future offer price for strikethrough
                            };
                          }
                        } else {
                          // For active offers, use the existing logic
                          const offersToUse = activeOffers;
                          
                          if (offersToUse.length > 1) {
                            // Multiple variants on offer - calculate lowest offer price
                            hasMultipleVariantsOnOffer = true;
                            const lowestOfferPrice = Math.min(...offersToUse.map(o => o.offer_price || 0));
                            // Create a mock offer data with the lowest price for display
                            offerData = {
                              ...offersToUse[0],
                              offer_price: lowestOfferPrice,
                            };
                          } else if (offersToUse.length === 1) {
                            // Single variant on offer
                            offerData = offersToUse[0];
                          }
                        }
                      }

                      return (
                        <ItemCard
                          tableNumber={tableNumber}
                          feature_flags={hoteldata?.feature_flags}
                          hoteldata={hoteldata}
                          item={item}
                          offerData={offerData}
                          styles={styles}
                          key={item.id}
                          hasMultipleVariantsOnOffer={hasMultipleVariantsOnOffer}
                          allItemOffers={hasMultipleVariantsOnOffer ? itemOffers : undefined}
                          currentCategory={category.id}
                          isOfferCategory={category.id === "offers"}
                          isUpcomingOffer={isUpcomingOffer}
                          activeOffers={isUpcomingOffer ? upcomingOffers : activeOffers}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
        </div>
      </main>
    </>
  );
};

export default Compact;
