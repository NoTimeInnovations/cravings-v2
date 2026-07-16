"use client";
import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag, Search, ArrowLeft, User, ChevronDown,
  Home as HomeIcon, LayoutGrid, ClipboardList,
} from "lucide-react";
import { DefaultHotelPageProps } from "../Default/Default";
import { applyVisibilityState, getItemDisplayState } from "@/lib/visibility";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import V6ItemCard from "./V6ItemCard";
import V6CategoryTile from "./V6CategoryTile";
import V6BannerCarousel from "./V6BannerCarousel";
import { V6_FONT } from "./v6utils";
import OrderDrawer from "../../OrderDrawer";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import useOrderStore from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
// V6 reuses V3's search / orders / address sheets verbatim — they are
// layout-agnostic overlays, so there is no need to fork them.
import V3SearchItems from "../V3/V3SearchItems";
import V3Orders from "../V3/V3Orders";
import type { SavedAddress } from "../../placeOrder/AddressManagementModal";
import OrderTypeLocationSheet, { type OrderTypeKey } from "@/components/onboarding/OrderTypeLocationSheet";
import { setSessionOrderType } from "@/lib/onboardingSession";
import { setOnboardingDataCookie } from "@/app/auth/actions";
import { parseOrderTypesEnabled, parsePrebookingSettings } from "@/lib/prebooking";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserAddressesMutation } from "@/api/auth";
import { toast } from "sonner";
import { useLocationStore } from "@/store/geolocationStore";
import PullToRefresh from "@/components/PullToRefresh";
import { LoyaltyPointsBadge } from "@/components/loyalty/LoyaltyPointsBadge";
import { readableTextColor } from "@/lib/brandColor";

type View = "home" | "categories" | "items";

// Resolve the active-offer / upcoming-offer metadata for one item — mirrors the
// per-item offer computation used by V5 so pricing + variant behaviour match.
function getOfferMeta(item: any, offers: any[]) {
  const itemOffers = offers?.filter((offer) => offer.menu.id === item.id) || [];
  let offerData: any = undefined;
  let hasMultipleVariantsOnOffer = false;
  let isUpcomingOffer = false;

  if (itemOffers.length > 0) {
    const now = new Date();
    const upcoming = itemOffers.filter((o) => new Date(o.start_time) > now);
    const active = itemOffers.filter((o) => new Date(o.start_time) <= now);
    if (upcoming.length > 0) isUpcomingOffer = true;

    if (isUpcomingOffer) {
      if (upcoming.length > 1) {
        hasMultipleVariantsOnOffer = true;
        const lowestOfferPrice = Math.min(...upcoming.map((o) => o.offer_price || 0));
        const lowestOriginalPrice = Math.min(...upcoming.map((o) => (o.variant ? o.variant.price : o.menu?.price || 0)));
        offerData = { ...upcoming[0], offer_price: lowestOriginalPrice, menu: { ...upcoming[0].menu, price: lowestOfferPrice } };
      } else {
        const offer = upcoming[0];
        const originalPrice = offer?.variant ? offer.variant.price : offer?.menu?.price || item.price;
        const futureOfferPrice = typeof offer?.offer_price === "number" ? offer.offer_price : item.price;
        offerData = { ...offer, offer_price: originalPrice, menu: { ...offer.menu, price: futureOfferPrice } };
      }
    } else if (active.length > 1) {
      hasMultipleVariantsOnOffer = true;
      const lowestOfferPrice = Math.min(...active.map((o) => o.offer_price || 0));
      offerData = { ...active[0], offer_price: lowestOfferPrice };
    } else if (active.length === 1) {
      offerData = active[0];
    }
  }

  return {
    offerData,
    hasMultipleVariantsOnOffer,
    allItemOffers: hasMultipleVariantsOnOffer ? itemOffers : undefined,
    isUpcomingOffer,
  };
}

const V6 = ({
  styles,
  hoteldata,
  offers,
  tableNumber,
  auth,
  topItems,
  categories,
  qrGroup,
  qrId,
  onShowStorefront,
  brandHeader,
  open_place_order_modal,
}: DefaultHotelPageProps) => {
  const accent = styles.accent || "#16a34a";
  const onAccent = readableTextColor(accent);

  const [view, setView] = useState<View>("home");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  // Combined order-type + location sheet (reopened from the header to change).
  const [orderTypeSheetOpen, setOrderTypeSheetOpen] = useState(false);

  const hasOffers = offers && offers.length > 0;
  const { items: cartItems, userAddress, orderType, setOrderType } = useOrderStore();
  const { userData: authUser } = useAuthStore();
  const username = (hoteldata as any)?.username as string | undefined;
  const savedAddresses = useMemo(
    () => ((authUser as any)?.addresses || []) as SavedAddress[],
    [(authUser as any)?.addresses],
  );

  const features = getFeatures(hoteldata?.feature_flags as string);
  const cartCount = cartItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const openCart = useCallback(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("open-cart-drawer"));
  }, []);
  // Promo banners uploaded in the dashboard Branding section.
  const carouselBanners = ((hoteldata as any)?.delivery_rules?.carousel_banners as string[] | undefined) || [];

  const showBottomNav =
    !open_place_order_modal &&
    (features?.ordering.enabled === true || features?.delivery.enabled === true);

  const partnerId = (hoteldata?.id || "") as string;
  const partnerCoords = Array.isArray((hoteldata?.geo_location as any)?.coordinates)
    ? { lat: (hoteldata!.geo_location as any).coordinates[1], lng: (hoteldata!.geo_location as any).coordinates[0] }
    : null;
  const offeredTypes = parseOrderTypesEnabled((hoteldata as any)?.order_types_enabled);
  const slotBookingEnabled =
    parsePrebookingSettings((hoteldata as any)?.prebooking_settings)?.slot_booking_enabled !== false;
  const availableOrderTypes = {
    delivery: !!features?.delivery.enabled && offeredTypes.delivery,
    takeaway: !!features?.ordering.enabled && offeredTypes.takeaway,
    dine_in: offeredTypes.dine_in && !!features?.prebooking?.enabled && slotBookingEnabled,
  };
  const hasAnyOrderType = availableOrderTypes.delivery || availableOrderTypes.takeaway || availableOrderTypes.dine_in;
  const orderTypeLabel =
    orderType === "takeaway"
      ? "Takeaway"
      : orderType === "dine_in"
        ? "Dine-in"
        : features?.delivery.enabled
          ? userAddress
            ? "Delivery"
            : "Add your address"
          : "";

  // Delivery address chosen in the sheet → persist + remember + close.
  const commitDeliveryFromSheet = useCallback(async (addr: string, coords: { lat: number; lng: number } | null) => {
    setOrderType("delivery");
    setSessionOrderType(partnerId, "delivery");
    useOrderStore.getState().setUserAddress(addr);
    if (coords) {
      useOrderStore.getState().setUserCoordinates(coords);
      useLocationStore.getState().setCoords(coords);
    }
    try { await setOnboardingDataCookie(partnerId, { address: addr, coords }); } catch {}
    setOrderTypeSheetOpen(false);
  }, [partnerId, setOrderType]);

  // Takeaway / Dine-in confirmed → set type + close.
  const commitTypeFromSheet = useCallback((t: OrderTypeKey) => {
    setOrderType(t);
    if (t !== "dine_in") setSessionOrderType(partnerId, t);
    setOrderTypeSheetOpen(false);
  }, [partnerId, setOrderType]);

  const deleteSavedAddress = useCallback(async (id: string) => {
    if (!authUser || (authUser as any).role !== "user") return;
    const updated = savedAddresses.filter((a) => a.id !== id);
    try {
      await fetchFromHasura(updateUserAddressesMutation, { id: authUser.id, addresses: updated });
      useAuthStore.setState({ userData: { ...(authUser as any), addresses: updated } as any });
      toast.success("Address deleted");
    } catch {
      toast.error("Failed to delete address");
    }
  }, [authUser, savedAddresses]);

  // Category list, offers pseudo-category, and a "Recommended" group from
  // topItems — mirrors V5's grouping so the same items surface.
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
      const catItems = pool
        .map((item) => {
          const state = getItemDisplayState(item as any, tz, undefined, hideUnav);
          if (state === "hidden") return null;
          return state === "unavailable" ? { ...item, is_available: false } : item;
        })
        .filter(Boolean) as any[];
      catItems.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      if (catItems.length > 0) result.push({ category, items: catItems });
    }
    return result;
  }, [allCategoriesUnfiltered, hoteldata, offers, topItems]);

  // Real menu categories (excludes the Offers / Recommended pseudo groups) — the
  // ones shown in the rail, the Categories grid and the Items tab selector.
  const menuCategories = useMemo(
    () => baseGroups.filter((g) => g.category.id !== "must-try" && g.category.id !== "offers"),
    [baseGroups],
  );

  const groupById = useMemo(() => {
    const m = new Map<string, { category: any; items: any[] }>();
    for (const g of baseGroups) m.set(g.category.id, g);
    return m;
  }, [baseGroups]);

  const catImage = useCallback(
    (catId: string) => groupById.get(catId)?.items.find((i) => i.image_url)?.image_url || null,
    [groupById],
  );

  // The Home "Popular" grid: Must-Try (top) items first. If there are none, fall
  // back to the first category's items; if there are some but fewer than 4, top
  // them up with the first category's items (de-duped). 4+ Must-Try items stand
  // on their own. The "Flash Sale · Popular · New Arrivals" strip is decorative.
  const gridItems = useMemo(() => {
    const mustTry = groupById.get("must-try")?.items || [];
    const firstCat = menuCategories[0]?.items || [];
    if (mustTry.length === 0) return firstCat;
    if (mustTry.length >= 4) return mustTry;
    const seen = new Set(mustTry.map((i) => i.id));
    return [...mustTry, ...firstCat.filter((i) => !seen.has(i.id))];
  }, [groupById, menuCategories]);

  const searchableMenu = useMemo(() => {
    const tz = (hoteldata as any)?.timezone || "Asia/Kolkata";
    const hideUnav = hoteldata?.hide_unavailable;
    return (hoteldata?.menus || [])
      .map((item) => applyVisibilityState(item as any, tz, undefined, hideUnav))
      .filter(Boolean) as any[];
  }, [hoteldata]);

  const openCategory = useCallback((catId: string) => {
    setActiveCatId(catId);
    setView("items");
    window.scrollTo({ top: 0 });
  }, []);

  const activeGroup = activeCatId ? groupById.get(activeCatId) : null;
  const activeCategoryForCard = activeGroup?.category;

  const outletName = hoteldata?.store_name || "Menu";
  const locationText = hoteldata?.location_details || hoteldata?.district || hoteldata?.country || "";
  const backAction = onShowStorefront || brandHeader?.onChange;

  // ===== Reusable pieces =====
  const SearchPill = () => (
    <button
      onClick={() => setSearchOpen(true)}
      className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-black/[0.03] transition hover:shadow"
      aria-label="Search"
    >
      <span className="text-[15px] font-medium text-gray-400">Search</span>
      <Search className="h-[19px] w-[19px] text-gray-400" strokeWidth={2.2} />
    </button>
  );

  const renderGrid = (list: any[], categoryForCard?: any) => {
    if (!list || list.length === 0) {
      return (
        <p className="px-4 py-16 text-center text-sm text-gray-400">No items available.</p>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3 px-4">
        {list.map((item) => {
          const meta = getOfferMeta(item, offers);
          return (
            <V6ItemCard
              key={item.id}
              item={item}
              styles={styles}
              hoteldata={hoteldata}
              offerData={meta.offerData}
              feature_flags={hoteldata?.feature_flags}
              tableNumber={tableNumber}
              hasMultipleVariantsOnOffer={meta.hasMultipleVariantsOnOffer}
              allItemOffers={meta.allItemOffers}
              currentCategory={categoryForCard?.id}
              isOfferCategory={categoryForCard?.id === "offers"}
              isUpcomingOffer={meta.isUpcomingOffer}
              auth={auth}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{ fontFamily: V6_FONT }}
      className="no-image-save min-h-screen bg-[#f2f1ec] antialiased"
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).tagName === "IMG") e.preventDefault();
      }}
    >
      <PullToRefresh />
      <main className="relative mx-auto max-w-2xl pb-28">
        <ShopClosedModalWarning
          hotelId={hoteldata?.id}
          isShopOpen={hoteldata?.is_shop_open}
          partnerPhone={hoteldata?.phone ?? null}
          partnerName={hoteldata?.store_name ?? null}
        />

        {/* ============ HEADER ============ */}
        {view === "items" ? (
          <div className="sticky top-0 z-40 flex items-center gap-2 bg-[#f2f1ec]/95 px-4 py-3 backdrop-blur">
            <button
              onClick={() => setView(activeCatId ? "categories" : "home")}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 font-bold ring-1 ring-black/[0.06] transition hover:bg-white"
              style={{ color: accent }}
              aria-label="Back"
            >
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
              <span className="text-[14px]">Back</span>
            </button>
            <h1 className="flex-1 truncate text-center text-[17px] font-extrabold tracking-tight text-gray-900">
              {activeCategoryForCard ? formatDisplayName(activeCategoryForCard.name) : "Items"}
            </h1>
            <span className="w-[74px] shrink-0" aria-hidden="true" />
          </div>
        ) : (
          <div className="sticky top-0 z-40 bg-[#f2f1ec]/95 px-4 pt-3 pb-2 backdrop-blur">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.03]">
              {backAction && (
                <button
                  onClick={backAction}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-800 ring-1 ring-black/[0.06] transition hover:bg-gray-50"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-[18px] w-[18px]" />
                </button>
              )}
              <button
                onClick={hasAnyOrderType ? () => setOrderTypeSheetOpen(true) : undefined}
                disabled={!hasAnyOrderType}
                className="flex min-w-0 flex-1 flex-col text-left"
              >
                <span className="truncate text-[15px] font-extrabold leading-tight text-gray-900">
                  {orderType === "delivery" && userAddress ? userAddress : outletName}
                </span>
                <span className="flex items-center gap-0.5 truncate text-[11px] font-medium text-gray-400">
                  {orderTypeLabel || locationText || "Your store"}
                  {hasAnyOrderType && <ChevronDown className="h-3 w-3 shrink-0" />}
                </span>
              </button>
              {(authUser as any)?.role === "user" && (
                <LoyaltyPointsBadge
                  partnerId={(hoteldata as any)?.id}
                  currency={(hoteldata as any)?.currency || "₹"}
                  storeName={(hoteldata as any)?.store_name}
                />
              )}
            </div>
          </div>
        )}

        {/* ============ HOME ============ */}
        {view === "home" && (
          <>
            <div className="px-4 pt-1 pb-3">
              <SearchPill />
            </div>

            {/* Announcement */}
            {(hoteldata as any)?.delivery_rules?.announcement && (
              <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-2xl bg-blue-50 px-3 py-2 ring-1 ring-blue-100">
                <span className="text-base">📢</span>
                <p className="flex-1 truncate text-[12px] font-semibold text-blue-800">
                  {(hoteldata as any).delivery_rules.announcement}
                </p>
              </div>
            )}

            {/* Promo banners (Branding section) — shown above Categories */}
            {carouselBanners.length > 0 && (
              <section className="px-4 pb-1 pt-1">
                <V6BannerCarousel banners={carouselBanners} accent={accent} />
              </section>
            )}

            {/* Categories rail */}
            {menuCategories.length > 0 && (
              <section className="pt-3">
                <div className="flex items-center justify-between px-4 pb-2.5">
                  <h2 className="text-[18px] font-extrabold tracking-tight text-gray-900">Categories</h2>
                  {menuCategories.length > 4 && (
                    <button
                      onClick={() => setView("categories")}
                      className="text-[13px] font-bold"
                      style={{ color: accent }}
                    >
                      View All
                    </button>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
                  {menuCategories.map((g) => (
                    <V6CategoryTile
                      key={g.category.id}
                      name={formatDisplayName(g.category.name)}
                      imageUrl={catImage(g.category.id)}
                      accent={accent}
                      variant="rail"
                      onClick={() => openCategory(g.category.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Decorative strip — Flash Sale · Popular · New Arrivals. NOT tabs:
                purely a fancy heading with Popular centred + bold. The grid
                below always shows the popular dishes. */}
            <div aria-hidden="true" className="mt-4 flex select-none items-baseline justify-center gap-7 px-6 py-3">
              <span className="shrink-0 whitespace-nowrap text-[18px] font-bold text-gray-300">Flash Sale</span>
              <span className="shrink-0 whitespace-nowrap text-[23px] font-extrabold tracking-tight text-gray-900">Popular</span>
              <span className="shrink-0 whitespace-nowrap text-[18px] font-bold text-gray-300">New Arrivals</span>
            </div>

            <div className="pt-1">{renderGrid(gridItems)}</div>

            <p translate="no" className="py-6 text-center text-[10px] text-gray-300 notranslate">
              {hoteldata?.store_name}
            </p>
          </>
        )}

        {/* ============ CATEGORIES GRID ============ */}
        {view === "categories" && (
          <>
            <div className="px-4 pt-1 pb-3">
              <SearchPill />
            </div>
            <h2 className="px-4 pb-3 text-[22px] font-extrabold tracking-tight text-gray-900">Categories</h2>
            {menuCategories.length === 0 ? (
              <p className="px-4 py-16 text-center text-sm text-gray-400">No categories available.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3.5 px-4">
                {menuCategories.map((g) => (
                  <V6CategoryTile
                    key={g.category.id}
                    name={formatDisplayName(g.category.name)}
                    imageUrl={catImage(g.category.id)}
                    accent={accent}
                    variant="grid"
                    onClick={() => openCategory(g.category.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ============ ITEMS (category-scoped) ============ */}
        {view === "items" && (
          <>
            {/* Horizontal category tab selector (active bold, neighbours faded) */}
            {menuCategories.length > 1 && (
              <div className="sticky top-[64px] z-30 bg-[#f2f1ec]/95 backdrop-blur">
                <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide px-4 py-3">
                  {menuCategories.map((g) => {
                    const active = g.category.id === activeCatId;
                    return (
                      <button
                        key={g.category.id}
                        onClick={() => { setActiveCatId(g.category.id); window.scrollTo({ top: 0 }); }}
                        className={`shrink-0 whitespace-nowrap transition-all ${
                          active
                            ? "text-[22px] font-extrabold tracking-tight text-gray-900"
                            : "text-[17px] font-bold text-gray-300"
                        }`}
                      >
                        {formatDisplayName(g.category.name)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2">
              {renderGrid(activeGroup?.items || [], activeCategoryForCard)}
            </div>
            <p translate="no" className="py-6 text-center text-[10px] text-gray-300 notranslate">
              {hoteldata?.store_name}
            </p>
          </>
        )}

        {/* Search overlay */}
        {searchOpen && (
          <V3SearchItems
            menu={searchableMenu}
            hoteldata={hoteldata}
            tableNumber={tableNumber}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {/* Floating cart / order drawer (reused) */}
        {auth?.role === "partner" &&
        ((tableNumber !== 0 && getFeatures(hoteldata?.feature_flags || "")?.ordering.enabled) ||
          (tableNumber === 0 && getFeatures(hoteldata?.feature_flags || "")?.delivery.enabled)) ? (
          <div className="fixed bottom-24 left-1/2 z-[200] w-[90%] max-w-md -translate-x-1/2 rounded-2xl bg-black px-6 py-4 text-center font-semibold text-white shadow-xl">
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
            hideCartBar
          />
        )}

        {/* Combined order-type + location sheet (reopened from the header). */}
        {orderTypeSheetOpen && hasAnyOrderType && (
          <OrderTypeLocationSheet
            storeName={outletName}
            outletAddress={locationText}
            accent={accent}
            availableTypes={availableOrderTypes}
            initialType={(orderType as OrderTypeKey) || "delivery"}
            currentAddress={userAddress || ""}
            savedAddresses={savedAddresses}
            onDeleteSaved={deleteSavedAddress}
            partnerCoords={partnerCoords}
            partnerId={partnerId}
            hotelData={hoteldata}
            onOrderTypeChange={(t) => {
              setOrderType(t);
              if (t !== "dine_in") setSessionOrderType(partnerId, t);
            }}
            onDeliveryAddress={commitDeliveryFromSheet}
            onConfirm={commitTypeFromSheet}
            onClose={() => setOrderTypeSheetOpen(false)}
          />
        )}

        {/* Orders overlay */}
        {ordersOpen && (
          <V3Orders hotelId={hoteldata?.id || ""} onClose={() => setOrdersOpen(false)} />
        )}
      </main>

      {/* ============ FLOATING CART ============ */}
      {/* Always mounted while ordering is possible so the fly-to-cart animation
          (which targets this id) has somewhere to land — even on the first add. */}
      {showBottomNav && (
        <button
          id="v6-cart-target"
          onClick={openCart}
          className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition active:scale-90"
          style={{ backgroundColor: accent, color: onAccent }}
          aria-label={`Cart: ${cartCount} item${cartCount === 1 ? "" : "s"}`}
        >
          <ShoppingBag className="h-6 w-6" strokeWidth={2.2} />
          {cartCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 px-1 text-[12px] font-extrabold tabular-nums"
              style={{ borderColor: "#f2f1ec", backgroundColor: "#ffffff", color: accent }}
            >
              {cartCount}
            </span>
          )}
        </button>
      )}

      {/* ============ FLOATING BOTTOM NAV ============ */}
      {showBottomNav && !open_place_order_modal && (
        <nav className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/95 px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.05] backdrop-blur">
          <NavBtn
            icon={<HomeIcon className="h-[20px] w-[20px]" />}
            label="Home"
            active={view === "home"}
            accent={accent}
            onAccent={onAccent}
            onClick={() => { setView("home"); window.scrollTo({ top: 0 }); }}
          />
          <NavBtn
            icon={<LayoutGrid className="h-[20px] w-[20px]" />}
            label="Categories"
            active={view === "categories" || view === "items"}
            accent={accent}
            onAccent={onAccent}
            onClick={() => { setView("categories"); window.scrollTo({ top: 0 }); }}
          />
          {username ? (
            <Link
              href={`/${username}/my-orders`}
              className="flex h-11 items-center justify-center rounded-full px-4 text-gray-500 transition hover:text-gray-800"
              aria-label="Orders"
            >
              <ClipboardList className="h-[20px] w-[20px]" />
            </Link>
          ) : (
            <NavBtn
              icon={<ClipboardList className="h-[20px] w-[20px]" />}
              label="Orders"
              active={false}
              accent={accent}
              onAccent={onAccent}
              onClick={() => setOrdersOpen(true)}
            />
          )}
          <Link
            href={username ? `/${username}/user-profile` : "/user-profile"}
            className="flex h-11 items-center justify-center rounded-full px-4 text-gray-500 transition hover:text-gray-800"
            aria-label="Profile"
          >
            <User className="h-[20px] w-[20px]" />
          </Link>
        </nav>
      )}
    </div>
  );
};

function NavBtn({
  icon, label, active, accent, onAccent, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  accent: string;
  onAccent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-1.5 rounded-full px-4 transition-all ${active ? "" : "text-gray-500 hover:text-gray-800"}`}
      style={active ? { backgroundColor: accent, color: onAccent } : undefined}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {active && <span className="text-[13px] font-bold">{label}</span>}
    </button>
  );
}

export default V6;
