"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { Search, ArrowLeft, ShoppingBag, Plus, Minus } from "lucide-react";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getFeatures } from "@/lib/getFeatures";
import useOrderStore from "@/store/orderStore";
import { formatPrice } from "@/lib/constants";
import { readableTextColor } from "@/lib/brandColor";
import { filterMenuByQuery } from "@/lib/menuSearch";
import { V6_FONT } from "./v6utils";
import { flyToCart } from "./v6FlyToCart";
import { V6BottomSheet, VegMark, BottomSheetAddButton } from "./V6ItemCard";
import { MenuPrice } from "../../MenuPrice";
import { useMenuLanguageStore } from "@/store/menuLanguageStore";

/**
 * V6 ("Grocery") search overlay. A dedicated copy so the results reuse the V6
 * ordering behaviour — a variant-selection bottom sheet for items with sizes and
 * the "fly to cart" animation on add — instead of the plain direct-add rows the
 * shared V3 search uses. The fly targets this overlay's OWN cart FAB, since the
 * main V6 cart pill is hidden behind the overlay.
 */

// The search overlay's floating cart carries this id so flyToCart aims here.
const SEARCH_CART_ID = "v6-search-cart-target";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const V6SearchRow = ({
  item,
  hoteldata,
  tableNumber,
  accent,
}: {
  item: HotelDataMenus;
  hoteldata: HotelData;
  tableNumber: number;
  accent: string;
}) => {
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const imgRef = useRef<HTMLImageElement>(null);
  const [showVariants, setShowVariants] = useState(false);

  const menuLang = useMenuLanguageStore((s) => s.lang);
  const isArabic = (menuLang || "").toLowerCase().startsWith("ar");
  const showArabicName = isArabic && !!item.name_secondary;
  const displayName = showArabicName ? item.name_secondary : item.name;
  const nameDir = showArabicName ? ("rtl" as const) : undefined;
  const nameTranslate = showArabicName ? ("no" as const) : undefined;
  const nameNo = showArabicName ? " notranslate" : "";

  const features = getFeatures(hoteldata?.feature_flags || "");
  const hasOrderingFeature = features?.ordering.enabled && tableNumber !== 0;
  const hasDeliveryFeature = features?.delivery.enabled && tableNumber === 0;
  const showAddButton = (hasOrderingFeature || hasDeliveryFeature) && item.is_available;

  const hasVariants = (item.variants?.length ?? 0) > 0;
  const itemInCart = items?.find((i) => i.id === item.id);
  const variantItems = hasVariants ? items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [] : [];
  const quantity = (itemInCart?.quantity || 0) + variantItems.reduce((sum, i) => sum + i.quantity, 0);

  const shouldShowPrice = hoteldata?.currency !== "🚫";
  const price =
    item.variants?.slice().sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0))[0]?.price || item.price;

  const getVariantOffer = (variantName: string) =>
    hoteldata?.offers?.find((o) => o.menu && o.menu.id === item.id && o.variant?.name === variantName);

  const variantQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    (item.variants || []).forEach((v) => {
      const ci = items?.find((i) => i.id === `${item.id}|${v.name}`);
      map[v.name] = ci?.quantity || 0;
    });
    return map;
  }, [items, item.variants, item.id]);

  const addSimple = () => {
    addItem({ ...item, variantSelections: [], price } as any);
    flyToCart(imgRef.current, SEARCH_CART_ID);
  };

  const handleAddClick = () => {
    if (hasVariants) setShowVariants(true);
    else addSimple();
  };

  const handleDecrease = () => {
    if (!item.id) return;
    if (quantity > 1) decreaseQuantity(item.id);
    else removeItem(item.id);
  };

  const handleVariantAdd = (variant: any) => {
    const variantOffer = getVariantOffer(variant.name);
    const isUpcoming = !!variantOffer && new Date(variantOffer.start_time) > new Date();
    const finalPrice = variantOffer && !isUpcoming ? variantOffer.offer_price : variant.price;
    addItem({
      ...item,
      id: `${item.id}|${variant.name}`,
      name: `${item.name} (${variant.name})`,
      price: finalPrice,
      variantSelections: [{ id: variant.id, name: variant.name, price: variant.price ?? 0, quantity: 1 }],
    } as any);
  };

  const handleVariantRemove = (variant: any) => {
    decreaseQuantity(`${item.id}|${variant.name}`);
  };

  // Closing the variant sheet flies the item into the cart as confirmation,
  // matching the simple-item add animation.
  const closeVariantsWithFly = () => {
    const willFly = quantity > 0;
    setShowVariants(false);
    if (willFly) window.setTimeout(() => flyToCart(imgRef.current, SEARCH_CART_ID), 80);
  };

  const { ref: inViewRef, visible } = useInView();

  return (
    <div
      ref={inViewRef}
      className="flex gap-3 py-3 transition-all duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
          {item.is_top && (
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accent }}>
              ⭐ Bestseller
            </span>
          )}
        </div>
        <h3 dir={nameDir} translate={nameTranslate} className={`mt-1 text-left text-sm font-bold leading-snug text-gray-900${nameNo}`}>{displayName}</h3>
        {shouldShowPrice && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-gray-900">
            {hasVariants && <span className="text-[10px] font-medium text-gray-400">From </span>}
            <MenuPrice forceSymbolLtr currency={hoteldata?.currency} amount={formatPrice(price, hoteldata?.id)} />
          </div>
        )}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400">{item.description}</p>
        )}
      </div>

      <div className="relative shrink-0">
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5">
          {visible && (
            <img
              ref={imgRef}
              src={item.image_url || "/image_placeholder.png"}
              alt={item.name}
              className={`h-full w-full object-cover ${!item.image_url ? "opacity-50 invert" : ""} ${!item.is_available ? "grayscale" : ""}`}
            />
          )}
          {!item.is_available && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white">
              Unavailable
            </div>
          )}
        </div>

        {showAddButton && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
            {quantity > 0 && !hasVariants ? (
              <div
                className="flex items-center gap-0.5 rounded-lg border bg-white px-0.5 py-0.5 shadow-md"
                style={{ borderColor: `${accent}4D` }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleDecrease(); }}
                  className="flex h-6 w-6 items-center justify-center rounded"
                  style={{ color: accent }}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[16px] text-center text-xs font-extrabold" style={{ color: accent }}>{quantity}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); addSimple(); }}
                  className="flex h-6 w-6 items-center justify-center rounded"
                  style={{ color: accent }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleAddClick(); }}
                className="rounded-lg border bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-md transition active:scale-95"
                style={{ borderColor: `${accent}4D`, color: accent }}
              >
                {hasVariants ? "Add" : quantity > 0 ? `${quantity}` : "Add"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Variant selection sheet */}
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

          <div className="flex items-start justify-between gap-3 p-4 pb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
                <h3 dir={nameDir} translate={nameTranslate} className={`text-left text-lg font-bold text-gray-900${nameNo}`}>{displayName}</h3>
              </div>
              {item.description && (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-400">{item.description}</p>
              )}
            </div>
          </div>

          <div className="mx-4 border-t border-gray-100" />

          <div className="p-4">
            {showAddButton && (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="text-base font-bold text-gray-900">Options</h4>
                  <span
                    className="rounded border px-2 py-0.5 text-xs font-medium"
                    style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
                  >
                    Select
                  </span>
                </div>
                <p className="mb-3 text-sm text-gray-400">Choose a size / variant</p>
              </>
            )}

            <div className="divide-y divide-gray-100">
              {(item.variants || []).filter(Boolean).map((variant) => {
                const variantOffer = getVariantOffer(variant.name);
                const hasValidVariantOffer = variantOffer && typeof variantOffer.offer_price === "number";
                const originalVariantPrice = variant.price;
                const hasValidOriginalPrice = typeof originalVariantPrice === "number";
                const qty = variantQuantities[variant.name] || 0;

                return (
                  <div key={variant.name} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      {item.is_veg !== null && item.is_veg !== undefined && (
                        <div className="flex-shrink-0"><VegMark isVeg={item.is_veg} /></div>
                      )}
                      <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{variant.name}</span>
                    </div>

                    {shouldShowPrice && !item.is_price_as_per_size && (
                      <div className="flex-shrink-0 text-sm font-semibold">
                        {hasValidVariantOffer ? (
                          <div className="flex items-center gap-1.5">
                            <MenuPrice forceSymbolLtr className="text-gray-900" currency={hoteldata?.currency} amount={formatPrice(variantOffer!.offer_price!, hoteldata?.id)} />
                            {hasValidOriginalPrice && originalVariantPrice! > variantOffer!.offer_price! && (
                              <MenuPrice forceSymbolLtr className="text-xs font-normal text-gray-400 line-through" currency={hoteldata?.currency} amount={formatPrice(originalVariantPrice, hoteldata?.id)} />
                            )}
                          </div>
                        ) : hasValidOriginalPrice && originalVariantPrice! > 0 ? (
                          <MenuPrice forceSymbolLtr className="text-gray-700" currency={hoteldata?.currency} amount={formatPrice(originalVariantPrice, hoteldata?.id)} />
                        ) : null}
                      </div>
                    )}

                    {showAddButton && (
                      <div className="flex-shrink-0">
                        {qty > 0 ? (
                          <div
                            className="flex items-center gap-0.5 rounded-full border px-0.5 py-0.5"
                            style={{ borderColor: `${accent}4D`, backgroundColor: `${accent}14` }}
                          >
                            <button onClick={() => handleVariantRemove(variant)} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ color: accent }}>
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[16px] text-center text-xs font-extrabold" style={{ color: accent }}>{qty}</span>
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
            <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4">
              <BottomSheetAddButton
                item={item}
                hoteldata={hoteldata}
                variantQuantities={variantQuantities}
                getVariantOffer={getVariantOffer}
                onClose={closeVariantsWithFly}
                accent={accent}
                onAccent={readableTextColor(accent)}
              />
            </div>
          )}
        </V6BottomSheet>,
        document.body,
      )}
    </div>
  );
};

interface V6SearchItemsProps {
  menu: HotelDataMenus[];
  hoteldata: HotelData;
  tableNumber: number;
  onClose: () => void;
  onCartClick: () => void;
  cartCount?: number;
  accent?: string;
}

const V6SearchItems = ({
  menu,
  hoteldata,
  tableNumber,
  onClose,
  onCartClick,
  cartCount = 0,
  accent = "#16a34a",
}: V6SearchItemsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMenu = useMemo(() => filterMenuByQuery(menu, searchQuery), [menu, searchQuery]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => { inputRef.current?.focus(); }, 150);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "auto";
    };
  }, []);

  const closeModal = () => {
    setClosing(true);
    setTimeout(() => { setSearchQuery(""); onClose(); }, 250);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-white"
      style={{
        fontFamily: V6_FONT,
        animation: closing ? "v6SearchOut 250ms ease-in forwards" : "v6SearchIn 300ms ease-out forwards",
      }}
    >
      <style>{`
        @keyframes v6SearchIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes v6SearchOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(8px); } }
      `}</style>

      <div className="flex items-center gap-1 border-b border-gray-200/60 p-2">
        <button
          onClick={closeModal}
          aria-label="Back"
          className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-900 transition hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-grow items-center gap-2">
          <Search className="ml-2 h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            placeholder="Search for dishes..."
            className="w-full border-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        <div className="divide-y divide-gray-200/60 px-4 pb-24 pt-2">
          {filteredMenu.length > 0 ? (
            filteredMenu.map((item) => (
              <V6SearchRow
                key={item.id}
                item={item}
                hoteldata={hoteldata}
                tableNumber={tableNumber}
                accent={accent}
              />
            ))
          ) : (
            <div className="p-10 text-center text-gray-400">
              <p>No dishes found{searchQuery ? ` for “${searchQuery}”` : ""}</p>
            </div>
          )}
        </div>
      </div>

      <button
        id={SEARCH_CART_ID}
        onClick={onCartClick}
        aria-label={`Cart: ${cartCount} item${cartCount === 1 ? "" : "s"}`}
        className="fixed bottom-6 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition active:scale-90"
        style={{ backgroundColor: accent, color: readableTextColor(accent) }}
      >
        <ShoppingBag className="h-6 w-6" strokeWidth={2.2} />
        {cartCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-white bg-white px-1 text-[12px] font-extrabold tabular-nums"
            style={{ color: accent }}
          >
            {cartCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default V6SearchItems;
