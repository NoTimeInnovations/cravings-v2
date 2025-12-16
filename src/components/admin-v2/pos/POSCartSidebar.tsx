import { useState, useEffect } from "react";
import { usePOSStore } from "@/store/posStore";
import { useAuthStore, Partner } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, ChevronDown, Utensils, ShoppingBag, Loader2, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getGstAmount } from "@/components/hotelDetail/OrderDrawer";
import Img from "@/components/Img";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function POSCartSidebar() {
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
        tableNumbers,
        checkout,
        setPostCheckoutModalOpen
    } = usePOSStore();
    const { userData } = useAuthStore();
    const partnerData = userData as Partner;

    // UI States
    const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isOrderPlaced, setIsOrderPlaced] = useState(false);

    // Sync order type with table selection
    useEffect(() => {
        if (tableNumber) {
            setOrderType("dine-in");
        }
    }, [tableNumber]);

    const handleOrderTypeChange = (type: "dine-in" | "takeaway") => {
        setOrderType(type);
        if (type === "takeaway") {
            setTableNumber(null);
        }
    };

    const handlePlaceOrder = async () => {
        if (orderType === "dine-in" && !tableNumber) {
            toast.error("Please select a table for Dine-in orders");
            return;
        }

        setIsPlacingOrder(true);
        try {
            await checkout();
            // Suppress the store's modal state since we use inline feedback
            setPostCheckoutModalOpen(false);

            setIsOrderPlaced(true);

            // Fade out and clear after 1 second
            setTimeout(() => {
                setIsOrderPlaced(false);
                setIsPlacingOrder(false);
                clearCart();
                // Optionally reset other states if needed
            }, 1000);
        } catch (error) {
            console.error("Failed to place order:", error);
            setIsPlacingOrder(false);
            // Error handling is likely done in checkout store method via toast, 
            // but we ensure loading state is reset.
        }
    };

    const gstAmount = getGstAmount(totalAmount, partnerData?.gst_percentage || 0);
    const grandTotal = totalAmount + gstAmount;

    return (
        <div className="flex flex-col h-full bg-card relative">
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
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-orange-600" />
                        Current Order
                    </h2>
                    {cartItems.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearCart()}
                            className="text-muted-foreground hover:text-red-600 h-8"
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Clear
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
                            className={`flex-1 flex items-center justify-center text-xs font-medium rounded-sm transition-all ${orderType === 'dine-in' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handleOrderTypeChange('dine-in')}
                        >
                            <Utensils className="h-3 w-3 mr-1" />
                            Dine-In
                        </button>
                        <button
                            className={`flex-1 flex items-center justify-center text-xs font-medium rounded-sm transition-all ${orderType === 'takeaway' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handleOrderTypeChange('takeaway')}
                        >
                            <ShoppingBag className="h-3 w-3 mr-1" />
                            Takeaway
                        </button>
                    </div>
                </div>

                {/* Table Selector - Only visible for Dine-In */}
                {orderType === 'dine-in' && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-between h-9">
                                {tableNumber ? `Table ${tableNumber}` : "Select Table"}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-h-[200px] overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)]">
                            {tableNumbers.map((num) => (
                                <DropdownMenuItem key={num} onClick={() => setTableNumber(num)}>
                                    Table {num}
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
                            <div key={item.id} className="flex gap-3 bg-background p-2 rounded-lg border shadow-sm group">
                                <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                                    {item.image_url ? (
                                        <Img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-orange-100 text-orange-600 text-xs font-bold">
                                            ITEM
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-medium text-sm truncate" title={item.name}>{item.name}</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {formatCurrency(item.price)} x {item.quantity}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-sm">
                                            {formatCurrency(item.price * item.quantity)}
                                        </div>
                                        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
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
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Footer: Totals & Actions */}
            <div className="p-4 border-t bg-muted/30 space-y-3">
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatCurrency(totalAmount)}</span>
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
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all"
                        onClick={handlePlaceOrder}
                        disabled={cartItems.length === 0 || isPlacingOrder}
                    >
                        {isPlacingOrder ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        {isPlacingOrder ? "Placing Order..." : "Place Order"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
