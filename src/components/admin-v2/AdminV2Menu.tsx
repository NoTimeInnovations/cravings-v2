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
import { Search, Edit, Plus, ChevronRight, ArrowUpDown, Power } from "lucide-react";
import Img from "../Img";
import { formatPrice } from "@/lib/constants";
import { AdminV2EditMenuItem } from "./AdminV2EditMenuItem";
import { AdminV2AddMenuItem } from "./AdminV2AddMenuItem";
import { AdminV2PriorityChanger } from "./AdminV2PriorityChanger";
import { AdminV2AvailabilityManager } from "./AdminV2AvailabilityManager";
import { toast } from "sonner";
import { formatDisplayName } from "@/store/categoryStore_hasura";

export function AdminV2Menu() {
    const {
        items: menu,
        fetchMenu,
        updateItem,
        groupedItems,
        groupItems,
    } = useMenuStore();
    const { userData } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [isPriorityMode, setIsPriorityMode] = useState(false);
    const [isAvailabilityMode, setIsAvailabilityMode] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [filteredGroupedItems, setFilteredGroupedItems] = useState<Record<string, MenuItem[]>>({});

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

    const handleAvailabilityToggle = async (item: MenuItem) => {
        try {
            await updateItem(item.id!, { is_available: !item.is_available });
            toast.success(`Item marked as ${!item.is_available ? "available" : "unavailable"}`);
        } catch (error) {
            console.error("Failed to update availability:", error);
            toast.error("Failed to update availability");
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
                    onBack={() => setEditingItemId(null)}
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
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {Object.keys(filteredGroupedItems).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No menu items found.
                    </div>
                ) : (
                    <Accordion type="multiple" className="space-y-4">
                        {Object.entries(filteredGroupedItems).map(([category, items]) => (
                            <AccordionItem
                                key={category}
                                value={category}
                                className="border rounded-lg bg-card px-4"
                            >
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3 overflow-hidden">
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
                                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                            {items.length} items
                                        </span>
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
                                                    <TableRow key={item.id}>
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
