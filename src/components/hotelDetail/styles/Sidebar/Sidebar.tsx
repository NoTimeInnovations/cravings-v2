"use client";

import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import ThemeChangeButton, { ThemeConfig } from "../../ThemeChangeButton";
import SearchMenu from "../../SearchMenu";
import { MapPin, LayoutGrid, Phone, Search, Zap, ChevronLeft, ChevronRight, Star, Minus, Plus, Utensils, ShoppingBag, ExternalLink } from "lucide-react";
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Styles } from "@/screens/HotelMenuPage_v2";
import {
  HotelData,
  HotelDataMenus,
  SocialLinks,
} from "@/app/hotels/[...id]/page";
import { Offer } from "@/store/offerStore_hasura";
import { Category, formatDisplayName } from "@/store/categoryStore_hasura";
import { QrGroup } from "@/app/admin/qr-management/page";
import SidebarItemCard from "./SidebarItemCard";
import useOrderStore from "@/store/orderStore";
import OrderDrawer from "../../OrderDrawer";
import CompactOrders from "../Compact/CompactOrders";
import { getFeatures } from "@/lib/getFeatures";
import DiscountBanner from "../../DiscountBanner";

export interface SidebarHotelPageProps {
  styles: Styles;
  theme: ThemeConfig | null;
  open_place_order_modal: boolean;
  hoteldata: HotelData;
  socialLinks: SocialLinks;
  offers: Offer[];
  tableNumber: number;
  auth: {
    id: string;
    role: string;
  } | null;
  topItems: HotelDataMenus[];
  items: HotelDataMenus[];
  pathname: string;
  categories: Category[];
  setSelectedCategory: (category: string) => void;
  selectedCategory?: string;
  qrGroup?: QrGroup | null;
  qrId?: string | null;
  isOnFreePlan?: boolean;
}

const Sidebar = ({
  styles,
  theme,
  open_place_order_modal,
  hoteldata,
  socialLinks,
  offers,
  tableNumber,
  auth,
  topItems,
  items: initialItems,
  pathname,
  categories,
  setSelectedCategory,
  selectedCategory: selectedCategoryProp,
  qrGroup,
  qrId,
  isOnFreePlan,
}: SidebarHotelPageProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"food" | "orders">("food");
  const { addItem, removeItem, items: cartItems, setOpenPlaceOrderModal } = useOrderStore();
  const selectedCategory = selectedCategoryProp || "all";

  const showBottomNav =
    auth?.role === "user" &&
    (getFeatures(hoteldata?.feature_flags as string)?.ordering.enabled == true ||
      getFeatures(hoteldata?.feature_flags as string)?.delivery.enabled == true);
  const categorySidebarRef = useRef<HTMLDivElement>(null);

  // Reset persisted open_place_order_modal on mount (for partners who don't render OrderDrawer)
  useEffect(() => {
    if (auth?.role === "partner") {
      setOpenPlaceOrderModal(false);
    }
  }, [auth?.role, setOpenPlaceOrderModal]);

  // Swipe navigation between categories
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef(false);
  const itemsRef = useRef<HTMLDivElement>(null);
  const allCats = useMemo(() => {
    const cats = categories.filter(c => c.name !== "Offer").map(c => c.name);
    if (topItems.length > 0) {
      return ["Must Try", ...cats, "all"];
    }
    return [...cats, "all"];
  }, [categories, topItems.length]);

  // Set first category as default on mount
  useEffect(() => {
    if (allCats.length > 0 && (!selectedCategoryProp || selectedCategoryProp === "all")) {
      setSelectedCategory(allCats[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll category sidebar to keep active category visible (skip initial load)
  const hasInitialScrolled = useRef(false);
  useEffect(() => {
    if (!hasInitialScrolled.current) {
      hasInitialScrolled.current = true;
      return;
    }
    if (!categorySidebarRef.current) return;
    const activeBtn = categorySidebarRef.current.querySelector(
      `[data-category="${CSS.escape(selectedCategory)}"]`
    ) as HTMLElement | null;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedCategory]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    if (itemsRef.current) {
      itemsRef.current.style.transition = 'none';
    }
  }, []);

  // Native touchmove with { passive: false } to allow preventDefault
  // Re-run when open_place_order_modal changes because the DOM element gets unmounted/remounted
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
  }, [open_place_order_modal]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (!isDragging.current || !itemsRef.current) {
      if (itemsRef.current) {
        itemsRef.current.style.transform = '';
        itemsRef.current.style.opacity = '';
      }
      return;
    }
    const currentIdx = allCats.indexOf(selectedCategory);
    const goNext = dx < -60 && currentIdx < allCats.length - 1;
    const goPrev = dx > 60 && currentIdx > 0;

    if (goNext || goPrev) {
      itemsRef.current.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out';
      itemsRef.current.style.transform = `translateX(${dx < 0 ? '-100%' : '100%'})`;
      itemsRef.current.style.opacity = '0';
      setTimeout(() => {
        if (goNext) setSelectedCategory(allCats[currentIdx + 1]);
        else setSelectedCategory(allCats[currentIdx - 1]);
        if (itemsRef.current) {
          itemsRef.current.style.transition = 'none';
          itemsRef.current.style.transform = `translateX(${dx < 0 ? '40%' : '-40%'})`;
          itemsRef.current.style.opacity = '0';
          // Force reflow so the browser registers the initial position
          void itemsRef.current.offsetHeight;
          itemsRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
          itemsRef.current.style.transform = 'translateX(0)';
          itemsRef.current.style.opacity = '1';
        }
      }, 150);
    } else {
      itemsRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
      itemsRef.current.style.transform = 'translateX(0)';
      itemsRef.current.style.opacity = '1';
    }
    isDragging.current = false;
  }, [allCats, selectedCategory, setSelectedCategory]);

  const hasActiveOffer = (menuItemId: string) => {
    return offers.some((offer) => offer.menu && offer.menu.id === menuItemId);
  };

  const getCategoryItems = (selectedCategory: string) => {
    if (selectedCategory === "Must Try") {
      return topItems.filter(
        (item) => !hoteldata.hide_unavailable || item.is_available
      );
    }

    if (selectedCategory === "all") {
      return (
        hoteldata?.menus?.filter(
          (item) =>
            (item.category.is_active === undefined ||
              item.category.is_active === true) &&
            (!hoteldata.hide_unavailable || item.is_available)
        ) || []
      );
    }

    if (selectedCategory === "Offer") {
      const offeredItems =
        hoteldata?.menus.filter(
          (item) =>
            item.id &&
            hasActiveOffer(item.id) &&
            (item.category.is_active === undefined ||
              item.category.is_active === true) &&
            (!hoteldata.hide_unavailable || item.is_available)
        ) || [];
      return [...offeredItems].sort((a, b) => {
        if (a.image_url.length && !b.image_url.length) return -1;
        if (!a.image_url.length && b.image_url.length) return 1;
        return 0;
      });
    }

    const filteredItems = hoteldata?.menus.filter(
      (item) =>
        item.category.name === selectedCategory &&
        (item.category.is_active === undefined ||
          item.category.is_active === true) &&
        (!hoteldata.hide_unavailable || item.is_available)
    );
    return [...filteredItems].sort((a, b) => {
      if (a.image_url.length && !b.image_url.length) return -1;
      if (!a.image_url.length && b.image_url.length) return 1;
      return 0;
    });
  };

  const items = getCategoryItems(selectedCategory);
  const isOfferCategory = selectedCategory === "Offer";

  const categoryImages = useMemo(() => {
    const map: Record<string, string> = {};
    if (!hoteldata?.menus) return map;
    hoteldata.menus.forEach((item) => {
      if (
        !map[item.category.name] &&
        item.image_url &&
        item.image_url.length > 0
      ) {
        map[item.category.name] = item.image_url;
      }
    });
    return map;
  }, [hoteldata?.menus]);

  const selectedCategoryData = useMemo(() => {
    if (selectedCategory === "all") {
      return { name: "All Items", count: hoteldata?.menus?.length || 0 };
    }
    if (selectedCategory === "Must Try") {
      return { name: "Must Try", count: items.length };
    }
    const cat = categories.find((c) => c.name === selectedCategory);
    return {
      name: formatDisplayName(cat?.name || selectedCategory),
      count: items.length,
    };
  }, [selectedCategory, categories, items.length, hoteldata?.menus?.length]);

  return (
    <>
    <main
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontFamily: theme?.fontFamily || "Poppins, sans-serif",
        WebkitTapHighlightColor: "transparent",
        ...(theme?.showGrid === true && {
          backgroundImage: `linear-gradient(${styles.color}08 1px, transparent 1px), linear-gradient(90deg, ${styles.color}08 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }),
      }}
      className={`overflow-x-clip relative min-h-screen flex flex-col lg:px-[20%] ${(cartItems?.length ?? 0) > 0 ? "pb-24" : ""} ${activeTab !== "food" ? "hidden" : ""}`}
    >
      {!open_place_order_modal ? (
        <>
          <ShopClosedModalWarning
            hotelId={hoteldata?.id}
            isShopOpen={hoteldata?.is_shop_open}
          />

          {/* Banner */}
          <section className="relative">
            <div className="w-full h-[28vh] relative overflow-hidden">
              {hoteldata?.store_banner && hoteldata?.store_banner !== "" ? (
                <img
                  src={hoteldata.store_banner}
                  alt={hoteldata?.store_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: styles.accent }}
                >
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: "radial-gradient(#fff 2px, transparent 2px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <h1 className="font-handwriting text-white drop-shadow-md text-center font-bold break-words w-full text-4xl z-10 p-4">
                    {hoteldata?.store_name}
                  </h1>
                </div>
              )}
              {/* Gradient overlay at bottom of banner */}
              <div
                className="absolute bottom-0 left-0 right-0 h-28"
                style={{
                  background: `linear-gradient(to top, ${styles.backgroundColor}, transparent)`,
                }}
              />

              {/* Action icons — vertical, top-right of banner */}
              <div className="absolute top-3 right-5 z-20 grid grid-flow-col grid-rows-4 gap-1.5">
                {socialLinks.phone && socialLinks.phone !== "" && (
                  <a
                    href={`tel:${socialLinks.phone}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <Phone size={14} />
                  </a>
                )}
                {socialLinks.whatsapp && socialLinks.whatsapp !== "" && (
                  <a
                    href={socialLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <FaWhatsapp size={14} />
                  </a>
                )}
                {socialLinks.instagram && socialLinks.instagram !== "" && (
                  <a
                    href={
                      socialLinks.instagram.startsWith("http")
                        ? socialLinks.instagram
                        : `${socialLinks.instagram}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <FaInstagram size={14} />
                  </a>
                )}
                {socialLinks.facebook && socialLinks.facebook !== "" && (
                  <a
                    href={
                      socialLinks.facebook.startsWith("http")
                        ? socialLinks.facebook
                        : `https://facebook.com/${socialLinks.facebook}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <FaFacebook size={14} />
                  </a>
                )}
                {socialLinks.zomato && socialLinks.zomato !== "" && (
                  <a
                    href={socialLinks.zomato}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm text-[9px] font-bold"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                {socialLinks.uberEats && socialLinks.uberEats !== "" && (
                  <a
                    href={socialLinks.uberEats}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                {socialLinks.talabat && socialLinks.talabat !== "" && (
                  <a
                    href={socialLinks.talabat}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                {socialLinks.doordash && socialLinks.doordash !== "" && (
                  <a
                    href={socialLinks.doordash}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                {(hoteldata?.place_id || hoteldata?.geo_location?.coordinates || (socialLinks.location && socialLinks.location !== "")) && (
                  <a
                    href={
                      hoteldata?.place_id
                        ? `https://www.google.com/maps/place/?q=place_id:${hoteldata.place_id}`
                        : hoteldata?.geo_location?.coordinates
                          ? `https://www.google.com/maps?q=${hoteldata.geo_location.coordinates[1]},${hoteldata.geo_location.coordinates[0]}`
                          : socialLinks.location as string
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}
                  >
                    <MapPin size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Store info + search */}
            <div
              className="flex items-start justify-between px-5 pb-3 -mt-4 relative z-10"
              style={{ borderBottom: `1px solid ${styles.border.borderColor}` }}
            >
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  {hoteldata?.store_name}
                </h1>
                {(hoteldata?.location_details || hoteldata?.district || hoteldata?.country) && (
                  <div className="inline-flex items-center gap-1.5 text-xs opacity-60 mt-1">
                    <MapPin size={12} />
                    <span>
                      {hoteldata.location_details || hoteldata.district || hoteldata.country}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors outline-none"
                style={{ backgroundColor: `${styles.color}10`, color: styles.color }}
              >
                <Search size={14} />
              </button>
            </div>

          </section>

          {/* Search (full screen overlay triggered by icon) */}
          <SearchMenu
            hotelData={hoteldata}
            currency={hoteldata?.currency}
            styles={styles}
            menu={hoteldata.menus}
            externalOpen={isSearchOpen}
            onExternalClose={() => setIsSearchOpen(false)}
          />

          {/* Offers Banner */}
          {offers.length > 0 && (() => {
            const isWithinDeliveryTime = () => {
              if (!hoteldata?.delivery_rules?.delivery_time_allowed) return true;
              const convertTimeToMinutes = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(":").map(Number);
                return hours * 60 + minutes;
              };
              const now = new Date();
              const currentTime = now.getHours() * 60 + now.getMinutes();
              const startTime = convertTimeToMinutes(hoteldata.delivery_rules.delivery_time_allowed.from ?? "00:00");
              const endTime = convertTimeToMinutes(hoteldata.delivery_rules.delivery_time_allowed.to ?? "23:59");
              if (startTime > endTime) return currentTime >= startTime || currentTime <= endTime;
              return currentTime >= startTime && currentTime <= endTime;
            };
            const features = getFeatures(hoteldata?.feature_flags || "");
            const isDeliveryActive = hoteldata?.delivery_rules?.isDeliveryActive ?? true;
            const canOrder =
              auth?.role !== "partner" &&
              isDeliveryActive &&
              isWithinDeliveryTime() &&
              ((tableNumber !== 0 && features?.ordering.enabled) ||
                (tableNumber === 0 && features?.delivery.enabled));
            return (
            <section className="px-4 py-3">
              <div className="flex overflow-x-auto scrollbar-hide gap-3 snap-x snap-mandatory">
                {offers.map((offer) => {
                  const originalPrice = offer.variant?.price ?? offer.menu?.price ?? 0;
                  const discountPct = originalPrice > 0 && offer.offer_price != null
                    ? Math.round(((originalPrice - offer.offer_price) / originalPrice) * 100)
                    : 0;
                  const itemName = offer.variant
                    ? `${offer.menu?.name} (${offer.variant.name})`
                    : offer.menu?.name || "Special Offer";
                  const itemImage = offer.menu?.image_url;
                  const endTime = new Date(offer.end_time);
                  const now = new Date();
                  const hoursLeft = Math.max(0, Math.round((endTime.getTime() - now.getTime()) / (1000 * 60 * 60)));

                  const cartItemId = offer.variant
                    ? `${offer.menu?.id}|${offer.variant.name}`
                    : offer.menu?.id || "";
                  const cartItem = cartItems?.find((i) => i.id === cartItemId);
                  const qty = cartItem?.quantity || 0;

                  const handleAdd = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!offer.menu) return;
                    const menuItem = hoteldata?.menus?.find((m) => m.id === offer.menu?.id);
                    if (!menuItem) return;
                    if (offer.variant) {
                      addItem({
                        ...menuItem,
                        id: `${menuItem.id}|${offer.variant.name}`,
                        name: `${menuItem.name} (${offer.variant.name})`,
                        price: offer.offer_price ?? offer.variant.price,
                        variantSelections: [{
                          id: (offer.variant as any).id || offer.variant.name,
                          name: offer.variant.name,
                          price: offer.variant.price,
                          quantity: 1,
                        }],
                      });
                    } else {
                      addItem({
                        ...menuItem,
                        price: offer.offer_price ?? menuItem.price,
                        variantSelections: [],
                      });
                    }
                  };

                  const handleRemove = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (cartItemId) removeItem(cartItemId);
                  };

                  return (
                    <div
                      key={offer.id}
                      className="flex-shrink-0 w-[85%] snap-start rounded-2xl overflow-hidden relative cursor-pointer"
                      style={{
                        minHeight: "140px",
                        background: `${styles.color}08`,
                        border: `1px solid ${styles.color}12`,
                      }}
                      onClick={() => setSelectedCategory("Offer")}
                    >
                      <div className="relative flex items-center h-full">
                        {/* Text content */}
                        <div className="flex-1 p-4 flex flex-col justify-between z-10">
                          <div>
                            {/* Discount badge */}
                            {discountPct > 0 && (
                              <div
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-2"
                                style={{
                                  background: `${styles.accent}15`,
                                }}
                              >
                                <Zap size={11} style={{ color: styles.accent }} fill={styles.accent} />
                                <span
                                  className="text-[11px] font-extrabold tracking-wide"
                                  style={{ color: styles.accent }}
                                >
                                  {discountPct}% OFF
                                </span>
                              </div>
                            )}

                            {/* Item name */}
                            <p className="text-sm font-bold line-clamp-2 leading-snug mb-0.5">
                              {itemName}
                            </p>

                            {/* Prices */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {originalPrice > 0 && offer.offer_price != null && originalPrice !== offer.offer_price && (
                                <span className="text-[11px] line-through opacity-40">
                                  {hoteldata?.currency}{originalPrice}
                                </span>
                              )}
                              <span className="text-[12px] font-bold" style={{ color: styles.accent }}>
                                {hoteldata?.currency}{offer.offer_price ?? originalPrice}
                              </span>
                            </div>

                            {/* Timer */}
                            <p className="text-[10px] opacity-50 font-medium mt-0.5">
                              {hoursLeft > 0 ? `Ends in ${hoursLeft}h` : "Limited time"}
                            </p>
                          </div>

                          {/* Add / Quantity controls — hidden when ordering is off */}
                          {canOrder && (
                            qty === 0 ? (
                              <button
                                onClick={handleAdd}
                                className="mt-2 self-start px-4 py-1.5 rounded-xl text-[11px] font-bold tracking-wide active:scale-95 transition-transform"
                                style={{
                                  backgroundColor: styles.accent,
                                  color: "white",
                                }}
                              >
                                Add
                              </button>
                            ) : (
                              <div
                                className="mt-2 self-start inline-flex items-center rounded-xl overflow-hidden"
                                style={{ border: `1px solid ${styles.accent}40` }}
                              >
                                <button
                                  onClick={handleRemove}
                                  className="px-2.5 py-1.5 active:scale-95 transition-transform"
                                  style={{ color: styles.accent }}
                                >
                                  <Minus size={13} strokeWidth={2.5} />
                                </button>
                                <span
                                  className="px-2 text-[12px] font-bold min-w-[20px] text-center"
                                  style={{ color: styles.accent }}
                                >
                                  {qty}
                                </span>
                                <button
                                  onClick={handleAdd}
                                  className="px-2.5 py-1.5 active:scale-95 transition-transform"
                                  style={{ color: styles.accent }}
                                >
                                  <Plus size={13} strokeWidth={2.5} />
                                </button>
                              </div>
                            )
                          )}
                        </div>

                        {/* Item image */}
                        {itemImage && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 mr-4 shadow-sm">
                            <img
                              src={itemImage.replace("+", "%2B")}
                              alt={itemName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            );
          })()}

          {/* Discount Banner */}
          <DiscountBanner
            partnerId={hoteldata?.id || ""}
            currency={hoteldata?.currency || "₹"}
            accent={styles?.accent || "#ea580c"}
          />

          {/* Main: Category sidebar + Items grid */}
          <section className="flex relative">
            {/* Category sidebar */}
            <div
              ref={categorySidebarRef}
              className="w-[80px] flex-shrink-0 overflow-y-auto scrollbar-hidden sticky top-0 self-start max-h-[100dvh] py-2"
              style={{ backgroundColor: styles.backgroundColor }}
            >
              {/* Must Try */}
              {topItems.length > 0 && (
                <button
                  data-category="Must Try"
                  onClick={() => setSelectedCategory("Must Try")}
                  className="w-full flex flex-col items-center gap-1 py-2.5 px-1 transition-all relative outline-none"
                >
                  {selectedCategory === "Must Try" && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full"
                      style={{ backgroundColor: styles.accent }}
                    />
                  )}
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center transition-all"
                    style={{
                      backgroundColor:
                        selectedCategory === "Must Try"
                          ? styles.accent
                          : `${styles.accent}10`,
                      color: selectedCategory === "Must Try" ? "white" : styles.accent,
                      boxShadow:
                        selectedCategory === "Must Try"
                          ? `0 4px 12px ${styles.accent}40`
                          : "none",
                    }}
                  >
                    <Star size={18} strokeWidth={2} />
                  </div>
                  <span
                    className="text-[10px] font-semibold text-center leading-tight"
                    style={{
                      color: selectedCategory === "Must Try" ? styles.accent : `${styles.color}99`,
                    }}
                  >
                    Must Try
                  </span>
                </button>
              )}

              {categories.filter((c) => c.name !== "Offer").map((category) => {
                const isSelected = selectedCategory === category.name;
                const imageUrl = categoryImages[category.name];
                return (
                  <button
                    key={category.id}
                    data-category={category.name}
                    onClick={() => setSelectedCategory(category.name)}
                    className="w-full flex flex-col items-center gap-1 py-2.5 px-1 transition-all relative outline-none"
                  >
                    {isSelected && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full"
                        style={{ backgroundColor: styles.accent }}
                      />
                    )}
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 transition-all"
                      style={{
                        boxShadow: isSelected
                          ? `0 4px 12px ${styles.accent}40`
                          : "0 1px 3px rgba(0,0,0,0.08)",
                        border: isSelected
                          ? `2px solid ${styles.accent}`
                          : "2px solid transparent",
                      }}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl.replace("+", "%2B")}
                          alt={formatDisplayName(category.name)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-sm font-bold"
                          style={{
                            background: isSelected
                              ? `linear-gradient(135deg, ${styles.accent}, ${styles.accent}CC)`
                              : `linear-gradient(135deg, ${styles.accent}15, ${styles.accent}08)`,
                            color: isSelected ? "white" : styles.accent,
                          }}
                        >
                          {formatDisplayName(category.name).charAt(0)}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-medium text-center leading-tight line-clamp-2 max-w-[70px]"
                      style={{
                        color: isSelected ? styles.accent : `${styles.color}99`,
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      {formatDisplayName(category.name)}
                    </span>
                  </button>
                );
              })}

              {/* All - at bottom */}
              <button
                data-category="all"
                onClick={() => setSelectedCategory("all")}
                className="w-full flex flex-col items-center gap-1 py-2.5 px-1 transition-all relative outline-none"
              >
                {selectedCategory === "all" && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full"
                    style={{ backgroundColor: styles.accent }}
                  />
                )}
                <div
                  className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center transition-all"
                  style={{
                    backgroundColor:
                      selectedCategory === "all"
                        ? styles.accent
                        : `${styles.accent}10`,
                    color: selectedCategory === "all" ? "white" : styles.accent,
                    boxShadow:
                      selectedCategory === "all"
                        ? `0 4px 12px ${styles.accent}40`
                        : "none",
                  }}
                >
                  <LayoutGrid size={18} strokeWidth={2} />
                </div>
                <span
                  className="text-[10px] font-semibold text-center leading-tight"
                  style={{
                    color: selectedCategory === "all" ? styles.accent : `${styles.color}99`,
                  }}
                >
                  All
                </span>
              </button>
            </div>

            {/* Thin divider */}
            <div
              className="w-px self-stretch"
              style={{ backgroundColor: `${styles.border.borderColor}` }}
            />

            {/* Items area */}
            <div className="flex-1 min-w-0">
              {/* Category header */}
              <div className="px-3 pt-3 pb-2 flex items-baseline justify-between">
                <h2 className="text-lg font-bold tracking-tight">
                  {selectedCategoryData.name}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 text-[14px] font-medium opacity-70">
                    <ChevronLeft size={10} />
                    <span>Swipe</span>
                    <ChevronRight size={10} />
                  </div>
                  
                </div>
              </div>

              {/* Items grid */}
              <div className="overflow-hidden">
              <div ref={itemsRef} className="px-2 pt-2.5 pb-10 grid grid-cols-3 gap-2 content-start min-h-[90vh]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {items
                  ?.sort((a, b) => {
                    const priorityDiff =
                      (a.priority ?? 0) - (b.priority ?? 0);
                    if (priorityDiff !== 0) return priorityDiff;

                    if (
                      selectedCategory === "Offer" ||
                      selectedCategory === "offers"
                    ) {
                      const aOffers =
                        hoteldata.offers?.filter(
                          (o) => o.menu && o.menu.id === a.id
                        ) || [];
                      const bOffers =
                        hoteldata.offers?.filter(
                          (o) => o.menu && o.menu.id === b.id
                        ) || [];
                      const now = new Date();
                      const aHasUpcoming = aOffers.some(
                        (offer) => new Date(offer.start_time) > now
                      );
                      const bHasUpcoming = bOffers.some(
                        (offer) => new Date(offer.start_time) > now
                      );
                      if (aHasUpcoming && !bHasUpcoming) return -1;
                      if (!aHasUpcoming && bHasUpcoming) return 1;
                      if (aOffers.length > 0 && bOffers.length > 0) {
                        const aEarliestStart = Math.min(
                          ...aOffers.map((o) =>
                            new Date(o.start_time).getTime()
                          )
                        );
                        const bEarliestStart = Math.min(
                          ...bOffers.map((o) =>
                            new Date(o.start_time).getTime()
                          )
                        );
                        return bEarliestStart - aEarliestStart;
                      } else if (aOffers.length > 0) {
                        return -1;
                      } else if (bOffers.length > 0) {
                        return 1;
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

                    const itemOffers =
                      hoteldata.offers?.filter(
                        (o) => o.menu && o.menu.id === item.id
                      ) || [];

                    if (itemOffers.length > 0) {
                      isOfferItem = true;
                      const now = new Date();
                      upcomingOffers = itemOffers.filter(
                        (offer) => new Date(offer.start_time) > now
                      );
                      activeOffers = itemOffers.filter(
                        (offer) => new Date(offer.start_time) <= now
                      );

                      if (upcomingOffers.length > 0) {
                        isUpcomingOffer = true;
                      }

                      if (isUpcomingOffer) {
                        if (upcomingOffers.length > 1) {
                          hasMultipleVariantsOnOffer = true;
                          const lowestOfferPrice = Math.min(
                            ...upcomingOffers.map((o) => o.offer_price || 0)
                          );
                          const lowestOriginalPrice = Math.min(
                            ...upcomingOffers.map((o) =>
                              o.variant
                                ? o.variant.price
                                : o.menu?.price || 0
                            )
                          );
                          offerPrice = lowestOfferPrice;
                          oldPrice = lowestOriginalPrice;
                          if (lowestOriginalPrice > lowestOfferPrice) {
                            discountPercent = Math.round(
                              ((lowestOriginalPrice - lowestOfferPrice) /
                                lowestOriginalPrice) *
                                100
                            );
                          }
                        } else if (upcomingOffers.length === 1) {
                          const offer = upcomingOffers[0];
                          const originalPrice = offer?.variant
                            ? offer.variant.price
                            : offer?.menu?.price || item.price;
                          const futureOfferPrice =
                            typeof offer?.offer_price === "number"
                              ? offer.offer_price
                              : item.price;
                          offerPrice = futureOfferPrice;
                          oldPrice = originalPrice;
                          if (originalPrice > futureOfferPrice) {
                            discountPercent = Math.round(
                              ((originalPrice - futureOfferPrice) /
                                originalPrice) *
                                100
                            );
                          }
                        }
                      } else {
                        const offersToUse = activeOffers;
                        if (offersToUse.length > 1) {
                          hasMultipleVariantsOnOffer = true;
                          const lowestOfferPrice = Math.min(
                            ...offersToUse.map((o) => o.offer_price || 0)
                          );
                          offerPrice = lowestOfferPrice;
                          oldPrice = item.price;
                          const lowestOriginalPrice = Math.min(
                            ...offersToUse.map((o) =>
                              o.variant
                                ? o.variant.price
                                : o.menu?.price || 0
                            )
                          );
                          if (lowestOriginalPrice > lowestOfferPrice) {
                            discountPercent = Math.round(
                              ((lowestOriginalPrice - lowestOfferPrice) /
                                lowestOriginalPrice) *
                                100
                            );
                          }
                        } else if (offersToUse.length === 1) {
                          const offer = offersToUse[0];
                          offerPrice =
                            typeof offer?.offer_price === "number"
                              ? offer.offer_price
                              : item.price;
                          if (offer?.variant) {
                            oldPrice = offer.variant.price;
                          } else {
                            oldPrice =
                              typeof offer?.menu?.price === "number"
                                ? offer.menu.price
                                : item.price;
                          }
                          if (
                            typeof offer?.offer_price === "number" &&
                            oldPrice > offer.offer_price
                          ) {
                            discountPercent = Math.round(
                              ((oldPrice - offer.offer_price) / oldPrice) *
                                100
                            );
                          }
                        }
                      }
                    }

                    return (
                      <SidebarItemCard
                        hotelData={hoteldata}
                        feature_flags={hoteldata?.feature_flags}
                        currency={hoteldata?.currency}
                        key={item.id}
                        item={item}
                        styles={styles}
                        tableNumber={tableNumber}
                        isOfferItem={isOfferItem}
                        offerPrice={offerPrice}
                        oldPrice={oldPrice}
                        discountPercent={discountPercent}
                        displayName={item.name}
                        hasMultipleVariantsOnOffer={hasMultipleVariantsOnOffer}
                        currentCategory={selectedCategory}
                        isOfferCategory={isOfferCategory}
                        isUpcomingOffer={isUpcomingOffer}
                        activeOffers={
                          isUpcomingOffer ? upcomingOffers : activeOffers
                        }
                        isPartner={auth?.role === "partner"}
                      />
                    );
                  })}
              </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* Footnote */}
      {hoteldata?.footnote && !open_place_order_modal && (
        <section
          style={{
            borderTop: `${styles.border.borderWidth} ${styles.border.borderStyle} ${styles.border.borderColor}`,
            backgroundColor: `${styles.color}1D`,
          }}
          className="px-[8.5%] pt-4 pb-2 mt-4"
        >
          <div
            style={{ color: `${styles.color}9D` }}
            className="text-center text-sm"
          >
            {hoteldata?.footnote}
          </div>
        </section>
      )}

    </main>

      {activeTab === "food" ? (
        <>
          {/* Partner login banner */}
          {auth?.role === "partner" &&
            ((tableNumber !== 0 &&
              getFeatures(hoteldata?.feature_flags || "")?.ordering.enabled) ||
              (tableNumber === 0 &&
                getFeatures(hoteldata?.feature_flags || "")?.delivery.enabled)) && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md px-6 py-4 rounded-2xl bg-black text-white text-center font-semibold shadow-xl">
              Login as user to place order
            </div>
          )}

          {/* OrderDrawer */}
          {auth?.role !== "partner" && (
            <OrderDrawer
              styles={styles}
              hotelData={hoteldata}
              tableNumber={tableNumber}
              qrId={qrId || undefined}
              qrGroup={qrGroup}
              hasBottomNav={showBottomNav}
            />
          )}
        </>
      ) : (
        <CompactOrders hotelId={hoteldata?.id} styles={styles} />
      )}

      {/* Bottom Navigation for Mobile Logged-in Users */}
      {showBottomNav && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[999] px-4 py-2 flex justify-around items-center max-w-xl mx-auto"
          style={{
            backgroundColor: styles.backgroundColor || "#fff",
            borderColor: styles.border?.borderColor || "#e5e7eb",
          }}
        >
          <button
            onClick={() => setActiveTab("food")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === "food" ? "opacity-100" : "opacity-50"}`}
            style={{ color: activeTab === "food" ? styles.accent : styles.color }}
          >
            <Utensils size={20} />
            <span className="text-xs font-medium">Food</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === "orders" ? "opacity-100" : "opacity-50"}`}
            style={{ color: activeTab === "orders" ? styles.accent : styles.color }}
          >
            <ShoppingBag size={20} />
            <span className="text-xs font-medium">Orders</span>
          </button>
        </div>
      )}
    </>
  );
};

export default Sidebar;
