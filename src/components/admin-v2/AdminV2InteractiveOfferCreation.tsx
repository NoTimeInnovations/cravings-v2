"use client";

import { useEffect, useMemo, useState } from "react";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { useCategoryStore } from "@/store/categoryStore_hasura";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import React from "react";
import Img from "../Img";
import { ChevronRight, Trash2, X } from "lucide-react";

import { useAuthStore, Captain } from "@/store/authStore";
import { SelectedItem } from "../../components/admin/InteractiveOfferCreation";

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
            <div className="relative z-10 w-[90%] max-w-sm rounded-lg bg-background p-4 shadow-xl border max-h-[70vh] overflow-auto">
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
                                <span className="text-xs text-muted-foreground">₹ {v.price}</span>
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

interface AdminV2InteractiveOfferCreationProps {
    onNext: (selected: SelectedItem[]) => void;
    onCancel: () => void;
    onSelectionChange?: (selected: SelectedItem[]) => void;
    initialSelected?: SelectedItem[];
}

export function AdminV2InteractiveOfferCreation({ onNext, onCancel, onSelectionChange, initialSelected }: AdminV2InteractiveOfferCreationProps) {
    const { userData } = useAuthStore();
    const { items, fetchMenu, groupedItems } = useMenuStore();
    const { fetchCategories } = useCategoryStore();
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [search, setSearch] = useState("");
    const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
    const [variantModalItem, setVariantModalItem] = useState<MenuItem | null>(null);
    const [showSelectedSheet, setShowSelectedSheet] = useState(false);

    useEffect(() => {
        (async () => {
            if (items.length === 0) {
                await fetchMenu();
            }
            if (userData) {
                const pid = userData.role === 'captain' ? (userData as Captain).partner_id : userData.id;
                if (pid) await fetchCategories(pid);
            }
        })();
    }, [userData]);

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
            const updated: Record<string, SelectedItem> = { ...selectedItems };
            for (const mi of visibleItems) {
                delete updated[mi.id as string];
            }
            setSelectedItems(updated);
            onSelectionChange?.(Object.values(updated));
            return;
        }

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
        <div className="relative h-full flex flex-col">
            <VariantSelectionModal
                open={!!variantModalItem}
                onClose={() => setVariantModalItem(null)}
                item={variantModalItem}
                onSelect={handleVariantSelect}
                initialSelected={variantModalItem?.id ? (selectedItems[variantModalItem.id]?.variants || []).map(v => v.name) : []}
            />

            <div className="flex flex-col gap-4 mb-4">
                {/* Categories */}
                <div className="overflow-x-auto pb-2 -mx-6 px-6 scrollbar-none">
                    <div className="flex gap-2 w-max">
                        {categories.map((cat) => (
                            <Button
                                key={cat}
                                size="sm"
                                variant={cat === activeCategory ? "default" : "outline"}
                                onClick={() => setActiveCategory(cat)}
                                className={cat === activeCategory ? "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-4" : "rounded-full px-4 border-gray-200 dark:border-gray-800"}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:max-w-md">
                        <Input
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10"
                        />
                        <svg
                            className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={handleSelectAllToggle}
                        className="text-sm font-medium text-foreground hover:bg-muted"
                    >
                        {isAllVisibleSelected ? "Clear All" : "Select All"}
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6 h-[50vh]">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="py-3 px-4 font-medium rounded-l-lg">Item</th>
                                <th className="py-3 px-4 font-medium">Price</th>
                                <th className="py-3 px-4 font-medium text-right rounded-r-lg">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {visibleItems.map((mi) => {
                                const isSelected = Boolean(selectedItems[mi.id as string]);
                                const hasVariants = mi.variants && mi.variants.length > 0;

                                return (
                                    <tr
                                        key={mi.id}
                                        className={`group transition-colors ${isSelected ? "bg-orange-50 dark:bg-orange-950/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-lg overflow-hidden border ${isSelected ? 'border-orange-200' : 'border-gray-200'} bg-muted`}>
                                                    <Img src={mi.image_url} alt={mi.name} className="h-full w-full object-cover" />
                                                </div>
                                                <span className={`font-medium ${isSelected ? 'text-orange-900 dark:text-orange-100' : ''}`}>{mi.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            {hasVariants ? (
                                                <>₹ {Math.min(...(mi.variants?.map(v => v.price) || [0]))} onwards</>
                                            ) : (
                                                <>₹ {mi.price}</>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {isSelected ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => removeItem(mi)}
                                                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
                                                >
                                                    Remove
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => addItem(mi)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity border-gray-200 text-foreground hover:bg-muted dark:border-gray-800"
                                                >
                                                    Add
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {visibleItems.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground">No items found matching your search.</div>
                    )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden grid grid-cols-1 gap-3 pb-20">
                    {visibleItems.map((mi) => {
                        const isSelected = Boolean(selectedItems[mi.id as string]);
                        return (
                            <div
                                key={mi.id}
                                onClick={() => !isSelected ? addItem(mi) : removeItem(mi)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${isSelected
                                    ? 'border-orange-500 bg-orange-50 dark:border-orange-500/50 dark:bg-orange-950/20 shadow-sm'
                                    : 'border-border bg-card'
                                    }`}
                            >
                                <div className="h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                                    <Img src={mi.image_url} alt={mi.name} className="h-full w-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{mi.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {mi.variants && mi.variants.length > 0 ? (
                                            <>₹ {Math.min(...(mi.variants?.map(v => v.price) || [0]))} onwards</>
                                        ) : (
                                            <>₹ {mi.price}</>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    {isSelected ? (
                                        <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
                                            <X className="h-3 w-3 text-white" />
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-600"></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {visibleItems.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground">No items found matching your search.</div>
                    )}
                </div>
            </ScrollArea>

            {/* Selected Items Summary Bar */}
            {selectedCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background/80 backdrop-blur-md z-20 md:absolute md:rounded-b-lg">
                    <div className="flex items-center justify-between max-w-full mx-auto">
                        <div
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                            onClick={() => setShowSelectedSheet(true)}
                        >
                            <div className="bg-black text-white text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center">
                                {selectedCount}
                            </div>
                            <span className="font-medium text-sm">Selected</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Button
                            onClick={() => onNext(Object.values(selectedItems))}
                            className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-6 shadow-lg"
                        >
                            Next Step
                        </Button>
                    </div>
                </div>
            )}

            {/* Selected Items Drawer/Sheet */}
            <Sheet open={showSelectedSheet} onOpenChange={setShowSelectedSheet}>
                <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
                    <SheetHeader className="mb-4">
                        <SheetTitle>Selected Items ({selectedCount})</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full pb-20">
                        <div className="space-y-3">
                            {Object.values(selectedItems).map((sel) => (
                                <div key={sel.item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-md overflow-hidden bg-muted">
                                            <Img src={sel.item.image_url} alt={sel.item.name} className="h-full w-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{sel.item.name}</div>
                                            {sel.variants && sel.variants.length > 0 && (
                                                <div className="text-xs text-muted-foreground">
                                                    {sel.variants.map(v => v.name).join(", ")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(sel.item)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
}
