"use client";
import React, { useState, useEffect } from "react";
import { useMenuStore, GroupedItems } from "@/store/menuStore_hasura";
import { usePOSStore } from "@/store/posStore";
// REMOVED: Card, CardContent, Plus, Minus are no longer needed here
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuthStore, Captain, Partner } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import PosItemCard from "@/components/pos/PosItemCard";

export const CaptainPOS = () => {
    const { items, groupedItems, fetchMenu } = useMenuStore();
    // REMOVED: cartItems, addToCart, decreaseQuantity are no longer directly used
    const { setIsCaptainOrder } = usePOSStore();
    const { userData, loading: authLoading } = useAuthStore();
    const captainData = userData as Captain;
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [filteredGroupedItems, setFilteredGroupedItems] = useState<GroupedItems>({});
    const [isLoading, setIsLoading] = useState(true);
    const [partnerData, setPartnerData] = useState<Partner | null>(null);

    // All useEffect hooks remain the same...
    useEffect(() => {
        setIsCaptainOrder(true);
        return () => setIsCaptainOrder(false);
    }, [setIsCaptainOrder]);

    useEffect(() => {
        const fetchPartnerData = async () => {
            if (captainData?.partner_id) {
                try {
                    const response = await fetchFromHasura(
                        `query GetPartnerById($partner_id: uuid!) {
                            partners_by_pk(id: $partner_id) {
                                id
                                currency
                                gst_percentage
                                store_name
                            }
                        }`,
                        { partner_id: captainData.partner_id }
                    );
                    if (response.partners_by_pk) {
                        setPartnerData(response.partners_by_pk);
                    }
                } catch (error) {
                    console.error("Error fetching partner data:", error);
                }
            }
        };
        fetchPartnerData();
    }, [captainData?.partner_id]);

    useEffect(() => {
        const initializeData = async () => {
            if (authLoading || !captainData?.partner_id) {
                setIsLoading(true);
                return;
            }
            try {
                await fetchMenu(captainData.partner_id);
            } catch (error) {
                console.error("Error fetching menu:", error);
            } finally {
                setIsLoading(false);
            }
        };
        initializeData();
    }, [captainData?.partner_id, fetchMenu, authLoading]);

    useEffect(() => {
        if (Object.keys(groupedItems).length > 0 && !selectedCategory) {
            setSelectedCategory(Object.keys(groupedItems)[0]);
        }
    }, [groupedItems, selectedCategory]);

    useEffect(() => {
        if (!groupedItems) return;
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
            setFilteredGroupedItems({
                [selectedCategory]: groupedItems[selectedCategory] || [],
            });
        } else {
            setFilteredGroupedItems(groupedItems);
        }
    }, [searchQuery, groupedItems, selectedCategory]);


    if (authLoading || isLoading || !captainData?.partner_id) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (items.length === 0 && !isLoading) {
        return <div className="p-6">No menu items found for this outlet.</div>;
    }

    const handleCategoryClick = (category: string) => {
        setSelectedCategory(category);
        setSearchQuery("");
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Search Bar */}
            <div className="p-6 border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search menu items...."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedCategory(null);
                        }}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Categories */}
            {!searchQuery && (
                <div className="flex gap-4 flex-wrap px-6">
                    {Object.keys(groupedItems).map((category) => (
                        <Button
                            key={category}
                            variant={selectedCategory === category ? "default" : "outline"}
                            onClick={() => handleCategoryClick(category)}
                            className="rounded-full"
                        >
                            {category}
                        </Button>
                    ))}
                </div>
            )}

            {/* Menu Items */}
            <div className="px-6 pb-[150px] space-y-6 overflow-y-auto">
                {Object.entries(filteredGroupedItems).map(([category, items]) => (
                    <div key={category} className="space-y-4">
                        <h2 className="text-xl font-semibold">{category}</h2>
                        {/* 2. USE THE COMPONENT IN A GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map((item) => (
                                // 3. RENDER PosItemCard, PASSING THE ITEM AND CURRENCY
                                <PosItemCard
                                    key={item.id} 
                                    item={item} 
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CaptainPOS;