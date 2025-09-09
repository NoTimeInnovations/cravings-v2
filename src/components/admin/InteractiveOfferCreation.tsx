"use client";

import { useEffect, useMemo, useState } from "react";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { useCategoryStore } from "@/store/categoryStore_hasura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import React from "react";
import { toast } from "sonner";
import Img from "../Img";
import { Trash2 } from "lucide-react";

interface VariantSelectionModalProps {
  open: boolean;
  onClose: () => void;
  item: MenuItem | null;
  onSelect: (variants: { name: string; price: number }[]) => void;
  initialSelected?: string[];
}

function VariantSelectionModal({ open, onClose, item, onSelect, initialSelected = [] }: VariantSelectionModalProps) {
  const variants = item?.variants || [];
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(initialSelected));
  }, [open, item?.id, initialSelected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-background p-4 shadow-xl border max-h-[70vh] overflow-auto">
        <div className="text-base font-semibold mb-2">Select Variant</div>
        <div className="space-y-2">
          {variants.map((v) => {
            const isChecked = selected.has(v.name);
            return (
              <label key={v.name} className="flex items-center justify-between rounded-md border p-2 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(val) => {
                      const next = new Set(selected);
                      if (val) next.add(v.name); else next.delete(v.name);
                      setSelected(next);
                    }}
                  />
                  <span className="text-sm font-medium">{v.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">₹ {Math.round(v.price)}</span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              const chosen = variants.filter((v) => selected.has(v.name));
              onSelect(chosen);
              onClose();
            }}
            disabled={variants.length > 0 && selected.size === 0}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface SelectedItem {
  item: MenuItem;
  variants?: { name: string; price: number }[];
}

interface InteractiveOfferCreationProps {
  onNext: (selected: SelectedItem[]) => void;
  onCancel: () => void;
  onSelectionChange?: (selected: SelectedItem[]) => void;
  initialSelected?: SelectedItem[];
}

export function InteractiveOfferCreation({ onNext, onCancel, onSelectionChange, initialSelected }: InteractiveOfferCreationProps) {
  const { items, fetchMenu, groupedItems } = useMenuStore();
  const { fetchCategories } = useCategoryStore();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
  const [variantModalItem, setVariantModalItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    (async () => {
      if (items.length === 0) {
        await fetchMenu();
      }
      await fetchCategories(useCategoryStore.getState().categories[0]?.partner_id || "");
    })();
  }, []);

  // Hydrate selection from parent when provided (for persistence across steps)
  useEffect(() => {
    if (initialSelected && initialSelected.length > 0) {
      const mapped: Record<string, SelectedItem> = initialSelected.reduce((acc, cur) => {
        acc[cur.item.id as string] = cur;
        return acc;
      }, {} as Record<string, SelectedItem>);
      setSelectedItems(mapped);
    }
  }, [initialSelected]);

  const categories = useMemo(() => {
    const format = (n: string) => n.replaceAll("_", " ");
    const cats = ["All", ...Object.keys(groupedItems)].map(format);
    return cats;
  }, [groupedItems]);

  const visibleItems = useMemo(() => {
    let pool: MenuItem[] = [];
    if (activeCategory === "All") {
      pool = items;
    } else {
      const key = Object.keys(groupedItems).find(
        (k) => k.replaceAll("_", " ") === activeCategory
      );
      pool = (key && groupedItems[key]) || [];
    }
    const q = search.trim().toLowerCase();
    return q.length === 0
      ? pool
      : pool.filter((mi) => mi.name.toLowerCase().includes(q));
  }, [items, groupedItems, activeCategory, search]);

  const isAllVisibleSelected = useMemo(() => {
    if (!visibleItems || visibleItems.length === 0) return false;
    return visibleItems.every((mi) => {
      const sel = selectedItems[mi.id as string];
      if (!sel) return false;
      const totalVariants = mi.variants?.length || 0;
      const selectedVariants = sel.variants?.length || 0;
      return totalVariants === 0 ? true : selectedVariants === totalVariants;
    });
  }, [visibleItems, selectedItems]);

  const handleSelectAllToggle = () => {
    if (!visibleItems || visibleItems.length === 0) return;

    if (isAllVisibleSelected) {
      // Clear all visible selections
      const updated: Record<string, SelectedItem> = { ...selectedItems };
      for (const mi of visibleItems) {
        delete updated[mi.id as string];
      }
      console.log("[SelectAll] Cleared", {
        clearedCount: visibleItems.length,
        category: activeCategory,
      });
      setSelectedItems(updated);
      onSelectionChange?.(Object.values(updated));
      return;
    }

    // Select all visible (and all variants when present)
    const additions: Record<string, SelectedItem> = {};
    for (const mi of visibleItems) {
      additions[mi.id as string] = {
        item: mi,
        variants: (mi.variants && mi.variants.length > 0)
          ? mi.variants.map((v) => ({ name: v.name, price: v.price }))
          : [],
      };
    }
    const updated = { ...selectedItems, ...additions };
    console.log("[SelectAll] Selected", {
      addedCount: Object.keys(additions).length,
      category: activeCategory,
    });
    setSelectedItems(updated);
    onSelectionChange?.(Object.values(updated));
  };

  const addItem = (mi: MenuItem) => {
    const hasVariants = mi.variants && mi.variants.length > 0;
    if (hasVariants) {
      setVariantModalItem(mi);
    } else {
      const updated = {
        ...selectedItems,
        [mi.id as string]: { item: mi, variants: [] },
      };
      setSelectedItems(updated);
      onSelectionChange?.(Object.values(updated));
    }
  };

  const removeItem = (mi: MenuItem) => {
    const { [mi.id as string]: _, ...rest } = selectedItems;
    setSelectedItems(rest);
    onSelectionChange?.(Object.values(rest));
  };

  const handleVariantSelect = (variants: { name: string; price: number }[]) => {
    if (!variantModalItem) return;
    const updated = {
      ...selectedItems,
      [variantModalItem.id as string]: { item: variantModalItem, variants },
    };
    setSelectedItems(updated);
    onSelectionChange?.(Object.values(updated));
    setVariantModalItem(null);
  };

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <div className="space-y-3">
      <VariantSelectionModal
        open={!!variantModalItem}
        onClose={() => setVariantModalItem(null)}
        item={variantModalItem}
        onSelect={handleVariantSelect}
        initialSelected={variantModalItem?.id ? (selectedItems[variantModalItem.id]?.variants || []).map(v => v.name) : []}
      />

      {/* Horizontal, scrollable category bar */}
      <Card>
        <CardContent className="p-2">
          <div className="overflow-x-auto">
            <div className="flex gap-2 w-max">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={cat === activeCategory ? "default" : "ghost"}
                  className="whitespace-nowrap"
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3/4">
            <Input
              placeholder="Search items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-1/4 flex justify-end">
            <Button
              variant="outline"
              className="whitespace-nowrap w-full"
              onClick={handleSelectAllToggle}
            >
              {isAllVisibleSelected ? "Clear All" : "Select All"}
            </Button>
          </div>
          {/* <div className="ml-auto text-sm text-muted-foreground">{selectedCount} selected</div> */}
        </div>
        <ScrollArea className="h-[60vh] rounded-md border">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
            {visibleItems.map((mi) => {
              const isSelected = Boolean(selectedItems[mi.id as string]);
              const hasVariants = mi.variants && mi.variants.length > 0;
              return (
                <Card key={mi.id} className={isSelected ? "ring-2 ring-orange-500" : ""}>
                  <CardContent className="p-3 space-y-2 relative flex flex-col justify-between h-full">

                    <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                      <Img src={mi.image_url} alt={mi.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="text-sm font-medium line-clamp-2">{mi.name}</div>
                    <div className="text-xs text-muted-foreground">₹ {Math.round(mi.price)}</div>
                    <div className="flex justify-between">
                      {hasVariants || !isSelected ? (
                        <div className="flex">
                          <Button size="sm" variant="outline" onClick={() => addItem(mi)}>
                            Add
                          </Button>
                        </div>
                      ) : (
                        <div className=""></div>
                      )}
                      {isSelected ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className=" h-7 w-7 rounded-full bg-red-100 hover:bg-red-200"
                          onClick={() => removeItem(mi)}
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Selection is controlled by OffersTab's header buttons */}
      </section>
    </div>
  );
}

interface OfferDetailsProps {
  selected: SelectedItem[];
  onBack: () => void;
  onSubmit: (payload: {
    percentage?: number;
    amount?: number;
    offer_type?: string;
    start_time?: string;
    end_time?: string;
  }) => void;
}

export function OfferDetails({ selected, onBack, onSubmit }: OfferDetailsProps) {
  const [percentage, setPercentage] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [deliverySelected, setDeliverySelected] = useState<boolean>(true);
  const [dineInSelected, setDineInSelected] = useState<boolean>(true);
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  const isMultiItem = useMemo(() => {
    if (selected.length > 1) return true;
    if (selected.length === 1) {
      const sel = selected[0];
      return (sel.variants?.length || 0) > 1;
    }
    return false;
  }, [selected]);

  const submit = () => {
    console.log("[OfferDetails] Selected:", selected.map(s => ({ id: s.item.id, name: s.item.name, variants: s.variants?.map(v => ({ name: v.name, price: v.price })) })));
    console.log("[OfferDetails] isMultiItem:", isMultiItem);
    console.log("[OfferDetails] Inputs:", { percentage, amount, startAt, endAt, deliverySelected, dineInSelected });
    if (!startAt || !endAt) {
      toast.error("Please select start and end time");
      return;
    }
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    const now = Date.now();
    if (end <= start) {
      toast.error("End time must be after start time");
      return;
    }
    if (end - start < 15 * 60 * 1000) {
      toast.error("Duration should be at least 15 minutes");
      return;
    }

    if (isMultiItem) {
      const hasPct = percentage.trim().length > 0;
      if (!hasPct) {
        toast.error("Discount percentage is required");
        return;
      }
      const pct = Number(percentage);
      if (!pct || isNaN(pct) || pct <= 0 || pct > 100) {
        toast.error("Please enter a valid discount percentage (1-100)");
        return;
      }
    } else {
      // Single item: only offer amount is required
      const hasAmount = amount.trim().length > 0;
      if (!hasAmount) {
        toast.error("Offer price is required for a single item");
        return;
      }
      const num = Number(amount);
      if (isNaN(num) || num <= 0) {
        toast.error("Enter a valid offer amount");
        return;
      }
      const sel = selected[0];
      const base = sel.variants && sel.variants.length > 0 ? sel.variants[0].price : sel.item.price;
      if (base && num >= base) {
        toast.error("Offer price must be less than original price");
        return;
      }
    }

    const derivedType = (deliverySelected && dineInSelected)
      ? "all"
      : (deliverySelected ? "delivery" : (dineInSelected ? "dine_in" : "all"));

    const payload = {
      percentage: isMultiItem ? (percentage ? parseFloat(percentage) : undefined) : undefined,
      amount: !isMultiItem ? (amount ? parseFloat(amount) : undefined) : undefined,
      offer_type: derivedType,
      start_time: startAt || undefined,
      end_time: endAt || undefined,
    } as any;
    console.log("[OfferDetails] Submit payload:", payload);
    onSubmit(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        {selected.map((sel) => {
          const calcPrice = () => {
            if (sel.variants && sel.variants.length > 0) {
              // If multiple variants selected, show the lowest price as reference
              const prices = sel.variants.map((v) => v.price).filter((n) => typeof n === 'number');
              if (prices.length === 0) return undefined;
              return Math.min(...prices);
            }
            return sel.item.price;
          };
          const showPrice = selected.length === 1;
          const price = showPrice ? calcPrice() : undefined;

          return (
            <div key={sel.item.id} className="flex items-center justify-between gap-2 rounded-md border p-2 min-w-[220px]">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                  <Img src={sel.item.image_url} alt={sel.item.name} className="h-full w-full object-cover" />
                </div>
                <div className="text-xs">
                  <div className="font-medium line-clamp-1">{sel.item.name}</div>
                  {sel.variants && sel.variants.length > 0 ? (
                    <div className="text-muted-foreground line-clamp-1">
                      {sel.variants.map((v) => v.name).join(", ")}
                    </div>
                  ) : null}
                </div>
              </div>
              {showPrice && typeof price === 'number' ? (
                <div className="text-xs font-semibold whitespace-nowrap">₹ {Math.round(price)}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isMultiItem && (
          <div>
            <label className="text-sm font-medium">Discount Percentage</label>
            <Input placeholder="e.g. 20" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
          </div>
        )}
        {!isMultiItem && selected.length === 1 && (
          <div>
            <label className="text-sm font-medium">Offer Price</label>
            <Input placeholder="e.g. 199" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        )}
        <div>
          <label className="text-sm font-medium">Offer For</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={deliverySelected} onCheckedChange={(v) => setDeliverySelected(Boolean(v))} />
              Delivery
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={dineInSelected} onCheckedChange={(v) => setDineInSelected(Boolean(v))} />
              Dine-In
            </label>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Start</label>
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">End</label>
          <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={submit}>Upload Offer</Button>
      </div>
    </div>
  );
}