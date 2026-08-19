"use client";

import * as React from "react";
import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Save,
  Search,
  Smartphone,
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
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getOrderByIdQuery,
  updateOrderItemsMutation,
  updateOrderMutation,
} from "@/api/orders";
import { calculateGstForItems } from "@/components/hotelDetail/OrderDrawer";
import { displayChargeName } from "@/lib/chargeLabel";
import { computeDiscountAmount, getDiscountAmount } from "@/lib/discountUtils";
import { scopedBaseFor } from "@/lib/discountStack";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getQrGroupForTable } from "@/lib/getQrGroupForTable";
import { getOrderTypeLabel } from "@/lib/orderLabels";
import { isCancelledOrderFrozen, isCompletedOrderLockEnabled } from "@/lib/orderStatus";
import { taxLabel } from "@/lib/taxLabel";
import { useMenuStore } from "@/store/menuStore_hasura";
import useOrderStore, { type Order } from "@/store/orderStore";
import { Partner, useAuthStore } from "@/store/authStore";

import {
  CARD,
  CARD_HEAD,
  CARD_TITLE,
  CONTROL,
  FIELD_LABEL,
  ICON_BTN,
  INPUT,
  MetaPill,
  money,
  statusMeta,
  toneDotClass,
} from "./shared";

/**
 * The order EDIT sub-view.
 *
 * The maths, the mutations and every guard are lifted verbatim from
 * AdminV2EditOrder — deliberately, because they are load-bearing and subtle:
 * GST is only added to tax-EXCLUSIVE lines, a scoped discount must be recomputed
 * against ITS OWN lines (recomputing it on the whole subtotal silently re-expands
 * it on save), and the update mutation must name every column it owns, because
 * Hasura turns an unprovided variable into an explicit NULL rather than dropping
 * it. What changed here is only the shell around them.
 */

interface EditItem {
  id?: string;
  menu_id: string;
  category_id?: string;
  quantity: number;
  /** GST is added ONLY on tax-exclusive lines. */
  tax_inclusive?: boolean;
  menu: { name: string; price: number };
}

interface ExtraCharge {
  id?: string;
  name: string;
  amount: number;
}

export function OrderEditView({
  order,
  onBack,
  onSaved,
}: {
  order: Order;
  onBack: () => void;
  onSaved?: () => void;
}) {
  const { fetchMenu, items: menuItems } = useMenuStore();
  const {
    updateOrderStatus,
    setPartnerOrders: setOrders,
    partnerOrders: orders,
  } = useOrderStore();
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;

  const currency = partner?.currency || "₹";
  const gstPercentage = partner?.gst_percentage || 0;

  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [items, setItems] = React.useState<EditItem[]>([]);
  const [extraCharges, setExtraCharges] = React.useState<ExtraCharge[]>([]);
  const [discounts, setDiscounts] = React.useState<any[]>([]);
  const [tableNumber, setTableNumber] = React.useState<number | null>(null);
  const [phone, setPhone] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] = React.useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = React.useState<string | null>(null);
  const [orderNote, setOrderNote] = React.useState("");
  const [status, setStatus] = React.useState<string>(order?.status || "pending");
  const [qrGroup, setQrGroup] = React.useState<any>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [newCharge, setNewCharge] = React.useState<{ name: string; amount: string }>({
    name: "",
    amount: "",
  });

  /** Snapshot of the loaded order, so "dirty" is a fact rather than a guess. */
  const baselineRef = React.useRef<string>("");
  const [baselineTotal, setBaselineTotal] = React.useState<number>(order?.totalPrice ?? 0);

  React.useEffect(() => {
    if (order?.partnerId) fetchMenu(order.partnerId);
  }, [order?.partnerId, fetchMenu]);

  React.useEffect(() => {
    if (!order?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetchFromHasura(getOrderByIdQuery, { orderId: order.id });
        const data = response.orders_by_pk;
        if (cancelled || !data) return;

        const loadedItems: EditItem[] = (data.order_items || []).map((item: any) => ({
          id: item.id,
          menu_id: item.menu.id,
          category_id: item.menu?.category?.id,
          quantity: item.quantity,
          tax_inclusive: item.item?.tax_inclusive ?? item.menu?.tax_inclusive ?? false,
          menu: {
            name: item.item?.name || item.menu.name,
            price: item.item?.price || item.menu.price || 0,
          },
        }));
        const loadedCharges: ExtraCharge[] = data.extra_charges || [];

        setItems(loadedItems);
        setExtraCharges(loadedCharges);
        // `?? []` rather than a truthiness guard: the save writes this array
        // back, so it must always mirror the row it was loaded from.
        setDiscounts(data.discounts ?? []);
        setTableNumber(data.table_number ?? null);
        setPhone(data.phone ?? "");
        setPaymentMethod(data.payment_method ?? null);
        // Loaded purely so the save can write it back unchanged — the mutation
        // names this column, and an unset variable becomes an explicit NULL.
        setDeliveryAddress(data.delivery_address ?? null);
        setOrderNote(data.notes ?? "");
        if (data.status) setStatus(data.status);
        setBaselineTotal(data.total_price ?? order.totalPrice ?? 0);
        baselineRef.current = JSON.stringify({
          items: loadedItems,
          charges: loadedCharges,
          tableNumber: data.table_number ?? null,
          phone: data.phone ?? "",
          paymentMethod: data.payment_method ?? null,
          note: data.notes ?? "",
        });
      } catch (error) {
        console.error("[V3 edit order] load failed:", error);
        toast.error("Failed to load order details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Keyed on the ORDER ID alone. The live subscription hands down a new order
    // object whenever anything about it changes, and re-running this on that
    // would silently reload the row over the partner's unsaved edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  /* --------------------------------------------------------------- maths */

  // One definition of "what is this discount worth against these lines", so the
  // summary can never print a different number from the one saved.
  const scopedAmountFor = React.useCallback(
    (disc: any, base: number, lines: EditItem[]) => {
      const scopeLines = lines.map((i) => ({
        id: i.menu_id,
        price: i.menu.price,
        quantity: i.quantity,
      }));
      const categoryOf = (menuId: string) =>
        lines.find((i) => i.menu_id === menuId)?.category_id;
      return disc.type === "freebie"
        ? getDiscountAmount(disc, base)
        : computeDiscountAmount(disc, base, scopedBaseFor(disc, scopeLines, categoryOf));
    },
    [],
  );

  const calculateTotal = React.useCallback(
    (currentItems: EditItem[], currentCharges: ExtraCharge[]) => {
      const foodSubtotal = currentItems.reduce(
        (sum, item) => sum + item.menu.price * item.quantity,
        0,
      );
      const extraChargesTotal = currentCharges.reduce((sum, c) => sum + c.amount, 0);
      const qrGroupCharges = qrGroup?.extra_charge
        ? getExtraCharge(
            currentItems as any[],
            qrGroup.extra_charge,
            qrGroup.charge_type || "FLAT_FEE",
          )
        : 0;

      const subtotal = foodSubtotal + extraChargesTotal + qrGroupCharges;

      const discountAmount = discounts.reduce(
        (total, discount) => total + scopedAmountFor(discount, subtotal, currentItems),
        0,
      );

      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      const discountedFoodSubtotal = Math.max(0, foodSubtotal - discountAmount);

      // GST is added ONLY on tax-EXCLUSIVE lines; scale by the discount ratio
      // first, exactly as posStore.updateOrder does.
      const ratio = foodSubtotal > 0 ? discountedFoodSubtotal / foodSubtotal : 0;
      const { additionalGst: gstAmount } = calculateGstForItems(
        currentItems.map((i) => ({
          price: i.menu.price * ratio,
          quantity: i.quantity,
          tax_inclusive: i.tax_inclusive,
        })),
        gstPercentage,
      );

      return {
        foodSubtotal,
        extraChargesTotal,
        qrGroupCharges,
        discountAmount,
        gstAmount,
        total: discountedSubtotal + gstAmount,
      };
    },
    [discounts, gstPercentage, qrGroup, scopedAmountFor],
  );

  const totals = calculateTotal(items, extraCharges);
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  const dirty =
    !loading &&
    baselineRef.current !==
      JSON.stringify({
        items,
        charges: extraCharges,
        tableNumber,
        phone,
        paymentMethod,
        note: orderNote,
      });

  /* --------------------------------------------------------------- edits */

  const editLocked = () => isCompletedOrderLockEnabled(userData) && status === "completed";

  const setQuantity = (index: number, quantity: number) => {
    if (editLocked() || quantity < 1) return;
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity } : it)));
  };

  const removeItem = (index: number) => {
    if (editLocked()) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTableNumberChange = async (value: number | null) => {
    setTableNumber(value);
    if (value === null) {
      setQrGroup(null);
      return;
    }
    try {
      const partnerId = partner?.id;
      if (!partnerId) return;
      setQrGroup(await getQrGroupForTable(partnerId, value));
    } catch (error) {
      console.error("[V3 edit order] qr group lookup failed:", error);
    }
  };

  /** Menu rows flattened so each variant is separately addable, as in v2. */
  const displayMenuItems = React.useMemo(
    () =>
      menuItems.flatMap((item: any) => {
        if (item.variants && item.variants.length > 0) {
          return item.variants.map((variant: any) => ({
            ...item,
            id: `${item.id}|${variant.name}`,
            name: `${item.name} (${variant.name})`,
            price: variant.price,
          }));
        }
        return item;
      }),
    [menuItems],
  );

  const suggestions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const pool = q
      ? displayMenuItems.filter((i: any) => i.name.toLowerCase().includes(q))
      : displayMenuItems;
    return pool.slice(0, q ? 8 : 6);
  }, [displayMenuItems, searchQuery]);

  const addItem = (flatId: string) => {
    if (editLocked() || !flatId) return;
    const [baseId, variantName] = flatId.split("|");
    const menuItem: any = menuItems.find((item: any) => item.id === baseId);
    if (!menuItem) return;

    let toAdd: EditItem;
    if (variantName) {
      const variant = menuItem.variants?.find((v: any) => v.name === variantName);
      if (!variant) return;
      toAdd = {
        menu_id: baseId,
        quantity: 1,
        // Variants have no tax flag of their own — they inherit the row's.
        tax_inclusive: menuItem.tax_inclusive ?? false,
        category_id: menuItem?.category?.id,
        menu: { name: `${menuItem.name} (${variant.name})`, price: variant.price },
      };
    } else {
      toAdd = {
        menu_id: baseId,
        quantity: 1,
        tax_inclusive: menuItem.tax_inclusive ?? false,
        category_id: menuItem?.category?.id,
        menu: { name: menuItem.name, price: menuItem.price },
      };
    }

    setItems((prev) => {
      const existing = prev.findIndex((i) => i.menu.name === toAdd.menu.name);
      if (existing >= 0) {
        return prev.map((it, i) => (i === existing ? { ...it, quantity: it.quantity + 1 } : it));
      }
      return [...prev, toAdd];
    });
    setSearchQuery("");
  };

  const addCharge = () => {
    if (editLocked()) return;
    const amount = Number(newCharge.amount);
    if (!newCharge.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid charge name and amount");
      return;
    }
    setExtraCharges((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newCharge.name.trim(), amount },
    ]);
    setNewCharge({ name: "", amount: "" });
  };

  const removeCharge = (index: number) => {
    if (editLocked()) return;
    setExtraCharges((prev) => prev.filter((_, i) => i !== index));
  };

  /* --------------------------------------------------------------- save */

  const save = async () => {
    // Defence in depth: entry points already block this, but an order that is
    // completed WHILE the editor is open must not be saveable either.
    if (editLocked()) {
      toast.error("This order is completed and locked — editing is disabled.");
      return;
    }
    if (!items.length) {
      toast.error("Cannot save an order with no items");
      return;
    }

    setUpdating(true);
    try {
      const { total, gstAmount } = calculateTotal(items, extraCharges);

      // Every column this editor owns, named explicitly. Anything NOT meant to
      // change must be left OUT of this object, never passed as null.
      await fetchFromHasura(updateOrderMutation, {
        id: order.id,
        set: {
          total_price: total,
          gst_included: gstAmount,
          phone: phone || "",
          table_number: tableNumber,
          extra_charges: extraCharges.length > 0 ? extraCharges : null,
          discounts: discounts.length > 0 ? discounts : null,
          notes: orderNote || null,
          delivery_address: deliveryAddress,
          payment_method: paymentMethod,
        },
      });

      await fetchFromHasura(updateOrderItemsMutation, {
        orderId: order.id,
        items: items.map((item) => ({
          order_id: order.id,
          menu_id: item.menu_id,
          quantity: item.quantity,
          item: { name: item.menu.name, price: item.menu.price, id: item.menu_id },
        })),
      });

      toast.success("Order updated");
      onSaved?.();
      onBack();
    } catch (error) {
      console.error("[V3 edit order] save failed:", error);
      toast.error("Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  const changeStatus = async (next: string) => {
    if (isCompletedOrderLockEnabled(userData) && status === "cancelled") {
      toast.error("This order is cancelled and locked. Its status can't be changed.");
      return;
    }
    if (
      isCompletedOrderLockEnabled(userData) &&
      status === "completed" &&
      next !== "cancelled"
    ) {
      toast.error("This order is completed and locked. You can only cancel it.");
      return;
    }
    const previous = status;
    setStatus(next); // optimistic, exactly as v2
    try {
      await updateOrderStatus(orders, order.id, next as any, setOrders);
      toast.success("Order status updated");
    } catch (error) {
      console.error("[V3 edit order] status update failed:", error);
      setStatus(previous);
      toast.error("Failed to update status");
    }
  };

  const meta = statusMeta(status);
  const invoiceLabel =
    order.display_id && String(order.display_id).trim()
      ? `#${order.display_id}`
      : `#${order.id.slice(0, 8)}`;

  const statusOptions =
    isCompletedOrderLockEnabled(userData) && status === "completed"
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

  const saveDisabled = updating || loading || items.length === 0 || editLocked();
  const saveLabel = updating ? "Saving…" : dirty ? "Save changes" : "Saved";

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------- header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to order"
          className={cn(ICON_BTN, "h-[34px] w-[34px]")}
        >
          <ArrowLeft size={16} strokeWidth={1.9} />
        </button>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className="text-[16px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Edit Order {invoiceLabel}
          </div>
          <div className="mt-0.5 text-[12.5px] font-normal text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Loading the order…"
              : dirty
                ? "Unsaved changes"
                : tableNumber
                  ? `Table ${tableNumber}`
                  : "No unsaved changes"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isCancelledOrderFrozen({ status }, userData)}>
              <button type="button" className={CONTROL}>
                <span className={cn("h-1.5 w-1.5 rounded-full", toneDotClass(meta.tone))} />
                {meta.label}
                <ChevronDown size={14} strokeWidth={2} className="text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {statusOptions.map((s) => (
                <DropdownMenuItem key={s.value} onClick={() => changeStatus(s.value)}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {dirty && (
            <button type="button" className={CONTROL} onClick={onBack}>
              Discard
            </button>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saveDisabled}
            className="inline-flex h-[34px] shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-900 bg-zinc-900 px-3.5 text-[13px] font-medium leading-none text-zinc-50 transition-colors hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {updating ? (
              <Loader2 size={14} strokeWidth={2} className="animate-spin" />
            ) : (
              <Save size={14} strokeWidth={1.9} />
            )}
            {saveLabel}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={26} strokeWidth={1.8} className="animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-3.5 px-[clamp(14px,3vw,28px)] pb-10 pt-4">
          {/* ---------------------------------------------- left column */}
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-3.5">
            <div className={CARD}>
              <div className={CARD_HEAD}>
                <span className={cn(CARD_TITLE, "flex-[1_1_auto]")}>Items</span>
                <MetaPill>
                  {items.length} line{items.length === 1 ? "" : "s"} · {totalQty} qty
                </MetaPill>
              </div>

              {items.map((item, index) => (
                <div
                  key={`${item.menu_id}-${item.menu.name}-${index}`}
                  className="flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-[1_1_170px]">
                    <div
                      translate="no"
                      className="notranslate text-[13.5px] font-medium leading-[1.35] text-zinc-950 dark:text-zinc-50"
                    >
                      {item.menu.name}
                    </div>
                    <div className="mt-0.5 text-[12px] font-normal leading-[1.4] text-zinc-500 dark:text-zinc-400">
                      {money(currency, item.menu.price, 2)} each
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      title="Decrease"
                      className={ICON_BTN}
                      disabled={editLocked()}
                      onClick={() => setQuantity(index, item.quantity - 1)}
                    >
                      <Minus size={14} strokeWidth={2} />
                    </button>
                    <span className="min-w-[26px] text-center text-[13.5px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      title="Increase"
                      className={ICON_BTN}
                      disabled={editLocked()}
                      onClick={() => setQuantity(index, item.quantity + 1)}
                    >
                      <Plus size={14} strokeWidth={2} />
                    </button>
                  </div>
                  <span className="min-w-[70px] shrink-0 text-right text-[13.5px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                    {money(currency, item.menu.price * item.quantity, 2)}
                  </span>
                  <button
                    type="button"
                    title="Remove item"
                    disabled={editLocked()}
                    onClick={() => removeItem(index)}
                    className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-transparent text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              ))}

              {items.length === 0 && (
                <div className="border-b border-zinc-100 px-4 py-[26px] text-center dark:border-zinc-800">
                  <div className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                    No items left on this order
                  </div>
                  <div className="mt-[3px] text-[12px] font-normal text-zinc-500 dark:text-zinc-400">
                    Add at least one item before saving.
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5 px-4 py-[13px]">
                <div className="flex h-9 items-center gap-[9px] rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
                  <Search size={15} strokeWidth={1.8} className="shrink-0 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Add an item — search the menu…"
                    className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  />
                </div>
                <div className="flex flex-wrap gap-[7px]">
                  {suggestions.map((sg: any) => (
                    <button
                      key={sg.id}
                      type="button"
                      disabled={editLocked()}
                      onClick={() => addItem(sg.id)}
                      className="inline-flex h-8 items-center gap-[7px] rounded-full border border-zinc-200 bg-white px-[11px] text-[12.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      <Plus size={13} strokeWidth={2} className="text-zinc-400" />
                      <span translate="no" className="notranslate max-w-[180px] truncate">
                        {sg.name}
                      </span>
                      <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
                        {money(currency, sg.price, 0)}
                      </span>
                    </button>
                  ))}
                  {suggestions.length === 0 && (
                    <span className="text-[12.5px] text-zinc-400 dark:text-zinc-500">
                      No menu items match “{searchQuery}”.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Charges */}
            <div className={CARD}>
              <div className={CARD_HEAD}>
                <span className={cn(CARD_TITLE, "flex-[1_1_auto]")}>Charges</span>
                <MetaPill>Applied to this order only</MetaPill>
              </div>
              {extraCharges.map((charge, index) => (
                <div
                  key={charge.id || index}
                  className="flex items-center gap-3 border-b border-zinc-100 px-4 py-[11px] dark:border-zinc-800"
                >
                  <span className="min-w-0 flex-[1_1_auto] text-[13px] font-normal text-zinc-700 dark:text-zinc-300">
                    {displayChargeName(charge.name)}
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-zinc-950 dark:text-zinc-50">
                    {money(currency, charge.amount, 2)}
                  </span>
                  <button
                    type="button"
                    title="Remove charge"
                    disabled={editLocked()}
                    onClick={() => removeCharge(index)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-transparent text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 px-4 py-3">
                <input
                  type="text"
                  value={newCharge.name}
                  onChange={(e) => setNewCharge((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Charge name"
                  className={cn(INPUT, "flex-[1_1_150px]")}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={newCharge.amount}
                  onChange={(e) => setNewCharge((c) => ({ ...c, amount: e.target.value }))}
                  placeholder="0.00"
                  className={cn(INPUT, "flex-[0_1_110px] tabular-nums")}
                />
                <button
                  type="button"
                  onClick={addCharge}
                  disabled={editLocked()}
                  className={cn(CONTROL, "h-9")}
                >
                  <Plus size={14} strokeWidth={2} />
                  Add charge
                </button>
              </div>
            </div>
          </div>

          {/* --------------------------------------------- right column */}
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
            <div className={CARD}>
              <div className={CARD_HEAD}>
                <span className={CARD_TITLE}>Summary</span>
              </div>
              <div className="flex flex-col gap-[9px] px-4 py-3.5">
                <Row label={`Items (${totalQty})`} value={money(currency, totals.foodSubtotal, 2)} />
                <Row
                  label="Charges"
                  value={money(currency, totals.extraChargesTotal + totals.qrGroupCharges, 2)}
                />
                {totals.discountAmount > 0 && (
                  <Row
                    label="Discount"
                    value={`- ${money(currency, totals.discountAmount, 2)}`}
                    tone="green"
                  />
                )}
                {gstPercentage > 0 && (
                  <Row
                    label={`${taxLabel(partner?.country, (userData as any)?.delivery_rules)} (${gstPercentage}%)`}
                    value={money(currency, totals.gstAmount, 2)}
                  />
                )}
                <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-zinc-200 pt-[11px] dark:border-zinc-700">
                  <span className="text-[13.5px] font-semibold text-zinc-950 dark:text-zinc-50">
                    Total
                  </span>
                  <span className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50">
                    {money(currency, totals.total, 2)}
                  </span>
                </div>
                {dirty && (
                  <div className="mt-0.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] font-normal leading-[1.5] text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400">
                    Was {money(currency, baselineTotal, 2)} — the customer is notified when you
                    save.
                  </div>
                )}
              </div>
            </div>

            {/* Payment */}
            <div className={CARD}>
              <div className={CARD_HEAD}>
                <span className={CARD_TITLE}>Payment</span>
                <MetaPill className="ml-auto">{order.is_paid ? "Prepaid" : "COD"}</MetaPill>
              </div>
              <div className="px-4 py-3.5">
                <div className={FIELD_LABEL}>Method</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { value: "cash", label: "Cash", Icon: Banknote },
                    { value: "upi", label: "UPI", Icon: Smartphone },
                    { value: "card", label: "Card", Icon: CreditCard },
                  ].map(({ value, label, Icon }) => {
                    const active = paymentMethod === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        // Tapping the selected one clears it, so a method recorded
                        // by mistake can be removed, not just swapped.
                        onClick={() => setPaymentMethod(active ? null : value)}
                        className={cn(
                          "flex flex-[1_1_84px] flex-col items-center gap-1.5 rounded-lg px-1.5 py-[11px] text-[12.5px] font-medium transition-colors",
                          active
                            ? "border-[1.5px] border-zinc-900 bg-zinc-50 text-zinc-950 dark:border-zinc-50 dark:bg-zinc-800 dark:text-zinc-50"
                            : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                        )}
                      >
                        <Icon size={17} strokeWidth={1.7} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-[9px] text-[12px] font-normal leading-[1.5] text-zinc-500 dark:text-zinc-400">
                  {!paymentMethod
                    ? "Not recorded — the bill will print without a payment method."
                    : !["cash", "upi", "card"].includes(paymentMethod)
                      ? `Paid online via ${paymentMethod} — choosing one of the above will overwrite that record.`
                      : "Recorded on this order and printed on the bill."}
                </p>
              </div>
            </div>

            {/* Order info */}
            <div className={CARD}>
              <div className={CARD_HEAD}>
                <span className={CARD_TITLE}>Order info</span>
              </div>
              <div className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex flex-wrap gap-3">
                  <div className="min-w-0 flex-[1_1_130px]">
                    <div className={FIELD_LABEL}>Order type</div>
                    {/* Read-only: the order's type is set at placement and no
                        dashboard mutation writes it, so offering a picker here
                        would be a control that silently does nothing. */}
                    <div
                      className={cn(
                        INPUT,
                        "mt-1.5 flex items-center bg-zinc-50 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400",
                      )}
                    >
                      {getOrderTypeLabel(order)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-[1_1_110px]">
                    <div className={FIELD_LABEL}>Table</div>
                    <input
                      type="number"
                      value={tableNumber ?? ""}
                      onChange={(e) =>
                        handleTableNumberChange(Number(e.target.value) || null)
                      }
                      placeholder="No table"
                      className={cn(INPUT, "mt-1.5")}
                    />
                  </div>
                </div>
                <div>
                  <div className={FIELD_LABEL}>Customer phone</div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Customer phone"
                    className={cn(INPUT, "mt-1.5 tabular-nums")}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-[7px]">
                    <div className={FIELD_LABEL}>Kitchen note</div>
                    <span className="text-[11px] font-normal text-zinc-400 dark:text-zinc-500">
                      printed on the ticket
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="e.g. less spicy, pack cutlery"
                    className={cn(
                      INPUT,
                      "mt-1.5 h-auto min-h-[70px] resize-y py-[9px] leading-[1.5]",
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile action bar — on a phone the header's Save scrolls away, and the
          total is the number the partner is deciding on. */}
      {!loading && (
        <div className="sticky bottom-0 z-[7] flex items-center gap-2.5 border-t border-zinc-200 bg-white/95 px-[clamp(14px,3vw,28px)] py-2.5 backdrop-blur-md lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="min-w-0 flex-1">
            <div className={FIELD_LABEL}>Total</div>
            <div className="text-[16px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
              {money(currency, totals.total, 2)}
            </div>
          </div>
          <button type="button" onClick={onBack} className={cn(CONTROL, "h-10")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saveDisabled}
            className="inline-flex h-10 flex-[1_1_120px] items-center justify-center gap-[7px] rounded-md border border-zinc-900 bg-zinc-900 px-3.5 text-[13px] font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {updating ? (
              <Loader2 size={14} strokeWidth={2} className="animate-spin" />
            ) : (
              <Save size={14} strokeWidth={1.9} />
            )}
            {saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={cn(
          "text-[12.5px] font-normal text-zinc-500 dark:text-zinc-400",
          tone === "green" && "text-green-700 dark:text-green-400",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-[12.5px] font-medium tabular-nums text-zinc-950 dark:text-zinc-50",
          tone === "green" && "text-green-700 dark:text-green-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}
