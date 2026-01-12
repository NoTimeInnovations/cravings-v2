"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { MyOrdersButton } from "./MyOrdersButton";
import CompactOrders from "./CompactOrders";
import { Utensils, ShoppingBag } from "lucide-react";
import { DefaultHotelPageProps } from "../Default/Default";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import ItemCard from "./ItemCard";
import { MapPin, Palette, Check, X, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import SocialLinks from "./SocialLinks";
import OrderDrawer from "../../OrderDrawer";
import RateUs from "./RateUs";
import CategoryListBtn from "./CategoryListBtn";
import SearchItems from "./SearchItems";
import OffersList from "./OffersList";
import { Offer } from "@/store/offerStore_hasura";
import { ThemeConfig } from "tailwindcss/types/config";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartnerMutation } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { getFeatures } from "@/lib/getFeatures";

// Helper to check darkness for contrast
const isColorDark = (hex: string) => {
  const c = hex.substring(1);      // strip #
  const rgb = parseInt(c, 16);   // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff;  // extract red
  const g = (rgb >> 8) & 0xff;  // extract green
  const b = (rgb >> 0) & 0xff;  // extract blue
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
  return luma < 128;
};

const PRESETS = [
  { background: "#ffffff", text: "#000000", accent: "#ea580c" }, // Classic Orange
  { background: "#0f172a", text: "#ffffff", accent: "#fbbf24" }, // Midnight Gold
  { background: "#f0fdf4", text: "#14532d", accent: "#16a34a" }, // Fresh Green
];

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
  const [activeTab, setActiveTab] = useState<'food' | 'orders'>('food');

  // Custom Theme State
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [localStyles, setLocalStyles] = useState(styles || { color: "#000", backgroundColor: "#fff", accent: "#ea580c" });
  const [mobileTab, setMobileTab] = useState<'backgroundColor' | 'color' | 'accent'>('accent');
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const categoryHeadersRef = useRef<(HTMLHeadingElement | null)[]>([]);
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const categoryElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const isOwner = auth && hoteldata ? auth?.id === hoteldata?.id : false;
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const hasOffers = offers && offers.length > 0;
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [bannerError, setBannerError] = useState(false);

  // Sync props to local state if not editing
  useEffect(() => {
    if (!showThemeCustomizer && styles) {
      setLocalStyles(styles);
    }
  }, [styles, showThemeCustomizer]);

  useEffect(() => {
    setBannerError(false);
  }, [hoteldata?.store_banner]);

  // Check if any menu items have is_veg set (not null)
  const hasVegFilter = useMemo(() => {
    return hoteldata?.menus?.some(
      (item) => item.is_veg !== null && item.is_veg !== undefined
    );
  }, [hoteldata?.menus]);

  useEffect(() => {
    const handleScroll = () => {
      // Added a buffer to the sticky position for more accurate detection
      const scrollPosition = window.scrollY + 200;
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

  // Theme Saving Logic
  const handleSaveTheme = async () => {
    if (!hoteldata?.id) return;
    setIsSavingTheme(true);
    try {
      const updatedTheme = {
        ...theme,
        colors: {
          text: localStyles.color,
          bg: localStyles.backgroundColor,
          accent: localStyles.accent,
        }
      };

      await fetchFromHasura(updatePartnerMutation, {
        id: hoteldata.id,
        updates: {
          theme: JSON.stringify(updatedTheme),
        },
      });

      toast.success("Theme updated successfully!");
      await revalidateTag(hoteldata.id);
      setShowThemeCustomizer(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to save theme:", error);
      toast.error("Failed to save theme");
    } finally {
      setIsSavingTheme(false);
    }
  };


  // Memoize the category list to prevent re-creation on every render
  // UPDATED: Remove "Offer" category from compact design
  const allCategories = React.useMemo(
    () => [
      ...(hasOffers ? [{ id: "offers", name: "Offers" }] : []),
      ...(topItems && topItems.length > 0
        ? [{ id: "must-try", name: "must_try" }]
        : []),
      ...categories.filter((category) => category.name !== "Offer"),
    ],
    [categories, topItems, hasOffers]
  );

  return (
    <>
      <main
        style={{
          color: localStyles?.color || "#000",
          backgroundColor: localStyles?.backgroundColor || "#fff",
        }}
        className="max-w-xl mx-auto relative pb-40 "
      >
        <ShopClosedModalWarning
          hotelId={hoteldata?.id}
          isShopOpen={hoteldata?.is_shop_open}
        />

        {/* Floating buttons - Only visible in Food tab */}
        {activeTab === 'food' && (
          <>
            {/* category list btn  */}
            <CategoryListBtn categories={allCategories} hasBottomNav={auth?.role === 'user'} />

            {/* rateusbtn  */}
            <RateUs hoteldata={hoteldata} socialLinks={socialLinks} hasBottomNav={auth?.role === 'user'} />

            {/* MyOrdersButton - Top Right */}
            {/* <div className="absolute top-4 right-4 z-40">
              <MyOrdersButton />
            </div> */}
          </>
        )}

        {activeTab === 'food' ? (
          <>

            {/* hotel banner */}
            <div className="relative">
              {/* image */}
              <div className="w-full h-[30vh] relative overflow-hidden">
                {hoteldata?.store_banner &&
                  hoteldata?.store_banner !== "" &&
                  !bannerError ? (
                  <img
                    src={hoteldata?.store_banner}
                    alt="Hotel Logo"
                    className="w-full h-full object-cover"
                    onError={() => setBannerError(true)}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: localStyles?.accent || "#ea580c" }}
                  >
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          "radial-gradient(#fff 2px, transparent 2px)",
                        backgroundSize: "20px 20px",
                      }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Center Overlay - Handwriting Font */}
              {(!hoteldata?.store_banner ||
                hoteldata?.store_banner === "" ||
                bannerError) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none p-4">
                    <h1
                      className={`font-handwriting text-white drop-shadow-md text-center font-bold break-words w-full ${(hoteldata?.store_name?.length || 0) > 35
                        ? "text-2xl"
                        : (hoteldata?.store_name?.length || 0) > 25
                          ? "text-3xl"
                          : (hoteldata?.store_name?.length || 0) > 15
                            ? "text-4xl"
                            : "text-5xl"
                        }`}
                    >
                      {hoteldata?.store_name}
                    </h1>
                  </div>
                )}

            </div>

            {/* hotel details (Below Banner) */}
            <div className="flex flex-col gap-2 p-5 pb-2 items-start justify-center">
              <h1 className="text-xl font-semibold">
                {hoteldata?.store_name}
              </h1>
              {((hoteldata?.district && hoteldata.district !== "") ||
                (hoteldata?.country && hoteldata.country !== "") ||
                (hoteldata?.location_details && hoteldata.location_details !== "")) && (
                  <div className="inline-flex gap-2 text-sm opacity-80">
                    <MapPin size={15} />
                    <span>
                      {hoteldata.location_details ||
                        hoteldata.district ||
                        hoteldata.country}
                    </span>
                  </div>
                )}
            </div>

            {/* social links */}
            {/* REMOVED: `hasOffers` check and the OffersList button from here */}
            {(socialLinks || isOwner) && (
              <div
                style={{
                  borderColor: localStyles?.border?.borderColor || "#0000001D",
                }}
                className="flex overflow-x-auto scrollbar-hide gap-2 p-4 pt-2 border-b-[1px] z-20"
              >
                <SocialLinks socialLinks={socialLinks} />
                {isOwner && (
                  <div
                    onClick={() => setShowThemeCustomizer(!showThemeCustomizer)}
                    className="flex items-center gap-2 border-[1px] border-gray-300 p-2 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    role="button"
                    aria-label="Customize Theme"
                  >
                    <Palette
                      size={15}
                      style={{ color: "#000" }}
                    />
                    <span className="text-xs text-nowrap text-gray-500 font-medium">
                      {showThemeCustomizer ? "Close Editor" : "Change Theme"}
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
                styles={localStyles}
                tableNumber={tableNumber}
                auth={auth}
              />
            </div>

            {/* Veg/Non-Veg Filter - only show if menu has items with is_veg set */}
            {hasVegFilter && (
              <div className="px-4 flex gap-2 flex-wrap pb-2">
                <button
                  onClick={() => setVegFilter("all")}
                  style={{
                    borderColor: localStyles?.border?.borderColor || "#0000001D",
                    color:
                      vegFilter === "all"
                        ? localStyles?.backgroundColor || "#fff"
                        : localStyles?.color || "#000",
                    backgroundColor:
                      vegFilter === "all"
                        ? localStyles?.accent || "#000"
                        : localStyles?.backgroundColor || "#fff",
                  }}
                  className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1 transition-colors"
                >
                  All
                </button>
                <button
                  onClick={() => setVegFilter("veg")}
                  style={{
                    borderColor:
                      vegFilter === "veg"
                        ? "#22c55e"
                        : localStyles?.border?.borderColor || "#0000001D",
                    color:
                      vegFilter === "veg" ? "white" : localStyles?.color || "#000",
                    backgroundColor:
                      vegFilter === "veg"
                        ? "#22c55e"
                        : localStyles?.backgroundColor || "#fff",
                  }}
                  className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1 flex items-center gap-1 transition-colors"
                >
                  <div
                    className={`w-2.5 h-2.5 border-[1.5px] ${vegFilter === "veg" ? "border-white" : "border-green-600"
                      } flex items-center justify-center`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${vegFilter === "veg" ? "bg-white" : "bg-green-600"
                        }`}
                    ></div>
                  </div>
                  Veg
                </button>
                <button
                  onClick={() => setVegFilter("non-veg")}
                  style={{
                    borderColor:
                      vegFilter === "non-veg"
                        ? "#ef4444"
                        : localStyles?.border?.borderColor || "#0000001D",
                    color:
                      vegFilter === "non-veg" ? "white" : localStyles?.color || "#000",
                    backgroundColor:
                      vegFilter === "non-veg"
                        ? "#ef4444"
                        : localStyles?.backgroundColor || "#fff",
                  }}
                  className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1 flex items-center gap-1 transition-colors"
                >
                  <div
                    className={`w-2.5 h-2.5 border-[1.5px] ${vegFilter === "non-veg" ? "border-white" : "border-red-600"
                      } flex items-center justify-center`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${vegFilter === "non-veg" ? "bg-white" : "bg-red-600"
                        }`}
                    ></div>
                  </div>
                  Non-Veg
                </button>
              </div>
            )}

            {/* Categories Navigation */}
            <div
              style={{
                backgroundColor: localStyles?.backgroundColor || "#fff",
                color: localStyles?.color || "#000",
                borderColor: localStyles?.border?.borderColor || "#0000001D",
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
                  backgroundColor: localStyles?.accent || "#000",
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
                        ? localStyles?.accent || "#000"
                        : localStyles?.color || "gray",
                  }}
                  onClick={() => handleCategoryClick(index, category)}
                  key={category.id}
                  className={`p-3 text-nowrap cursor-pointer ${activeCatIndex === index ? "font-semibold" : "font-medium"
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
                      itemsToDisplay = hoteldata?.menus.filter((item) => {
                        const matchesOffer = offerMenuIdSet.has(item.id as string);
                        if (hoteldata.hide_unavailable && !item.is_available) return false;
                        if (vegFilter === "all" || !hasVegFilter) return matchesOffer;
                        if (vegFilter === "veg") return matchesOffer && item.is_veg === true;
                        if (vegFilter === "non-veg") return matchesOffer && item.is_veg === false;
                        return matchesOffer;
                      });
                      break;
                    case "must-try":
                      // If the category is "must_try", display the top items.
                      itemsToDisplay = topItems.filter((item) => {
                        if (hoteldata.hide_unavailable && !item.is_available) return false;
                        if (vegFilter === "all" || !hasVegFilter) return true;
                        if (vegFilter === "veg") return item.is_veg === true;
                        if (vegFilter === "non-veg") return item.is_veg === false;
                        return true;
                      });
                      break;
                    default:
                      itemsToDisplay = hoteldata?.menus.filter((item) => {
                        const matchesCategory = item.category.id === category.id;
                        if (hoteldata.hide_unavailable && !item.is_available) return false;
                        if (vegFilter === "all" || !hasVegFilter) return matchesCategory;
                        if (vegFilter === "veg") return matchesCategory && item.is_veg === true;
                        if (vegFilter === "non-veg") return matchesCategory && item.is_veg === false;
                        return matchesCategory;
                      });
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
                          color: localStyles?.accent || "#000",
                          backgroundColor: localStyles?.backgroundColor || "#fff",
                        }}
                        className="text-xl font-bold sticky top-[64px] z-[9] py-4"
                      >
                        {formatDisplayName(category.name)}
                      </h2>
                      <div className="grid grid-cols-1 gap-4 divide-y-2 divide-gray-200">
                        {itemsToDisplay.map((item) => {
                          // Find all offers for this item
                          const itemOffers =
                            offers?.filter((offer) => offer.menu.id === item.id) ||
                            [];

                          let offerData = undefined;
                          let hasMultipleVariantsOnOffer = false;
                          let isUpcomingOffer = false;
                          let activeOffers: any[] = [];
                          let upcomingOffers: any[] = [];

                          if (itemOffers.length > 0) {
                            // Check for upcoming offers (start_time > current time)
                            const now = new Date();
                            upcomingOffers = itemOffers.filter(
                              (offer) => new Date(offer.start_time) > now
                            );
                            activeOffers = itemOffers.filter(
                              (offer) => new Date(offer.start_time) <= now
                            );

                            // If there are upcoming offers, mark as upcoming
                            if (upcomingOffers.length > 0) {
                              isUpcomingOffer = true;
                            }

                            if (isUpcomingOffer) {
                              // For upcoming offers, ONLY show original price - don't use offer price at all
                              if (upcomingOffers.length > 1) {
                                // Multiple variants on upcoming offer
                                hasMultipleVariantsOnOffer = true;
                                const lowestOfferPrice = Math.min(
                                  ...upcomingOffers.map((o) => o.offer_price || 0)
                                );
                                const lowestOriginalPrice = Math.min(
                                  ...upcomingOffers.map((o) =>
                                    o.variant ? o.variant.price : o.menu?.price || 0
                                  )
                                );

                                // For upcoming offers: show original price as main, offer price as strikethrough
                                offerData = {
                                  ...upcomingOffers[0],
                                  offer_price: lowestOriginalPrice, // Main displayed price (original)
                                  menu: {
                                    ...upcomingOffers[0].menu,
                                    price: lowestOfferPrice,
                                  }, // Future offer price for strikethrough
                                };
                              } else if (upcomingOffers.length === 1) {
                                // Single variant on upcoming offer
                                const offer = upcomingOffers[0];
                                const originalPrice = offer?.variant
                                  ? offer.variant.price
                                  : offer?.menu?.price || item.price;
                                const futureOfferPrice =
                                  typeof offer?.offer_price === "number"
                                    ? offer.offer_price
                                    : item.price;

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
                                const lowestOfferPrice = Math.min(
                                  ...offersToUse.map((o) => o.offer_price || 0)
                                );
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
                              styles={localStyles}
                              key={item.id}
                              hasMultipleVariantsOnOffer={
                                hasMultipleVariantsOnOffer
                              }
                              allItemOffers={
                                hasMultipleVariantsOnOffer ? itemOffers : undefined
                              }
                              currentCategory={category.id}
                              isOfferCategory={category.id === "offers"}
                              isUpcomingOffer={isUpcomingOffer}
                              activeOffers={
                                isUpcomingOffer ? upcomingOffers : activeOffers
                              }
                              auth={auth}
                            />
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
            </div>

            {/* Floating Theme Customizer */}
            {showThemeCustomizer && (
              <div className="fixed bottom-6 left-4 right-4 z-50 flex flex-col gap-3 max-w-xl mx-auto">
                <div className="flex justify-end mb-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full shadow-sm bg-white/90 backdrop-blur"
                    onClick={() => setShowThemeCustomizer(false)}
                  >
                    <X size={16} className="mr-1" /> Close
                  </Button>
                </div>
                {!isCustomMode ? (
                  <div className="bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-white/50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
                      {PRESETS.map((palette, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setLocalStyles(prev => ({ ...prev, color: palette.text, backgroundColor: palette.background, accent: palette.accent }));
                          }}
                          className={`w-12 h-12 flex-shrink-0 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all shadow-sm ${localStyles.backgroundColor === palette.background && localStyles.accent === palette.accent ? "border-orange-600 scale-110 ring-2 ring-orange-100" : "border-white/50"
                            }`}
                          style={{ backgroundColor: palette.background }}
                        >
                          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: palette.accent }} />
                        </button>
                      ))}

                      <button
                        onClick={() => setIsCustomMode(true)}
                        className={`w-12 h-12 flex-shrink-0 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all shadow-sm ${isCustomMode ? "border-orange-600 scale-110 ring-2 ring-orange-100" : "border-gray-200"
                          } bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100`}
                      >
                        <Palette size={18} className="text-gray-700" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-10 fade-in duration-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setIsCustomMode(false)}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        {(['backgroundColor', 'color', 'accent'] as const).map((tab) => {
                          const label = tab === 'backgroundColor' ? 'Background' : tab === 'color' ? 'Text' : 'Accent';
                          return (
                            <button
                              key={tab}
                              onClick={() => setMobileTab(tab)}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${mobileTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="w-8" /> {/* Spacer */}
                    </div>

                    <div className="flex justify-center pb-2">
                      {/* Map mobileTab to style property */}
                      <HexColorPicker
                        color={localStyles[mobileTab] as string}
                        onChange={(c) => setLocalStyles(prev => ({ ...prev, [mobileTab]: c }))}
                        style={{ width: '100%', height: '160px' }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSaveTheme}
                  disabled={isSavingTheme}
                  className="w-full h-12 text-base rounded-full bg-green-600 hover:bg-green-700 shadow-xl"
                >
                  {isSavingTheme ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2 w-5 h-5" />}
                  Save Theme
                </Button>
              </div>
            )}

            {auth?.role === "partner" &&
              ((tableNumber !== 0 && getFeatures(hoteldata?.feature_flags || "")?.ordering.enabled) ||
                (tableNumber === 0 && getFeatures(hoteldata?.feature_flags || "")?.delivery.enabled)) ? (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md px-6 py-4 rounded-2xl bg-black text-white text-center font-semibold shadow-xl">
                Login as user to place order
              </div>
            ) : (
              <OrderDrawer
                styles={localStyles}
                hotelData={hoteldata}
                tableNumber={tableNumber}
                qrId={qrId || undefined}
                qrGroup={qrGroup}
                hasBottomNav={auth?.role === 'user'}
              />
            )}
          </>
        ) : (
          <CompactOrders hotelId={hoteldata?.id} styles={localStyles} />
        )}

        {/* Bottom Navigation for Mobile Logged-in Users */}
        {auth?.role === 'user' && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[999] px-4 py-2 flex justify-around items-center max-w-xl mx-auto"
            style={{
              backgroundColor: localStyles?.backgroundColor || "#fff",
              borderColor: localStyles?.border?.borderColor || "#e5e7eb"
            }}
          >
            <button
              onClick={() => setActiveTab('food')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'food' ? 'opacity-100' : 'opacity-50'}`}
              style={{ color: activeTab === 'food' ? localStyles?.accent : localStyles?.color }}
            >
              <Utensils size={20} />
              <span className="text-xs font-medium">Food</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'orders' ? 'opacity-100' : 'opacity-50'}`}
              style={{ color: activeTab === 'orders' ? localStyles?.accent : localStyles?.color }}
            >
              <ShoppingBag size={20} />
              <span className="text-xs font-medium">Orders</span>
            </button>
          </div>
        )}

      </main>
    </>
  );
};

export default Compact;