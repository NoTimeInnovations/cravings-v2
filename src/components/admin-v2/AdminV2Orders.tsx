"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Trash2, Eye, Printer, MoreVertical, ReceiptText, Search, CreditCard, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import useOrderStore, { Order } from "@/store/orderStore";
import { useAuthStore, Partner } from "@/store/authStore";
import { toast } from "sonner";
import { OrderStatusDisplay, toStatusDisplayFormat } from "@/lib/statusHistory";
import { OrderDetails } from "./OrderDetails";
import { getDateOnly } from "@/lib/formatDate";
import { useAdminStore } from "@/store/adminStore";
import { AdminV2AllOrders } from "./AdminV2AllOrders";
import { PaymentMethodChooseV2 } from "./PaymentMethodChooseV2";
import { AdminV2EditOrder } from "./AdminV2EditOrder";
import { Edit } from "lucide-react";

import { PasswordProtectionModal } from "./PasswordProtectionModal";

export function AdminV2Orders() {
    const { userData } = useAuthStore();
    const { selectedOrderId, setSelectedOrderId, setActiveView } = useAdminStore();
    const {
        deleteOrder,
        updateOrderStatus,
        updateOrderPaymentMethod,
    } = useOrderStore();

    const {
        orders,
        setOrders,
        removeOrder,
        loading,
        setLoading,
        totalCount,
        currentPage,
        limit,
        setTotalCount,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage,
    } = useOrderSubscriptionStore();

    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [actionDescription, setActionDescription] = useState("");

    const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

    const [viewMode, setViewMode] = useState<'live' | 'all'>('live');
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [orderType, setOrderType] = useState<string>("all");
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [orderToPrint, setOrderToPrint] = useState<string | null>(null);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const editingOrder = orders.find(o => o.id === editingOrderId) || null;

    const handleDeleteOrder = async (order: Order) => {
        if (order.status === "completed") {
            setPendingAction(() => async () => {
                if (confirm("Are you sure you want to delete this order?")) {
                    const success = await deleteOrder(order.id);
                    if (success) {
                        removeOrder(order.id);
                        toast.success("Order deleted successfully");
                    } else {
                        toast.error("Failed to delete order");
                    }
                }
            });
            setActionDescription("delete this completed order");
            setPasswordModalOpen(true);
            return;
        }

        if (confirm("Are you sure you want to delete this order?")) {
            const success = await deleteOrder(order.id);
            if (success) {
                removeOrder(order.id);
                toast.success("Order deleted successfully");
            } else {
                toast.error("Failed to delete order");
            }
        }
    };

    const handleEditOrder = (order: Order) => {
        if (order.status === "completed") {
            setPendingAction(() => () => setEditingOrderId(order.id));
            setActionDescription("edit this completed order");
            setPasswordModalOpen(true);
        } else {
            setEditingOrderId(order.id);
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, status: string) => {
        const order = orders.find(o => o.id === orderId);
        if (order?.status === "completed") {
            setPendingAction(() => async () => {
                try {
                    await updateOrderStatus(orders, orderId, status as any, setOrders);
                    toast.success("Order status updated");
                } catch (error) {
                    toast.error("Failed to update status");
                }
            });
            setActionDescription("update status of this completed order");
            setPasswordModalOpen(true);
            return;
        }

        try {
            await updateOrderStatus(orders, orderId, status as any, setOrders);
            toast.success("Order status updated");
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handlePrintBill = (order: Order) => {
        if (!order.payment_method) {
            setOrderToPrint(order.id);
            setPaymentModalOpen(true);
        } else {
            window.open(`/bill/${order.id}`, '_blank');
        }
    };

    const handlePaymentMethodConfirm = async (method: string) => {
        if (orderToPrint) {
            await updateOrderPaymentMethod(orderToPrint, method, orders, setOrders);
            setPaymentModalOpen(false);
            window.open(`/bill/${orderToPrint}`, '_blank');
            setOrderToPrint(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            case "accepted": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };



    if (editingOrderId && editingOrder) {
        return (
            <AdminV2EditOrder
                order={editingOrder}
                onBack={() => setEditingOrderId(null)}
            />
        );
    }

    if (selectedOrderId && selectedOrder) {
        return (
            <>
                <OrderDetails
                    order={selectedOrder}
                    onBack={() => setSelectedOrderId(null)}
                    onEdit={() => handleEditOrder(selectedOrder)}
                />
                <PasswordProtectionModal
                    isOpen={passwordModalOpen}
                    onClose={() => setPasswordModalOpen(false)}
                    onSuccess={() => pendingAction?.()}
                    actionDescription={actionDescription}
                />
            </>
        );
    } else if (selectedOrderId && !selectedOrder) {
        // Handle case where selected order is not in current list (e.g. pagination or not loaded yet)
        // For now, just show list or maybe a loading state? 
        // Or maybe we should fetch it? 
        // Given the requirement, let's just clear selection if not found to avoid getting stuck.
        // Or better, show a "Order not found" message with back button.
        return (
            <div className="p-4">
                <p>Order not found in current view.</p>
                <Button onClick={() => setSelectedOrderId(null)}>Back to Orders</Button>
            </div>
        );
    }

    if (viewMode === 'all') {
        return (
            <div className="space-y-4">
                <div className="flex justify-start">
                    <Button variant="outline" onClick={() => setViewMode('live')}>
                        Back to Live Orders
                    </Button>
                </div>
                <AdminV2AllOrders />
            </div>
        );
    }



    const getFilteredAndSortedOrders = () => {
        let result = [...orders];

        // Filter by order type
        if (orderType !== "all") {
            result = result.filter((order) => {
                if (orderType === "delivery") return order.type === "delivery";
                if (orderType === "table") return order.type === "table_order";
                if (orderType === "pos") return order.type === "pos";
                return true;
            });
        }

        // Filter by status
        if (filter !== "all") {
            result = result.filter((order) => order.status === filter);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((order) => {
                return (
                    order.id.toLowerCase().includes(query) ||
                    (order.user?.phone?.toLowerCase().includes(query) ?? false) ||
                    order.items.some((item) => item.name.toLowerCase().includes(query)) ||
                    order.phone?.includes(query) ||
                    (order.tableNumber?.toString().includes(query) ?? false)
                );
            });
        }

        // Sort results
        result.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();

            switch (sortBy) {
                case "newest":
                    return dateB - dateA;
                case "oldest":
                    return dateA - dateB;
                case "highest":
                    return b.totalPrice - a.totalPrice;
                case "lowest":
                    return a.totalPrice - b.totalPrice;
                default:
                    return dateB - dateA;
            }
        });

        return result;
    };

    const filteredOrders = getFilteredAndSortedOrders();

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col w-full md:w-auto gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search orders..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 min-w-[150px]">
                            <Select value={orderType} onValueChange={setOrderType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Order Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="delivery">Delivery</SelectItem>
                                    <SelectItem value="table">Table</SelectItem>
                                    <SelectItem value="pos">POS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 min-w-[150px]">
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 min-w-[150px]">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                    <SelectItem value="highest">Highest Amount</SelectItem>
                                    <SelectItem value="lowest">Lowest Amount</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={() => setViewMode('all')}
                >
                    Show All Orders
                </Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice ID</TableHead>
                            <TableHead>Table No</TableHead>
                            <TableHead>Payment method</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Order type</TableHead>
                            <TableHead>Order status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">
                                    {(Number(order.display_id) ?? 0) > 0
                                        ? `${order.display_id}-${getDateOnly(order.createdAt)}`
                                        : order.id.slice(0, 8)}
                                </TableCell>
                                <TableCell>
                                    {order.tableName || order.tableNumber || "N/A"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-gray-50 text-black dark:text-black">
                                        {order.payment_method || "N/A"}
                                    </Badge>
                                </TableCell>
                                <TableCell>{format(new Date(order.createdAt), "yyyy-MM-dd")}</TableCell>
                                <TableCell>{format(new Date(order.createdAt), "hh:mm a")}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="uppercase">
                                        {(order.type === 'delivery' && !order.deliveryAddress)
                                            ? "Takeaway"
                                            : (order.type === "table_order" ? "Dine-in" : order.type)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={order.status}
                                        onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}
                                    >
                                        <SelectTrigger className={`w-[130px] h-8 border-none ${getStatusColor(order.status)}`}>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="accepted">Accepted</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Printer className="h-4 w-4 text-blue-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => window.open(`/kot/${order.id}`, '_blank')}>
                                                    Print KOT
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handlePrintBill(order)}>
                                                    Print Bill
                                                </DropdownMenuItem>

                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => {
                                                setSelectedOrderId(order.id);
                                            }}
                                        >
                                            <ReceiptText className="h-4 w-4 text-green-500" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleDeleteOrder(order)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredOrders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No orders found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/40 p-3">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-sm font-medium">
                                    {(Number(order.display_id) ?? 0) > 0
                                        ? `Invoice #${order.display_id}-${getDateOnly(order.createdAt)}`
                                        : `Order #${order.id.slice(0, 8)}`}
                                </CardTitle>
                                <Select
                                    value={order.status}
                                    onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}
                                >
                                    <SelectTrigger className={`w-[110px] h-7 text-xs border-none ${getStatusColor(order.status)}`}>
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
                        </CardHeader>
                        <CardContent className="p-3 space-y-3">
                            <div className="flex flex-col gap-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{order.tableName || order.tableNumber || "N/A"}</span>
                                    </div>
                                    <Badge variant="outline" className="capitalize text-xs">
                                        {(order.type === 'delivery' && !order.deliveryAddress)
                                            ? "Takeaway"
                                            : (order.type === "table_order" ? "Dine-in" : order.type)}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{format(new Date(order.createdAt), "hh:mm a")}</span>
                                    </div>
                                    {order.payment_method && (
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                            <span className="capitalize">{order.payment_method}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/10 p-2 flex justify-between border-t">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8">
                                        <Printer className="h-4 w-4 mr-2" /> Print
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => window.open(`/kot/${order.id}`, '_blank')}>
                                        Print KOT
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handlePrintBill(order)}>
                                        Print Bill
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600"
                                    onClick={() => setSelectedOrderId(order.id)}
                                >
                                    <ReceiptText className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500"
                                    onClick={() => handleDeleteOrder(order)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
                {filteredOrders.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        No orders found
                    </div>
                )}
            </div>

            {/* Pagination Controls - Reusing logic from OrdersTab if needed, or simple buttons */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={previousPage}
                    disabled={!hasPreviousPage}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={!hasNextPage}
                >
                    Next
                </Button>
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
                actionDescription={actionDescription}
            />
        </div >
    );
}
