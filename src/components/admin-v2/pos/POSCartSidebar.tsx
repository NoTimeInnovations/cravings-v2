import { useState, useEffect } from "react";
import { usePOSStore } from "@/store/posStore";
import { useAuthStore, Partner } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, ChevronDown, Utensils, ShoppingBag, Loader2, CheckCircle, Clock, Receipt, XCircle, FileText, Check, X, Save, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import Img from "@/components/Img";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { hasuraClient, subscribeToHasura } from "@/lib/hasuraSubscription";
import { subscriptionQuery } from "@/api/orders";
import { startOfDay, endOfDay, parseISO, format, isSameDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Printer } from "lucide-react";
import { PasswordProtectionModal } from "../PasswordProtectionModal";

interface POSCartSidebarProps {
    onMobileBack?: () => void;
    initialViewMode?: "current" | "today";
}

export function POSCartSidebar({ onMobileBack, initialViewMode = "current" }: POSCartSidebarProps) {
    const {
        cartItems,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        totalAmount,
        clearCart,
        userPhone,
        setUserPhone,
        tableNumber,
        setTableNumber,
        tables,
        tableName,
        setTableName,
        checkout,
        setPostCheckoutModalOpen,
        pastBills,
        fetchPastBills,
        loadingBills,
        updateOrderStatus,
        deleteBill,
        extraCharges,
        addExtraCharge,
        removeExtraCharge,
        posOrderType,
        setPosOrderType,
        updateOrderPaymentMethod,
        editingOrderId,
        loadOrderIntoCart,
        updateOrder,
        orderNote,
        setOrderNote
    } = usePOSStore();
    const { userData } = useAuthStore();
    const partnerData = userData as Partner;

    // UI States
    const [viewMode, setViewMode] = useState<"current" | "today">(initialViewMode);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isOrderPlaced, setIsOrderPlaced] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [newChargeName, setNewChargeName] = useState("");
    const [newChargeAmount, setNewChargeAmount] = useState("");

    // Fresh version of the selected order from the store's list
    const activeOrderData = selectedOrder ? (pastBills.find(o => o.id === selectedOrder.id) || selectedOrder) : null;

    const [isAddingExtraCharge, setIsAddingExtraCharge] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [isSelectingPaymentMethod, setIsSelectingPaymentMethod] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [actionDescription, setActionDescription] = useState("");

    // Sync order type with table selection
    useEffect(() => {
        if (tableNumber) {
            setPosOrderType("dine-in");
        }
    }, [tableNumber]);

    // Real-time subscription for today's orders
    useEffect(() => {
        if (!userData?.id) return;

        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();

        // Use the subscription to get real-time updates for today's orders
        const unsubscribe = subscribeToHasura({
            query: subscriptionQuery,
            variables: {
                partner_id: userData.id,
                today_start: todayStart,
                today_end: todayEnd
            },
            onNext: (data) => {
                if (data?.data?.orders) {
                    // Map Hasura snake_case to camelCase for the UI
                    const mappedOrders = data.data.orders.map((order: any) => ({
                        ...order,
                        createdAt: order.created_at,
                        tableNumber: order.table_number,
                        totalPrice: order.total_price,
                        gstIncluded: order.gst_included,
                        tableName: order.table_name || order.qr_code?.table_name,
                        deliveryAddress: order.delivery_address // Ensure deliveryAddress is mapped
                    }));
                    usePOSStore.setState({ pastBills: mappedOrders });
                }
            },
            onError: (err) => console.error("Subscription error:", err)
        });

        return () => {
            // unsubscribe passed as value/promise? 
            // subscribeToHasura returns a cleanup function directly.
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            } else if (unsubscribe && typeof (unsubscribe as any).dispose === 'function') {
                (unsubscribe as any).dispose();
            }
        };
    }, [userData?.id]);

    const handleOrderTypeChange = (type: "dine-in" | "takeaway") => {
        setPosOrderType(type);
        if (type === "takeaway") {
            setTableNumber(null);
        }
    };

    const handlePlaceOrder = async () => {
        if (posOrderType === "dine-in" && !tableNumber) {
            toast.error("Please select a table for Dine-in orders");
            return;
        }

        setIsPlacingOrder(true);
        try {
            if (editingOrderId) {
                await updateOrder();
                setViewMode("today"); // Go back to orders list after update
            } else {
                await checkout();
            }
            // Suppress the store's modal state since we use inline feedback
            setPostCheckoutModalOpen(false);

            setIsOrderPlaced(true);

            // Fade out and clear after 1 second
            setTimeout(() => {
                const currentOrder = usePOSStore.getState().order;
                const activeEditingId = editingOrderId;

                if (currentOrder) {
                    setSelectedOrder(currentOrder);
                    setViewMode("today");
                } else if (activeEditingId) {
                    // It was an update, try to find the fresh order in pastBills
                    const fresh = usePOSStore.getState().pastBills.find(b => b.id === activeEditingId);
                    if (fresh) {
                        setSelectedOrder(fresh);
                        setViewMode("today");
                    }
                }

                setIsOrderPlaced(false);
                setIsPlacingOrder(false);
                clearCart();
                setTableNumber(null);
                setTableName(null);
                setUserPhone(null);
            }, 1000);
        } catch (error) {
            console.error("Failed to place order:", error);
            setIsPlacingOrder(false);
            // Error handling is likely done in checkout store method via toast, 
            // but we ensure loading state is reset.
        }
    };

    const handleStatusUpdate = async (orderId: string, status: string) => {
        if (activeOrderData?.status === "completed") {
            setPendingAction(() => async () => {
                await updateOrderStatus(orderId, status);
                if (activeOrderData && activeOrderData.id === orderId) {
                    setSelectedOrder({ ...activeOrderData, status });
                }
            });
            setActionDescription("modify this completed order");
            setPasswordModalOpen(true);
            return;
        }

        await updateOrderStatus(orderId, status);
        if (activeOrderData && activeOrderData.id === orderId) {
            setSelectedOrder({ ...activeOrderData, status });
        }
    };

    const handleAddExtraCharge = () => {
        if (!newChargeName || !newChargeAmount) return;
        addExtraCharge({
            name: newChargeName,
            amount: parseFloat(newChargeAmount)
        });
        setNewChargeName("");
        setNewChargeAmount("");
        setIsAddingExtraCharge(false);
    };

    const todaysOrders = pastBills.filter(order =>
        order.createdAt && isSameDay(parseISO(order.createdAt), new Date())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const hasPendingOrders = todaysOrders.some(order => order.status === 'pending');

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            case "accepted": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const extraChargesTotal = extraCharges.reduce((acc, curr) => acc + curr.amount, 0);
    const taxableAmount = totalAmount + extraChargesTotal;
    const gstAmount = getGstAmount(taxableAmount, partnerData?.gst_percentage || 0);
    const grandTotal = taxableAmount + gstAmount;

    const activeOrderDataSubtotal = activeOrderData
        ? (activeOrderData.items || activeOrderData.order_items)?.reduce((acc: number, item: any) => {
            const itemData = item.item || item;
            const price = itemData.price || 0;
            const quantity = item.quantity || 1;
            return acc + (price * quantity);
        }, 0)
        : 0;

    const activeOrderDataExtraCharges = activeOrderData?.extraCharges || activeOrderData?.extra_charges || [];
    const activeOrderDataExtraChargesTotal = activeOrderDataExtraCharges.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

    const activeOrderDataTaxableAmount = activeOrderDataSubtotal + activeOrderDataExtraChargesTotal;

    const activeOrderDataGstAmount = activeOrderData
        ? getGstAmount(activeOrderDataTaxableAmount, activeOrderData.gstIncluded || 0)
        : 0;



    const handlePrintBill = async () => {
        if (!activeOrderData) return;
        if (activeOrderData.payment_method) {
            if (activeOrderData.status !== 'completed') {
                await updateOrderStatus(activeOrderData.id, 'completed');
                setSelectedOrder((prev: any) => ({ ...prev, status: 'completed' }));
            }
            window.open(`/bill/${activeOrderData.id}`, '_blank');
        } else {
            setIsSelectingPaymentMethod(true);
        }
    };

    const handlePaymentSelection = async (method: string) => {
        if (!activeOrderData) return;

        // Update payment method
        await updateOrderPaymentMethod(activeOrderData.id, method);

        // Update status to completed
        await updateOrderStatus(activeOrderData.id, 'completed');

        if (activeOrderData) {
            setSelectedOrder({ ...activeOrderData, payment_method: method, status: 'completed' });
        }
        window.open(`/bill/${activeOrderData.id}`, '_blank');
        setIsSelectingPaymentMethod(false);
    };

    return (
        <div className="flex flex-col h-full bg-card relative">
            {/* View Switcher */}
            <div className="p-2 border-b bg-muted/50">
                <div className="flex bg-muted rounded-lg p-1 h-10 border">
                    <button
                        className={`flex-1 flex items-center justify-center text-sm font-medium rounded-md transition-all ${viewMode === 'current' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setViewMode('current')}
                    >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Current Order
                    </button>
                    <button
                        className={`flex-1 flex items-center justify-center text-sm font-medium rounded-md transition-all relative ${viewMode === 'today' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setViewMode('today')}
                    >
                        <Clock className="h-4 w-4 mr-2" />
                        Today's Orders
                        {hasPendingOrders && (
                            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-600 border border-white animate-pulse" />
                        )}
                    </button>
                </div>
            </div>

            {viewMode === "current" ? (
                <>
                    {/* Loading/Success Overlay */}
                    {(isPlacingOrder || isOrderPlaced) && (
                        <div className={`absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300 ${isOrderPlaced ? 'opacity-100' : 'opacity-100'}`}>
                            {isOrderPlaced ? (
                                <div className="flex flex-col items-center text-green-600 animate-in zoom-in duration-300">
                                    <CheckCircle className="h-16 w-16 mb-4" />
                                    <h3 className="text-2xl font-bold">Order Placed!</h3>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-orange-600">
                                    <Loader2 className="h-12 w-12 animate-spin mb-4" />
                                    <p className="font-medium text-lg">Placing Order...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Header: Customer Info & Order Type */}
                    <div className="p-4 border-b space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {onMobileBack && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 md:hidden"
                                        onClick={onMobileBack}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                )}
                                <h2 className="font-semibold text-lg flex items-center gap-2">
                                    <span className="text-orange-600">#</span> {editingOrderId ? `Editing Order #${pastBills.find(b => b.id === editingOrderId)?.display_id || editingOrderId.slice(0, 4)}` : "New Order"}
                                </h2>
                            </div>
                            {cartItems.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => clearCart()}
                                    className="text-muted-foreground hover:text-red-600 h-8"
                                >
                                    {
                                        editingOrderId ? (
                                            <>
                                                <X className="h-4 w-4 mr-1" />
                                                Cancel</>
                                        ) : (
                                            <>
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Clear
                                            </>
                                        )
                                    }
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                placeholder="Customer Phone"
                                value={userPhone || ""}
                                onChange={(e) => setUserPhone(e.target.value)}
                                className="h-9 text-sm"
                            />

                            {/* Order Type Selector */}
                            <div className="flex bg-muted rounded-md p-1 h-9 border">
                                <button
                                    className={`flex-1 flex items-center justify-center text-xs font-medium rounded-sm transition-all ${posOrderType === 'dine-in' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => handleOrderTypeChange('dine-in')}
                                >
                                    <Utensils className="h-3 w-3 mr-1" />
                                    Dine-In
                                </button>
                                <button
                                    className={`flex-1 flex items-center justify-center text-xs font-medium rounded-sm transition-all ${posOrderType === 'takeaway' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => handleOrderTypeChange('takeaway')}
                                >
                                    <ShoppingBag className="h-3 w-3 mr-1" />
                                    Takeaway
                                </button>
                            </div>
                        </div>

                        {/* Table Selector - Only visible for Dine-In */}
                        {posOrderType === 'dine-in' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-between h-9">
                                        {tableNumber
                                            ? (tableName || `Table ${tableNumber}`)
                                            : "Select Table"}
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="max-h-[200px] overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)]">
                                    {tables

                                        .map((table) => (
                                            <DropdownMenuItem
                                                key={table.id}
                                                onClick={() => {
                                                    setTableNumber(table.number);
                                                    setTableName(table.name || null);
                                                }}
                                            >
                                                {table.name || `Table ${table.number}`}
                                            </DropdownMenuItem>
                                        ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Cart Items */}
                    <ScrollArea className="flex-1 p-4">
                        {cartItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-2 opacity-50">
                                <ShoppingCart className="h-10 w-10" />
                                <p className="text-sm">Cart is empty</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center bg-background p-2 rounded-lg border shadow-sm group gap-2 w-full">
                                        <div className="flex-1 min-w-0 grid gap-0.5">
                                            <h4 className="font-medium text-sm truncate pr-2" title={item.name}>{item.name}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {formatCurrency(item.price)} x {item.quantity} = <span className="font-semibold text-foreground">{formatCurrency(item.price * item.quantity)}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 rounded-sm hover:bg-background shadow-sm"
                                                onClick={() => decreaseQuantity(item.id!)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 rounded-sm hover:bg-background shadow-sm"
                                                onClick={() => increaseQuantity(item.id!)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {editingOrderId && (
                                    <Button
                                        variant="outline"
                                        className="w-full border-dashed text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                        onClick={() => onMobileBack?.()}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Item
                                    </Button>
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Footer: Totals & Actions */}
                    <div className="p-4 border-t bg-muted/30 space-y-3">
                        {/* Extra Charges Section */}
                        <div className="space-y-2">
                            {isAddingExtraCharge ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <Input
                                        placeholder="Charge Name"
                                        value={newChargeName}
                                        onChange={(e) => setNewChargeName(e.target.value)}
                                        className="h-8 text-xs flex-1"
                                        autoFocus
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        value={newChargeAmount}
                                        onChange={(e) => setNewChargeAmount(e.target.value)}
                                        className="h-8 text-xs w-16"
                                    />
                                    <Button size="sm" variant="ghost" onClick={handleAddExtraCharge} className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50">
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsAddingExtraCharge(false)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : isAddingNote ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <Input
                                        placeholder="Add Order Note..."
                                        value={orderNote}
                                        onChange={(e) => setOrderNote(e.target.value)}
                                        className="h-8 text-xs flex-1"
                                        autoFocus
                                    />
                                    <Button size="sm" variant="ghost" onClick={() => setIsAddingNote(false)} className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50">
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-[10px] h-8 border-dashed text-muted-foreground hover:text-foreground px-2"
                                        onClick={() => setIsAddingExtraCharge(true)}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Charge
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-[10px] h-8 border-dashed text-muted-foreground hover:text-foreground px-2"
                                        onClick={() => setIsAddingNote(true)}
                                    >
                                        <MessageSquare className="h-3 w-3 mr-1" />
                                        {orderNote ? 'Edit Note' : 'Add Note'}
                                    </Button>
                                </div>
                            )}
                            {orderNote && !isAddingNote && (
                                <div className="flex items-center justify-between text-[10px] bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded text-blue-700 dark:text-blue-300">
                                    <span className="truncate italic flex-1 mr-2 px-1">Note: {orderNote}</span>
                                    <button onClick={() => setOrderNote("")} className="text-blue-500 hover:text-blue-700">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {extraCharges.length > 0 && (
                                <div className="space-y-1">
                                    {extraCharges.map((charge) => (
                                        <div key={charge.id} className="flex justify-between items-center text-xs bg-muted/50 p-1.5 rounded">
                                            <span>{charge.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span>{formatCurrency(charge.amount)}</span>
                                                <button onClick={() => removeExtraCharge(charge.id)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Separator />


                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatCurrency(totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Extra Charges</span>
                                <span>{formatCurrency(extraChargesTotal)}</span>
                            </div>
                            {(partnerData?.gst_percentage || 0) > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>GST ({partnerData?.gst_percentage}%)</span>
                                    <span>{formatCurrency(gstAmount)}</span>
                                </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                size="lg"
                                className={`w-full ${editingOrderId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white shadow-md hover:shadow-lg transition-all`}
                                onClick={handlePlaceOrder}
                                disabled={(cartItems.length === 0 && extraChargesTotal === 0) || isPlacingOrder}
                            >
                                {isPlacingOrder ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : editingOrderId ? (
                                    <Save className="mr-2 h-4 w-4" />
                                ) : (
                                    <CreditCard className="mr-2 h-4 w-4" />
                                )}
                                {isPlacingOrder
                                    ? (editingOrderId ? "Updating Order..." : "Placing Order...")
                                    : (editingOrderId ? "Update Order" : "Place Order")}
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                activeOrderData ? (
                    <div className="flex flex-col h-full animate-in slide-in-from-right-10 duration-200">
                        <div className="p-2 border-b flex items-center gap-2 bg-muted/20">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} className="h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h3 className="font-semibold text-sm">
                                    Order #{activeOrderData.display_id || activeOrderData.id?.slice(0, 8)}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {activeOrderData.tableName || `Table ${activeOrderData.tableNumber}`} • {
                                        (activeOrderData.type === 'delivery' && !activeOrderData.deliveryAddress) ? "Takeaway" :
                                            (activeOrderData.type === 'table_order' || activeOrderData.type === 'pos') ? "Dine-in" :
                                                activeOrderData.type
                                    }
                                </p>
                            </div>
                            <Select
                                value={activeOrderData.status}
                                disabled={userData?.role === 'captain' && activeOrderData.status === 'completed'}
                                onValueChange={(val) => handleStatusUpdate(activeOrderData.id, val)}
                            >
                                <SelectTrigger className={`w-[110px] h-7 text-xs border-none ml-auto ${getStatusColor(activeOrderData.status)}`}>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="accepted">Accepted</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    {(activeOrderData.items || activeOrderData.order_items)?.map((item: any, idx: number) => {
                                        const itemData = item.item || item;
                                        const unitPrice = itemData.price || 0;
                                        const quantity = item.quantity || 1;
                                        return (
                                            <div key={idx} className="flex justify-between items-start text-sm">
                                                <div className="flex gap-2">
                                                    <span className="font-medium text-muted-foreground">{quantity}x</span>
                                                    <div>
                                                        <span className="font-medium">{itemData.name}</span>
                                                    </div>
                                                </div>
                                                <span className="font-medium">{formatCurrency(unitPrice * quantity)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <Separator />
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(activeOrderDataSubtotal)}</span>
                                    </div>
                                    {activeOrderDataExtraChargesTotal > 0 && (
                                        <>
                                            {activeOrderDataExtraCharges.map((charge: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-muted-foreground text-xs pl-2 border-l-2 border-muted">
                                                    <span>{charge.name}</span>
                                                    <span>{formatCurrency(charge.amount)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Extra Charges</span>
                                                <span>{formatCurrency(activeOrderDataExtraChargesTotal)}</span>
                                            </div>
                                        </>
                                    )}
                                    {(activeOrderData.gstIncluded || 0) > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>GST ({activeOrderData.gstIncluded}%)</span>
                                            <span>{formatCurrency(activeOrderDataGstAmount)}</span>
                                        </div>
                                    )}
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Total</span>
                                    <span>{formatCurrency(activeOrderData.totalPrice)}</span>
                                </div>

                                {activeOrderData.notes && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md text-sm border-l-2 border-yellow-50 mt-4">
                                        <p className="font-medium text-yellow-800 dark:text-yellow-200 text-xs mb-1">Note:</p>
                                        <p className="text-muted-foreground italic">{activeOrderData.notes}</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-muted/10">
                            {isSelectingPaymentMethod ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-sm">Select Payment Method</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsSelectingPaymentMethod(false)}
                                            className="h-6 w-6 p-0"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button variant="outline" onClick={() => handlePaymentSelection('cash')} className="flex flex-col h-auto py-3 gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">
                                            <span className="text-xl">💵</span>
                                            <span className="text-xs font-medium">Cash</span>
                                        </Button>
                                        <Button variant="outline" onClick={() => handlePaymentSelection('upi')} className="flex flex-col h-auto py-3 gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">
                                            <span className="text-xl">📱</span>
                                            <span className="text-xs font-medium">UPI</span>
                                        </Button>
                                        <Button variant="outline" onClick={() => handlePaymentSelection('card')} className="flex flex-col h-auto py-3 gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">
                                            <span className="text-xl">💳</span>
                                            <span className="text-xs font-medium">Card</span>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" className="w-full" onClick={handlePrintBill}>
                                        <Printer className="h-4 w-4 mr-2" />
                                        Bill
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => window.open(`/kot/${activeOrderData.id}`, '_blank')}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        KOT
                                    </Button>
                                    {(userData?.role !== 'captain' || activeOrderData.status !== 'completed') && (
                                        <Button
                                            variant="outline"
                                            className="w-full col-span-2 border-primary/20 hover:bg-primary/5 text-primary"
                                            onClick={() => {
                                                loadOrderIntoCart(activeOrderData);
                                                setViewMode("current");
                                                // Stay in cart view instead of switching back to menu
                                            }}
                                        >
                                            <span className="mr-2">✏️</span>
                                            Edit Order
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col md:h-full h-auto">
                        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                {onMobileBack && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 md:hidden"
                                        onClick={onMobileBack}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                )}
                                <h2 className="font-semibold text-lg">Today's Orders</h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => fetchPastBills()} disabled={loadingBills}>
                                {loadingBills ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                            </Button>
                        </div>
                        <ScrollArea className="flex-1">
                            {todaysOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center h-full text-muted-foreground">
                                    <Clock className="h-12 w-12 mb-4 opacity-20" />
                                    <p>No orders yet today</p>
                                </div>
                            ) : (
                                <div className="space-y-2 p-4">
                                    {todaysOrders.map((order) => (
                                        <div
                                            key={order.id}
                                            className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors bg-card shadow-sm"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm">#{order.display_id || order.id.slice(0, 4)}</span>
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                                        {format(parseISO(order.createdAt), "h:mm a")}
                                                    </Badge>
                                                </div>
                                                <Badge className={
                                                    order.status === 'completed' ? 'bg-green-100 text-green-800 border-none' :
                                                        order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-none' :
                                                            'bg-yellow-100 text-yellow-800 border-none'
                                                }>
                                                    {order.status}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">
                                                    {order.tableName || `Table ${order.tableNumber}`} • {
                                                        (order.type === 'delivery' && !order.deliveryAddress) ? "Takeaway" :
                                                            (order.type === 'table_order' || order.type === 'pos') ? "Dine-in" :
                                                                order.type
                                                    }
                                                </span>
                                                <span className="font-medium text-foreground">
                                                    {formatCurrency(order.totalPrice)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                )
            )
            }
            <PasswordProtectionModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
                onSuccess={() => pendingAction?.()}
                actionDescription={actionDescription}
            />
        </div>
    );
}
