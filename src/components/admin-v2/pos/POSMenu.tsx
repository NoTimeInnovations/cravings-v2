"use client";

import { useEffect, useState } from "react";
import { useMenuStore, GroupedItems } from "@/store/menuStore_hasura";
import { useAuthStore } from "@/store/authStore";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

    return (
        <div className="flex h-full">
            <ShopClosedModalWarning
                hotelId={userData?.id || ""}
                isShopOpen={(userData as Partner)?.is_shop_open ?? true}
            />

            {/* Desktop: Vertical Category Sidebar */}
            <div className="hidden lg:flex w-40 flex-col border-r bg-card h-full">
                <div className="p-4 border-b font-semibold text-lg">Categories</div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {groupedItems && Object.keys(groupedItems).map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`w-full text-left capitalize px-3 py-2 rounded-md font-medium transition-colors text-sm ${selectedCategory === category
                                ? "bg-orange-50 text-orange-600 border-l-4 border-orange-600"
                                : "dark:text-white hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 h-full min-w-0">
                {/* Header: Search & Mobile Categories */}
                <div className="border-b bg-background z-10">
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

                    {/* Mobile Only: Horizontal Category List */}
                    {!searchQuery && groupedItems && (
                        <div className="lg:hidden flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-thin">
                            {Object.keys(groupedItems).map((category) => (
                                <Button
                                    key={category}
                                    variant={selectedCategory === category ? "default" : "outline"}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`rounded-md flex-shrink-0 capitalize text-base px-4 py-2 h-auto ${selectedCategory === category
                                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                                        : "hover:bg-orange-50 hover:text-orange-600 border-orange-200"
                                        }`}
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Menu Grid */}
                <div className="flex-1 overflow-y-auto p-4 md:p-4 bg-muted/10 pb-32 md:pb-4">
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
