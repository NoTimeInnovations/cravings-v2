"use client";

import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { useEffect, useState } from "react";
import useOrderStore from "@/store/orderStore";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import { formatPrice } from "@/lib/constants";
import { Minus, Plus, Star, UtensilsCrossed } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/** Blend a foreground hex onto a background hex at a given opacity (0-1). Returns a solid opaque hex. */
function blendHex(fg: string, bg: string, opacity: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  try {
    const [fr, fg2, fb] = parse(fg);
    const [br, bg2, bb] = parse(bg);
    const r = Math.round(fr * opacity + br * (1 - opacity));
    const g = Math.round(fg2 * opacity + bg2 * (1 - opacity));
    const b = Math.round(fb * opacity + bb * (1 - opacity));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return bg;
  }
}

const SidebarItemCard = ({
  item,
  styles,
  feature_flags,
  currency,
  hotelData,
  tableNumber,
  isOfferItem = false,
  offerPrice,
  oldPrice,
  discountPercent,
  displayName,
  hasMultipleVariantsOnOffer = false,
  currentCategory,
  isOfferCategory,
  isUpcomingOffer = false,
  activeOffers = [],
  isPartner = false,
}: {
  item: HotelDataMenus;
  styles: Styles;
  currency: string;
  feature_flags?: string;
  hotelData?: HotelData;
  tableNumber: number;
  isOfferItem?: boolean;
  offerPrice?: number;
  oldPrice?: number;
  discountPercent?: number;
  displayName?: string;
  hasMultipleVariantsOnOffer?: boolean;
  currentCategory?: string;
  isOfferCategory?: boolean;
  isUpcomingOffer?: boolean;
  activeOffers?: any[];
  isPartner?: boolean;
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const [itemQuantity, setItemQuantity] = useState<number>(0);
  const [variantQuantities, setVariantQuantities] = useState<
    Record<string, number>
  >({});

  const isWithinDeliveryTime = () => {
    if (!hotelData?.delivery_rules?.delivery_time_allowed) return true;
    const convertTimeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = convertTimeToMinutes(
      hotelData.delivery_rules.delivery_time_allowed.from ?? "00:00"
    );
    const endTime = convertTimeToMinutes(
      hotelData.delivery_rules.delivery_time_allowed.to ?? "23:59"
    );
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    return currentTime >= startTime && currentTime <= endTime;
  };

  const _features = getFeatures(feature_flags || "");
  const _dr = hotelData?.delivery_rules;
  const _isDeliveryTimeOpen = _dr?.isDeliveryActive !== false && isWithinTimeWindow(_dr?.delivery_time_allowed);
  const _isTakeawayTimeOpen = isWithinTimeWindow(_dr?.takeaway_time_allowed);
  const hasOrderingFeature =
    _features?.ordering.enabled && (tableNumber !== 0 || _isTakeawayTimeOpen);
  const hasDeliveryFeature =
    _features?.delivery.enabled && tableNumber === 0 && _isDeliveryTimeOpen;

  const hasStockFeature =
    getFeatures(feature_flags || "")?.stockmanagement?.enabled;
  const isOutOfStock =
    hasStockFeature &&
    (item.stocks?.length ?? 0) > 0 &&
    (item.stocks?.[0]?.stock_quantity ?? 1) <= 0;

  const hasVariants = (item.variants?.length ?? 0) > 0;
  const isPriceAsPerSize = item.is_price_as_per_size;

  useEffect(() => {
    if (item.variants?.length) {
      const variantItems =
        items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
      const total = variantItems.reduce((sum, i) => sum + i.quantity, 0);
      setItemQuantity(total);
      const newVariantQuantities: Record<string, number> = {};
      variantItems.forEach((variantItem) => {
        const variantName = variantItem.id.split("|")[1];
        if (variantName) {
          newVariantQuantities[variantName] = variantItem.quantity;
        }
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

  const handleAddItem = () => {
    if (isOfferItem && offerPrice && oldPrice) {
      const offer = hotelData?.offers?.find(
        (o) => o.menu && o.menu.id === item.id
      );
      if (offer?.variant) {
        addItem({
          ...item,
          id: `${item.id}|${offer.variant.name}`,
          name: `${item.name} (${offer.variant.name})`,
          price: isUpcomingOffer ? offer.variant.price : offerPrice,
          variantSelections: [
            {
              id: (offer.variant as any).id,
              name: offer.variant.name,
              price: offer.variant.price,
              quantity: 1,
            },
          ],
        });
        return;
      }
    }
    addItem({
      ...item,
      variantSelections: [],
      price: isUpcomingOffer ? item.price : offerPrice || item.price,
    });
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
          price: variant.price,
          quantity: 1,
        },
      ],
    });
  };

  const handleVariantRemove = (variant: any) => {
    decreaseQuantity(`${item.id}|${variant.name}`);
  };

  const handleDecreaseItem = () => {
    if (itemQuantity > 1) {
      if (isOfferItem && offerPrice && oldPrice) {
        const offer = hotelData?.offers?.find(
          (o) => o.menu && o.menu.id === item.id
        );
        if (offer?.variant) {
          decreaseQuantity(`${item.id}|${offer.variant.name}`);
        } else {
          decreaseQuantity(item.id as string);
        }
      } else {
        decreaseQuantity(item.id as string);
      }
    } else {
      if (isOfferItem && offerPrice && oldPrice) {
        const offer = hotelData?.offers?.find(
          (o) => o.menu && o.menu.id === item.id
        );
        if (offer?.variant) {
          removeItem(`${item.id}|${offer.variant.name}`);
        } else {
          removeItem(item.id as string);
        }
      } else {
        removeItem(item.id as string);
      }
    }
  };

  const getVariantQuantity = (name: string) => variantQuantities[name] || 0;

  const getVariantOffer = (variantName: string) => {
    return hotelData?.offers?.find(
      (o) =>
        o.menu && o.menu.id === item.id && o.variant?.name === variantName
    );
  };

  const isOrderable = item.is_available && !isOutOfStock;
  const showAddButton =
    isOrderable &&
    !isPartner &&
    (hasOrderingFeature || hasDeliveryFeature) &&
    !item.is_price_as_per_size;

  const hasImage = item.image_url && item.image_url.length > 0;

  // Rating from item
  const rating = (item as any).average_rating;
  const ratingCount = (item as any).rating_count;

  // Get variants to show in drawer
  const getDrawerVariants = () => {
    if (isOfferCategory && hasMultipleVariantsOnOffer) {
      return (
        hotelData?.offers
          ?.filter((o) => o.menu && o.menu.id === item.id && o.variant)
          ?.map((o) => o.variant)
          ?.filter(Boolean) || []
      );
    } else if (
      isOfferCategory &&
      isOfferItem &&
      offerPrice &&
      oldPrice &&
      !hasMultipleVariantsOnOffer
    ) {
      const offer = hotelData?.offers?.find(
        (o) => o.menu && o.menu.id === item.id
      );
      return offer?.variant ? [offer.variant] : item.variants || [];
    }
    return item.variants || [];
  };

  return (
    <>
      {/* === CLEAN CARD FRONT === */}
      <div
        onClick={() => setIsDrawerOpen(true)}
        className="cursor-pointer rounded-2xl overflow-hidden shadow-sm relative p-1 backdrop-blur-md"
        style={{
          backgroundColor: `${styles.color}19`,
          border: `1px solid ${styles.border.borderColor || "#f0f0f0"}`,
          overflow: "visible",
        }}
      >
        {/* Cart badge - positioned above card */}
        {itemQuantity > 0 && (
          <div
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-md z-10"
            style={{ backgroundColor: styles.accent }}
          >
            {itemQuantity}
          </div>
        )}

        {/* Image */}
        <div className="relative overflow-hidden rounded-xl">
          {hasImage ? (
            <div className="w-full aspect-square overflow-hidden">
              <img
                src={item.image_url.replace("+", "%2B")}
                alt={item.name}
                className={`w-full h-full object-cover ${
                  !isOrderable ? "grayscale opacity-50" : ""
                }`}
              />
            </div>
          ) : (
            <div
              className="w-full aspect-square flex items-center justify-center"
              style={{
                backgroundColor: blendHex(styles.accent, styles.backgroundColor, 0.12),
              }}
            >
              <UtensilsCrossed
                size={28}
                strokeWidth={1.5}
                style={{ color: styles.accent, opacity: 0.4 }}
              />
            </div>
          )}

          {/* Discount badge */}
          {typeof discountPercent === "number" && discountPercent > 0 && (
            <div
              className="absolute top-1.5 left-1.5 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background: "rgba(220, 38, 38, 0.9)",
                backdropFilter: "blur(4px)",
              }}
            >
              {discountPercent}% OFF
            </div>
          )}

          {/* Veg/Non-Veg */}
          {item.is_veg !== null && item.is_veg !== undefined && (
            <div className="absolute top-1.5 right-1.5">
              <div
                className={`w-3.5 h-3.5 border-[1.5px] rounded-[2px] flex items-center justify-center ${
                  item.is_veg ? "border-green-600" : "border-red-600"
                }`}
                style={{ background: "rgba(255,255,255,0.9)" }}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    item.is_veg ? "bg-green-600" : "bg-red-600"
                  }`}
                />
              </div>
            </div>
          )}

          {/* Out of stock */}
          {!isOrderable && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-1 text-center text-[9px] font-extrabold uppercase tracking-wider text-white">
              {!item.is_available ? "Unavailable" : "Out of Stock"}
            </div>
          )}

        </div>

        {/* Info - minimal */}
        <div className="px-1.5 py-1.5">
          <p className="font-medium text-[11px] capitalize line-clamp-2 leading-tight" style={{ color: styles.color }}>
            {displayName || item.name}
          </p>

          {currency !== "\u{1F6AB}" && (
            <div
              className="font-bold text-[11px] mt-0.5"
              style={{ color: !isOrderable ? "#999" : styles.accent }}
            >
              {item.is_price_as_per_size ? (
                <span className="text-[9px] font-normal" style={{ opacity: 0.5 }}>
                  As per size
                </span>
              ) : isOfferItem && offerPrice != null ? (
                <span className="flex items-center gap-1 flex-wrap">
                  {!hasMultipleVariantsOnOffer && (
                    <span className="line-through text-[10px] font-normal" style={{ opacity: 0.35 }}>
                      {currency}{" "}
                      {parseInt(String(oldPrice ?? item.price))}
                    </span>
                  )}
                  {hasMultipleVariantsOnOffer && (
                    <span className="text-[9px] font-normal" style={{ opacity: 0.5 }}>
                      From{" "}
                    </span>
                  )}
                  {currency}{" "}
                  {parseInt(String(offerPrice))}
                </span>
              ) : hasVariants ? (
                <span>
                  <span className="text-[9px] font-normal" style={{ opacity: 0.5 }}>
                    From{" "}
                  </span>
                  {currency}{" "}
                  {formatPrice(
                    item.variants?.sort((a, b) => a?.price - b?.price)[0]
                      ?.price || item.price,
                    hotelData?.id
                  )}
                </span>
              ) : (
                <span>
                  {currency}{" "}
                  {formatPrice(item.price, hotelData?.id)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* === BOTTOM DRAWER === */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="bottom"
          overlayStyle={{ zIndex: 9999 }}
          className="rounded-t-3xl p-0 h-auto max-h-[85vh] overflow-hidden flex flex-col gap-0 border-t-[1px] border-white/8 0"
          style={{
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            zIndex: 9999,
          }}
        >
          {/* Drag handle */}
          {/* <div className="flex justify-center">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div> */}

          <div className="overflow-y-auto flex-1 pb-4">
            {/* Image */}
            {hasImage && (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={item.image_url.replace("+", "%2B")}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="px-5 pt-4 space-y-4">
              {/* Header: name, veg, price */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.is_veg !== null && item.is_veg !== undefined && (
                      <div
                        className={`w-4 h-4 border-[1.5px] rounded-[3px] flex items-center justify-center flex-shrink-0 ${
                          item.is_veg
                            ? "border-green-600"
                            : "border-red-600"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            item.is_veg ? "bg-green-600" : "bg-red-600"
                          }`}
                        />
                      </div>
                    )}
                    <h3 className="text-lg font-bold capitalize leading-tight">
                      {displayName || item.name}
                    </h3>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs mt-1 line-clamp-2 opacity-70">
                      {item.description}
                    </p>
                  )}

                  {/* Rating */}
                  {rating != null && rating > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        <Star size={9} fill="white" />
                        <span>{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
                      </div>
                      {ratingCount != null && ratingCount > 0 && (
                        <span className="text-[10px]">
                          ({ratingCount})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Price */}
                {currency !== "\u{1F6AB}" && (
                  <div className="text-right flex-shrink-0">
                    {item.is_price_as_per_size ? (
                      <span className="text-xs">
                        As per size
                      </span>
                    ) : isOfferItem && offerPrice != null ? (
                      <div>
                        {!hasMultipleVariantsOnOffer && (
                          <div className="line-through text-xs">
                            {currency}{" "}
                            {parseInt(String(oldPrice ?? item.price))}
                          </div>
                        )}
                        <div
                          className="text-xl font-bold"
                          style={{ color: styles.accent }}
                        >
                          {hasMultipleVariantsOnOffer && (
                            <span className="text-xs font-normal">
                              From{" "}
                            </span>
                          )}
                          {currency}{" "}
                          {parseInt(String(offerPrice))}
                        </div>
                        {typeof discountPercent === "number" &&
                          discountPercent > 0 && (
                            <span className="text-[10px] font-semibold text-green-600">
                              {discountPercent}% off
                            </span>
                          )}
                      </div>
                    ) : hasVariants ? (
                      <div>
                        <span className="text-[10px]">
                          From
                        </span>
                        <div
                          className="text-xl font-bold"
                          style={{ color: styles.accent }}
                        >
                          {currency}{" "}
                          {formatPrice(
                            item.variants?.sort(
                              (a, b) => a?.price - b?.price
                            )[0]?.price || item.price,
                            hotelData?.id
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-xl font-bold"
                        style={{ color: styles.accent }}
                      >
                        {currency}{" "}
                        {formatPrice(item.price, hotelData?.id)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Variants list */}
              {hasVariants && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Options
                  </p>
                  <div className="space-y-1.5">
                    {getDrawerVariants()
                      .filter(
                        (v): v is NonNullable<typeof v> => Boolean(v)
                      )
                      .map((variant) => {
                        const variantOffer = getVariantOffer(variant.name);
                        const hasVariantOffer = !!variantOffer;
                        const variantOfferPrice =
                          variantOffer?.offer_price;
                        const variantOriginalPrice =
                          variantOffer?.variant?.price || variant.price;
                        const qty = getVariantQuantity(variant.name);

                        return (
                          <div
                            key={variant.name}
                            className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                            style={{
                              backgroundColor: `${styles.accent}06`,
                              border: `1px solid ${styles.accent}15`,
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {variant.name}
                              </p>
                              <p
                                className="text-sm font-bold"
                                style={{ color: styles.accent }}
                              >
                                {isPriceAsPerSize ? (
                                  "As per size"
                                ) : hasVariantOffer ? (
                                  <>
                                    <span className="line-through font-normal mr-1 text-xs">
                                      {currency}{" "}
                                      {variantOriginalPrice}
                                    </span>
                                    {currency}{" "}
                                    {variantOfferPrice}
                                  </>
                                ) : (
                                  <>
                                    {currency}{" "}
                                    {formatPrice(
                                      variant.price,
                                      hotelData?.id
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                            {showAddButton && (
                              <div>
                                {qty > 0 ? (
                                  <div
                                    className="rounded-lg flex items-center overflow-hidden"
                                    style={{
                                      backgroundColor: styles.accent,
                                      color: "white",
                                    }}
                                  >
                                    <button
                                      className="px-2.5 py-1.5 active:bg-black/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVariantRemove(variant);
                                      }}
                                    >
                                      <Minus size={14} strokeWidth={3} />
                                    </button>
                                    <span className="text-sm font-bold min-w-[20px] text-center">
                                      {qty}
                                    </span>
                                    <button
                                      className="px-2.5 py-1.5 active:bg-black/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVariantAdd(variant);
                                      }}
                                    >
                                      <Plus size={14} strokeWidth={3} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVariantAdd(variant);
                                    }}
                                    className="rounded-lg px-5 py-1.5 text-xs font-bold active:scale-95 transition-transform tracking-wide"
                                    style={{
                                      backgroundColor: styles.accent,
                                      color: "white",
                                    }}
                                  >
                                    ADD
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Not orderable message */}
              {!isOrderable && (
                <div className="text-center py-2 text-xs">
                  {!item.is_available
                    ? "This item is currently unavailable"
                    : "This item is out of stock"}
                </div>
              )}
            </div>
          </div>

          {/* Bottom padding when no add button */}
          {!showAddButton && <div className="pb-10" />}

          {/* Sticky bottom bar - always visible */}
          {showAddButton && (
            <div
              className="sticky bottom-0 px-5 py-4 border-t"
              style={{
                backgroundColor: styles.backgroundColor,
                borderColor: `${styles.border.borderColor}`,
              }}
            >
              {hasVariants ? (
                itemQuantity > 0 ? (
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-full py-3 rounded-xl text-sm font-bold tracking-wide active:scale-[0.98] transition-transform flex items-center justify-between px-5"
                    style={{
                      backgroundColor: styles.accent,
                      color: "white",
                    }}
                  >
                    <span>{itemQuantity} item{itemQuantity !== 1 ? "s" : ""} added</span>
                    <span>Done</span>
                  </button>
                ) : (
                  <p className="text-center text-xs">
                    Select options above to add to cart
                  </p>
                )
              ) : itemQuantity > 0 ? (
                <div className="flex items-center justify-between w-full">
                  <div
                    className="rounded-xl flex items-center overflow-hidden"
                    style={{
                      backgroundColor: styles.accent,
                      color: "white",
                    }}
                  >
                    <button
                      className="px-4 py-3 active:bg-black/10 transition-colors"
                      onClick={handleDecreaseItem}
                    >
                      <Minus size={16} strokeWidth={3} />
                    </button>
                    <span className="text-base font-bold min-w-[28px] text-center">
                      {itemQuantity}
                    </span>
                    <button
                      className="px-4 py-3 active:bg-black/10 transition-colors"
                      onClick={handleAddItem}
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="rounded-xl px-8 py-3 text-sm font-bold tracking-wide active:scale-[0.98] transition-transform"
                    style={{
                      backgroundColor: styles.accent,
                      color: "white",
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddItem}
                  className="w-full py-3 rounded-xl text-sm font-bold tracking-wide active:scale-[0.98] transition-transform"
                  style={{
                    backgroundColor: styles.accent,
                    color: "white",
                  }}
                >
                  ADD TO CART
                </button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SidebarItemCard;
