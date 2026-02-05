"use client";

import { useState, useEffect } from "react";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { useAuthStore, Partner } from "@/store/authStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Search, Edit, Plus, ChevronRight, ArrowUpDown, Power, Check, X, Trash2, ImagePlus, Loader2 } from "lucide-react";
import Img from "../Img";
import { formatPrice } from "@/lib/constants";
import { AdminV2EditMenuItem } from "./AdminV2EditMenuItem";
import { AdminV2AddMenuItem } from "./AdminV2AddMenuItem";
import { AdminV2PriorityChanger } from "./AdminV2PriorityChanger";
import { AdminV2AvailabilityManager } from "./AdminV2AvailabilityManager";
import { toast } from "sonner";
import { formatDisplayName, useCategoryStore } from "@/store/categoryStore_hasura";
import axios from "axios";

// Free plan IDs that should not see the "Get all images" button
const FREE_PLAN_IDS = ["int_free", "in_trial"];

// LocalStorage key to track if user has used the "Get all images" feature
const AUTO_IMAGES_USED_KEY = "auto_images_used";

export function AdminV2Menu() {
    const {
        items: menu,
        fetchMenu,
        updateItem,
        groupedItems,
        deleteCategoryAndItems,
    } = useMenuStore();
    const { userData } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [lastEditedItemId, setLastEditedItemId] = useState<string | null>(null);
    const [isPriorityMode, setIsPriorityMode] = useState(false);
    const [isAvailabilityMode, setIsAvailabilityMode] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [filteredGroupedItems, setFilteredGroupedItems] = useState<Record<string, MenuItem[]>>({});
    const { updateCategory } = useCategoryStore();
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null);
    const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);

    // State for "Get all images" feature
    const [isFetchingImages, setIsFetchingImages] = useState(false);
    const [imagesFetchedCount, setImagesFetchedCount] = useState(0);
    const [totalItemsToFetch, setTotalItemsToFetch] = useState(0);
    const [hasUsedAutoImages, setHasUsedAutoImages] = useState(false);
    const [isGoogleLinked, setIsGoogleLinked] = useState(false);

    // Check if user has a non-free plan
    const partner = userData as Partner;
    const planId = partner?.subscription_details?.plan?.id;
    const isFreePlan = !planId || FREE_PLAN_IDS.includes(planId);
    const canUseAutoImages = !isFreePlan && !hasUsedAutoImages;

    // Check Google Link Status
    useEffect(() => {
        if (userData?.id) {
            fetch(`/api/google-business/locations?partnerId=${userData.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.linkedLocationId) {
                        setIsGoogleLinked(true);
                    }
                })
                .catch(err => console.error("Failed to check Google status", err));
        }
    }, [userData?.id]);

    // Check localStorage on mount for whether auto images feature was used
    useEffect(() => {
        if (userData?.id) {
            const usedKey = `${AUTO_IMAGES_USED_KEY}_${userData.id}`;
            const hasUsed = localStorage.getItem(usedKey) === "true";
            setHasUsedAutoImages(hasUsed);
        }
    }, [userData?.id]);

    useEffect(() => {
        if (userData?.id) {
            fetchMenu();
        }
    }, [userData, fetchMenu]);

    useEffect(() => {
        if (!groupedItems) return;

        const filtered: Record<string, MenuItem[]> = {};
        Object.entries(groupedItems).forEach(([category, items]) => {
            const filteredCategoryItems = items.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredCategoryItems.length > 0) {
                filtered[category] = filteredCategoryItems;
            }
        });
        setFilteredGroupedItems(filtered);
    }, [groupedItems, searchQuery]);

    useEffect(() => {
        if (lastEditedItemId) {
            // Find the category of the edited item
            const categoryToOpen = Object.entries(filteredGroupedItems).find(([_, items]) =>
                items.some(item => item.id === lastEditedItemId)
            )?.[0];

            if (categoryToOpen && !activeAccordionItems.includes(categoryToOpen)) {
                setActiveAccordionItems(prev => [...prev, categoryToOpen]);
            }

            // Give a small timeout to ensure the DOM is updated and the accordion is expanded
            const timer = setTimeout(() => {
                const element = document.getElementById(`menu-item-${lastEditedItemId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the item briefly for better visibility
                    element.classList.add('bg-muted');
                    setTimeout(() => element.classList.remove('bg-muted'), 2000);
                    setLastEditedItemId(null);
                }
            }, 300); // 300ms delay to allow for re-rendering and expansion
            return () => clearTimeout(timer);
        }
    }, [lastEditedItemId, filteredGroupedItems, activeAccordionItems]);

    const handleAvailabilityToggle = async (item: MenuItem) => {
        try {
            await updateItem(item.id!, { is_available: !item.is_available });
            toast.success(`Item marked as ${!item.is_available ? "available" : "unavailable"}`);
        } catch (error) {
            console.error("Failed to update availability:", error);
            toast.error("Failed to update availability");
        }
    };

    // Handler for "Get all images" button
    const handleGetAllImages = async () => {
        // Find all items without images
        const itemsWithoutImages = menu.filter(item => !item.image_url);

        if (itemsWithoutImages.length === 0) {
            toast.info("All items already have images!");
            return;
        }

        setIsFetchingImages(true);
        setTotalItemsToFetch(itemsWithoutImages.length);
        setImagesFetchedCount(0);

        let successCount = 0;

        for (const item of itemsWithoutImages) {
            try {
                const searchTerm = item.name?.includes(item.category.name)
                    ? item.name
                    : item.name + " " + item.category.name;

                const response = await axios.post(
                    "https://images.cravings.live/api/images/search-google",
                    { itemName: searchTerm },
                    { headers: { "Content-Type": "application/json" } }
                );

                const imageUrl = response.data?.data?.imageUrl;

                if (imageUrl) {
                    await updateItem(item.id!, { image_url: imageUrl });
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to fetch image for ${item.name}:`, error);
            }

            setImagesFetchedCount(prev => prev + 1);
        }

        // Mark feature as used in localStorage
        if (userData?.id) {
            const usedKey = `${AUTO_IMAGES_USED_KEY}_${userData.id}`;
            localStorage.setItem(usedKey, "true");
            setHasUsedAutoImages(true);
        }

        setIsFetchingImages(false);
        toast.success(`Successfully added images to ${successCount} items!`);
    };

    const handleSaveCategory = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!editingCategory) return;

        try {
            // Find an item in this category to get the current priority and is_active status
            const categoryItems = Object.values(groupedItems).find(items =>
                items[0]?.category.id === editingCategory.id
            );

            if (!categoryItems || categoryItems.length === 0) return;

            const currentCategory = categoryItems[0].category;

            await updateCategory({
                id: editingCategory.id,
                name: editingCategory.name,
                priority: currentCategory.priority,
                is_active: currentCategory.is_active
            });

            toast.success("Category updated");
            setEditingCategory(null);
            // Refresh menu to reflect changes if needed, though updateCategory handles local update
        } catch (error) {
            console.error(error);
            toast.error("Failed to update category");
        }
    };

    if (isPriorityMode) {
        return <AdminV2PriorityChanger onBack={() => setIsPriorityMode(false)} />;
    }

    if (isAvailabilityMode) {
        return <AdminV2AvailabilityManager onBack={() => setIsAvailabilityMode(false)} />;
    }

    if (isAddingItem) {
        return <AdminV2AddMenuItem onBack={() => setIsAddingItem(false)} />;
    }

    if (editingItemId) {
        const itemToEdit = menu.find((item) => item.id === editingItemId);
        if (itemToEdit) {
            return (
                <AdminV2EditMenuItem
                    item={itemToEdit}
                    onBack={(savedItemId) => {
                        setEditingItemId(null);
                        if (savedItemId) {
                            setLastEditedItemId(savedItemId);
                        }
                    }}
                />
            );
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Menu Management</h1>
                <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search items..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
                        <Button variant="outline" onClick={() => setIsAvailabilityMode(true)} className="w-full sm:w-auto px-2 sm:px-4">
                            <Power className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Manage Availability</span>
                            <span className="inline sm:hidden">Availability</span>
                        </Button>
                        <Button variant="outline" onClick={() => setIsPriorityMode(true)} className="w-full sm:w-auto px-2 sm:px-4">
                            <ArrowUpDown className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Change Priority</span>
                            <span className="inline sm:hidden">Priority</span>
                        </Button>
                        <Button onClick={() => setIsAddingItem(true)} className="col-span-2 sm:col-span-1 w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                        </Button>
                        {isGoogleLinked && (
                        <Button 
                            onClick={async () => {
                                const lastSync = localStorage.getItem(`google_sync_${userData?.id}`);
                                const today = new Date().toDateString();
                                if (lastSync === today) {
                                    toast.info("You can only sync to Google once per day.");
                                    return;
                                }
                                
                                if (!confirm("Sync menu to Google? This can be done once per day.")) return;

                                const toastId = toast.loading("Syncing to Google...");
                                try {
                                    const res = await fetch('/api/google-business/menu/push', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ partnerId: userData?.id, locationId: 'auto' })
                                    });
                                    const data = await res.json();
                                    
                                    if (data.success) {
                                        localStorage.setItem(`google_sync_${userData?.id}`, today);
                                        toast.success("Menu synced to Google successfully!");
                                    } else {
                                        toast.error("Sync failed: " + data.error);
                                    }
                                } catch (e) {
                                    toast.error("Sync failed");
                                } finally {
                                    toast.dismiss(toastId);
                                }
                            }} 
                            className="col-span-2 sm:col-span-1 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <img src="https://www.gstatic.com/images/branding/product/1x/google_my_business_48dp.png" alt="GMB" className="w-4 h-4 mr-2" />
                            Sync to Google
                        </Button>
                        )}
                        {canUseAutoImages && (
                            <Button
                                variant="outline"
                                onClick={handleGetAllImages}
                                disabled={isFetchingImages}
                                className="col-span-2 sm:col-span-1 w-full sm:w-auto"
                            >
                                {isFetchingImages ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {imagesFetchedCount}/{totalItemsToFetch}
                                    </>
                                ) : (
                                    <>
                                        <ImagePlus className="h-4 w-4 mr-2" />
                                        Get all images
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {Object.keys(filteredGroupedItems).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No menu items found.
                    </div>
                ) : (
                    <Accordion
                        type="multiple"
                        className="space-y-4"
                        value={activeAccordionItems}
                        onValueChange={setActiveAccordionItems}
                    >
                        {Object.entries(filteredGroupedItems).map(([category, items]) => (
                            <AccordionItem
                                key={category}
                                value={category}
                                className="border rounded-lg bg-card px-4"
                            >
                                <AccordionTrigger className="hover:no-underline py-4 group">
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        {editingCategory?.id === items[0].category.id ? (
                                            <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                                <Input
                                                    value={editingCategory.name}
                                                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                    className="h-8 w-full max-w-[200px]"
                                                    autoFocus
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                    onClick={handleSaveCategory}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingCategory(null);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-base sm:text-xl font-semibold capitalize truncate">
                                                        <span className="sm:hidden">
                                                            {formatDisplayName(category).length > 10
                                                                ? `${formatDisplayName(category).slice(0, 10)}...`
                                                                : formatDisplayName(category)}
                                                        </span>
                                                        <span className="hidden sm:inline">
                                                            {formatDisplayName(category)}
                                                        </span>
                                                    </h2>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingCategory({
                                                                id: items[0].category.id,
                                                                name: formatDisplayName(category)
                                                            });
                                                        }}
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm("Are you sure you want to delete this category and all its items?")) {
                                                                deleteCategoryAndItems(items[0].category.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto sm:ml-0">
                                                    {items.length} items
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4">
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-[80px]">Image</TableHead>
                                                    <TableHead className="w-[200px]">Name</TableHead>
                                                    <TableHead className="w-[120px]">Price</TableHead>
                                                    <TableHead className="hidden md:table-cell">Description</TableHead>
                                                    <TableHead className="w-[80px] text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.map((item) => (
                                                    <TableRow key={item.id} id={`menu-item-${item.id}`}>
                                                        <TableCell>
                                                            <div className="h-12 w-12 rounded-md overflow-hidden bg-muted">
                                                                {item.image_url ? (
                                                                    <Img
                                                                        src={item.image_url}
                                                                        alt={item.name}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                                                                        No Img
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div>{item.name}</div>
                                                            {item.variants && item.variants.length > 0 && (
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    {item.variants.length} variants
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">
                                                                {(userData as Partner)?.currency || "₹"}
                                                                {item.variants && item.variants.length > 0 ? (
                                                                    <span>
                                                                        {formatPrice(Math.min(...item.variants.map(v => v.price)), userData?.id)}
                                                                        <span className="text-xs font-normal text-muted-foreground ml-1">onwards</span>
                                                                    </span>
                                                                ) : (
                                                                    formatPrice(item.price, userData?.id)
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden md:table-cell max-w-[300px]">
                                                            <p className="truncate text-sm text-muted-foreground" title={item.description}>
                                                                {item.description || "-"}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setEditingItemId(item.id!)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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
