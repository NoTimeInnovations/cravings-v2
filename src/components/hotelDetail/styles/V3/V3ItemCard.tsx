"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { pushEcommerceEvent, resolveCurrencyCode, categoryName, baseItemId } from "@/lib/partnerDataLayer";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { DefaultHotelPageProps } from "../Default/Default";
import { getFeatures } from "@/lib/getFeatures";
import { useViewOnly } from "@/components/hotelDetail/viewOnlyContext";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import useOrderStore from "@/store/orderStore";
import { Offer } from "@/store/offerStore_hasura";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/constants";
import { X } from "lucide-react";
import { computeOutOfStock } from "@/lib/stockStatus";
import { useLiveStock } from "@/store/liveStockStore";
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end">
      <div
        ref={backdropRef}
        onClick={() => animateClose()}
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      <div
        ref={sheetRef}
        className="relative z-10 mx-auto flex w-full max-w-2xl max-h-[88vh] flex-col overflow-hidden rounded-t-[22px] bg-white transition-transform duration-300 ease-out"
        style={{ transform: "translateY(100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => animateClose()}
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50"
        >
          <X className="h-4 w-4 text-white" strokeWidth={2.6} />
        </button>
        <div className="flex-1 overflow-y-auto">{children}</div>
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
      style={{ background: V3_RED, boxShadow: "0 8px 20px -8px rgba(203,32,45,.6)" }}
      className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[14.5px] font-extrabold text-white transition active:scale-[0.98]"
    >
      <span>Add to cart</span>
      <span>·</span>
      <span><MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(total, hoteldata?.id)} /></span>
    </button>
  );
};

function VegMark({ isVeg, size = 16 }: { isVeg: boolean; size?: number }) {
  const color = isVeg ? "#0f8a45" : "#a33a2a";
  const dot = Math.round(size * 0.44);
  return (
    <span
      style={{
        width: size,
        height: size,
        border: `1.6px solid ${color}`,
        borderRadius: 3,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ width: dot, height: dot, borderRadius: "50%", background: color }} />
    </span>
  );
}

// Small filled star used in the "Bestseller" label (matches the design's SVG).
function BestsellerStar({ size = 10, fill = "#e0a63a" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <path d="M12 2l2.9 6.3 6.8.6-5.1 4.6 1.5 6.7L12 17.3 5.9 20.8l1.5-6.7L2.3 8.9l6.8-.6z" />
    </svg>
  );
}

// Shared V3 (Zomato-style) accent tokens — red pill ADD button + stepper that
// overlaps the bottom edge of the item image.
const V3_RED = "#cb202d";
const addPillClass =
  "flex items-center justify-center w-[104px] h-[38px] rounded-[10px] border border-[#e6b9bc] bg-white text-[#cb202d] text-[14px] font-extrabold tracking-[.5px] shadow-[0_6px_16px_-8px_rgba(0,0,0,.3)] transition active:scale-95";
const stepperWrapClass =
  "flex items-center justify-between w-[104px] h-[38px] rounded-[10px] border border-[#e6b9bc] bg-white shadow-[0_6px_16px_-8px_rgba(0,0,0,.3)] px-1";
const stepBtnClass =
  "flex h-full w-8 items-center justify-center text-[20px] font-bold leading-none text-[#cb202d]";

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
  const liveStockQty = useLiveStock((s) => s.qty);

  const features = getFeatures(feature_flags || "");
  const viewOnly = useViewOnly();
  const deliveryRules = hoteldata?.delivery_rules;
  const isDeliveryTimeOpen = deliveryRules?.isDeliveryActive !== false &&
    isWithinTimeWindow(deliveryRules?.delivery_time_allowed);
  const isTakeawayTimeOpen = isWithinTimeWindow(deliveryRules?.takeaway_time_allowed);
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

  const { ref: inViewRef, visible } = useInView();

  return (
    <>
      {/* V3 list-style (Zomato) item card */}
      <div
        ref={inViewRef}
        className="flex cursor-pointer gap-3 py-3.5 transition-all duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
        onClick={() => {
          pushEcommerceEvent("view_item", {
            currency: resolveCurrencyCode(hoteldata?.currency),
            value: item.price,
            items: [{ item_id: baseItemId(item.id), item_name: item.name, item_category: categoryName(item.category), price: item.price }],
          });
          if (hasVariants) setShowVariants(true);
          else setShowItemSheet(true);
        }}
      >
        {/* Left content */}
        <div className="min-w-0 flex-1">
          <div className="mb-[5px] flex items-center gap-2">
            {item.is_veg !== null && item.is_veg !== undefined && (
              <VegMark isVeg={item.is_veg} />
            )}
            {item.is_top && (
              <span className="inline-flex items-center gap-[3px] text-[10px] font-extrabold uppercase tracking-[.3px] text-[#c8842a]">
                <BestsellerStar />
                Bestseller
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-bold leading-[1.25] text-[#2d2d2d]">
            {offerData?.variant && !hasMultipleVariantsOnOffer
              ? `${item.name} (${offerData.variant.name})`
              : item.name}
          </h3>
          {item.name_secondary && (
            <p
              dir={item.name_secondary_rtl ? "rtl" : "ltr"}
              className="v3-name-secondary mt-0.5 text-left text-[13px] font-semibold leading-snug text-[#9a9a9a]"
            >
              {item.name_secondary}
            </p>
          )}

          {/* Price */}
          {shouldShowPrice && (
            <div className="mt-[5px] flex items-center gap-[7px] text-[14px] font-bold">
              {item.is_price_as_per_size !== true ? (
                hasValidMainOffer ? (
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: V3_RED }}>
                      <MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(mainOfferPrice, hoteldata?.id)} />
                    </span>
                    {!hasMultipleVariantsOnOffer && hasValidMainOriginalPrice && (
                      <span className="text-[11px] font-normal line-through opacity-40">
                        <MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(mainOriginalPrice, hoteldata?.id)} />
                      </span>
                    )}
                    {discountPercentage > 0 && (
                      <span className="rounded px-1 py-0.5 text-[9px] font-semibold text-white" style={{ background: V3_RED }}>
                        {discountPercentage}% OFF
                      </span>
                    )}
                  </div>
                ) : hasValidBasePrice ? (
                  <span className="text-[#2d2d2d]">
                    {baseItemPrice > 0 ? (
                      <>
                        {hasVariants && <span className="text-[11px] font-normal text-[#8a8a8a]">From </span>}
                        <MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(baseItemPrice, hoteldata?.id)} />
                      </>
                    ) : ""}
                  </span>
                ) : null
              ) : (
                <span className="text-[11px] font-normal text-gray-400">Price as per size</span>
              )}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[12px] leading-[1.45] text-[#8a8a8a]">
              {item.description}
            </p>
          )}

          {/* "Customisable" hint — only when the item actually has options */}
          {(hasVariants || item.is_price_as_per_size === true) && (
            <p className="mt-1.5 text-[10.5px] font-semibold tracking-[.2px] text-[#a3a3a3]">Customisable</p>
          )}
        </div>

        {/* Right - Image & Add button (overlaps the bottom edge of the image) */}
        <div className="relative w-[118px] shrink-0">
          <div className="relative flex h-[112px] w-[118px] items-center justify-center overflow-hidden rounded-[14px] bg-gray-100 shadow-[0_4px_14px_-8px_rgba(0,0,0,.3)]">
            {visible && (
              <img
                src={item.image_url || "/image_placeholder.png"}
                alt={item.name}
                className={`h-full w-full object-cover ${!item.image_url ? "invert opacity-50" : ""} ${!item.is_available || isOutOfStock ? "grayscale" : ""}`}
              />
            )}
            {(!item.is_available || isOutOfStock) && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white">
                {!item.is_available ? "Unavailable" : "Out of Stock"}
              </div>
            )}
          </div>

          {/* Add button / stepper overlay below image */}
          {isOrderable && (
            <div className="absolute -bottom-[13px] left-1/2 -translate-x-1/2">
              {offerData && item.category?.name?.toLowerCase() === "custom" ? (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/offers/${offerData.id}`); }}
                  className={addPillClass}
                >
                  View
                </button>
              ) : (hasVariants && !offerData) || hasMultipleVariantsOnOffer ? (
                !defaultShowOptions ? (
                  (!hasOrderingFeature && !hasDeliveryFeature) ? (
                    viewOnly ? null : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowVariants(true); }}
                      className={addPillClass}
                    >
                      Add
                    </button>
                    )
                  ) : itemQuantity > 0 ? (
                    <div className={stepperWrapClass}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const variantInCart = items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
                          const lastVariant = variantInCart[variantInCart.length - 1];
                          if (lastVariant) {
                            lastVariant.quantity > 1 ? decreaseQuantity(lastVariant.id) : removeItem(lastVariant.id);
                          }
                        }}
                        className={stepBtnClass}
                      >
                        −
                      </button>
                      <span className="text-[15px] font-extrabold text-[#cb202d]">{itemQuantity}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowVariants(true); }}
                        className={stepBtnClass}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                      className={addPillClass}
                    >
                      Add
                    </button>
                  )
                ) : null
              ) : showAddButton && itemQuantity > 0 ? (
                <div className={stepperWrapClass}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const idToRemove = offerData?.variant ? `${item.id}|${offerData.variant.name}` : (item.id as string);
                      itemQuantity > 1 ? decreaseQuantity(idToRemove) : removeItem(idToRemove);
                    }}
                    className={stepBtnClass}
                  >
                    −
                  </button>
                  <span className="text-[15px] font-extrabold text-[#cb202d]">{itemQuantity}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                    className={stepBtnClass}
                  >
                    +
                  </button>
                </div>
              ) : showAddButton ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                  className={addPillClass}
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
          {/* Image header (flush to the rounded sheet top) */}
          <div className="relative h-[174px] w-full overflow-hidden bg-gray-100">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">🍽️</div>
            )}
          </div>

          <div className="px-[18px] pt-4">
            <div className="flex items-center gap-2">
              {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
              {item.is_top && (
                <span className="inline-flex items-center gap-[3px] text-[11px] font-bold text-[#c8842a]">
                  <BestsellerStar />
                  Bestseller
                </span>
              )}
            </div>
            <h2 className="mt-[7px] text-[19px] font-extrabold tracking-tight text-[#2d2d2d]">{item.name}</h2>
            {item.name_secondary && (
              <p
                dir={item.name_secondary_rtl ? "rtl" : "ltr"}
                className="v3-name-secondary mt-0.5 text-left text-[15px] font-semibold leading-snug text-[#9a9a9a]"
              >
                {item.name_secondary}
              </p>
            )}

            {shouldShowPrice && (
              <div className="mt-1.5 flex items-center gap-2">
                {hasValidMainOffer && !isUpcomingOffer ? (
                  <>
                    <span className="text-[14px] font-bold" style={{ color: V3_RED }}><MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(offerData!.offer_price!, hoteldata?.id)} /></span>
                    {hasValidMainOriginalPrice && mainOriginalPrice > offerData!.offer_price! && (
                      <span className="text-[13px] font-normal text-gray-400 line-through"><MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(mainOriginalPrice, hoteldata?.id)} /></span>
                    )}
                  </>
                ) : hasValidBasePrice && baseItemPrice > 0 ? (
                  <span className="text-[14px] font-bold text-[#2d2d2d]"><MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(baseItemPrice, hoteldata?.id)} /></span>
                ) : null}
              </div>
            )}

            {item.description && (
              <p className="mt-2 whitespace-pre-line text-[12.5px] leading-[1.5] text-[#8a8a8a]">{item.description}</p>
            )}
            <div className="h-3.5" />
          </div>

          {/* Footer: qty stepper + Add item */}
          {isOrderable && showAddButton && (
            <div className="sticky bottom-0 flex items-center gap-3.5 bg-white px-[18px] pb-6 pt-3 shadow-[0_-6px_18px_-12px_rgba(0,0,0,.2)]">
              {itemQuantity > 0 && (
                <div className="flex items-center overflow-hidden rounded-[11px] border-[1.5px] border-[#e6b9bc]">
                  <button
                    onClick={() => { if (itemQuantity === 1) removeItem(item.id as string); else decreaseQuantity(item.id as string); }}
                    className="flex h-[46px] w-[38px] items-center justify-center text-[20px] font-bold text-[#cb202d]"
                  >
                    −
                  </button>
                  <span className="w-[30px] text-center text-[15px] font-extrabold text-[#cb202d]">{itemQuantity}</span>
                  <button
                    onClick={() => handleAddItem()}
                    className="flex h-[46px] w-[38px] items-center justify-center text-[20px] font-bold text-[#cb202d]"
                  >
                    +
                  </button>
                </div>
              )}
              <button
                onClick={() => (itemQuantity > 0 ? setShowItemSheet(false) : handleAddItem())}
                style={{ background: V3_RED, boxShadow: "0 8px 20px -8px rgba(203,32,45,.6)" }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[14.5px] font-extrabold text-white transition active:scale-[0.98]"
              >
                <span>{itemQuantity > 0 ? "Done" : "Add item"}</span>
                <span>·</span>
                <span><MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice((hasValidMainOffer && !isUpcomingOffer ? offerData!.offer_price! : baseItemPrice) * (itemQuantity || 1), hoteldata?.id || "")} /></span>
              </button>
            </div>
          )}
        </V3BottomSheet>,
        document.body
      )}

      {/* Bottom Sheet for Variants */}
      {showVariants && hasVariants && typeof window !== "undefined" && createPortal(
        <V3BottomSheet onClose={() => setShowVariants(false)}>
          {/* Image header (flush to the rounded sheet top) */}
          <div className="relative h-[174px] w-full overflow-hidden bg-gray-100">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">🍽️</div>
            )}
          </div>

          <div className="px-[18px] pt-4">
            <div className="flex items-center gap-2">
              {item.is_veg !== null && item.is_veg !== undefined && <VegMark isVeg={item.is_veg} />}
              <h3 className="text-[19px] font-extrabold tracking-tight text-[#2d2d2d]">{item.name}</h3>
            </div>
            {item.name_secondary && (
              <p
                dir={item.name_secondary_rtl ? "rtl" : "ltr"}
                className="v3-name-secondary mt-0.5 text-left text-[15px] font-semibold leading-snug text-[#9a9a9a]"
              >
                {item.name_secondary}
              </p>
            )}
            {item.description && (
              <p className="mt-2 whitespace-pre-line text-[12.5px] leading-[1.5] text-[#8a8a8a]">{item.description}</p>
            )}
          </div>

          <div className="px-[18px] pt-4">
            <div className="mb-1 text-[13px] font-extrabold text-[#2d2d2d]">
              Choose an option
              {(hasOrderingFeature || hasDeliveryFeature) && (
                <span className="ml-1 text-[11px] font-semibold text-[#a3a3a3]">· Required</span>
              )}
            </div>

            <div className="divide-y divide-[#f4f4f2]">
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
                    <div key={variant.name} className="flex items-center gap-3 py-[11px]">
                      <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-[#2d2d2d]">{variant.name}</span>

                      {shouldShowPrice && !item.is_price_as_per_size && (
                        <div className="flex-shrink-0 text-[12.5px] font-semibold text-[#828282]">
                          {hasValidVariantOffer ? (
                            <div className="flex items-center gap-1.5">
                              <span style={{ color: V3_RED }}><MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(variantOffer.offer_price!, hoteldata?.id)} /></span>
                              {hasValidOriginalPrice && originalVariantPrice > variantOffer.offer_price! && (
                                <span className="text-xs font-normal text-gray-400 line-through"><MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(originalVariantPrice, hoteldata?.id)} /></span>
                              )}
                            </div>
                          ) : hasValidOriginalPrice && originalVariantPrice > 0 ? (
                            <span><MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(originalVariantPrice, hoteldata?.id)} /></span>
                          ) : null}
                        </div>
                      )}

                      {showVariantAddButton && !isMenuOnly && (
                        <div className="flex-shrink-0">
                          {qty > 0 ? (
                            <div className="flex items-center rounded-[10px] border border-[#e6b9bc] bg-white">
                              <button onClick={() => handleVariantRemove(variant)} className="flex h-8 w-8 items-center justify-center text-[18px] font-bold text-[#cb202d]">−</button>
                              <span className="min-w-[18px] text-center text-[13px] font-extrabold text-[#cb202d]">{qty}</span>
                              <button onClick={() => handleVariantAdd(variant)} className="flex h-8 w-8 items-center justify-center text-[18px] font-bold text-[#cb202d]">+</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleVariantAdd(variant)}
                              className="rounded-[10px] border border-[#e6b9bc] bg-white px-5 py-1.5 text-[12px] font-extrabold uppercase tracking-[.5px] text-[#cb202d] shadow-sm transition active:scale-95"
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
            <div className="sticky bottom-0 bg-white px-[18px] pb-6 pt-3 shadow-[0_-6px_18px_-12px_rgba(0,0,0,.2)]">
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
