"use client";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { Offer } from "@/store/offerStore_hasura";
import React from "react";
import OfferCardMin from "../../../OfferCardMin";
import HeadingWithAccent from "../../../HeadingWithAccent";
import Link from "next/link";
import { HotelDataMenus } from "@/app/hotels/[...id]/page";
import useOrderStore from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import { FeatureFlags } from "@/lib/getFeatures";

const OfferList = ({
  offers,
  styles,
  menus,
  features
}: {
  offers: Offer[];
  styles: Styles;
  menus: HotelDataMenus[];
  features: FeatureFlags;
}) => {
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const { userData } = useAuthStore();

  return (
    <div className="flex flex-col gap-6 my-5">
      <HeadingWithAccent
        className="text-3xl font-black text-center"
        accent={styles.accent}
      >
        Offers
      </HeadingWithAccent>

      <div className="grid grid-cols-2 gap-4 my-5">
        {offers.map((offer) => {
          if (!offer.menu || offer.menu.price == null) return null;
          const discount =
            (((offer.variant ? offer.variant.price : offer.menu.price) - (offer.offer_price ?? 0)) / (offer.variant ? offer.variant.price : offer.menu.price)) * 100;
          const isUpcoming = new Date(offer.start_time) > new Date();

          const item = menus.find((item) => item.id === offer.menu.id);
          if (!item) return null;

          // Stock management logic
          const hasStockFeature = features?.stockmanagement?.enabled;
          const stockInfo = item.stocks?.[0];
          const isOutOfStock = ((stockInfo?.stock_quantity ?? 0) <= 0) && hasStockFeature;
          const isItemAvailable = item.is_available && !isOutOfStock;
          const itemInCart = items?.find((i) => i.id === item.id);
          const quantity = itemInCart?.quantity || 0;

          return (
            <div key={`offer-${offer.id}`} className="flex flex-col bg-white rounded-3xl relative">
              {/* Out of stock or unavailable overlay */}
              {!isItemAvailable && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-3xl z-10 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {!item.is_available ? "Unavailable" : "Out of Stock"}
                  </span>
                </div>
              )}

              <Link href={`/offers/${offer.id}`}>
                <OfferCardMin
                  discount={Number(discount.toFixed(0))}
                  offer={offer}
                  isUpcoming={isUpcoming}
                  onClick={() => {}}
                />
              </Link>

              {/* Quantity controls - only show if available and not out of stock */}
              {isItemAvailable && (
                <div className="flex gap-2 items-center justify-center w-full p-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (quantity > 1) {
                        decreaseQuantity(item.id as string);
                      } else {
                        removeItem(item.id as string);
                      }
                    }}
                    style={{
                      backgroundColor: styles.accent,
                      ...styles.border,
                      color: "white",
                    }}
                    className="active:brightness-[120%] active:scale-90 transition-all duration-75 font-medium text-xl rounded-full cursor-pointer z-10 grid place-items-center w-9 aspect-square"
                  >
                    -
                  </button>

                  <div className="bg-[#e2e2e2] rounded aspect-square h-8 grid place-items-center font-bold text-black/70">
                    {quantity}
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      addItem(item);
                    }}
                    style={{
                      backgroundColor: styles.accent,
                      ...styles.border,
                      color: "white",
                    }}
                    className="active:brightness-[120%] active:scale-90 transition-all duration-75 font-medium text-xl rounded-full cursor-pointer z-10 grid place-items-center w-9 aspect-square"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Stock information display */}
              {stockInfo?.show_stock && hasStockFeature && (
                <div className="px-3 pb-2 text-xs text-center">
                  {isOutOfStock ? (
                    <span className="text-red-500 font-semibold">Out of Stock</span>
                  ) : (
                    <span className="text-green-600">
                      In Stock: {stockInfo.stock_quantity}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OfferList;