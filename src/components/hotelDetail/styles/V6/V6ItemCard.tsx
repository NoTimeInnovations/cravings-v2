"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { pushEcommerceEvent, resolveCurrencyCode, categoryName, baseItemId } from "@/lib/partnerDataLayer";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { DefaultHotelPageProps } from "../Default/Default";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import useOrderStore from "@/store/orderStore";
import { Offer } from "@/store/offerStore_hasura";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/constants";
import { readableTextColor } from "@/lib/brandColor";
import { computeOutOfStock } from "@/lib/stockStatus";
import { useLiveStock } from "@/store/liveStockStore";
import { V6_FONT } from "./v6utils";
import { flyToCart } from "./v6FlyToCart";
import { MenuPrice } from "../../MenuPrice";
import { useMenuLanguageStore } from "@/store/menuLanguageStore";
import { X, Plus, Minus } from "lucide-react";

/**
 * V6 ("Grocery") product card — a vertical card for the 2-column grid: a large
 * rounded food image on top, then name, a light sub-line (secondary name / size
 * / "From ₹"), the price, and a circular brand-accent ADD control that morphs
 * into a −/qty/+ stepper. Tapping the card opens a detail / variant bottom sheet.
 *
 * The cart / offer / variant / stock / feature-gating logic mirrors V5ItemCard
 * verbatim so ordering behaviour is identical; only the presentation differs.
 */

// Circular ADD control sizing — the button and the stepper it becomes share the
// same height so the layout never jumps when an item is added.
const CTRL_H = 34;

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export function V6BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (backdropRef.current) backdropRef.current.style.opacity = "1";
      if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    });
  }, []);

  const animateClose = (cb?: () => void) => {
    if (backdropRef.current) backdropRef.current.style.opacity = "0";
    if (sheetRef.current) sheetRef.current.style.transform = "translateY(100%)";
    setTimeout(() => { onClose(); cb?.(); }, 280);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end">
      <div
        ref={backdropRef}
        onClick={() => animateClose()}
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      <div
        ref={sheetRef}
        className="relative z-10 mx-auto w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white transition-transform duration-300 ease-out"
        style={{ transform: "translateY(100%)", fontFamily: V6_FONT }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => animateClose()}
          className="absolute top-2.5 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {children}
      </div>
    </div>
  );
}

// Bordered veg / non-veg mark (dot for veg, triangle for non-veg).
export function VegMark({ isVeg }: { isVeg: boolean }) {
  const color = isVeg ? "#16a34a" : "#dc2626";
  return (
    <div
      className="flex h-[15px] w-[15px] items-center justify-center rounded-[3px] border-[1.5px]"
      style={{ borderColor: color }}
    >
      {isVeg ? (
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <span
          style={{
            width: 0,
            height: 0,
            borderLeft: "3.5px solid transparent",
            borderRight: "3.5px solid transparent",
            borderBottom: `6px solid ${color}`,
          }}
        />
      )}
    </div>
  );
}

export const BottomSheetAddButton = ({
  item,
  hoteldata,
  variantQuantities,
  getVariantOffer,
  onClose,
  accent,
  onAccent,
}: {
  item: any;
  hoteldata: any;
  variantQuantities: Record<string, number>;
  getVariantOffer: (name: string) => any;
  onClose: () => void;
  accent: string;
  onAccent: string;
}) => {
  const total = useMemo(() => {
    let sum = 0;
    const variants = item.variants || [];
    for (const variant of variants) {
      const qty = variantQuantities[variant.name] || 0;
      if (qty > 0) {
        const variantOffer = getVariantOffer(variant.name);
        const price =
          variantOffer && typeof variantOffer.offer_price === "number"
            ? variantOffer.offer_price
            : variant.price || 0;
        sum += price * qty;
      }
    }
    return sum;
  }, [item.variants, variantQuantities, getVariantOffer]);

  return (
    <button
      onClick={onClose}
      className="w-full flex items-center justify-between rounded-2xl px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider shadow-lg transition active:scale-[0.98]"
      style={{ backgroundColor: accent, color: onAccent }}
    >
      <span>Add to cart</span>
      <MenuPrice forceSymbolLtr currency={hoteldata?.currency} amount={formatPrice(total, hoteldata?.id)} />
    </button>
  );
};

const V6ItemCard = ({
  item,
  styles,
  hoteldata,
  offerData,
  feature_flags,
  tableNumber,
  hasMultipleVariantsOnOffer = false,
  allItemOffers,
  currentCategory,
  isOfferCategory,
  isUpcomingOffer = false,
  auth,
}: {
  item: HotelDataMenus;
  styles: DefaultHotelPageProps["styles"];
  hoteldata: HotelData;
  offerData?: Offer;
  feature_flags: HotelData["feature_flags"];
  tableNumber: number;
  hasMultipleVariantsOnOffer?: boolean;
  allItemOffers?: Offer[];
  currentCategory?: string;
  isUpcomingOffer?: boolean;
  isOfferCategory?: boolean;
  auth?: any;
}) => {
  const accent = styles.accent || "#E9701B";
  const onAccent = readableTextColor(accent);

  const [showVariants, setShowVariants] = useState(false);
  const [showItemSheet, setShowItemSheet] = useState(false);

  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const liveStockQty = useLiveStock((s) => s.qty);
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement>(null);

  // Language-aware name: when the storefront language is Arabic, show the curated
  // Arabic name (name_secondary) as the item name; otherwise the primary name.
  // The bilingual sub-line is dropped — one name per language. Currency is handled
  // language-aware by <MenuPrice forceSymbolLtr> (en → QAR, ar → ر.ق, correctly ordered/isolated).
  const menuLang = useMenuLanguageStore((s) => s.lang);
  const isArabic = (menuLang || "").toLowerCase().startsWith("ar");
  const showArabicName = isArabic && !!item.name_secondary;
  const displayName = showArabicName ? item.name_secondary : item.name;
  const nameDir = showArabicName ? ("rtl" as const) : undefined;
  // When we render the curated Arabic name, mark it notranslate so Google
  // Translate (active on the Arabic page) doesn't re-translate it to garbage.
  const nameTranslate = showArabicName ? ("no" as const) : undefined;
  const nameNo = showArabicName ? " notranslate" : "";

  const features = getFeatures(feature_flags || "");
  const deliveryRules = hoteldata?.delivery_rules;
  const _tz = (hoteldata as any)?.timezone || "Asia/Kolkata";
  const isDeliveryTimeOpen = deliveryRules?.isDeliveryActive !== false &&
    isWithinTimeWindow(deliveryRules?.delivery_time_allowed, _tz);
  const isTakeawayTimeOpen = isWithinTimeWindow(deliveryRules?.takeaway_time_allowed, _tz);
  const hasDeliveryFeature =
    features?.delivery.enabled && tableNumber === 0 && isDeliveryTimeOpen;
  const hasOrderingFeature =
    features?.ordering.enabled && (tableNumber !== 0 || isTakeawayTimeOpen);
  const isPartnersRole = auth?.role === "partner";

  const hasStockFeature = getFeatures(feature_flags || "")?.stockmanagement?.enabled;
  const isOutOfStock = computeOutOfStock(item, hasStockFeature, liveStockQty);

  const hasVariants = (item.variants?.length ?? 0) > 0;
  const [itemQuantity, setItemQuantity] = useState<number>(0);
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});
  const shouldShowPrice = hoteldata?.currency !== "🚫";

  const discountPercentage =
    offerData && shouldShowPrice
      ? (() => {
          if (hasMultipleVariantsOnOffer && allItemOffers) {
            const validOfferPrices = allItemOffers.map((o) => o.offer_price).filter((p): p is number => typeof p === "number");
            const validOriginalPrices = allItemOffers.map((o) => o.variant?.price ?? o.menu?.price).filter((p): p is number => typeof p === "number");
            if (validOfferPrices.length === 0 || validOriginalPrices.length === 0) return 0;
            const lowestOfferPrice = Math.min(...validOfferPrices);
            const lowestOriginalPrice = Math.min(...validOriginalPrices);
            if (lowestOriginalPrice > 0 && lowestOriginalPrice > lowestOfferPrice) {
              return Math.round(((lowestOriginalPrice - lowestOfferPrice) / lowestOriginalPrice) * 100);
            }
            return 0;
          } else {
            const originalPrice = offerData.variant?.price ?? offerData.menu?.price;
            const offerPrice = offerData.offer_price;
            if (typeof originalPrice === "number" && typeof offerPrice === "number" && originalPrice > 0) {
              return Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
            }
            return 0;
          }
        })()
      : 0;

  useEffect(() => {
    if (item.variants?.length) {
      const variantItems = items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
      const total = variantItems.reduce((sum, i) => sum + i.quantity, 0);
      setItemQuantity(total);
      const newVariantQuantities: Record<string, number> = {};
      variantItems.forEach((variantItem) => {
        const variantName = variantItem.id.split("|")[1];
        if (variantName) newVariantQuantities[variantName] = variantItem.quantity;
      });
      setVariantQuantities(newVariantQuantities);
    } else {
      const itemInCart = items?.find((i) => i.id === item.id);
      const variantItems = items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
      const totalQuantity = (itemInCart?.quantity || 0) + variantItems.reduce((sum, i) => sum + i.quantity, 0);
      setItemQuantity(totalQuantity);
    }
  }, [items, item.id, item.variants?.length]);

  const handleAddItem = () => {
    if (hasMultipleVariantsOnOffer) {
      setShowVariants(!showVariants);
      return;
    }
    if (offerData?.variant) {
      addItem({
        ...item,
        id: `${item.id}|${offerData.variant.name}`,
        name: `${item.name} (${offerData.variant.name})`,
        price: isUpcomingOffer ? offerData.variant.price : offerData.offer_price || 0,
        variantSelections: [{ id: (offerData.variant as any).id, name: offerData.variant.name, price: offerData.variant.price ?? 0, quantity: 1 }],
      });
      return;
    }
    if (hasVariants) {
      const total = Object.values(variantQuantities).reduce((s, q) => s + q, 0);
      if (total === 0) {
        const firstVariant = (item.variants || []).find(Boolean);
        if (firstVariant) handleVariantAdd(firstVariant);
      }
      setShowVariants(true);
    } else {
      addItem({ ...item, variantSelections: [], price: isUpcomingOffer ? item.price : offerData?.offer_price || item.price });
    }
  };

  const handleVariantAdd = (variant: any) => {
    const variantOffer = getVariantOffer(variant.name);
    const hasVariantOffer = !!variantOffer;
    const isVariantUpcoming = hasVariantOffer && new Date(variantOffer.start_time) > new Date();
    const finalPrice = hasVariantOffer && !isVariantUpcoming ? variantOffer.offer_price : variant.price;
    addItem({
      ...item,
      id: `${item.id}|${variant.name}`,
      name: `${item.name} (${variant.name})`,
      price: finalPrice,
      variantSelections: [{ id: variant.id, name: variant.name, price: variant.price ?? 0, quantity: 1 }],
    });
  };

  const handleVariantRemove = (variant: any) => {
    decreaseQuantity(`${item.id}|${variant.name}`);
  };

  const getVariantQuantity = (name: string) => variantQuantities[name] || 0;

  const getVariantOffer = (variantName: string) => {
    return hoteldata?.offers?.find((o) => o.menu && o.menu.id === item.id && o.variant?.name === variantName);
  };

  const isOrderable = item.is_available && !isOutOfStock;
  const hasPrice = typeof (offerData?.offer_price ?? item.price ?? item.variants?.[0]?.price) === "number";
  const showAddButton = isOrderable && hasPrice && (hasOrderingFeature || hasDeliveryFeature) && !item.is_price_as_per_size && !isPartnersRole;

  const mainOfferPrice = offerData?.offer_price;
  const hasValidMainOffer = typeof mainOfferPrice === "number";
  const mainOriginalPrice = offerData?.variant?.price ?? offerData?.menu?.price;
  const hasValidMainOriginalPrice = typeof mainOriginalPrice === "number";
  const baseItemPrice = item.variants?.sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0))[0]?.price || item.price;
  const hasValidBasePrice = typeof baseItemPrice === "number";

  const { ref: inViewRef, visible } = useInView();

  const openSheet = () => {
    pushEcommerceEvent("view_item", {
      currency: resolveCurrencyCode(hoteldata?.currency),
      value: item.price,
      items: [{ item_id: baseItemId(item.id), item_name: item.name, item_category: categoryName(item.category), price: item.price }],
    });
    if (hasVariants) setShowVariants(true);
    else setShowItemSheet(true);
  };

  // Adds immediately (vs opening a sheet) for simple items and single-variant
  // offers — those are the taps that should fly the image into the cart.
  const willAddImmediately = !hasMultipleVariantsOnOffer && (!!offerData?.variant || !hasVariants);
  const addWithFly = () => {
    if (willAddImmediately) flyToCart(imgRef.current);
    handleAddItem();
  };

  // Variant sheet "Add to cart": variants are already in the cart (added via the
  // per-variant steppers), so this just dismisses the sheet — then fly the item
  // into the cart as confirmation, matching the simple-item add animation.
  const closeVariantSheetWithFly = () => {
    const willFly = itemQuantity > 0;
    setShowVariants(false);
    if (willFly) window.setTimeout(() => flyToCart(imgRef.current), 80);
  };

  // Closing the simple-item detail sheet: fly the item into the cart when it's
  // in the cart, matching the add animation.
  const closeItemSheetWithFly = () => {
    const willFly = itemQuantity > 0;
    setShowItemSheet(false);
    if (willFly) window.setTimeout(() => flyToCart(imgRef.current), 80);
  };

  // A small circular accent ADD button that becomes a compact −/qty/+ pill.
  const renderAddControl = () => {
    if (!isOrderable) return null;

    // Custom-category offers route to the offer page.
    if (offerData && item.category?.name?.toLowerCase() === "custom") {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/offers/${offerData.id}`); }}
          className="flex items-center justify-center rounded-full px-4 text-[12px] font-extrabold uppercase tracking-wide shadow-md transition active:scale-95"
          style={{ height: CTRL_H, backgroundColor: accent, color: onAccent }}
        >
          View
        </button>
      );
    }

    // View-only (ordering + delivery both off): show a borderless "View" text.
    if ((hasVariants || hasMultipleVariantsOnOffer) && !hasOrderingFeature && !hasDeliveryFeature) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setShowVariants(true); }}
          className="flex items-center justify-center px-1 text-[13px] font-extrabold uppercase tracking-wide transition active:scale-95"
          style={{ color: accent }}
        >
          View
        </button>
      );
    }

    if (!showAddButton && !((hasVariants || hasMultipleVariantsOnOffer))) return null;

    if (itemQuantity > 0) {
      return (
        <div
          className="flex items-center justify-between rounded-full shadow-md"
          style={{ height: CTRL_H, minWidth: 88, backgroundColor: accent, color: onAccent }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasVariants || hasMultipleVariantsOnOffer) {
                const variantInCart = items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
                const last = variantInCart[variantInCart.length - 1];
                if (last) { last.quantity > 1 ? decreaseQuantity(last.id) : removeItem(last.id); }
              } else {
                const idToRemove = offerData?.variant ? `${item.id}|${offerData.variant.name}` : (item.id as string);
                itemQuantity > 1 ? decreaseQuantity(idToRemove) : removeItem(idToRemove);
              }
            }}
            className="flex h-full w-8 items-center justify-center"
            aria-label="Decrease"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[18px] text-center text-[13px] font-extrabold tabular-nums">{itemQuantity}</span>
          <button
            onClick={(e) => { e.stopPropagation(); addWithFly(); }}
            className="flex h-full w-8 items-center justify-center"
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={(e) => { e.stopPropagation(); addWithFly(); }}
        className="flex items-center justify-center rounded-full shadow-md transition active:scale-90"
        style={{ height: CTRL_H, width: CTRL_H, backgroundColor: accent, color: onAccent }}
        aria-label={`Add ${item.name}`}
      >
        <Plus className="h-[18px] w-[18px]" strokeWidth={2.6} />
      </button>
    );
  };

  const addControl = renderAddControl();
  const canOrder = hasOrderingFeature || hasDeliveryFeature;

  return (
    <>
      <div
        ref={inViewRef}
        onClick={openSheet}
        className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] active:scale-[0.99]"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)" }}
      >
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
          {visible && (
            <img
              ref={imgRef}
              src={item.image_url || "/image_placeholder.png"}
              alt={item.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${!item.image_url ? "opacity-40" : ""} ${!isOrderable ? "grayscale" : ""}`}
            />
          )}

          {item.is_veg !== null && item.is_veg !== undefined && (
            <div className="absolute left-2 top-2 rounded-[5px] bg-white/95 p-[3px] shadow-sm">
              <VegMark isVeg={item.is_veg} />
            </div>
          )}

          {shouldShowPrice && discountPercentage > 0 && (
            <div
              className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-sm"
              style={{ backgroundColor: accent, color: onAccent }}
            >
              {discountPercentage}% OFF
            </div>
          )}

          {!isOrderable && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white">
              {item.is_available === false ? "Unavailable" : "Out of Stock"}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col px-3 pb-2.5 pt-2">
          <h3 dir={nameDir} translate={nameTranslate} className={`line-clamp-2 text-left text-[14px] font-bold leading-tight tracking-[-0.01em] text-gray-900${nameNo}`}>
            {offerData?.variant && !hasMultipleVariantsOnOffer
              ? `${displayName} (${offerData.variant.name})`
              : displayName}
          </h3>

          {/* Price + control */}
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              {shouldShowPrice ? (
                item.is_price_as_per_size !== true ? (
                  hasValidMainOffer ? (
                    <div className="flex flex-col">
                      <MenuPrice forceSymbolLtr
                        className="text-[15px] font-extrabold"
                        style={{ color: accent }}
                        currency={hoteldata?.currency}
                        amount={formatPrice(mainOfferPrice, hoteldata?.id)}
                      />
                      {!hasMultipleVariantsOnOffer && hasValidMainOriginalPrice && mainOriginalPrice! > mainOfferPrice! && (
                        <MenuPrice forceSymbolLtr
                          className="text-[11px] font-normal text-gray-400 line-through"
                          currency={hoteldata?.currency}
                          amount={formatPrice(mainOriginalPrice, hoteldata?.id)}
                        />
                      )}
                    </div>
                  ) : hasValidBasePrice && baseItemPrice > 0 ? (
                    <span className="whitespace-nowrap text-[15px] font-extrabold" style={{ color: accent }}>
                      {hasVariants && <span className="text-[10px] font-normal text-gray-500">From </span>}
                      <MenuPrice forceSymbolLtr currency={hoteldata?.currency} amount={formatPrice(baseItemPrice, hoteldata?.id)} />
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-300">&nbsp;</span>
                  )
                ) : (
                  <span className="text-[11px] font-medium text-gray-400">As per size</span>
                )
              ) : (
                <span className="text-[11px] font-medium text-gray-300">&nbsp;</span>
              )}
            </div>

            {addControl && <div className="shrink-0">{addControl}</div>}
          </div>
        </div>
      </div>

      {/* Detail sheet (non-variant items) */}
      {showItemSheet && !hasVariants && typeof window !== "undefined" && createPortal(
        <V6BottomSheet onClose={closeItemSheetWithFly}>
          <div className="sticky top-0 z-10 flex justify-center bg-white pt-2.5 pb-1">
            <div className="h-1 w-8 rounded-full bg-gray-200" />
          </div>

          {item.image_url && (
            <div className="mx-3 mt-1 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="px-4 pb-5 pt-3">
            <div className="flex items-center gap-1.5">
              {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
            </div>
            <h2 dir={nameDir} translate={nameTranslate} className={`mt-1.5 text-left text-lg font-extrabold tracking-tight text-gray-900${nameNo}`}>{displayName}</h2>

            {shouldShowPrice && (
              <div className="mt-1 flex items-center gap-2">
                {hasValidMainOffer && !isUpcomingOffer ? (
                  <>
                    <MenuPrice forceSymbolLtr className="text-base font-extrabold" style={{ color: accent }} currency={hoteldata?.currency} amount={formatPrice(offerData!.offer_price!, hoteldata?.id)} />
                    {hasValidMainOriginalPrice && mainOriginalPrice! > offerData!.offer_price! && (
                      <MenuPrice forceSymbolLtr className="text-sm text-gray-400 line-through" currency={hoteldata?.currency} amount={formatPrice(mainOriginalPrice, hoteldata?.id)} />
                    )}
                  </>
                ) : hasValidBasePrice && baseItemPrice > 0 ? (
                  <MenuPrice forceSymbolLtr className="text-base font-extrabold" style={{ color: accent }} currency={hoteldata?.currency} amount={formatPrice(baseItemPrice, hoteldata?.id)} />
                ) : null}
              </div>
            )}

            {item.description && (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-gray-400">{item.description}</p>
            )}

            {isOrderable && showAddButton && (
              <div className="mt-4">
                {itemQuantity === 0 ? (
                  <button
                    onClick={() => handleAddItem()}
                    className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider shadow-lg transition active:scale-[0.98]"
                    style={{ backgroundColor: accent, color: onAccent }}
                  >
                    <span>Add to cart</span>
                    <MenuPrice forceSymbolLtr currency={hoteldata?.currency} amount={formatPrice(hasValidMainOffer && !isUpcomingOffer ? offerData!.offer_price! : baseItemPrice, hoteldata?.id || "")} />
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="text-[10px] text-gray-400">Total</p>
                      <p className="text-base font-extrabold text-gray-900">
                        <MenuPrice forceSymbolLtr currency={hoteldata?.currency} amount={formatPrice((hasValidMainOffer && !isUpcomingOffer ? offerData!.offer_price! : baseItemPrice) * itemQuantity, hoteldata?.id || "")} />
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1 rounded-2xl border-2 px-1.5 py-1"
                      style={{ borderColor: `${accent}4D`, backgroundColor: `${accent}14` }}
                    >
                      <button
                        onClick={() => { if (itemQuantity === 1) removeItem(item.id as string); else decreaseQuantity(item.id as string); }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ color: accent }}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[2ch] text-center text-sm font-extrabold" style={{ color: accent }}>{itemQuantity}</span>
                      <button
                        onClick={() => handleAddItem()}
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ color: accent }}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </V6BottomSheet>,
        document.body
      )}

      {/* Variant sheet */}
      {showVariants && hasVariants && typeof window !== "undefined" && createPortal(
        <V6BottomSheet onClose={() => setShowVariants(false)}>
          <div className="sticky top-0 z-10 flex justify-center bg-white pt-2.5 pb-1">
            <div className="h-1 w-8 rounded-full bg-gray-200" />
          </div>

          {item.image_url && (
            <div className="mx-3 mt-1 flex h-44 items-center justify-center overflow-hidden rounded-2xl">
              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="p-4 pb-2 flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
                <h3 dir={nameDir} translate={nameTranslate} className={`text-left font-bold text-lg text-gray-900${nameNo}`}>{displayName}</h3>
              </div>
              {item.description && (
                <p className="text-sm text-gray-400 mt-1 leading-relaxed whitespace-pre-line">{item.description}</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 mx-4" />

          <div className="p-4">
            {(hasOrderingFeature || hasDeliveryFeature) && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-base text-gray-900">Options</h4>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium border"
                    style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
                  >
                    Select
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3">Choose a size / variant</p>
              </>
            )}

            <div className="divide-y divide-gray-100">
              {(() => {
                if (isOfferCategory && hasMultipleVariantsOnOffer) {
                  return allItemOffers?.map((offer) => offer.variant!).filter(Boolean) || [];
                } else if (isOfferCategory && offerData?.variant && !hasMultipleVariantsOnOffer) {
                  return [offerData.variant];
                } else {
                  return item.variants || [];
                }
              })()
                .filter(Boolean)
                .map((variant) => {
                  const variantOffer = getVariantOffer(variant.name);
                  const hasValidVariantOffer = variantOffer && typeof variantOffer.offer_price === "number";
                  const originalVariantPrice = variant.price;
                  const hasValidOriginalPrice = typeof originalVariantPrice === "number";
                  const showVariantAddButton = showAddButton && isOrderable;
                  const isMenuOnly = !hasOrderingFeature && !hasDeliveryFeature;
                  const qty = getVariantQuantity(variant.name);

                  return (
                    <div key={variant.name} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {item.is_veg !== null && item.is_veg !== undefined && (
                          <div className="flex-shrink-0">
                            <VegMark isVeg={item.is_veg} />
                          </div>
                        )}
                        <span className="font-medium text-sm text-gray-900 flex-1 min-w-0">{variant.name}</span>
                      </div>

                      {shouldShowPrice && !item.is_price_as_per_size && (
                        <div className="text-sm font-semibold flex-shrink-0">
                          {hasValidVariantOffer ? (
                            <div className="flex items-center gap-1.5">
                              <MenuPrice forceSymbolLtr className="text-gray-900" currency={hoteldata?.currency} amount={formatPrice(variantOffer.offer_price!, hoteldata?.id)} />
                              {hasValidOriginalPrice && originalVariantPrice > variantOffer.offer_price! && (
                                <MenuPrice forceSymbolLtr className="line-through text-gray-400 text-xs font-normal" currency={hoteldata?.currency} amount={formatPrice(originalVariantPrice, hoteldata?.id)} />
                              )}
                            </div>
                          ) : hasValidOriginalPrice && originalVariantPrice > 0 ? (
                            <MenuPrice forceSymbolLtr className="text-gray-700" currency={hoteldata?.currency} amount={formatPrice(originalVariantPrice, hoteldata?.id)} />
                          ) : null}
                        </div>
                      )}

                      {showVariantAddButton && !isMenuOnly && (
                        <div className="flex-shrink-0">
                          {qty > 0 ? (
                            <div
                              className="flex items-center gap-0.5 rounded-full border px-0.5 py-0.5"
                              style={{ borderColor: `${accent}4D`, backgroundColor: `${accent}14` }}
                            >
                              <button onClick={() => handleVariantRemove(variant)} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ color: accent }}>
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-xs font-extrabold min-w-[16px] text-center" style={{ color: accent }}>{qty}</span>
                              <button onClick={() => handleVariantAdd(variant)} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ color: accent }}>
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleVariantAdd(variant)}
                              className="rounded-full border border-gray-200 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-sm transition active:scale-95"
                              style={{ color: accent }}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {showAddButton && (
            <div className="sticky bottom-0 p-4 bg-white border-t border-gray-100">
              <BottomSheetAddButton
                item={item}
                hoteldata={hoteldata}
                variantQuantities={variantQuantities}
                getVariantOffer={getVariantOffer}
                onClose={closeVariantSheetWithFly}
                accent={accent}
                onAccent={onAccent}
              />
            </div>
          )}
        </V6BottomSheet>,
        document.body
      )}
    </>
  );
};

export default V6ItemCard;
