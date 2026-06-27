"use client";

import { useEffect, useState } from "react";
import { useMenuStore, GroupedItems } from "@/store/menuStore_hasura";
import { useAuthStore } from "@/store/authStore";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import PosItemCard from "@/components/pos/PosItemCard";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { Partner } from "@/store/authStore";

export function POSMenu() {
    const { items, groupedItems, fetchMenu } = useMenuStore();
    const { userData } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [filteredGroupedItems, setFilteredGroupedItems] = useState<GroupedItems>({});

    useEffect(() => {
        if (userData?.id) {
            fetchMenu();
        }
    }, [userData]);

    useEffect(() => {
        if (!userData?.id) return;
        if (groupedItems && Object.keys(groupedItems).length > 0 && !selectedCategory) {
            const firstCategory = Object.keys(groupedItems)[0];
            setSelectedCategory(firstCategory);
        }
    }, [groupedItems, userData?.id]);

    useEffect(() => {
        if (!userData?.id || !groupedItems) return;

        if (searchQuery) {
            const filtered: GroupedItems = {};
            Object.entries(groupedItems).forEach(([category, categoryItems]) => {
                const filteredItems = categoryItems.filter((item) =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filteredItems.length > 0) {
                    filtered[category] = filteredItems;
                }
            });
            setFilteredGroupedItems(filtered);
        } else if (selectedCategory) {
            const categoryItems = groupedItems[selectedCategory as string] || [];
            setFilteredGroupedItems({ [selectedCategory as string]: categoryItems });
        }
    }, [groupedItems, searchQuery, selectedCategory, userData?.id]);

    // A category has no image of its own, so use its first item's image
    // (first item in the group that actually has one).
    const categoryImage = (category: string): string | undefined =>
        (groupedItems?.[category] || []).find((i) => i.image_url)?.image_url || undefined;

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
                    {groupedItems && Object.keys(groupedItems).map((category) => {
                        const img = categoryImage(category);
                        return (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`w-full capitalize px-1.5 lg:px-2 py-2 rounded-md font-medium transition-colors text-[11px] lg:text-xs flex flex-col items-center gap-1 text-center border ${selectedCategory === category
                                    ? "bg-orange-50 text-orange-600 border-orange-300"
                                    : "border-transparent dark:text-white hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <span className="h-12 w-12 lg:h-16 lg:w-16 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center text-sm lg:text-base font-semibold uppercase text-muted-foreground">
                                    {img ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={img} alt={category} loading="lazy" className="h-full w-full object-cover" />
                                    ) : (
                                        category.charAt(0)
                                    )}
                                </span>
                                <span className="w-full leading-tight break-words">{category}</span>
                            </button>
                        );
                    })}
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
