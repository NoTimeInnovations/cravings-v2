import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Order } from "@/store/orderStore";
import { Partner, useAuthStore } from "@/store/authStore";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import useOrderStore from "@/store/orderStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { toast } from "sonner";
import { Printer, Edit, MapPin, Phone } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentMethodChooseV2 } from "./PaymentMethodChooseV2";
import { PasswordProtectionModal } from "./PasswordProtectionModal";
import { fetchFromHasura } from "@/lib/hasuraClient";


import { getExtraCharge } from "@/lib/getExtraCharge";

interface OrderDetailsProps {
    order: Order | null;
    onBack: () => void;
    onEdit?: () => void;
}

export function OrderDetails({ order, onBack, onEdit }: OrderDetailsProps) {
    const { userData } = useAuthStore();
    const { updateOrderStatus, updateOrderPaymentMethod } = useOrderStore();
    const { setOrders, orders } = useOrderSubscriptionStore();
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = React.useState(false);
    const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);

    if (!order) return null;

    const handleUpdateOrderStatus = async (status: string) => {
        if (order.status === "completed") {
            setPendingAction(() => async () => {
                try {
                    await updateOrderStatus(orders, order.id, status as any, setOrders);
                    toast.success("Order status updated");
                } catch (error) {
                    toast.error("Failed to update status");
                }
            });
            setPasswordModalOpen(true);
            return;
        }

        try {
            await updateOrderStatus(orders, order.id, status as any, setOrders);
            toast.success("Order status updated");


        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handlePrint = async (type: 'bill' | 'kot') => {
        if (type === 'bill') {
            if (order.status === 'accepted') {
                try {
                    await updateOrderStatus(orders, order.id, 'completed', setOrders);
                    toast.success("Order marked as completed");

                } catch (error) {
                    console.error("Error updating order status on print:", error);
                }
            }

            if (!order.payment_method) {
                setPaymentModalOpen(true);
            } else {
                window.open(`/bill/${order.id}`, '_blank');
            }
        } else {
            window.open(`/kot/${order.id}`, '_blank');
        }
    };

    const handlePaymentMethodConfirm = async (method: string) => {
        await updateOrderPaymentMethod(order.id, method, orders, setOrders);
        setPaymentModalOpen(false);

        // Also perform completion logic if it wasn't already accepted/completed
        if (order.status === 'accepted') {
            try {
                await updateOrderStatus(orders, order.id, 'completed', setOrders);

            } catch (e) { console.error(e); }
        }

        window.open(`/bill/${order.id}`, '_blank');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            case "accepted": return "bg-blue-100 text-blue-800";
            case "dispatched": return "bg-purple-100 text-purple-900";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    // Calculate totals
    const currency = (userData as Partner)?.currency || "₹";
    const gstPercentage = (userData as Partner)?.gst_percentage || 0;

    const foodSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const chargesSubtotal = (order.extraCharges || []).reduce((sum, charge) => {
        return sum + getExtraCharge(
            order.items,
            charge.amount,
            charge.charge_type as any
        );
    }, 0);

    const subtotal = foodSubtotal + chargesSubtotal;

    const discounts = order.discounts || [];
    const discountAmount = discounts.reduce((total, discount) => {
        if (discount.type === "flat") {
            return total + discount.value;
        } else {
            return total + (subtotal * discount.value) / 100;
        }
    }, 0);

    const discountedTaxableAmount = Math.max(0, subtotal - discountAmount);
    const gstAmount = (discountedTaxableAmount * gstPercentage) / 100;
    const grandTotal = discountedTaxableAmount + gstAmount;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold">Order #{order.display_id}</h2>
                            <Badge className={getStatusColor(order.status)}>
                                {order.status.toUpperCase()}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            {format(new Date(order.createdAt), "PPP p")}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">ID: #{order.id.slice(0, 8)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                    <Select
                        value={order.status}
                        onValueChange={handleUpdateOrderStatus}
                    >
                        <SelectTrigger className={`w-[130px] ${getStatusColor(order.status)} border-none shrink-0`}>
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

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="shrink-0">
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePrint('kot')}>
                                Print KOT
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint('bill')}>
                                Print Bill
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {onEdit && (
                        <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold mb-3">Customer Details</h3>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Order Info:</span>
                            <div className="flex gap-2">
                                {(order.tableName || (order.tableNumber && order.tableNumber !== 0)) && (
                                    <Badge variant="outline" className="font-medium">
                                        Table: {order.tableName || order.tableNumber}
                                    </Badge>
                                )}
                                <Badge variant="secondary" className="font-medium capitalize">
                                    {(order.type === 'delivery' && !order.deliveryAddress)
                                        ? "Takeaway"
                                        : (order.type === "table_order" ? "Dine-in" : order.type)}
                                </Badge>
                            </div>
                        </div>
                        {(order.phone || order.user?.phone) && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Phone:</span>
                                <a
                                    href={`tel:${order.phone || order.user?.phone}`}
                                    className="font-medium flex items-center gap-1.5 text-blue-600 hover:underline"
                                >
                                    <Phone className="h-3.5 w-3.5" />
                                    {order.phone || order.user?.phone}
                                </a>
                            </div>
                        )}
                        {order.deliveryAddress && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-medium text-right">{order.deliveryAddress}</span>
                            </div>
                        )}
                        {order.delivery_location?.coordinates && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Location:</span>
                                <a
                                    href={`https://www.google.com/maps?q=${order.delivery_location.coordinates[1]},${order.delivery_location.coordinates[0]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium flex items-center gap-1.5 text-blue-600 hover:underline"
                                >
                                    <MapPin className="h-3.5 w-3.5" />
                                    View on Google Maps
                                </a>
                            </div>
                        )}
                        {order.notes && (
                            <div className="pt-2 border-t mt-2">
                                <span className="text-muted-foreground block mb-1">Order Note:</span>
                                <p className="text-sm">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {order.payment_method && (
                <div className="border rounded-lg bg-card p-4">
                    <h3 className="font-semibold mb-3">Payment Details</h3>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Method:</span>
                            <span className="font-medium">{order.payment_method}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b">
                    <h3 className="font-semibold">Order Items</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {order.items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{currency}{item.price}</TableCell>
                                <TableCell className="text-right">{currency}{item.price * item.quantity}</TableCell>
                            </TableRow>
                        ))}

                        {/* Subtotal */}
                        <TableRow className="bg-muted/50 font-medium border-t-2">
                            <TableCell colSpan={3} className="text-right">
                                Subtotal
                            </TableCell>
                            <TableCell className="text-right">
                                {currency}{subtotal.toFixed(2)}
                            </TableCell>
                        </TableRow>

                        {/* Extra Charges */}
                        {(order.extraCharges || []).map((charge, index) => (
                            <TableRow key={`charge-${index}`} className="bg-muted/50 font-medium text-muted-foreground">
                                <TableCell colSpan={3} className="text-right text-sm">
                                    {charge.name}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                    {currency}
                                    {getExtraCharge(
                                        order.items,
                                        charge.amount,
                                        charge.charge_type as any
                                    ).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Discounts */}
                        {discountAmount > 0 && (
                            <TableRow className="bg-muted/50 font-medium">
                                <TableCell colSpan={3} className="text-right">
                                    Discount
                                </TableCell>
                                <TableCell className="text-right text-red-600">
                                    - {currency}{discountAmount.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        )}


                        {/* GST/VAT */}
                        {gstAmount > 0 && (
                            <TableRow className="bg-muted/50 font-medium">
                                <TableCell colSpan={3} className="text-right">
                                    {(userData as Partner)?.country === "United Arab Emirates" ? "VAT" : "GST"} ({gstPercentage}%)
                                </TableCell>
                                <TableCell className="text-right">
                                    {currency}{gstAmount.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Total Amount */}
                        <TableRow className="bg-muted/50 font-bold text-lg border-t-2">
                            <TableCell colSpan={3} className="text-right">Total Amount</TableCell>
                            <TableCell className="text-right">
                                {currency}{grandTotal.toFixed(2)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <PaymentMethodChooseV2
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onConfirm={handlePaymentMethodConfirm}
            />

            <PasswordProtectionModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
                onSuccess={() => pendingAction?.()}
                actionDescription="edit this completed order"
            />
        </div >
    );
}
