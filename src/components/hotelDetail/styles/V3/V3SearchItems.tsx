"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { Search, X, Plus, Minus, ArrowLeft, ShoppingBag } from "lucide-react";
import { readableTextColor } from "@/lib/brandColor";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getFeatures } from "@/lib/getFeatures";
import useOrderStore from "@/store/orderStore";
import { formatPrice } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { filterMenuByQuery } from "@/lib/menuSearch";
import { MenuPrice } from "@/components/hotelDetail/MenuPrice";

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

function VegMark({ isVeg }: { isVeg: boolean }) {
  return (
    <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border-[1.5px] ${isVeg ? "border-emerald-600" : "border-red-600"}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${isVeg ? "bg-emerald-600" : "bg-red-600"}`} />
    </div>
  );
}

const V3SearchResultItem = ({
  item,
  hoteldata,
  tableNumber,
}: {
  item: HotelDataMenus;
  hoteldata: HotelData;
  tableNumber: number;
}) => {
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();

  const hasOrderingFeature = getFeatures(hoteldata?.feature_flags || "")?.ordering.enabled && tableNumber !== 0;
  const hasDeliveryFeature = getFeatures(hoteldata?.feature_flags || "")?.delivery.enabled && tableNumber === 0;
  const showAddButton = hasOrderingFeature || hasDeliveryFeature;

  const hasVariants = item.variants && item.variants.length > 0;
  const itemInCart = items?.find((i) => i.id === item.id);
  const variantItems = hasVariants ? items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [] : [];
  const quantity = (itemInCart?.quantity || 0) + variantItems.reduce((sum, i) => sum + i.quantity, 0);

  const [showVariants, setShowVariants] = useState(false);

  const getVariantOffer = (variantName: string) =>
    hoteldata?.offers?.find(
      (o: any) => o.menu && o.menu.id === item.id && o.variant?.name === variantName,
    );

  const variantQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    (item.variants || []).forEach((v: any) => {
      map[v.name] = items?.find((i) => i.id === `${item.id}|${v.name}`)?.quantity || 0;
    });
    return map;
  }, [items, item.variants, item.id]);

  // Non-variant items add directly. Variant items open a size-picker sheet so the
  // chosen variant's id/name/price is recorded — previously search added the base
  // item at the cheapest variant's price with NO variant identity (wrong name +
  // wrong price + can't pick a size).
  const addSimple = () => {
    if (!item.category?.id) return;
    addItem({
      id: item.id,
      description: item.description,
      image_url: item.image_url,
      is_available: item.is_available,
      is_top: item.is_top,
      priority: item.priority,
      category_id: item.category.id,
      category: item.category,
      price: item.price,
      name: item.name,
      quantity: 1,
      variantSelections: [],
      offers: [],
    } as any);
  };

  const handleAdd = () => {
    if (hasVariants) setShowVariants(true);
    else addSimple();
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

  const handleVariantRemove = (variant: any) => decreaseQuantity(`${item.id}|${variant.name}`);

  const handleDecrease = () => {
    if (!item.id) return;
    if (quantity > 1) decreaseQuantity(item.id);
    else removeItem(item.id);
  };

  const price = item.variants?.sort((a: any, b: any) => (a?.price ?? 0) - (b?.price ?? 0))[0]?.price || item.price;
  const shouldShowPrice = hoteldata?.currency !== "🚫";
  const currency = hoteldata?.currency || "₹";
  const { ref: inViewRef, visible } = useInView();

  return (
    <div
      ref={inViewRef}
      className="flex gap-3 py-3 transition-all duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {item.is_veg !== null && item.is_veg !== undefined && (
            <VegMark isVeg={item.is_veg} />
          )}
          {item.is_top && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600">
              ⭐ Bestseller
            </span>
          )}
        </div>
        <h3 className="mt-1 text-sm font-bold leading-snug text-gray-900">{item.name}</h3>
        {shouldShowPrice && (
          <div className="mt-0.5 flex items-center gap-2 text-xs font-bold text-gray-900">
            {hasVariants && <span className="text-[10px] font-normal">From </span>}
            <MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(price, hoteldata?.id)} />
          </div>
        )}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400">{item.description}</p>
        )}
      </div>

      <div className="relative shrink-0">
        <div className="relative h-24 w-24 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 flex items-center justify-center bg-gray-100">
          {visible && (
            <img
              src={item.image_url || "/image_placeholder.png"}
              alt={item.name}
              className={`h-full w-full object-cover ${!item.image_url ? "invert opacity-50" : ""} ${!item.is_available ? "grayscale" : ""}`}
            />
          )}
          {!item.is_available && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white">
              Unavailable
            </div>
          )}
        </div>

        {showAddButton && item.is_available && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
            {quantity > 0 && !hasVariants ? (
              <div className="flex items-center gap-0.5 rounded-md border border-emerald-600/30 bg-white px-0.5 py-0.5 shadow-md">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDecrease(); }}
                  className="flex h-6 w-6 items-center justify-center rounded text-emerald-700"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[16px] text-center text-xs font-extrabold text-emerald-700">{quantity}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                  className="flex h-6 w-6 items-center justify-center rounded text-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                className="rounded-md border border-emerald-600/30 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-md transition active:scale-95"
              >
                {quantity > 0 ? `${quantity}` : "Add"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Variant selection sheet — portaled to body at z-[9999] so it sits ABOVE
          the search overlay (z-[60]) and its cart button (z-[70]). */}
      {showVariants && hasVariants && typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowVariants(false)} />
            <div className="relative flex max-h-[80vh] flex-col rounded-t-2xl bg-white animate-in slide-in-from-bottom duration-200">
              <div className="sticky top-0 z-10 flex justify-center rounded-t-2xl bg-white pt-2.5 pb-1">
                <div className="h-1 w-8 rounded-full bg-gray-200" />
              </div>

              {item.image_url && (
                <div className="mx-3 mt-1 flex h-40 items-center justify-center overflow-hidden rounded-2xl">
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                </div>
              )}

              <div className="p-4 pb-2">
                <div className="flex items-center gap-2">
                  {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
                  <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                </div>
                {item.description && (
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-400">{item.description}</p>
                )}
              </div>

              <div className="mx-4 border-t border-gray-100" />

              <div className="overflow-y-auto p-4">
                <h4 className="mb-3 text-base font-bold text-gray-900">Choose a size / variant</h4>
                <div className="divide-y divide-gray-100">
                  {(item.variants || []).filter(Boolean).map((variant: any) => {
                    const variantOffer = getVariantOffer(variant.name);
                    const offerPrice =
                      variantOffer && typeof variantOffer.offer_price === "number"
                        ? variantOffer.offer_price
                        : null;
                    const original = variant.price;
                    const qty = variantQuantities[variant.name] || 0;
                    return (
                      <div key={variant.name} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          {item.is_veg !== null && item.is_veg !== undefined && (
                            <div className="shrink-0"><VegMark isVeg={item.is_veg} /></div>
                          )}
                          <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{variant.name}</span>
                        </div>

                        {shouldShowPrice && !(item as any).is_price_as_per_size && (
                          <div className="shrink-0 text-sm font-semibold text-gray-800">
                            {offerPrice != null ? (
                              <span className="flex items-center gap-1.5">
                                <span>{currency}{formatPrice(offerPrice, hoteldata?.id)}</span>
                                {typeof original === "number" && original > offerPrice && (
                                  <span className="text-xs font-normal text-gray-400 line-through">{currency}{formatPrice(original, hoteldata?.id)}</span>
                                )}
                              </span>
                            ) : typeof original === "number" && original > 0 ? (
                              <span>{currency}{formatPrice(original, hoteldata?.id)}</span>
                            ) : null}
                          </div>
                        )}

                        {showAddButton && item.is_available && (
                          <div className="shrink-0">
                            {qty > 0 ? (
                              <div className="flex items-center gap-0.5 rounded-full border border-emerald-600/30 bg-emerald-50 px-0.5 py-0.5">
                                <button onClick={() => handleVariantRemove(variant)} className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-700">
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="min-w-[16px] text-center text-xs font-extrabold text-emerald-700">{qty}</span>
                                <button onClick={() => handleVariantAdd(variant)} className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-700">
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleVariantAdd(variant)}
                                className="rounded-full border border-gray-200 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-sm transition active:scale-95"
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

              <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4">
                <button
                  onClick={() => setShowVariants(false)}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition active:scale-[0.99]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

interface V3SearchItemsProps {
  menu: HotelDataMenus[];
  hoteldata: HotelData;
  tableNumber: number;
  onClose: () => void;
  /** When provided, renders a left back arrow + a floating cart button (V6). */
  onCartClick?: () => void;
  cartCount?: number;
  accent?: string;
}

const V3SearchItems = ({ menu, hoteldata, tableNumber, onClose, onCartClick, cartCount = 0, accent }: V3SearchItemsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMenu = useMemo(
    () => filterMenuByQuery(menu, searchQuery),
    [menu, searchQuery],
  );

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
    setTimeout(() => {
      setSearchQuery("");
      onClose();
    }, 250);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-white"
      style={{
        animation: closing ? "v3SearchOut 250ms ease-in forwards" : "v3SearchIn 300ms ease-out forwards",
      }}
    >
      <style>{`
        @keyframes v3SearchIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes v3SearchOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(8px); }
        }
      `}</style>
      <div className="flex items-center p-2 border-b border-gray-200/60">
        {onCartClick && (
          <button
            onClick={closeModal}
            aria-label="Back"
            className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-900 transition hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-grow flex items-center gap-2">
          <Search className="ml-3 h-5 w-5 text-gray-400" />
          <Input
            ref={inputRef}
            placeholder="Search for dishes..."
            className="text-base border-0 shadow-none focus-visible:ring-0 text-gray-900 placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {!onCartClick && (
          <Button variant="ghost" size="icon" onClick={closeModal} className="mr-2">
            <X className="h-5 w-5 text-gray-900" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-grow">
        <div className="pt-2 pb-4 px-3 divide-y divide-gray-200/60">
          {filteredMenu.length > 0 ? (
            filteredMenu.map((item) => (
              <V3SearchResultItem
                key={item.id}
                item={item}
                hoteldata={hoteldata}
                tableNumber={tableNumber}
              />
            ))
          ) : (
            <div className="text-center p-10 text-gray-400">
              <p>No dishes found for &ldquo;{searchQuery}&rdquo;</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {onCartClick && (
        <button
          onClick={onCartClick}
          aria-label={`Cart: ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          className="fixed bottom-6 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition active:scale-90"
          style={{ backgroundColor: accent || "#16a34a", color: readableTextColor(accent || "#16a34a") }}
        >
          <ShoppingBag className="h-6 w-6" strokeWidth={2.2} />
          {cartCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-white bg-white px-1 text-[12px] font-extrabold tabular-nums"
              style={{ color: accent || "#16a34a" }}
            >
              {cartCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default V3SearchItems;
