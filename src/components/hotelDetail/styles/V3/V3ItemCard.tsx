"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { DefaultHotelPageProps } from "../Default/Default";
import { getFeatures } from "@/lib/getFeatures";
import useOrderStore from "@/store/orderStore";
import { Offer } from "@/store/offerStore_hasura";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/constants";
import { X, Plus, Minus } from "lucide-react";

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

function V3BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
      <div
        ref={backdropRef}
        onClick={() => animateClose()}
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      <div
        ref={sheetRef}
        className="relative z-10 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white transition-transform duration-300 ease-out"
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
}: {
  item: any;
  hoteldata: any;
  variantQuantities: Record<string, number>;
  getVariantOffer: (name: string) => any;
  onClose: () => void;
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
      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition active:scale-[0.98]"
    >
      <Plus className="h-4 w-4" />
      Add to cart — {hoteldata?.currency || "₹"}{formatPrice(total, hoteldata?.id)}
    </button>
  );
};

function VegMark({ isVeg }: { isVeg: boolean }) {
  return (
    <div
      className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border-[1.5px] ${
        isVeg ? "border-emerald-600" : "border-red-600"
      }`}
    >
      <div
        className={`h-1.5 w-1.5 rounded-full ${
          isVeg ? "bg-emerald-600" : "bg-red-600"
        }`}
      />
    </div>
  );
}

const V3ItemCard = ({
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
  const [showVariants, setShowVariants] = useState(defaultShowOptions);
  const [showItemSheet, setShowItemSheet] = useState(false);

  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const router = useRouter();

  const hasDeliveryFeature =
    getFeatures(feature_flags || "")?.delivery.enabled && tableNumber === 0;
  const hasOrderingFeature =
    getFeatures(feature_flags || "")?.ordering.enabled && tableNumber !== 0;
  const isPartnersRole = auth?.role === "partner";

  const hasStockFeature = getFeatures(feature_flags || "")?.stockmanagement?.enabled;
  const isOutOfStock =
    hasStockFeature &&
    (item.stocks?.length ?? 0) > 0 &&
    (item.stocks?.[0]?.stock_quantity ?? 1) <= 0;

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
      setShowVariants(!showVariants);
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

  return (
    <>
      {/* V3 List-style item card */}
      <div
        ref={inViewRef}
        className="flex gap-3 py-3 cursor-pointer transition-all duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
        onClick={() => {
          if (hasVariants) setShowVariants(true);
          else setShowItemSheet(true);
        }}
      >
        {/* Left content */}
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
          <h3 className="mt-1 text-sm font-bold leading-snug text-gray-900">
            {offerData?.variant && !hasMultipleVariantsOnOffer
              ? `${item.name} (${offerData.variant.name})`
              : item.name}
          </h3>

          {/* Price */}
          {shouldShowPrice && (
            <div className="mt-0.5 flex items-center gap-2 text-xs font-bold">
              {item.is_price_as_per_size !== true ? (
                hasValidMainOffer ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-500">
                      {hoteldata?.currency || "₹"}{formatPrice(mainOfferPrice, hoteldata?.id)}
                    </span>
                    {!hasMultipleVariantsOnOffer && hasValidMainOriginalPrice && (
                      <span className="text-[10px] line-through opacity-40 font-normal">
                        {hoteldata?.currency || "₹"}{formatPrice(mainOriginalPrice, hoteldata?.id)}
                      </span>
                    )}
                    {discountPercentage > 0 && (
                      <span className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded font-semibold">
                        {discountPercentage}% OFF
                      </span>
                    )}
                  </div>
                ) : hasValidBasePrice ? (
                  <span className="text-gray-900">
                    {baseItemPrice > 0 ? (
                      <>
                        {hasVariants && <span className="text-[10px] font-normal">From </span>}
                        {hoteldata?.currency || "₹"}{formatPrice(baseItemPrice, hoteldata?.id)}
                      </>
                    ) : ""}
                  </span>
                ) : null
              ) : (
                <span className="text-[10px] font-normal text-gray-400">Price as per size</span>
              )}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400">
              {item.description}
            </p>
          )}

          {/* Unavailable / Out of stock */}
          {(!item.is_available || isOutOfStock) && (
            <span className="mt-1 inline-block text-[10px] font-semibold text-red-500">
              {!item.is_available ? "Unavailable" : "Out of Stock"}
            </span>
          )}
        </div>

        {/* Right - Image & Add Button */}
        <div className="relative shrink-0">
          <div className="h-24 w-24 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 flex items-center justify-center bg-gray-100">
            {visible && (
              <img
                src={item.image_url || "/image_placeholder.png"}
                alt={item.name}
                className={`h-full w-full object-cover ${!item.image_url ? "invert opacity-50" : ""} ${!item.is_available || isOutOfStock ? "grayscale" : ""}`}
              />
            )}
          </div>

          {/* Add button overlay below image */}
          {isOrderable && (
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
              {offerData && item.category?.name?.toLowerCase() === "custom" ? (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/offers/${offerData.id}`); }}
                  className="rounded-md border border-emerald-600/30 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-md transition active:scale-95"
                >
                  View
                </button>
              ) : (hasVariants && !offerData) || hasMultipleVariantsOnOffer ? (
                !defaultShowOptions ? (
                  itemQuantity > 0 ? (
                    <div className="flex items-center gap-0.5 rounded-md border border-emerald-600/30 bg-white px-0.5 py-0.5 shadow-md">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const variantInCart = items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
                          const lastVariant = variantInCart[variantInCart.length - 1];
                          if (lastVariant) {
                            lastVariant.quantity > 1 ? decreaseQuantity(lastVariant.id) : removeItem(lastVariant.id);
                          }
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-emerald-700"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[16px] text-center text-xs font-extrabold text-emerald-700">{itemQuantity}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowVariants(true); }}
                        className="flex h-6 w-6 items-center justify-center rounded text-emerald-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowVariants(!showVariants); }}
                      className="rounded-md border border-emerald-600/30 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-md transition active:scale-95"
                    >
                      Add
                    </button>
                  )
                ) : null
              ) : showAddButton && itemQuantity > 0 ? (
                <div className="flex items-center gap-0.5 rounded-md border border-emerald-600/30 bg-white px-0.5 py-0.5 shadow-md">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const idToRemove = offerData?.variant ? `${item.id}|${offerData.variant.name}` : (item.id as string);
                      itemQuantity > 1 ? decreaseQuantity(idToRemove) : removeItem(idToRemove);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-emerald-700"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[16px] text-center text-xs font-extrabold text-emerald-700">{itemQuantity}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                    className="flex h-6 w-6 items-center justify-center rounded text-emerald-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : showAddButton ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                  className="rounded-md border border-emerald-600/30 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-md transition active:scale-95"
                >
                  Add
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet for Item Details (non-variant items) */}
      {showItemSheet && !hasVariants && typeof window !== "undefined" && createPortal(
        <V3BottomSheet onClose={() => setShowItemSheet(false)}>
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
              {item.is_veg !== null && item.is_veg !== undefined && (
                <div className={`flex h-4 w-4 items-center justify-center rounded-sm border-[1.5px] ${item.is_veg ? "border-emerald-600" : "border-red-600"}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${item.is_veg ? "bg-emerald-600" : "bg-red-600"}`} />
                </div>
              )}
              {item.is_top && (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                  ⭐ Bestseller
                </span>
              )}
            </div>
            <h2 className="mt-1.5 text-lg font-extrabold tracking-tight text-gray-900">{item.name}</h2>

            {shouldShowPrice && (
              <div className="mt-1 flex items-center gap-2">
                {hasValidMainOffer && !isUpcomingOffer ? (
                  <>
                    <span className="text-base font-extrabold text-red-500">{hoteldata?.currency || "₹"}{formatPrice(offerData!.offer_price!, hoteldata?.id)}</span>
                    {hasValidMainOriginalPrice && mainOriginalPrice > offerData!.offer_price! && (
                      <span className="line-through text-gray-400 text-sm">{hoteldata?.currency || "₹"}{formatPrice(mainOriginalPrice, hoteldata?.id)}</span>
                    )}
                  </>
                ) : hasValidBasePrice && baseItemPrice > 0 ? (
                  <span className="text-base font-extrabold text-gray-900">{hoteldata?.currency || "₹"}{formatPrice(baseItemPrice, hoteldata?.id)}</span>
                ) : null}
              </div>
            )}

            {item.description && (
              <p className="mt-2 text-xs leading-relaxed text-gray-400">{item.description}</p>
            )}

            {isOrderable && showAddButton && (
              <div className="mt-4">
                {itemQuantity === 0 ? (
                  <button
                    onClick={() => handleAddItem()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Add to cart — {hoteldata?.currency || "₹"}{formatPrice(hasValidMainOffer && !isUpcomingOffer ? offerData!.offer_price! : baseItemPrice, hoteldata?.id || "")}
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 items-center justify-between rounded-xl border-2 border-emerald-600/30 bg-emerald-50 px-1.5 py-1.5">
                      <button
                        onClick={() => { if (itemQuantity === 1) removeItem(item.id as string); else decreaseQuantity(item.id as string); }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-700"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-lg font-extrabold text-emerald-700">{itemQuantity}</span>
                      <button
                        onClick={() => handleAddItem()}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">Total</p>
                      <p className="text-base font-extrabold text-gray-900">
                        {hoteldata?.currency || "₹"}{formatPrice((hasValidMainOffer && !isUpcomingOffer ? offerData!.offer_price! : baseItemPrice) * itemQuantity, hoteldata?.id || "")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </V3BottomSheet>,
        document.body
      )}

      {/* Bottom Sheet for Variants */}
      {showVariants && hasVariants && typeof window !== "undefined" && createPortal(
        <V3BottomSheet onClose={() => setShowVariants(false)}>
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
              {item.description && (
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 mx-4" />

          <div className="p-4">
            {(hasOrderingFeature || hasDeliveryFeature) && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-base text-gray-900">Quantity</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium border border-emerald-200">Required</span>
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
                            <div className={`w-3 h-3 border-[1.5px] flex items-center justify-center ${item.is_veg ? "border-emerald-600" : "border-red-600"}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? "bg-emerald-600" : "bg-red-600"}`} />
                            </div>
                          </div>
                        )}
                        <span className="font-medium text-sm text-gray-900 flex-1 min-w-0">{variant.name}</span>
                      </div>

                      {shouldShowPrice && !item.is_price_as_per_size && (
                        <div className="text-sm font-semibold flex-shrink-0">
                          {hasValidVariantOffer ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-red-500">{hoteldata?.currency || "₹"}{formatPrice(variantOffer.offer_price!, hoteldata?.id)}</span>
                              {hasValidOriginalPrice && originalVariantPrice > variantOffer.offer_price! && (
                                <span className="line-through text-gray-400 text-xs font-normal">{hoteldata?.currency || "₹"}{formatPrice(originalVariantPrice, hoteldata?.id)}</span>
                              )}
                            </div>
                          ) : hasValidOriginalPrice && originalVariantPrice > 0 ? (
                            <span className="text-gray-700">{hoteldata?.currency || "₹"}{formatPrice(originalVariantPrice, hoteldata?.id)}</span>
                          ) : null}
                        </div>
                      )}

                      {showVariantAddButton && !isMenuOnly && (
                        <div className="flex-shrink-0">
                          {qty > 0 ? (
                            <div className="flex items-center gap-0.5 rounded-md border border-emerald-600/30 bg-emerald-50 px-0.5 py-0.5">
                              <button onClick={() => handleVariantRemove(variant)} className="flex h-6 w-6 items-center justify-center rounded text-emerald-700">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-xs font-extrabold text-emerald-700 min-w-[16px] text-center">{qty}</span>
                              <button onClick={() => handleVariantAdd(variant)} className="flex h-6 w-6 items-center justify-center rounded text-emerald-700">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleVariantAdd(variant)}
                              className="rounded-md border border-emerald-600/30 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-sm transition active:scale-95"
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
              />
            </div>
          )}
        </V3BottomSheet>,
        document.body
      )}
    </>
  );
};

export default V3ItemCard;
