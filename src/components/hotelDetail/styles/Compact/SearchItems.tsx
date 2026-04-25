import {
  HotelData,
  HotelDataMenus,
} from "@/app/hotels/[...id]/page";
import { Search, X } from "lucide-react";
import React, { useMemo, useState, useEffect, useRef } from "react";
import ItemCard from "./ItemCard";
import { DefaultHotelPageProps } from "../Default/Default";
import useOrderStore from "@/store/orderStore";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// Search result item with add button
const SearchResultItem = ({
  item,
  styles,
  hoteldata,
  tableNumber,
}: {
  item: HotelDataMenus;
  styles: DefaultHotelPageProps["styles"];
  hoteldata: HotelData;
  tableNumber: number;
}) => {
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();

  const _dr = hoteldata?.delivery_rules;
  const _isDelOpen = _dr?.isDeliveryActive !== false && isWithinTimeWindow(_dr?.delivery_time_allowed);
  const _isTakOpen = isWithinTimeWindow(_dr?.takeaway_time_allowed);
  const hasOrderingFeature = getFeatures(hoteldata?.feature_flags || "")?.ordering.enabled && (tableNumber !== 0 || _isTakOpen);
  const hasDeliveryFeature = getFeatures(hoteldata?.feature_flags || "")?.delivery.enabled && tableNumber === 0 && _isDelOpen;
  const showAddButton = hasOrderingFeature || hasDeliveryFeature;

  const hasVariants = item.variants && item.variants.length > 0;
  const itemInCart = items?.find((i) => i.id === item.id);
  const variantItems = hasVariants ? items?.filter((i) => i.id.startsWith(`${item.id}|`)) || [] : [];
  const quantity = (itemInCart?.quantity || 0) + variantItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleAdd = () => {
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
      price: item.variants?.sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0))[0]?.price || item.price,
      name: item.name,
      quantity: 1,
      variantSelections: [],
      offers: [],
    } as any);
  };

  const handleDecrease = () => {
    if (!item.id) return;
    if (quantity > 1) decreaseQuantity(item.id);
    else removeItem(item.id);
  };

  const price = item.variants?.sort((a: any, b: any) => (a?.price ?? 0) - (b?.price ?? 0))[0]?.price || item.price;

  return (
    <div className="py-3 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        {item.is_veg !== null && item.is_veg !== undefined && (
          <div className="mb-1">
            <span className={`inline-block w-3.5 h-3.5 border rounded-sm text-[8px] flex items-center justify-center ${item.is_veg ? "border-green-600 text-green-600" : "border-red-600 text-red-600"}`}>
              ●
            </span>
          </div>
        )}
        <p className="font-semibold text-sm" style={{ color: styles?.color }}>{item.name}</p>
        {item.description && (
          <p className="text-xs mt-0.5 line-clamp-2 opacity-50" style={{ color: styles?.color }}>{item.description}</p>
        )}
        <p className="text-sm font-bold mt-1" style={{ color: styles?.accent }}>
          {hasVariants && <span className="text-xs font-normal">From </span>}
          {hoteldata?.currency || "₹"} {price}
        </p>
      </div>
      <div className="flex flex-col items-center flex-shrink-0">
        {item.image_url && (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden">
            <img
              src={item.image_url}
              alt={item.name}
              className={`w-full h-full object-cover ${!item.is_available ? "grayscale" : ""}`}
            />
            {!item.is_available && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-1 text-center text-[9px] font-extrabold uppercase tracking-wider text-white">
                Unavailable
              </div>
            )}
          </div>
        )}
        {showAddButton && item.is_available && (
          <div className={`${item.image_url ? "-mt-3" : "mt-1"}`}>
            {quantity > 0 && !hasVariants ? (
              <div
                className="bg-white border rounded-lg px-3 py-1 font-semibold flex items-center gap-3 text-xs shadow-sm"
                style={{ color: styles?.accent, borderColor: `${styles?.accent}30` }}
              >
                <button onClick={(e) => { e.stopPropagation(); handleDecrease(); }} className="text-sm font-bold">−</button>
                <span>{quantity}</span>
                <button onClick={(e) => { e.stopPropagation(); handleAdd(); }} className="text-sm font-bold">+</button>
              </div>
            ) : (
              <div
                onClick={handleAdd}
                className="bg-white border rounded-lg px-4 py-1 font-semibold text-xs cursor-pointer shadow-sm"
                style={{ color: styles?.accent, borderColor: `${styles?.accent}40` }}
              >
                {quantity > 0 ? `Added (${quantity})` : "Add"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// The props for SearchItems remain the same
interface SearchItemsProps {
  menu: HotelDataMenus[];
  styles: DefaultHotelPageProps["styles"];
  hoteldata: HotelData;
  tableNumber: number;
  auth?: any;
  iconOnly?: boolean;
  inputStyle?: boolean;
  onClose?: () => void;
}

const SearchItems = ({
  menu,
  styles,
  hoteldata,
  tableNumber,
  auth,
  iconOnly,
  inputStyle,
  onClose,
}: SearchItemsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(!!onClose);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Memoize the filtered menu to prevent recalculating on every render
  const filteredMenu = useMemo(() => {
    if (!searchQuery) {
      return menu;
    }
    return menu.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menu, searchQuery]);

  // Effect to handle body scroll and input focus when modal is open/closed
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      // Delay focus slightly to ensure the input is mounted and ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = "auto";
    }
    // Cleanup function to reset body scroll when component unmounts
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);


  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setSearchQuery("");
    onClose?.();
  }

  return (
    <div>
      {/* Search Trigger - hidden when externally controlled via onClose */}
      {onClose ? null : iconOnly && inputStyle ? (
        <div
          onClick={openModal}
          className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 cursor-pointer hover:border-gray-300 transition-colors flex-shrink-0 bg-white/60 mt-1"
        >
          <Search className="h-4 w-4 opacity-40" />
          <span className="text-sm opacity-40 font-normal whitespace-nowrap">Search dishes</span>
        </div>
      ) : iconOnly ? (
        <button
          onClick={openModal}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors flex-shrink-0"
        >
          <Search className="h-5 w-5 opacity-60" />
        </button>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground font-normal h-[40px] rounded-full"
          onClick={openModal}
        >
          <Search className="mr-2 h-4 w-4" />
          Search for dishes...
        </Button>
      )}

      {/* Full-Screen Search Modal */}
      {isModalOpen && (
        <div style={{
          backgroundColor: styles?.backgroundColor || "#000",
        }} className="fixed inset-0 z-[60] flex flex-col animate-in fade-in-0">
          {/* Modal Header with shadcn/ui Input */}
          <div className="flex items-center p-2 border-b">
            <div className="flex-grow flex items-center gap-2">
              <Search className="ml-3 h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search for dishes..."
                className="text-base border-0 shadow-none focus-visible:ring-0 placeholder:text-inherit placeholder:opacity-40"
                style={{ color: styles?.color }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={closeModal} className="mr-2">
              <X className="h-5 w-5" />
              <span className="sr-only">Close search</span>
            </Button>
          </div>

          {/* Menu Items List using shadcn/ui ScrollArea */}
          <ScrollArea className="flex-grow">
            <div className="pt-2 pb-4 px-4 divide-y" style={{ borderColor: `${styles?.color}10` }}>
              {filteredMenu.length > 0 ? (
                filteredMenu.map((item) => (
                  <SearchResultItem
                    key={item.id}
                    item={item}
                    styles={styles}
                    hoteldata={hoteldata}
                    tableNumber={tableNumber}
                  />
                ))
              ) : (
                <div className="text-center p-10" style={{ color: styles?.color, opacity: 0.4 }}>
                  <p>No dishes found for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SearchItems;