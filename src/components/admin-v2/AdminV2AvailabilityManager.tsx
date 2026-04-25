"use client";

import { useState, useEffect } from "react";
import { useCategoryStore, Category, formatDisplayName } from "@/store/categoryStore_hasura";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Search, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, Partner } from "@/store/authStore";
import { isFreePlan } from "@/lib/getPlanLimits";
import { UpgradePlanDialog } from "./UpgradePlanDialog";
import { FreePlanBanner } from "./FreePlanBanner";
import Img from "../Img";
import { VisibilityEditor } from "./availability/VisibilityEditor";
import { resolveVisibility, formatSchedule, VisibilityConfig, normalizeVisibility } from "@/lib/visibility";

interface AdminV2AvailabilityManagerProps {
    onBack: () => void;
}

export function AdminV2AvailabilityManager({ onBack }: AdminV2AvailabilityManagerProps) {
    const { categories, fetchCategories, updateCategory } = useCategoryStore();
    const { items, fetchMenu, updateItem } = useMenuStore();
    const { userData } = useAuthStore();
    const partner = userData as Partner | undefined;
    const timezone = (partner as any)?.timezone || "Asia/Kolkata";
    const planId = partner?.subscription_details?.plan?.id;
    const isOnFreePlan = isFreePlan(planId);
    const [searchQuery, setSearchQuery] = useState("");
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [filteredData, setFilteredData] = useState<{ category: Category; items: MenuItem[] }[]>([]);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

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
        if (isOnFreePlan && category.is_active) {
            setShowUpgradeDialog(true);
            return;
        }
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
        if (isOnFreePlan && item.is_available) {
            setShowUpgradeDialog(true);
            return;
        }
        try {
            await updateItem(item.id!, { is_available: !item.is_available });
            toast.success(`Item ${!item.is_available ? 'available' : 'unavailable'}`);
        } catch (error) {
            console.error("Failed to update item:", error);
            toast.error("Failed to update item");
        }
    };

    const handleCategoryVisibilityChange = async (category: Category, next: VisibilityConfig) => {
        try {
            await updateCategory({ ...category, visibility_config: next });
            toast.success("Category visibility updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update visibility");
        }
    };

    const handleItemVisibilityChange = async (item: MenuItem, next: VisibilityConfig) => {
        try {
            await updateItem(item.id!, { visibility_config: next });
            toast.success("Item visibility updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update visibility");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <UpgradePlanDialog
                open={showUpgradeDialog}
                onOpenChange={setShowUpgradeDialog}
                featureName="Managing availability"
            />
            {isOnFreePlan && (
                <FreePlanBanner message="Turning off availability is a premium feature." />
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold">Manage Availability</h2>
                        <p className="text-muted-foreground">Toggle availability and visibility for categories and items</p>
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
                        {filteredData.map(({ category, items }) => {
                            const isCatExpanded = expandedCategory === category.id;
                            const catVisibleNow = resolveVisibility(
                                category.visibility_config,
                                { type: "default", hidden: false },
                                timezone
                            ).visible;
                            return (
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
                                        {!catVisibleNow && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 flex-shrink-0">Hidden now</span>
                                        )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-3 pt-2 pb-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                Category schedule: <span className="font-medium text-foreground">{formatSchedule(category.visibility_config)}</span>
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedCategory(isCatExpanded ? null : category.id)}
                                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                            >
                                                {isCatExpanded ? <>Hide <ChevronUp className="h-3 w-3" /></> : <>Edit visibility <ChevronDown className="h-3 w-3" /></>}
                                            </button>
                                        </div>
                                        {isCatExpanded && (
                                            <VisibilityEditor
                                                scope="category"
                                                value={category.visibility_config}
                                                onChange={(next) => handleCategoryVisibilityChange(category, next)}
                                            />
                                        )}

                                        {items.map(item => {
                                            const resolved = resolveVisibility(item.visibility_config, category.visibility_config, timezone);
                                            const isItemExpanded = expandedItem === item.id;
                                            const itemConfig = normalizeVisibility(item.visibility_config);
                                            const itemHasOwnConfig = !(itemConfig.type === "default" && itemConfig.hidden === false);
                                            return (
                                            <div key={item.id} className="border rounded-md bg-background">
                                                <div className="flex items-center justify-between p-3">
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
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedItem(isItemExpanded ? null : (item.id ?? null))}
                                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            {isItemExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                        </button>
                                                        <Switch
                                                            checked={item.is_available}
                                                            onCheckedChange={() => handleItemToggle(item)}
                                                        />
                                                    </div>
                                                </div>
                                                {(isItemExpanded || resolved.conflict) && (
                                                    <div className="px-3 pb-3 space-y-2">
                                                        {resolved.conflict && (
                                                            <div className="flex items-start gap-2 text-xs p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                                                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                                                <span>
                                                                    This item's visibility is overridden by the category schedule. Category wins.
                                                                </span>
                                                            </div>
                                                        )}
                                                        {isItemExpanded && (
                                                            <>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {itemHasOwnConfig ? "Item schedule: " : "No item-level schedule. "}
                                                                    <span className="font-medium text-foreground">{formatSchedule(item.visibility_config)}</span>
                                                                </p>
                                                                <VisibilityEditor
                                                                    value={item.visibility_config}
                                                                    onChange={(next) => handleItemVisibilityChange(item, next)}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );})}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );})}
                    </Accordion>
                )}
            </div>
        </div>
    );
}
