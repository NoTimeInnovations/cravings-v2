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
import {
  FileText,
  Trash2,
  Eye,
  Printer,
  MoreVertical,
  ReceiptText,
  Search,
  CreditCard,
  Clock,
  MapPin,
  Table2,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import useOrderStore, { Order } from "@/store/orderStore";
import { useAuthStore, Partner } from "@/store/authStore";
import { toast } from "sonner";
import { OrderStatusDisplay, toStatusDisplayFormat } from "@/lib/statusHistory";
import { OrderDetails } from "./OrderDetails";
import { PickupOtpBadge } from "./PickupOtpBadge";
import { getDateOnly } from "@/lib/formatDate";
import { useAdminStore } from "@/store/adminStore";
import { AdminV2AllOrders } from "./AdminV2AllOrders";
import { PaymentMethodChooseV2 } from "./PaymentMethodChooseV2";
import { AdminV2EditOrder } from "./AdminV2EditOrder";
import { Edit, FileClock, CalendarClock } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { expireCfOrder } from "@/app/actions/cfOrders";
import { getFeatures } from "@/lib/getFeatures";
import { formatPrebookDateLabel, formatPrebookSlotLabel, parsePrebookingSettings } from "@/lib/prebooking";

import { PasswordProtectionModal } from "./PasswordProtectionModal";
import { CancelOrderDialog } from "@/components/CancelOrderDialog";

export function AdminV2Orders() {
  const { userData } = useAuthStore();
  const { selectedOrderId, setSelectedOrderId, setActiveView } =
    useAdminStore();
  const { deleteOrder, updateOrderStatus, updateOrderPaymentMethod, subscribeDraftOrders } =
    useOrderStore();

  // Draft orders = online orders still processing payment (status
  // "pending_payment"). Kept out of the live feed/notifications; shown only when
  // the "Draft Orders" toggle is on, rendered in the SAME table/cards as orders.
  const [drafts, setDrafts] = useState<Order[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [clearingDrafts, setClearingDrafts] = useState(false);
  // Prebookings = live orders scheduled for later (have a scheduled_date). They
  // are kept out of the normal live feed and shown only when this toggle is on.
  const [showPrebookings, setShowPrebookings] = useState(false);
  useEffect(() => {
    const unsubscribe = subscribeDraftOrders((d) => setDrafts(d));
    return () => unsubscribe();
  }, [subscribeDraftOrders]);

  // Drafts are no longer auto-expired by the reconcile cron — partners clear
  // them here. expireCfOrder soft-deletes the unpaid order (status "expired")
  // and refunds any loyalty points it had redeemed; the draft subscription
  // (status = pending_payment) then drops it from the list automatically.
  const handleClearDrafts = async () => {
    if (!drafts.length || clearingDrafts) return;
    if (
      !window.confirm(
        `Clear ${drafts.length} draft order${drafts.length > 1 ? "s" : ""}? These are unpaid online orders that were never completed.`,
      )
    )
      return;
    setClearingDrafts(true);
    try {
      const results = await Promise.allSettled(drafts.map((d) => expireCfOrder(d.id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) toast.error(`Cleared with ${failed} error${failed > 1 ? "s" : ""}`);
      else toast.success("Draft orders cleared");
    } catch (e) {
      console.error("clear drafts failed", e);
      toast.error("Failed to clear drafts");
    } finally {
      setClearingDrafts(false);
    }
  };

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

  // Partner's configured slot ranges, used to show a booked slot as "from – to".
  const prebookCfg = parsePrebookingSettings((userData as any)?.prebooking_settings);

  // Prebookings are live orders scheduled for a future date/slot.
  const prebookings = orders.filter((o) => !!o.scheduled_date);
  // Badge count reflects only actionable prebookings — terminal ones
  // (completed/cancelled) need no attention. Normalize the status so casing or
  // stray whitespace in the stored value can't slip a terminal order through.
  const isTerminalStatus = (status?: string | null) => {
    const s = (status || "").trim().toLowerCase();
    return s === "completed" || s === "cancelled" || s === "canceled";
  };
  const activePrebookingsCount = prebookings.filter(
    (o) => !isTerminalStatus(o.status),
  ).length;

  // When the Draft Orders toggle is on, the whole view operates on drafts.
  // When Prebookings is on, only scheduled orders are shown. Otherwise the
  // normal live feed excludes prebookings so they stay separated.
  const activeOrders = showDrafts
    ? drafts
    : showPrebookings
      ? prebookings
      : orders.filter((o) => !o.scheduled_date);

  const selectedOrder = activeOrders.find((o) => o.id === selectedOrderId) || null;

  const [viewMode, setViewMode] = useState<"live" | "all">("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [orderType, setOrderType] = useState<string>("all");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const cancellingOrder = activeOrders.find((o) => o.id === cancellingOrderId) || null;
  const editingOrder = activeOrders.find((o) => o.id === editingOrderId) || null;

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
    const order = orders.find((o) => o.id === orderId);

    if (!order) return;

    if (status === "cancelled") {
      if (order.status !== "pending") {
        toast.error(
          `Only pending orders can be cancelled (current status: ${order.status})`,
        );
        return;
      }
      setCancellingOrderId(orderId);
      return;
    }

    if (order.status === "completed") {
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

  const checkAndCompleteOrder = async (order: Order) => {
    if (order.status === "accepted") {
      try {
        // Always update Order Status to completed first
        await updateOrderStatus(orders, order.id, "completed", setOrders);
        let message = "Order marked as completed";

        // Removed table unlocking logic

        toast.success(message);
      } catch (err) {
        console.error("Auto-complete error:", err);
        toast.error("Failed to auto-complete order");
      }
    }
  };

  const handlePrintBill = async (order: Order) => {
    await checkAndCompleteOrder(order);
    if (!order.payment_method) {
      setOrderToPrint(order.id);
      setPaymentModalOpen(true);
    } else {
      window.open(`/bill/${order.id}`, "_blank");
    }
  };

  const handlePaymentMethodConfirm = async (method: string) => {
    if (orderToPrint) {
      await updateOrderPaymentMethod(orderToPrint, method, orders, setOrders);
      setPaymentModalOpen(false);

      // Re-fetch order or find it to update check logic?
      // The order object passed to checkAndCompleteOrder needs to be fresh or we use the ID.
      // But handlePaymentMethodConfirm uses orderToPrint ID.
      const updatedOrder = orders.find((o) => o.id === orderToPrint);
      if (updatedOrder) {
        await checkAndCompleteOrder(updatedOrder);
      }

      window.open(`/bill/${orderToPrint}`, "_blank");
      setOrderToPrint(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "food_ready":
        return "bg-orange-100 text-orange-800";
      case "dispatched":
        return "bg-purple-100 text-purple-900";
      default:
        return "bg-gray-100 text-gray-800";
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

  if (viewMode === "all") {
    return (
      <div className="space-y-4">
        <div className="flex justify-start">
          <Button variant="outline" onClick={() => setViewMode("live")}>
            Back to Live Orders
          </Button>
        </div>
        <AdminV2AllOrders />
      </div>
    );
  }

  const getFilteredAndSortedOrders = () => {
    let result = [...activeOrders];

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

  // Show the Growjet booking column for any partner who has the
  // growjet_delivery feature flag granted (access=true), regardless of whether
  // they currently have it toggled on. Reading the flag from the logged-in
  // partner keeps column visibility stable across pages.
  const partnerFeatures = getFeatures((userData as Partner)?.feature_flags || null);
  const showGrowjetColumn = partnerFeatures.growjet_delivery.access;

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
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="food_ready">Food Ready</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
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

        <div className="flex items-center gap-2">
          <Button
            variant={showPrebookings ? "default" : "outline"}
            onClick={() =>
              setShowPrebookings((v) => {
                const next = !v;
                if (next) setShowDrafts(false);
                return next;
              })
            }
            className="relative gap-2"
          >
            <CalendarClock className="h-4 w-4" />
            {showPrebookings ? "Back to Orders" : "Prebookings"}
            {activePrebookingsCount > 0 && (
              <Badge className="absolute -right-2 -top-2 bg-blue-600 px-1.5 text-white hover:bg-blue-600">
                {activePrebookingsCount}
              </Badge>
            )}
          </Button>
          {!showDrafts && !showPrebookings && (
            <Button variant="outline" onClick={() => setViewMode("all")}>
              Show All Orders
            </Button>
          )}
          <Button
            variant={showDrafts ? "default" : "outline"}
            onClick={() =>
              setShowDrafts((v) => {
                const next = !v;
                if (next) setShowPrebookings(false);
                return next;
              })
            }
            className="gap-2"
          >
            <FileClock className="h-4 w-4" />
            {showDrafts ? "Back to Orders" : "Draft Orders"}
            {drafts.length > 0 && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500 ml-1">
                {drafts.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {showDrafts && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50/60 px-4 py-2 text-sm text-amber-800">
          <span>
            Showing <b>draft orders</b> — online orders whose payment is still processing. Not
            confirmed yet, so they don&apos;t appear in the normal list or trigger alerts.
          </span>
          {drafts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDrafts}
              disabled={clearingDrafts}
              className="shrink-0 gap-1.5 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearingDrafts ? "Clearing…" : "Clear drafts"}
            </Button>
          )}
        </div>
      )}

      {showPrebookings && (
        <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50/60 px-4 py-2 text-sm text-blue-800">
          <span>
            Showing <b>prebookings</b> — orders scheduled for a later date or slot.
            They are kept separate from the live orders list.
          </span>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Table / Location</TableHead>
              <TableHead>Payment method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Order type</TableHead>
              {showGrowjetColumn && <TableHead>Delivery Agent</TableHead>}
              <TableHead>Order status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow
                key={order.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedOrderId(order.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <span>
                      {(Number(order.display_id) ?? 0) > 0
                        ? `${order.display_id}-${getDateOnly(order.createdAt)}`
                        : order.id.slice(0, 8)}
                    </span>
                    <PickupOtpBadge
                      meta={order.delivery_provider_meta}
                      status={order.status}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {order.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {order.tableName ||
                    order.tableNumber ||
                    order.deliveryAddress ||
                    "N/A"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-gray-50 text-black dark:text-black"
                  >
                    {order.payment_method || "N/A"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(order.createdAt), "yyyy-MM-dd")}
                </TableCell>
                <TableCell>
                  {format(new Date(order.createdAt), "hh:mm a")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="secondary" className="uppercase">
                      {order.type === "delivery" && !order.deliveryAddress
                        ? "Takeaway"
                        : order.type === "table_order"
                          ? "Dine-in"
                          : order.type}
                    </Badge>
                    {order.scheduled_date && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 whitespace-nowrap">
                        {order.booking_persons ? "Table" : "Prebooked"} · {formatPrebookDateLabel(order.scheduled_date)}
                        {order.scheduled_time ? ` · ${formatPrebookSlotLabel(prebookCfg, order.scheduled_date, order.scheduled_time, { dineIn: !!order.booking_persons, to: order.scheduled_time_to })}` : ""}
                      </Badge>
                    )}
                    {order.booking_persons != null && order.booking_persons > 1 && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 whitespace-nowrap gap-1">
                        <Users className="h-3 w-3" /> {order.booking_persons}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {showGrowjetColumn && (
                  <TableCell>
                    {order.growjet_order_number ? (
                      <Badge className="bg-green-100 text-green-800">
                        ✓ {order.growjet_order_number}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Nil
                      </Badge>
                    )}
                  </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={order.status}
                    onValueChange={(val) =>
                      handleUpdateOrderStatus(order.id, val)
                    }
                  >
                    <SelectTrigger
                      className={`w-[130px] h-8 border-none ${getStatusColor(order.status)}`}
                    >
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="food_ready">Food Ready</SelectItem>
                      <SelectItem value="dispatched">Dispatched</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div
                    className="flex items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Printer className="h-4 w-4 text-blue-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(`/kot/${order.id}`, "_blank")
                          }
                        >
                          Print KOT
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handlePrintBill(order)}
                        >
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
                <TableCell
                  colSpan={showGrowjetColumn ? 10 : 9}
                  className="text-center py-8 text-muted-foreground"
                >
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
          <Card
            key={order.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedOrderId(order.id)}
          >
            <CardHeader className="bg-muted/40 p-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {(Number(order.display_id) ?? 0) > 0
                      ? `Invoice No: ${order.display_id}-${getDateOnly(order.createdAt)}`
                      : `Order #${order.id.slice(0, 8)}`}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    ID: #{order.id.slice(0, 8)}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={order.status}
                    onValueChange={(val) =>
                      handleUpdateOrderStatus(order.id, val)
                    }
                  >
                    <SelectTrigger
                      className={`w-[110px] h-7 text-xs border-none ${getStatusColor(order.status)}`}
                    >
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="food_ready">Food Ready</SelectItem>
                      <SelectItem value="dispatched">Dispatched</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-start gap-2">
                    {order.tableName || order.tableNumber ? (
                      <Table2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                    ) : (
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                    )}
                    <span className="font-medium break-words">
                      {order.tableName ||
                        order.tableNumber ||
                        order.deliveryAddress ||
                        "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 justify-end">
                    <Badge variant="outline" className="capitalize text-xs">
                      {order.type === "delivery" && !order.deliveryAddress
                        ? "Takeaway"
                        : order.type === "table_order"
                          ? "Dine-in"
                          : order.type}
                    </Badge>
                    {order.scheduled_date && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs whitespace-nowrap">
                        {order.booking_persons ? "Table" : "Prebooked"} · {formatPrebookDateLabel(order.scheduled_date)}
                        {order.scheduled_time ? ` · ${formatPrebookSlotLabel(prebookCfg, order.scheduled_date, order.scheduled_time, { dineIn: !!order.booking_persons, to: order.scheduled_time_to })}` : ""}
                      </Badge>
                    )}
                    {order.booking_persons != null && order.booking_persons > 1 && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs whitespace-nowrap gap-1">
                        <Users className="h-3 w-3" /> {order.booking_persons}
                      </Badge>
                    )}
                  </div>
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
                {showGrowjetColumn && (
                  <div className="flex items-center gap-2">
                    {order.growjet_order_number ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Growjet ✓ {order.growjet_order_number}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        Growjet: Nil
                      </Badge>
                    )}
                  </div>
                )}
                <PickupOtpBadge
                  meta={order.delivery_provider_meta}
                  status={order.status}
                />
              </div>
            </CardContent>
            <CardFooter
              className="bg-muted/10 p-2 flex justify-between border-t"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8">
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => window.open(`/kot/${order.id}`, "_blank")}
                  >
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

      {/* Pagination Controls - hidden in draft view (drafts are a single list) */}
      <div className={`flex items-center justify-end space-x-2 py-4 ${showDrafts ? "hidden" : ""}`}>
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

      {cancellingOrder && (
        <CancelOrderDialog
          open={!!cancellingOrderId}
          onOpenChange={(o) => {
            if (!o) setCancellingOrderId(null);
          }}
          orderId={cancellingOrder.id}
          orderShortId={cancellingOrder.display_id || cancellingOrder.id.slice(0, 8)}
          isPetpooja={!!(userData as Partner)?.petpooja_restaurant_id}
        />
      )}
    </div>
  );
}
