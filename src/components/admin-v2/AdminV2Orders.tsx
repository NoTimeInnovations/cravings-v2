"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Printer,
  MoreVertical,
  ReceiptText,
  Search,
  CreditCard,
  Clock,
  MapPin,
  Table2,
  Users,
  AlarmClock,
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
import { formatPrebookDateLabel, formatPrebookSlotLabel, parsePrebookingSettings, ymd } from "@/lib/prebooking";

import { PasswordProtectionModal } from "./PasswordProtectionModal";
import { CancelOrderDialog } from "@/components/CancelOrderDialog";
import { AssignDriverDialog } from "./AssignDriverDialog";
import { isCompletedOrderLockEnabled, isCancelledOrderFrozen, isOrderCompleted } from "@/lib/orderStatus";
import { useHasOwnDrivers } from "@/hooks/useHasOwnDrivers";
import { shouldPickOwnDriverOnDispatch } from "@/lib/ownDriverDispatch";
import { getOrderTypeLabel, getPaymentDisplayLabel } from "@/lib/orderLabels";

// Payment label for the orders list. POS orders show their chosen method
// (Cash / UPI / Card / "Not selected"); customer orders show "Prepaid" (paid
// online, gateway name hidden) or "COD". Shared with Settlements so the whole
// dashboard agrees.
const getPaymentModeLabel = (order: Order): string =>
  getPaymentDisplayLabel(order);

// "Table / Location" column value, by order type:
//  - dine-in / table order → "Table: <number>" (or the table's name if unnumbered)
//  - takeaway (a delivery order with no drop address) → "Takeaway"
//  - real delivery → the drop address (as before)
const getTableLocationLabel = (order: Order): string => {
  if (order.type === "table_order" || order.tableNumber != null || order.tableName) {
    if (order.tableNumber != null) return `Table: ${order.tableNumber}`;
    if (order.tableName) return order.tableName;
    return "Table";
  }
  if (order.type === "delivery" && !order.deliveryAddress) return "Takeaway";
  return order.deliveryAddress || "N/A";
};

// A prebooking is "due soon" — and floats to the top of the screen — once its
// slot is within this window. Already-overdue slots stay due-soon (negative
// difference) so a missed one never quietly drops off.
const PREBOOK_DUE_SOON_MS = 60 * 60 * 1000;
// How far ahead the prebooking subscription looks. Bounded so the query stays
// tiny; anything further out is still reachable from "Show All Orders".
const PREBOOK_LOOKAHEAD_DAYS = 30;
// ...and how far BACK. A booking is only dropped from this list when it is
// completed or cancelled, so a 9 PM slot nobody closed is still open work at
// 00:01 — starting the window at "today" would have made it vanish at midnight
// exactly when it became most overdue. One day is enough to cover the late shift
// that runs past midnight without dragging in stale rows the partner has moved
// on from (those stay reachable from "Show All Orders").
const PREBOOK_LOOKBACK_DAYS = 1;
// Sort choice is remembered per device, scoped to the partner so two logins on
// the same browser don't fight over it (same pattern as the other admin-v2
// local UI prefs).
const sortPrefKey = (partnerId?: string | null) =>
  `adminv2_orders_sort_${partnerId || "anon"}`;

// Terminal orders need no attention. Normalized so casing or stray whitespace in
// the stored value (or the "canceled" spelling) can't slip one through.
const isTerminalStatus = (status?: string | null) => {
  const s = (status || "").trim().toLowerCase();
  return s === "completed" || s === "cancelled" || s === "canceled";
};

// Prebooked orders store restaurant-local wall-clock date/time with no timezone.
// The partner's browser sits in the restaurant, so plain local Date math is the
// correct comparison here (there is no partner timezone to apply).
const getPrebookInstant = (order: Order): number | null => {
  if (!order.scheduled_date) return null;
  const time = (order.scheduled_time ?? "00:00:00").slice(0, 8);
  const ms = new Date(`${order.scheduled_date}T${time}`).getTime();
  return Number.isNaN(ms) ? null : ms;
};

type PrebookUrgency = { label: string; tone: "overdue" | "soon" };

// null ⇒ not prebooked, terminal, or still more than an hour out (normal badge).
const getPrebookUrgency = (order: Order, nowTs: number): PrebookUrgency | null => {
  if (isTerminalStatus(order.status)) return null;
  const instant = getPrebookInstant(order);
  if (instant === null) return null;
  const diff = instant - nowTs;
  if (diff > PREBOOK_DUE_SOON_MS) return null;
  if (diff <= 0) return { label: "OVERDUE", tone: "overdue" };
  return { label: `DUE IN ${Math.max(1, Math.round(diff / 60000))} MIN`, tone: "soon" };
};

// Tones picked to sit in the same palette as getStatusColor: red = overdue,
// amber = due inside the hour.
const prebookUrgencyBadgeClass = (tone: PrebookUrgency["tone"]) =>
  tone === "overdue"
    ? "bg-red-100 text-red-800 hover:bg-red-100"
    : "bg-amber-100 text-amber-900 hover:bg-amber-100";

export function AdminV2Orders() {
  const { userData } = useAuthStore();
  const { selectedOrderId, setSelectedOrderId, setActiveView } =
    useAdminStore();
  const {
    deleteOrder,
    updateOrderStatus,
    updateOrderPaymentMethod,
    subscribeDraftOrders,
    subscribeUpcomingPrebookings,
  } = useOrderStore();

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

  // Upcoming prebookings ride their OWN subscription instead of being derived
  // from the paged live feed. That feed is 10 rows per page and windowed to
  // `created_at >= now - 24h`, so a booking taken yesterday (or last week) for
  // today is not in the client array at all — re-sorting it could never surface
  // the order on the day it has to be cooked, and the badge count only ever
  // reflected the current page. See upcomingPrebookingsSubscription.
  const [upcomingPrebookings, setUpcomingPrebookings] = useState<Order[]>([]);
  // Clock tick that keeps "due in N min" / overdue state honest between renders.
  const [nowTs, setNowTs] = useState(() => Date.now());

  const partnerId = userData?.id;
  // Restaurant-local "today". Derived from the tick but only changes value at
  // midnight, so the 30s tick never churns the subscription below. (If the tick
  // is idle — no prebookings — the window simply starts a day early, which still
  // matches everything scheduled from today on.)
  const todayStr = ymd(new Date(nowTs));

  useEffect(() => {
    if (!partnerId) return;
    // Window runs from a day BEFORE today so a still-open slot from last night
    // survives midnight instead of disappearing while it is overdue; the query
    // itself already drops completed/cancelled bookings, so what comes back from
    // the past is by definition unfinished work.
    const from = new Date(`${todayStr}T00:00:00`);
    from.setDate(from.getDate() - PREBOOK_LOOKBACK_DAYS);
    const through = new Date(`${todayStr}T00:00:00`);
    through.setDate(through.getDate() + PREBOOK_LOOKAHEAD_DAYS);
    const unsubscribe = subscribeUpcomingPrebookings(
      partnerId,
      ymd(from),
      ymd(through),
      setUpcomingPrebookings,
    );
    return () => unsubscribe();
  }, [partnerId, todayStr, subscribeUpcomingPrebookings]);

  // The tick only runs while there is something scheduled — a partner who never
  // takes prebookings gets exactly the old behaviour (no timer, no re-renders).
  const hasPrebookings = upcomingPrebookings.length > 0;
  useEffect(() => {
    if (!hasPrebookings) return;
    const interval = setInterval(() => setNowTs(Date.now()), 30 * 1000);
    return () => clearInterval(interval);
  }, [hasPrebookings]);

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

  // Actionable prebookings for today → +30 days, straight from the dedicated
  // subscription. The query already drops terminal statuses; the extra guard
  // just normalizes odd casing / the "canceled" spelling.
  const prebookings = upcomingPrebookings.filter((o) => !isTerminalStatus(o.status));
  const activePrebookingsCount = prebookings.length;

  // Due within the hour (or already past) — these get pinned above the list.
  const dueSoonPrebookings = prebookings
    .filter((o) => getPrebookUrgency(o, nowTs))
    .sort((a, b) => (getPrebookInstant(a) ?? 0) - (getPrebookInstant(b) ?? 0));
  // Everything scheduled for TODAY, however long ago it was booked. This is what
  // makes "booked yesterday, cook today" visible on today's dashboard.
  const todayPrebookings = prebookings.filter((o) => o.scheduled_date === todayStr);
  const laterTodayCount = todayPrebookings.filter(
    (o) => !getPrebookUrgency(o, nowTs),
  ).length;

  // When the Draft Orders toggle is on, the whole view operates on drafts.
  // When Prebookings is on, only scheduled orders are shown. Otherwise the
  // normal feed shows ALL live orders — prebookings included — so scheduled
  // orders stay visible alongside regular ones (the Prebookings toggle just
  // narrows the view to them).
  const activeOrders = showDrafts
    ? drafts
    : showPrebookings
      ? prebookings
      : orders;

  // Everything this screen can act on, deduped: the paged live feed plus the two
  // separately-subscribed lists. Needed because a due-soon prebooking is opened
  // straight from the pinned block while the NORMAL list is showing, and such an
  // order is not in the paged feed at all — without this the detail view would
  // say "Order not found in current view". updateOrderStatus() also uses the
  // array it is handed to locate the order for the customer notification and the
  // delivery dispatch hooks, so those must see it too.
  const pagedOrderIds = new Set(orders.map((o) => o.id));
  const lookupIds = new Set(pagedOrderIds);
  const lookupOrders = [...orders];
  for (const extra of [...prebookings, ...drafts]) {
    if (lookupIds.has(extra.id)) continue;
    lookupIds.add(extra.id);
    lookupOrders.push(extra);
  }
  // ...but write back only the ids the paged store owns: leaking a prebooking or
  // draft into the live feed would trip the new-order sound/toast diffing.
  const setPagedOrdersOnly = (next: Order[]) =>
    setOrders(next.filter((o) => pagedOrderIds.has(o.id)));

  // Keep the last resolved order so the detail view survives its own success.
  // Completing/cancelling a prebooking drops it out of upcomingPrebookings (that
  // query excludes completed/cancelled), and an order booked >24h before its slot
  // isn't in the paged feed either — so the row the partner is looking at would
  // vanish mid-screen and strand them on "Order not found" right after a routine,
  // successful action.
  const lastSelectedRef = useRef<Order | null>(null);
  const resolvedSelected = lookupOrders.find((o) => o.id === selectedOrderId) || null;
  if (resolvedSelected) lastSelectedRef.current = resolvedSelected;
  else if (!selectedOrderId) lastSelectedRef.current = null;
  const selectedOrder =
    resolvedSelected ||
    (selectedOrderId && lastSelectedRef.current?.id === selectedOrderId
      ? lastSelectedRef.current
      : null);

  const [viewMode, setViewMode] = useState<"live" | "all">("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [orderType, setOrderType] = useState<string>("all");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const cancellingOrder = lookupOrders.find((o) => o.id === cancellingOrderId) || null;
  const editingOrder = lookupOrders.find((o) => o.id === editingOrderId) || null;

  // Own-driver dispatch: when the partner has their own registered delivery
  // boys, dispatching a delivery order opens a driver-picker popup instead of
  // flipping the status straight to "dispatched".
  const hasOwnDrivers = useHasOwnDrivers();
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const assigningOrder = lookupOrders.find((o) => o.id === assigningOrderId) || null;

  // Sort choice is a per-device preference: restore it once we know which
  // partner is logged in.
  useEffect(() => {
    if (!partnerId) return;
    try {
      const saved = localStorage.getItem(sortPrefKey(partnerId));
      if (saved) setSortBy(saved);
    } catch {
      /* private mode / storage disabled — keep the default */
    }
  }, [partnerId]);

  // Only an explicit pick is persisted. Opening the Prebookings view also
  // switches the sort (below), but that is view-local and must not overwrite
  // what the partner chose for the normal list.
  const handleSortChange = (value: string) => {
    setSortBy(value);
    try {
      localStorage.setItem(sortPrefKey(partnerId), value);
    } catch {
      /* ignore */
    }
  };

  const openPrebookingsView = () => {
    setShowDrafts(false);
    setShowPrebookings(true);
    // A prep list is only useful in slot order.
    setSortBy("prebook");
  };

  const togglePrebookingsView = () => {
    if (showPrebookings) {
      setShowPrebookings(false);
      return;
    }
    openPrebookingsView();
  };

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
      // Completed-order lock ON → editing is fully disabled (only cancel is
      // allowed); no password escape. OFF → keep the legacy password-gated edit.
      if (isCompletedOrderLockEnabled(userData)) {
        toast.error(
          "This order is completed and locked — editing is disabled. You can only cancel it.",
        );
        return;
      }
      setPendingAction(() => () => setEditingOrderId(order.id));
      setActionDescription("edit this completed order");
      setPasswordModalOpen(true);
    } else {
      setEditingOrderId(order.id);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const order = lookupOrders.find((o) => o.id === orderId);

    if (!order) return;

    const lockEnabled = isCompletedOrderLockEnabled(userData);

    // Cancelled orders are frozen when the lock is on — no status change at all.
    if (lockEnabled && order.status === "cancelled") {
      toast.error("This order is cancelled and locked. Its status can't be changed.");
      return;
    }

    // Completed-order lock: once completed, the ONLY permitted transition is
    // cancel. Block every other status change outright (no password escape).
    if (lockEnabled && order.status === "completed" && status !== "cancelled") {
      toast.error(
        "This order is completed and locked. You can only cancel it.",
      );
      return;
    }

    if (status === "cancelled") {
      // Pending orders are cancellable as before; a completed order is also
      // cancellable by staff when the lock is on (voiding a finished bill).
      const cancellable =
        order.status === "pending" ||
        (lockEnabled && order.status === "completed");
      if (!cancellable) {
        toast.error(
          `Only pending orders can be cancelled (current status: ${order.status})`,
        );
        return;
      }
      setCancellingOrderId(orderId);
      return;
    }

    // Dispatching a real delivery order while the partner runs their own drivers
    // (and no 3PL/pool auto-dispatch is on) → open the driver-picker popup
    // instead of dispatching directly. Skip for completed orders so the password
    // gate below still guards edits to them.
    if (
      status === "dispatched" &&
      order.status !== "completed" &&
      shouldPickOwnDriverOnDispatch(order, userData as Partner, hasOwnDrivers)
    ) {
      setAssigningOrderId(orderId);
      return;
    }

    if (order.status === "completed") {
      setPendingAction(() => async () => {
        try {
          await updateOrderStatus(lookupOrders, orderId, status as any, setPagedOrdersOnly);
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
      await updateOrderStatus(lookupOrders, orderId, status as any, setPagedOrdersOnly);
      toast.success("Order status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const checkAndCompleteOrder = async (order: Order) => {
    if (order.status === "accepted") {
      try {
        // Always update Order Status to completed first
        await updateOrderStatus(lookupOrders, order.id, "completed", setPagedOrdersOnly);
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
    // Completion is now tied to choosing a payment method. If none is set yet,
    // open the chooser and do NOT complete or print — cancelling leaves the
    // order untouched. If a method already exists, complete + open the bill.
    if (!order.payment_method) {
      setOrderToPrint(order.id);
      setPaymentModalOpen(true);
      return;
    }
    await checkAndCompleteOrder(order);
    window.open(`/bill/${order.id}`, "_blank");
  };

  const handlePaymentMethodConfirm = async (method: string) => {
    if (!orderToPrint) return;
    const orderId = orderToPrint;
    await updateOrderPaymentMethod(orderId, method, lookupOrders, setPagedOrdersOnly);
    setPaymentModalOpen(false);

    // Now that a payment method is chosen, mark the order completed (only if it
    // was accepted) and open the bill.
    const order = lookupOrders.find((o) => o.id === orderId);
    if (order) {
      await checkAndCompleteOrder(order);
    }
    window.open(`/bill/${orderId}`, "_blank");
    setOrderToPrint(null);
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

  // When the completed-order lock is on, a completed order's status dropdown
  // only offers "Cancelled" (plus its current "Completed" value) — every other
  // transition is hidden so cancel is the sole action.
  const lockEnabled = isCompletedOrderLockEnabled(userData);
  const renderStatusOptions = (order: Order) => {
    if (lockEnabled && order.status === "completed") {
      return (
        <>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </>
      );
    }
    return (
      <>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="accepted">Accepted</SelectItem>
        <SelectItem value="food_ready">Food Ready</SelectItem>
        <SelectItem value="dispatched">Dispatched</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </>
    );
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
        {/* The detail view runs the same status/payment mutations this screen
            does, so it needs the same merged list: the store locates the order
            inside the array it is handed to fire the customer push and the
            delivery dispatch, and a prebooking is not in the paged feed. */}
        <OrderDetails
          order={selectedOrder}
          onBack={() => setSelectedOrderId(null)}
          onEdit={() => handleEditOrder(selectedOrder)}
          lookupOrders={lookupOrders}
          onOrdersChange={setPagedOrdersOnly}
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
        // Soonest slot first — the order the kitchen actually has to work in.
        // Orders with no slot are not prebooked, so they sink to the bottom and
        // keep their usual newest-first order among themselves.
        case "prebook": {
          const slotA = getPrebookInstant(a);
          const slotB = getPrebookInstant(b);
          if (slotA !== null && slotB !== null) return slotA - slotB;
          if (slotA !== null) return -1;
          if (slotB !== null) return 1;
          return dateB - dateA;
        }
        default:
          return dateB - dateA;
      }
    });

    return result;
  };

  const filteredOrders = getFilteredAndSortedOrders();

  // "Today · 7:00 – 7:30 PM" — the when of a prebooked order, always rendered
  // behind a "Prepare for/by" prefix so a scheduled row can never be read as a
  // now-order.
  const prebookWhenLabel = (order: Order) => {
    const date = order.scheduled_date as string;
    const slot = order.scheduled_time
      ? ` · ${formatPrebookSlotLabel(prebookCfg, date, order.scheduled_time, {
        dineIn: !!order.booking_persons,
        to: order.scheduled_time_to,
      })}`
      : "";
    return `${formatPrebookDateLabel(date, new Date(nowTs))}${slot}`;
  };

  // Just the slot ("7:00 – 7:30 PM"), for lines that already say which day.
  const prebookSlotOnlyLabel = (order: Order) =>
    order.scheduled_time
      ? formatPrebookSlotLabel(prebookCfg, order.scheduled_date as string, order.scheduled_time, {
        dineIn: !!order.booking_persons,
        to: order.scheduled_time_to,
      })
      : "";

  // Deadline for a due-soon order: within the hour it is (almost always) today,
  // so the day word would just be noise.
  const prebookDueLabel = (order: Order) =>
    order.scheduled_date === todayStr
      ? prebookSlotOnlyLabel(order) || "now"
      : prebookWhenLabel(order);

  // In the Prebookings view rows are grouped under their scheduled date, so
  // "Today" is a section header of its own and a booking taken days ago still
  // reads as today's work. Only while sorted by slot — any other sort would
  // scatter the dates and repeat headers.
  const getPrebookGroupLabel = (order: Order, prev?: Order) => {
    if (!showPrebookings || sortBy !== "prebook") return null;
    if (!order.scheduled_date) return null;
    if (prev?.scheduled_date === order.scheduled_date) return null;
    const label = formatPrebookDateLabel(order.scheduled_date, new Date(nowTs));
    // A yesterday slot is still in this list only because nobody closed it, and
    // it sorts to the very top — say so in the header, or a plain date sitting
    // above "Today" reads like a mistake. (yyyy-mm-dd compares lexicographically.)
    if (order.scheduled_date < todayStr) return `${label} — overdue`;
    return label === "Today" ? "Today — prepare these first" : label;
  };

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
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest">Highest Amount</SelectItem>
                  <SelectItem value="lowest">Lowest Amount</SelectItem>
                  <SelectItem value="prebook">Prebooking time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showPrebookings ? "default" : "outline"}
            onClick={togglePrebookingsView}
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
            Showing <b>prebookings</b> — orders scheduled for a later date or slot,
            grouped by the day they must be ready. Loaded separately from the live
            list, so bookings taken days ago still show up on the day they are due,
            and a slot that came and went without being closed stays here as
            overdue.
            {todayPrebookings.length > 0 && (
              <>
                {" "}
                <b>
                  {todayPrebookings.length} of them{" "}
                  {todayPrebookings.length === 1 ? "is" : "are"} for today.
                </b>
              </>
            )}
          </span>
        </div>
      )}

      {/* Prebookings due within the hour (or already overdue) are pinned above
          the list. This block is the ONLY place such an order can surface on the
          main screen: it was placed days ago, so it is nowhere in the paged
          24h-window feed below. */}
      {!showDrafts && dueSoonPrebookings.length > 0 && (
        <div className="rounded-md border-2 border-red-300 bg-red-50/70 p-3 dark:border-red-900 dark:bg-red-950/30">
          <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Prepare now
            <span className="text-xs font-normal normal-case text-red-700/80 dark:text-red-300/80">
              {dueSoonPrebookings.length} prebooked order
              {dueSoonPrebookings.length > 1 ? "s" : ""} due within the hour
            </span>
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {dueSoonPrebookings.map((order) => {
              const urgency = getPrebookUrgency(order, nowTs) as PrebookUrgency;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  className="flex w-full flex-col gap-1 rounded-md border border-red-200 bg-white p-2.5 text-left shadow-sm transition-shadow hover:shadow dark:border-red-900 dark:bg-background"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">
                      {(Number(order.display_id) ?? 0) > 0
                        ? `Invoice ${order.display_id}`
                        : `#${order.id.slice(0, 8)}`}
                    </span>
                    <Badge
                      className={`${prebookUrgencyBadgeClass(urgency.tone)} gap-1 text-[10px] font-bold`}
                    >
                      <AlarmClock className="h-3 w-3" />
                      {urgency.label}
                    </Badge>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
                    Prepare by {prebookDueLabel(order)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {getOrderTypeLabel(order)} · {getTableLocationLabel(order)}
                    {order.booking_persons ? ` · ${order.booking_persons} guests` : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {laterTodayCount > 0 && !showPrebookings && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-red-800 dark:text-red-300">
              <span>
                {laterTodayCount} more prebooking{laterTodayCount > 1 ? "s" : ""} still
                to prepare today.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={openPrebookingsView}
                className="h-7 gap-1.5 border-red-300 bg-white text-red-800 hover:bg-red-100 dark:bg-transparent dark:text-red-200"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                View prebookings
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Nothing due inside the hour, but today still has bookings to cook. The
          reminder keeps "booked yesterday, due today" on screen even though those
          orders are outside the live feed's 24h created_at window. */}
      {!showDrafts &&
        !showPrebookings &&
        dueSoonPrebookings.length === 0 &&
        todayPrebookings.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50/60 px-4 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>
                <b>
                  {todayPrebookings.length} prebooked order
                  {todayPrebookings.length > 1 ? "s" : ""} to prepare today
                </b>
                {prebookSlotOnlyLabel(todayPrebookings[0])
                  ? ` — earliest ${prebookSlotOnlyLabel(todayPrebookings[0])}`
                  : ""}
                .
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={openPrebookingsView}
              className="h-7 shrink-0 border-blue-300 bg-white text-blue-800 hover:bg-blue-100 dark:bg-transparent dark:text-blue-200"
            >
              View
            </Button>
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
            {filteredOrders.map((order, index) => {
              const urgency = getPrebookUrgency(order, nowTs);
              const groupLabel = getPrebookGroupLabel(order, filteredOrders[index - 1]);
              // Prebooked rows are tinted so they never read as a now-order:
              // red when overdue, amber when due within the hour, otherwise a
              // light blue "scheduled" wash.
              const rowTint = urgency
                ? urgency.tone === "overdue"
                  ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/30"
                  : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30"
                : order.scheduled_date
                  ? "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20"
                  : "hover:bg-muted/50";
              return (
                <React.Fragment key={order.id}>
                  {groupLabel && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={showGrowjetColumn ? 10 : 9}
                        className="bg-muted py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                      >
                        {groupLabel}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow
                        className={`cursor-pointer ${rowTint}`}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        {(Number(order.display_id) ?? 0) > 0 ? (
                          <div className="flex w-fit flex-col items-start gap-0.5">
                            <Badge className="bg-orange-100 px-2 py-0.5 text-sm font-bold text-orange-800 hover:bg-orange-100">
                              {order.display_id}
                            </Badge>
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              {format(new Date(order.createdAt), "d MMM")}
                            </span>
                          </div>
                        ) : (
                          <span>{order.id.slice(0, 8)}</span>
                        )}
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
                      {getTableLocationLabel(order)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-black dark:text-black"
                      >
                        {getPaymentModeLabel(order)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "dd-MM-yy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "hh:mm a")}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-[200px] flex-col gap-1">
                        {/* line 1: order type + compact Prebooked/Table tag (fits on
                            one line); the long date/slot moves to line 2 below. Once
                            the slot is within the hour the calm blue tag is replaced
                            by the countdown so the row shouts for attention. */}
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="secondary" className="uppercase">
                            {getOrderTypeLabel(order)}
                          </Badge>
                          {order.scheduled_date &&
                            (urgency ? (
                              <Badge
                                className={`${prebookUrgencyBadgeClass(urgency.tone)} gap-1 font-bold`}
                              >
                                <AlarmClock className="h-3 w-3" />
                                {urgency.label}
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                {order.booking_persons ? "Table" : "Prebooked"}
                              </Badge>
                            ))}
                          {order.booking_persons != null && order.booking_persons > 1 && (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
                              <Users className="h-3 w-3" /> {order.booking_persons}
                            </Badge>
                          )}
                        </div>
                        {/* line 2: WHEN it has to be ready. Always prefixed with
                            "Prepare for" so the date can't be mistaken for the
                            order's own date. */}
                        {order.scheduled_date && (
                          <span
                            className={`text-[11px] font-semibold leading-tight ${urgency
                              ? urgency.tone === "overdue"
                                ? "text-red-700"
                                : "text-amber-700"
                              : "text-blue-700"
                              }`}
                          >
                            Prepare for {prebookWhenLabel(order)}
                          </span>
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
                        disabled={isCancelledOrderFrozen(order, userData)}
                        onValueChange={(val) =>
                          handleUpdateOrderStatus(order.id, val)
                        }
                      >
                        <SelectTrigger
                          className={`w-[130px] h-8 border-none ${getStatusColor(order.status)}`}
                        >
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>{renderStatusOptions(order)}</SelectContent>
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

                        {/* A completed order is a financial record — the sale
                            happened. Deleting it would silently rewrite revenue,
                            so the action is withdrawn once it is done. */}
                        {!isOrderCompleted(order) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteOrder(order)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
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
        {filteredOrders.map((order, index) => {
          const urgency = getPrebookUrgency(order, nowTs);
          const groupLabel = getPrebookGroupLabel(order, filteredOrders[index - 1]);
          // Same signalling as the desktop rows, as a ring around the card.
          const cardRing = urgency
            ? urgency.tone === "overdue"
              ? "ring-2 ring-red-400"
              : "ring-2 ring-amber-400"
            : order.scheduled_date
              ? "ring-1 ring-blue-200"
              : "";
          return (
            <React.Fragment key={order.id}>
              {groupLabel && (
                <div className="pt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {groupLabel}
                </div>
              )}
              <Card
                className={`overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${cardRing}`}
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
                        disabled={isCancelledOrderFrozen(order, userData)}
                        onValueChange={(val) =>
                          handleUpdateOrderStatus(order.id, val)
                        }
                      >
                        <SelectTrigger
                          className={`w-[110px] h-7 text-xs border-none ${getStatusColor(order.status)}`}
                        >
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>{renderStatusOptions(order)}</SelectContent>
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
                          {getTableLocationLabel(order)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 justify-end">
                        <Badge variant="outline" className="capitalize text-xs">
                          {getOrderTypeLabel(order)}
                        </Badge>
                        {order.scheduled_date &&
                          (urgency ? (
                            <Badge
                              className={`${prebookUrgencyBadgeClass(urgency.tone)} gap-1 whitespace-nowrap text-xs font-bold`}
                            >
                              <AlarmClock className="h-3 w-3" />
                              {urgency.label}
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs whitespace-nowrap">
                              {order.booking_persons ? "Table" : "Prebooked"}
                            </Badge>
                          ))}
                        {order.booking_persons != null && order.booking_persons > 1 && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs whitespace-nowrap gap-1">
                            <Users className="h-3 w-3" /> {order.booking_persons}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* The prep deadline gets its own strip on mobile — a badge that
                        long wraps badly, and this must never be skim-read as the
                        order's own time. */}
                    {order.scheduled_date && (
                      <div
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold ${urgency
                          ? urgency.tone === "overdue"
                            ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                            : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          }`}
                      >
                        <AlarmClock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Prepare for {prebookWhenLabel(order)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(order.createdAt), "hh:mm a")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{getPaymentModeLabel(order)}</span>
                      </div>
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
                    {!isOrderCompleted(order) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDeleteOrder(order)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </React.Fragment>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No orders found
          </div>
        )}
      </div>

      {/* Pagination Controls - hidden in the draft and prebooking views: both are
          single, separately-subscribed lists, so paging the live feed under them
          would do nothing but confuse. */}
      <div className={`flex items-center justify-end space-x-2 py-4 ${showDrafts || showPrebookings ? "hidden" : ""}`}>
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
        onClose={() => {
          // Cancelling leaves the order not-completed and prints nothing.
          setPaymentModalOpen(false);
          setOrderToPrint(null);
        }}
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

      <AssignDriverDialog
        open={!!assigningOrderId}
        onOpenChange={(o) => {
          if (!o) setAssigningOrderId(null);
        }}
        order={assigningOrder}
      />
    </div>
  );
}
