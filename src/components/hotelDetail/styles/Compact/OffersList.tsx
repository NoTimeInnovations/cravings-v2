"use client";

import { Offer } from "@/store/offerStore_hasura";
import { BadgePercent, X } from "lucide-react";
import React, { useState, useEffect } from "react";
import OfferCard from "@/components/OfferCard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import useOrderStore, { OrderItem } from "@/store/orderStore";
import { getFeatures } from "@/lib/getFeatures";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";

// Helper component for the Add/Quantity button
const OfferAddButton = ({
  offer,
  menuItem,
  styles,
  feature_flags,
  tableNumber,
}: {
  offer: Offer;
  menuItem: HotelDataMenus;
  styles: Styles;
  feature_flags?: string;
  tableNumber: number;
}) => {
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const [quantity, setQuantity] = useState(0);

  const hasOrderingFeature = getFeatures(feature_flags || "")?.ordering.enabled;
  const hasDeliveryFeature =
    getFeatures(feature_flags || "")?.delivery.enabled && tableNumber === 0;

  // --- Start of Fix ---
  // 1. Add a component-level guard clause.
  // This ensures menuItem and its id are defined for all subsequent logic in this component.
  // This single check resolves all TypeScript errors (ts2322, ts2345).
  if (!menuItem?.id) {
    // If there's no menu item or it has no ID, don't render the button.
    // This prevents any downstream errors.
    return null;
  }
  // --- End of Fix ---

  useEffect(() => {
    // Because of the guard clause above, TypeScript now knows menuItem.id is a string.
    const itemInCart = items?.find((i) => i.id === menuItem.id);
    setQuantity(itemInCart?.quantity || 0);
  }, [items, menuItem.id]);

  const handleAddItem = () => {
    // A specific check for category remains good practice for data integrity.
    if (!menuItem.category?.id) {
      console.error(
        `Menu item "${menuItem.name}" is missing category information. Item not added.`
      );
      return;
    }

    if (menuItem.id === undefined || typeof menuItem.id !== "string") {
      console.error(
        `Menu item "${menuItem.name}" is missing ID information. Item not added.`
      );
      return;
    }

    // Now, `menuItem.id` is guaranteed to be a string, satisfying the OrderItem type.
    const itemToAdd: OrderItem = {
      id: menuItem.id,
      description: menuItem.description,
      image_url: menuItem.image_url,
      is_available: menuItem.is_available,
      is_top: menuItem.is_top,
      priority: menuItem.priority,
      category_id: menuItem.category.id,
      category: menuItem.category,
      price: offer.offer_price ?? 0,
      name: `${menuItem.name} (Offer)`,
      quantity: 1,
      variantSelections: [],
      offers: [],
    };
    addItem(itemToAdd);
  };

  const handleDecrease = () => {
    if (!menuItem.id || typeof menuItem.id !== "string") {
      console.error(
        `Menu item "${menuItem.name}" is missing ID information. Item not removed.`
      );
      return;
    }

    // menuItem.id is also safely a string here.
    if (quantity > 1) {
      decreaseQuantity(menuItem.id);
    } else {
      removeItem(menuItem.id);
    }
  };

  if (!hasOrderingFeature && !hasDeliveryFeature) {
    return null;
  }

  return (
    <div className="flex justify-center w-full mt-2 text-sm">
      {quantity > 0 ? (
        <div
          style={{
            backgroundColor: styles.accent,
            ...styles.border,
            color: "white",
          }}
          className="rounded-full transition-all duration-300 px-4 py-2 font-medium flex items-center gap-4 "
        >
          <div
            className="cursor-pointer active:scale-95"
            onClick={handleDecrease}
          >
            -
          </div>
          <div className="text-sm">{quantity}</div>
          <div
            className="cursor-pointer active:scale-95"
            onClick={handleAddItem}
          >
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
          className="rounded-full px-8 py-2 font-semibold cursor-pointer text-sm"
        >
          Add
        </div>
      )}
    </div>
  );
};

// Interface for the main component props
interface OffersListProps {
  offers: Offer[];
  hotelName: string;
  styles: Styles;
  tableNumber: number;
  feature_flags?: string;
  menu: HotelDataMenus[];
}

const OffersList = ({
  offers,
  hotelName,
  styles,
  tableNumber,
  feature_flags,
  menu,
}: OffersListProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div>
      {/* Offer button */}
      <div
        onClick={openModal}
        className="flex items-center gap-2 border-[1px] border-[#ffe660] p-2 rounded-md bg-[#fffae0] cursor-pointer hover:bg-[#fff6d4] transition-colors"
      >
        <BadgePercent size={15} className="text-[#ffda13]" />
        <span className="text-xs text-nowrap text-gray-500 font-medium">
          Get Offers
        </span>
      </div>

      {/* Full-Screen Offers Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background z-[60] flex flex-col animate-in fade-in-0">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className=" font-semibold max-w-[80%] overflow-clip text-ellipsis">
              Current offers in {hotelName}
            </h2>
            <Button variant="ghost" size="icon" onClick={closeModal}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close offers</span>
            </Button>
          </div>

          <ScrollArea className="flex-grow">
            {offers && offers.length > 0 ? (
              <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-7">
                {offers.map((offer) => {
                  const menuItem = menu.find((m) => m.id === offer.menu.id);

                  // This check prevents passing an 'undefined' menuItem to the child component.
                  if (!menuItem) {
                    return null;
                  }

                  const discount = Math.round(
                    (((offer.variant ? offer.variant.price : offer.menu.price) -(offer.offer_price ?? 0)) /
                      (offer.variant ? offer.variant.price : offer.menu.price)) *
                      100
                  );
                  const isUpcoming = new Date(offer.start_time) > new Date();

                  return (
                    <>
                      <div key={offer.id} className="relative">
                        <OfferCard
                          offer={offer}
                          discount={discount}
                          isUpcoming={isUpcoming}
                        />
                        <div className="absolute bottom-0 right-0 left-0 p-1 translate-y-1/2">
                          <OfferAddButton
                            offer={offer}
                            menuItem={menuItem}
                            styles={styles}
                            tableNumber={tableNumber}
                            feature_flags={feature_flags}
                          />
                        </div>
                      </div>
                    </>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-10">
                <p className="text-muted-foreground">
                  No offers are available at the moment.
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default OffersList;
