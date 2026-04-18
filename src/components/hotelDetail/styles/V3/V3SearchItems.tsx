"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { Search, X, Plus, Minus } from "lucide-react";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { getFeatures } from "@/lib/getFeatures";
import useOrderStore from "@/store/orderStore";
import { formatPrice } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const shouldShowPrice = hoteldata?.currency !== "🚫";
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
            {hoteldata?.currency || "₹"}{formatPrice(price, hoteldata?.id)}
          </div>
        )}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400">{item.description}</p>
        )}
      </div>

      <div className="relative shrink-0">
        <div className="h-24 w-24 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 flex items-center justify-center bg-gray-100">
          {visible && (
            <img
              src={item.image_url || "/image_placeholder.png"}
              alt={item.name}
              className={`h-full w-full object-cover ${!item.image_url ? "invert opacity-50" : ""}`}
            />
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
    </div>
  );
};

interface V3SearchItemsProps {
  menu: HotelDataMenus[];
  hoteldata: HotelData;
  tableNumber: number;
  onClose: () => void;
}

const V3SearchItems = ({ menu, hoteldata, tableNumber, onClose }: V3SearchItemsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMenu = useMemo(() => {
    if (!searchQuery) return menu;
    return menu.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menu, searchQuery]);

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
        <Button variant="ghost" size="icon" onClick={closeModal} className="mr-2">
          <X className="h-5 w-5 text-gray-900" />
        </Button>
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
    </div>
  );
};

export default V3SearchItems;
