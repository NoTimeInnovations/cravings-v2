"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { MapPin, Phone, Star, ShoppingBag, Search, Store, ChevronDown, X, ArrowLeft, User } from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { DefaultHotelPageProps } from "../Default/Default";
import { applyVisibilityState, getItemDisplayState } from "@/lib/visibility";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import V3ItemCard from "./V3ItemCard";
import OrderDrawer from "../../OrderDrawer";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import DiscountBanner from "../../DiscountBanner";
import { DefaultBannerCarousel } from "../Default/HotelBanner";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import useOrderStore from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import V3SearchItems from "./V3SearchItems";
import V3Orders from "./V3Orders";
import V3AddressSheet from "./V3AddressSheet";
import { isCustomDomainHost } from "@/lib/domain-utils";
import type { SavedAddress } from "../../placeOrder/AddressManagementModal";
import AddressPickerV2 from "../../placeOrder/AddressPickerV2";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserAddressesMutation } from "@/api/auth";
import { upsertLocalAddress } from "@/lib/localAddresses";
import { toast } from "sonner";
import { useLocationStore } from "@/store/geolocationStore";
import PullToRefresh from "@/components/PullToRefresh";
import { LoyaltyPointsBadge } from "@/components/loyalty/LoyaltyPointsBadge";
import { getPartnerMapsUrl } from "@/lib/getPartnerMapsUrl";

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
  brandHeader,
}: DefaultHotelPageProps) => {
  const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
  const [bannerError, setBannerError] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);

  const categoryHeadersRef = useRef<(HTMLHeadingElement | null)[]>([]);
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const categoryElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hasOffers = offers && offers.length > 0;
  const { orderType, items: cartItems, userAddress } = useOrderStore();
  const { userData: authUser } = useAuthStore();
  // Restaurant username — used to build the restaurant-scoped profile/orders
  // route (/<username>/user-profile) so those screens survive a reload.
  const username = (hoteldata as any)?.username as string | undefined;
  // On a custom domain the storefront is served at root, so partner-scoped
  // routes must be root-relative (`/user-profile`) — the `/<username>` prefix
  // would 404 (the proxy re-prefixes it to `/<username>/<username>/…`). Detected
  // after mount to avoid an SSR hydration mismatch.
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  useEffect(() => setIsCustomDomain(isCustomDomainHost()), []);
  const scopedBase = isCustomDomain ? "" : username ? `/${username}` : "";
  const savedAddresses = useMemo(
    () => ((authUser as any)?.addresses || []) as SavedAddress[],
    [(authUser as any)?.addresses],
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<
    { address?: string; coords: { lat: number; lng: number } } | null
  >(null);

  // Persist a fully-detailed delivery address (after the receiver/location form)
  // and set it as the current delivery address.
  const persistDeliveryAddress = useCallback(async (saved: SavedAddress) => {
    const fullAddress =
      saved.address ||
      [saved.flat_no, saved.house_no, saved.area, saved.city].filter(Boolean).join(", ");
    useOrderStore.getState().setUserAddress(fullAddress);
    if (saved.latitude != null && saved.longitude != null) {
      const c = { lat: saved.latitude, lng: saved.longitude };
      useOrderStore.getState().setUserCoordinates(c);
      useLocationStore.getState().setCoords(c);
    }
    // Save locally with a fresh timestamp so it shows newest-first (survives
    // reload + works for guests).
    const stamped = { ...saved, savedAt: Date.now() };
    upsertLocalAddress(stamped, Date.now());
    if (authUser && (authUser as any).role === "user") {
      const existing = [...savedAddresses];
      const idx = existing.findIndex((x) => x.id === stamped.id);
      if (idx >= 0) existing[idx] = stamped;
      else existing.push(stamped);
      try {
        await fetchFromHasura(updateUserAddressesMutation, {
          id: authUser.id,
          addresses: existing,
        });
        useAuthStore.setState({
          userData: { ...(authUser as any), addresses: existing } as any,
        });
        toast.success("Address saved");
      } catch {
        toast.error("Failed to save address");
      }
    }
  }, [authUser, savedAddresses]);

  useEffect(() => {
    setBannerError(false);
  }, [hoteldata?.store_banner]);

  const bannerLogo = useMemo(() => {
    const raw = (hoteldata as any)?.storefront_settings;
    let parsed: any = null;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      parsed = null;
    }
    const bl = parsed?.bannerLogo;
    const rawScale = typeof bl?.scale === "number" ? bl.scale : 100;
    // Clamp matches the admin setting range (50%–500%). Keep in sync with
    // BANNER_LOGO_SCALE_MIN/MAX in GeneralSettings.
    const scale = Math.min(5, Math.max(0.5, rawScale / 100));
    const bgColor = typeof bl?.bgColor === "string" && bl.bgColor ? bl.bgColor : null;
    return { scale, bgColor };
  }, [(hoteldata as any)?.storefront_settings]);

  // V3 menu-header display info (rating / delivery time / approx cost / cuisines)
  // stored under storefront_settings.menuInfo. Falls back to the design's sample
  // values so the info strip always renders; editable in Store Settings →
  // "Menu header (V3 menu)".
  const menuInfo = useMemo(() => {
    const raw = (hoteldata as any)?.storefront_settings;
    let parsed: any = null;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      parsed = null;
    }
    const mi = parsed?.menuInfo || {};
    const pick = (v: any, fallback: string) =>
      v != null && String(v).trim() ? String(v).trim() : fallback;
    return {
      rating: pick(mi.rating, "4.5"),
      ratingCount: pick(mi.ratingCount, "12.4k"),
      deliveryTime: pick(mi.deliveryTime, "20-30 min"),
      costForOne: pick(mi.costForOne, "200"),
      cuisines: pick(mi.cuisines, ""),
    };
  }, [(hoteldata as any)?.storefront_settings]);

  // Highest discount across live offers — powers the "N% OFF" offer strip.
  const maxOfferPct = useMemo(() => {
    if (!offers?.length) return 0;
    let max = 0;
    for (const o of offers as any[]) {
      const orig = o?.variant?.price ?? o?.menu?.price;
      const off = o?.offer_price;
      if (typeof orig === "number" && typeof off === "number" && orig > 0 && orig > off) {
        max = Math.max(max, Math.round(((orig - off) / orig) * 100));
      }
    }
    return max;
  }, [offers]);

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
      // Top/bestseller items stay visible in "Must Try" even when the partner
      // hides unavailable items — they show the Unavailable badge instead of
      // disappearing, so the curated highlight always surfaces at the top.
      const hideUnavForCat = category.id === "must-try" ? false : hideUnav;
      const items = pool
        .map((item) => {
          const state = getItemDisplayState(item as any, tz, undefined, hideUnavForCat);
          if (state === "hidden") return null;
          return state === "unavailable" ? { ...item, is_available: false } : item;
        })
        .filter(Boolean) as any[];
      items.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      if (items.length > 0) result.push({ category, items });
    }
    return result;
  }, [allCategoriesUnfiltered, hoteldata, offers, topItems]);

  // Veg-only filter (design's Veg toggle) — drops non-veg items and any category
  // left empty. Chip list and section list stay index-aligned for scroll-spy.
  const displayGroups = useMemo(() => {
    if (!vegOnly) return categoriesWithItems;
    return categoriesWithItems
      .map((g) => ({ category: g.category, items: g.items.filter((it: any) => it.is_veg === true) }))
      .filter((g) => g.items.length > 0);
  }, [categoriesWithItems, vegOnly]);

  const allCategories = useMemo(() => displayGroups.map((g) => g.category), [displayGroups]);

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

  const features = getFeatures(hoteldata?.feature_flags as string);
  const hasOrderingOrDelivery = !!(features?.ordering.enabled || features?.delivery.enabled);
  const deliveryRules = (hoteldata as any)?.delivery_rules;
  const isDeliveryActive = deliveryRules?.isDeliveryActive ?? true;
  const deliveryWithinTime = isWithinTimeWindow(deliveryRules?.delivery_time_allowed);
  const takeawayWithinTime = isWithinTimeWindow(deliveryRules?.takeaway_time_allowed);
  const isDeliveryAvailable = !!features?.delivery.enabled && isDeliveryActive && deliveryWithinTime;
  const isTakeawayAvailable = !!features?.ordering.enabled && takeawayWithinTime;
  const isPickupMode = orderType === "takeaway" || tableNumber !== 0;
  const showAppbarLocation = isPickupMode ? isTakeawayAvailable : isDeliveryAvailable;

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
  const carouselBanners: string[] = (hoteldata as any)?.delivery_rules?.carousel_banners || [];

  // The store identity (logo/name/contacts) is surfaced earlier in the flow —
  // on the order-type screen when onboarding is on, and on the brand's
  // onboarding/outlet-picker for multi-outlet brands (brandHeader is set for
  // both the parent brand and its child outlets). Hide it from the menu page in
  // those cases so it isn't repeated, including on secondary outlets whose own
  // feature_flags may not carry the onboarding flag.
  const hideStoreIdentity =
    (!!features?.newonboarding?.enabled || !!brandHeader) && tableNumber === 0;

  // View-only menus (no ordering AND no delivery) don't need the top navbar —
  // its only useful control there is search (location/profile/orders are all
  // hidden). When the hero is on screen, drop the navbar and surface search
  // inside the hero instead. (If the identity is hidden, keep the navbar so
  // search + back stay reachable.)
  const showHeroSearch = !hasOrderingOrDelivery && !hideStoreIdentity;

  // Social links
  const phoneHref = socialLinks?.phone ? `tel:${socialLinks.phone}` : null;
  const whatsappHref = socialLinks?.whatsapp || null;
  const instagramHref = socialLinks?.instagram || null;
  const mapHref = getPartnerMapsUrl(hoteldata);
  const reviewHref = socialLinks?.googleReview || null;
  const hasContacts = phoneHref || whatsappHref || mapHref || instagramHref || reviewHref;

  // Outlet info for header
  const outletName = hoteldata?.store_name || "Outlet";
  const locationText = hoteldata?.location_details || hoteldata?.district || hoteldata?.country || "";

  return (
    <div
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      className="no-image-save min-h-screen bg-[#f4f4f2] antialiased"
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).tagName === "IMG") e.preventDefault();
      }}
    >
      <PullToRefresh />
      <main className="max-w-2xl mx-auto relative bg-[#f4f4f2] pb-24">
        <ShopClosedModalWarning
          hotelId={hoteldata?.id}
          isShopOpen={hoteldata?.is_shop_open}
          partnerPhone={hoteldata?.phone ?? null}
          partnerName={hoteldata?.store_name ?? null}
        />

        {/* ===== STICKY HEADER (exact cravings-v3 style) — hidden on view-only
            menus, where search moves into the hero (see showHeroSearch) ===== */}
        {!showHeroSearch && (
        <header className="sticky top-0 z-40 w-full border-b border-gray-200/60 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
            {(onShowStorefront || brandHeader?.onChange) && (
              <button
                onClick={onShowStorefront || brandHeader?.onChange}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <ArrowLeft className="h-[18px] w-[18px] text-gray-900" />
              </button>
            )}
            {/* Left: Location/Outlet info — only when the matching feature is enabled */}
            {showAppbarLocation ? (
              <button
                onClick={() => { if (orderType !== "takeaway" && tableNumber === 0) setAddressSheetOpen(true); }}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                {isPickupMode ? (
                  <Store className="h-4 w-4 shrink-0 text-gray-900" />
                ) : (
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: styles.accent }} />
                )}
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {isPickupMode ? "Pickup from" : "Deliver to"}
                  </p>
                  <p
                    className="truncate text-sm font-bold"
                    style={{ color: isPickupMode ? "#111827" : styles.accent }}
                  >
                    {isPickupMode ? (
                      <span translate="no" className="notranslate">{outletName}</span>
                    ) : (
                      userAddress || "Add delivery address"
                    )}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {/* Right: Profile icon + Shopping bag icon (search lives in the sticky bar) */}
            <div className="ml-auto flex items-center gap-0.5">
              {/* Profile + Orders only for logged-in customers.
                  Use the live auth store (authUser) rather than the server
                  `auth` snapshot, which can be stale after a client-side
                  logout / from the router cache. */}
              {(authUser as any)?.role === "user" && (
                <>
                  <LoyaltyPointsBadge
                    partnerId={(hoteldata as any)?.id}
                    currency={(hoteldata as any)?.currency || "₹"}
                    storeName={(hoteldata as any)?.store_name}
                  />
                  <Link
                    href={`${scopedBase}/user-profile`}
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition"
                    aria-label="Profile"
                  >
                    <User className="h-[18px] w-[18px] text-gray-900" />
                  </Link>
                  {/* Orders open the restaurant-scoped orders route so they
                      persist on reload; fall back to the in-page modal only
                      when there is no username to route to. */}
                  {username ? (
                    <Link
                      href={`${scopedBase}/my-orders`}
                      className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition"
                      aria-label="Your orders"
                    >
                      <ShoppingBag className="h-[18px] w-[18px] text-gray-900" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => setOrdersOpen(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition"
                      aria-label="Your orders"
                    >
                      <ShoppingBag className="h-[18px] w-[18px] text-gray-900" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </header>
        )}

        {/* Search modal - rendered outside header to avoid backdrop-blur stacking context issues */}
        {searchOpen && (
          <V3SearchItems
            menu={searchableMenu}
            hoteldata={hoteldata}
            tableNumber={tableNumber}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {/* ===== HERO — cover photo (banner) + name/cuisine overlay ===== */}
        {!hideStoreIdentity && (
        <section>
          <div
            className="relative h-[230px] w-full overflow-hidden"
            style={{ background: bannerLogo.bgColor || "#1a1a1a" }}
          >
            {showBanner ? (
              isVideoUrl(storeBanner) ? (
                <video
                  src={storeBanner}
                  poster={getVideoThumbnailUrl(storeBanner)}
                  preload="metadata"
                  muted
                  playsInline
                  autoPlay
                  loop
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
              <div className="flex h-full w-full items-center justify-center text-6xl">🍽️</div>
            )}
            {/* gradient overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 34%,rgba(0,0,0,.72) 100%)",
              }}
            />
            {/* name + cuisine */}
            <div className="absolute inset-x-4 bottom-3.5 text-white">
              <h1
                translate="no"
                className={`notranslate text-[25px] font-extrabold leading-tight tracking-[-.02em]${
                  (hoteldata as any)?.username === "nila" ? " font-tango-bt" : ""
                }`}
              >
                {hoteldata?.store_name}
              </h1>
              {(menuInfo.cuisines || (hoteldata as any)?.store_tagline || locationText) && (
                <p className="mt-0.5 text-[12.5px] opacity-90">
                  {menuInfo.cuisines || (hoteldata as any)?.store_tagline || locationText}
                </p>
              )}
            </div>
          </div>

          {/* info strip — rating / delivery time / approx cost */}
          <div className="relative z-[2] mx-3 -mt-px flex items-center rounded-[14px] bg-white px-4 py-3.5 shadow-[0_6px_22px_-12px_rgba(0,0,0,.22)]">
            <div className="flex-1 text-center">
              <div
                className="inline-flex items-center gap-1 rounded-md px-[7px] py-[3px] text-[13px] font-extrabold text-white"
                style={{ background: "#267e3e" }}
              >
                {menuInfo.rating}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff">
                  <path d="M12 2l2.9 6.3 6.8.6-5.1 4.6 1.5 6.7L12 17.3 5.9 20.8l1.5-6.7L2.3 8.9l6.8-.6z" />
                </svg>
              </div>
              <div className="mt-[5px] text-[10.5px] font-semibold text-[#828282]">{menuInfo.ratingCount} ratings</div>
            </div>
            <div className="h-9 w-px bg-[#f0f0ee]" />
            <div className="flex-1 text-center">
              <div className="text-[14px] font-extrabold text-[#2d2d2d]">{menuInfo.deliveryTime}</div>
              <div className="mt-[5px] text-[10.5px] font-semibold text-[#828282]">Delivery time</div>
            </div>
            <div className="h-9 w-px bg-[#f0f0ee]" />
            <div className="flex-1 text-center">
              <div className="text-[14px] font-extrabold text-[#2d2d2d]">
                {hoteldata?.currency || "₹"}{menuInfo.costForOne}
                <span className="text-[10px] font-extrabold"> for one</span>
              </div>
              <div className="mt-[5px] text-[10.5px] font-semibold text-[#828282]">Approx cost</div>
            </div>
          </div>

          {/* offer strip — only when real offers exist */}
          {hasOffers && (
            <button
              onClick={() => {
                const el = document.getElementById("v3-cat-offers");
                if (el) {
                  const y = el.getBoundingClientRect().top + window.pageYOffset - 120;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
              className="mx-3 mt-3 flex items-center gap-[11px] rounded-[12px] border border-dashed px-3.5 py-3 text-left"
              style={{ borderColor: "#f0b3b3", background: "linear-gradient(100deg,#fff 60%,#fff2f0)" }}
            >
              <div
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: "#fdecec" }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#cb202d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.6 13.4L11 3.8V3H3.8v7.2h.8l9.6 9.6a2 2 0 0 0 2.8 0l3.6-3.6a2 2 0 0 0 0-2.8Z" />
                  <circle cx="7.5" cy="7.5" r="1.2" fill="#cb202d" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-extrabold text-[#2d2d2d]">
                  {maxOfferPct > 0 ? `${maxOfferPct}% OFF` : "Offers available"}
                </div>
                <div className="mt-px text-[11px] text-[#828282]">
                  Auto-applied on select items · <b style={{ color: "#cb202d" }}>Tap to view</b>
                </div>
              </div>
            </button>
          )}

          {/* Contact row */}
          {hasContacts && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-3 pb-0.5">
              {phoneHref && (
                <a href={phoneHref} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition">
                  <Phone className="h-4 w-4 text-gray-900" />
                </a>
              )}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition">
                  <FaWhatsapp size={16} className="text-gray-900" />
                </a>
              )}
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition">
                  <MapPin className="h-4 w-4 text-gray-900" />
                </a>
              )}
              {instagramHref && (
                <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition">
                  <FaInstagram size={16} className="text-gray-900" />
                </a>
              )}
              {reviewHref && (
                <a href={reviewHref} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition">
                  <Star className="h-4 w-4 text-gray-900" />
                </a>
              )}
            </div>
          )}
        </section>
        )}

        {/* Full-width banner carousel (shown when banners are uploaded) */}
        {carouselBanners.length > 0 && (
          <section className="px-4 pt-3">
            <DefaultBannerCarousel banners={carouselBanners} accent={styles.accent || "#ea580c"} />
          </section>
        )}

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

        {/* Sticky control bar: Veg toggle + Search + category pills */}
        <div className={`sticky ${showHeroSearch ? "top-0" : "top-14"} z-20 mt-1 bg-[#f4f4f2] px-3 pb-2 pt-3.5`}>
          <div className="flex items-center gap-2.5">
            {/* Veg toggle */}
            <button
              onClick={() => setVegOnly((v) => !v)}
              className="flex shrink-0 items-center gap-2 rounded-[10px] border border-[#ececea] bg-white px-3 py-2"
              aria-pressed={vegOnly}
            >
              <span
                className="relative h-5 w-[34px] rounded-[11px] transition-colors"
                style={{ background: vegOnly ? "#0f8a45" : "#d5d5d5" }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                  style={{ left: vegOnly ? "16px" : "2px" }}
                />
              </span>
              <span className="text-[12.5px] font-bold text-[#2d2d2d]">Veg</span>
            </button>
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex flex-1 items-center gap-2 rounded-[10px] border border-[#ececea] bg-white px-3 py-[9px] text-left"
              aria-label="Search menu"
            >
              <Search className="h-4 w-4 text-[#a3a3a3]" strokeWidth={2.2} />
              <span className="text-[12.5px] text-[#a3a3a3]">Search in menu</span>
            </button>
          </div>
          {/* category pills */}
          <div
            ref={categoriesContainerRef}
            className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide"
          >
            {allCategories.map((category, index) => {
              const active = activeCatIndex === index;
              return (
                <div
                  key={category.id}
                  ref={(el) => { categoryElementsRef.current[index] = el; }}
                  onClick={() => handleCategoryClick(index, category)}
                  className="shrink-0 cursor-pointer rounded-[20px] px-3.5 py-[7px] text-[12.5px] font-bold transition"
                  style={{
                    background: active ? "#cb202d" : "#fff",
                    color: active ? "#fff" : "#5a5a5a",
                    border: `1px solid ${active ? "#cb202d" : "#e4e4e2"}`,
                  }}
                >
                  {formatDisplayName(category.name)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu sections */}
        <div className="px-3 pt-0.5">
          {displayGroups.map(({ category, items: itemsToDisplay }, index) => {
            return (
              <section
                key={category.id}
                id={`v3-cat-${category.id}`}
                className="scroll-mt-28 pt-3.5"
              >
                <div
                  ref={(el) => { categoryHeadersRef.current[index] = el; }}
                  className="mx-0.5 mb-2.5 mt-0.5 flex items-center gap-2.5"
                >
                  <span className="text-[13px] font-extrabold tracking-[.2px] text-[#2d2d2d]">
                    {formatDisplayName(category.name)}{" "}
                    <span className="text-[#a3a3a3]">({itemsToDisplay.length})</span>
                  </span>
                  <span
                    className="h-px flex-1"
                    style={{ background: "linear-gradient(90deg,#ddd,transparent)" }}
                  />
                </div>

                <div className="divide-y divide-[#ececea]">
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

          <p translate="no" className="notranslate py-5 text-center text-[11px] font-semibold tracking-[.3px] text-[#b5b5b5]">{hoteldata?.store_name}</p>
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
            styles={styles}
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
            brandHeader={brandHeader}
            partnerId={hoteldata?.id}
            savedAddresses={savedAddresses}
            onDeleteSaved={async (id) => {
              if (!authUser || (authUser as any).role !== "user") return;
              const updated = savedAddresses.filter((a) => a.id !== id);
              try {
                await fetchFromHasura(updateUserAddressesMutation, {
                  id: authUser.id,
                  addresses: updated,
                });
                useAuthStore.setState({
                  userData: { ...(authUser as any), addresses: updated } as any,
                });
                toast.success("Address deleted");
              } catch {
                toast.error("Failed to delete address");
              }
            }}
            onSelect={(addr, coords) => {
              if (addr) {
                useOrderStore.getState().setUserAddress(addr);
                if (coords) useOrderStore.getState().setUserCoordinates(coords);
              }
              setAddressSheetOpen(false);
            }}
            onPickForMap={(addr, coords) => {
              setAddressSheetOpen(false);
              if (coords) {
                setPickerInitial({ address: addr, coords });
              } else {
                setPickerInitial(null);
              }
              setAddressPickerOpen(true);
            }}
            onAddNew={() => {
              // Open the map picker straight on the interactive map (search +
              // draggable pin), seeded with the current location so it skips the
              // "turn on device location" landing screen.
              setAddressSheetOpen(false);
              const coords = useOrderStore.getState().coordinates;
              if (userAddress?.trim() && coords) {
                setPickerInitial({ address: userAddress, coords });
              } else {
                setPickerInitial(null);
              }
              setAddressPickerOpen(true);
            }}
            onClose={() => setAddressSheetOpen(false)}
            accent={styles.accent}
            partnerCoords={
              Array.isArray((hoteldata?.geo_location as any)?.coordinates)
                ? {
                    lat: (hoteldata!.geo_location as any).coordinates[1],
                    lng: (hoteldata!.geo_location as any).coordinates[0],
                  }
                : null
            }
          />
        )}

        {/* Address Picker (map + save) */}
        <AddressPickerV2
          open={addressPickerOpen}
          onClose={() => {
            setAddressPickerOpen(false);
            setPickerInitial(null);
          }}
          onSaved={(saved) => {
            // Header picks a LOCATION only — no receiver/building fields here.
            // Those are collected at checkout (before Place Order) if missing.
            setAddressPickerOpen(false);
            setPickerInitial(null);
            persistDeliveryAddress(saved);
          }}
          hotelData={hoteldata}
          accent="#ea580c"
          initialPick={pickerInitial}
        />

        {/* Orders overlay */}
        {ordersOpen && (
          <V3Orders hotelId={hoteldata?.id || ""} onClose={() => setOrdersOpen(false)} />
        )}
      </main>
    </div>
  );
};

export default V3;
