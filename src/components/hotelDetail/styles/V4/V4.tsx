"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MapPin, Phone, Star, ShoppingBag, Search, Store, ChevronDown,
  ArrowLeft, User, Clock, Sparkles, Tag, UtensilsCrossed,
} from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { DefaultHotelPageProps } from "../Default/Default";
import { applyVisibilityState, getItemDisplayState } from "@/lib/visibility";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import V4ItemCard from "./V4ItemCard";
import OrderDrawer from "../../OrderDrawer";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import DiscountBanner from "../../DiscountBanner";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import useOrderStore from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
// V4 reuses V3's search / orders / address sheets verbatim — they are
// layout-agnostic overlays, so there's no need to fork them.
import V3SearchItems from "../V3/V3SearchItems";
import V3Orders from "../V3/V3Orders";
import V3AddressSheet from "../V3/V3AddressSheet";
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
import { readableTextColor } from "@/lib/brandColor";

type VegFilter = "all" | "veg" | "nonveg";

// Core layout dimensions applied via inline styles (not Tailwind arbitrary
// classes) so they are guaranteed to render at a fixed size in every
// environment — keeps the hero banner, category rail and thumbnails stable.
const HERO_HEIGHT = 288;
const RAIL_WIDTH = 84;
const RAIL_THUMB = 52;

// 24h "HH:MM" -> "h:MM AM/PM" (mirrors DeliveryTimeCampain's formatter).
function formatTo12Hour(timeStr?: string): string | null {
  if (!timeStr) return null;
  const [hoursStr, minutes] = timeStr.split(":");
  const hours24 = parseInt(hoursStr, 10);
  if (isNaN(hours24)) return null;
  const ampm = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  hours12 = hours12 ? hours12 : 12;
  return `${hours12}:${minutes ?? "00"} ${ampm}`;
}

// Full-bleed hero background: a single static image, or a swipeable carousel
// when more than one banner is uploaded. Supports finger-drag (the track
// follows the finger and snaps on release), auto-advance, infinite looping and
// tappable dots. Overlay content (name, hours, contacts) is layered on top by
// the caller, so it stays fixed while the images slide underneath.
function HeroSlides({ images }: { images: string[] }) {
  const isMultiple = images.length > 1;
  const count = images.length;
  // Clone last->front and first->end so the loop wraps seamlessly.
  const extended = useMemo(
    () => (isMultiple ? [images[count - 1], ...images, images[0]] : images),
    [images, count, isMultiple],
  );
  const [index, setIndex] = useState(isMultiple ? 1 : 0);
  const [transitioning, setTransitioning] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef(0);
  const deltaX = useRef(0);
  const realIndex = isMultiple ? (index - 1 + count) % count : 0;

  const resetAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (!isMultiple) return;
    autoRef.current = setInterval(() => {
      setTransitioning(true);
      setIndex((p) => p + 1);
    }, 3500);
  }, [isMultiple]);

  useEffect(() => {
    resetAuto();
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [resetAuto]);

  // Jump (without animation) from a cloned edge back onto the real slide.
  useEffect(() => {
    if (!isMultiple) return;
    if (index === 0 || index === count + 1) {
      const t = setTimeout(() => {
        setTransitioning(false);
        setIndex(index === 0 ? count : 1);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [index, count, isMultiple]);

  // Re-enable the transition on the frame after a no-animation snap.
  useEffect(() => {
    if (!transitioning) {
      const t = setTimeout(() => setTransitioning(true), 50);
      return () => clearTimeout(t);
    }
  }, [transitioning]);

  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden"
        onTouchStart={
          isMultiple
            ? (e) => {
                touchX.current = e.touches[0].clientX;
                deltaX.current = 0;
                if (autoRef.current) clearInterval(autoRef.current);
              }
            : undefined
        }
        onTouchMove={
          isMultiple
            ? (e) => {
                deltaX.current = e.touches[0].clientX - touchX.current;
                if (trackRef.current) {
                  const w = trackRef.current.parentElement?.offsetWidth || 0;
                  trackRef.current.style.transition = "none";
                  trackRef.current.style.transform = `translateX(${-index * w + deltaX.current}px)`;
                }
              }
            : undefined
        }
        onTouchEnd={
          isMultiple
            ? () => {
                setTransitioning(true);
                if (trackRef.current) {
                  trackRef.current.style.transition = "";
                  trackRef.current.style.transform = "";
                }
                if (deltaX.current < -50) setIndex((p) => p + 1);
                else if (deltaX.current > 50) setIndex((p) => p - 1);
                resetAuto();
              }
            : undefined
        }
      >
        <div
          ref={trackRef}
          className="flex h-full w-full"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: transitioning ? "transform 500ms ease-in-out" : "none",
          }}
        >
          {extended.map((url, i) => (
            <div key={i} className="relative h-full w-full flex-shrink-0">
              {isVideoUrl(url) ? (
                <video
                  src={url}
                  poster={getVideoThumbnailUrl(url)}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  role="img"
                  aria-label={`Banner ${i + 1}`}
                  className="absolute inset-0 bg-center bg-cover bg-no-repeat"
                  style={{ backgroundImage: `url("${url}")` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      {isMultiple && (
        <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => { setTransitioning(true); setIndex(i + 1); resetAuto(); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: realIndex === i ? 16 : 6,
                height: 6,
                backgroundColor: realIndex === i ? "#ffffff" : "rgba(255,255,255,0.55)",
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

const V4 = ({
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
  const accent = styles.accent || "#E9701B";
  // Text/icon color that stays readable on top of the brand accent (white on
  // dark brand colors, near-black on light ones). Used by the hours pill.
  const onAccent = readableTextColor(accent);
  const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
  const [vegFilter, setVegFilter] = useState<VegFilter>("all");

  const categoryHeadersRef = useRef<(HTMLElement | null)[]>([]);
  const railContainerRef = useRef<HTMLDivElement>(null);
  const railItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const stickyRef = useRef<HTMLDivElement>(null);

  // Sticky-header height is measured live so the category rail sticks flush
  // beneath it and scroll-spy offsets stay correct even when the optional
  // delivery row changes the header's height.
  const [headerH, setHeaderH] = useState(60);
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const update = () => setHeaderH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasOffers = offers && offers.length > 0;
  const { orderType, items: cartItems, userAddress } = useOrderStore();
  const { userData: authUser } = useAuthStore();
  const username = (hoteldata as any)?.username as string | undefined;
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

  // Items per category, after visibility rules. Same machinery as V3.
  const baseGroups = useMemo(() => {
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
      const hideUnavForCat = category.id === "must-try" ? false : hideUnav;
      const catItems = pool
        .map((item) => {
          const state = getItemDisplayState(item as any, tz, undefined, hideUnavForCat);
          if (state === "hidden") return null;
          return state === "unavailable" ? { ...item, is_available: false } : item;
        })
        .filter(Boolean) as any[];
      catItems.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      if (catItems.length > 0) result.push({ category, items: catItems });
    }
    return result;
  }, [allCategoriesUnfiltered, hoteldata, offers, topItems]);

  // Apply the VEG / NON-VEG quick filter. Categories left with no matching
  // items drop out of both the rail and the list.
  const groups = useMemo(() => {
    if (vegFilter === "all") return baseGroups;
    return baseGroups
      .map((g) => ({
        category: g.category,
        items: g.items.filter((it) =>
          vegFilter === "veg" ? it.is_veg === true : it.is_veg === false,
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [baseGroups, vegFilter]);

  const searchableMenu = useMemo(() => {
    const tz = (hoteldata as any)?.timezone || "Asia/Kolkata";
    const hideUnav = hoteldata?.hide_unavailable;
    return (hoteldata?.menus || [])
      .map((item) => applyVisibilityState(item as any, tz, undefined, hideUnav))
      .filter(Boolean) as any[];
  }, [hoteldata]);

  const features = getFeatures(hoteldata?.feature_flags as string);
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
    (features?.ordering.enabled === true || features?.delivery.enabled === true);

  const cartCount = cartItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  // Hero banner images: prefer the carousel banners; fall back to the single
  // store banner. One image renders static, multiple auto-cycle.
  const carouselBanners: string[] = (deliveryRules?.carousel_banners as string[]) || [];
  const heroImages = useMemo(() => {
    if (carouselBanners.length > 0) return carouselBanners.slice(0, 5);
    if (hoteldata?.store_banner) return [hoteldata.store_banner];
    return [] as string[];
  }, [carouselBanners, hoteldata?.store_banner]);

  // Open-hours pill — delivery window first, then takeaway window.
  const hoursWindow =
    deliveryRules?.delivery_time_allowed || deliveryRules?.takeaway_time_allowed;
  const openFrom = formatTo12Hour(hoursWindow?.from);
  const openTo = formatTo12Hour(hoursWindow?.to);
  const showHours = !!openFrom && !!openTo;

  const phoneHref = socialLinks?.phone ? `tel:${socialLinks.phone}` : null;
  const whatsappHref = socialLinks?.whatsapp || null;
  const instagramHref = socialLinks?.instagram || null;
  const mapHref = getPartnerMapsUrl(hoteldata);
  const reviewHref = socialLinks?.googleReview || null;
  const hasContacts = phoneHref || whatsappHref || mapHref || instagramHref || reviewHref;

  const outletName = hoteldata?.store_name || "Outlet";
  const locationText = hoteldata?.location_details || hoteldata?.district || hoteldata?.country || "";

  const hideStoreIdentity =
    (!!features?.newonboarding?.enabled || !!brandHeader) && tableNumber === 0;

  // ----- Scroll-spy: highlight the rail category whose section is in view -----
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + headerH + 40;
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
          scrollRailIntoView(currentActiveIndex);
          return currentActiveIndex;
        }
        return prev;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [groups, headerH]);

  const scrollRailIntoView = (index: number) => {
    const container = railContainerRef.current;
    const el = railItemsRef.current[index];
    if (!container || !el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    if (eRect.top < cRect.top) {
      container.scrollTo({ top: container.scrollTop + (eRect.top - cRect.top) - 8, behavior: "smooth" });
    } else if (eRect.bottom > cRect.bottom) {
      container.scrollTo({ top: container.scrollTop + (eRect.bottom - cRect.bottom) + 8, behavior: "smooth" });
    }
  };

  const handleCategoryClick = (index: number, category: any) => {
    setActiveCatIndex(index);
    const element = document.getElementById(`v4-cat-${category.id}`);
    if (element) {
      const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - headerH - 12;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
    scrollRailIntoView(index);
  };

  const cycleVegFilter = () =>
    setVegFilter((f) => (f === "all" ? "veg" : f === "veg" ? "nonveg" : "all"));
  const vegMeta =
    vegFilter === "veg"
      ? { label: "VEG", dot: "#16a34a", text: "text-emerald-700", ring: "border-emerald-300" }
      : vegFilter === "nonveg"
        ? { label: "NON-VEG", dot: "#dc2626", text: "text-red-700", ring: "border-red-300" }
        : { label: "ALL", dot: "#9ca3af", text: "text-gray-700", ring: "border-gray-200" };

  // Rail thumbnail for a group: first item image, else a fallback icon.
  const railThumb = (group: { category: any; items: any[] }) => {
    const img = group.items.find((i) => i.image_url)?.image_url as string | undefined;
    if (img) return { type: "image" as const, src: img };
    if (group.category.id === "offers") return { type: "icon" as const, icon: <Tag className="h-5 w-5" /> };
    if (group.category.id === "must-try" || /special|chef/i.test(group.category.name))
      return { type: "icon" as const, icon: <Sparkles className="h-5 w-5" /> };
    return { type: "icon" as const, icon: <UtensilsCrossed className="h-5 w-5" /> };
  };

  const railCategories = groups.map((g) => g.category);

  return (
    <div
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      className="no-image-save min-h-screen bg-white antialiased"
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).tagName === "IMG") e.preventDefault();
      }}
    >
      <PullToRefresh />
      <main className="max-w-2xl mx-auto relative pb-24">
        <ShopClosedModalWarning
          hotelId={hoteldata?.id}
          isShopOpen={hoteldata?.is_shop_open}
          partnerPhone={hoteldata?.phone ?? null}
          partnerName={hoteldata?.store_name ?? null}
        />

        {/* ===== HERO BANNER (full-width image / carousel + overlay) =====
            Height is pinned with an inline style (not a Tailwind arbitrary
            class) so the hero always has a real height and the banner — which
            fills it via absolute positioning — is never collapsed to zero. */}
        <section className="relative w-full overflow-hidden bg-gray-900" style={{ height: HERO_HEIGHT }}>
          {heroImages.length > 0 ? (
            <HeroSlides images={heroImages} />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${accent}, #111827)` }}
            />
          )}
          {/* Legibility gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/35" />

          {/* Top row: back + profile/orders */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-3">
            {(onShowStorefront || brandHeader?.onChange) ? (
              <button
                onClick={onShowStorefront || brandHeader?.onChange}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
            ) : (
              <span />
            )}

            {(authUser as any)?.role === "user" && (
              <div className="flex items-center gap-1.5">
                <LoyaltyPointsBadge
                  partnerId={(hoteldata as any)?.id}
                  currency={(hoteldata as any)?.currency || "₹"}
                  storeName={(hoteldata as any)?.store_name}
                />
                <Link
                  href={username ? `/${username}/user-profile` : "/user-profile"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
                  aria-label="Profile"
                >
                  <User className="h-[18px] w-[18px]" />
                </Link>
                {username ? (
                  <Link
                    href={`/${username}/my-orders`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
                    aria-label="Your orders"
                  >
                    <ShoppingBag className="h-[18px] w-[18px]" />
                  </Link>
                ) : (
                  <button
                    onClick={() => setOrdersOpen(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
                    aria-label="Your orders"
                  >
                    <ShoppingBag className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom overlay: name + hours (left), contacts (right). Extra
              bottom padding keeps the content clear of the white sheet that
              rises over the banner below. */}
          {!hideStoreIdentity && (
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 px-5 pb-12">
              <div className="min-w-0 flex-1">
                <h1
                  className={`truncate font-extrabold leading-tight text-white drop-shadow-md${
                    (hoteldata as any)?.username === "nila" ? " font-tango-bt" : ""
                  }`}
                  style={
                    (hoteldata as any)?.username === "nila"
                      ? { fontSize: 27 }
                      : { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 27 }
                  }
                >
                  {hoteldata?.store_name}
                </h1>
                {((hoteldata as any)?.store_tagline || locationText) && (
                  <p className="mt-0.5 truncate text-xs font-medium text-white/85 drop-shadow">
                    {(hoteldata as any)?.store_tagline || locationText}
                  </p>
                )}
                {showHours && (
                  <div
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm"
                    style={{ backgroundColor: accent, color: onAccent }}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-[13px] font-bold">
                      {openFrom} - {openTo}
                    </span>
                  </div>
                )}
              </div>

              {hasContacts && (
                <div className="flex shrink-0 items-center gap-2">
                  {phoneHref && (
                    <a href={phoneHref} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/60">
                      <Phone className="h-[18px] w-[18px]" />
                    </a>
                  )}
                  {whatsappHref && (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/60">
                      <FaWhatsapp size={18} />
                    </a>
                  )}
                  {instagramHref && (
                    <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/60">
                      <FaInstagram size={18} />
                    </a>
                  )}
                  {mapHref && (
                    <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/60">
                      <MapPin className="h-[18px] w-[18px]" />
                    </a>
                  )}
                  {reviewHref && (
                    <a href={reviewHref} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/60">
                      <Star className="h-[18px] w-[18px]" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ===== STICKY SEARCH + VEG FILTER (measured for rail offset) =====
            The negative top margin + rounded top makes this panel rise over the
            banner like a sheet; once scrolled it sticks flat to the top. */}
        <div ref={stickyRef} className="sticky top-0 z-40 -mt-6 rounded-t-[28px] border-b border-gray-200/70 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
          {/* Optional delivery / pickup address row */}
          {showAppbarLocation && (
            <button
              onClick={() => { if (orderType !== "takeaway" && tableNumber === 0) setAddressSheetOpen(true); }}
              className="flex w-full items-center gap-2 px-5 pt-3 text-left"
            >
              {isPickupMode ? (
                <Store className="h-4 w-4 shrink-0 text-gray-900" />
              ) : (
                <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
              )}
              <div className="min-w-0 leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {isPickupMode ? "Pickup from" : "Deliver to"}
                </span>
                <p
                  className="truncate text-xs font-bold"
                  style={{ color: isPickupMode ? "#111827" : accent }}
                >
                  {isPickupMode ? outletName : userAddress || "Add delivery address"}
                </p>
              </div>
              {!isPickupMode && <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
            </button>
          )}

          <div className="flex items-center gap-2 px-5 py-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-12 flex-1 items-center gap-2.5 rounded-full bg-gray-100 px-4 text-left text-gray-400 transition hover:bg-gray-200/70"
            >
              <Search className="h-[18px] w-[18px] text-gray-400" />
              <span className="text-sm">Search items...</span>
            </button>
            <button
              onClick={cycleVegFilter}
              className={`flex h-12 shrink-0 items-center gap-2 rounded-full border bg-white px-4 transition ${vegMeta.ring}`}
              aria-label="Filter by veg / non-veg"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: vegMeta.dot }} />
              <span className={`text-xs font-bold ${vegMeta.text}`}>{vegMeta.label}</span>
            </button>
          </div>
        </div>

        {/* Announcement */}
        {deliveryRules?.announcement && (
          <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2 ring-1 ring-blue-100">
            <span className="text-base">📢</span>
            <p className="flex-1 truncate text-[11px] font-bold text-blue-800">{deliveryRules.announcement}</p>
          </div>
        )}

        <DiscountBanner
          partnerId={hoteldata?.id || ""}
          currency={hoteldata?.currency || "₹"}
          accent="#059669"
        />

        {/* ===== BODY: left category rail + right item list ===== */}
        {groups.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-gray-400">No items available.</p>
        ) : (
          <div className="flex items-start">
            {/* Left vertical category rail */}
            <aside
              ref={railContainerRef}
              className="sticky z-20 shrink-0 self-start overflow-y-auto border-r border-gray-200/70 bg-white scrollbar-hide"
              style={{ top: headerH, width: RAIL_WIDTH, maxHeight: `calc(100vh - ${headerH}px)` }}
            >
              <div className="flex flex-col py-1">
                {railCategories.map((category, index) => {
                  const isActive = activeCatIndex === index;
                  const thumb = railThumb(groups[index]);
                  return (
                    <button
                      key={category.id}
                      ref={(el) => { railItemsRef.current[index] = el; }}
                      onClick={() => handleCategoryClick(index, category)}
                      className="relative flex flex-col items-center gap-1.5 px-1.5 py-3 text-center transition"
                    >
                      {/* Active accent bar */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 h-9 w-1 -translate-y-1/2 rounded-r-full"
                          style={{ backgroundColor: accent }}
                        />
                      )}
                      <div
                        className={`flex items-center justify-center overflow-hidden rounded-2xl transition ${
                          isActive ? "ring-2" : "ring-1"
                        }`}
                        style={{ width: RAIL_THUMB, height: RAIL_THUMB, ["--tw-ring-color" as any]: isActive ? accent : `${accent}40` } as React.CSSProperties}
                      >
                        {thumb.type === "image" ? (
                          <img
                            src={thumb.src}
                            alt={category.name}
                            className="h-full w-full object-cover transition"
                          />
                        ) : (
                          <span
                            className="flex h-full w-full items-center justify-center"
                            style={{
                              backgroundColor: isActive ? `${accent}1A` : `${accent}0D`,
                              color: accent,
                            }}
                          >
                            {thumb.icon}
                          </span>
                        )}
                      </div>
                      <span
                        className={`line-clamp-2 text-[10px] font-bold leading-tight ${
                          isActive ? "" : "text-gray-500"
                        }`}
                        style={isActive ? { color: accent } : undefined}
                      >
                        {formatDisplayName(category.name)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right item list */}
            <div className="min-w-0 flex-1 px-4">
              {groups.map(({ category, items: itemsToDisplay }, index) => (
                <section
                  key={category.id}
                  id={`v4-cat-${category.id}`}
                  style={{ scrollMarginTop: headerH + 12 }}
                  className="pt-4"
                >
                  <div
                    ref={(el) => { categoryHeadersRef.current[index] = el; }}
                    className="flex items-center justify-between border-b border-gray-200/70 pb-2"
                  >
                    <h2 className="flex items-center gap-1.5 text-base font-extrabold tracking-tight text-gray-900">
                      {formatDisplayName(category.name)}
                      {(category.id === "must-try" || /special|chef/i.test(category.name)) && (
                        <Sparkles className="h-4 w-4" style={{ color: accent }} />
                      )}
                    </h2>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {itemsToDisplay.length} {itemsToDisplay.length === 1 ? "Item" : "Items"}
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
                        <V4ItemCard
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
                </section>
              ))}

              <p className="py-6 text-center text-[10px] text-gray-400">{hoteldata?.store_name}</p>
            </div>
          </div>
        )}

        {/* Search modal */}
        {searchOpen && (
          <V3SearchItems
            menu={searchableMenu}
            hoteldata={hoteldata}
            tableNumber={tableNumber}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {/* Floating cart button (V3 style) */}
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
            accent={accent}
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

        {/* Address picker (map + save) */}
        <AddressPickerV2
          open={addressPickerOpen}
          onClose={() => {
            setAddressPickerOpen(false);
            setPickerInitial(null);
          }}
          onSaved={(saved) => {
            setAddressPickerOpen(false);
            setPickerInitial(null);
            persistDeliveryAddress(saved);
          }}
          hotelData={hoteldata}
          accent={accent}
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

export default V4;
