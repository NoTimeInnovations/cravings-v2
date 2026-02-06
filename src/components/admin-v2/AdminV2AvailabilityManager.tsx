"use client";

import { useState, useEffect } from "react";
import { useCategoryStore, Category, formatDisplayName } from "@/store/categoryStore_hasura";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import Img from "../Img";

interface AdminV2AvailabilityManagerProps {
    onBack: () => void;
}

export function AdminV2AvailabilityManager({ onBack }: AdminV2AvailabilityManagerProps) {
    const { categories, fetchCategories, updateCategory } = useCategoryStore();
    const { items, fetchMenu, updateItem } = useMenuStore();
    const { userData } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredData, setFilteredData] = useState<{ category: Category; items: MenuItem[] }[]>([]);

    useEffect(() => {
        if (userData?.id) {
            fetchCategories(userData.id);
            fetchMenu();
        }
    }, [userData, fetchCategories, fetchMenu]);

    useEffect(() => {
        if (categories.length > 0 && items.length > 0) {
            const data = categories.map(cat => ({
                category: cat,
                items: items.filter(item => item.category.id === cat.id)
            })).sort((a, b) => (a.category.priority || 0) - (b.category.priority || 0));

            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                const refinedFiltered = data.map(group => {
                    const categoryMatch = group.category.name.toLowerCase().includes(lowerQuery);
                    const matchingItems = group.items.filter(item => item.name.toLowerCase().includes(lowerQuery));

                    if (categoryMatch) {
                        return group;
                    } else if (matchingItems.length > 0) {
                        return { ...group, items: matchingItems };
                    }
                    return null;
                }).filter(Boolean) as { category: Category; items: MenuItem[] }[];

                setFilteredData(refinedFiltered);
            } else {
                setFilteredData(data);
            }
        }
    }, [categories, items, searchQuery]);

    const handleCategoryToggle = async (category: Category) => {
        try {
            const newStatus = !category.is_active;
            await updateCategory({ ...category, is_active: newStatus });
            toast.success(`Category ${newStatus ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Failed to update category:", error);
            toast.error("Failed to update category");
        }
    };

    const handleItemToggle = async (item: MenuItem) => {
        try {
            await updateItem(item.id!, { is_available: !item.is_available });
            toast.success(`Item ${!item.is_available ? 'available' : 'unavailable'}`);
        } catch (error) {
            console.error("Failed to update item:", error);
            toast.error("Failed to update item");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold">Manage Availability</h2>
                        <p className="text-muted-foreground">Toggle availability for categories and items</p>
                    </div>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                {filteredData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No items found.
                    </div>
                ) : (
                    <Accordion type="multiple" className="space-y-4">
                        {filteredData.map(({ category, items }) => (
                            <AccordionItem key={category.id} value={category.id} className="border rounded-lg bg-card px-4">
                                <AccordionTrigger
                                    className="hover:no-underline py-4"
                                    extraAction={
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground hidden sm:inline font-normal">
                                                {category.is_active ? "Active" : "Inactive"}
                                            </span>
                                            <Switch
                                                checked={category.is_active}
                                                onCheckedChange={() => handleCategoryToggle(category)}
                                            />
                                        </div>
                                    }
                                >
                                    <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                                        <h3 className="text-base sm:text-lg font-semibold capitalize truncate max-w-[120px] sm:max-w-none">{formatDisplayName(category.name)}</h3>
                                        <span className="text-xs sm:text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                                            {items.length} items
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 pt-2 pb-4">
                                        {items.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                                        {item.image_url ? (
                                                            <Img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">No Img</div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate text-sm sm:text-base max-w-[120px] sm:max-w-none">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {item.is_veg ? "Veg" : item.is_veg === false ? "Non-Veg" : "Other"} • ₹{item.price}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={item.is_available}
                                                    onCheckedChange={() => handleItemToggle(item)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </div>
    );
}
