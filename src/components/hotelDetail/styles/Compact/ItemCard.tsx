"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import React, { useEffect, useState } from "react";
import { DefaultHotelPageProps } from "../Default/Default";
import { getFeatures } from "@/lib/getFeatures";
import useOrderStore from "@/store/orderStore";
import { Offer } from "@/store/offerStore_hasura";
import { useRouter } from "next/navigation";

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
}) => {
  const [showVariants, setShowVariants] = useState(false);
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
    const startTime = convertTimeToMinutes(hoteldata.delivery_rules.delivery_time_allowed.from ?? "00:00");
    const endTime = convertTimeToMinutes(hoteldata.delivery_rules.delivery_time_allowed.to ?? "23:59");
    if (startTime > endTime) return currentTime >= startTime || currentTime <= endTime;
    else return currentTime >= startTime && currentTime <= endTime;
  };

  const hasDeliveryFeature =
    getFeatures(feature_flags || "")?.delivery.enabled &&
    tableNumber === 0 &&
    (hoteldata?.delivery_rules?.isDeliveryActive ?? true) &&
    isWithinDeliveryTime();

  const hasOrderingFeature =
    getFeatures(feature_flags || "")?.ordering.enabled &&
    (hoteldata?.delivery_rules?.isDeliveryActive ?? true) &&
    isWithinDeliveryTime();

  const hasStockFeature = getFeatures(feature_flags || "")?.stockmanagement?.enabled;
  const isOutOfStock =
    hasStockFeature && (item.stocks?.length ?? 0) > 0 && (item.stocks?.[0]?.stock_quantity ?? 1) <= 0;
  const showStock = hasStockFeature && (item.stocks?.[0]?.show_stock ?? false);
  const stockQuantity = item.stocks?.[0]?.stock_quantity;

  const hasVariants = (item.variants?.length ?? 0) > 0;
  const [itemQuantity, setItemQuantity] = useState<number>(0);
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});
  const shouldShowPrice = hoteldata?.currency !== "🚫";

  const discountPercentage =
    offerData && shouldShowPrice
      ? (() => {
          if (hasMultipleVariantsOnOffer && allItemOffers) {
            const validOfferPrices = allItemOffers.map((o) => o.offer_price).filter((p): p is number => typeof p === "number");
            const validOriginalPrices = allItemOffers
              .map((o) => o.variant?.price ?? o.menu?.price)
              .filter((p): p is number => typeof p === "number");
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
    const hasVariantsInCart = Object.values(variantQuantities).some((quantity) => quantity > 0);
    setShowVariants(hasVariantsInCart);
  }, [variantQuantities]);

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
        price: isUpcomingOffer ? offerData.variant.price : (offerData.offer_price || 0), // Use original price for upcoming offers, offer price for active offers
        variantSelections: [
          {
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
        price: isUpcomingOffer ? item.price : (offerData?.offer_price || item.price), // Use original price for upcoming offers
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
    return hoteldata?.offers?.find((o) => o.menu && o.menu.id === item.id && o.variant?.name === variantName);
  };

  const isOrderable = item.is_available && !isOutOfStock;
  const hasPrice = typeof (offerData?.offer_price ?? item.price ?? item.variants?.[0]?.price) === "number";
  const showAddButton =
    isOrderable && hasPrice && (hasOrderingFeature || hasDeliveryFeature) && !item.is_price_as_per_size;

  const mainOfferPrice = offerData?.offer_price;
  const hasValidMainOffer = typeof mainOfferPrice === "number";
  const mainOriginalPrice = offerData?.variant?.price ?? offerData?.menu?.price;
  const hasValidMainOriginalPrice = typeof mainOriginalPrice === "number";
  const baseItemPrice =
    item.variants?.sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0))[0]?.price ?? item.price;
  const hasValidBasePrice = typeof baseItemPrice === "number";

  return (
    <>
      <div className="p-4 flex justify-between relative">
        <div>
          <h3 className="capitalize text-lg font-semibold">
            {offerData?.variant && !hasMultipleVariantsOnOffer
              ? `${item.name} (${offerData.variant.name})`
              : item.name}
          </h3>
          <p className="text-sm opacity-50">{item.description}</p>
          {shouldShowPrice && (
            <div style={{ color: styles?.accent || "#000" }} className="text-lg font-bold mt-1">
              {item.is_price_as_per_size !== true ? (
                <>
                  {hasValidMainOffer ? (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">
                          {hoteldata?.currency || "₹"} {mainOfferPrice}
                        </span>
                        {discountPercentage > 0 && (
                          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
                            {discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                      {!hasMultipleVariantsOnOffer && hasValidMainOriginalPrice && (
                        <span className="text-sm line-through opacity-70 font-light">
                          {hoteldata?.currency || "₹"} {mainOriginalPrice}
                        </span>
                      )}
                    </div>
                  ) : hasValidBasePrice ? (
                    <div className="contents">
                      {hasVariants ? <span className="text-sm ">From </span> : null}
                      {hoteldata?.currency || "₹"} {baseItemPrice}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-base font-normal">{`(Price as per size)`}</div>
              )}
            </div>
          )}
          {showStock && (
            <div className="text-xs mt-1">
              {isOutOfStock ? (
                <span className="text-red-500 font-semibold">Out of Stock</span>
              ) : (
                <span className="text-green-600">In Stock: {stockQuantity}</span>
              )}
            </div>
          )}
        </div>
        <div className="relative">
          <div className="relative">
            <div className="overflow-hidden aspect-square h-28 rounded-3xl">
              <img
                src={item.image_url || "/image_placeholder.png"}
                alt={item.name}
                className={`w-full h-full object-cover ${
                  !item.image_url ? "invert opacity-50" : ""
                } ${!item.is_available || isOutOfStock ? "grayscale" : ""}`}
              />
            </div>
            {(!item.is_available || isOutOfStock) && (
              <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-red-500 text-white text-center text-xs font-semibold py-1 px-2 w-full">
                {!item.is_available ? "Unavailable" : "Out of Stock"}
              </div>
            )}
            {isOrderable && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                {offerData && item.category?.name?.toLowerCase() === "custom" ? (
                  <div
                    onClick={() => router.push(`/offers/${offerData.id}`)}
                    style={{ backgroundColor: styles.accent, color: "white" }}
                    className="rounded-full px-4 py-1 font-medium text-xs text-nowrap h-fit cursor-pointer"
                  >
                    View offer
                  </div>
                ) : (hasVariants && !offerData) || hasMultipleVariantsOnOffer ? (
                  <div
                    onClick={() => setShowVariants(!showVariants)}
                    style={{ backgroundColor: styles.accent, color: "white" }}
                    className="rounded-full px-4 py-1 font-medium text-sm whitespace-nowrap h-fit cursor-pointer"
                  >
                    {itemQuantity > 0 ? `Added (${itemQuantity})` : showVariants ? "Hide Options" : "Show Options"}
                  </div>
                ) : showAddButton && itemQuantity > 0 ? (
                  <div
                    style={{ backgroundColor: styles.accent, color: "white" }}
                    className="rounded-full px-3 py-1 font-medium flex items-center gap-3 text-sm"
                  >
                    <div
                      className="cursor-pointer active:scale-95"
                      onClick={(e) => {
                        e.preventDefault();
                        const idToRemove = offerData?.variant
                          ? `${item.id}|${offerData.variant.name}`
                          : (item.id as string);
                        itemQuantity > 1 ? decreaseQuantity(idToRemove) : removeItem(idToRemove);
                      }}
                    >
                      -
                    </div>
                    <div>{itemQuantity}</div>
                    <div
                      className="cursor-pointer active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddItem();
                      }}
                    >
                      +
                    </div>
                  </div>
                ) : showAddButton ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddItem();
                    }}
                    style={{ backgroundColor: styles.accent, color: "white" }}
                    className="rounded-full px-4 py-1 font-medium text-sm h-fit cursor-pointer"
                  >
                    Add
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
      {showVariants && hasVariants && (
        <div className="w-full mt-2 space-y-3">
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
              
              return (
                <div
                  key={variant.name}
                  className="py-2 px-4 rounded-lg flex justify-between items-center gap-5 w-full"
                >
                  <div className="grid">
                    <span className="font-semibold">{variant.name}</span>
                    {shouldShowPrice && !item.is_price_as_per_size && showVariantAddButton && (
                      <div className="text-lg font-bold" style={{ color: styles?.accent || "#000" }}>
                        {hasValidVariantOffer ? (
                          <div className="flex items-center gap-2">
                            <span className="text-red-500">
                              {hoteldata?.currency || "₹"} {variantOffer.offer_price}
                            </span>
                            {hasValidOriginalPrice &&
                              originalVariantPrice > variantOffer.offer_price! && (
                                <span className="line-through text-gray-400 text-sm font-light">
                                  {hoteldata?.currency || "₹"} {originalVariantPrice}
                                </span>
                              )}
                          </div>
                        ) : hasValidOriginalPrice ? (
                          <span>
                            {hoteldata?.currency || "₹"} {originalVariantPrice}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {showVariantAddButton ? (
                    <div className="flex gap-2 items-center justify-end">
                      {getVariantQuantity(variant.name) > 0 ? (
                        <div
                          style={{ backgroundColor: styles.accent, color: "white" }}
                          className="rounded-full px-3 py-1 font-medium flex items-center gap-3"
                        >
                          <div
                            className="cursor-pointer active:scale-95"
                            onClick={() => handleVariantRemove(variant)}
                          >
                            -
                          </div>
                          <div>{getVariantQuantity(variant.name)}</div>
                          <div
                            className="cursor-pointer active:scale-95"
                            onClick={() => handleVariantAdd(variant)}
                          >
                            +
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleVariantAdd(variant)}
                          style={{ backgroundColor: styles.accent, color: "white" }}
                          className="rounded-full px-4 py-1 font-medium h-fit cursor-pointer"
                        >
                          Add
                        </div>
                      )}
                    </div>
                  ) : shouldShowPrice && !item.is_price_as_per_size && (
                    <div className="text-lg font-bold" style={{ color: styles?.accent || "#000" }}>
                      {hasValidVariantOffer ? (
                        <div className="flex items-center gap-2">
                          <span className="text-red-500">
                            {hoteldata?.currency || "₹"} {variantOffer.offer_price}
                          </span>
                          {hasValidOriginalPrice &&
                            originalVariantPrice > variantOffer.offer_price! && (
                              <span className="line-through text-gray-400 text-sm font-light">
                                {hoteldata?.currency || "₹"} {originalVariantPrice}
                              </span>
                            )}
                        </div>
                      ) : hasValidOriginalPrice ? (
                        <span>
                          {hoteldata?.currency || "₹"} {originalVariantPrice}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </>
  );
};

export default ItemCard;