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
import { Printer, Edit } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentMethodChooseV2 } from "./PaymentMethodChooseV2";

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

    if (!order) return null;

    const handleUpdateOrderStatus = async (status: string) => {
        try {
            await updateOrderStatus(orders, order.id, status as any, setOrders);
            toast.success("Order status updated");
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handlePrint = (type: 'bill' | 'kot') => {
        if (type === 'bill' && !order.payment_method) {
            setPaymentModalOpen(true);
        } else {
            window.open(`/${type}/${order.id}`, '_blank');
        }
    };

    const handlePaymentMethodConfirm = async (method: string) => {
        await updateOrderPaymentMethod(order.id, method, orders, setOrders);
        setPaymentModalOpen(false);
        window.open(`/bill/${order.id}`, '_blank');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            case "accepted": return "bg-blue-100 text-blue-800";
            case "ready": return "bg-purple-100 text-purple-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

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
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        defaultValue={order.status}
                        onValueChange={handleUpdateOrderStatus}
                    >
                        <SelectTrigger className={`w-[140px] ${getStatusColor(order.status)} border-none`}>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
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
                        <Button variant="outline" size="sm" onClick={onEdit}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Order
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold mb-3">Customer Details</h3>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Table:</span>
                            <span className="font-medium">{order.tableName || order.tableNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium capitalize">{order.type}</span>
                        </div>
                        {order.deliveryAddress && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-medium text-right">{order.deliveryAddress}</span>
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
                <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold mb-3">Payment Details</h3>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Method:</span>
                            <span className="font-medium">{order.payment_method || "N/A"}</span>
                        </div>

                    </div>
                </div>
            </div>

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
                                <TableCell className="text-right">{(userData as Partner)?.currency || "₹"}{item.price}</TableCell>
                                <TableCell className="text-right">{(userData as Partner)?.currency || "₹"}{item.price * item.quantity}</TableCell>
                            </TableRow>
                        ))}
                        {(order.gstIncluded || 0) > 0 && (
                            <TableRow className="bg-muted/50 font-medium">
                                <TableCell colSpan={3} className="text-right">
                                    {(userData as Partner)?.country === "United Arab Emirates" ? "VAT" : "GST"} ({(userData as Partner)?.gst_percentage}%)
                                </TableCell>
                                <TableCell className="text-right">
                                    {(userData as Partner)?.currency || "₹"}{order.gstIncluded}
                                </TableCell>
                            </TableRow>
                        )}
                        <TableRow className="bg-muted/50 font-medium">
                            <TableCell colSpan={3} className="text-right">Total Amount</TableCell>
                            <TableCell className="text-right text-lg">
                                {(userData as Partner)?.currency || "₹"}{order.totalPrice}
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
        </div >
    );
}
