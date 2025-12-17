"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

import { Loader2, Search, Printer, ReceiptText, Trash2, MapPin, CreditCard, Clock } from "lucide-react";
import { Partner, useAuthStore } from "@/store/authStore";
import useOrderStore, { Order } from "@/store/orderStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePOSStore } from "@/store/posStore";
import { EditOrderModal } from "@/components/admin/pos/EditOrderModal";
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
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { getDateOnly } from "@/lib/formatDate";
import { OrderDetails } from "./OrderDetails";
import { PaymentMethodChooseV2 } from "./PaymentMethodChooseV2";
import { AdminV2EditOrder } from "./AdminV2EditOrder";

export function AdminV2AllOrders() {
    const { fetchOrderOfPartner, deleteOrder, updateOrderStatus, updateOrderPaymentMethod } = useOrderStore();
    const { setEditOrderModalOpen, setOrder } = usePOSStore();
    const { userData } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [orderType, setOrderType] = useState<string>("all");
    const [orders, setOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [orderToPrint, setOrderToPrint] = useState<string | null>(null);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const editingOrder = orders.find(o => o.id === editingOrderId) || null;

    useEffect(() => {
        const loadOrders = async () => {
            if (userData?.id) {
                setLoading(true);
                setError(null);
                try {
                    const partnerOrders = await fetchOrderOfPartner(userData.id);
                    if (partnerOrders) {
                        setOrders(partnerOrders);
                    } else {
                        setError("Failed to load orders");
                    }
                } catch (error) {
                    console.error("Failed to fetch orders:", error);
                    setError("Failed to load orders. Please try again.");
                    toast.error("Failed to load orders");
                } finally {
                    setLoading(false);
                }
            }
        };

        loadOrders();
    }, [userData?.id, fetchOrderOfPartner]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, sortBy, searchQuery, orderType]);

    const handleDeleteOrder = async (orderId: string) => {
        if (confirm("Are you sure you want to delete this order?")) {
            try {
                const success = await deleteOrder(orderId);
                if (success) {
                    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
                    toast.success("Order deleted successfully");
                    return true;
                } else {
                    toast.error("Failed to delete order");
                    return false;
                }
            } catch (error) {
                console.error("Error deleting order:", error);
                toast.error("Failed to delete order");
                return false;
            }
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, status: string) => {
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
            case "ready": return "bg-purple-100 text-purple-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

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
    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );



    if (editingOrderId && editingOrder) {
        return (
            <AdminV2EditOrder
                order={editingOrder}
                onBack={() => setEditingOrderId(null)}
            />
        );
    }

    if (selectedOrder) {
        return (
            <OrderDetails
                order={selectedOrder}
                onBack={() => setSelectedOrder(null)}
                onEdit={() => setEditingOrderId(selectedOrder.id)}
            />
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold">All Orders History</h1>

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
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin h-8 w-8" />
                </div>
            ) : (
                <div className="space-y-4">
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
                                {paginatedOrders.map((order) => (
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
                                                defaultValue={order.status}
                                                onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}
                                            >
                                                <SelectTrigger className={`w-[130px] h-8 border-none ${getStatusColor(order.status)}`}>
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
                                                    onClick={() => setSelectedOrder(order)}
                                                >
                                                    <ReceiptText className="h-4 w-4 text-green-500" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {paginatedOrders.length === 0 && (
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
                        {paginatedOrders.map((order) => (
                            <Card key={order.id} className="overflow-hidden">
                                <CardHeader className="bg-muted/40 p-3">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-medium">
                                            {(Number(order.display_id) ?? 0) > 0
                                                ? `Invoice #${order.display_id}-${getDateOnly(order.createdAt)}`
                                                : `Order #${order.id.slice(0, 8)}`}
                                        </CardTitle>
                                        <Select
                                            defaultValue={order.status}
                                            onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}
                                        >
                                            <SelectTrigger className={`w-[110px] h-7 text-xs border-none ${getStatusColor(order.status)}`}>
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
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{order.tableName || order.tableNumber || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 justify-end">
                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                            <span className="capitalize">{order.payment_method || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>{format(new Date(order.createdAt), "hh:mm a")}</span>
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {(order.type === 'delivery' && !order.deliveryAddress)
                                                    ? "Takeaway"
                                                    : (order.type === "table_order" ? "Dine-in" : order.type)}
                                            </Badge>
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
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <ReceiptText className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={() => handleDeleteOrder(order.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                        {paginatedOrders.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No orders found
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <div className="text-sm text-muted-foreground mr-4">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <EditOrderModal />
            <PaymentMethodChooseV2
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onConfirm={handlePaymentMethodConfirm}
            />
        </div>
    );
}