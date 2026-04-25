"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { MapPin, Phone, Star, ChevronRight, ShoppingBag, Search, Store, ChevronDown, LocateFixed, Loader2, X, ArrowLeft } from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { DefaultHotelPageProps } from "../Default/Default";
import { applyVisibilityState, getItemDisplayState } from "@/lib/visibility";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import V3ItemCard from "./V3ItemCard";
import OrderDrawer from "../../OrderDrawer";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { getFeatures } from "@/lib/getFeatures";
import DiscountBanner from "../../DiscountBanner";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import useOrderStore from "@/store/orderStore";
import V3SearchItems from "./V3SearchItems";
import V3Orders from "./V3Orders";
import V3AddressSheet from "./V3AddressSheet";

const V3 = ({
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
  isOnFreePlan,
  onShowStorefront,
}: DefaultHotelPageProps) => {
  const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
  const [bannerError, setBannerError] = useState(false);

  const categoryHeadersRef = useRef<(HTMLHeadingElement | null)[]>([]);
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const categoryElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hasOffers = offers && offers.length > 0;
  const { orderType, items: cartItems, userAddress } = useOrderStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  useEffect(() => {
    setBannerError(false);
  }, [hoteldata?.store_banner]);

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      let currentActiveIndex = 0;
      for (let i = 0; i < categoryHeadersRef.current.length; i++) {
        const header = categoryHeadersRef.current[i];
        if (header && header.offsetTop <= scrollPosition) {
          currentActiveIndex = i;
        } else {
          break;
        }
      }
      setActiveCatIndex((prev) => {
        if (prev !== currentActiveIndex) {
          scrollCategoryIntoView(currentActiveIndex);
          return currentActiveIndex;
        }
        return prev;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const scrollCategoryIntoView = (index: number) => {
    const container = categoriesContainerRef.current;
    if (!container) return;
    const categoryElement = categoryElementsRef.current[index];
    if (!categoryElement) return;
    const containerRect = container.getBoundingClientRect();
    const categoryRect = categoryElement.getBoundingClientRect();
    if (categoryRect.left < containerRect.left) {
      container.scrollTo({ left: container.scrollLeft + (categoryRect.left - containerRect.left) - 10, behavior: "smooth" });
    } else if (categoryRect.right > containerRect.right) {
      container.scrollTo({ left: container.scrollLeft + (categoryRect.right - containerRect.right) + 10, behavior: "smooth" });
    }
  };

  const handleCategoryClick = (index: number, category: any) => {
    setActiveCatIndex(index);
    const element = document.getElementById(`v3-cat-${category.id}`);
    if (element) {
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
    scrollCategoryIntoView(index);
  };

  const allCategoriesUnfiltered = useMemo(() => {
    let cats = [...categories];
    if (hasOffers) {
      cats = cats.filter((c) => {
        const name = c.name.toLowerCase().trim();
        return name !== "offer" && name !== "offers";
      });
      cats.push({ id: "offers", name: "Offers", priority: -2 } as any);
    }
    if (topItems && topItems.length > 0) {
      cats.push({ id: "must-try", name: "Must Try", priority: -1 } as any);
    }
    return cats.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }, [categories, hasOffers, topItems]);

  // Compute the items each category will render once. Drives both the chip
  // list (categories with zero items disappear) and the section list. Items
  // in "unavailable" state pass through with is_available forced to false so
  // they show the Unavailable badge.
  const categoriesWithItems = useMemo(() => {
    const tz = (hoteldata as any)?.timezone || "Asia/Kolkata";
    const offerMenuIdSet = new Set(offers.map((offer) => offer.menu.id));
    const hideUnav = hoteldata?.hide_unavailable;
    const result: { category: any; items: any[] }[] = [];
    for (const category of allCategoriesUnfiltered) {
      let pool: any[] = [];
      if (category.id === "offers") {
        pool = (hoteldata?.menus || []).filter((item) => offerMenuIdSet.has(item.id as string));
      } else if (category.id === "must-try") {
        pool = topItems;
      } else {
        pool = (hoteldata?.menus || []).filter((item) => item.category.id === category.id);
      }
      const items = pool
        .map((item) => {
          const state = getItemDisplayState(item as any, tz, undefined, hideUnav);
          if (state === "hidden") return null;
          return state === "unavailable" ? { ...item, is_available: false } : item;
        })
        .filter(Boolean) as any[];
      items.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      if (items.length > 0) result.push({ category, items });
    }
    return result;
  }, [allCategoriesUnfiltered, hoteldata, offers, topItems]);

  const allCategories = useMemo(() => categoriesWithItems.map((g) => g.category), [categoriesWithItems]);

  // Search input feeds off the same visibility/availability rules so hidden
  // items don't leak into search results, and unavailable items show with the
  // Unavailable badge.
  const searchableMenu = useMemo(() => {
    const tz = (hoteldata as any)?.timezone || "Asia/Kolkata";
    const hideUnav = hoteldata?.hide_unavailable;
    return (hoteldata?.menus || [])
      .map((item) => applyVisibilityState(item as any, tz, undefined, hideUnav))
      .filter(Boolean) as any[];
  }, [hoteldata]);

  const hasOrderingOrDelivery = !!(
    getFeatures(hoteldata?.feature_flags as string)?.ordering.enabled ||
    getFeatures(hoteldata?.feature_flags as string)?.delivery.enabled
  );

  const showBottomNav =
    auth?.role === "user" &&
    !open_place_order_modal &&
    (getFeatures(hoteldata?.feature_flags as string)?.ordering.enabled === true ||
      getFeatures(hoteldata?.feature_flags as string)?.delivery.enabled === true);

  // Cart count for header badge
  const cartCount = cartItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  // Banner
  const storeBanner = hoteldata?.store_banner;
  const showBanner = storeBanner && !bannerError;

  // Social links
  const phoneHref = socialLinks?.phone ? `tel:${socialLinks.phone}` : null;
  const whatsappHref = socialLinks?.whatsapp || null;
  const instagramHref = socialLinks?.instagram || null;
  const mapHref = hoteldata?.place_id
    ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${hoteldata.place_id}`
    : hoteldata?.geo_location?.coordinates
      ? `https://www.google.com/maps?q=${hoteldata.geo_location.coordinates[1]},${hoteldata.geo_location.coordinates[0]}`
      : null;
  const reviewHref = socialLinks?.googleReview || null;
  const hasContacts = phoneHref || whatsappHref || mapHref || instagramHref || reviewHref;

  // Outlet info for header
  const outletName = hoteldata?.store_name || "Outlet";
  const locationText = hoteldata?.location_details || hoteldata?.district || hoteldata?.country || "";

  return (
    <div
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      className="min-h-screen bg-white antialiased"
    >
      <main className="max-w-2xl mx-auto relative pb-24">
        <ShopClosedModalWarning hotelId={hoteldata?.id} isShopOpen={hoteldata?.is_shop_open} />

        {/* ===== STICKY HEADER (exact cravings-v3 style) ===== */}
        <header className="sticky top-0 z-40 w-full border-b border-gray-200/60 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
            {onShowStorefront && (
              <button
                onClick={onShowStorefront}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <ArrowLeft className="h-[18px] w-[18px] text-gray-900" />
              </button>
            )}
            {/* Left: Location/Outlet info */}
            <button
              onClick={() => { if (orderType !== "takeaway" && tableNumber === 0) setAddressSheetOpen(true); }}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              {orderType === "takeaway" || tableNumber !== 0 ? (
                <Store className="h-4 w-4 shrink-0 text-gray-900" />
              ) : (
                <MapPin className="h-4 w-4 shrink-0 text-gray-900" />
              )}
              <div className="min-w-0 leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {orderType === "takeaway" || tableNumber !== 0 ? "Pickup from" : "Deliver to"}
                </p>
                <p className="truncate text-sm font-bold text-gray-900">
                  {orderType === "takeaway" || tableNumber !== 0
                    ? outletName
                    : userAddress || "Add delivery address"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            </button>

            {/* Right: Search icon + Shopping bag icon */}
            <div className="ml-auto flex items-center gap-0.5">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <Search className="h-[18px] w-[18px] text-gray-900" />
              </button>
              <button
                onClick={() => setOrdersOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <ShoppingBag className="h-[18px] w-[18px] text-gray-900" />
              </button>
            </div>
          </div>
        </header>

        {/* Search modal - rendered outside header to avoid backdrop-blur stacking context issues */}
        {searchOpen && (
          <V3SearchItems
            menu={searchableMenu}
            hoteldata={hoteldata}
            tableNumber={tableNumber}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {/* ===== HERO SECTION - Compact (same as cravings-v3) ===== */}
        <section className="px-4 pt-3">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {showBanner ? (
                isVideoUrl(storeBanner) ? (
                  <video
                    src={storeBanner}
                    poster={getVideoThumbnailUrl(storeBanner)}
                    preload="metadata"
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={storeBanner}
                    alt={hoteldata?.store_name}
                    className="h-full w-full object-cover"
                    onError={() => setBannerError(true)}
                  />
                )
              ) : (
                <span className="text-2xl">🍽️</span>
              )}
            </div>

            {/* Name + tagline */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {hoteldata?.store_name}
              </h1>
              {((hoteldata as any)?.store_tagline || locationText) && (
                <p className="truncate text-[11px] text-gray-400">
                  {(hoteldata as any)?.store_tagline || locationText}
                </p>
              )}
            </div>
          </div>

          {/* Contact row - all icons black */}
          {hasContacts && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
              {phoneHref && (
                <a href={phoneHref} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition">
                  <Phone className="h-4 w-4 text-gray-900" />
                </a>
              )}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition">
                  <FaWhatsapp size={16} className="text-gray-900" />
                </a>
              )}
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition">
                  <MapPin className="h-4 w-4 text-gray-900" />
                </a>
              )}
              {instagramHref && (
                <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition">
                  <FaInstagram size={16} className="text-gray-900" />
                </a>
              )}
              {reviewHref && (
                <a href={reviewHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition">
                  <Star className="h-4 w-4 text-gray-900" />
                </a>
              )}
            </div>
          )}
        </section>

        {/* Discount Banner */}
        <DiscountBanner
          partnerId={hoteldata?.id || ""}
          currency={hoteldata?.currency || "₹"}
          accent="#059669"
        />

        {/* Announcement */}
        {hoteldata?.delivery_rules?.announcement && (
          <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2 ring-1 ring-blue-100">
            <span className="text-base">📢</span>
            <p className="flex-1 truncate text-[11px] font-bold text-blue-800">{hoteldata.delivery_rules.announcement}</p>
          </div>
        )}

        {/* Category pills - sticky below header */}
        <div className="sticky top-14 z-20 mt-3 border-b border-gray-200/60 bg-white/90 backdrop-blur-xl">
          <div
            ref={categoriesContainerRef}
            className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide"
          >
            {allCategories.map((category, index) => (
              <div
                key={category.id}
                ref={(el) => { categoryElementsRef.current[index] = el; }}
                onClick={() => handleCategoryClick(index, category)}
                className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition ${
                  activeCatIndex === index
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }`}
              >
                {formatDisplayName(category.name)}
              </div>
            ))}
          </div>
        </div>

        {/* Menu sections */}
        <div className="px-4">
          {categoriesWithItems.map(({ category, items: itemsToDisplay }, index) => {
            return (
              <section
                key={category.id}
                id={`v3-cat-${category.id}`}
                className="scroll-mt-28 pt-4"
              >
                <div
                  ref={(el) => { categoryHeadersRef.current[index] = el; }}
                  className="flex items-center gap-2"
                >
                  <h2 className="text-sm font-extrabold tracking-tight text-gray-900">
                    {formatDisplayName(category.name)}
                  </h2>
                  <span className="text-[11px] text-gray-400">
                    ({itemsToDisplay.length})
                  </span>
                </div>

                <div className="divide-y divide-gray-200/60">
                  {itemsToDisplay.map((item) => {
                    const itemOffers = offers?.filter((offer) => offer.menu.id === item.id) || [];
                    let offerData: any = undefined;
                    let hasMultipleVariantsOnOffer = false;
                    let isUpcomingOffer = false;
                    let activeOffers: any[] = [];
                    let upcomingOffers: any[] = [];

                    if (itemOffers.length > 0) {
                      const now = new Date();
                      upcomingOffers = itemOffers.filter((offer) => new Date(offer.start_time) > now);
                      activeOffers = itemOffers.filter((offer) => new Date(offer.start_time) <= now);

                      if (upcomingOffers.length > 0) isUpcomingOffer = true;

                      if (isUpcomingOffer) {
                        if (upcomingOffers.length > 1) {
                          hasMultipleVariantsOnOffer = true;
                          const lowestOfferPrice = Math.min(...upcomingOffers.map((o) => o.offer_price || 0));
                          const lowestOriginalPrice = Math.min(...upcomingOffers.map((o) => o.variant ? o.variant.price : o.menu?.price || 0));
                          offerData = { ...upcomingOffers[0], offer_price: lowestOriginalPrice, menu: { ...upcomingOffers[0].menu, price: lowestOfferPrice } };
                        } else if (upcomingOffers.length === 1) {
                          const offer = upcomingOffers[0];
                          const originalPrice = offer?.variant ? offer.variant.price : offer?.menu?.price || item.price;
                          const futureOfferPrice = typeof offer?.offer_price === "number" ? offer.offer_price : item.price;
                          offerData = { ...offer, offer_price: originalPrice, menu: { ...offer.menu, price: futureOfferPrice } };
                        }
                      } else {
                        const offersToUse = activeOffers;
                        if (offersToUse.length > 1) {
                          hasMultipleVariantsOnOffer = true;
                          const lowestOfferPrice = Math.min(...offersToUse.map((o) => o.offer_price || 0));
                          offerData = { ...offersToUse[0], offer_price: lowestOfferPrice };
                        } else if (offersToUse.length === 1) {
                          offerData = offersToUse[0];
                        }
                      }
                    }

                    return (
                      <V3ItemCard
                        key={item.id}
                        item={item}
                        styles={styles}
                        hoteldata={hoteldata}
                        offerData={offerData}
                        feature_flags={hoteldata?.feature_flags}
                        tableNumber={tableNumber}
                        hasMultipleVariantsOnOffer={hasMultipleVariantsOnOffer}
                        allItemOffers={hasMultipleVariantsOnOffer ? itemOffers : undefined}
                        currentCategory={category.id}
                        isOfferCategory={category.id === "offers"}
                        isUpcomingOffer={isUpcomingOffer}
                        activeOffers={isUpcomingOffer ? upcomingOffers : activeOffers}
                        auth={auth}
                      />
                    );
                  })}
                </div>

                {itemsToDisplay.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">No items available.</p>
                )}
              </section>
            );
          })}

          <p className="py-4 text-center text-[10px] text-gray-400">{hoteldata?.store_name}</p>
        </div>

        {/* Order Drawer only - single floating cart button */}
        {auth?.role === "partner" &&
          ((tableNumber !== 0 && getFeatures(hoteldata?.feature_flags || "")?.ordering.enabled) ||
            (tableNumber === 0 && getFeatures(hoteldata?.feature_flags || "")?.delivery.enabled)) ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md px-6 py-4 rounded-2xl bg-black text-white text-center font-semibold shadow-xl">
            Login as user to place order
          </div>
        ) : (
          <OrderDrawer
            styles={{ backgroundColor: "#ffffff", color: "#000000", accent: "#059669", border: { borderColor: "#0000001D", borderWidth: "1px", borderStyle: "solid" } }}
            hotelData={hoteldata}
            tableNumber={tableNumber}
            qrId={qrId || undefined}
            qrGroup={qrGroup}
            hasBottomNav={showBottomNav}
            v3Style
          />
        )}
        {/* Address bottom sheet */}
        {addressSheetOpen && (
          <V3AddressSheet
            currentAddress={userAddress || ""}
            onSelect={(addr, coords) => {
              if (addr) {
                useOrderStore.getState().setUserAddress(addr);
                if (coords) useOrderStore.getState().setUserCoordinates(coords);
              }
              setAddressSheetOpen(false);
            }}
            onClose={() => setAddressSheetOpen(false)}
            accent={styles?.accent}
          />
        )}

        {/* Orders overlay */}
        {ordersOpen && (
          <V3Orders hotelId={hoteldata?.id || ""} onClose={() => setOrdersOpen(false)} />
        )}
      </main>
    </div>
  );
};

export default V3;
