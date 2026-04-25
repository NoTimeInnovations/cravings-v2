"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { DefaultHotelPageProps } from "../Default/Default";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import useOrderStore from "@/store/orderStore";
import { Offer } from "@/store/offerStore_hasura";
import { useRouter } from "next/navigation";
import { formatPrice, requiresThreeDecimalPlaces } from "@/lib/constants";
import { X } from "lucide-react";

import { getTagColor } from "@/data/foodTags";

// Bottom sheet footer button with total calculation
const BottomSheetAddButton = ({
  item,
  styles,
  hoteldata,
  variantQuantities,
  getVariantOffer,
  onClose,
}: {
  item: any;
  styles: any;
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
      className="w-full flex items-center justify-between rounded-xl px-5 py-3.5 text-white font-semibold text-base"
      style={{ backgroundColor: styles?.accent || "#ea580c" }}
    >
      <span>Total {hoteldata?.currency || "₹"}{formatPrice(total, hoteldata?.id)}</span>
      <span>Add Item</span>
    </button>
  );
};

const ItemCard = ({
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
  const [showAllTags, setShowAllTags] = useState(false);

  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const router = useRouter();

  const isWithinDeliveryTime = () => {
    if (!hoteldata?.delivery_rules?.delivery_time_allowed) return true;
    const convertTimeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = convertTimeToMinutes(
      hoteldata.delivery_rules.delivery_time_allowed.from ?? "00:00"
    );
    const endTime = convertTimeToMinutes(
      hoteldata.delivery_rules.delivery_time_allowed.to ?? "23:59"
    );
    if (startTime > endTime)
      return currentTime >= startTime || currentTime <= endTime;
    else return currentTime >= startTime && currentTime <= endTime;
  };

  const _features = getFeatures(feature_flags || "");
  const _dr = hoteldata?.delivery_rules;
  const _isDeliveryTimeOpen = _dr?.isDeliveryActive !== false && isWithinTimeWindow(_dr?.delivery_time_allowed);
  const _isTakeawayTimeOpen = isWithinTimeWindow(_dr?.takeaway_time_allowed);
  const hasDeliveryFeature =
    _features?.delivery.enabled && tableNumber === 0 && _isDeliveryTimeOpen;
  const hasOrderingFeature =
    _features?.ordering.enabled && (tableNumber !== 0 || _isTakeawayTimeOpen);

  const isPartnersRole = auth?.role === "partner";

  const hasStockFeature = getFeatures(feature_flags || "")?.stockmanagement
    ?.enabled;
  const isOutOfStock =
    hasStockFeature &&
    (item.stocks?.length ?? 0) > 0 &&
    (item.stocks?.[0]?.stock_quantity ?? 1) <= 0;
  const showStock = hasStockFeature && (item.stocks?.[0]?.show_stock ?? false);
  const stockQuantity = item.stocks?.[0]?.stock_quantity;

  const hasVariants = (item.variants?.length ?? 0) > 0;
  const [itemQuantity, setItemQuantity] = useState<number>(0);
  const [variantQuantities, setVariantQuantities] = useState<
    Record<string, number>
  >({});
  const shouldShowPrice = hoteldata?.currency !== "🚫";

  // ... (rest of the file stays same until showAddButton logic)


  const discountPercentage =
    offerData && shouldShowPrice
      ? (() => {
        if (hasMultipleVariantsOnOffer && allItemOffers) {
          const validOfferPrices = allItemOffers
            .map((o) => o.offer_price)
            .filter((p): p is number => typeof p === "number");
          const validOriginalPrices = allItemOffers
            .map((o) => o.variant?.price ?? o.menu?.price)
            .filter((p): p is number => typeof p === "number");
          if (
            validOfferPrices.length === 0 ||
            validOriginalPrices.length === 0
          )
            return 0;
          const lowestOfferPrice = Math.min(...validOfferPrices);
          const lowestOriginalPrice = Math.min(...validOriginalPrices);
          if (
            lowestOriginalPrice > 0 &&
            lowestOriginalPrice > lowestOfferPrice
          ) {
            return Math.round(
              ((lowestOriginalPrice - lowestOfferPrice) /
                lowestOriginalPrice) *
              100
            );
          }
          return 0;
        } else {
          const originalPrice =
            offerData.variant?.price ?? offerData.menu?.price;
          const offerPrice = offerData.offer_price;
          if (
            typeof originalPrice === "number" &&
            typeof offerPrice === "number" &&
            originalPrice > 0
          ) {
            return Math.round(
              ((originalPrice - offerPrice) / originalPrice) * 100
            );
          }
          return 0;
        }
      })()
      : 0;

  useEffect(() => {
    if (item.variants?.length) {
      const variantItems =
        items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
      const total = variantItems.reduce((sum, i) => sum + i.quantity, 0);
      setItemQuantity(total);
      const newVariantQuantities: Record<string, number> = {};
      variantItems.forEach((variantItem) => {
        const variantName = variantItem.id.split("|")[1];
        if (variantName)
          newVariantQuantities[variantName] = variantItem.quantity;
      });
      setVariantQuantities(newVariantQuantities);
    } else {
      const itemInCart = items?.find((i) => i.id === item.id);
      const variantItems =
        items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
      const totalQuantity =
        (itemInCart?.quantity || 0) +
        variantItems.reduce((sum, i) => sum + i.quantity, 0);
      setItemQuantity(totalQuantity);
    }
  }, [items, item.id, item.variants?.length]);

  useEffect(() => {
    if (defaultShowOptions) {
      setShowVariants(true);
    }
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
        price: isUpcomingOffer
          ? offerData.variant.price
          : offerData.offer_price || 0, // Use original price for upcoming offers, offer price for active offers
        variantSelections: [
          {
            id: (offerData.variant as any).id,
            name: offerData.variant.name,
            price: offerData.variant.price ?? 0,
            quantity: 1,
          },
        ],
      });
      return;
    }
    if (hasVariants) {
      setShowVariants(!showVariants);
    } else {
      addItem({
        ...item,
        variantSelections: [],
        price: isUpcomingOffer
          ? item.price
          : offerData?.offer_price || item.price, // Use original price for upcoming offers
      });
    }
  };

  const handleVariantAdd = (variant: any) => {
    const variantOffer = getVariantOffer(variant.name);
    const hasVariantOffer = !!variantOffer;
    const isVariantUpcoming =
      hasVariantOffer && new Date(variantOffer.start_time) > new Date();
    const finalPrice =
      hasVariantOffer && !isVariantUpcoming
        ? variantOffer.offer_price
        : variant.price;

    addItem({
      ...item,
      id: `${item.id}|${variant.name}`,
      name: `${item.name} (${variant.name})`,
      price: finalPrice,
      variantSelections: [
        {
          id: variant.id,
          name: variant.name,
          price: variant.price ?? 0,
          quantity: 1,
        },
      ],
    });
  };

  const handleVariantRemove = (variant: any) => {
    const variantId = `${item.id}|${variant.name}`;
    decreaseQuantity(variantId);
  };

  const getVariantQuantity = (name: string) => {
    return variantQuantities[name] || 0;
  };

  const getVariantOffer = (variantName: string) => {
    return hoteldata?.offers?.find(
      (o) => o.menu && o.menu.id === item.id && o.variant?.name === variantName
    );
  };

  const isOrderable = item.is_available && !isOutOfStock;
  const hasPrice =
    typeof (
      offerData?.offer_price ??
      item.price ??
      item.variants?.[0]?.price
    ) === "number";
  const showAddButton =
    isOrderable &&
    hasPrice &&
    (hasOrderingFeature || hasDeliveryFeature) &&
    !item.is_price_as_per_size &&
    !isPartnersRole;

  const mainOfferPrice = offerData?.offer_price;
  const hasValidMainOffer = typeof mainOfferPrice === "number";
  const mainOriginalPrice = offerData?.variant?.price ?? offerData?.menu?.price;
  const hasValidMainOriginalPrice = typeof mainOriginalPrice === "number";
  const baseItemPrice =
    item.variants?.sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0))[0]
      ?.price || item.price;
  const hasValidBasePrice = typeof baseItemPrice === "number";

  return (
    <>
      <div className="py-4 flex gap-3 relative md:border-b md:border-gray-100 cursor-pointer" onClick={() => { if (hasVariants) setShowVariants(true); else setShowItemSheet(true); }}>
        {/* Left Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-start pt-0.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            {/* Veg/Non-Veg Indicator */}
            {item.is_veg !== null && item.is_veg !== undefined && (
              <div className="flex-shrink-0">
                {item.is_veg === false ? (
                  <div className="w-3.5 h-3.5 border-[1.5px] border-red-700 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-700"></div>
                  </div>
                ) : (
                  <div className="w-3.5 h-3.5 border-[1.5px] border-green-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                  </div>
                )}
              </div>
            )}
            <h3 className="font-bold text-[16px] leading-tight truncate">
              {offerData?.variant && !hasMultipleVariantsOnOffer
                ? `${item.name} (${offerData.variant.name})`
                : item.name}
            </h3>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-[14px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(showAllTags ? item.tags : item.tags.slice(0, 3)).map((tag, i) => (
                <span
                  key={i}
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border ${getTagColor(tag)}`}
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllTags(!showAllTags);
                  }}
                  className="text-[9px] px-1.5 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200"
                >
                  {showAllTags ? "Less" : `+${item.tags.length - 3}`}
                </button>
              )}
            </div>
          )}

          {/* Price */}
          {shouldShowPrice && (
            <div
              style={{ color: styles?.accent || "#000" }}
              className="text-[16px] font-bold mt-2"
            >
              {item.is_price_as_per_size !== true ? (
                <>
                  {hasValidMainOffer ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-red-500">
                        {hoteldata?.currency || "₹"} {formatPrice(mainOfferPrice, hoteldata?.id)}
                      </span>
                      {!hasMultipleVariantsOnOffer && hasValidMainOriginalPrice && (
                        <span className="text-xs line-through opacity-50 font-normal">
                          {hoteldata?.currency || "₹"} {formatPrice(mainOriginalPrice, hoteldata?.id)}
                        </span>
                      )}
                      {discountPercentage > 0 && (
                        <span className="text-[10px] bg-red-500 text-white px-1 py-0.5 rounded font-semibold">
                          {discountPercentage}% OFF
                        </span>
                      )}
                    </div>
                  ) : hasValidBasePrice ? (
                    <span>
                      {baseItemPrice > 0 ? (
                        <>
                          {hasVariants && <span className="text-xs font-normal">From </span>}
                          {hoteldata?.currency || "₹"} {formatPrice(baseItemPrice, hoteldata?.id)}
                        </>
                      ) : ""}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-xs font-normal opacity-60">Price as per size</span>
              )}
            </div>
          )}

          {showStock && (
            <div className="text-[10px] mt-1">
              {isOutOfStock ? (
                <span className="text-red-500 font-semibold">Out of Stock</span>
              ) : (
                <span className="text-green-600">In Stock: {stockQuantity}</span>
              )}
            </div>
          )}
        </div>

        {/* Right - Image & Actions */}
        <div className="flex-shrink-0 flex flex-col items-center" style={{ maxWidth: "160px" }}>
          <div className="relative">
            {/* Image */}
            <div className="rounded-xl overflow-hidden relative" style={{ width: "156px", minWidth: "156px", height: "110px" }}>
              <img
                src={item.image_url || "/image_placeholder.png"}
                alt={`Best ${item.name} in ${hoteldata.location_details || hoteldata.district || hoteldata.country || 'town'}`}
                className={`w-full h-full object-cover ${!item.image_url ? "invert opacity-50" : ""} ${!item.is_available || isOutOfStock ? "grayscale" : ""}`}
              />
            </div>

            {/* Unavailable Overlay */}
            {(!item.is_available || isOutOfStock) && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-white">
                {!item.is_available ? "Unavailable" : "Out of Stock"}
              </div>
            )}

            {/* Add Button - overlapping bottom of image */}
            {isOrderable && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                {offerData && item.category?.name?.toLowerCase() === "custom" ? (
                  <div
                    onClick={() => router.push(`/offers/${offerData.id}`)}
                    className="bg-white border rounded-lg px-5 py-1 font-semibold text-xs cursor-pointer shadow-sm"
                    style={{ color: styles.accent, borderColor: `${styles.accent}40` }}
                  >
                    View offer
                  </div>
                ) : (hasVariants && !offerData) || hasMultipleVariantsOnOffer ? (
                  !defaultShowOptions ? (
                    itemQuantity > 0 ? (
                      <div
                        className="bg-white border rounded-lg px-3 py-1 font-semibold flex items-center gap-4 text-sm shadow-sm"
                        style={{ color: styles.accent, borderColor: `${styles.accent}30` }}
                      >
                        <button
                          className="cursor-pointer active:scale-90 text-sm leading-none font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Remove last added variant
                            const variantInCart = items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
                            const lastVariant = variantInCart[variantInCart.length - 1];
                            if (lastVariant) {
                              lastVariant.quantity > 1 ? decreaseQuantity(lastVariant.id) : removeItem(lastVariant.id);
                            }
                          }}
                        >
                          −
                        </button>
                        <span className="font-semibold text-sm min-w-[12px] text-center">{itemQuantity}</span>
                        <button
                          className="cursor-pointer active:scale-90 text-sm leading-none font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowVariants(true);
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={(e) => { e.stopPropagation(); setShowVariants(!showVariants); }}
                        className="bg-white border rounded-lg px-5 py-1 font-semibold text-sm cursor-pointer shadow-sm whitespace-nowrap"
                        style={{ color: styles.accent, borderColor: `${styles.accent}40` }}
                      >
                        {(hasOrderingFeature || (!hasOrderingFeature && !hasDeliveryFeature)) ? "Options" : "Add"}
                      </div>
                    )
                  ) : null
                ) : showAddButton && itemQuantity > 0 ? (
                  <div
                    className="bg-white border rounded-lg px-3 py-1 font-semibold flex items-center gap-4 text-sm shadow-sm"
                    style={{ color: styles.accent, borderColor: `${styles.accent}30` }}
                  >
                    <button
                      className="cursor-pointer active:scale-90 text-sm leading-none font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        const idToRemove = offerData?.variant
                          ? `${item.id}|${offerData.variant.name}`
                          : (item.id as string);
                        itemQuantity > 1 ? decreaseQuantity(idToRemove) : removeItem(idToRemove);
                      }}
                    >
                      −
                    </button>
                    <span className="font-semibold text-sm min-w-[12px] text-center">{itemQuantity}</span>
                    <button
                      className="cursor-pointer active:scale-90 text-sm leading-none font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddItem();
                      }}
                    >
                      +
                    </button>
                  </div>
                ) : showAddButton ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddItem();
                    }}
                    className="bg-white border rounded-lg px-5 py-1 font-semibold text-sm cursor-pointer shadow-sm"
                    style={{ color: styles.accent, borderColor: `${styles.accent}40` }}
                  >
                    Add
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Spacing below button */}
          {isOrderable && <div className="h-3" />}
        </div>
      </div>
      {/* Bottom Sheet for Item Details (non-variant items) */}
      {showItemSheet && !hasVariants && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setShowItemSheet(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {item.image_url && (
              <div className="w-full h-48 relative">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-t-3xl" />
              </div>
            )}
            <div className="p-4 pb-2 flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {item.is_veg !== null && item.is_veg !== undefined && (
                    <div className="flex-shrink-0">
                      {item.is_veg === false ? (
                        <div className="w-3.5 h-3.5 border-[1.5px] border-red-700 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-red-700" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 border-[1.5px] border-green-600 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-green-600" />
                        </div>
                      )}
                    </div>
                  )}
                  <h3 className="font-bold text-lg">{item.name}</h3>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                )}
                {shouldShowPrice && (
                  <div className="mt-2 mb-2 text-base font-semibold">
                    {hasValidMainOffer && !isUpcomingOffer ? (
                      <div className="flex items-center gap-2">
                        <span style={{ color: styles.accent }}>{hoteldata?.currency || "₹"}{formatPrice(offerData!.offer_price!, hoteldata?.id)}</span>
                        {hasValidMainOriginalPrice && mainOriginalPrice > offerData!.offer_price! && (
                          <span className="line-through text-gray-400 text-sm">{hoteldata?.currency || "₹"}{formatPrice(mainOriginalPrice, hoteldata?.id)}</span>
                        )}
                      </div>
                    ) : hasValidBasePrice && baseItemPrice > 0 ? (
                      <span className="text-gray-700">{hoteldata?.currency || "₹"}{formatPrice(baseItemPrice, hoteldata?.id)}</span>
                    ) : null}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowItemSheet(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {isOrderable && showAddButton && (
              <div className="p-4 pt-2">
                {itemQuantity > 0 ? (
                  <div className="flex items-center justify-center gap-4 border rounded-xl py-2" style={{ borderColor: `${styles.accent}40` }}>
                    <button onClick={() => { if (itemQuantity === 1) removeItem(item.id as string); else decreaseQuantity(item.id as string); }} className="text-lg font-bold px-3" style={{ color: styles.accent }}>−</button>
                    <span className="text-base font-semibold w-6 text-center" style={{ color: styles.accent }}>{itemQuantity}</span>
                    <button onClick={() => handleAddItem()} className="text-lg font-bold px-3" style={{ color: styles.accent }}>+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { handleAddItem(); setShowItemSheet(false); }}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                    style={{ backgroundColor: styles.accent }}
                  >
                    Add to cart — {hoteldata?.currency || "₹"}{formatPrice(hasValidMainOffer && !isUpcomingOffer ? offerData!.offer_price! : baseItemPrice, hoteldata?.id || "")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Bottom Sheet Modal for Variants */}
      {showVariants && hasVariants && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setShowVariants(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Bottom Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Item Image Header */}
            {item.image_url && (
              <div className="w-full h-40 relative">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-t-3xl"
                />
              </div>
            )}

            {/* Item Info + Close */}
            <div className="p-4 pb-2 flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {item.is_veg !== null && item.is_veg !== undefined && (
                    <div className="flex-shrink-0">
                      {item.is_veg === false ? (
                        <div className="w-3.5 h-3.5 border-[1.5px] border-red-700 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-red-700" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 border-[1.5px] border-green-600 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-green-600" />
                        </div>
                      )}
                    </div>
                  )}
                  <h3 className="font-bold text-lg">{item.name}</h3>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowVariants(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="border-t border-gray-100 mx-4" />

            {/* Variant Selection */}
            <div className="p-4">
              {/* Only show Quantity/Required header when ordering is available */}
              {(hasOrderingFeature || hasDeliveryFeature) && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-base">Quantity</h4>
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-600 font-medium border border-orange-200">
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
                      <div
                        key={variant.name}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Veg/Non-veg indicator */}
                          {item.is_veg !== null && item.is_veg !== undefined && (
                            <div className="flex-shrink-0">
                              {item.is_veg === false ? (
                                <div className="w-3 h-3 border-[1.5px] border-red-700 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-700" />
                                </div>
                              ) : (
                                <div className="w-3 h-3 border-[1.5px] border-green-600 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                </div>
                              )}
                            </div>
                          )}

                          <span className="font-medium text-sm flex-1 min-w-0">{variant.name}</span>
                        </div>

                        {/* Price - always shown on the right side */}
                        {shouldShowPrice && !item.is_price_as_per_size && (
                          <div className="text-sm font-semibold flex-shrink-0">
                            {hasValidVariantOffer ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-red-500">
                                  {hoteldata?.currency || "₹"}{formatPrice(variantOffer.offer_price!, hoteldata?.id)}
                                </span>
                                {hasValidOriginalPrice && originalVariantPrice > variantOffer.offer_price! && (
                                  <span className="line-through text-gray-400 text-xs font-normal">
                                    {hoteldata?.currency || "₹"}{formatPrice(originalVariantPrice, hoteldata?.id)}
                                  </span>
                                )}
                              </div>
                            ) : hasValidOriginalPrice && originalVariantPrice > 0 ? (
                              <span className="text-gray-700">
                                {hoteldata?.currency || "₹"}{formatPrice(originalVariantPrice, hoteldata?.id)}
                              </span>
                            ) : null}
                          </div>
                        )}

                        {/* Add / Quantity stepper (only when ordering/delivery enabled) */}
                        {showVariantAddButton && !isMenuOnly && (
                          <div className="flex-shrink-0">
                            {qty > 0 ? (
                              <div
                                className="flex items-center gap-3 border rounded-lg px-2.5 py-1"
                                style={{ borderColor: `${styles.accent}30` }}
                              >
                                <button
                                  onClick={() => handleVariantRemove(variant)}
                                  className="text-sm font-bold leading-none"
                                  style={{ color: styles.accent }}
                                >
                                  −
                                </button>
                                <span className="text-sm font-semibold w-4 text-center" style={{ color: styles.accent }}>{qty}</span>
                                <button
                                  onClick={() => handleVariantAdd(variant)}
                                  className="text-sm font-bold leading-none"
                                  style={{ color: styles.accent }}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleVariantAdd(variant)}
                                className="border rounded-lg px-4 py-1 text-xs font-semibold"
                                style={{ color: styles.accent, borderColor: `${styles.accent}40` }}
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

            {/* Add Item Footer */}
            {showAddButton && (
              <div className="sticky bottom-0 p-4 bg-white border-t border-gray-100">
                <BottomSheetAddButton
                  item={item}
                  styles={styles}
                  hoteldata={hoteldata}
                  variantQuantities={variantQuantities}
                  getVariantOffer={getVariantOffer}
                  onClose={() => setShowVariants(false)}
                />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

    </>
  );
};

export default ItemCard;