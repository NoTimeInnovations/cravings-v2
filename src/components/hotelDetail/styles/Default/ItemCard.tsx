"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import React, { useEffect, useState, useRef } from "react";
import Img from "../../../Img";
import ItemDetailsModal from "./ItemDetailsModal";
import DescriptionWithTextBreak from "../../../DescriptionWithTextBreak";
import useOrderStore from "@/store/orderStore";
import { getFeatures } from "@/lib/getFeatures";

const ItemCard = ({
  item,
  styles,
  className,
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
}: {
  item: HotelDataMenus;
  styles: Styles;
  currency: string;
  className?: string;
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const variantsRef = useRef<HTMLDivElement>(null);
  const [variantsHeight, setVariantsHeight] = useState(0);
  const [itemQuantity, setItemQuantity] = useState<number>(0);
  const [variantQuantities, setVariantQuantities] = useState<
    Record<string, number>
  >({});

  const isWithinDeliveryTime = () => {
    if (!hotelData?.delivery_rules?.delivery_time_allowed) {
      return true;
    }

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
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  };

  // --- Feature Flags & Stock Logic ---
  const hasOrderingFeature =
    getFeatures(feature_flags || "")?.ordering.enabled &&
    (hotelData?.delivery_rules?.isDeliveryActive ?? true) &&
    isWithinDeliveryTime();
  const hasDeliveryFeature =
    getFeatures(feature_flags || "")?.delivery.enabled && tableNumber === 0 &&
    (hotelData?.delivery_rules?.isDeliveryActive ?? true) &&
    isWithinDeliveryTime();

  const hasStockFeature =
    getFeatures(feature_flags || "")?.stockmanagement?.enabled

  const isOutOfStock =
    hasStockFeature &&
    (item.stocks?.length ?? 0) > 0 &&
    (item.stocks?.[0]?.stock_quantity ?? 1) <= 0;

  const showStock = hasStockFeature && (item.stocks?.[0]?.show_stock ?? false);
  const stockQuantity = item.stocks?.[0]?.stock_quantity;

  const hasVariants = (item.variants?.length ?? 0) > 0;
  const isPriceAsPerSize = item.is_price_as_per_size;

  useEffect(() => {
    if (showVariants && variantsRef.current) {
      setVariantsHeight(variantsRef.current.scrollHeight);
    } else {
      setVariantsHeight(0);
    }
  }, [showVariants, item.variants]);

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
      // For items without variants, check both regular item and variant-specific items (for offer items)
      const itemInCart = items?.find((i) => i.id === item.id);
      const variantItems = items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [];
      const totalQuantity = (itemInCart?.quantity || 0) + variantItems.reduce((sum, i) => sum + i.quantity, 0);
      setItemQuantity(totalQuantity);
    }
  }, [items, item.id, item.variants?.length]);

  useEffect(() => {
    const hasVariantsInCart = Object.values(variantQuantities).some(
      (quantity) => quantity > 0
    );
    setShowVariants(hasVariantsInCart);
  }, [variantQuantities]);

  const handleAddItem = () => {
    // If this item has multiple variants on offer, show options instead of adding directly
    if (hasMultipleVariantsOnOffer) {
      setShowVariants(!showVariants);
      return;
    }

    // If this is an offer item with a specific variant, add that variant directly
    if (isOfferItem && offerPrice && oldPrice) {
      // Find the offer to get the variant information
      const offer = hotelData?.offers?.find((o) => o.menu && o.menu.id === item.id);
      if (offer?.variant) {
        // Add the specific variant from the offer
        addItem({
          ...item,
          id: `${item.id}|${offer.variant.name}`,
          name: `${item.name} (${offer.variant.name})`,
          price: isUpcomingOffer ? offer.variant.price : offerPrice, // Use original price for upcoming offers, offer price for active offers
          variantSelections: [
            {
              name: offer.variant.name,
              price: offer.variant.price,
              quantity: 1,
            },
          ],
        });
        return;
      }
    }

    // Regular logic for items without offers
    if (hasVariants) {
      setShowVariants(!showVariants);
    } else {
      addItem({
        ...item,
        variantSelections: [],
        price: isUpcomingOffer ? item.price : (offerPrice || item.price), // Use original price for upcoming offers
      });
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
      variantSelections: [
        {
          name: variant.name,
          price: variant.price,
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

  // Check if a specific variant has an offer
  const getVariantOffer = (variantName: string) => {
    return hotelData?.offers?.find((o) =>
      o.menu && o.menu.id === item.id && o.variant?.name === variantName
    );
  };

  const isOrderable = item.is_available && !isOutOfStock;
  const showAddButton =
    isOrderable &&
    (hasOrderingFeature || hasDeliveryFeature) &&
    !item.is_price_as_per_size;

  return (
    <div className="h-full relative overflow-hidden">
      {/* Discount badge for offer items */}
      {typeof discountPercent === "number" && discountPercent > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          -{discountPercent}%
        </div>
      )}
      <div
        style={styles.border}
        key={item.id}
        className={`pt-5 pb-5 rounded-[35px] px-6 flex-1 relative bg-white text-black transition-all duration-300 ${className}`}
      >
        <div className="flex flex-col gap-y-2 justify-between items-start w-full">
          <div
            onClick={() => setIsOpen(true)}
            className={`flex justify-between w-full items-start cursor-pointer`}
          >
            <div
              className={`flex flex-col justify-center ${item.image_url ? "w-1/2" : "w-full"
                } ${!isOrderable ? "opacity-50" : ""}`}
            >
              <DescriptionWithTextBreak
                showMore={false}
                maxChars={35}
                spanClassName="opacity-100"
                className="capitalize text-xl font-bold"
              >
                {displayName || item.name}
              </DescriptionWithTextBreak>
              {currency !== "🚫" && (
                <div
                  style={{
                    color: !isOrderable ? styles.color : styles.accent,
                  }}
                  className={`font-black text-2xl`}
                >
                  {item.is_price_as_per_size ? (
                    <div className="text-sm font-normal">{`(Price as per size)`}</div>
                  ) : (
                    <>
                      {isOfferItem && offerPrice ? (
                        <span>
                          {hasMultipleVariantsOnOffer ? (
                            <span className="text-sm font-bold">From </span>
                          ) : (
                            <span className="line-through text-gray-400 mr-2 text-sm font-medium">
                              {currency} {parseInt(String(oldPrice ?? item.price))}
                            </span>
                          )}
                          <span className="text-accent font-bold text-2xl" style={{ color: styles.accent }}>
                            {currency} {parseInt(String(offerPrice))}
                          </span>
                        </span>
                      ) : hasVariants ? (
                        <span className="">
                          <span className="text-sm font-bold">From </span>
                          <span>
                            {currency}{" "}
                            {hotelData?.id ===
                              "767da2a8-746d-42b6-9539-528b6b96ae09"
                              ? item.variants
                                ?.sort((a, b) => a?.price - b?.price)[0]
                                ?.price?.toFixed(3) || item.price.toFixed(3)
                              : item.variants?.sort(
                                (a, b) => a?.price - b?.price
                              )[0]?.price || item.price}
                          </span>
                        </span>
                      ) : (
                        <span>
                          {currency}{" "}
                          {hotelData?.id ===
                            "767da2a8-746d-42b6-9539-528b6b96ae09"
                            ? item.price.toFixed(3)
                            : item.price}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}

              {showStock && (
                <div className="text-xs mt-1">
                  {isOutOfStock ? (
                    <span className="text-red-500 font-semibold">
                      Out of Stock
                    </span>
                  ) : (
                    <span className="text-green-600">
                      In Stock: {stockQuantity}
                    </span>
                  )}
                </div>
              )}
            </div>

            {item.image_url && item.image_url.length > 0 && (
              <div className="w-[100px] h-[100px] relative rounded-3xl overflow-hidden flex-shrink-0">
                <Img
                  src={item.image_url.replace("+", "%2B")}
                  alt={item.name}
                  className={`object-cover w-full h-full ${!isOrderable ? "grayscale" : ""
                    }`}
                />

                {!isOrderable && (
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-red-500 text-white text-center text-sm font-semibold py-2 px-3 w-full">
                    {!item.is_available ? "Unavailable" : "Out of Stock"}
                  </div>
                )}
              </div>
            )}
          </div>

          <DescriptionWithTextBreak
            maxChars={100}
            className={`text-sm opacity-50 mt-1 ${!isOrderable ? "opacity-25" : ""
              }`}
          >
            {item.description}
          </DescriptionWithTextBreak>

          {/* Variants section with smooth height transition */}
          <div
            ref={variantsRef}
            className="overflow-hidden transition-all duration-500 w-full"
            style={{
              height: showVariants ? `${variantsHeight}px` : "0px",
              opacity: showVariants ? 1 : 0,
            }}
          >
            {hasVariants && (
              <div className="w-full mt-2 space-y-3 divide-y-2 divide-gray-100">
                {/* Show variants based on offer status */}
                {(() => {
                  if (isOfferCategory && hasMultipleVariantsOnOffer) {
                    // In Offer category: Show only variants that are on offer
                    const offerVariants = hotelData?.offers
                      ?.filter((o) => o.menu && o.menu.id === item.id && o.variant)
                      ?.map((o) => o.variant)
                      ?.filter(Boolean) || [];
                    return offerVariants;
                  } else if (isOfferCategory && isOfferItem && offerPrice && oldPrice && !hasMultipleVariantsOnOffer) {
                    // In Offer category: Show only the offer variant for single variant offers
                    const offer = hotelData?.offers?.find((o) => o.menu && o.menu.id === item.id);
                    return offer?.variant ? [offer.variant] : item.variants || [];
                  } else {
                    // In All category or other categories: Show all variants
                    return item.variants || [];
                  }
                })().filter((variant): variant is NonNullable<typeof variant> => Boolean(variant)).map((variant) => {
                  const variantOffer = getVariantOffer(variant.name);
                  const hasVariantOffer = !!variantOffer;
                  const variantOfferPrice = variantOffer?.offer_price;
                  const variantOriginalPrice = variantOffer?.variant?.price || variant.price;

                  return (
                    <div
                      key={variant.name}
                      className="pt-3 rounded-lg flex justify-between items-center gap-5 w-full"
                    >
                      <div className="grid">
                        <span className="font-semibold ">{variant.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          style={{ color: styles.accent }}
                          className="text-2xl font-black text-nowrap"
                        >
                          {isPriceAsPerSize ? (
                            <div className="text-sm font-normal">{`(Price as per size)`}</div>
                          ) : (
                            <>
                              {hasVariantOffer ? (
                                <div className="flex flex-col items-end">
                                  <span className="line-through text-gray-400 text-sm font-normal">
                                    {currency} {variantOriginalPrice}
                                  </span>
                                  <span className="text-accent font-bold" style={{ color: styles.accent }}>
                                    {currency} {variantOfferPrice}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {currency}{" "}
                                  {hotelData?.id ===
                                    "767da2a8-746d-42b6-9539-528b6b96ae09"
                                    ? variant.price.toFixed(3)
                                    : variant.price}
                                </>
                              )}
                            </>
                          )}
                        </div>
                        {showAddButton && (
                          <div className="flex gap-2 items-center justify-end">
                            {getVariantQuantity(variant.name) > 0 ? (
                              <div
                                style={{
                                  backgroundColor: styles.accent,
                                  ...styles.border,
                                  color: "white",
                                }}
                                className="rounded-full transition-all duration-500 px-5 py-2 font-medium flex items-center gap-4 cursor-pointer"
                              >
                                <div
                                  className="active:scale-95"
                                  onClick={() => handleVariantRemove(variant)}
                                >
                                  -
                                </div>
                                <div>{getVariantQuantity(variant.name)}</div>
                                <div
                                  className="active:scale-95"
                                  onClick={() => handleVariantAdd(variant)}
                                >
                                  +
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleVariantAdd(variant)}
                                style={{
                                  backgroundColor: styles.accent,
                                  ...styles.border,
                                  color: "white",
                                }}
                                className="rounded-full px-6 py-2 font-medium cursor-pointer"
                              >
                                {"Add"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ADD BUTTONS LOGIC */}
          {showAddButton ? (
            <>
              {hasVariants && !isOfferItem ? (
                <div className="flex transition-all duration-500 gap-2 items-center justify-end w-full mt-2">
                  <div
                    onClick={() => setShowVariants((prev) => !prev)}
                    style={{
                      backgroundColor: !showVariants ? styles.accent : "white",
                      ...styles.border,
                      color: !showVariants ? "white" : "black",
                    }}
                    className="rounded-full px-6 py-2 font-medium cursor-pointer"
                  >
                    {itemQuantity > 0
                      ? `Added (${itemQuantity})`
                      : "Choose Options"}
                  </div>
                </div>
              ) : hasMultipleVariantsOnOffer ? (
                <div className="flex transition-all duration-500 gap-2 items-center justify-end w-full mt-2">
                  <div
                    onClick={() => setShowVariants((prev) => !prev)}
                    style={{
                      backgroundColor: !showVariants ? styles.accent : "white",
                      ...styles.border,
                      color: !showVariants ? "white" : "black",
                    }}
                    className="rounded-full px-6 py-2 font-medium cursor-pointer"
                  >
                    {itemQuantity > 0
                      ? `Added (${itemQuantity})`
                      : "See Options"}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 items-center justify-end w-full mt-2">
                  {itemQuantity > 0 ? (
                    <div
                      style={{
                        backgroundColor: styles.accent,
                        ...styles.border,
                        color: "white",
                      }}
                      className="rounded-full transition-all duration-500 px-5 py-2 font-medium flex items-center gap-4 cursor-pointer"
                    >
                      <div
                        className="active:scale-95"
                        onClick={() => {
                          if (itemQuantity > 1) {
                            // If this is an offer item with a specific variant, decrease that variant
                            if (isOfferItem && offerPrice && oldPrice) {
                              const offer = hotelData?.offers?.find((o) => o.menu && o.menu.id === item.id);
                              if (offer?.variant) {
                                const variantId = `${item.id}|${offer.variant.name}`;
                                decreaseQuantity(variantId);
                              } else {
                                decreaseQuantity(item.id as string);
                              }
                            } else {
                              decreaseQuantity(item.id as string);
                            }
                          } else {
                            // If this is an offer item with a specific variant, remove that variant
                            if (isOfferItem && offerPrice && oldPrice) {
                              const offer = hotelData?.offers?.find((o) => o.menu && o.menu.id === item.id);
                              if (offer?.variant) {
                                const variantId = `${item.id}|${offer.variant.name}`;
                                removeItem(variantId);
                              } else {
                                removeItem(item.id as string);
                              }
                            } else {
                              removeItem(item.id as string);
                            }
                          }
                        }}
                      >
                        -
                      </div>
                      <div>{itemQuantity}</div>
                      <div className="active:scale-95" onClick={handleAddItem}>
                        +
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={handleAddItem}
                      style={{
                        backgroundColor: styles.accent,
                        ...styles.border,
                        color: "white",
                      }}
                      className="rounded-full px-6 py-2 font-medium cursor-pointer"
                    >
                      {"Add"}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            (hasVariants && !isOfferItem) || hasMultipleVariantsOnOffer ? (
              <div className="flex transition-all duration-500 gap-2 items-center justify-end w-full mt-2">
                <div
                  onClick={() => setShowVariants((prev) => !prev)}
                  style={{
                    backgroundColor: !showVariants ? styles.accent : "white",
                    ...styles.border,
                    color: !showVariants ? "white" : "black",
                  }}
                  className="rounded-full px-6 py-2 font-medium cursor-pointer"
                >
                  {showVariants ? "Hide Options" : "Show Options"}
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>

      <ItemDetailsModal
        styles={styles}
        open={isOpen}
        setOpen={setIsOpen}
        item={item}
        currency={currency}
        hotelData={hotelData as HotelData}
      />
    </div>
  );
};

export default ItemCard;
