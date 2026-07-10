"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MapPin, ShoppingBag, Search, ChevronDown, ChevronUp,
  ArrowLeft, User, MoreVertical, Info,
} from "lucide-react";
import { DefaultHotelPageProps } from "../Default/Default";
import { applyVisibilityState, getItemDisplayState } from "@/lib/visibility";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import V5ItemCard from "./V5ItemCard";
import OrderDrawer, { calculateDeliveryDistanceAndCost } from "../../OrderDrawer";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import DiscountBanner from "../../DiscountBanner";
import useOrderStore from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
// V5 reuses V3's search / orders / address sheets verbatim — they are
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

type VegFilter = "all" | "veg" | "nonveg";

// Height of the sticky top bar (back · search · more). The filter-chip row
// sticks directly beneath it, so section jump offsets must clear both.
const TOPBAR_H = 60;

// 24h "HH:MM" -> "h:MM AM/PM".
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

const V5 = ({
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
  const [vegFilter, setVegFilter] = useState<VegFilter>("all");

  // Accordion: which category sections are manually toggled open/closed. A
  // category not present here falls back to its default (only the FIRST group —
  // "Recommended" — is open by default; every other category is collapsed).
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const stickyRef = useRef<HTMLDivElement>(null);
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
  const [moreOpen, setMoreOpen] = useState(false);
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
      // Recompute delivery distance/charge for the NEW location — without this
      // the storefront kept showing the previous address's values. Reuse the
      // address's already-validated road distance when present.
      void calculateDeliveryDistanceAndCost(
        hoteldata as any,
        c,
        saved.deliveryDistanceKm ?? null,
      );
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
  }, [authUser, savedAddresses, hoteldata]);

  // Category list. "Must Try" is surfaced FIRST and relabelled "Recommended"
  // (priority -3 sorts it ahead of Offers and every real category).
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
      cats.push({ id: "must-try", name: "Recommended", priority: -3 } as any);
    }
    return cats.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }, [categories, hasOffers, topItems]);

  // Items per category, after visibility rules (same machinery as V3 / V4).
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
      // Respect the partner's "hide unavailable" toggle in EVERY section,
      // including "Recommended" — when it's on, unavailable bestsellers are
      // hidden too (previously must-try forced this off and leaked them).
      const hideUnavForCat = hideUnav;
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

  // Apply the VEG / NON-VEG quick filter.
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

  const cycleVegFilter = (target: VegFilter) =>
    setVegFilter((f) => (f === target ? "all" : target));

  // Accordion helpers — the first group defaults to open, the rest collapsed.
  const isOpen = (catId: string, index: number) => openMap[catId] ?? index === 0;
  const toggleCat = (catId: string, index: number) => {
    const currentlyOpen = isOpen(catId, index);
    setOpenMap((prev) => ({ ...prev, [catId]: !currentlyOpen }));
    // When opening a collapsed lower section, bring its header into view.
    if (!currentlyOpen) {
      requestAnimationFrame(() => {
        const el = sectionRefs.current[catId];
        if (el) {
          // Clear both sticky layers: the top bar (TOPBAR_H) and the filter
          // chip row beneath it (headerH).
          const top = el.getBoundingClientRect().top + window.pageYOffset - TOPBAR_H - headerH - 8;
          window.scrollTo({ top, behavior: "smooth" });
        }
      });
    }
  };

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

        {/* ===== TOP BAR: back (left) · search + more (right) ===== */}
        <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-2.5">
          {(onShowStorefront || brandHeader?.onChange) ? (
            <button
              onClick={onShowStorefront || brandHeader?.onChange}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50"
              aria-label="Back"
            >
              <ArrowLeft className="h-[19px] w-[19px]" />
            </button>
          ) : (
            <span className="h-10 w-10 shrink-0" />
          )}

          <div className="relative flex shrink-0 items-center gap-2">
            {(authUser as any)?.role === "user" && (
              <LoyaltyPointsBadge
                partnerId={(hoteldata as any)?.id}
                currency={(hoteldata as any)?.currency || "₹"}
                storeName={(hoteldata as any)?.store_name}
              />
            )}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-10 items-center gap-2 rounded-full bg-gray-50 px-4 text-left ring-1 ring-gray-200 transition hover:bg-gray-100"
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px] text-gray-700" strokeWidth={2.2} />
              <span className="text-[14px] font-medium text-gray-600">Search</span>
            </button>
            <button
              onClick={() => setMoreOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50"
              aria-label="More options"
            >
              <MoreVertical className="h-[19px] w-[19px]" />
            </button>

            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-xl">
                  {(authUser as any)?.role === "user" && (
                    <Link
                      href={username ? `/${username}/user-profile` : "/user-profile"}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <User className="h-4 w-4 text-gray-500" />
                      Profile
                    </Link>
                  )}
                  {username ? (
                    <Link
                      href={`/${username}/my-orders`}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <ShoppingBag className="h-4 w-4 text-gray-500" />
                      Your orders
                    </Link>
                  ) : (
                    <button
                      onClick={() => { setMoreOpen(false); setOrdersOpen(true); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <ShoppingBag className="h-4 w-4 text-gray-500" />
                      Your orders
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===== RESTAURANT IDENTITY: name + info, then location ===== */}
        {hoteldata?.store_name && (
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-extrabold leading-none tracking-[-0.02em] text-gray-900">
                {hoteldata?.store_name}
              </h1>
              <Info className="h-[18px] w-[18px] shrink-0 text-gray-400" strokeWidth={1.9} />
            </div>
            {locationText && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[15px] font-medium text-gray-600">
                <MapPin className="h-[18px] w-[18px] shrink-0 text-gray-500" strokeWidth={1.9} />
                <span className="truncate">{locationText}</span>
              </div>
            )}
          </div>
        )}

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
          variant="summary"
        />

        {/* Grey separator band above the filters (matches the source). */}
        <div className="mt-3 h-2 bg-gray-100" />

        {/* ===== STICKY VEG / NON-VEG FILTERS ===== */}
        <div ref={stickyRef} className="sticky top-[60px] z-30 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-2.5">
            <FilterChip
              label="Veg"
              active={vegFilter === "veg"}
              dot="#16a34a"
              onClick={() => cycleVegFilter("veg")}
            />
            <FilterChip
              label="Non-veg"
              active={vegFilter === "nonveg"}
              dot="#dc2626"
              triangle
              onClick={() => cycleVegFilter("nonveg")}
            />
          </div>
        </div>

        {/* ===== BODY: accordion category sections ===== */}
        {groups.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-gray-400">No items available.</p>
        ) : (
          <div className="px-4">
            {groups.map(({ category, items: itemsToDisplay }, index) => {
              const open = isOpen(category.id, index);
              return (
                <section
                  key={category.id}
                  ref={(el) => { sectionRefs.current[category.id] = el; }}
                  style={{ scrollMarginTop: TOPBAR_H + headerH + 12 }}
                  className="border-b-[6px] border-gray-100 last:border-b-0"
                >
                  <button
                    onClick={() => toggleCat(category.id, index)}
                    className="flex w-full items-center justify-between py-4 text-left"
                  >
                    <h2 className="text-[18px] font-extrabold tracking-tight text-gray-900">
                      {category.id === "must-try"
                        ? "Recommended for you"
                        : formatDisplayName(category.name)}
                      {category.id !== "must-try" && (
                        <span className="ml-1.5 text-[15px] font-bold text-gray-400">
                          ({itemsToDisplay.length})
                        </span>
                      )}
                    </h2>
                    {open ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" />
                    )}
                  </button>

                  {open && (
                    <div className="divide-y divide-gray-100 pb-2">
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
                          <V5ItemCard
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
                  )}
                </section>
              );
            })}

            <p className="py-6 text-center text-[10px] text-gray-400">{hoteldata?.store_name}</p>
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

        {/* Floating cart button / order drawer */}
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
                if (coords) {
                  useOrderStore.getState().setUserCoordinates(coords);
                  useLocationStore.getState().setCoords(coords);
                  // Recompute distance/charge for the newly chosen address.
                  void calculateDeliveryDistanceAndCost(hoteldata as any, coords);
                }
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

// Zomato-style veg / non-veg filter chip.
function FilterChip({
  label,
  active,
  dot,
  triangle,
  onClick,
}: {
  label: string;
  active: boolean;
  dot: string;
  triangle?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 transition ${
        active ? "" : "border-gray-200 bg-white"
      }`}
      style={active ? { borderColor: dot, backgroundColor: `${dot}14` } : undefined}
    >
      <span
        className="flex h-[16px] w-[16px] items-center justify-center rounded-[3px] border-[1.5px]"
        style={{ borderColor: dot }}
      >
        {triangle ? (
          <span
            style={{
              width: 0,
              height: 0,
              borderLeft: "3.5px solid transparent",
              borderRight: "3.5px solid transparent",
              borderBottom: `6px solid ${dot}`,
            }}
          />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
        )}
      </span>
      <span className={`text-[13px] font-semibold ${active ? "text-gray-900" : "text-gray-600"}`}>
        {label}
      </span>
    </button>
  );
}

export default V5;
