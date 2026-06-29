"use client";

import { useState, useEffect } from "react";
import { useCategoryStore, Category, formatDisplayName } from "@/store/categoryStore_hasura";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Search, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, Partner } from "@/store/authStore";
import { isFreePlan } from "@/lib/getPlanLimits";
import { UpgradePlanDialog } from "./UpgradePlanDialog";
import { FreePlanBanner } from "./FreePlanBanner";
import Img from "../Img";
import { VisibilityEditor } from "./availability/VisibilityEditor";
import { resolveVisibility, formatSchedule, VisibilityConfig, normalizeVisibility } from "@/lib/visibility";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";

interface AdminV2AvailabilityManagerProps {
    onBack: () => void;
}

type ReactivateChoice = "nextday" | "2h" | "4h" | "6h" | "never";

const REACTIVATE_OPTIONS: { value: ReactivateChoice; label: string }[] = [
    { value: "nextday", label: "Next day" },
    { value: "2h", label: "In 2 hours" },
    { value: "4h", label: "In 4 hours" },
    { value: "6h", label: "In 6 hours" },
    { value: "never", label: "Never — keep off until I turn it on" },
];

const NEXT_DAY_TIME_KEY = "scheduledAvailability.nextDayTime";

const parseStorefrontSettings = (sf: unknown): Record<string, any> => {
    if (!sf) return {};
    if (typeof sf === "string") {
        try { return JSON.parse(sf); } catch { return {}; }
    }
    return sf as Record<string, any>;
};

// Resolve a reactivation choice to an absolute ISO timestamp (null = never).
const computeReactivateAt = (choice: ReactivateChoice, nextDayTime: string): string | null => {
    if (choice === "never") return null;
    if (choice === "nextday") {
        const [h, m] = nextDayTime.split(":").map(Number);
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
        return d.toISOString();
    }
    const hrs = choice === "2h" ? 2 : choice === "4h" ? 4 : 6;
    return new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString();
};

const formatReactivateLabel = (iso: string | null): string => {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
    } catch { return ""; }
};

export function AdminV2AvailabilityManager({ onBack }: AdminV2AvailabilityManagerProps) {
    const { categories, fetchCategories, updateCategory } = useCategoryStore();
    const { items, fetchMenu, updateItem, bulkSetAvailability } = useMenuStore();
    const { userData, setState } = useAuthStore();
    const partner = userData as Partner | undefined;
    const timezone = (partner as any)?.timezone || "Asia/Kolkata";
    const planId = partner?.subscription_details?.plan?.id;
    const isOnFreePlan = isFreePlan(planId);
    const [searchQuery, setSearchQuery] = useState("");
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [filteredData, setFilteredData] = useState<{ category: Category; items: MenuItem[] }[]>([]);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [hideUnavailable, setHideUnavailable] = useState<boolean>(false);
    const [savingHideUnavailable, setSavingHideUnavailable] = useState(false);
    // Scheduled availability (partner setting): when on, turning an item OFF asks
    // when it should auto-turn back on. The default next-day time is per-device (localStorage).
    const [scheduledAvailability, setScheduledAvailability] = useState<boolean>(false);
    const [savingScheduled, setSavingScheduled] = useState(false);
    const [pendingOffItem, setPendingOffItem] = useState<MenuItem | null>(null);
    const [reactivateChoice, setReactivateChoice] = useState<ReactivateChoice>("nextday");
    const [nextDayTime, setNextDayTime] = useState<string>("09:00");

    useEffect(() => {
        setScheduledAvailability(!!parseStorefrontSettings(partner?.storefront_settings)?.scheduledAvailability);
    }, [partner?.storefront_settings]);

    useEffect(() => {
        try {
            const t = localStorage.getItem(NEXT_DAY_TIME_KEY);
            if (t) setNextDayTime(t);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (userData?.id) {
            fetchCategories(userData.id);
            fetchMenu();
        }
    }, [userData, fetchCategories, fetchMenu]);

    useEffect(() => {
        setHideUnavailable(!!partner?.hide_unavailable);
    }, [partner?.hide_unavailable]);

    useEffect(() => {
        if (categories.length > 0 && items.length > 0) {
            const data = categories.map(cat => ({
                category: cat,
                items: items
                    .filter(item => item.category.id === cat.id)
                    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
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
        // Turning OFF with scheduled availability on → ask when it should turn back on.
        if (item.is_available && scheduledAvailability) {
            setReactivateChoice("nextday");
            setPendingOffItem(item);
            return;
        }
        try {
            // Turning ON also clears any pending auto-reactivation.
            const patch: Partial<MenuItem> = item.is_available
                ? { is_available: false }
                : { is_available: true, reactivate_at: null };
            await updateItem(item.id!, patch);
            toast.success(`Item ${!item.is_available ? 'available' : 'unavailable'}`);
        } catch (error) {
            console.error("Failed to update item:", error);
            toast.error("Failed to update item");
        }
    };

    // Confirm turning an item OFF with a chosen auto-reactivation time.
    const confirmTurnOff = async () => {
        const item = pendingOffItem;
        if (!item) return;
        const reactivate_at = computeReactivateAt(reactivateChoice, nextDayTime);
        if (reactivateChoice === "nextday") {
            try { localStorage.setItem(NEXT_DAY_TIME_KEY, nextDayTime); } catch { /* ignore */ }
        }
        setPendingOffItem(null);
        try {
            await updateItem(item.id!, { is_available: false, reactivate_at });
            const when = formatReactivateLabel(reactivate_at);
            toast.success(when ? `"${item.name}" turned off — back on ${when}` : `"${item.name}" turned off`);
        } catch (error) {
            console.error("Failed to update item:", error);
            toast.error("Failed to update item");
        }
    };

    const handleScheduledAvailabilityChange = async (checked: boolean) => {
        if (!userData?.id) return;
        const prev = scheduledAvailability;
        setScheduledAvailability(checked);
        setSavingScheduled(true);
        try {
            const merged = { ...parseStorefrontSettings(partner?.storefront_settings), scheduledAvailability: checked };
            await updatePartner(userData.id, { storefront_settings: merged });
            revalidateTag(userData.id);
            setState({ storefront_settings: merged } as any);
            toast.success(`Scheduled availability ${checked ? "enabled" : "disabled"}`);
        } catch (error) {
            setScheduledAvailability(prev);
            toast.error("Failed to update setting");
            console.error("Error updating scheduled availability:", error);
        } finally {
            setSavingScheduled(false);
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

    const handleHideUnavailableChange = async (checked: boolean) => {
        if (!userData?.id) return;
        const prev = hideUnavailable;
        setHideUnavailable(checked);
        setSavingHideUnavailable(true);
        toast.loading(`Setting unavailable items to ${checked ? "hidden" : "shown"}...`);
        try {
            await updatePartner(userData.id, { hide_unavailable: checked });
            revalidateTag(userData.id);
            setState({ hide_unavailable: checked });
            toast.dismiss();
            toast.success(`Unavailable items are now ${checked ? "hidden from" : "shown on"} your menu`);
        } catch (error) {
            setHideUnavailable(prev);
            toast.dismiss();
            toast.error("Failed to update setting");
            console.error("Error updating hide_unavailable:", error);
        } finally {
            setSavingHideUnavailable(false);
        }
    };

    // ----- bulk selection -----
    const allItemIdSet = new Set(items.map((i) => i.id).filter(Boolean) as string[]);
    const validSelectedIds = Array.from(selectedIds).filter((id) => allItemIdSet.has(id));
    const selectedCount = validSelectedIds.length;
    const visibleIds = filteredData
        .flatMap((g) => g.items)
        .map((i) => i.id)
        .filter(Boolean) as string[];
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    const toggleItemSelection = (id?: string) => {
        if (!id) return;
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const setManySelected = (ids: string[], selected: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => (selected ? next.add(id) : next.delete(id)));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleBulkSetAvailability = async (makeAvailable: boolean) => {
        if (validSelectedIds.length === 0) return;
        // On the free plan, turning items OFF is a premium action (mirrors single toggle).
        if (isOnFreePlan && !makeAvailable) {
            setShowUpgradeDialog(true);
            return;
        }
        try {
            await bulkSetAvailability(validSelectedIds, makeAvailable);
            clearSelection();
        } catch {
            // store surfaces the error toast; keep selection so the user can retry
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

            <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
                <div className="space-y-0.5">
                    <p className="font-semibold">Hide unavailable items</p>
                    <p className="text-sm text-muted-foreground">
                        When on, items that are unavailable, out of stock, or off-schedule are removed from your live menu. When off, they stay on the menu shown as &ldquo;Unavailable&rdquo;. Applies to all items.
                    </p>
                </div>
                <Switch
                    checked={hideUnavailable}
                    disabled={savingHideUnavailable}
                    onCheckedChange={handleHideUnavailableChange}
                    className="flex-shrink-0"
                />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
                <div className="space-y-0.5">
                    <p className="font-semibold">Scheduled availability</p>
                    <p className="text-sm text-muted-foreground">
                        When on, turning an item off asks when it should automatically turn back on (next day, in a few hours, or never). Off by default.
                    </p>
                </div>
                <Switch
                    checked={scheduledAvailability}
                    disabled={savingScheduled}
                    onCheckedChange={handleScheduledAvailabilityChange}
                    className="flex-shrink-0"
                />
            </div>

            {filteredData.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={() => setManySelected(visibleIds, !allVisibleSelected)}
                        />
                        <span className="text-muted-foreground">
                            {allVisibleSelected ? "Deselect all" : "Select all"}
                            {searchQuery ? " (filtered)" : ""}
                        </span>
                    </label>
                    {selectedCount > 0 && (
                        <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {filteredData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No items found.
                    </div>
                ) : (
                    <Accordion type="multiple" className="space-y-4">
                        {filteredData.map(({ category, items }) => {
                            const isCatExpanded = expandedCategory === category.id;
                            const catIds = items.map((i) => i.id).filter(Boolean) as string[];
                            const catAllSelected = catIds.length > 0 && catIds.every((id) => selectedIds.has(id));
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
                                                value={category.visibility_config}
                                                onChange={(next) => handleCategoryVisibilityChange(category, next)}
                                            />
                                        )}

                                        {items.length > 0 && (
                                            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none w-fit">
                                                <Checkbox
                                                    checked={catAllSelected}
                                                    onCheckedChange={() => setManySelected(catIds, !catAllSelected)}
                                                />
                                                Select all {items.length} item{items.length > 1 ? "s" : ""} in this category
                                            </label>
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
                                                        <Checkbox
                                                            className="flex-shrink-0"
                                                            checked={item.id ? selectedIds.has(item.id) : false}
                                                            onCheckedChange={() => toggleItemSelection(item.id)}
                                                        />
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

            {selectedCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 rounded-full border bg-background shadow-lg px-3 sm:px-4 py-2 max-w-[calc(100vw-1.5rem)]">
                    <span className="text-sm font-medium px-1 whitespace-nowrap">{selectedCount} selected</span>
                    <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleBulkSetAvailability(true)}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Mark </span>Available
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleBulkSetAvailability(false)}
                    >
                        <Ban className="h-4 w-4" />
                        <span className="hidden sm:inline">Mark </span>Unavailable
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                        Clear
                    </Button>
                </div>
            )}

            <Dialog open={!!pendingOffItem} onOpenChange={(o) => { if (!o) setPendingOffItem(null); }}>
                <DialogContent className="sm:max-w-md flex max-h-[85vh] flex-col gap-0 p-0">
                    <DialogHeader className="px-6 pt-6 pb-3 text-left">
                        <DialogTitle className="pr-8">Turn off &ldquo;{pendingOffItem?.name}&rdquo;</DialogTitle>
                        <DialogDescription>When should it automatically turn back on?</DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-6">
                        <RadioGroup
                            value={reactivateChoice}
                            onValueChange={(v) => setReactivateChoice(v as ReactivateChoice)}
                            className="space-y-2 pb-2"
                        >
                            {REACTIVATE_OPTIONS.map((opt) => (
                                <div key={opt.value}>
                                    <label
                                        htmlFor={`reactivate-${opt.value}`}
                                        className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                    >
                                        <RadioGroupItem value={opt.value} id={`reactivate-${opt.value}`} />
                                        <span className="text-sm font-medium">{opt.label}</span>
                                    </label>
                                    {opt.value === "nextday" && reactivateChoice === "nextday" && (
                                        <div className="mt-2 ml-9 flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">at</span>
                                            <Input
                                                type="time"
                                                value={nextDayTime}
                                                onChange={(e) => setNextDayTime(e.target.value)}
                                                className="w-32"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                    <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-2">
                        <Button variant="outline" onClick={() => setPendingOffItem(null)}>Cancel</Button>
                        <Button onClick={confirmTurnOff}>Turn off</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
