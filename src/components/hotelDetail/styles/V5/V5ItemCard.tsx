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
import { getItemDisplayState } from "@/lib/visibility";
import { computeOutOfStock } from "@/lib/stockStatus";
import { useLiveStock } from "@/store/liveStockStore";
import { X, Plus, Minus } from "lucide-react";

// V5 ("Zomato") list row — a large food image on the right with the ADD button
// floating over its bottom edge, and the textual content (veg mark, name,
// price) on the left. The image box is pinned with INLINE styles so every row
// renders the food photo at the exact same mandated size regardless of the
// source image's natural dimensions.
const V5_IMG_W = 158;
const V5_IMG_H = 148;
// Fixed width AND height for the floating control so the ADD button and the
// +/- stepper that replaces it are exactly the same size — the button never
// changes size when an item is added; it is always the larger stepper size.
// Width is 80% of the image width (matches the source design).
const ADD_CTRL_W = Math.round(V5_IMG_W * 0.8);
const ADD_CTRL_H = 38;

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

function V5BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
        className="relative z-10 mx-auto w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white transition-transform duration-300 ease-out"
        style={{ transform: "translateY(100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => animateClose()}
          className="absolute top-2.5 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {children}
      </div>
    </div>
  );
}

const BottomSheetAddButton = ({
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
      className="w-full flex items-center justify-between rounded-xl px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider shadow-lg transition active:scale-[0.98]"
      style={{ backgroundColor: accent, color: onAccent }}
    >
      <span>Add to cart</span>
      <span><span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(total, hoteldata?.id)}</span>
    </button>
  );
};

// Zomato-style veg / non-veg mark: a bordered square holding a filled dot for
// veg and a filled triangle for non-veg.
function VegMark({ isVeg }: { isVeg: boolean }) {
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

// Compact card used inside the "You will love pairing it with" horizontal
// scroller — a square food image with the veg mark over its bottom-left corner
// and a floating ADD / stepper over its bottom-right, with name + price below.
// It writes to the same cart store, so quantities stay in sync with the full
// list rows of the same dish.
function V5RecCard({
  recItem,
  hoteldata,
  accent,
  canOrder,
  isPartnersRole,
  hasStockFeature,
}: {
  recItem: any;
  hoteldata: HotelData;
  accent: string;
  canOrder: boolean;
  isPartnersRole: boolean;
  hasStockFeature: boolean;
}) {
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const liveStockQty = useLiveStock((s) => s.qty);

  const hasVariants = (recItem.variants?.length ?? 0) > 0;
  const cheapestVariant = useMemo(
    () =>
      hasVariants
        ? [...recItem.variants].sort((a: any, b: any) => (a?.price ?? 0) - (b?.price ?? 0))[0]
        : null,
    [hasVariants, recItem.variants],
  );

  const qty = useMemo(() => {
    const base = items?.find((i) => i.id === recItem.id)?.quantity || 0;
    const variantQty = (items?.filter((i) => i.id.startsWith(`${recItem.id}|`)) || []).reduce(
      (s, i) => s + i.quantity,
      0,
    );
    return base + variantQty;
  }, [items, recItem.id]);

  const isOutOfStock = computeOutOfStock(recItem, hasStockFeature, liveStockQty);
  const isOrderable = recItem.is_available !== false && !isOutOfStock;
  const shouldShowPrice = hoteldata?.currency !== "🚫";
  const priceToShow = hasVariants ? cheapestVariant?.price ?? 0 : recItem.price;
  const hasPrice = typeof priceToShow === "number";
  const showAdd =
    canOrder && isOrderable && hasPrice && !recItem.is_price_as_per_size && !isPartnersRole;

  const add = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVariants && cheapestVariant) {
      addItem({
        ...recItem,
        id: `${recItem.id}|${cheapestVariant.name}`,
        name: `${recItem.name} (${cheapestVariant.name})`,
        price: cheapestVariant.price,
        variantSelections: [
          { id: (cheapestVariant as any).id, name: cheapestVariant.name, price: cheapestVariant.price ?? 0, quantity: 1 },
        ],
      });
    } else {
      addItem({ ...recItem, variantSelections: [], price: recItem.price });
    }
  };

  const dec = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines = hasVariants
      ? items?.filter((i) => i.id.startsWith(`${recItem.id}|`)) || []
      : items?.filter((i) => i.id === recItem.id) || [];
    const last = lines[lines.length - 1];
    if (last) {
      last.quantity > 1 ? decreaseQuantity(last.id) : removeItem(last.id);
    }
  };

  return (
    <div className="w-[128px] shrink-0">
      <div className="relative h-[128px] w-[128px] overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5">
        <img
          src={recItem.image_url || "/image_placeholder.png"}
          alt={recItem.name}
          className={`${!recItem.image_url ? "invert opacity-50" : ""} ${!isOrderable ? "grayscale" : ""}`}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {recItem.is_veg !== null && recItem.is_veg !== undefined && (
          <div className="absolute bottom-1.5 left-1.5 rounded-[4px] bg-white/90 p-[2px] shadow-sm">
            <VegMark isVeg={recItem.is_veg} />
          </div>
        )}

        {!isOrderable && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-wider text-white">
            {recItem.is_available === false ? "Unavailable" : "Out of Stock"}
          </div>
        )}

        {showAdd && (
          <div className="absolute bottom-1.5 right-1.5" style={{ height: 30, width: 72 }}>
            {qty > 0 ? (
              <div className="flex h-full w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-1 shadow-[0_3px_10px_rgba(0,0,0,0.15)]">
                <button onClick={dec} className="flex h-6 w-6 items-center justify-center" style={{ color: accent }}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-[12px] font-extrabold" style={{ color: accent }}>{qty}</span>
                <button onClick={add} className="flex h-6 w-6 items-center justify-center" style={{ color: accent }}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={add}
                className="flex h-full w-full items-center justify-center gap-0.5 rounded-lg border border-gray-200 bg-white shadow-[0_3px_10px_rgba(0,0,0,0.15)] transition active:scale-95"
                style={{ color: accent }}
              >
                <span className="text-[12px] font-extrabold uppercase tracking-wide leading-none">Add</span>
                <Plus className="h-3 w-3" strokeWidth={3} />
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-[13.5px] font-bold leading-tight tracking-[-0.01em] text-gray-900">
        {recItem.name}
      </p>
      {shouldShowPrice && hasPrice && priceToShow > 0 && (
        <p className="mt-0.5 text-[13px] font-bold text-gray-900">
          {hasVariants && <span className="text-[11px] font-normal text-gray-500">From </span>}
          <span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(priceToShow, hoteldata?.id)}
        </p>
      )}
    </div>
  );
}

const V5ItemCard = ({
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
  activeOffers = [],
  auth,
  defaultShowOptions,
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
  activeOffers?: any[];
  auth?: any;
  defaultShowOptions?: boolean;
}) => {
  const accent = styles.accent || "#E9701B";
  const onAccent = readableTextColor(accent);

  const [showVariants, setShowVariants] = useState(defaultShowOptions);
  const [showItemSheet, setShowItemSheet] = useState(false);

  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const liveStockQty = useLiveStock((s) => s.qty);
  const router = useRouter();

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

  useEffect(() => {
    if (defaultShowOptions) setShowVariants(true);
  }, [defaultShowOptions]);

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
      // Add the first variant to the cart by default AND open the picker so the
      // customer sees it added and can switch / add other variants.
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

  // "customisable" caption — shown when the item carries options the customer
  // picks from (variants), matching the source design's caption under ADD.
  const isCustomisable = hasVariants || hasMultipleVariantsOnOffer;

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

  // Shared styling for the floating ADD control — a small white pill centred on
  // the image's bottom edge with a soft shadow (matches the source design).
  const addOutlineBtn =
    "flex h-full w-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-[0_3px_10px_rgba(0,0,0,0.15)] transition active:scale-95";
  const addBtnStyle: React.CSSProperties = { color: accent };

  const renderAddControl = () => {
    if (!isOrderable) return null;

    // Custom-category offers route to the offer page.
    if (offerData && item.category?.name?.toLowerCase() === "custom") {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/offers/${offerData.id}`); }}
          className={addOutlineBtn}
          style={addBtnStyle}
        >
          <span className="text-[14px] font-extrabold uppercase tracking-wide leading-none">View</span>
        </button>
      );
    }

    // Variant-driven items (incl. multi-variant offers): ADD opens the picker.
    if ((hasVariants && !offerData) || hasMultipleVariantsOnOffer) {
      if (defaultShowOptions) return null;
      // View-only (ordering + delivery both off): show VIEW instead of Add and
      // no quantity stepper — it just opens the sheet to see options + prices.
      if (!hasOrderingFeature && !hasDeliveryFeature) {
        return (
          <button onClick={(e) => { e.stopPropagation(); setShowVariants(true); }} className={addOutlineBtn} style={addBtnStyle}>
            <span className="text-[15px] font-extrabold uppercase tracking-wide leading-none">View</span>
          </button>
        );
      }
      if (itemQuantity > 0) {
        return (
          <div className="flex h-full w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-2 shadow-[0_3px_10px_rgba(0,0,0,0.15)]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const variantInCart = items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
                const lastVariant = variantInCart[variantInCart.length - 1];
                if (lastVariant) {
                  lastVariant.quantity > 1 ? decreaseQuantity(lastVariant.id) : removeItem(lastVariant.id);
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ color: accent }}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[20px] text-center text-sm font-extrabold" style={{ color: accent }}>{itemQuantity}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowVariants(true); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ color: accent }}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        );
      }
      return (
        <button onClick={(e) => { e.stopPropagation(); handleAddItem(); }} className={addOutlineBtn} style={addBtnStyle}>
          <span className="text-[15px] font-extrabold uppercase tracking-wide leading-none">Add</span>
        </button>
      );
    }

    // Simple items.
    if (showAddButton && itemQuantity > 0) {
      return (
        <div className="flex h-full w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-2 shadow-[0_3px_10px_rgba(0,0,0,0.15)]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const idToRemove = offerData?.variant ? `${item.id}|${offerData.variant.name}` : (item.id as string);
              itemQuantity > 1 ? decreaseQuantity(idToRemove) : removeItem(idToRemove);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ color: accent }}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[20px] text-center text-sm font-extrabold" style={{ color: accent }}>{itemQuantity}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ color: accent }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      );
    }
    if (showAddButton) {
      return (
        <button onClick={(e) => { e.stopPropagation(); handleAddItem(); }} className={addOutlineBtn} style={addBtnStyle}>
          <span className="text-[15px] font-extrabold uppercase tracking-wide leading-none">Add</span>
        </button>
      );
    }
    return null;
  };

  const addControl = renderAddControl();

  // Fixed height for the image column so every row is identical and the section
  // divider never crosses the button: image + the button's overhang, plus the
  // "customisable" caption line when present.
  const rightColH = !addControl
    ? V5_IMG_H
    : isCustomisable
      ? V5_IMG_H + 42
      : V5_IMG_H + 22;

  const canOrder = hasOrderingFeature || hasDeliveryFeature;

  // Manually-curated cross-sell list ("you will love pairing it with"), resolved
  // against the order-type-filtered menu. Hidden items are dropped; unavailable
  // ones are kept (rendered greyed). Only surfaced once the item is in the cart.
  const recItems = useMemo(() => {
    const ids = (item.recommendations as string[] | undefined) || [];
    if (!ids.length) return [] as any[];
    const menus = (hoteldata?.menus || []) as any[];
    const byId = new Map(menus.map((m) => [m.id, m]));
    const tz = (hoteldata as any)?.timezone || "Asia/Kolkata";
    const out: any[] = [];
    for (const id of ids) {
      if (id === item.id) continue;
      const m = byId.get(id);
      if (!m) continue;
      const state = getItemDisplayState(m as any, tz, undefined, hoteldata?.hide_unavailable);
      if (state === "hidden") continue;
      out.push(state === "unavailable" ? { ...m, is_available: false } : m);
    }
    return out;
  }, [item.recommendations, item.id, hoteldata]);

  const showRecPanel = itemQuantity > 0 && recItems.length > 0;

  return (
    <>
      {/* Card wrapper: the list row plus — once added — its inline "pairing"
          recommendations. Wrapping keeps the V5 list's divider between whole
          cards rather than between a row and its own panel. */}
      <div>
        {/* V5 list row — tapping anywhere opens the detail / variant bottom sheet. */}
        <div
          ref={inViewRef}
          className="flex gap-4 py-5 cursor-pointer transition-all duration-500 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
          onClick={openSheet}
        >
        {/* Left content */}
        <div className="min-w-0 flex-1">
          {item.is_veg !== null && item.is_veg !== undefined && (
            <VegMark isVeg={item.is_veg} />
          )}
          <h3 className="mt-2 text-[16px] font-bold leading-snug tracking-[-0.01em] text-gray-900">
            {offerData?.variant && !hasMultipleVariantsOnOffer
              ? `${item.name} (${offerData.variant.name})`
              : item.name}
          </h3>
          {item.name_secondary && (
            <p
              dir={item.name_secondary_rtl ? "rtl" : "ltr"}
              className="mt-0.5 text-left text-xs font-medium leading-snug text-gray-500"
            >
              {item.name_secondary}
            </p>
          )}

          {/* Price */}
          {shouldShowPrice && (
            <div className="mt-1.5">
              {item.is_price_as_per_size !== true ? (
                hasValidMainOffer ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-gray-900">
                        <span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(mainOfferPrice, hoteldata?.id)}
                      </span>
                      {!hasMultipleVariantsOnOffer && hasValidMainOriginalPrice && mainOriginalPrice! > mainOfferPrice! && (
                        <span className="text-[13px] font-normal text-gray-400 line-through">
                          <span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(mainOriginalPrice, hoteldata?.id)}
                        </span>
                      )}
                    </div>
                    {discountPercentage > 0 && (
                      <span className="mt-0.5 block text-[13.5px] font-bold text-blue-600">
                        {discountPercentage}% OFF
                      </span>
                    )}
                  </>
                ) : hasValidBasePrice ? (
                  <span className="text-[15px] font-bold text-gray-900">
                    {baseItemPrice > 0 ? (
                      <>
                        {hasVariants && <span className="text-[12px] font-normal text-gray-500">From </span>}
                        <span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(baseItemPrice, hoteldata?.id)}
                      </>
                    ) : ""}
                  </span>
                ) : null
              ) : (
                <span className="text-[12px] font-normal text-gray-400">Price as per size</span>
              )}
            </div>
          )}

          {item.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-gray-400 line-clamp-2">
              {item.description}
            </p>
          )}

        </div>

        {/* Right — fixed-size food image with the ADD control floating half over
            its bottom edge and an optional "customisable" caption beneath. The
            column height is pinned (image + button overhang + caption) so every
            row is identical and the divider never clips the button. The image
            box size is pinned so every photo renders at the same mandated size
            (object-cover crops to fill). */}
        <div className="relative shrink-0" style={{ width: V5_IMG_W, height: rightColH }}>
          <div
            className="absolute left-0 top-0 overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5"
            style={{ width: V5_IMG_W, height: V5_IMG_H }}
          >
            {visible && (
              <img
                src={item.image_url || "/image_placeholder.png"}
                alt={item.name}
                className={`${!item.image_url ? "invert opacity-50" : ""} ${!item.is_available || isOutOfStock ? "grayscale" : ""}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
            {(!item.is_available || isOutOfStock) && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white">
                {!item.is_available ? "Unavailable" : "Out of Stock"}
              </div>
            )}
          </div>

          {addControl && (
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: V5_IMG_H - 19, width: ADD_CTRL_W, height: ADD_CTRL_H }}
            >
              {addControl}
            </div>
          )}

          {addControl && isCustomisable && (
            <span
              className="absolute inset-x-0 text-center text-[11px] leading-none text-gray-400"
              style={{ top: V5_IMG_H + 25 }}
            >
              customisable
            </span>
          )}
        </div>
      </div>

      {/* Inline "You will love pairing it with" — the curated recommendations,
          shown directly beneath the row once the dish is in the cart. */}
      {showRecPanel && (
        <div className="pb-4 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="rounded-2xl bg-gray-50 p-4">
            <h3 className="mb-3 text-[16px] font-bold tracking-[-0.01em] text-gray-900">
              You will love pairing it with
            </h3>
            <div className="-mx-1 flex gap-3 overflow-x-auto scrollbar-hide px-1 pb-1">
              {recItems.map((r) => (
                <V5RecCard
                  key={r.id}
                  recItem={r}
                  hoteldata={hoteldata}
                  accent={accent}
                  canOrder={canOrder}
                  isPartnersRole={isPartnersRole}
                  hasStockFeature={!!hasStockFeature}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Bottom Sheet for Item Details (non-variant items) */}
      {showItemSheet && !hasVariants && typeof window !== "undefined" && createPortal(
        <V5BottomSheet onClose={() => setShowItemSheet(false)}>
          <div className="sticky top-0 z-10 flex justify-center bg-white pt-2.5 pb-1">
            <div className="h-1 w-8 rounded-full bg-gray-200" />
          </div>

          {item.image_url && (
            <div className="mx-3 mt-1 flex h-40 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="px-4 pb-5 pt-3">
            <div className="flex items-center gap-1.5">
              {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
            </div>
            <h2 className="mt-1.5 text-lg font-extrabold tracking-tight text-gray-900">{item.name}</h2>
            {item.name_secondary && (
              <p
                dir={item.name_secondary_rtl ? "rtl" : "ltr"}
                className="mt-0.5 text-left text-sm font-medium leading-snug text-gray-500"
              >
                {item.name_secondary}
              </p>
            )}

            {shouldShowPrice && (
              <div className="mt-1 flex items-center gap-2">
                {hasValidMainOffer && !isUpcomingOffer ? (
                  <>
                    <span className="text-base font-extrabold text-gray-900"><span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(offerData!.offer_price!, hoteldata?.id)}</span>
                    {hasValidMainOriginalPrice && mainOriginalPrice! > offerData!.offer_price! && (
                      <span className="text-sm text-gray-400 line-through"><span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(mainOriginalPrice, hoteldata?.id)}</span>
                    )}
                  </>
                ) : hasValidBasePrice && baseItemPrice > 0 ? (
                  <span className="text-base font-extrabold text-gray-900"><span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(baseItemPrice, hoteldata?.id)}</span>
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
                    className="flex w-full items-center justify-between rounded-xl px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider shadow-lg transition active:scale-[0.98]"
                    style={{ backgroundColor: accent, color: onAccent }}
                  >
                    <span>Add to cart</span>
                    <span><span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(hasValidMainOffer && !isUpcomingOffer ? offerData!.offer_price! : baseItemPrice, hoteldata?.id || "")}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-1 rounded-xl border-2 px-1.5 py-1"
                      style={{ borderColor: `${accent}4D`, backgroundColor: `${accent}14` }}
                    >
                      <button
                        onClick={() => { if (itemQuantity === 1) removeItem(item.id as string); else decreaseQuantity(item.id as string); }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ color: accent }}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[2ch] text-center text-sm font-extrabold" style={{ color: accent }}>{itemQuantity}</span>
                      <button
                        onClick={() => handleAddItem()}
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ color: accent }}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">Total</p>
                      <p className="text-base font-extrabold text-gray-900">
                        <span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice((hasValidMainOffer && !isUpcomingOffer ? offerData!.offer_price! : baseItemPrice) * itemQuantity, hoteldata?.id || "")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </V5BottomSheet>,
        document.body
      )}

      {/* Bottom Sheet for Variants */}
      {showVariants && hasVariants && typeof window !== "undefined" && createPortal(
        <V5BottomSheet onClose={() => setShowVariants(false)}>
          <div className="sticky top-0 z-10 flex justify-center bg-white pt-2.5 pb-1">
            <div className="h-1 w-8 rounded-full bg-gray-200" />
          </div>

          {item.image_url && (
            <div className="mx-3 mt-1 flex h-40 items-center justify-center overflow-hidden rounded-xl">
              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="p-4 pb-2 flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
                <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
              </div>
              {item.name_secondary && (
                <p
                  dir={item.name_secondary_rtl ? "rtl" : "ltr"}
                  className="text-left text-sm font-medium leading-snug text-gray-500"
                >
                  {item.name_secondary}
                </p>
              )}
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
                  <h4 className="font-bold text-base text-gray-900">Quantity</h4>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium border"
                    style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
                  >
                    Required
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3">Select options</p>
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
                              <span className="text-gray-900"><span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(variantOffer.offer_price!, hoteldata?.id)}</span>
                              {hasValidOriginalPrice && originalVariantPrice > variantOffer.offer_price! && (
                                <span className="line-through text-gray-400 text-xs font-normal"><span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(originalVariantPrice, hoteldata?.id)}</span>
                              )}
                            </div>
                          ) : hasValidOriginalPrice && originalVariantPrice > 0 ? (
                            <span className="text-gray-700"><span translate="no" className="notranslate">{hoteldata?.currency || "₹"}</span>{formatPrice(originalVariantPrice, hoteldata?.id)}</span>
                          ) : null}
                        </div>
                      )}

                      {showVariantAddButton && !isMenuOnly && (
                        <div className="flex-shrink-0">
                          {qty > 0 ? (
                            <div
                              className="flex items-center gap-0.5 rounded-md border px-0.5 py-0.5"
                              style={{ borderColor: `${accent}4D`, backgroundColor: `${accent}14` }}
                            >
                              <button onClick={() => handleVariantRemove(variant)} className="flex h-6 w-6 items-center justify-center rounded" style={{ color: accent }}>
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-xs font-extrabold min-w-[16px] text-center" style={{ color: accent }}>{qty}</span>
                              <button onClick={() => handleVariantAdd(variant)} className="flex h-6 w-6 items-center justify-center rounded" style={{ color: accent }}>
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleVariantAdd(variant)}
                              className="rounded-md border border-gray-200 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-sm transition active:scale-95"
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
                onClose={() => setShowVariants(false)}
                accent={accent}
                onAccent={onAccent}
              />
            </div>
          )}
        </V5BottomSheet>,
        document.body
      )}
    </>
  );
};

export default V5ItemCard;
