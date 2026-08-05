import { useState, useEffect } from "react";
import { usePOSStore } from "@/store/posStore";
import { useAuthStore, Partner } from "@/store/authStore";
import { computeRoundOff, isRoundOffEnabled } from "@/lib/roundOff";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, ChevronDown, ChevronUp, Utensils, ShoppingBag, Bike, Loader2, CheckCircle, Clock, Receipt, XCircle, FileText, Check, X, Save, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { calculateGstForItems } from "@/components/hotelDetail/OrderDrawer";
import Img from "@/components/Img";
import { formatCurrency } from "@/lib/utils";
import { computeDiscountAmount, getDiscountAmount } from "@/lib/discountUtils";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { discountFields } from "@/api/discounts";
import {
    bxgyFreebieUnits,
    bxgyRepeatCount,
    bxgyRewardAmount,
    describeBxgy,
} from "@/lib/bxgy";
import { getTakeawayAdjustment, applyTakeawayAdjustment, takeawayChargeForItems, takeawayUnitAdjustment } from "@/lib/takeawayPricing";
import { toast } from "sonner";
import { hasuraClient, subscribeToHasura } from "@/lib/hasuraSubscription";
import { isCompletedOrderLockEnabled, isCancelledOrderFrozen } from "@/lib/orderStatus";
import { subscriptionQuery } from "@/api/orders";
import { parseISO, format } from "date-fns";
import { todayRange, todayLocalDate, localDateInTz } from "@/lib/partnerTime";
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
import { printKotAndBill, type PrintDoc } from "@/lib/printOrder";
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
        addCustomItem,
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
        setOrderNote,
        deliveryAddress,
        setDeliveryAddress,
        customerName,
        setCustomerName,
        setQuantity,
    } = usePOSStore();
    const { userData } = useAuthStore();
    const partnerData = userData as Partner;
    // Per-item takeaway surcharge, applied to displayed prices/totals only when the
    // takeaway order type is selected (mirrors the baked-in price used at checkout).
    const takeawayAdjustment = posOrderType === "takeaway" ? getTakeawayAdjustment(partnerData) : 0;

    // UI States
    const [viewMode, setViewMode] = useState<"current" | "today">(initialViewMode);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isOrderPlaced, setIsOrderPlaced] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [newChargeName, setNewChargeName] = useState("");
    const [newChargeAmount, setNewChargeAmount] = useState("");
    const [isAddingDiscount, setIsAddingDiscount] = useState(false);
    const [discountType, setDiscountType] = useState<"percentage" | "flat" | "freebie" | "bxgy">("percentage");
    // Saved BXGY offers the partner defined in Settings. Unlike the other three
    // types, a BXGY isn't typed in at the counter — it's a rule, so staff pick
    // one and it's evaluated against the cart.
    const [bxgyOffers, setBxgyOffers] = useState<any[]>([]);
    const [discountValue, setDiscountValue] = useState("");
    const [discountReason, setDiscountReason] = useState("");
    const [showBillDetails, setShowBillDetails] = useState(false);

    // Fresh version of the selected order from the store's list
    const activeOrderData = selectedOrder ? (pastBills.find(o => o.id === selectedOrder.id) || selectedOrder) : null;

    // True when the order currently loaded into the cart for editing is a locked
    // completed order (covers the race where it completes via live subscription
    // mid-edit). Store guards make the cart mutations no-ops; this also disables
    // the Update button in the UI.
    const editingLoadedOrder = editingOrderId ? pastBills.find((b) => b.id === editingOrderId) : null;
    const editLocked = !!editingLoadedOrder && isCompletedOrderLockEnabled(userData) && editingLoadedOrder.status === "completed";

    const [isAddingExtraCharge, setIsAddingExtraCharge] = useState(false);
    const [isAddingCustomItem, setIsAddingCustomItem] = useState(false);
    const [customItemName, setCustomItemName] = useState("");
    const [customItemPrice, setCustomItemPrice] = useState("");
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [isSelectingPaymentMethod, setIsSelectingPaymentMethod] = useState(false);
    // Which documents the payment chooser should print once a method is picked.
    // The chooser is opened by Bill / KOT+Bill, so it has to remember which.
    const [pendingPrintDocs, setPendingPrintDocs] = useState<PrintDoc[]>(["bill"]);
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

        // "Today" in the partner's own timezone (not the cashier's device), so a
        // POS near local midnight or in a different tz still lists the right bills.
        const { startISO: todayStart, endISO: todayEnd } = todayRange((userData as any)?.timezone);

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
                        deliveryAddress: order.delivery_address,
                        extraCharges: order.extra_charges || [],
                        discounts: order.discounts || []
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
        // Re-open the window if the partner changes their timezone mid-session, so
        // the fetched "today" span stays in sync with the tz-based display filter.
    }, [userData?.id, (userData as any)?.timezone]);

    const handleOrderTypeChange = (type: "dine-in" | "takeaway" | "delivery") => {
        setPosOrderType(type);
        // Only dine-in uses a table; clear it for takeaway and delivery.
        if (type !== "dine-in") {
            setTableNumber(null);
        }
    };

    const handlePlaceOrder = async () => {
        // Completed-order lock: never allow re-saving a completed order (the Edit
        // entry point is already blocked; this is defense in depth).
        if (editingOrderId && isCompletedOrderLockEnabled(userData)) {
            const editing = pastBills.find((b) => b.id === editingOrderId);
            if (editing?.status === "completed") {
                toast.error("This order is completed and locked — it cannot be edited.");
                return;
            }
        }

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
        // Cancelled orders are frozen when the lock is on — no status change at all.
        if (isCompletedOrderLockEnabled(userData) && activeOrderData?.status === "cancelled") {
            toast.error("This order is cancelled and locked. Its status can't be changed.");
            return;
        }
        if (activeOrderData?.status === "completed") {
            // Completed-order lock ON: the only permitted transition is cancel
            // (runs directly, no password). Everything else is blocked. When the
            // lock is OFF, keep the legacy password-gated behavior.
            if (isCompletedOrderLockEnabled(userData)) {
                if (status !== "cancelled") {
                    toast.error("This order is completed and locked. You can only cancel it.");
                    return;
                }
                await updateOrderStatus(orderId, status);
                if (activeOrderData && activeOrderData.id === orderId) {
                    setSelectedOrder({ ...activeOrderData, status });
                }
                return;
            }

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

    // Add an off-menu item (typed name + price) straight into the cart.
    const handleAddCustomItem = () => {
        const price = parseFloat(customItemPrice);
        if (!customItemName.trim()) {
            toast.error("Enter an item name");
            return;
        }
        if (isNaN(price) || price <= 0) {
            toast.error("Enter a valid price");
            return;
        }
        addCustomItem(customItemName, price);
        setCustomItemName("");
        setCustomItemPrice("");
        setIsAddingCustomItem(false);
    };

    const {
        discounts,
        addDiscount,
        removeDiscount
    } = usePOSStore();

    // Load the partner's saved BXGY offers once the discount panel is opened.
    // Only BXGY: the other three types are still typed in by hand here, so
    // there's nothing to look up for them.
    useEffect(() => {
        const partnerId = (partnerData as any)?.id;
        if (!isAddingDiscount || discountType !== "bxgy" || !partnerId || bxgyOffers.length) return;
        fetchFromHasura(
            `query GetPosBxgyOffers($partner_id: uuid!) {
                discounts(
                    where: {
                        partner_id: { _eq: $partner_id }
                        is_active: { _eq: true }
                        discount_type: { _eq: "bxgy" }
                        _or: [{ expires_at: { _is_null: true } }, { expires_at: { _gt: "now()" } }]
                    }
                    order_by: [{ rank: asc_nulls_last }]
                ) {
                    ${discountFields}
                }
            }`,
            { partner_id: partnerId },
        )
            .then((res) => setBxgyOffers(res?.discounts ?? []))
            .catch(() => toast.error("Couldn't load your BXGY offers"));
    }, [isAddingDiscount, discountType, (partnerData as any)?.id]);

    const posMenuNameOf = (id: string) =>
        usePOSStore.getState().cartItems.find((i) => i.id === id)?.name;
    const posMenuPriceOf = (id: string) =>
        Number(usePOSStore.getState().cartItems.find((i) => i.id === id)?.price) || 0;

    // Evaluate a saved BXGY against what's in the cart right now. The POS bills
    // every line at the raw menu price (never an offer price), so the whole food
    // subtotal is the discountable base here — unlike the storefront.
    const evaluateBxgy = (offer: any) => {
        const cart = usePOSStore.getState().cartItems;
        const base = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
        const repeat = bxgyRepeatCount(offer, cart, base);
        const amount = Math.min(
            bxgyRewardAmount(offer, { repeat, base, priceOf: posMenuPriceOf }),
            base,
        );
        return { repeat, amount, base };
    };

    // A freebie-reward BXGY at the counter takes the free item's price off the
    // bill and staff hand the item over — the POS never auto-adds cart lines.
    const applyBxgyOffer = (offer: any) => {
        const { repeat, amount } = evaluateBxgy(offer);
        if (repeat <= 0) {
            toast.error(`Cart doesn't qualify — ${describeBxgy(offer, { nameOf: posMenuNameOf })}`);
            return;
        }
        if (amount <= 0) {
            toast.error("This offer works out to nothing on this bill.");
            return;
        }
        addDiscount({
            type: "bxgy",
            value: amount,
            reason: discountReason.trim() || offer.code,
            code: offer.code,
            freebie_item_ids: offer.freebie_item_ids || undefined,
            freebie_item_count: bxgyFreebieUnits(offer, repeat) || undefined,
            bxgy_buy_type: offer.bxgy_buy_type || undefined,
            bxgy_buy_item_ids: offer.bxgy_buy_item_ids || undefined,
            bxgy_buy_quantity: offer.bxgy_buy_quantity ?? undefined,
            bxgy_buy_value: offer.bxgy_buy_value ?? undefined,
            bxgy_reward_type: offer.bxgy_reward_type || undefined,
            bxgy_reward_value: offer.bxgy_reward_value ?? undefined,
            bxgy_max_repeat: offer.bxgy_max_repeat ?? undefined,
            bxgy_applied_times: repeat,
        });
        toast.success(`Applied ${offer.code}${repeat > 1 ? ` (${repeat}×)` : ""}`);
        setDiscountValue("");
        setDiscountReason("");
        setIsAddingDiscount(false);
    };

    const handleAddDiscount = () => {
        if (!discountValue) return;
        const val = parseFloat(discountValue);
        if (isNaN(val) || val < 0) return;

        if (discountType === "percentage" && val > 100) {
            toast.error("Percentage discount cannot exceed 100%");
            return;
        }

        addDiscount({
            type: discountType,
            value: val,
            reason: discountReason
        });

        setDiscountValue("");
        setDiscountReason("");
        setIsAddingDiscount(false);
    };

    // Filter to the partner's local "today" (not the device's day).
    const partnerTz = (userData as any)?.timezone;
    const todayLocal = todayLocalDate(partnerTz);
    const todaysOrders = pastBills.filter(order =>
        order.createdAt && localDateInTz(order.createdAt, partnerTz) === todayLocal
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const hasPendingOrders = todaysOrders.some(order => order.status === 'pending');

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            case "accepted": return "bg-blue-100 text-blue-800";
            case "food_ready": return "bg-orange-100 text-orange-800";
            case "dispatched": return "bg-purple-100 text-purple-900";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const posCartItems = usePOSStore.getState().cartItems;
    const effectivePosItems = applyTakeawayAdjustment(posCartItems, takeawayAdjustment);
    // Surcharge applies to menu items only — custom items are billed as typed.
    const effectiveFoodAmount = totalAmount + takeawayChargeForItems(posCartItems, takeawayAdjustment);

    const extraChargesTotal = extraCharges.reduce((acc, curr) => acc + curr.amount, 0);
    const subtotal = effectiveFoodAmount + extraChargesTotal;

    // Calculate current order discounts
    const discountAmount = usePOSStore.getState().discounts.reduce((total, discount) => {
        if (discount.type === "freebie" || discount.type === "bxgy") {
            // Both are a fixed amount: the freebie's item price, or the BXGY
            // reward as evaluated against the cart when it was applied.
            return total + (discount.value || 0);
        }
        return total + computeDiscountAmount(discount as any, subtotal);
    }, 0);

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const discountedFoodAmount = Math.max(0, effectiveFoodAmount - discountAmount);
    const discRatio = effectiveFoodAmount > 0 ? discountedFoodAmount / effectiveFoodAmount : 0;
    const adjItems = effectivePosItems.map((item) => ({ price: item.price * discRatio, quantity: item.quantity, tax_inclusive: item.tax_inclusive }));
    const { additionalGst: gstAmount } = calculateGstForItems(adjItems, partnerData?.gst_percentage || 0);
    const preRoundTotal = discountedSubtotal + gstAmount;
    // Round Off: match posStore's persisted total when the partner enables it.
    const roundOff = isRoundOffEnabled(partnerData?.delivery_rules) ? computeRoundOff(preRoundTotal) : 0;
    const grandTotal = Math.round((preRoundTotal + roundOff) * 100) / 100;

    const activeOrderDataSubtotal = activeOrderData
        ? (activeOrderData.items || activeOrderData.order_items)?.reduce((acc: number, item: any) => {
            const itemData = item.item || item;
            const price = itemData.price || 0;
            const quantity = item.quantity || 1;
            return acc + (price * quantity);
        }, 0)
        : 0;

    const activeOrderDataExtraCharges = activeOrderData?.extraCharges || [];
    const activeOrderDataExtraChargesTotal = activeOrderDataExtraCharges.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

    const activeOrderDataTotal = activeOrderDataSubtotal + activeOrderDataExtraChargesTotal;

    const activeOrderDataDiscounts = activeOrderData?.discounts || [];
    const activeOrderDataDiscountAmount = activeOrderDataDiscounts.reduce(
        (total: number, discount: any) =>
            total + getDiscountAmount(discount, activeOrderDataTotal),
        0
    );

    const activeOrderDataDiscountedTotal = Math.max(0, activeOrderDataTotal - activeOrderDataDiscountAmount);
    const activeOrderDataDiscountedFoodSubtotal = Math.max(0, activeOrderDataSubtotal - activeOrderDataDiscountAmount);

    const activeOrderDataGstPercentage = partnerData?.gst_percentage || 0;
    // Must match the cart's calculation (calculateGstForItems above), not a flat
    // percentage. getGstAmount() ignores tax_inclusive, so a tax-inclusive item
    // — whose price ALREADY contains the GST — had 5% added again once the order
    // was placed: the cart correctly showed GST 0 / total 70, then the same
    // order re-opened as GST 3.50 / total 73.50, i.e. the customer is billed tax
    // twice. Only tax-EXCLUSIVE items get anything added on top.
    const activeOrderDataItems = activeOrderData
        ? ((activeOrderData.items || activeOrderData.order_items) || []).map((item: any) => {
              const itemData = item.item || item;
              return {
                  price: itemData.price || 0,
                  quantity: item.quantity || 1,
                  // The order_items.item jsonb snapshot only carries
                  // {category,id,name,offers,price} — no tax flag — so fall back
                  // to the live menu row, which the subscription now selects.
                  tax_inclusive: itemData.tax_inclusive ?? item.menu?.tax_inclusive,
              };
          })
        : [];
    // The discount applies to the food subtotal, so scale the GST by the same
    // ratio rather than taxing the pre-discount amount.
    const activeOrderDataTaxableRatio =
        activeOrderDataSubtotal > 0
            ? activeOrderDataDiscountedFoodSubtotal / activeOrderDataSubtotal
            : 0;
    const activeOrderDataGstAmount = activeOrderData
        ? calculateGstForItems(activeOrderDataItems, activeOrderDataGstPercentage)
              .additionalGst * activeOrderDataTaxableRatio
        : 0;

    const activeOrderDataGrandTotal = activeOrderDataDiscountedTotal + activeOrderDataGstAmount;



    // Print entry point for every document combination. Printing NEVER changes
    // the order's status; a missing payment method just detours via the chooser,
    // which then prints the same documents that were asked for.
    const startPrint = (docs: PrintDoc[]) => {
        if (!activeOrderData) return;
        if (activeOrderData.payment_method) {
            printKotAndBill(activeOrderData.id, { docs });
        } else {
            setPendingPrintDocs(docs);
            setIsSelectingPaymentMethod(true);
        }
    };

    const handlePrintBill = () => startPrint(["bill"]);
    const handlePrintKot = () => startPrint(["kot"]);
    const handlePrintKotAndBill = () => startPrint(["kot", "bill"]);

    // NOT async: the tabs must be claimed inside the click, before the payment
    // mutation is awaited — otherwise the popup is blocked (WebKit always, Chrome
    // intermittently). printKotAndBill claims them first and runs the mutation
    // in `before`. Deliberately does NOT complete the order — this chooser is
    // opened by Print, and printing must not change status.
    const handlePaymentSelection = (method: string) => {
        if (!activeOrderData) return;
        const order = activeOrderData;

        printKotAndBill(order.id, {
            docs: pendingPrintDocs,
            before: async () => {
                await updateOrderPaymentMethod(order.id, method);
                setSelectedOrder({ ...order, payment_method: method });
            },
        });
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
                    <div className="p-3 border-b space-y-2 bg-muted/30">
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

                        <div className="space-y-2">
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
                                <button
                                    className={`flex-1 flex items-center justify-center text-xs font-medium rounded-sm transition-all ${posOrderType === 'delivery' ? 'bg-white text-orange-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => handleOrderTypeChange('delivery')}
                                >
                                    <Bike className="h-3 w-3 mr-1" />
                                    Delivery
                                </button>
                            </div>
                        </div>

                        {/* Delivery: customer name + address (only for Delivery).
                            The name links to the customer's account by phone at
                            placement; the address defaults to "Address not specified"
                            so the order stays classified as a real delivery. */}
                        {posOrderType === 'delivery' && (
                            <div className="space-y-2">
                                <Input
                                    placeholder="Customer Name"
                                    value={customerName || ""}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="h-9 text-sm"
                                />
                                <Input
                                    placeholder="Delivery Address"
                                    value={deliveryAddress || ""}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    onFocus={(e) => e.currentTarget.select()}
                                    className="h-9 text-sm"
                                />
                            </div>
                        )}

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
                    <ScrollArea className="flex-1 min-h-0 p-3">
                        {cartItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-2 opacity-50">
                                <ShoppingCart className="h-10 w-10" />
                                <p className="text-sm">Cart is empty</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cartItems.map((item) => {
                                    const displayUnitPrice = Math.max(0, item.price + takeawayUnitAdjustment(item, takeawayAdjustment));
                                    return (
                                    <div key={item.id} className="flex justify-between items-center bg-background p-2 rounded-lg border shadow-sm group gap-2 w-full">
                                        <div className="flex-1 min-w-0 grid gap-0.5">
                                            <h4 className="font-medium text-sm break-words pr-2" title={item.name}>{item.name}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {formatCurrency(displayUnitPrice)} x {item.quantity} = <span className="font-semibold text-foreground">{formatCurrency(displayUnitPrice * item.quantity)}</span>
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
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                value={item.quantity}
                                                onFocus={(e) => e.currentTarget.select()}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (v === "") return; // ignore transient empty — don't delete the line
                                                    const n = parseInt(v, 10);
                                                    if (Number.isFinite(n)) setQuantity(item.id!, n);
                                                }}
                                                aria-label={`Quantity for ${item.name}`}
                                                className="w-9 h-6 text-center text-xs font-medium bg-transparent rounded-sm outline-none focus:ring-1 focus:ring-orange-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
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
                                    );
                                })}
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

                        {/* Add a custom off-menu item (typed name + price) */}
                        <div className="mt-3">
                            {isAddingCustomItem ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <Input
                                        placeholder="Item name"
                                        value={customItemName}
                                        onChange={(e) => setCustomItemName(e.target.value)}
                                        className="h-8 text-xs flex-1"
                                        autoFocus
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Price"
                                        value={customItemPrice}
                                        onChange={(e) => setCustomItemPrice(e.target.value)}
                                        className="h-8 text-xs w-20"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAddCustomItem();
                                        }}
                                    />
                                    <Button size="sm" variant="ghost" onClick={handleAddCustomItem} className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50">
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setIsAddingCustomItem(false); setCustomItemName(""); setCustomItemPrice(""); }} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full border-dashed text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsAddingCustomItem(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add custom item
                                </Button>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer: Totals & Actions */}
                    <div className="p-3 border-t bg-muted/30 space-y-2">
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
                                <div className="flex gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-[10px] h-8 border-dashed text-muted-foreground hover:text-foreground px-1"
                                        onClick={() => setIsAddingExtraCharge(true)}
                                    >
                                        <Plus className="h-3 w-3 mr-0.5" />
                                        Charge
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-[10px] h-8 border-dashed text-muted-foreground hover:text-foreground px-1"
                                        onClick={() => setIsAddingNote(true)}
                                    >
                                        <MessageSquare className="h-3 w-3 mr-0.5" />
                                        {orderNote ? 'Edit Note' : 'Note'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-[10px] h-8 border-dashed text-muted-foreground hover:text-foreground px-1"
                                        onClick={() => setIsAddingDiscount(true)}
                                    >
                                        <Plus className="h-3 w-3 mr-0.5" />
                                        Discount
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

                        {/* Discount Section */}
                        <div className="space-y-2 mt-2">
                            {isAddingDiscount ? (
                                <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200 bg-muted/40 p-2 rounded border">
                                    <div className="flex gap-2">
                                        <select
                                            className="h-8 text-xs border rounded bg-background px-2"
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value as "percentage" | "flat" | "freebie" | "bxgy")}
                                        >
                                            <option value="percentage">%</option>
                                            <option value="flat">Flat</option>
                                            <option value="freebie">Freebie</option>
                                            <option value="bxgy">BXGY</option>
                                        </select>
                                        {discountType !== "bxgy" && (
                                            <Input
                                                type="number"
                                                placeholder={discountType === "percentage" ? "Percentage" : "Amount"}
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                className="h-8 text-xs flex-1"
                                                autoFocus
                                            />
                                        )}
                                    </div>

                                    {/* BXGY is a saved rule, not a typed amount — pick one and it
                                        gets evaluated against what's in the cart right now. */}
                                    {discountType === "bxgy" && (
                                        <div className="space-y-1 max-h-52 overflow-y-auto">
                                            {bxgyOffers.length === 0 ? (
                                                <p className="text-[11px] text-muted-foreground px-1 py-2">
                                                    No BXGY offers yet. Create one under Settings → Discounts.
                                                </p>
                                            ) : (
                                                bxgyOffers.map((offer) => {
                                                    const { repeat, amount } = evaluateBxgy(offer);
                                                    const qualifies = repeat > 0 && amount > 0;
                                                    return (
                                                        <button
                                                            key={offer.id}
                                                            type="button"
                                                            onClick={() => applyBxgyOffer(offer)}
                                                            disabled={!qualifies}
                                                            className={`w-full text-left rounded border px-2 py-1.5 text-[11px] transition ${
                                                                qualifies
                                                                    ? "bg-background hover:bg-muted"
                                                                    : "opacity-50 cursor-not-allowed bg-muted/40"
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-semibold font-mono">{offer.code}</span>
                                                                {qualifies ? (
                                                                    <span className="text-green-700 dark:text-green-400 font-medium">
                                                                        −{formatCurrency(amount)}
                                                                        {repeat > 1 ? ` (${repeat}×)` : ""}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">Doesn&apos;t qualify</span>
                                                                )}
                                                            </div>
                                                            <div className="text-muted-foreground">
                                                                {describeBxgy(offer, { nameOf: posMenuNameOf })}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    <Input
                                        placeholder="Reason (optional)"
                                        value={discountReason}
                                        onChange={(e) => setDiscountReason(e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setIsAddingDiscount(false)} className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                                            Cancel
                                        </Button>
                                        {discountType !== "bxgy" && (
                                            <Button size="sm" variant="ghost" onClick={handleAddDiscount} className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50">
                                                Apply Discount
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {discounts.length > 0 && (
                                <div className="space-y-1">
                                    {discounts.map((discount) => (
                                        <div key={discount.id} className="flex justify-between items-center text-xs bg-red-50 p-1.5 rounded text-red-700 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                                            <div className="flex flex-col">
                                                <span>{discount.type === "bxgy" ? `BXGY ${discount.code ?? ""}`.trim() : discount.type === "freebie" ? "Freebie (Free Item)" : discount.type === "percentage" ? `${discount.value}% Off` : `Flat ${formatCurrency(discount.value)} Off`}</span>
                                                {discount.reason && <span className="text-[10px] opacity-75">{discount.reason}</span>}
                                            </div>
                                            <button onClick={() => removeDiscount(discount.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Separator />


                        <div className="space-y-1.5 text-sm">
                            <div
                                className="flex justify-between font-bold text-lg cursor-pointer items-center py-2"
                                onClick={() => setShowBillDetails(!showBillDetails)}
                            >
                                <span className="flex items-center gap-2">
                                    Total
                                    {showBillDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                </span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>

                            {showBillDetails && (
                                <div className="space-y-1.5 animate-in slide-in-from-bottom-2 duration-200 border-t pt-2 border-dashed">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(effectiveFoodAmount)}</span>
                                    </div>
                                    {extraCharges.map((charge) => (
                                        <div key={charge.id} className="flex justify-between text-muted-foreground text-xs pl-2 border-l-2 border-muted">
                                            <span>{charge.name}</span>
                                            <span>{formatCurrency(charge.amount)}</span>
                                        </div>
                                    ))}
                                    {discounts.map((discount) => {
                                        const discountValue =
                                            discount.type === "freebie" || discount.type === "bxgy"
                                                ? discount.value
                                                : computeDiscountAmount(discount as any, subtotal);
                                        return (
                                            <div key={discount.id} className="flex justify-between text-green-600 text-xs pl-2 border-l-2 border-green-200">
                                                <span>
                                                    {discount.type === "bxgy" ? `BXGY${discount.bxgy_applied_times && discount.bxgy_applied_times > 1 ? ` ×${discount.bxgy_applied_times}` : ""}` : discount.type === "freebie" ? `Freebie${discount.reason ? `: ${discount.reason}` : ""} (FREE)` : discount.type === "percentage" ? `${discount.value}% Off` : "Flat Discount"}
                                                    {discount.type !== "freebie" && discount.reason && ` (${discount.reason})`}
                                                </span>
                                                <span>- {formatCurrency(discountValue)}</span>
                                            </div>
                                        );
                                    })}
                                    {(partnerData?.gst_percentage || 0) > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>GST ({partnerData?.gst_percentage}%)</span>
                                            <span>{formatCurrency(gstAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <Button
                                size="lg"
                                className={`w-full ${editingOrderId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white shadow-md hover:shadow-lg transition-all`}
                                onClick={handlePlaceOrder}
                                disabled={(cartItems.length === 0 && extraChargesTotal === 0) || isPlacingOrder || editLocked}
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
                                            activeOrderData.type === 'delivery' ? "Delivery" :
                                                (activeOrderData.type === 'table_order' || activeOrderData.type === 'pos') ? "Dine-in" :
                                                    activeOrderData.type
                                    }
                                </p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                {(userData?.role !== 'captain' || activeOrderData.status !== 'completed') &&
                                  !(isCompletedOrderLockEnabled(userData) && activeOrderData.status === 'completed') && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 gap-1 border-primary/30 text-primary hover:bg-primary/5"
                                        onClick={() => {
                                            loadOrderIntoCart(activeOrderData);
                                            setViewMode("current");
                                        }}
                                    >
                                        <span>✏️</span> Edit
                                    </Button>
                                )}
                                <Select
                                    value={activeOrderData.status}
                                    disabled={(userData?.role === 'captain' && activeOrderData.status === 'completed') || isCancelledOrderFrozen(activeOrderData, userData)}
                                    onValueChange={(val) => handleStatusUpdate(activeOrderData.id, val)}
                                >
                                    <SelectTrigger className={`w-[110px] h-7 text-xs border-none ${getStatusColor(activeOrderData.status)}`}>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isCompletedOrderLockEnabled(userData) && activeOrderData.status === 'completed' ? (
                                            <>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="accepted">Accepted</SelectItem>
                                                <SelectItem value="food_ready">Food Ready</SelectItem>
                                                <SelectItem value="dispatched">Dispatched</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
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
                                        </>
                                    )}
                                    {(activeOrderDataDiscountAmount > 0 || activeOrderDataDiscounts.some((d: any) => d.type === "freebie")) && (
                                        <>
                                            {activeOrderDataDiscounts.map((discount: any, idx: number) => {
                                                const discountValue = getDiscountAmount(discount, activeOrderDataTotal);
                                                return (
                                                    <div key={idx} className="flex flex-col text-green-600 text-xs pl-2 border-l-2 border-green-200 gap-0.5">
                                                        {discount.type === "freebie" && discount.freebie_item_names && (
                                                            <div className="flex justify-between">
                                                                <span>{discount.freebie_item_names} <span className="font-bold">(FREE)</span></span>
                                                                <span>{formatCurrency(discountValue)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between">
                                                            <span>
                                                                {discount.type === "bxgy" ? `BXGY${discount.bxgy_applied_times && discount.bxgy_applied_times > 1 ? ` ×${discount.bxgy_applied_times}` : ""}` : discount.type === "freebie" ? "Freebie Discount" : discount.type === "percentage" ? `${discount.value}% Off` : "Flat Discount"}
                                                                {discount.reason && ` (${discount.reason})`}
                                                            </span>
                                                            <span>- {formatCurrency(discountValue)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeOrderDataGstPercentage > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>GST ({activeOrderDataGstPercentage}%)</span>
                                            <span>{formatCurrency(activeOrderDataGstAmount)}</span>
                                        </div>
                                    )}
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Total</span>
                                    <span>{formatCurrency(activeOrderDataGrandTotal)}</span>
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
                                    <Button variant="outline" className="w-full" onClick={handlePrintKot}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        KOT
                                    </Button>
                                    {/* Prints both documents from one click — two separate print
                                        jobs, since KOT and bill usually go to different printers. */}
                                    <Button variant="outline" className="w-full col-span-2" onClick={handlePrintKotAndBill}>
                                        <Printer className="h-4 w-4 mr-2" />
                                        KOT + Bill
                                    </Button>
                                    {(userData?.role !== 'captain' || activeOrderData.status !== 'completed') &&
                                      !(isCompletedOrderLockEnabled(userData) && activeOrderData.status === 'completed') && (
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
                                                            order.type === 'delivery' ? "Delivery" :
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
