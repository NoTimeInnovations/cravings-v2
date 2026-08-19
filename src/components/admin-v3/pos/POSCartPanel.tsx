"use client";

import * as React from "react";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MessageSquare,
  Minus,
  Pencil,
  Plus,
  Printer,
  Save,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { discountFields } from "@/api/discounts";
import { subscriptionQuery } from "@/api/orders";
import { calculateGstForItems } from "@/components/hotelDetail/OrderDrawer";
import { PasswordProtectionModal } from "@/components/admin-v2/PasswordProtectionModal";
import {
  bxgyFreebieUnits,
  bxgyRepeatCount,
  bxgyRewardAmount,
  describeBxgy,
} from "@/lib/bxgy";
import { computeDiscountAmount, getDiscountAmount } from "@/lib/discountUtils";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { isCancelledOrderFrozen, isCompletedOrderLockEnabled } from "@/lib/orderStatus";
import { localDateInTz, todayLocalDate, todayRange } from "@/lib/partnerTime";
import { printKotAndBill, type PrintDoc } from "@/lib/printOrder";
import { computeRoundOff, isRoundOffEnabled } from "@/lib/roundOff";
import {
  applyTakeawayAdjustment,
  getTakeawayAdjustment,
  takeawayChargeForItems,
  takeawayUnitAdjustment,
} from "@/lib/takeawayPricing";
import { Partner, useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";

import { AdminV3Button } from "../ui/primitives";
import {
  CARD,
  CONTROL,
  DotPill,
  FIELD_LABEL,
  ICON_BTN,
  INPUT,
  MetaPill,
  fmtTz,
  statusMeta,
} from "../orders/shared";

/**
 * /admin-v3 → POS, right-hand CART / BILL panel.
 *
 * A restyle of admin-v2's `pos/POSCartSidebar.tsx`, not a rewrite: every number
 * on this screen is money a cashier is about to take, so the totals block, the
 * discount evaluation, the GST scaling and the round-off are lifted VERBATIM
 * from v2 (which in turn mirrors `posStore.checkout`). Only the presentation
 * moved to the v3 vocabulary — the zinc palette, the 10px inner card, the 36px
 * control height, `DotPill` for status.
 *
 * The store is the integration seam. This panel reads and writes `usePOSStore`
 * and nothing else: the menu panel adds lines, this one prices, discounts,
 * takes payment and prints them. No parallel copy of the cart lives here.
 *
 * Three known v2 behaviours are preserved deliberately rather than "fixed",
 * because fixing them here would make the two dashboards disagree about money:
 *   - Round-off is folded into the cart's grand total but is NOT applied to a
 *     re-opened past order's total (posStore.updateOrder skips it too), so a
 *     round-off partner can see up to a 0.50 difference between the two.
 *   - Only ONE discount survives per bill unless the partner enabled stacking
 *     (`posStore.addDiscount` replaces the array); adding a second silently
 *     replaces the first.
 *   - Clear / Cancel-edit wipes the cart with no confirmation.
 * Each is flagged in the report rather than changed.
 */

type ViewMode = "current" | "today";

const orderTypeLabel = (order: any): string => {
  if (order?.type === "delivery" && !order?.deliveryAddress) return "Takeaway";
  if (order?.type === "delivery") return "Delivery";
  if (order?.type === "table_order" || order?.type === "pos") return "Dine-in";
  return order?.type ?? "";
};

/** "Table 4" / the table's own name / null when the order has no table at all.
 *  v2's LIST renders a bare fallback here and prints a literal "Table null" for
 *  takeaway and delivery rows; guarded in both places now. */
const tableLabel = (order: any): string | null => {
  if (order?.tableName) return order.tableName;
  if (order?.tableNumber) return `Table ${order.tableNumber}`;
  return null;
};

/* ------------------------------------------------------------------ shell */

function PanelHeader({
  onMobileBack,
  title,
  sub,
  children,
}: {
  onMobileBack?: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
      {onMobileBack && (
        <button
          type="button"
          onClick={onMobileBack}
          aria-label="Back to menu"
          // lg, not md: the POS shell shows one panel at a time below lg, so at md
          // this was hidden while the cart was still the only visible panel —
          // opening the cart on a tablet left no way back to the menu.
          className={cn(ICON_BTN, "h-9 w-9 lg:hidden")}
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[14.5px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
          {title}
        </h2>
        {sub ? (
          <p className="mt-0.5 truncate text-[12px] leading-tight text-zinc-500 dark:text-zinc-400">
            {sub}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** A dashed "add another thing to this bill" button — Charge / Note / Discount. */
function DashedButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 bg-white px-2 text-[12px] font-medium leading-none text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ================================================================= panel */

export function POSCartPanel({
  onMobileBack,
  initialViewMode = "current",
}: {
  onMobileBack?: () => void;
  initialViewMode?: ViewMode;
}) {
  const {
    cartItems,
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
    discounts,
    addDiscount,
    removeDiscount,
  } = usePOSStore();

  const { userData } = useAuthStore();
  const partnerData = userData as Partner;
  const currency = partnerData?.currency || "₹";
  // `partners.timezone` is a real column the Partner interface doesn't declare —
  // same cast admin-v2 and the v3 Orders screen use.
  const partnerTz = (userData as any)?.timezone as string | undefined;

  /** Display-only. The maths below never rounds through this. */
  const fmt = React.useCallback(
    (amount: number) =>
      `${currency}${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [currency],
  );

  // Per-item takeaway surcharge, applied to displayed prices/totals only when the
  // takeaway order type is selected (mirrors the baked-in price used at checkout).
  const takeawayAdjustment =
    posOrderType === "takeaway" ? getTakeawayAdjustment(partnerData) : 0;

  /* ------------------------------------------------------------ UI state */

  const [viewMode, setViewMode] = React.useState<ViewMode>(initialViewMode);
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
  const [newChargeName, setNewChargeName] = React.useState("");
  const [newChargeAmount, setNewChargeAmount] = React.useState("");
  const [isAddingDiscount, setIsAddingDiscount] = React.useState(false);
  const [discountType, setDiscountType] = React.useState<
    "percentage" | "flat" | "freebie" | "bxgy"
  >("percentage");
  // Saved BXGY offers the partner defined in Settings. Unlike the other three
  // types, a BXGY isn't typed in at the counter — it's a rule, so staff pick one
  // and it's evaluated against the cart.
  const [bxgyOffers, setBxgyOffers] = React.useState<any[]>([]);
  const [discountValue, setDiscountValue] = React.useState("");
  const [discountReason, setDiscountReason] = React.useState("");
  const [showBillDetails, setShowBillDetails] = React.useState(false);
  const [isAddingExtraCharge, setIsAddingExtraCharge] = React.useState(false);
  const [isAddingCustomItem, setIsAddingCustomItem] = React.useState(false);
  const [customItemName, setCustomItemName] = React.useState("");
  const [customItemPrice, setCustomItemPrice] = React.useState("");
  const [isAddingNote, setIsAddingNote] = React.useState(false);
  const [isSelectingPaymentMethod, setIsSelectingPaymentMethod] = React.useState(false);
  // Which documents the payment chooser should print once a method is picked.
  // The chooser is opened by Bill / KOT+Bill, so it has to remember which.
  const [pendingPrintDocs, setPendingPrintDocs] = React.useState<PrintDoc[]>(["bill"]);
  const [passwordModalOpen, setPasswordModalOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);
  const [actionDescription, setActionDescription] = React.useState("");

  // Fresh version of the selected order from the store's list, so the live
  // subscription keeps the detail panel current.
  const activeOrderData = selectedOrder
    ? pastBills.find((o) => o.id === selectedOrder.id) || selectedOrder
    : null;

  // True when the order loaded into the cart for editing is a locked completed
  // order (covers the race where it completes via live subscription mid-edit).
  // Store guards make the cart mutations no-ops; this disables the button too.
  const editingLoadedOrder = editingOrderId
    ? pastBills.find((b) => b.id === editingOrderId)
    : null;
  const editLocked =
    !!editingLoadedOrder &&
    isCompletedOrderLockEnabled(userData) &&
    editingLoadedOrder.status === "completed";

  /* ------------------------------------------------------------- effects */

  // A table implies dine-in.
  React.useEffect(() => {
    if (tableNumber) setPosOrderType("dine-in");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNumber]);

  // Real-time subscription for today's orders.
  React.useEffect(() => {
    if (!userData?.id) return;

    // "Today" in the PARTNER's timezone (not the cashier's device), so a POS near
    // local midnight or in a different tz still lists the right bills.
    const { startISO: todayStart, endISO: todayEnd } = todayRange(
      (userData as any)?.timezone,
    );

    const unsubscribe = subscribeToHasura({
      query: subscriptionQuery,
      variables: {
        partner_id: userData.id,
        today_start: todayStart,
        today_end: todayEnd,
      },
      onNext: (data: any) => {
        if (data?.data?.orders) {
          // Map Hasura snake_case to camelCase for the UI.
          const mappedOrders = data.data.orders.map((order: any) => ({
            ...order,
            createdAt: order.created_at,
            tableNumber: order.table_number,
            totalPrice: order.total_price,
            gstIncluded: order.gst_included,
            tableName: order.table_name || order.qr_code?.table_name,
            deliveryAddress: order.delivery_address,
            extraCharges: order.extra_charges || [],
            discounts: order.discounts || [],
          }));
          usePOSStore.setState({ pastBills: mappedOrders });
        }
      },
      onError: (err: unknown) => console.error("Subscription error:", err),
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      } else if (unsubscribe && typeof (unsubscribe as any).dispose === "function") {
        (unsubscribe as any).dispose();
      }
    };
    // Re-open the window if the partner changes their timezone mid-session.
  }, [userData?.id, (userData as any)?.timezone]);

  // Load the partner's saved BXGY offers once the discount panel is opened on
  // that type. Only BXGY — the other three are typed in by hand.
  React.useEffect(() => {
    const partnerId = (partnerData as any)?.id;
    if (!isAddingDiscount || discountType !== "bxgy" || !partnerId || bxgyOffers.length)
      return;
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
      .then((res: any) => setBxgyOffers(res?.discounts ?? []))
      .catch(() => toast.error("Couldn't load your BXGY offers"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddingDiscount, discountType, (partnerData as any)?.id]);

  /* ------------------------------------------------------------ handlers */

  const handleOrderTypeChange = (type: "dine-in" | "takeaway" | "delivery") => {
    setPosOrderType(type);
    // Only dine-in uses a table; clear it for takeaway and delivery, otherwise a
    // dine-in table leaks onto a delivery order.
    if (type !== "dine-in") setTableNumber(null);
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
        setViewMode("today");
      } else {
        await checkout();
      }
      // Suppress the store's own success modal — this panel shows inline feedback.
      setPostCheckoutModalOpen(false);
      setIsOrderPlaced(true);

      setTimeout(() => {
        const currentOrder = usePOSStore.getState().order;
        const activeEditingId = editingOrderId;

        if (currentOrder) {
          setSelectedOrder(currentOrder);
          setViewMode("today");
        } else if (activeEditingId) {
          const fresh = usePOSStore
            .getState()
            .pastBills.find((b) => b.id === activeEditingId);
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
      // checkout()/updateOrder() already toast; just release the spinner.
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    // Cancelled orders are frozen when the lock is on — no status change at all.
    if (
      isCompletedOrderLockEnabled(userData) &&
      activeOrderData?.status === "cancelled"
    ) {
      toast.error("This order is cancelled and locked. Its status can't be changed.");
      return;
    }
    if (activeOrderData?.status === "completed") {
      // Lock ON: the only permitted transition is cancel (runs directly, no
      // password). Lock OFF: keep the legacy password-gated behaviour.
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
    addExtraCharge({ name: newChargeName, amount: parseFloat(newChargeAmount) });
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

  const posMenuNameOf = (id: string) =>
    usePOSStore.getState().cartItems.find((i) => i.id === id)?.name;
  const posMenuPriceOf = (id: string) =>
    Number(usePOSStore.getState().cartItems.find((i) => i.id === id)?.price) || 0;

  // Evaluate a saved BXGY against what's in the cart right now. The POS bills
  // every line at the raw menu price (never an offer price), so the whole food
  // subtotal is the discountable base here — unlike the storefront.
  const evaluateBxgy = (offer: any) => {
    const cart = usePOSStore.getState().cartItems;
    const base = cart.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0,
    );
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

    addDiscount({ type: discountType, value: val, reason: discountReason });

    setDiscountValue("");
    setDiscountReason("");
    setIsAddingDiscount(false);
  };

  /* --------------------------------------------------------- today's list */

  // Filter to the partner's local "today" (not the device's day).
  const todayLocal = todayLocalDate(partnerTz);
  const todaysOrders = pastBills
    .filter(
      (order) =>
        order.createdAt && localDateInTz(order.createdAt, partnerTz) === todayLocal,
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const hasPendingOrders = todaysOrders.some((order) => order.status === "pending");

  /* ============================================================== TOTALS ==
   * Lifted verbatim from admin-v2's POSCartSidebar, which mirrors
   * posStore.checkout. Order of operations is load-bearing: takeaway surcharge
   * → extra charges → discount → GST on the DISCOUNTED food only → round-off.
   * Do not re-derive.
   * ====================================================================== */

  const posCartItems = cartItems;
  const effectivePosItems = applyTakeawayAdjustment(posCartItems, takeawayAdjustment);
  // Surcharge applies to menu items only — custom items are billed as typed.
  const effectiveFoodAmount =
    totalAmount + takeawayChargeForItems(posCartItems, takeawayAdjustment);

  const extraChargesTotal = extraCharges.reduce((acc, curr) => acc + curr.amount, 0);
  const subtotal = effectiveFoodAmount + extraChargesTotal;

  const discountAmount = discounts.reduce((total, discount) => {
    if (discount.type === "freebie" || discount.type === "bxgy") {
      // Both are a fixed amount: the freebie's item price, or the BXGY reward as
      // evaluated against the cart when it was applied.
      return total + (discount.value || 0);
    }
    return total + computeDiscountAmount(discount as any, subtotal);
  }, 0);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const discountedFoodAmount = Math.max(0, effectiveFoodAmount - discountAmount);
  const discRatio = effectiveFoodAmount > 0 ? discountedFoodAmount / effectiveFoodAmount : 0;
  const adjItems = effectivePosItems.map((item) => ({
    price: item.price * discRatio,
    quantity: item.quantity,
    tax_inclusive: item.tax_inclusive,
  }));
  const { additionalGst: gstAmount } = calculateGstForItems(
    adjItems,
    partnerData?.gst_percentage || 0,
  );
  const preRoundTotal = discountedSubtotal + gstAmount;
  // Round Off: match posStore's persisted total when the partner enables it.
  // Folded into the total, never shown as its own breakdown row (same as v2).
  const roundOff = isRoundOffEnabled(partnerData?.delivery_rules)
    ? computeRoundOff(preRoundTotal)
    : 0;
  const grandTotal = Math.round((preRoundTotal + roundOff) * 100) / 100;

  /* ---------------------------------------------- past-order (detail) maths */

  const activeOrderDataSubtotal = activeOrderData
    ? (activeOrderData.items || (activeOrderData as any).order_items)?.reduce(
        (acc: number, item: any) => {
          const itemData = item.item || item;
          const price = itemData.price || 0;
          const quantity = item.quantity || 1;
          return acc + price * quantity;
        },
        0,
      )
    : 0;

  const activeOrderDataExtraCharges = (activeOrderData as any)?.extraCharges || [];
  const activeOrderDataExtraChargesTotal = activeOrderDataExtraCharges.reduce(
    (acc: number, curr: any) => acc + (curr.amount || 0),
    0,
  );

  const activeOrderDataTotal =
    activeOrderDataSubtotal + activeOrderDataExtraChargesTotal;

  const activeOrderDataDiscounts = (activeOrderData as any)?.discounts || [];
  const activeOrderDataDiscountAmount = activeOrderDataDiscounts.reduce(
    (total: number, discount: any) =>
      total + getDiscountAmount(discount, activeOrderDataTotal),
    0,
  );

  const activeOrderDataDiscountedTotal = Math.max(
    0,
    activeOrderDataTotal - activeOrderDataDiscountAmount,
  );
  const activeOrderDataDiscountedFoodSubtotal = Math.max(
    0,
    activeOrderDataSubtotal - activeOrderDataDiscountAmount,
  );

  const activeOrderDataGstPercentage = partnerData?.gst_percentage || 0;
  // Must match the cart's calculation (calculateGstForItems above), not a flat
  // percentage. getGstAmount() ignores tax_inclusive, so a tax-inclusive item —
  // whose price ALREADY contains the GST — had 5% added again once the order was
  // placed: the cart correctly showed GST 0 / total 70, then the same order
  // re-opened as GST 3.50 / total 73.50, i.e. the customer is billed tax twice.
  // Only tax-EXCLUSIVE items get anything added on top.
  const activeOrderDataItems = activeOrderData
    ? ((activeOrderData.items || (activeOrderData as any).order_items) || []).map(
        (item: any) => {
          const itemData = item.item || item;
          return {
            price: itemData.price || 0,
            quantity: item.quantity || 1,
            // The order_items.item jsonb snapshot only carries
            // {category,id,name,offers,price} — no tax flag — so fall back to the
            // live menu row, which the subscription selects.
            tax_inclusive: itemData.tax_inclusive ?? item.menu?.tax_inclusive,
          };
        },
      )
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

  const activeOrderDataGrandTotal =
    activeOrderDataDiscountedTotal + activeOrderDataGstAmount;

  /* -------------------------------------------------------------- printing */

  // Print entry point for every document combination. Printing NEVER changes the
  // order's status; a missing payment method just detours via the chooser, which
  // then prints the same documents that were asked for.
  const startPrint = (docs: PrintDoc[]) => {
    if (!activeOrderData) return;
    // Only a BILL needs a payment method — a KOT is a kitchen ticket and never
    // showed one. And on delivery nobody at the counter can know it yet: the
    // rider collects at the door, or it was paid online.
    const needsBill = docs.includes("bill");
    const isDelivery =
      activeOrderData.type === "delivery" ||
      (typeof activeOrderData.deliveryAddress === "string" &&
        activeOrderData.deliveryAddress.trim().length > 0);
    if (needsBill && !activeOrderData.payment_method && !isDelivery) {
      setPendingPrintDocs(docs);
      setIsSelectingPaymentMethod(true);
      return;
    }
    printKotAndBill(activeOrderData.id, { docs });
  };

  const handlePrintBill = () => startPrint(["bill"]);
  const handlePrintKot = () => startPrint(["kot"]);
  const handlePrintKotAndBill = () => startPrint(["kot", "bill"]);

  // NOT async: the tabs must be claimed inside the click, before the payment
  // mutation is awaited — otherwise the popup is blocked (WebKit always, Chrome
  // intermittently). printKotAndBill claims them first and runs the mutation in
  // `before`. Deliberately does NOT complete the order.
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

  /* ------------------------------------------------------- derived flags */

  const canEditActiveOrder =
    !!activeOrderData &&
    (userData?.role !== "captain" || activeOrderData.status !== "completed") &&
    !(isCompletedOrderLockEnabled(userData) && activeOrderData.status === "completed");

  const statusOptions =
    isCompletedOrderLockEnabled(userData) && activeOrderData?.status === "completed"
      ? [
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ]
      : [
          { value: "pending", label: "Pending" },
          { value: "accepted", label: "Accepted" },
          { value: "food_ready", label: "Food Ready" },
          { value: "dispatched", label: "Dispatched" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ];

  const editingDisplayId = editingOrderId
    ? pastBills.find((b) => b.id === editingOrderId)?.display_id ||
      editingOrderId.slice(0, 4)
    : null;

  /* ================================================================ render */

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white dark:bg-zinc-900">
      {/* ------------------------------------------------- view switcher */}
      <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="flex h-10 gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode("current")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[5px] text-[12.5px] font-semibold leading-none transition-colors",
              viewMode === "current"
                ? "bg-white text-zinc-950 shadow-[0_1px_2px_0_rgba(9,9,11,.08)] dark:bg-zinc-950 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
            )}
          >
            <ShoppingCart size={14} strokeWidth={1.8} />
            Current Order
          </button>
          <button
            type="button"
            onClick={() => setViewMode("today")}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-[5px] text-[12.5px] font-semibold leading-none transition-colors",
              viewMode === "today"
                ? "bg-white text-zinc-950 shadow-[0_1px_2px_0_rgba(9,9,11,.08)] dark:bg-zinc-950 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
            )}
          >
            <Clock size={14} strokeWidth={1.8} />
            Today&apos;s Orders
            {hasPendingOrders && (
              <span className="absolute right-1.5 top-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-white bg-red-600 dark:border-zinc-900" />
              </span>
            )}
          </button>
        </div>
      </div>

      {viewMode === "current" ? (
        <>
          {/* ------------------------------------ placing / placed overlay */}
          {(isPlacingOrder || isOrderPlaced) && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm transition-opacity duration-300 dark:bg-zinc-950/85">
              {isOrderPlaced ? (
                <div className="flex animate-in flex-col items-center text-green-600 duration-300 zoom-in dark:text-green-400">
                  <Check size={56} strokeWidth={2.2} className="mb-3" />
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">
                    Order Placed
                  </h3>
                </div>
              ) : (
                <div className="flex flex-col items-center text-zinc-700 dark:text-zinc-200">
                  <Loader2 size={40} strokeWidth={1.8} className="mb-3 animate-spin" />
                  <p className="text-[14px] font-medium">
                    {editingOrderId ? "Updating order…" : "Placing order…"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------ order header */}
          <PanelHeader
            onMobileBack={onMobileBack}
            title={
              editingOrderId ? (
                <span translate="no" className="notranslate">
                  Editing Order #{editingDisplayId}
                </span>
              ) : (
                "New Order"
              )
            }
          >
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => clearCart()}
                className={cn(
                  CONTROL,
                  "h-9 gap-1.5 px-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50",
                )}
              >
                {editingOrderId ? (
                  <>
                    <X size={14} strokeWidth={1.9} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Trash2 size={14} strokeWidth={1.9} />
                    Clear
                  </>
                )}
              </button>
            )}
          </PanelHeader>

          {/* --------------------------------- customer / type / table */}
          <div className="shrink-0 space-y-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <input
              type="tel"
              inputMode="tel"
              placeholder="Customer phone"
              value={userPhone || ""}
              onChange={(e) => setUserPhone(e.target.value)}
              translate="no"
              className={cn(INPUT, "notranslate")}
            />

            {/* order type */}
            <div className="flex h-9 gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
              {(
                [
                  { value: "dine-in", label: "Dine-In", Icon: Utensils },
                  { value: "takeaway", label: "Takeaway", Icon: ShoppingBag },
                  { value: "delivery", label: "Delivery", Icon: Bike },
                ] as const
              ).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleOrderTypeChange(value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded-[5px] text-[12px] font-semibold leading-none transition-colors",
                    posOrderType === value
                      ? "bg-white text-zinc-950 shadow-[0_1px_2px_0_rgba(9,9,11,.08)] dark:bg-zinc-950 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
                  )}
                >
                  <Icon size={13} strokeWidth={1.9} />
                  {label}
                </button>
              ))}
            </div>

            {/* Delivery: customer name + address. The name links to the customer's
                account by phone at placement; the address defaults to "Address
                not specified" so the order stays a real delivery. */}
            {posOrderType === "delivery" && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Customer name"
                  value={customerName || ""}
                  onChange={(e) => setCustomerName(e.target.value)}
                  translate="no"
                  className={cn(INPUT, "notranslate")}
                />
                <input
                  type="text"
                  placeholder="Delivery address"
                  value={deliveryAddress || ""}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  translate="no"
                  className={cn(INPUT, "notranslate")}
                />
              </div>
            )}

            {/* Table picker — dine-in only */}
            {posOrderType === "dine-in" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      INPUT,
                      "flex items-center justify-between text-left",
                      !tableNumber && "text-zinc-400 dark:text-zinc-500",
                    )}
                  >
                    <span translate="no" className="notranslate truncate">
                      {tableNumber ? tableName || `Table ${tableNumber}` : "Select table"}
                    </span>
                    <ChevronDown size={14} strokeWidth={1.9} className="shrink-0 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-[240px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
                >
                  {tables.length === 0 ? (
                    <div className="px-2 py-3 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                      No tables set up yet.
                    </div>
                  ) : (
                    tables.map((table) => (
                      <DropdownMenuItem
                        key={table.id}
                        className="text-[13px]"
                        onClick={() => {
                          // setTableNumber (not a raw setState) — it clears the
                          // stale QR group + its charges and refetches the new one.
                          setTableNumber(table.number);
                          setTableName(table.name || null);
                        }}
                      >
                        <span translate="no" className="notranslate">
                          {table.name || `Table ${table.number}`}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* -------------------------------------------------- cart lines */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {cartItems.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500">
                <ShoppingCart size={34} strokeWidth={1.4} />
                <p className="text-[13px]">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item) => {
                  const displayUnitPrice = Math.max(
                    0,
                    item.price + takeawayUnitAdjustment(item, takeawayAdjustment),
                  );
                  return (
                    <div
                      key={item.id}
                      className={cn(CARD, "flex w-full items-center gap-2 p-2")}
                    >
                      <div className="min-w-0 flex-1">
                        <h4
                          title={item.name}
                          translate="no"
                          className="notranslate break-words text-[13.5px] font-medium leading-[1.25] text-zinc-950 dark:text-zinc-50"
                        >
                          {item.name}
                        </h4>
                        <p className="mt-0.5 text-[12px] leading-[1.3] text-zinc-500 dark:text-zinc-400">
                          {fmt(displayUnitPrice)} × {item.quantity} ={" "}
                          <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                            {fmt(displayUnitPrice * item.quantity)}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name}`}
                          onClick={() => decreaseQuantity(item.id!)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] text-zinc-600 transition-colors hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                        >
                          <Minus size={14} strokeWidth={2.1} />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={item.quantity}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const v = e.target.value;
                            // Ignore the transient empty string — otherwise
                            // backspacing deletes the line mid-typing.
                            if (v === "") return;
                            const n = parseInt(v, 10);
                            if (Number.isFinite(n)) setQuantity(item.id!, n);
                          }}
                          aria-label={`Quantity for ${item.name}`}
                          className="h-9 w-10 rounded-[5px] bg-transparent text-center text-[13px] font-semibold text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-300 dark:text-zinc-50 dark:focus:ring-zinc-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label={`Increase ${item.name}`}
                          onClick={() => increaseQuantity(item.id!)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] text-zinc-600 transition-colors hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                        >
                          <Plus size={14} strokeWidth={2.1} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {editingOrderId && (
                  <DashedButton className="w-full" onClick={() => onMobileBack?.()}>
                    <Plus size={14} strokeWidth={2} />
                    Add item
                  </DashedButton>
                )}
              </div>
            )}

            {/* Off-menu item: typed name + price, saved with menu_id null */}
            <div className="mt-3">
              {isAddingCustomItem ? (
                <div className="flex animate-in items-center gap-1.5 duration-200 slide-in-from-top-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    translate="no"
                    className={cn(INPUT, "notranslate flex-1")}
                    autoFocus
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCustomItem();
                    }}
                    className={cn(INPUT, "w-[84px]")}
                  />
                  <button
                    type="button"
                    aria-label="Add custom item"
                    onClick={handleAddCustomItem}
                    className={cn(
                      ICON_BTN,
                      "h-9 w-9 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/50",
                    )}
                  >
                    <Check size={16} strokeWidth={2.1} />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel custom item"
                    onClick={() => {
                      setIsAddingCustomItem(false);
                      setCustomItemName("");
                      setCustomItemPrice("");
                    }}
                    className={cn(
                      ICON_BTN,
                      "h-9 w-9 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50",
                    )}
                  >
                    <X size={16} strokeWidth={2.1} />
                  </button>
                </div>
              ) : (
                <DashedButton
                  className="w-full"
                  onClick={() => setIsAddingCustomItem(true)}
                >
                  <Plus size={14} strokeWidth={2} />
                  Add custom item
                </DashedButton>
              )}
            </div>
          </div>

          {/* ------------------------------------------ footer: bill + pay */}
          <div className="shrink-0 space-y-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
            {/* Charge / Note / Discount — one inline editor at a time */}
            {isAddingExtraCharge ? (
              <div className="flex animate-in items-center gap-1.5 duration-200 slide-in-from-top-2">
                <input
                  type="text"
                  placeholder="Charge name"
                  value={newChargeName}
                  onChange={(e) => setNewChargeName(e.target.value)}
                  translate="no"
                  className={cn(INPUT, "notranslate flex-1")}
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newChargeAmount}
                  onChange={(e) => setNewChargeAmount(e.target.value)}
                  className={cn(INPUT, "w-[84px]")}
                />
                <button
                  type="button"
                  aria-label="Add charge"
                  onClick={handleAddExtraCharge}
                  className={cn(
                    ICON_BTN,
                    "h-9 w-9 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/50",
                  )}
                >
                  <Check size={16} strokeWidth={2.1} />
                </button>
                <button
                  type="button"
                  aria-label="Cancel charge"
                  onClick={() => setIsAddingExtraCharge(false)}
                  className={cn(
                    ICON_BTN,
                    "h-9 w-9 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50",
                  )}
                >
                  <X size={16} strokeWidth={2.1} />
                </button>
              </div>
            ) : isAddingNote ? (
              <div className="flex animate-in items-center gap-1.5 duration-200 slide-in-from-top-2">
                <input
                  type="text"
                  placeholder="Add order note…"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  translate="no"
                  className={cn(INPUT, "notranslate flex-1")}
                  autoFocus
                />
                <button
                  type="button"
                  aria-label="Save note"
                  onClick={() => setIsAddingNote(false)}
                  className={cn(
                    ICON_BTN,
                    "h-9 w-9 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/50",
                  )}
                >
                  <Check size={16} strokeWidth={2.1} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                <DashedButton onClick={() => setIsAddingExtraCharge(true)}>
                  <Plus size={13} strokeWidth={2} />
                  Charge
                </DashedButton>
                <DashedButton onClick={() => setIsAddingNote(true)}>
                  <MessageSquare size={13} strokeWidth={2} />
                  {orderNote ? "Edit note" : "Note"}
                </DashedButton>
                <DashedButton onClick={() => setIsAddingDiscount(true)}>
                  <Plus size={13} strokeWidth={2} />
                  Discount
                </DashedButton>
              </div>
            )}

            {orderNote && !isAddingNote && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[12px] leading-tight text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                <span translate="no" className="notranslate min-w-0 flex-1 truncate italic">
                  Note: {orderNote}
                </span>
                <button
                  type="button"
                  aria-label="Remove note"
                  onClick={() => setOrderNote("")}
                  className="shrink-0 text-blue-500 transition-colors hover:text-blue-700 dark:hover:text-blue-200"
                >
                  <Trash2 size={13} strokeWidth={1.9} />
                </button>
              </div>
            )}

            {extraCharges.length > 0 && (
              <div className="space-y-1">
                {extraCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-zinc-100 px-2 py-1.5 text-[12px] leading-tight text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <span translate="no" className="notranslate min-w-0 truncate">
                      {charge.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-medium">{fmt(charge.amount)}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${charge.name}`}
                        onClick={() => removeExtraCharge(charge.id)}
                        className="text-red-500 transition-colors hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 size={13} strokeWidth={1.9} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ------------------------------------------ discount panel */}
            {isAddingDiscount && (
              <div className="animate-in space-y-2 rounded-[10px] border border-zinc-200 bg-white p-2 duration-200 slide-in-from-top-2 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex gap-1.5">
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(
                        e.target.value as "percentage" | "flat" | "freebie" | "bxgy",
                      )
                    }
                    className={cn(INPUT, "w-[104px] shrink-0")}
                  >
                    <option value="percentage">%</option>
                    <option value="flat">Flat</option>
                    <option value="freebie">Freebie</option>
                    <option value="bxgy">BXGY</option>
                  </select>
                  {discountType !== "bxgy" && (
                    <input
                      type="number"
                      placeholder={discountType === "percentage" ? "Percentage" : "Amount"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className={cn(INPUT, "flex-1")}
                      autoFocus
                    />
                  )}
                </div>

                {/* BXGY is a saved rule, not a typed amount — pick one and it is
                    evaluated against what's in the cart right now. */}
                {discountType === "bxgy" && (
                  <div className="max-h-52 space-y-1 overflow-y-auto">
                    {bxgyOffers.length === 0 ? (
                      <p className="px-1 py-2 text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
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
                            className={cn(
                              "w-full rounded-md border px-2 py-2 text-left text-[12px] leading-snug transition-colors",
                              qualifies
                                ? "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-700"
                                : "cursor-not-allowed border-zinc-200 bg-zinc-100 opacity-60 dark:border-zinc-700 dark:bg-zinc-800",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                translate="no"
                                className="notranslate font-mono font-semibold text-zinc-950 dark:text-zinc-50"
                              >
                                {offer.code}
                              </span>
                              {qualifies ? (
                                <span className="font-semibold text-green-700 dark:text-green-400">
                                  −{fmt(amount)}
                                  {repeat > 1 ? ` (${repeat}×)` : ""}
                                </span>
                              ) : (
                                <span className="text-zinc-500 dark:text-zinc-400">
                                  Doesn&apos;t qualify
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                              {describeBxgy(offer, { nameOf: posMenuNameOf })}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  translate="no"
                  className={cn(INPUT, "notranslate")}
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingDiscount(false)}
                    className={cn(
                      CONTROL,
                      "h-9 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50",
                    )}
                  >
                    Cancel
                  </button>
                  {discountType !== "bxgy" && (
                    <AdminV3Button
                      variant="primary"
                      className="h-9"
                      onClick={handleAddDiscount}
                    >
                      Apply discount
                    </AdminV3Button>
                  )}
                </div>
              </div>
            )}

            {discounts.length > 0 && (
              <div className="space-y-1">
                {discounts.map((discount) => (
                  <div
                    key={discount.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[12px] leading-tight text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span translate="no" className="notranslate">
                        {discount.type === "bxgy"
                          ? `BXGY ${discount.code ?? ""}`.trim()
                          : discount.type === "freebie"
                            ? "Freebie (Free Item)"
                            : discount.type === "percentage"
                              ? `${discount.value}% Off`
                              : `Flat ${fmt(discount.value)} Off`}
                      </span>
                      {discount.reason && (
                        <span
                          translate="no"
                          className="notranslate text-[11px] opacity-75"
                        >
                          {discount.reason}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Remove discount"
                      onClick={() => removeDiscount(discount.id)}
                      className="shrink-0 text-red-500 transition-colors hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 size={13} strokeWidth={1.9} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ------------------------------------------------- totals */}
            <div className="border-t border-zinc-200 pt-1 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowBillDetails((v) => !v)}
                className="flex w-full items-center justify-between py-2 text-left"
              >
                <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                  Total
                  {showBillDetails ? (
                    <ChevronDown size={15} strokeWidth={2} className="text-zinc-400" />
                  ) : (
                    <ChevronUp size={15} strokeWidth={2} className="text-zinc-400" />
                  )}
                </span>
                <span className="text-[17px] font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
                  {fmt(grandTotal)}
                </span>
              </button>

              {showBillDetails && (
                <div className="animate-in space-y-1.5 border-t border-dashed border-zinc-200 pt-2 text-[12.5px] leading-tight duration-200 slide-in-from-bottom-2 dark:border-zinc-700">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Subtotal</span>
                    <span>{fmt(effectiveFoodAmount)}</span>
                  </div>
                  {extraCharges.map((charge) => (
                    <div
                      key={charge.id}
                      className="flex justify-between border-l-2 border-zinc-200 pl-2 text-[12px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                    >
                      <span translate="no" className="notranslate">
                        {charge.name}
                      </span>
                      <span>{fmt(charge.amount)}</span>
                    </div>
                  ))}
                  {discounts.map((discount) => {
                    const shownValue =
                      discount.type === "freebie" || discount.type === "bxgy"
                        ? discount.value
                        : computeDiscountAmount(discount as any, subtotal);
                    return (
                      <div
                        key={discount.id}
                        className="flex justify-between gap-2 border-l-2 border-green-300 pl-2 text-[12px] text-green-700 dark:border-green-800 dark:text-green-400"
                      >
                        <span translate="no" className="notranslate min-w-0">
                          {discount.type === "bxgy"
                            ? `BXGY${
                                discount.bxgy_applied_times &&
                                discount.bxgy_applied_times > 1
                                  ? ` ×${discount.bxgy_applied_times}`
                                  : ""
                              }`
                            : discount.type === "freebie"
                              ? `Freebie${discount.reason ? `: ${discount.reason}` : ""} (FREE)`
                              : discount.type === "percentage"
                                ? `${discount.value}% Off`
                                : "Flat Discount"}
                          {discount.type !== "freebie" &&
                            discount.reason &&
                            ` (${discount.reason})`}
                        </span>
                        <span className="shrink-0">− {fmt(shownValue)}</span>
                      </div>
                    );
                  })}
                  {(partnerData?.gst_percentage || 0) > 0 && (
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                      <span>GST ({partnerData?.gst_percentage}%)</span>
                      <span>{fmt(gstAmount)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ------------------------------------------------ checkout */}
            <AdminV3Button
              variant={editingOrderId ? "strong" : "primary"}
              className="h-11 w-full text-[14px]"
              onClick={handlePlaceOrder}
              disabled={
                (cartItems.length === 0 && extraChargesTotal === 0) ||
                isPlacingOrder ||
                editLocked
              }
            >
              {isPlacingOrder ? (
                <Loader2 size={16} strokeWidth={2} className="animate-spin" />
              ) : editingOrderId ? (
                <Save size={16} strokeWidth={2} />
              ) : (
                <CreditCard size={16} strokeWidth={2} />
              )}
              {isPlacingOrder
                ? editingOrderId
                  ? "Updating order…"
                  : "Placing order…"
                : editingOrderId
                  ? "Update order"
                  : "Place order"}
            </AdminV3Button>
          </div>
        </>
      ) : activeOrderData ? (
        /* ================================================ order detail */
        <div className="flex h-full min-h-0 animate-in flex-col duration-200 slide-in-from-right-8">
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <button
              type="button"
              aria-label="Back to today's orders"
              onClick={() => setSelectedOrder(null)}
              className={cn(ICON_BTN, "h-9 w-9")}
            >
              <ArrowLeft size={16} strokeWidth={1.8} />
            </button>
            <div className="min-w-0 flex-1">
              <h3
                translate="no"
                className="notranslate truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50"
              >
                Order #{activeOrderData.display_id || activeOrderData.id?.slice(0, 8)}
              </h3>
              <p className="mt-0.5 truncate text-[12px] leading-tight text-zinc-500 dark:text-zinc-400">
                {tableLabel(activeOrderData) && (
                  <span translate="no" className="notranslate">
                    {tableLabel(activeOrderData)} ·{" "}
                  </span>
                )}
                {orderTypeLabel(activeOrderData)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {canEditActiveOrder && (
                <button
                  type="button"
                  onClick={() => {
                    loadOrderIntoCart(activeOrderData);
                    setViewMode("current");
                  }}
                  className={cn(CONTROL, "h-9 gap-1.5 px-2.5")}
                >
                  <Pencil size={13} strokeWidth={1.9} />
                  Edit
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    // A captain may not touch a completed order, and a cancelled
                    // order is frozen outright when the lock is on.
                    disabled={
                      (userData?.role === "captain" &&
                        activeOrderData.status === "completed") ||
                      isCancelledOrderFrozen(activeOrderData, userData)
                    }
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md disabled:pointer-events-none disabled:opacity-60"
                  >
                    <DotPill tone={statusMeta(activeOrderData.status).tone}>
                      {statusMeta(activeOrderData.status).label}
                      <ChevronDown size={12} strokeWidth={2.2} className="-mr-0.5" />
                    </DotPill>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[150px]">
                  {statusOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      className="text-[13px]"
                      onClick={() => handleStatusUpdate(activeOrderData.id, opt.value)}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            <div className="space-y-2">
              {(activeOrderData.items || (activeOrderData as any).order_items)?.map(
                (item: any, idx: number) => {
                  const itemData = item.item || item;
                  const unitPrice = itemData.price || 0;
                  const quantity = item.quantity || 1;
                  return (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 text-[13.5px] leading-tight"
                    >
                      <div className="flex min-w-0 gap-2">
                        <span className="shrink-0 font-medium text-zinc-500 dark:text-zinc-400">
                          {quantity}×
                        </span>
                        <span
                          translate="no"
                          className="notranslate font-medium text-zinc-950 dark:text-zinc-50"
                        >
                          {itemData.name}
                        </span>
                      </div>
                      <span className="shrink-0 font-medium text-zinc-950 dark:text-zinc-50">
                        {fmt(unitPrice * quantity)}
                      </span>
                    </div>
                  );
                },
              )}
            </div>

            <div className="space-y-1.5 border-t border-zinc-200 pt-3 text-[12.5px] leading-tight dark:border-zinc-800">
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Subtotal</span>
                <span>{fmt(activeOrderDataSubtotal)}</span>
              </div>

              {activeOrderDataExtraChargesTotal > 0 &&
                activeOrderDataExtraCharges.map((charge: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between border-l-2 border-zinc-200 pl-2 text-[12px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    <span translate="no" className="notranslate">
                      {charge.name}
                    </span>
                    <span>{fmt(charge.amount)}</span>
                  </div>
                ))}

              {(activeOrderDataDiscountAmount > 0 ||
                activeOrderDataDiscounts.some((d: any) => d.type === "freebie")) &&
                activeOrderDataDiscounts.map((discount: any, idx: number) => {
                  const shownValue = getDiscountAmount(discount, activeOrderDataTotal);
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-0.5 border-l-2 border-green-300 pl-2 text-[12px] text-green-700 dark:border-green-800 dark:text-green-400"
                    >
                      {discount.type === "freebie" && discount.freebie_item_names && (
                        <div className="flex justify-between gap-2">
                          <span translate="no" className="notranslate min-w-0">
                            {discount.freebie_item_names}{" "}
                            <span className="font-bold">(FREE)</span>
                          </span>
                          <span className="shrink-0">{fmt(shownValue)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <span translate="no" className="notranslate min-w-0">
                          {discount.type === "bxgy"
                            ? `BXGY${
                                discount.bxgy_applied_times &&
                                discount.bxgy_applied_times > 1
                                  ? ` ×${discount.bxgy_applied_times}`
                                  : ""
                              }`
                            : discount.type === "freebie"
                              ? "Freebie Discount"
                              : discount.type === "percentage"
                                ? `${discount.value}% Off`
                                : "Flat Discount"}
                          {discount.reason && ` (${discount.reason})`}
                        </span>
                        <span className="shrink-0">− {fmt(shownValue)}</span>
                      </div>
                    </div>
                  );
                })}

              {activeOrderDataGstPercentage > 0 && (
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>GST ({activeOrderDataGstPercentage}%)</span>
                  <span>{fmt(activeOrderDataGstAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-zinc-200 pt-3 text-[14.5px] font-semibold tracking-[-0.02em] text-zinc-950 dark:border-zinc-800 dark:text-zinc-50">
              <span>Total</span>
              <span>{fmt(activeOrderDataGrandTotal)}</span>
            </div>

            {activeOrderData.notes && (
              <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/40">
                <p className={cn(FIELD_LABEL, "text-amber-700 dark:text-amber-400")}>
                  Note
                </p>
                <p
                  translate="no"
                  className="notranslate mt-1.5 text-[13px] italic leading-snug text-amber-900 dark:text-amber-200"
                >
                  {activeOrderData.notes}
                </p>
              </div>
            )}
          </div>

          {/* -------------------------------------- print / payment footer */}
          <div className="shrink-0 border-t border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            {isSelectingPaymentMethod ? (
              <div className="animate-in space-y-2.5 duration-300 fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
                    Select payment method
                  </h4>
                  <button
                    type="button"
                    aria-label="Cancel payment selection"
                    onClick={() => setIsSelectingPaymentMethod(false)}
                    className={cn(ICON_BTN, "h-9 w-9")}
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "cash", label: "Cash", glyph: "💵" },
                      { value: "upi", label: "UPI", glyph: "📱" },
                      { value: "card", label: "Card", glyph: "💳" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => handlePaymentSelection(m.value)}
                      className="flex h-[62px] flex-col items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      <span className="text-lg leading-none">{m.glyph}</span>
                      <span className="text-[12px] font-medium leading-none">
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePrintBill}
                  className={cn(CONTROL, "h-10 w-full")}
                >
                  <Printer size={15} strokeWidth={1.8} />
                  Bill
                </button>
                <button
                  type="button"
                  onClick={handlePrintKot}
                  className={cn(CONTROL, "h-10 w-full")}
                >
                  <FileText size={15} strokeWidth={1.8} />
                  KOT
                </button>
                {/* One click, two separate print jobs — KOT and bill usually go
                    to different printers. */}
                <button
                  type="button"
                  onClick={handlePrintKotAndBill}
                  className={cn(CONTROL, "col-span-2 h-10 w-full")}
                >
                  <Printer size={15} strokeWidth={1.8} />
                  KOT + Bill
                </button>
                {canEditActiveOrder && (
                  <AdminV3Button
                    variant="primary"
                    className="col-span-2 h-10 w-full"
                    onClick={() => {
                      loadOrderIntoCart(activeOrderData);
                      setViewMode("current");
                    }}
                  >
                    <Pencil size={14} strokeWidth={2} />
                    Edit order
                  </AdminV3Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================================================== today's list */
        <div className="flex h-full min-h-0 flex-col">
          <PanelHeader onMobileBack={onMobileBack} title="Today's Orders">
            <button
              type="button"
              onClick={() => fetchPastBills()}
              disabled={loadingBills}
              className={cn(CONTROL, "h-9")}
            >
              {loadingBills ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                "Refresh"
              )}
            </button>
          </PanelHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {todaysOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-zinc-400 dark:text-zinc-500">
                <Clock size={36} strokeWidth={1.3} />
                <p className="text-[13px]">No orders yet today</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {todaysOrders.map((order) => {
                  const meta = statusMeta(order.status);
                  const table = tableLabel(order);
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className={cn(
                        CARD,
                        "w-full p-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800",
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            translate="no"
                            className="notranslate text-[13.5px] font-bold leading-none text-zinc-950 dark:text-zinc-50"
                          >
                            #{order.display_id || order.id.slice(0, 4)}
                          </span>
                          <MetaPill>{fmtTz(order.createdAt, partnerTz, "h:mm A")}</MetaPill>
                        </div>
                        <DotPill tone={meta.tone}>{meta.label}</DotPill>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[12.5px] leading-tight">
                        <span
                          translate="no"
                          className="notranslate min-w-0 truncate text-zinc-500 dark:text-zinc-400"
                        >
                          {table ? `${table} · ` : ""}
                          {orderTypeLabel(order)}
                        </span>
                        <span className="shrink-0 font-semibold text-zinc-950 dark:text-zinc-50">
                          {fmt(order.totalPrice)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password gate — only fires on a completed order when the completed-order
          lock is OFF (the legacy behaviour v2 kept). */}
      <PasswordProtectionModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={() => pendingAction?.()}
        actionDescription={actionDescription}
      />
    </div>
  );
}

export default POSCartPanel;
