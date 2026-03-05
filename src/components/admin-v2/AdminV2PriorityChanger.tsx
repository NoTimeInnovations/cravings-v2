"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useCategoryStore, Category, formatDisplayName } from "@/store/categoryStore_hasura";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, GripVertical, Save, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, Partner } from "@/store/authStore";
import { isFreePlan } from "@/lib/getPlanLimits";
import { UpgradePlanDialog } from "./UpgradePlanDialog";
import { FreePlanBanner } from "./FreePlanBanner";

interface AdminV2PriorityChangerProps {
    onBack: () => void;
}

export function AdminV2PriorityChanger({ onBack }: AdminV2PriorityChangerProps) {
    const { categories, fetchCategories } = useCategoryStore();
    const { items, fetchMenu, updateItemsAsBatch, updateCategoriesAsBatch } = useMenuStore();
    const { userData } = useAuthStore();
    const planId = (userData as Partner)?.subscription_details?.plan?.id;
    const isOnFreePlan = isFreePlan(planId);

    const [localCategories, setLocalCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [localItems, setLocalItems] = useState<MenuItem[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isManualMode, setIsManualMode] = useState(false);
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

    useEffect(() => {
        if (userData?.id) {
            fetchCategories(userData.id);
            fetchMenu();
        }
    }, [userData, fetchCategories, fetchMenu]);

    useEffect(() => {
        if (categories.length > 0) {
            const sorted = [...categories].sort((a, b) => (a.priority || 0) - (b.priority || 0));
            const withDefaults = sorted.map((cat, index) => ({
                ...cat,
                priority: cat.priority || (index + 1),
            }));
            setLocalCategories(withDefaults);
        }
    }, [categories]);

    useEffect(() => {
        if (selectedCategory && items.length > 0) {
            const categoryItems = items.filter(item => item.category.id === selectedCategory.id);
            const sorted = [...categoryItems].sort((a, b) => (a.priority || 0) - (b.priority || 0));
            const withDefaults = sorted.map((item, index) => ({
                ...item,
                priority: item.priority || (index + 1),
            }));
            setLocalItems(withDefaults);
        }
    }, [selectedCategory, items]);

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        if (isOnFreePlan) {
            setShowUpgradeDialog(true);
            return;
        }

        if (selectedCategory) {
            // Reordering Items
            const newItems = Array.from(localItems);
            const [reorderedItem] = newItems.splice(result.source.index, 1);
            newItems.splice(result.destination.index, 0, reorderedItem);

            // Update priorities based on new index
            const updatedItems = newItems.map((item, index) => ({
                ...item,
                priority: index + 1
            }));

            setLocalItems(updatedItems);
            setHasChanges(true);
        } else {
            // Reordering Categories
            const newCategories = Array.from(localCategories);
            const [reorderedCat] = newCategories.splice(result.source.index, 1);
            newCategories.splice(result.destination.index, 0, reorderedCat);

            // Update priorities based on new index
            const updatedCategories = newCategories.map((cat, index) => ({
                ...cat,
                priority: index + 1
            }));

            setLocalCategories(updatedCategories);
            setHasChanges(true);
        }
    };

    const handlePriorityChange = (id: string, newPriority: string) => {
        if (isOnFreePlan) {
            setShowUpgradeDialog(true);
            return;
        }
        // Allow empty string for typing
        if (newPriority === "") {
            if (selectedCategory) {
                setLocalItems(prev => prev.map(item =>
                    item.id === id ? { ...item, priority: 0 } : item
                ));
            } else {
                setLocalCategories(prev => prev.map(cat =>
                    cat.id === id ? { ...cat, priority: 0 } : cat
                ));
            }
            setHasChanges(true);
            return;
        }

        const priority = parseInt(newPriority);
        if (isNaN(priority)) return;

        if (selectedCategory) {
            setLocalItems(prev => prev.map(item =>
                item.id === id ? { ...item, priority } : item
            ));
        } else {
            setLocalCategories(prev => prev.map(cat =>
                cat.id === id ? { ...cat, priority } : cat
            ));
        }
        setHasChanges(true);
    };

    const handleManualReorder = () => {
        if (selectedCategory) {
            const sortedItems = [...localItems].sort((a, b) => (a.priority || 0) - (b.priority || 0));
            setLocalItems(sortedItems);
        } else {
            const sortedCategories = [...localCategories].sort((a, b) => (a.priority || 0) - (b.priority || 0));
            setLocalCategories(sortedCategories);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (selectedCategory) {
                // Save Items
                const updates = localItems.map(item => ({
                    id: item.id!,
                    priority: item.priority!
                }));
                await updateItemsAsBatch(updates);
            } else {
                // Save Categories
                await updateCategoriesAsBatch(localCategories);
                // Update category store so UI stays in sync
                useCategoryStore.setState({ categories: localCategories });
            }
            setHasChanges(false);
        } catch (error) {
            console.error("Failed to save priorities:", error);
            toast.error("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <UpgradePlanDialog
                open={showUpgradeDialog}
                onOpenChange={setShowUpgradeDialog}
                featureName="Changing priority"
            />
            {isOnFreePlan && (
                <FreePlanBanner message="Changing priority is a premium feature." />
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => {
                        if (hasChanges) {
                            if (!confirm("You have unsaved changes. Discard them?")) return;
                            setHasChanges(false);
                        }
                        if (selectedCategory) {
                            setSelectedCategory(null);
                        } else {
                            onBack();
                        }
                    }}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold">
                            {selectedCategory ? `Reorder Items: ${formatDisplayName(selectedCategory.name)}` : "Reorder Categories"}
                        </h2>
                        <p className="text-muted-foreground">
                            {isManualMode ? "Enter priority numbers manually" : "Drag and drop to change the order"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="mode-toggle"
                            checked={isManualMode}
                            onCheckedChange={setIsManualMode}
                        />
                        <Label htmlFor="mode-toggle">Manual Input</Label>
                    </div>
                    {hasChanges && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                                setHasChanges(false);
                                // Reset from store
                                if (selectedCategory) {
                                    const categoryItems = items.filter(item => item.category.id === selectedCategory.id);
                                    const sorted = [...categoryItems].sort((a, b) => (a.priority || 0) - (b.priority || 0));
                                    setLocalItems(sorted.map((item, index) => ({ ...item, priority: item.priority || (index + 1) })));
                                } else {
                                    const sorted = [...categories].sort((a, b) => (a.priority || 0) - (b.priority || 0));
                                    setLocalCategories(sorted.map((cat, index) => ({ ...cat, priority: cat.priority || (index + 1) })));
                                }
                            }}>
                                Discard
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                <Save className="h-4 w-4 mr-2" />
                                {isSaving ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {isManualMode ? (
                <div className="space-y-2">
                    {selectedCategory ? (
                        // Manual Items List
                        localItems.map((item) => (
                            <Card key={item.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate text-sm sm:text-base">{item.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`priority-${item.id}`} className="whitespace-nowrap text-xs sm:text-sm">Priority:</Label>
                                        <Input
                                            id={`priority-${item.id}`}
                                            type="number"
                                            value={item.priority ?? ""}
                                            onChange={(e) => handlePriorityChange(item.id!, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    handleManualReorder();
                                                }
                                            }}
                                            onBlur={() => handleManualReorder()}
                                            className="w-16 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        // Manual Categories List
                        localCategories.map((category) => (
                            <Card key={category.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                        <div className="min-w-0">
                                            <p className="font-medium capitalize truncate text-sm sm:text-base">{formatDisplayName(category.name)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor={`priority-${category.id}`} className="whitespace-nowrap text-xs sm:text-sm">Priority:</Label>
                                            <Input
                                                id={`priority-${category.id}`}
                                                type="number"
                                                value={category.priority ?? ""}
                                                onChange={(e) => handlePriorityChange(category.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handleManualReorder();
                                                    }
                                                }}
                                                onBlur={() => handleManualReorder()}
                                                className="w-16 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={hasChanges}
                                            onClick={() => setSelectedCategory(category)}
                                            className="px-2 sm:px-3"
                                        >
                                            <span className="hidden sm:inline">Reorder Items</span>
                                            <span className="sm:hidden">Items</span>
                                            <ArrowRight className="h-4 w-4 ml-1 sm:ml-2" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="list">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2"
                            >
                                {selectedCategory ? (
                                    // Items List
                                    localItems.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id!} index={index}>
                                            {(provided, snapshot) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`transition-shadow ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary" : "hover:shadow-md"}`}
                                                >
                                                    <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
                                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                                            <GripVertical className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate text-sm sm:text-base">{item.name}</p>
                                                            <p className="text-xs sm:text-sm text-muted-foreground">Current Priority: {item.priority}</p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Draggable>
                                    ))
                                ) : (
                                    // Categories List
                                    localCategories.map((category, index) => (
                                        <Draggable key={category.id} draggableId={category.id} index={index}>
                                            {(provided, snapshot) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`transition-shadow ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary" : "hover:shadow-md"}`}
                                                >
                                                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                                                <GripVertical className="h-5 w-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium capitalize truncate text-sm sm:text-base">{formatDisplayName(category.name)}</p>
                                                                <p className="text-xs sm:text-sm text-muted-foreground">Priority: {category.priority}</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={hasChanges}
                                                            onClick={() => setSelectedCategory(category)}
                                                            className="px-2 sm:px-3"
                                                        >
                                                            <span className="hidden sm:inline">Reorder Items</span>
                                                            <span className="sm:hidden">Items</span>
                                                            <ArrowRight className="h-4 w-4 ml-1 sm:ml-2" />
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Draggable>
                                    ))
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            {!selectedCategory && localCategories.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No categories found.
                </div>
            )}
            {selectedCategory && localItems.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No items found in this category.
                </div>
            )}
        </div>
    );
}
