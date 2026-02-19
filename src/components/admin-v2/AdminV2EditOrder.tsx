"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Minus, X, ArrowLeft, Save } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
    getOrderByIdQuery,
    updateOrderMutation,
    updateOrderItemsMutation,

} from "@/api/orders";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useMenuStore } from "@/store/menuStore_hasura";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Partner, useAuthStore } from "@/store/authStore";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getQrGroupForTable } from "@/lib/getQrGroupForTable";
import useOrderStore, { Order } from "@/store/orderStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export interface MenuItem {
    id?: string;
    name: string;
    category: MenuItemCategory & {
        is_active: boolean;
    };
    category_id?: string;
    image_url: string;
    image_source?: string;
    partner_id?: string;
    price: number;
    description: string;
    is_top?: boolean;
    is_available?: boolean;
    priority?: number;
    stocks?: {
        stock_quantity: number;
        stock_type: string;
        show_stock: boolean;
        id?: string;
    }[];
    variants?: {
        name: string;
        price: number;
    }[];
    is_price_as_per_size?: boolean;
}

interface MenuItemCategory {
    id?: string;
    name: string;
    priority: number;
}

interface ExtraCharge {
    id?: string;
    name: string;
    amount: number;
}

interface AdminV2EditOrderProps {
    order: Order;
    onBack: () => void;
}

export const AdminV2EditOrder = ({ order, onBack }: AdminV2EditOrderProps) => {
    const { fetchMenu, items: menuItems } = useMenuStore();
    const { updateOrderStatus, setPartnerOrders: setOrders, partnerOrders: orders } = useOrderStore(); // Access store actions
    const { userData } = useAuthStore();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [items, setItems] = useState<
        Array<{
            id?: string;
            menu_id: string;
            quantity: number;
            menu: {
                name: string;
                price: number;
            };
        }>
    >([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [tableNumber, setTableNumber] = useState<number | null>(null);
    const [phone, setPhone] = useState<string | null>(null);
    const [newItemId, setNewItemId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showExtraItems, setShowExtraItems] = useState(false);
    const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
    const [newExtraCharge, setNewExtraCharge] = useState<ExtraCharge>({
        name: "",
        amount: 0,
    });
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [qrGroup, setQrGroup] = useState<any>(null);
    const [orderNote, setOrderNote] = useState<string>("");
    const [status, setStatus] = useState<string>(order?.status || "pending");

    const currency = (userData as Partner)?.currency || "$";
    const gstPercentage = (userData as Partner)?.gst_percentage || 0;

    useEffect(() => {
        if (order?.id) {
            fetchOrderDetails();
        }
    }, [order?.id]);

    useEffect(() => {
        if (order?.partnerId) {
            fetchMenu(order.partnerId);
        }
    }, [order?.partnerId]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await fetchFromHasura(getOrderByIdQuery, {
                orderId: order?.id,
            });

            const orderData = response.orders_by_pk;
            if (orderData) {
                setItems(
                    orderData.order_items.map((item: any) => ({
                        id: item.id,
                        menu_id: item.menu.id,
                        quantity: item.quantity,
                        menu: {
                            name: item.item.name || item.menu.name,
                            price: item.item.price || item.menu.price || 0,
                        },
                    }))
                );
                setTotalPrice(orderData.total_price);
                setTableNumber(orderData.table_number);
                setPhone(orderData.phone);

                if (orderData.extra_charges) {
                    setExtraCharges(orderData.extra_charges);
                }

                if (orderData.discounts) {
                    setDiscounts(orderData.discounts);
                }

                if (orderData.notes) {
                    setOrderNote(orderData.notes);
                }
                if (orderData.status) {
                    setStatus(orderData.status);
                }
            }
        } catch (error) {
            console.error("Error fetching order details:", error);
            toast.error("Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (
        currentItems: Array<{
            quantity: number;
            menu: {
                price: number;
            };
        }>,
        currentExtraCharges: ExtraCharge[]
    ) => {
        const foodSubtotal = currentItems.reduce(
            (sum, item) => sum + item.menu.price * item.quantity,
            0
        );
        const extraChargesTotal = currentExtraCharges.reduce(
            (sum, charge) => sum + charge.amount,
            0
        );

        const qrGroupCharges = qrGroup?.extra_charge
            ? getExtraCharge(
                currentItems as any[],
                qrGroup.extra_charge,
                qrGroup.charge_type || "FLAT_FEE"
            )
            : 0;

        const taxableAmount = foodSubtotal + extraChargesTotal + qrGroupCharges;

        const discountAmount = discounts.reduce((total, discount) => {
            if (discount.type === "flat") {
                return total + discount.value;
            } else {
                return total + (taxableAmount * discount.value) / 100;
            }
        }, 0);

        const discountedTaxableAmount = Math.max(0, taxableAmount - discountAmount);

        const gstAmount = gstPercentage > 0 ? (discountedTaxableAmount * gstPercentage) / 100 : 0;

        return discountedTaxableAmount + gstAmount;
    };

    useEffect(() => {
        const newTotal = calculateTotal(items, extraCharges);
        setTotalPrice(newTotal);
    }, [items, extraCharges, qrGroup, gstPercentage, discounts]);

    const fetchQrGroupForTable = async (tableNum: number | null) => {
        if (tableNum === null) {
            setQrGroup(null);
            return;
        }

        try {
            const partnerId = (userData as Partner)?.id;
            if (!partnerId) return;

            const qrGroupData = await getQrGroupForTable(partnerId, tableNum);
            setQrGroup(qrGroupData);
        } catch (error) {
            console.error("Error fetching QR group for table:", error);
        }
    };

    const handleTableNumberChange = (newTableNumber: number | null) => {
        setTableNumber(newTableNumber);
        fetchQrGroupForTable(newTableNumber);
    };

    const handleQuantityChange = (index: number, newQuantity: number) => {
        if (newQuantity < 1) return;
        const updatedItems = [...items];
        updatedItems[index].quantity = newQuantity;
        setItems(updatedItems);
    };

    const handleRemoveItem = (index: number) => {
        const updatedItems = [...items];
        updatedItems.splice(index, 1);
        setItems(updatedItems);
    };

    const handleAddItem = () => {
        if (!newItemId) return;

        const [baseId, variantName] = newItemId.split("|");
        const menuItem = menuItems.find((item) => item.id === baseId);
        if (!menuItem) return;

        let itemToAdd: {
            menu_id: string;
            quantity: number;
            menu: { name: string; price: number };
        };

        if (variantName) {
            const variant = menuItem.variants?.find((v) => v.name === variantName);
            if (!variant) return;
            itemToAdd = {
                menu_id: baseId,
                quantity: 1,
                menu: {
                    name: `${menuItem.name} (${variant.name})`,
                    price: variant.price,
                },
            };
        } else {
            itemToAdd = {
                menu_id: baseId,
                quantity: 1,
                menu: {
                    name: menuItem.name,
                    price: menuItem.price,
                },
            };
        }

        const existingItemIndex = items.findIndex(
            (item) => item.menu.name === itemToAdd.menu.name
        );

        if (existingItemIndex >= 0) {
            handleQuantityChange(
                existingItemIndex,
                items[existingItemIndex].quantity + 1
            );
        } else {
            setItems([...items, itemToAdd]);
        }

        setNewItemId("");
        setSearchQuery("");
    };

    const handleAddExtraCharge = () => {
        if (!newExtraCharge.name || newExtraCharge.amount <= 0) {
            toast.error("Please enter a valid charge name and amount");
            return;
        }
        const charge: ExtraCharge = {
            id: Date.now().toString(),
            name: newExtraCharge.name,
            amount: newExtraCharge.amount,
        };
        setExtraCharges([...extraCharges, charge]);
        setNewExtraCharge({ name: "", amount: 0 });
    };

    const handleRemoveExtraCharge = (index: number) => {
        const updatedCharges = [...extraCharges];
        updatedCharges.splice(index, 1);
        setExtraCharges(updatedCharges);
    };

    const handleUpdateOrder = async () => {
        if (!items || items.length === 0) {
            toast.error("Cannot save order with no items");
            return;
        }

        try {
            setUpdating(true);
            const finalTotal = calculateTotal(items, extraCharges);

            await fetchFromHasura(updateOrderMutation, {
                id: order?.id,
                totalPrice: finalTotal,
                phone: phone || "",
                extraCharges: extraCharges.length > 0 ? extraCharges : null,
                notes: orderNote || null,
            });

            await fetchFromHasura(updateOrderItemsMutation, {
                orderId: order?.id,
                items: items.map((item) => ({
                    order_id: order?.id,
                    menu_id: item.menu_id,
                    quantity: item.quantity,
                    item: {
                        name: item.menu.name,
                        price: item.menu.price,
                        id: item.menu_id,
                    },
                })),
            });

            toast.success("Order updated successfully");
            onBack();
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Failed to update order");
        } finally {
            setUpdating(false);
        }
    };

    const displayMenuItems = useMemo(() => {
        return menuItems.flatMap((item) => {
            if (item.variants && item.variants.length > 0) {
                return item.variants.map((variant) => ({
                    ...item,
                    id: `${item.id}|${variant.name}`,
                    name: `${item.name} (${variant.name})`,
                    price: variant.price,
                }));
            }
            return item;
        });
    }, [menuItems]);

    const filteredMenuItems = displayMenuItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    let selectedItemDetails = null;
    if (newItemId) {
        const [baseId, variantName] = newItemId.split("|");
        const menuItem = menuItems.find((item) => item.id === baseId);
        if (menuItem) {
            if (variantName) {
                const variant = menuItem.variants?.find((v) => v.name === variantName);
                if (variant) {
                    selectedItemDetails = {
                        name: `${menuItem.name} (${variant.name})`,
                        price: variant.price,
                    };
                }
            } else {
                selectedItemDetails = {
                    name: menuItem.name,
                    price: menuItem.price,
                };
            }
        }
    }



    const handleStatusUpdate = async (newStatus: string) => {
        try {
            setStatus(newStatus); // Optimistic update
            await updateOrderStatus(orders, order.id, newStatus as any, setOrders);
            toast.success("Order status updated");


        } catch (error) {
            console.error("Status update error:", error);
            toast.error("Failed to update status");
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case "completed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            case "accepted": return "bg-blue-100 text-blue-800";
            case "dispatched": return "bg-purple-100 text-purple-900";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-lg sm:text-2xl font-bold">Edit Order #{order?.display_id || order?.id?.split("-")[0]}</h2>
                        <p className="text-sm text-muted-foreground">
                            {tableNumber ? `Table ${tableNumber}` : "No Table"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <Select
                        value={status}
                        onValueChange={handleStatusUpdate}
                    >
                        <SelectTrigger className={`w-[130px] border-none ${getStatusColor(status)}`}>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="dispatched">Dispatched</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={handleUpdateOrder}
                        disabled={updating || loading || !items || items.length === 0}
                        size="sm"
                        className="flex-1 sm:flex-none"
                    >
                        {updating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Items</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {items.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                            No items in this order
                                        </div>
                                    ) : (
                                        <div className="divide-y border rounded-lg">
                                            {items.map((item, index) => (
                                                <div
                                                    key={`${item.menu_id}-${item.menu.name}-${index}`}
                                                    className="p-3 flex flex-row justify-between gap-3 items-center w-full overflow-hidden"
                                                >
                                                    <div className="flex-1 text-left min-w-0 pr-2">
                                                        <div className="font-medium truncate">{item.menu.name}</div>
                                                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                                                            {currency}
                                                            {item.menu.price.toFixed(2)} each
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7 shrink-0"
                                                            onClick={() =>
                                                                handleQuantityChange(index, item.quantity - 1)
                                                            }
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>

                                                        <span className="w-6 text-center font-medium text-sm">
                                                            {item.quantity}
                                                        </span>

                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7 shrink-0"
                                                            onClick={() =>
                                                                handleQuantityChange(index, item.quantity + 1)
                                                            }
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive ml-1 shrink-0"
                                                            onClick={() => handleRemoveItem(index)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Add Items</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Input
                                            ref={searchInputRef}
                                            placeholder="Search menu items..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {searchQuery && (
                                        <div className="border rounded-lg max-h-60 overflow-y-auto shadow-sm">
                                            {filteredMenuItems.length === 0 ? (
                                                <div className="p-4 text-center text-muted-foreground">
                                                    No items found
                                                </div>
                                            ) : (
                                                <div className="divide-y">
                                                    {filteredMenuItems.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="p-3 flex justify-between items-center hover:bg-accent cursor-pointer transition-colors"
                                                            onClick={() => {
                                                                setNewItemId(item.id!);
                                                                setSearchQuery("");
                                                                if (searchInputRef.current) {
                                                                    searchInputRef.current.blur();
                                                                }
                                                            }}
                                                        >
                                                            <div>
                                                                <div className="font-medium text-sm">{item.name}</div>
                                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                                    <span>{currency}{item.price.toFixed(2)}</span>
                                                                    {item.category?.name && (
                                                                        <Badge variant="outline" className="text-[10px] h-5 px-1 py-0">
                                                                            {item.category.name}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Plus className="h-4 w-4 text-primary" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {newItemId && selectedItemDetails && (
                                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                            <div>
                                                <div className="font-medium">{selectedItemDetails.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {currency}{selectedItemDetails.price.toFixed(2)}
                                                </div>
                                            </div>
                                            <Button onClick={handleAddItem}>
                                                Add to Order
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {userData?.role !== "user" && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Table Number</label>
                                            <Input
                                                type="number"
                                                value={tableNumber || ""}
                                                onChange={(e) =>
                                                    handleTableNumberChange(Number(e.target.value) || null)
                                                }
                                                placeholder="Table number"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Phone</label>
                                            <Input
                                                type="tel"
                                                value={phone || ""}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="Customer phone"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Order Note</label>
                                    <textarea
                                        placeholder="Add notes..."
                                        value={orderNote}
                                        onChange={(e) => setOrderNote(e.target.value)}
                                        className="w-full p-2 text-sm border rounded-md resize-none min-h-[80px] bg-transparent"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Extra Charges</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Name"
                                        value={newExtraCharge.name}
                                        onChange={(e) =>
                                            setNewExtraCharge({
                                                ...newExtraCharge,
                                                name: e.target.value,
                                            })
                                        }
                                        className="flex-1"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        value={newExtraCharge.amount || ""}
                                        onChange={(e) =>
                                            setNewExtraCharge({
                                                ...newExtraCharge,
                                                amount: Number(e.target.value),
                                            })
                                        }
                                        className="w-24"
                                    />
                                    <Button size="icon" onClick={handleAddExtraCharge}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                {extraCharges.length > 0 && (
                                    <div className="border rounded-lg divide-y">
                                        {extraCharges.map((charge, index) => (
                                            <div
                                                key={charge.id || index}
                                                className="p-3 flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{charge.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {currency}
                                                        {charge.amount.toFixed(2)}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive"
                                                    onClick={() => handleRemoveExtraCharge(index)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    {qrGroup && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>QR Group ({qrGroup.name})</span>
                                            <span>
                                                {currency}
                                                {getExtraCharge(
                                                    items as any[],
                                                    qrGroup.extra_charge,
                                                    qrGroup.charge_type || "FLAT_FEE"
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {discounts.length > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Discount</span>
                                            <span>
                                                - {currency}
                                                {discounts.reduce((total, discount) => {
                                                    const foodSubtotal = items.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);
                                                    const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
                                                    const qrGroupCharges = qrGroup?.extra_charge ? getExtraCharge(items as any[], qrGroup.extra_charge, qrGroup.charge_type || "FLAT_FEE") : 0;
                                                    const taxableAmount = foodSubtotal + extraChargesTotal + qrGroupCharges;

                                                    if (discount.type === "flat") {
                                                        return total + discount.value;
                                                    } else {
                                                        return total + (taxableAmount * discount.value) / 100;
                                                    }
                                                }, 0).toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {gstPercentage > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>
                                                {(userData as Partner)?.country === "United Arab Emirates" ? "VAT" : "GST"} ({gstPercentage}%)
                                            </span>
                                            <span>
                                                {currency}
                                                {(() => {
                                                    const foodSubtotal = items.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);
                                                    const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
                                                    const qrGroupCharges = qrGroup?.extra_charge ? getExtraCharge(items as any[], qrGroup.extra_charge, qrGroup.charge_type || "FLAT_FEE") : 0;
                                                    const taxableAmount = foodSubtotal + extraChargesTotal + qrGroupCharges;

                                                    const discountAmount = discounts.reduce((total, discount) => {
                                                        if (discount.type === "flat") {
                                                            return total + discount.value;
                                                        } else {
                                                            return total + (taxableAmount * discount.value) / 100;
                                                        }
                                                    }, 0);

                                                    const discountedTaxableAmount = Math.max(0, taxableAmount - discountAmount);
                                                    return ((discountedTaxableAmount * gstPercentage) / 100).toFixed(2);
                                                })()}
                                            </span>
                                        </div>
                                    )}

                                    <Separator className="my-2" />

                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>{currency}{totalPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};
