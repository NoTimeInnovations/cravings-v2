"use client";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import React, { useEffect, useState, useRef } from "react";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { SearchIcon, X, Plus, Minus } from "lucide-react";
import Fuse from "fuse.js";
import useOrderStore from "@/store/orderStore";
import { toast } from "sonner";
import ItemDetailsModal from "./styles/Default/ItemDetailsModal";
import { getFeatures } from "@/lib/getFeatures";

const SearchMenu = ({
  hotelData,
  menu,
  currency,
  styles,
  externalOpen,
  onExternalClose,
}: {
  menu: HotelDataMenus[];
  styles: Styles;
  currency: string;
  hotelData: HotelData;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}) => {
  const [showGrid, setShowGrid] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hotelTheme");
      if (stored) {
        const parsed = JSON.parse(stored);
        setShowGrid(parsed.showGrid === true);
      }
    } catch {}
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : isSearchOpen;
  const handleClose = () => {
    setIsSearchOpen(false);
    onExternalClose?.();
  };
  const [items, setItems] = useState<HotelDataMenus[]>([]);
  const [query, setQuery] = useState<string>("");
  const [fuse, setFuse] = useState<Fuse<HotelDataMenus> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [variantModalItem, setVariantModalItem] = useState<HotelDataMenus | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [expandedVariantItemId, setExpandedVariantItemId] = useState<string | null>(null);

  const { addItem, removeItem, increaseQuantity, decreaseQuantity, items: orderItems, totalPrice } = useOrderStore();
  const { setOpenPlaceOrderModal } = useOrderStore();

  // Effect to disable body scroll when search is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup on component unmount
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Initialize Fuse.js
  useEffect(() => {
    if (menu.length > 0) {
      const options = {
        keys: ["name"],
        threshold: 0.3, // Not used in extended search, but keep for fallback
        useExtendedSearch: true,
      };
      setFuse(new Fuse(menu, options));
      setItems(menu);
    }
  }, [menu]);

  // Perform search
  useEffect(() => {
    if (query.trim() === "") {
      setItems(menu);
      return;
    }
    const words = query.trim().toLowerCase().split(/\s+/);
    const filtered = menu.filter(item => {
      const nameWords = item.name.toLowerCase().split(/\s+/);
      // Every search word must match the start of some word in the item name
      return words.every(word =>
        nameWords.some(nw => nw.startsWith(word))
      );
    });
    setItems(filtered);
  }, [query, menu]);

  // Focus input when search opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleAddItem = (item: HotelDataMenus) => {
    if (item.variants && item.variants.length > 0) {
      setExpandedVariantItemId(expandedVariantItemId === item.id ? null : (item.id || null));
    } else {
      addItem(item);
    }
  };

  const handleIncreaseQuantity = (item: HotelDataMenus) => {
    if (item.id) {
      increaseQuantity(item.id);
    }
  };

  const handleDecreaseQuantity = (item: HotelDataMenus) => {
    if (item.id) {
      decreaseQuantity(item.id);
    }
  };

  const getItemQuantity = (itemId: string | undefined) => {
    if (!itemId) return 0;
    const orderItem = orderItems?.find(item => item.id === itemId);
    return orderItem?.quantity || 0;
  };

  const hasItemsInOrder = orderItems && orderItems.length > 0;

  const handleViewOrder = () => {
    handleClose();
    setOpenPlaceOrderModal(true);
  };

  const handleVariantAdd = (item: HotelDataMenus, variant: any) => {
    addItem({
      ...item,
      id: `${item.id}|${variant.name}`,
      name: `${item.name} (${variant.name})`,
      price: variant.price,
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

  const handleVariantRemove = (item: HotelDataMenus, variant: any) => {
    const variantId = `${item.id}|${variant.name}`;
    decreaseQuantity(variantId);
  };

  const getVariantQuantity = (item: HotelDataMenus, variantName: string) => {
    const variantId = `${item.id}|${variantName}`;
    const orderItem = orderItems?.find(item => item.id === variantId);
    return orderItem?.quantity || 0;
  };

  return (
    <>
      {/* Search Trigger (hidden when controlled externally) */}
      {externalOpen === undefined && (
        <div
          onClick={() => setIsSearchOpen(true)}
          style={styles.border}
          className="bg-white w-full h-[55px] rounded-full flex items-center px-4 gap-3 text-black/30 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
        >
          <SearchIcon />
          <span>Search in {hotelData.name || 'Menu'}</span>
        </div>
      )}

      {/* Search Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            ...(showGrid && {
              backgroundImage: `linear-gradient(${styles.color}08 1px, transparent 1px), linear-gradient(90deg, ${styles.color}08 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }),
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 shadow-sm" style={{ backgroundColor: styles.backgroundColor, borderBottom: `1px solid ${styles.border.borderColor}` }}>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-3 flex-1 min-w-0 rounded-xl px-4 py-2 border transition-all"
                style={{ backgroundColor: `${styles.color}08`, borderColor: styles.border.borderColor }}
              >
                <SearchIcon size={20} className="shrink-0 opacity-50" />
                <input
                  ref={inputRef}
                  className="bg-transparent flex-1 min-w-0 outline-none text-base md:text-lg placeholder:opacity-50"
                  style={{ color: styles.color }}
                  placeholder={`Search...`}
                  value={query}
                  onChange={handleSearchChange}
                />
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2.5 rounded-xl active:opacity-70 transition-opacity"
                style={{ backgroundColor: `${styles.color}08` }}
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-48 md:pb-64">
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item) => {
                  const quantity = getItemQuantity(item.id);
                  const hasVariants = item.variants && item.variants.length > 0;
                  const isExpanded = expandedVariantItemId === item.id;
                  const orderingEnabled = getFeatures(hotelData.feature_flags || "")?.ordering?.enabled;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden"
                      style={{ backgroundColor: `${styles.color}08`, border: `1px solid ${styles.border.borderColor}` }}
                    >
                      {/* Main Item Content */}
                      <div className="flex items-center">
                        {/* Image */}
                        <div className="w-20 h-20 relative overflow-hidden flex-shrink-0 m-2.5 rounded-lg" style={{ backgroundColor: `${styles.color}0D` }}>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-lg font-bold opacity-30">
                                {item.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 py-2.5 pl-5 pr-3 flex flex-col">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-3">
                              <h3 className="text-sm font-bold capitalize mb-1 line-clamp-2" style={{ color: styles.color }}>
                                {item.name}
                              </h3>
                              {orderingEnabled && (
                                <span className="block text-base font-black mb-1" style={{ color: styles.accent }}>{currency}{item.price}</span>
                              )}
                              {item.description && (
                                <p className="text-sm line-clamp-2 opacity-50">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {/* Price and Add Button */}
                            <div className="flex flex-col items-end gap-2">
                              {!orderingEnabled && (
                                <span className="text-base font-black mr-3" style={{ color: styles.accent }}>{currency}{item.price}</span>
                              )}
                              {!hasVariants ? (
                                orderingEnabled ? (
                                  quantity === 0 ? (
                                    <button
                                      onClick={() => handleAddItem(item)}
                                      className="px-3 py-1.5 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
                                      style={{ backgroundColor: styles.accent }}
                                    >
                                      Add
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-white rounded-lg px-2 py-1.5" style={{ backgroundColor: styles.accent }}>
                                      <button
                                        onClick={() => handleDecreaseQuantity(item)}
                                        className="w-5 h-5 flex items-center justify-center rounded-full active:opacity-70"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="text-xs font-bold min-w-[18px] text-center">
                                        {quantity}
                                      </span>
                                      <button
                                        onClick={() => handleIncreaseQuantity(item)}
                                        className="w-5 h-5 flex items-center justify-center rounded-full active:opacity-70"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  null
                                )
                              ) : (
                                <button
                                  onClick={() => setExpandedVariantItemId(isExpanded ? null : (item.id || null))}
                                  className="px-3 py-1.5 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
                                  style={{ backgroundColor: styles.accent }}
                                >
                                  {isExpanded ? 'Hide' : 'Options'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Variant Options */}
                      {hasVariants && isExpanded && (
                        <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${styles.border.borderColor}` }}>
                          <h4 className="text-xs font-semibold mb-2" style={{ color: styles.color }}>Choose your option:</h4>
                          <div className="space-y-2">
                            {item.variants?.map((variant) => (
                              <div key={variant.name} className="flex items-center justify-between p-2.5 rounded-lg transition-colors" style={{ border: `1px solid ${styles.border.borderColor}` }}>
                                <div className="flex-1 flex flex-col">
                                  <div className="text-sm font-semibold" style={{ color: styles.color }}>{variant.name}</div>
                                  {orderingEnabled ? (
                                    <span className="block text-sm font-black" style={{ color: styles.accent }}>{currency}{variant.price}</span>
                                  ) : null}
                                </div>
                                {!orderingEnabled && (
                                  <span className="text-sm font-black mr-2" style={{ color: styles.accent }}>{currency}{variant.price}</span>
                                )}
                                {orderingEnabled ? (
                                  getVariantQuantity(item, variant.name) > 0 ? (
                                    <div className="flex items-center gap-1.5 text-white rounded-lg px-2 py-1.5" style={{ backgroundColor: styles.accent }}>
                                      <button
                                        onClick={() => handleVariantRemove(item, variant)}
                                        className="w-5 h-5 flex items-center justify-center rounded-full active:opacity-70"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="text-xs font-bold min-w-[18px] text-center">
                                        {getVariantQuantity(item, variant.name)}
                                      </span>
                                      <button
                                        onClick={() => handleVariantAdd(item, variant)}
                                        className="w-5 h-5 flex items-center justify-center rounded-full active:opacity-70"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleVariantAdd(item, variant)}
                                      className="px-3 py-1.5 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
                                      style={{ backgroundColor: styles.accent }}
                                    >
                                      Add
                                    </button>
                                  )
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 opacity-30" style={{ backgroundColor: `${styles.color}15` }}>
                  <SearchIcon size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No items found
                </h3>
                <p className="opacity-60 max-w-sm">
                  {query.trim() === ""
                    ? "Start typing to search..."
                    : `We couldn't find any items matching "${query}".`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SearchMenu;