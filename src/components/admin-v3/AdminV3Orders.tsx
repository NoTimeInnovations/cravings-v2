"use client";

import * as React from "react";
import {
  AlarmClock,
  Ban,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  List,
  Loader2,
  MapPin,
  Printer,
  ReceiptText,
  Search,
  ShoppingBag,
  Table2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { CancelOrderDialog } from "@/components/CancelOrderDialog";
import { AssignDriverDialog } from "@/components/admin-v2/AssignDriverDialog";
import { PasswordProtectionModal } from "@/components/admin-v2/PasswordProtectionModal";
import { PaymentMethodChooseV2 } from "@/components/admin-v2/PaymentMethodChooseV2";
import { expireCfOrder } from "@/app/actions/cfOrders";
import { useHasOwnDrivers } from "@/hooks/useHasOwnDrivers";
import { hasInvoiceNo, isDraftInvoiceNo } from "@/lib/invoiceNumber";
import { getOrderTypeLabel, getPaymentDisplayLabel } from "@/lib/orderLabels";
import {
  isCancelledOrderFrozen,
  isCompletedOrderLockEnabled,
  isOrderCompleted,
} from "@/lib/orderStatus";
import { shouldPickOwnDriverOnDispatch } from "@/lib/ownDriverDispatch";
import { printKotAndBill, type PrintDoc } from "@/lib/printOrder";
import { formatPrebookDateLabel, formatPrebookSlotLabel, parsePrebookingSettings, ymd } from "@/lib/prebooking";
import { useAdminStore } from "@/store/adminStore";
import { Partner, useAuthStore } from "@/store/authStore";
import useOrderStore, { type Order } from "@/store/orderStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";

import { V3Card } from "./ui/primitives";
import { OrderDetailView } from "./orders/OrderDetailView";
import { OrderEditView } from "./orders/OrderEditView";
import {
  CONTROL_LG,
  DotPill,
  ICON_BTN,
  LIVE_ORDER_STATUSES,
  STATUS_OPTIONS,
  TagBadge,
  fmtTz,
  getTableLocationLabel,
  hasDropAddress,
  money,
  statusMeta,
} from "./orders/shared";

/**
 * /admin-v3 → Orders.
 *
 * Replaces admin-v2's AdminV2Orders + AdminV2AllOrders + OrderDetails +
 * AdminV2EditOrder, and reuses their data layer wholesale: the same paged live
 * subscription (orderSubscriptionStore, fed by OrderSubscriptionManager in the
 * layout), the same draft and prebooking subscriptions, the same
 * fetchOrderOfPartner for history, and the same store mutations.
 *
 * The one structural change is that v2's four *separate* screens are four modes
 * of one screen here: the "Show All Orders" history is a SOURCE toggle rather
 * than a whole second component with its own copy of the filters, the status
 * rules and the print flow. Those rules — the completed-order lock, the
 * password gate on completed orders, the own-driver dispatch popup — used to be
 * written out three times and had to be kept in agreement by hand; they now
 * live once, here, and the detail and edit sub-views are handed the decisions.
 */

/** Source list the screen is currently working on. */
type Source = "live" | "all" | "prebook" | "draft";
/** Status grouping shown as tabs above the table. */
type Tab = "all" | "live" | "completed" | "cancelled";

const PREBOOK_DUE_SOON_MS = 60 * 60 * 1000;
const PREBOOK_LOOKAHEAD_DAYS = 30;
const PREBOOK_LOOKBACK_DAYS = 1;
const ALL_PAGE_SIZE = 10;

const sortPrefKey = (partnerId?: string | null) =>
  `adminv3_orders_sort_${partnerId || "anon"}`;

const isTerminalStatus = (status?: string | null) => {
  const s = (status || "").trim().toLowerCase();
  return s === "completed" || s === "cancelled" || s === "canceled";
};

/** Prebooked orders carry restaurant-local wall-clock with no timezone, so
 *  plain local Date math is the correct comparison (the partner's browser sits
 *  in the restaurant). Same rule as admin-v2. */
const getPrebookInstant = (order: Order): number | null => {
  if (!order.scheduled_date) return null;
  const time = (order.scheduled_time ?? "00:00:00").slice(0, 8);
  const ms = new Date(`${order.scheduled_date}T${time}`).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const getPrebookUrgency = (
  order: Order,
  nowTs: number,
): { label: string; tone: "overdue" | "soon" } | null => {
  if (isTerminalStatus(order.status)) return null;
  const instant = getPrebookInstant(order);
  if (instant === null) return null;
  const diff = instant - nowTs;
  if (diff > PREBOOK_DUE_SOON_MS) return null;
  if (diff <= 0) return { label: "OVERDUE", tone: "overdue" };
  return { label: `DUE IN ${Math.max(1, Math.round(diff / 60000))} MIN`, tone: "soon" };
};

const TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "delivery", label: "Delivery" },
  { value: "table", label: "Table" },
  { value: "pos", label: "POS" },
];

const SORTS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest Amount" },
  { value: "lowest", label: "Lowest Amount" },
  { value: "prebook", label: "Prebooking time" },
];

export function AdminV3Orders() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id;
  const currency = partner?.currency || "₹";
  // `partners.timezone` is a real column (IANA string) that the Partner interface
  // in authStore.ts does not declare, so the type — not this read — is what's wrong.
  // admin-v2 casts for exactly this reason (AdminV2Dashboard, AdminV2Analytics,
  // AdminV2Settlements all do `(userData as any)?.timezone`); same precedent here,
  // narrowed straight back to the `string | undefined` that fmtTz expects.
  const tz = (partner as any)?.timezone as string | undefined;
  const prebookCfg = parsePrebookingSettings((userData as any)?.prebooking_settings);

  const { selectedOrderId, setSelectedOrderId } = useAdminStore();
  const {
    deleteOrder,
    updateOrderStatus,
    updateOrderPaymentMethod,
    subscribeDraftOrders,
    subscribeUpcomingPrebookings,
    fetchOrderOfPartner,
  } = useOrderStore();
  const {
    orders,
    setOrders,
    removeOrder,
    loading: liveLoading,
    totalCount,
    currentPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = useOrderSubscriptionStore();

  /* ------------------------------------------------------------- sources */

  const [source, setSource] = React.useState<Source>("live");
  const [drafts, setDrafts] = React.useState<Order[]>([]);
  const [prebookings, setPrebookings] = React.useState<Order[]>([]);
  const [history, setHistory] = React.useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [clearingDrafts, setClearingDrafts] = React.useState(false);
  const [nowTs, setNowTs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const unsubscribe = subscribeDraftOrders(setDrafts);
    return () => unsubscribe();
  }, [subscribeDraftOrders]);

  // Restaurant-local "today", derived from the tick but only changing at
  // midnight, so a 30s tick never churns the subscription below.
  const todayStr = ymd(new Date(nowTs));

  React.useEffect(() => {
    if (!partnerId) return;
    // The window starts a day BEFORE today so a still-open slot from last night
    // survives midnight instead of vanishing exactly when it becomes overdue.
    const from = new Date(`${todayStr}T00:00:00`);
    from.setDate(from.getDate() - PREBOOK_LOOKBACK_DAYS);
    const through = new Date(`${todayStr}T00:00:00`);
    through.setDate(through.getDate() + PREBOOK_LOOKAHEAD_DAYS);
    const unsubscribe = subscribeUpcomingPrebookings(
      partnerId,
      ymd(from),
      ymd(through),
      setPrebookings,
    );
    return () => unsubscribe();
  }, [partnerId, todayStr, subscribeUpcomingPrebookings]);

  // The tick only runs while something is scheduled — a partner who takes no
  // prebookings gets no timer and no extra renders.
  const hasPrebookings = prebookings.length > 0;
  React.useEffect(() => {
    if (!hasPrebookings) return;
    const interval = setInterval(() => setNowTs(Date.now()), 30 * 1000);
    return () => clearInterval(interval);
  }, [hasPrebookings]);

  // Full history is fetched once, on demand — it is an unpaged partner-wide
  // query and has no business running for a partner who never opens it.
  React.useEffect(() => {
    if (source !== "all" || !partnerId || history.length > 0) return;
    let cancelled = false;
    setHistoryLoading(true);
    fetchOrderOfPartner(partnerId)
      .then((rows) => {
        if (!cancelled && rows) setHistory(rows);
      })
      .catch((e) => {
        console.error("[V3 orders] history fetch failed:", e);
        toast.error("Couldn't load order history");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, partnerId, fetchOrderOfPartner, history.length]);

  const activePrebookings = React.useMemo(
    () => prebookings.filter((o) => !isTerminalStatus(o.status)),
    [prebookings],
  );

  const sourceOrders =
    source === "draft"
      ? drafts
      : source === "prebook"
        ? activePrebookings
        : source === "all"
          ? history
          : orders;

  /* ------------------------------------------------- lookup + write-back */

  // Everything this screen can act on, deduped. updateOrderStatus locates the
  // order inside the array it is handed to fire the customer push and the
  // delivery dispatch — a miss skips BOTH silently while still reporting
  // success, so the array has to be the wide one.
  const pagedOrderIds = React.useMemo(() => new Set(orders.map((o) => o.id)), [orders]);
  const lookupOrders = React.useMemo(() => {
    const seen = new Set(orders.map((o) => o.id));
    const merged = [...orders];
    for (const extra of [...activePrebookings, ...drafts, ...history]) {
      if (seen.has(extra.id)) continue;
      seen.add(extra.id);
      merged.push(extra);
    }
    return merged;
  }, [orders, activePrebookings, drafts, history]);

  // ...but write back only the ids the paged store owns: a prebooking or draft
  // leaking into the live feed would trip its new-order sound/toast diffing.
  const setPagedOrdersOnly = React.useCallback(
    (next: Order[]) => setOrders(next.filter((o) => pagedOrderIds.has(o.id))),
    [pagedOrderIds, setOrders],
  );

  /* ---------------------------------------------------------- selection */

  // Keep the last resolved order so the detail view survives its own success:
  // completing a prebooking drops it out of the prebooking subscription, and an
  // order booked days before its slot is not in the paged feed either.
  const lastSelectedRef = React.useRef<Order | null>(null);
  const resolvedSelected = lookupOrders.find((o) => o.id === selectedOrderId) || null;
  if (resolvedSelected) lastSelectedRef.current = resolvedSelected;
  else if (!selectedOrderId) lastSelectedRef.current = null;
  const selectedOrder =
    resolvedSelected ||
    (selectedOrderId && lastSelectedRef.current?.id === selectedOrderId
      ? lastSelectedRef.current
      : null);

  const [editingOrderId, setEditingOrderId] = React.useState<string | null>(null);
  const editingOrder = lookupOrders.find((o) => o.id === editingOrderId) || null;

  /* ------------------------------------------------------------ filters */

  const [searchQuery, setSearchQuery] = React.useState("");
  const [orderType, setOrderType] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("newest");
  const [tab, setTab] = React.useState<Tab>("all");
  const [allPage, setAllPage] = React.useState(1);

  React.useEffect(() => {
    if (!partnerId) return;
    try {
      const saved = localStorage.getItem(sortPrefKey(partnerId));
      if (saved) setSortBy(saved);
    } catch {
      /* private mode / storage disabled — keep the default */
    }
  }, [partnerId]);

  // Only an explicit pick is persisted. Opening the prebookings view also
  // switches the sort, but that is view-local.
  const chooseSort = (value: string) => {
    setSortBy(value);
    try {
      localStorage.setItem(sortPrefKey(partnerId), value);
    } catch {
      /* ignore */
    }
  };

  React.useEffect(() => setAllPage(1), [searchQuery, orderType, statusFilter, sortBy, tab, source]);

  /* ------------------------------------------------------------- dialogs */

  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);
  const [actionDescription, setActionDescription] = React.useState("");
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [orderToPrint, setOrderToPrint] = React.useState<string | null>(null);
  const [pendingPrintDocs, setPendingPrintDocs] = React.useState<PrintDoc[]>(["bill"]);
  const [cancellingOrderId, setCancellingOrderId] = React.useState<string | null>(null);
  const [assigningOrderId, setAssigningOrderId] = React.useState<string | null>(null);
  const cancellingOrder = lookupOrders.find((o) => o.id === cancellingOrderId) || null;
  const assigningOrder = lookupOrders.find((o) => o.id === assigningOrderId) || null;

  const hasOwnDrivers = useHasOwnDrivers();
  const lockEnabled = isCompletedOrderLockEnabled(userData);

  /* ------------------------------------------------------------- actions */

  const handleUpdateStatus = async (orderId: string, status: string) => {
    const order = lookupOrders.find((o) => o.id === orderId);
    if (!order) return;

    // Cancelled orders are frozen when the lock is on — no status change at all.
    if (lockEnabled && order.status === "cancelled") {
      toast.error("This order is cancelled and locked. Its status can't be changed.");
      return;
    }
    // Once completed and locked, cancel is the ONLY permitted transition — and
    // there is no password escape from that.
    if (lockEnabled && order.status === "completed" && status !== "cancelled") {
      toast.error("This order is completed and locked. You can only cancel it.");
      return;
    }

    if (status === "cancelled") {
      const cancellable =
        order.status === "pending" || (lockEnabled && order.status === "completed");
      if (!cancellable) {
        toast.error(
          `Only pending orders can be cancelled (current status: ${order.status})`,
        );
        return;
      }
      setCancellingOrderId(orderId);
      return;
    }

    // Dispatching a real delivery order while the partner runs their own riders
    // (and no 3PL/pool auto-dispatch is on) opens the driver picker instead of
    // dispatching straight out.
    if (
      status === "dispatched" &&
      order.status !== "completed" &&
      shouldPickOwnDriverOnDispatch(order, partner as Partner, hasOwnDrivers)
    ) {
      setAssigningOrderId(orderId);
      return;
    }

    const run = async () => {
      try {
        await updateOrderStatus(lookupOrders, orderId, status as any, setPagedOrdersOnly);
        toast.success("Order status updated");
      } catch (error) {
        console.error("[V3 orders] status update failed:", error);
        toast.error("Failed to update status");
      }
    };

    if (order.status === "completed") {
      setPendingAction(() => run);
      setActionDescription("update status of this completed order");
      setPasswordOpen(true);
      return;
    }
    await run();
  };

  const handleDelete = async (order: Order) => {
    const run = async () => {
      if (
        !(await confirmDialog({
          title: "Delete this order?",
          description: "Are you sure you want to delete this order?",
          confirmText: "Delete order",
          destructive: true,
        }))
      )
        return;
      const success = await deleteOrder(order.id);
      if (success) {
        removeOrder(order.id);
        setHistory((prev) => prev.filter((o) => o.id !== order.id));
        if (selectedOrderId === order.id) setSelectedOrderId(null);
        toast.success("Order deleted");
      } else {
        toast.error("Failed to delete order");
      }
    };

    if (order.status === "completed") {
      setPendingAction(() => run);
      setActionDescription("delete this completed order");
      setPasswordOpen(true);
      return;
    }
    await run();
  };

  const handleEdit = (order: Order) => {
    if (order.status === "completed") {
      // Lock ON → editing is fully disabled (cancel only), no password escape.
      // OFF → the legacy password-gated edit.
      if (lockEnabled) {
        toast.error(
          "This order is completed and locked — editing is disabled. You can only cancel it.",
        );
        return;
      }
      setPendingAction(() => () => setEditingOrderId(order.id));
      setActionDescription("edit this completed order");
      setPasswordOpen(true);
      return;
    }
    setEditingOrderId(order.id);
  };

  const handlePrint = (order: Order, docs: PrintDoc[]) => {
    // Printing NEVER changes the order's status. We still ask for a payment
    // method when none is recorded, since that belongs on the bill — except on
    // delivery, where nobody at the counter can know it yet (the rider collects
    // at the door, or it was paid online).
    const isDelivery =
      order.type === "delivery" ||
      (typeof order.deliveryAddress === "string" && order.deliveryAddress.trim().length > 0);
    if (docs.includes("bill") && !order.payment_method && !isDelivery) {
      setOrderToPrint(order.id);
      setPendingPrintDocs(docs);
      setPaymentModalOpen(true);
      return;
    }
    printKotAndBill(order.id, { docs });
  };

  // NOT async: the print tabs are claimed inside the click and the payment
  // mutation runs in `before`, so awaiting here would cost us the popup.
  const handlePaymentChosen = (method: string) => {
    if (!orderToPrint) return;
    const orderId = orderToPrint;
    setPaymentModalOpen(false);
    printKotAndBill(orderId, {
      docs: pendingPrintDocs,
      before: () => updateOrderPaymentMethod(orderId, method, lookupOrders, setPagedOrdersOnly),
    });
    setOrderToPrint(null);
  };

  const setPaymentMethod = async (orderId: string, method: string) => {
    try {
      await updateOrderPaymentMethod(orderId, method, lookupOrders, setPagedOrdersOnly);
      toast.success("Payment method recorded");
    } catch (error) {
      console.error("[V3 orders] payment method update failed:", error);
      toast.error("Couldn't record the payment method");
    }
  };

  const clearDrafts = async () => {
    if (!drafts.length || clearingDrafts) return;
    if (
      !(await confirmDialog({
        title: `Clear ${drafts.length} draft order${drafts.length > 1 ? "s" : ""}?`,
        description: "These are unpaid online orders that were never completed.",
        confirmText: "Clear drafts",
        destructive: true,
      }))
    )
      return;
    setClearingDrafts(true);
    try {
      const results = await Promise.allSettled(drafts.map((d) => expireCfOrder(d.id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) toast.error(`Cleared with ${failed} error${failed > 1 ? "s" : ""}`);
      else toast.success("Draft orders cleared");
    } catch (e) {
      console.error("[V3 orders] clear drafts failed:", e);
      toast.error("Failed to clear drafts");
    } finally {
      setClearingDrafts(false);
    }
  };

  /* -------------------------------------------------------- sub-views */

  if (editingOrderId && editingOrder) {
    return (
      <>
        <OrderEditView order={editingOrder} onBack={() => setEditingOrderId(null)} />
        <PasswordProtectionModal
          isOpen={passwordOpen}
          onClose={() => setPasswordOpen(false)}
          onSuccess={() => pendingAction?.()}
          actionDescription={actionDescription}
        />
      </>
    );
  }

  if (selectedOrderId && selectedOrder) {
    return (
      <>
        <OrderDetailView
          order={selectedOrder}
          onBack={() => setSelectedOrderId(null)}
          onEdit={() => handleEdit(selectedOrder)}
          onDelete={() => handleDelete(selectedOrder)}
          onChangeStatus={(status) => handleUpdateStatus(selectedOrder.id, status)}
          onPrint={(docs) => handlePrint(selectedOrder, docs)}
          onSetPaymentMethod={(method) => setPaymentMethod(selectedOrder.id, method)}
          canEdit={!(lockEnabled && selectedOrder.status === "completed")}
          canDelete={!isOrderCompleted(selectedOrder)}
          statusFrozen={isCancelledOrderFrozen(selectedOrder, userData)}
        />
        <PaymentMethodChooseV2
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setOrderToPrint(null);
          }}
          onConfirm={handlePaymentChosen}
        />
        <PasswordProtectionModal
          isOpen={passwordOpen}
          onClose={() => setPasswordOpen(false)}
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
            isPetpooja={!!partner?.petpooja_restaurant_id}
          />
        )}
        <AssignDriverDialog
          open={!!assigningOrderId}
          onOpenChange={(o) => {
            if (!o) setAssigningOrderId(null);
          }}
          order={assigningOrder}
        />
      </>
    );
  }

  if (selectedOrderId && !selectedOrder) {
    return (
      <div className="px-[clamp(14px,3vw,28px)] py-10">
        <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400">
          That order isn&apos;t in the current view.
        </p>
        <button
          type="button"
          className={cn(CONTROL_LG, "mt-3")}
          onClick={() => setSelectedOrderId(null)}
        >
          Back to orders
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------ filtering */

  const matchesType = (order: Order) => {
    if (orderType === "all") return true;
    if (orderType === "delivery") return order.type === "delivery";
    if (orderType === "table") return order.type === "table_order";
    if (orderType === "pos") return order.type === "pos";
    return true;
  };

  const matchesSearch = (order: Order) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      order.id.toLowerCase().includes(query) ||
      (order.display_id ? String(order.display_id).toLowerCase().includes(query) : false) ||
      (order.user?.phone?.toLowerCase().includes(query) ?? false) ||
      order.items.some((item) => item.name.toLowerCase().includes(query)) ||
      (order.phone?.includes(query) ?? false) ||
      (order.tableNumber?.toString().includes(query) ?? false)
    );
  };

  const matchesTab = (order: Order, which: Tab) => {
    if (which === "all") return true;
    if (which === "live") return LIVE_ORDER_STATUSES.has(order.status);
    if (which === "completed") return order.status === "completed";
    return order.status === "cancelled";
  };

  const preFiltered = sourceOrders.filter((o) => matchesType(o) && matchesSearch(o));

  const counts = {
    all: preFiltered.length,
    live: preFiltered.filter((o) => matchesTab(o, "live")).length,
    completed: preFiltered.filter((o) => matchesTab(o, "completed")).length,
    cancelled: preFiltered.filter((o) => matchesTab(o, "cancelled")).length,
  };

  const filtered = preFiltered
    .filter((o) => matchesTab(o, tab))
    .filter((o) => statusFilter === "all" || o.status === statusFilter)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      switch (sortBy) {
        case "oldest":
          return dateA - dateB;
        case "highest":
          return b.totalPrice - a.totalPrice;
        case "lowest":
          return a.totalPrice - b.totalPrice;
        // Soonest slot first. Orders with no slot aren't prebooked, so they sink
        // to the bottom and keep newest-first among themselves.
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

  // Only the history view pages client-side; the live feed is paged by its own
  // subscription, and drafts/prebookings are single, bounded lists.
  const pageRows =
    source === "all"
      ? filtered.slice((allPage - 1) * ALL_PAGE_SIZE, allPage * ALL_PAGE_SIZE)
      : filtered;

  const dueSoon = activePrebookings
    .filter((o) => getPrebookUrgency(o, nowTs))
    .sort((a, b) => (getPrebookInstant(a) ?? 0) - (getPrebookInstant(b) ?? 0));

  const loading = source === "all" ? historyLoading : source === "live" ? liveLoading : false;

  const resultLabel = (() => {
    if (loading) return "Loading orders…";
    if (source === "all") {
      if (!filtered.length) return "No orders";
      const start = (allPage - 1) * ALL_PAGE_SIZE + 1;
      const end = Math.min(allPage * ALL_PAGE_SIZE, filtered.length);
      return `Showing ${start}–${end} of ${filtered.length} orders`;
    }
    if (source === "live") {
      const shown = filtered.length;
      return totalCount
        ? `Showing ${shown} of ${totalCount} orders · page ${currentPage}`
        : `Showing ${shown} order${shown === 1 ? "" : "s"}`;
    }
    return `${filtered.length} ${source === "draft" ? "draft" : "prebooked"} order${
      filtered.length === 1 ? "" : "s"
    }`;
  })();

  const prevDisabled = source === "all" ? allPage <= 1 : source !== "live" || !hasPreviousPage;
  const nextDisabled =
    source === "all"
      ? allPage * ALL_PAGE_SIZE >= filtered.length
      : source !== "live" || !hasNextPage;

  const goPrev = () => (source === "all" ? setAllPage((p) => Math.max(1, p - 1)) : previousPage());
  const goNext = () =>
    source === "all"
      ? setAllPage((p) => (p * ALL_PAGE_SIZE >= filtered.length ? p : p + 1))
      : nextPage();

  const openPrebookings = () => {
    setSource((s) => (s === "prebook" ? "live" : "prebook"));
    setSortBy("prebook"); // a prep list is only useful in slot order
    setTab("all");
  };

  const toggleSource = (next: Source) => {
    setSource((s) => (s === next ? "live" : next));
    setTab("all");
  };

  /* ----------------------------------------------------------- rendering */

  return (
    <div className="flex flex-col gap-4 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* --------------------------------------------------------- toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 gap-y-3 px-3.5 lg:px-0">
        <div className="flex h-[38px] max-w-[400px] flex-[1_1_220px] items-center gap-[9px] rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-800">
          <Search size={16} strokeWidth={1.8} className="shrink-0 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders…"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>

        <FilterMenu
          label={TYPE_FILTERS.find((t) => t.value === orderType)?.label || "All Types"}
          value={orderType}
          options={TYPE_FILTERS}
          onChange={setOrderType}
        />
        <FilterMenu
          label={
            statusFilter === "all"
              ? "All Statuses"
              : statusMeta(statusFilter).label
          }
          value={statusFilter}
          options={[{ value: "all", label: "All Statuses" }, ...STATUS_OPTIONS]}
          onChange={(v) => {
            setStatusFilter(v);
            if (v !== "all") setTab("all");
          }}
        />
        <FilterMenu
          label={SORTS.find((s) => s.value === sortBy)?.label || "Newest First"}
          value={sortBy}
          options={SORTS}
          onChange={chooseSort}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <SourceButton
            active={source === "prebook"}
            onClick={openPrebookings}
            count={activePrebookings.length}
            icon={<CalendarClock size={15} strokeWidth={1.7} />}
          >
            Prebookings
          </SourceButton>
          <SourceButton
            active={source === "all"}
            onClick={() => toggleSource("all")}
            icon={<List size={15} strokeWidth={1.7} />}
          >
            {source === "all" ? "Live orders" : "Show All Orders"}
          </SourceButton>
          <SourceButton
            active={source === "draft"}
            onClick={() => toggleSource("draft")}
            count={drafts.length}
            icon={<FileText size={15} strokeWidth={1.7} />}
          >
            Draft Orders
          </SourceButton>
        </div>
      </div>

      {/* ------------------------------------------------- context notices */}
      {source === "draft" && (
        <Notice tone="amber" className="mx-3.5 lg:mx-0">
          <span>
            Showing <b>draft orders</b> — online orders whose payment is still processing.
            They aren&apos;t confirmed, so they never appear in the live list or ring the
            alarm.
          </span>
          {drafts.length > 0 && (
            <button
              type="button"
              onClick={clearDrafts}
              disabled={clearingDrafts}
              className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 text-[12.5px] font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-zinc-900 dark:text-amber-300 dark:hover:bg-amber-950"
            >
              <Trash2 size={13} strokeWidth={1.8} />
              {clearingDrafts ? "Clearing…" : "Clear drafts"}
            </button>
          )}
        </Notice>
      )}

      {source === "prebook" && (
        <Notice tone="zinc" className="mx-3.5 lg:mx-0">
          <span>
            Showing <b>prebookings</b> — orders scheduled for a later date or slot. They are
            loaded separately from the live list, so a booking taken days ago still shows up
            on the day it is due, and a slot that came and went stays here as overdue.
          </span>
        </Notice>
      )}

      {source !== "draft" && dueSoon.length > 0 && (
        <div className="mx-3.5 rounded-[10px] border border-red-200 bg-red-50 p-3 lg:mx-0 dark:border-red-900 dark:bg-red-950/40">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12.5px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Prepare now
            <span className="text-[11.5px] font-normal normal-case text-red-700/80 dark:text-red-300/80">
              {dueSoon.length} prebooked order{dueSoon.length > 1 ? "s" : ""} due within the
              hour
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {dueSoon.map((order) => {
              const urgency = getPrebookUrgency(order, nowTs)!;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  className="flex w-full flex-col gap-1 rounded-md border border-red-200 bg-white p-2.5 text-left shadow-sm transition-shadow hover:shadow dark:border-red-900 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-zinc-950 dark:text-zinc-50">
                      {hasInvoiceNo(order.display_id)
                        ? `Invoice ${order.display_id}`
                        : `#${order.id.slice(0, 8)}`}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        urgency.tone === "overdue"
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
                      )}
                    >
                      <AlarmClock size={11} strokeWidth={2} />
                      {urgency.label}
                    </span>
                  </div>
                  <span className="text-[12px] font-semibold text-red-700 dark:text-red-300">
                    Prepare by{" "}
                    {order.scheduled_time
                      ? formatPrebookSlotLabel(
                          prebookCfg,
                          order.scheduled_date as string,
                          order.scheduled_time,
                          { dineIn: !!order.booking_persons, to: order.scheduled_time_to },
                        )
                      : formatPrebookDateLabel(order.scheduled_date as string, new Date(nowTs))}
                  </span>
                  <span
                    translate="no"
                    className="notranslate truncate text-[12px] text-zinc-500 dark:text-zinc-400"
                  >
                    {getOrderTypeLabel(order)} · {getTableLocationLabel(order)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ card */}
      <V3Card className="overflow-hidden">
        {/* tabs */}
        <div className="flex flex-wrap items-center gap-2 gap-y-2.5 border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
          {(
            [
              ["all", "All orders", counts.all],
              ["live", "Live", counts.live],
              ["completed", "Completed", counts.completed],
              ["cancelled", "Cancelled", counts.cancelled],
            ] as Array<[Tab, string, number]>
          ).map(([value, label, count]) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "inline-flex h-[34px] items-center gap-[7px] rounded-md border px-[13px] text-[13px] leading-none transition-colors",
                  active
                    ? "border-zinc-950 bg-zinc-950 font-bold text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-200 bg-white font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded-full px-[7px] py-px text-[11px] font-bold",
                    active
                      ? "bg-white text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[158px_104px_minmax(200px,1fr)_82px_116px_138px_84px_126px] items-center bg-zinc-50 dark:bg-zinc-800/50">
              {[
                "Invoice No",
                "Order ID",
                "Table / Location",
                "Payment",
                "Order type",
                "Order status",
                "Total",
                "Actions",
              ].map((head, i) => (
                <div
                  key={head}
                  className={cn(
                    "whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500",
                    i >= 6 && "text-right",
                  )}
                >
                  {head}
                </div>
              ))}
            </div>

            {pageRows.map((order) => {
              const meta = statusMeta(order.status);
              const urgency = getPrebookUrgency(order, nowTs);
              const scheduledDate = order.scheduled_date;
              return (
                <div
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedOrderId(order.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelectedOrderId(order.id);
                  }}
                  className={cn(
                    "grid cursor-pointer grid-cols-[158px_104px_minmax(200px,1fr)_82px_116px_138px_84px_126px] items-center border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50",
                    urgency &&
                      (urgency.tone === "overdue"
                        ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/30"
                        : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30"),
                  )}
                >
                  <div className="flex items-center gap-2.5 px-4 py-3.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-[13px] font-semibold",
                        isDraftInvoiceNo(order.display_id)
                          ? "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          : "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                      )}
                    >
                      {hasInvoiceNo(order.display_id) ? order.display_id : "—"}
                    </div>
                    <div className="min-w-0">
                      <div className="whitespace-nowrap text-[12.5px] font-medium leading-[1.3] text-zinc-700 dark:text-zinc-300">
                        {fmtTz(order.createdAt, tz, "D MMM")}
                      </div>
                      <div className="whitespace-nowrap text-[11.5px] font-medium leading-[1.3] text-zinc-400 dark:text-zinc-500">
                        {fmtTz(order.createdAt, tz, "hh:mm A")}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3.5 font-mono text-[12.5px] font-medium text-zinc-500 dark:text-zinc-400">
                    {order.id.slice(0, 8)}
                  </div>

                  <div className="px-4 py-3.5">
                    <div className="flex items-start gap-[7px] text-[13px] font-medium leading-[1.4] text-zinc-950 dark:text-zinc-50">
                      {hasDropAddress(order) ? (
                        <MapPin size={14} strokeWidth={1.8} className="mt-px shrink-0 text-zinc-400" />
                      ) : order.tableName || order.tableNumber != null ? (
                        <Table2 size={14} strokeWidth={1.8} className="mt-px shrink-0 text-zinc-400" />
                      ) : (
                        <ShoppingBag
                          size={14}
                          strokeWidth={1.8}
                          className="mt-px shrink-0 text-zinc-400"
                        />
                      )}
                      <span translate="no" className="notranslate">
                        {getTableLocationLabel(order)}
                      </span>
                    </div>
                    {scheduledDate && (
                      <div
                        className={cn(
                          "mt-1 text-[11px] font-semibold",
                          urgency
                            ? urgency.tone === "overdue"
                              ? "text-red-700 dark:text-red-400"
                              : "text-amber-700 dark:text-amber-400"
                            : "text-zinc-500 dark:text-zinc-400",
                        )}
                      >
                        {/* Always prefixed, so a scheduled date can never be
                            skim-read as the order's own time. */}
                        Prepare for {formatPrebookDateLabel(scheduledDate, new Date(nowTs))}
                        {order.scheduled_time
                          ? ` · ${formatPrebookSlotLabel(prebookCfg, scheduledDate, order.scheduled_time, { dineIn: !!order.booking_persons, to: order.scheduled_time_to })}`
                          : ""}
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3.5">
                    <TagBadge>{getPaymentDisplayLabel(order)}</TagBadge>
                  </div>

                  <div className="px-4 py-3.5">
                    <TagBadge>{getOrderTypeLabel(order)}</TagBadge>
                  </div>

                  <div className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        disabled={isCancelledOrderFrozen(order, userData)}
                      >
                        <button type="button" aria-label="Change order status">
                          <DotPill tone={meta.tone} className="cursor-pointer">
                            {meta.label}
                            <ChevronDown size={12} strokeWidth={2.2} className="opacity-60" />
                          </DotPill>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(lockEnabled && order.status === "completed"
                          ? STATUS_OPTIONS.filter((s) =>
                              ["completed", "cancelled"].includes(s.value),
                            )
                          : STATUS_OPTIONS
                        ).map((s) => (
                          <DropdownMenuItem
                            key={s.value}
                            onClick={() => handleUpdateStatus(order.id, s.value)}
                          >
                            {s.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="px-4 py-3.5 text-right text-[13.5px] font-semibold tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                    {money(currency, order.totalPrice, 0)}
                  </div>

                  <div
                    className="flex items-center justify-end gap-1.5 px-4 py-3.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" aria-label="Print" className={ICON_BTN}>
                          <Printer size={15} strokeWidth={1.7} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePrint(order, ["kot"])}>
                          Print KOT
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(order, ["bill"])}>
                          Print Bill
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(order, ["kot", "bill"])}>
                          Print KOT + Bill
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                      type="button"
                      aria-label="Open order"
                      onClick={() => setSelectedOrderId(order.id)}
                      className={cn(
                        ICON_BTN,
                        "text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950",
                      )}
                    >
                      <ReceiptText size={15} strokeWidth={1.7} />
                    </button>

                    {/* A completed order is a financial record — the sale
                        happened. Deleting it would silently rewrite revenue, so
                        the action is withdrawn once it is done. */}
                    {!isOrderCompleted(order) && (
                      <button
                        type="button"
                        aria-label="Delete order"
                        onClick={() => handleDelete(order)}
                        className={cn(
                          ICON_BTN,
                          "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
                        )}
                      >
                        <Trash2 size={15} strokeWidth={1.7} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* mobile cards — the design's table is 1080px wide, which on a phone
            would be a screen the partner has to drag sideways to read. Same
            data, same actions, stacked. */}
        <div className="lg:hidden">
          {pageRows.map((order) => {
            const meta = statusMeta(order.status);
            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOrderId(order.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSelectedOrderId(order.id);
                }}
                className="flex cursor-pointer flex-col gap-2.5 border-t border-zinc-100 px-3.5 py-3 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                    {hasInvoiceNo(order.display_id)
                      ? `#${order.display_id}`
                      : `#${order.id.slice(0, 8)}`}
                  </span>
                  <DotPill tone={meta.tone}>{meta.label}</DotPill>
                  <span className="ml-auto text-[11.5px] font-medium text-zinc-400 dark:text-zinc-500">
                    {fmtTz(order.createdAt, tz, "D MMM · hh:mm A")}
                  </span>
                </div>

                <div className="flex items-start gap-[7px] text-[13px] font-medium leading-[1.4] text-zinc-950 dark:text-zinc-50">
                  {hasDropAddress(order) ? (
                    <MapPin size={14} strokeWidth={1.8} className="mt-px shrink-0 text-zinc-400" />
                  ) : (
                    <ShoppingBag
                      size={14}
                      strokeWidth={1.8}
                      className="mt-px shrink-0 text-zinc-400"
                    />
                  )}
                  <span translate="no" className="notranslate">
                    {getTableLocationLabel(order)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <TagBadge>{getOrderTypeLabel(order)}</TagBadge>
                  <TagBadge>{getPaymentDisplayLabel(order)}</TagBadge>
                  <span className="ml-auto text-[14px] font-semibold tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                    {money(currency, order.totalPrice, 0)}
                  </span>
                </div>

                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isCancelledOrderFrozen(order, userData)}>
                      <button type="button" className={cn(ICON_BTN, "w-auto gap-1.5 px-2.5 text-[12.5px] font-medium")}>
                        Status
                        <ChevronDown size={13} strokeWidth={2} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(lockEnabled && order.status === "completed"
                        ? STATUS_OPTIONS.filter((s) =>
                            ["completed", "cancelled"].includes(s.value),
                          )
                        : STATUS_OPTIONS
                      ).map((s) => (
                        <DropdownMenuItem
                          key={s.value}
                          onClick={() => handleUpdateStatus(order.id, s.value)}
                        >
                          {s.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label="Print" className={ICON_BTN}>
                        <Printer size={15} strokeWidth={1.7} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handlePrint(order, ["kot"])}>
                        Print KOT
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint(order, ["bill"])}>
                        Print Bill
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint(order, ["kot", "bill"])}>
                        Print KOT + Bill
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {!isOrderCompleted(order) && (
                    <button
                      type="button"
                      aria-label="Delete order"
                      onClick={() => handleDelete(order)}
                      className={cn(
                        ICON_BTN,
                        "ml-auto text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
                      )}
                    >
                      <Trash2 size={15} strokeWidth={1.7} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* empty / loading */}
        {loading && pageRows.length === 0 && (
          <div className="flex flex-col items-center gap-2.5 border-t border-zinc-100 px-5 py-16 dark:border-zinc-800">
            <Loader2 size={22} strokeWidth={1.8} className="animate-spin text-zinc-400" />
            <div className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
              Loading orders…
            </div>
          </div>
        )}

        {!loading && pageRows.length === 0 && (
          <div className="flex flex-col items-center gap-2.5 border-t border-zinc-100 px-5 py-16 dark:border-zinc-800">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-500">
              <Ban size={20} strokeWidth={1.7} />
            </div>
            <div className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300">
              {emptyTitle(tab, source)}
            </div>
            <div className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
              {emptyBody(tab, source, !!searchQuery.trim())}
            </div>
          </div>
        )}

        {/* footer */}
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 bg-zinc-50 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
          <span className="text-[12.5px] font-semibold text-zinc-500 dark:text-zinc-400">
            {resultLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={prevDisabled}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:disabled:text-zinc-500 dark:disabled:hover:bg-zinc-800"
            >
              <ChevronLeft size={14} strokeWidth={2} />
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={nextDisabled}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:disabled:text-zinc-500 dark:disabled:hover:bg-zinc-800"
            >
              Next
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </V3Card>

      {/* ---------------------------------------------------------- dialogs */}
      <PaymentMethodChooseV2
        isOpen={paymentModalOpen}
        onClose={() => {
          // Cancelling leaves the order not-completed and prints nothing.
          setPaymentModalOpen(false);
          setOrderToPrint(null);
        }}
        onConfirm={handlePaymentChosen}
      />

      <PasswordProtectionModal
        isOpen={passwordOpen}
        onClose={() => setPasswordOpen(false)}
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
          isPetpooja={!!partner?.petpooja_restaurant_id}
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

/* ------------------------------------------------------------------ bits */

function FilterMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={CONTROL_LG}>
          {label}
          <ChevronDown size={15} strokeWidth={2} className="text-zinc-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SourceButton({
  active,
  onClick,
  icon,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex h-[38px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-md border px-[13px] text-[13px] font-medium leading-none transition-colors",
        active
          ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
      )}
    >
      <span className={active ? "" : "text-zinc-500 dark:text-zinc-400"}>{icon}</span>
      {children}
      {!!count && (
        <span
          className={cn(
            "rounded-full px-[6px] py-px text-[10.5px] font-bold",
            active
              ? "bg-white text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Notice({
  tone,
  className,
  children,
}: {
  tone: "amber" | "zinc";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[10px] border px-4 py-2.5 text-[12.5px] leading-[1.5]",
        tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
          : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300",
        className,
      )}
    >
      {children}
    </div>
  );
}

const emptyTitle = (tab: Tab, source: Source) => {
  if (source === "draft") return "No draft orders";
  if (source === "prebook") return "No prebookings";
  if (tab === "cancelled") return "No cancelled orders";
  if (tab === "completed") return "No completed orders";
  if (tab === "live") return "No live orders";
  return "No orders yet";
};

const emptyBody = (tab: Tab, source: Source, searching: boolean) => {
  if (searching) return "Nothing matches your search in this view.";
  if (source === "draft") return "Unpaid online orders would appear here.";
  if (source === "prebook") return "Scheduled orders show up here as they are booked.";
  if (tab === "cancelled") return "Nothing was cancelled in the selected period.";
  if (tab === "completed") return "Completed orders will collect here.";
  if (tab === "live") return "New orders appear here the moment they come in.";
  return "Orders appear here as soon as customers place them.";
};
