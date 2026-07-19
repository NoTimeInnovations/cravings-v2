"use client";

import { useEffect, useMemo, useState } from "react";
import { useMenuStore, GroupedItems } from "@/store/menuStore_hasura";
import { useAuthStore } from "@/store/authStore";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import PosItemCard from "@/components/pos/PosItemCard";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { Partner } from "@/store/authStore";

export function POSMenu() {
    const { groupedItems, fetchMenu } = useMenuStore();
    const { userData } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [filteredGroupedItems, setFilteredGroupedItems] = useState<GroupedItems>({});

    // Unavailable items are hidden from the POS entirely (staff shouldn't be able
    // to bill an item the kitchen has switched off). Categories left with no
    // available items drop out of the list too.
    const availableGroupedItems = useMemo(() => {
        const result: GroupedItems = {};
        if (!groupedItems) return result;
        Object.entries(groupedItems).forEach(([category, categoryItems]) => {
            const avail = categoryItems.filter((item) => item.is_available !== false);
            if (avail.length > 0) result[category] = avail;
        });
        return result;
    }, [groupedItems]);

    useEffect(() => {
        if (userData?.id) {
            fetchMenu();
        }
    }, [userData]);

    useEffect(() => {
        if (!userData?.id) return;
        const cats = Object.keys(availableGroupedItems);
        if (cats.length === 0) return;
        // Pick the first category on load, or reset if the selected one just
        // emptied out (all its items went unavailable).
        if (!selectedCategory || !cats.includes(selectedCategory)) {
            setSelectedCategory(cats[0]);
        }
    }, [availableGroupedItems, userData?.id, selectedCategory]);

    useEffect(() => {
        if (!userData?.id) return;

        if (searchQuery) {
            const filtered: GroupedItems = {};
            Object.entries(availableGroupedItems).forEach(([category, categoryItems]) => {
                const filteredItems = categoryItems.filter((item) =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filteredItems.length > 0) {
                    filtered[category] = filteredItems;
                }
            });
            setFilteredGroupedItems(filtered);
        } else if (selectedCategory && availableGroupedItems[selectedCategory as string]) {
            setFilteredGroupedItems({ [selectedCategory as string]: availableGroupedItems[selectedCategory as string] });
        } else {
            setFilteredGroupedItems({});
        }
    }, [availableGroupedItems, searchQuery, selectedCategory, userData?.id]);

    return (
        <div className="flex h-full min-h-0 overflow-hidden">
            <ShopClosedModalWarning
                hotelId={userData?.id || ""}
                isShopOpen={(userData as Partner)?.is_shop_open ?? true}
            />

            {/* Vertical Category Sidebar — always on the left (compact on mobile).
                It's its own full-height column with an internal scroll, so the
                category list and the items grid scroll independently. */}
            <div className="flex w-24 sm:w-32 lg:w-48 shrink-0 flex-col border-r bg-card h-full min-h-0 overflow-hidden">
                <div className="p-2 lg:p-4 border-b font-semibold text-sm lg:text-lg shrink-0">Categories</div>
                <div className="flex-1 min-h-0 overflow-y-auto p-1.5 lg:p-2 space-y-1">
                    {Object.keys(availableGroupedItems).map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`w-full capitalize px-2 lg:px-3 py-2 rounded-md font-medium leading-tight break-words transition-colors text-[11px] lg:text-sm text-left border ${selectedCategory === category
                                ? "bg-orange-50 text-orange-600 border-orange-300"
                                : "border-transparent dark:text-white hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 h-full min-h-0 min-w-0">
                {/* Header: Search & Mobile Categories */}
                <div className="border-b bg-background z-10 shrink-0">
                    <div className="p-4 pb-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                type="text"
                                placeholder="Search menu items..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value) setSelectedCategory(null);
                                }}
                                className="pl-9 bg-muted/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-4 bg-muted/10 pb-32 md:pb-4">
                    {Object.entries(filteredGroupedItems).length > 0 ? (
                        Object.entries(filteredGroupedItems).map(([category, items]) => (
                            <div key={category} className="mb-4 md:mb-6">
                                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 capitalize">
                                    <div className="h-4 w-1 bg-orange-500 rounded-full" />
                                    {category}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                                    {items.map((item) => (
                                        <PosItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p>No items found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
