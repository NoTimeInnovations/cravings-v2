"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Tag,
  X,
  Check,
  ClipboardList,
  MapPin,
  Home,
  Building2,
  Navigation,
  Bike,
  ShoppingBag,
  Clock,
  Users,
} from "lucide-react";
import useOrderStore from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import { useLocationStore } from "@/store/geolocationStore";
import { type SavedAddress } from "./AddressManagementModal";
import AddressPickerV2 from "./AddressPickerV2";
import { updateUserAddressesMutation } from "@/api/auth";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { QrGroup } from "@/app/admin/qr-management/page";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getFeatures } from "@/lib/getFeatures";
import { PrebookingPicker, PrebookingSelection } from "./PrebookingPicker";
import { parsePrebookingSettings, resolvePrebookOrderType, parseOrderTypesEnabled, PrebookOrderType } from "@/lib/prebooking";
import { checkDeliveryAgentAvailability } from "@/app/actions/deliveryAgent";
import { quoteDeliveryFare } from "@/app/actions/porterBridge";
import V3AddressSheet from "../styles/V3/V3AddressSheet";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import { getGstAmount, calculateGstForItems, calculateDeliveryDistanceAndCost } from "../OrderDrawer";
import { fetchFromHasura } from "@/lib/hasuraClient";

const DELIVERY_AGENT_PRICE_MARKUP = 10;
import {
  validateDiscountQuery,
  incrementDiscountUsageMutation,
  getUserDiscountUsageQuery,
} from "@/api/discounts";
import {
  createCashfreeOrderForPartner,
  verifyCashfreePayment,
  markOrderAsPaid,
} from "@/app/actions/cashfree";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";
import CashfreeEmbedModal from "@/components/CashfreeEmbedModal";

type AppliedDiscount = {
  id: string;
  code: string;
  type: "percentage" | "flat" | "freebie";
  value: number;
  max_discount_amount?: number;
  min_order_value?: number;
  description?: string;
  terms_conditions?: string;
  discount_on_total?: boolean;
  discount_order_types?: string;
  valid_days?: string;
  applicable_on?: string;
  rank?: number;
  pp_discount_id?: string;
  freebie_item_count?: number;
  freebie_item_ids?: string;
  has_coupon?: boolean;
};

type AvailableDiscount = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
  max_discount_amount: number | null;
  terms_conditions?: string | null;
};

const PlaceOrderModalV2 = ({
  hotelData,
  tableNumber,
  qrId,
  qrGroup,
  tableName,
  styles: themeStyles,
}: {
  hotelData: HotelData;
  tableNumber: number;
  getWhatsappLink: (orderId: string) => string;
  qrId: string | null;
  qrGroup: QrGroup | null;
  tableName?: string;
  styles?: Styles;
}) => {
  const {
    open_place_order_modal,
    setOpenPlaceOrderModal,
    setOpenOrderDrawer,
    setOpenDrawerBottom,
    items,
    placeOrder,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    userAddress: address,
    deliveryInfo,
    coordinates: userCoordinates,
    orderNote,
    setOrderNote,
    orderType,
    setOrderType,
  } = useOrderStore();

  const { userData: user } = useAuthStore();

  const accent = themeStyles?.accent || "#16A34A";
  const currency = hotelData?.currency || "₹";

  const baseCashfree =
    (hotelData as any)?.accept_payments_via_cashfree === true &&
    !!(hotelData as any)?.cashfree_merchant_id;
  const baseCod = (hotelData as any)?.accept_cod !== false;
  // Per-order-method overrides (Payment settings → "Payment options by order
  // type"). Online still requires Cashfree (baseCashfree). When unset, fall back
  // to the global flags. Never leave a method with no way to pay.
  const _pmCfg = (hotelData as any)?.payment_modes;
  const _methodPm =
    orderType === "delivery" || orderType === "takeaway" || orderType === "dine_in"
      ? _pmCfg?.[orderType]
      : undefined;
  let hasCashfree = baseCashfree && (_methodPm?.online ?? true);
  let hasCod = _methodPm?.cash ?? baseCod;
  if (!hasCashfree && !hasCod) hasCod = true;

  const hasCashfreeReturn =
    typeof window !== "undefined" &&
    !!sessionStorage.getItem("cashfree_pending_order");

  const [view, setView] = useState<"main" | "discounts">("main");
  const [showOrderNoteInput, setShowOrderNoteInput] = useState(!!orderNote);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">(
    hasCashfree && !hasCod ? "online" : "cash",
  );
  // If the order type changes (delivery↔takeaway) and the selected method is no
  // longer offered for it, snap to an available one so the selection stays valid.
  useEffect(() => {
    if (paymentMethod === "online" && !hasCashfree) setPaymentMethod("cash");
    else if (paymentMethod === "cash" && !hasCod) setPaymentMethod("online");
  }, [hasCashfree, hasCod, paymentMethod]);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [orderStatus, setOrderStatus] = useState<
    "idle" | "loading" | "placing" | "verifying" | "success" | "failed"
  >(hasCashfreeReturn ? "verifying" : "idle");
  const [successClosing, setSuccessClosing] = useState(false);
  const [savedOrderTotal, setSavedOrderTotal] = useState<number | null>(null);
  /** Captures the placed order's id so the success screen can deep-link to /order/[id]. */
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const router = useRouter();
  const [cashfreePaid, setCashfreePaid] = useState(hasCashfreeReturn);
  const [paymentFailReason, setPaymentFailReason] = useState("");
  const [showCashfreeEmbed, setShowCashfreeEmbed] = useState(false);
  const cashfreeContainerRef = useRef<HTMLDivElement | null>(null);
  const verifyingCfOrderRef = useRef<string | null>(null);

  const [availableDiscounts, setAvailableDiscounts] = useState<AvailableDiscount[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);

  // Address management state
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<SavedAddress | null>(null);
  /** Phone of the address chosen for delivery. Falls back to `user.phone`. */
  const [selectedReceiverPhone, setSelectedReceiverPhone] = useState<string | null>(null);
  const [mapInitialPick, setMapInitialPick] = useState<
    { address?: string; coords: { lat: number; lng: number } } | null
  >(null);
  const [addressFormData, setAddressFormData] = useState({
    useAccountDetails: false,
    receiverName: "",
    receiverPhone: "",
    locationType: "Other" as "House" | "Office" | "Other",
    buildingFloor: "",
    street: "",
    saveAs: "",
    deliveryInstructions: "",
  });

  const savedAddresses = useMemo(
    () => ((user as any)?.addresses || []) as SavedAddress[],
    [(user as any)?.addresses],
  );

  const isQrScan = qrId !== null && tableNumber !== 0;

  const isDeliveryActive = hotelData?.delivery_rules?.isDeliveryActive ?? true;
  const deliveryTimeAllowed = hotelData?.delivery_rules?.delivery_time_allowed;
  const takeawayTimeAllowed = hotelData?.delivery_rules?.takeaway_time_allowed;
  const isDeliveryOpen = isDeliveryActive && isWithinTimeWindow(deliveryTimeAllowed);
  const isTakeawayOpen = isWithinTimeWindow(takeawayTimeAllowed);

  const allMenus = (hotelData as any)?.allMenus || hotelData?.menus || [];
  const incompatibleItems = useMemo(() => {
    if (!orderType || !items?.length || !allMenus.length) return [];
    return items.filter((cartItem) => {
      const baseId = cartItem.id.split("|")[0];
      const menuItem = allMenus.find((m: any) => m.id === baseId);
      if (!menuItem) return false;
      if (orderType === "delivery" && menuItem.show_on_delivery === false) return true;
      if (orderType === "takeaway" && menuItem.show_on_takeaway === false) return true;
      return false;
    });
  }, [orderType, items, allMenus]);

  const minimumOrderAmount = deliveryInfo?.minimumOrderAmount || 0;

  const formatTime12h = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const p = h >= 12 ? "PM" : "AM";
    return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, "0")} ${p}`;
  };

  const subtotal = useMemo(
    () =>
      (items || []).reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items],
  );

  const isBelowMinimum = orderType === "delivery" && minimumOrderAmount > 0 && subtotal < minimumOrderAmount;

  /* ---------------- 3PL delivery-agent serviceability + quote ------------- */
  const partnerFeatures = useMemo(
    () => getFeatures((hotelData as any)?.feature_flags ?? null),
    [(hotelData as any)?.feature_flags],
  );

  // ---------------- Prebooking (scheduled orders) ----------------
  const [prebooking, setPrebooking] = useState<PrebookingSelection | null>(null);
  const prebookingSettings = useMemo(
    () => parsePrebookingSettings((hotelData as any)?.prebooking_settings),
    [(hotelData as any)?.prebooking_settings],
  );
  const prebookingFeatureOn = !!(partnerFeatures?.prebooking?.enabled && prebookingSettings);
  // Independent master toggles (Prebooking tab / Slot Booking tab).
  const scheduleEnabled = prebookingFeatureOn && prebookingSettings?.prebooking_enabled !== false;
  const slotBookingEnabled = prebookingFeatureOn && prebookingSettings?.slot_booking_enabled !== false;
  const prebookOrderTypeKey: PrebookOrderType =
    orderType === "dine_in"
      ? "dine_in"
      : resolvePrebookOrderType(
          (tableNumber ?? 0) > 0 ? "table_order" : "delivery",
          orderType === "takeaway",
        );
  // Store-wide order-type availability (Order Types settings tab).
  const offered = parseOrderTypesEnabled((hotelData as any)?.order_types_enabled);
  const isDineIn = orderType === "dine_in";
  // Dine-in table reservation: dine-in offered + slot booking turned on.
  const allowDineInReservation = slotBookingEnabled && !isQrScan && offered.dine_in;
  // Picker visibility: dine-in uses slot booking; delivery/takeaway use prebooking.
  const showPicker = !!prebookingSettings && (isDineIn ? allowDineInReservation : scheduleEnabled);
  // What we hand to placeOrder: the picker's selection (which already carries
  // `dineIn` for reservations) — so order type follows the captured reservation,
  // not the live orderType at submit.
  const prebookingArg = showPicker && prebooking ? prebooking : null;
  // Default-on: when delivery_agent is enabled and the partner has NOT
  // explicitly set `use_delivery_agent_charge = false`, treat as on.
  const useAgentForCharge =
    partnerFeatures.delivery_agent.access &&
    partnerFeatures.delivery_agent.enabled &&
    hotelData?.delivery_rules?.use_delivery_agent_charge !== false;

  const partnerCoords = useMemo(() => {
    const geo: any = hotelData?.geo_location;
    if (geo && typeof geo === "object" && Array.isArray(geo.coordinates) && geo.coordinates.length === 2) {
      return { lat: geo.coordinates[1] as number, lng: geo.coordinates[0] as number };
    }
    return null;
  }, [hotelData?.geo_location]);

  const [agentQuote, setAgentQuote] = useState<{
    available: boolean;
    etaToPickupMin?: number;
    distanceKm?: number;
    estimatedPrice?: number;
    reason?: "UNSERVICEABLE" | "DISTANCE_TOO_LONG" | "OTHER";
  } | null>(null);
  const [agentQuoteLoading, setAgentQuoteLoading] = useState(false);

  useEffect(() => {
    if (!useAgentForCharge || orderType !== "delivery" || isQrScan) {
      setAgentQuote(null);
      return;
    }
    if (!partnerCoords || !userCoordinates) {
      setAgentQuote(null);
      return;
    }
    let cancelled = false;
    setAgentQuoteLoading(true);
    // Debounce so rapid address edits don't fire a wall of requests.
    const t = setTimeout(async () => {
      const res = await checkDeliveryAgentAvailability({
        pickup: { lat: partnerCoords.lat, lng: partnerCoords.lng },
        drop: { lat: userCoordinates.lat, lng: userCoordinates.lng },
        // Book-time also hardcodes online (Adloggs merchant doesn't allow
        // COD); keep availability aligned so the quote isn't falsely
        // rejected before the user even picks a payment method.
        paymentMethod: "online",
        // Per-restaurant merchant id — routes pricing/serviceability to the
        // partner's specific Adloggs merchant instead of the partner-account
        // default. Falsy/empty is safe; Adloggs uses the default merchant.
        ...(hotelData?.adloggs_merchant_id
          ? { partnerMerchantId: hotelData.adloggs_merchant_id }
          : {}),
      });
      if (cancelled) return;
      setAgentQuoteLoading(false);
      if (res.ok) {
        const d = res.data as any;
        setAgentQuote({
          available: !!d.available,
          ...(d.etaToPickupMin !== undefined ? { etaToPickupMin: d.etaToPickupMin } : {}),
          ...(d.distanceKm !== undefined ? { distanceKm: d.distanceKm } : {}),
          ...(d.estimatedPrice !== undefined ? { estimatedPrice: d.estimatedPrice } : {}),
          ...(d.reason ? { reason: d.reason } : {}),
        });
      } else {
        // 422 from the hub = typed UNSERVICEABLE / DISTANCE_TOO_LONG.
        const reason =
          res.status === 422
            ? ((res as any).code === "DISTANCE_TOO_LONG" ? "DISTANCE_TOO_LONG" : "UNSERVICEABLE")
            : "OTHER";
        setAgentQuote({ available: false, reason: reason as any });
      }
    }, 500);
    return () => {
      cancelled = true;
      setAgentQuoteLoading(false);
      clearTimeout(t);
    };
  }, [
    useAgentForCharge,
    orderType,
    isQrScan,
    partnerCoords?.lat,
    partnerCoords?.lng,
    userCoordinates?.lat,
    userCoordinates?.lng,
  ]);

  // ── Porter bridge live quote ──────────────────────────────────────────
  // When the partner has porter_bridge on, the 2-wheeler fare from
  // porter-bridge is the delivery charge. Mirrors the delivery_agent flow
  // above. Porter takes precedence over delivery_agent if both are on.
  const usePorterForCharge =
    partnerFeatures.porter_bridge.access &&
    partnerFeatures.porter_bridge.enabled;

  const [porterQuote, setPorterQuote] = useState<{
    available: boolean;
    fare?: number;
    etaMins?: number;
    reason?: string;
  } | null>(null);
  const [porterQuoteLoading, setPorterQuoteLoading] = useState(false);

  useEffect(() => {
    if (!usePorterForCharge || orderType !== "delivery" || isQrScan) {
      setPorterQuote(null);
      return;
    }
    if (!partnerCoords || !userCoordinates) {
      setPorterQuote(null);
      return;
    }
    let cancelled = false;
    setPorterQuoteLoading(true);
    const t = setTimeout(async () => {
      const res = await quoteDeliveryFare({
        partnerId: (hotelData as any)?.id,
        drop: { lat: userCoordinates.lat, lng: userCoordinates.lng },
        paymentMode: "cash",
      });
      if (cancelled) return;
      setPorterQuoteLoading(false);
      if (res.ok) {
        const d = res.data as { fare?: number; etaMins?: number };
        setPorterQuote({
          available: typeof d.fare === "number",
          ...(d.fare !== undefined ? { fare: d.fare } : {}),
          ...(d.etaMins !== undefined ? { etaMins: d.etaMins } : {}),
        });
      } else {
        setPorterQuote({ available: false, reason: res.message });
      }
    }, 500);
    return () => {
      cancelled = true;
      setPorterQuoteLoading(false);
      clearTimeout(t);
    };
  }, [
    usePorterForCharge,
    orderType,
    isQrScan,
    (hotelData as any)?.id,
    partnerCoords?.lat,
    partnerCoords?.lng,
    userCoordinates?.lat,
    userCoordinates?.lng,
  ]);

  // `hide_delivery_charge` is a stale "Extra delivery charges apply" toggle.
  // When the partner has auto-3PL on (Adloggs OR Porter), the live quote IS
  // the price, so ignore the old hide flag entirely.
  const effectiveHideDeliveryCharge =
    !!hotelData?.delivery_rules?.hide_delivery_charge &&
    !useAgentForCharge &&
    !usePorterForCharge;

  const deliveryCharge = useMemo(() => {
    if (isQrScan || orderType !== "delivery") return 0;
    // Porter takes precedence over delivery_agent when both are enabled.
    if (usePorterForCharge) {
      if (porterQuote?.available && typeof porterQuote.fare === "number") {
        return porterQuote.fare;
      }
      return 0;
    }
    if (useAgentForCharge) {
      if (agentQuote?.available && typeof agentQuote.estimatedPrice === "number") {
        return agentQuote.estimatedPrice + DELIVERY_AGENT_PRICE_MARKUP;
      }
      return 0;
    }
    if (hotelData?.delivery_rules?.hide_delivery_charge) return 0;
    if (deliveryInfo?.cost && !deliveryInfo?.isOutOfRange) return deliveryInfo.cost;
    return 0;
  }, [
    isQrScan,
    orderType,
    deliveryInfo,
    hotelData?.delivery_rules?.hide_delivery_charge,
    useAgentForCharge,
    agentQuote,
    usePorterForCharge,
    porterQuote,
  ]);

  // Block placement until we have an `available: true` quote. The
  // missing-coords case is already covered by other guards; this enforces
  // "must have a successful serviceability check before placing".
  const agentBlocksOrder =
    useAgentForCharge &&
    orderType === "delivery" &&
    !!userCoordinates &&
    (agentQuoteLoading || !agentQuote?.available);

  // Same guard for porter-bridge: must have a successful 2-wheeler quote
  // before we let the customer submit (otherwise dispatch will fail at
  // accept time with no quoted delivery charge to back it).
  const porterBlocksOrder =
    usePorterForCharge &&
    orderType === "delivery" &&
    !!userCoordinates &&
    (porterQuoteLoading || !porterQuote?.available);

  const parcelCharge = useMemo(() => {
    if (
      tableNumber === 0 &&
      hotelData?.delivery_rules?.parcel_charge &&
      hotelData.delivery_rules.parcel_charge > 0
    ) {
      const chargeType = hotelData.delivery_rules.parcel_charge_type || "fixed";
      if (chargeType === "itemwise") {
        const defaultCharge = hotelData.delivery_rules.parcel_charge || 0;
        const customCharges = hotelData.delivery_rules.parcel_charge_items || {};
        return (items || []).reduce((acc, item) => {
          const charge = customCharges[item.id.split("|")[0]] ?? defaultCharge;
          return acc + charge * item.quantity;
        }, 0);
      }
      const itemCount = (items || []).reduce((acc, i) => acc + i.quantity, 0);
      return chargeType === "variable"
        ? itemCount * hotelData.delivery_rules.parcel_charge
        : hotelData.delivery_rules.parcel_charge;
    }
    return 0;
  }, [tableNumber, hotelData?.delivery_rules, items]);

  const qrExtraCharge = useMemo(() => {
    if (!qrGroup?.name) return 0;
    if (isQrScan) {
      return getExtraCharge(
        items || [],
        qrGroup.extra_charge,
        qrGroup.charge_type || "FLAT_FEE",
      );
    }
    if (tableNumber === 0 && (orderType === "delivery" || orderType === "takeaway")) {
      return getExtraCharge(
        items || [],
        qrGroup.extra_charge,
        qrGroup.charge_type || "FLAT_FEE",
      );
    }
    return 0;
  }, [qrGroup, items, isQrScan, tableNumber, orderType]);

  const { totalGst: gstAmount, additionalGst } = useMemo(
    () => {
      const enrichedItems = (items || []).map((item) => {
        const baseId = item.id.split("|")[0];
        const menuItem = allMenus.find((m: any) => m.id === baseId);
        return { price: item.price, quantity: item.quantity, tax_inclusive: menuItem?.tax_inclusive ?? item.tax_inclusive };
      });
      return calculateGstForItems(enrichedItems, Number(hotelData?.gst_percentage) || 0);
    },
    [items, hotelData?.gst_percentage, allMenus],
  );

  const getFreebieItemsTotal = (disc: AppliedDiscount | null) => {
    if (!disc || disc.type !== "freebie" || !disc.freebie_item_ids) return 0;
    const count = disc.freebie_item_count || 1;
    return disc.freebie_item_ids.split(",").reduce((total, id) => {
      const item = hotelData?.menus?.find((m) => m.id === id.trim());
      return total + (item?.price || 0) * count;
    }, 0);
  };

  const discountSavings = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === "freebie") return getFreebieItemsTotal(appliedDiscount);
    let savings =
      appliedDiscount.type === "percentage"
        ? (subtotal * appliedDiscount.value) / 100
        : appliedDiscount.value;
    if (appliedDiscount.max_discount_amount) {
      savings = Math.min(savings, appliedDiscount.max_discount_amount);
    }
    return Math.min(savings, subtotal);
  }, [appliedDiscount, subtotal, hotelData?.menus]);

  const extraChargesTotal = deliveryCharge + parcelCharge + qrExtraCharge;
  const grandTotal = Math.max(0, subtotal + extraChargesTotal + additionalGst - discountSavings);

  // Fetch available coupon discounts
  useEffect(() => {
    if (!open_place_order_modal || !hotelData?.id) return;
    fetchFromHasura(
      `query GetActiveDiscountsV2($partner_id: uuid!) {
        discounts(where: { partner_id: { _eq: $partner_id }, is_active: { _eq: true }, has_coupon: { _eq: true }, _or: [{ expires_at: { _is_null: true } }, { expires_at: { _gt: "now()" } }] }, order_by: [{ rank: asc_nulls_last }], limit: 10) {
          id code description discount_type discount_value min_order_value max_discount_amount terms_conditions
        }
      }`,
      { partner_id: hotelData.id },
    )
      .then((res) => setAvailableDiscounts(res?.discounts ?? []))
      .catch(() => {});
  }, [hotelData?.id, open_place_order_modal]);

  // Auto-apply freebie discounts (non-coupon)
  useEffect(() => {
    if (!open_place_order_modal || !hotelData?.id || appliedDiscount) return;
    if (!items || items.length === 0 || subtotal <= 0) return;

    fetchFromHasura(
      `query GetAutoApplyV2($partner_id: uuid!) {
        discounts(
          where: {
            partner_id: { _eq: $partner_id }
            is_active: { _eq: true }
            has_coupon: { _eq: false }
            _or: [
              { expires_at: { _is_null: true } }
              { expires_at: { _gt: "now()" } }
            ]
          }
          order_by: [{ rank: asc_nulls_last }]
        ) {
          id code description discount_type discount_value min_order_value
          max_discount_amount discount_order_types discount_on_total
          has_coupon applicable_on category_item_ids rank pp_discount_id
          freebie_item_count freebie_item_ids valid_days starts_at
          expires_at terms_conditions usage_limit per_user_usage_limit used_count
        }
      }`,
      { partner_id: hotelData.id },
    )
      .then(async (res) => {
        const discs = res?.discounts ?? [];
        const now = new Date();
        const orderTypeMap: Record<string, string> = { delivery: "1", takeaway: "2" };
        const currentTypeCode = isQrScan ? "3" : orderTypeMap[orderType || "delivery"] || "1";
        const today = now.toLocaleDateString("en-US", { weekday: "short" });

        const baseFiltered = discs.filter((disc: any) => {
          if (disc.starts_at && new Date(disc.starts_at) > now) return false;
          if (disc.usage_limit != null && disc.used_count >= disc.usage_limit) return false;
          if (disc.min_order_value && subtotal < Number(disc.min_order_value)) return false;
          if (disc.discount_order_types) {
            const allowed = disc.discount_order_types.split(",").map((t: string) => t.trim());
            if (!allowed.includes(currentTypeCode)) return false;
          }
          if (disc.valid_days && disc.valid_days !== "All") {
            const validDays = disc.valid_days.split(",").map((d: string) => d.trim());
            if (!validDays.includes(today)) return false;
          }
          return true;
        });

        let eligible: any = null;
        for (const disc of baseFiltered) {
          if (disc.per_user_usage_limit != null && (user as any)?.id) {
            try {
              const usageRes = await fetchFromHasura(getUserDiscountUsageQuery, {
                user_id: (user as any).id,
                partner_id: hotelData.id,
                code: disc.code,
              });
              const userUsed = usageRes?.orders_aggregate?.aggregate?.count ?? 0;
              if (userUsed >= disc.per_user_usage_limit) continue;
            } catch {
              continue;
            }
          }
          eligible = disc;
          break;
        }

        if (eligible) {
          setAppliedDiscount({
            id: eligible.id,
            code: eligible.code,
            type: eligible.discount_type,
            value: Number(eligible.discount_value),
            max_discount_amount: eligible.max_discount_amount ? Number(eligible.max_discount_amount) : undefined,
            min_order_value: eligible.min_order_value ? Number(eligible.min_order_value) : undefined,
            description: eligible.description || undefined,
            terms_conditions: eligible.terms_conditions || undefined,
            discount_on_total: eligible.discount_on_total,
            discount_order_types: eligible.discount_order_types || undefined,
            valid_days: eligible.valid_days || undefined,
            applicable_on: eligible.applicable_on || undefined,
            has_coupon: eligible.has_coupon,
            rank: eligible.rank ? Number(eligible.rank) : undefined,
            pp_discount_id: eligible.pp_discount_id || undefined,
            freebie_item_count: eligible.freebie_item_count ? Number(eligible.freebie_item_count) : undefined,
            freebie_item_ids: eligible.freebie_item_ids || undefined,
          });
        }
      })
      .catch(() => {});
  }, [hotelData?.id, open_place_order_modal, items, subtotal, orderType, isQrScan, appliedDiscount]);

  const validateAndApplyCode = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    if (!hotelData?.id) return;
    setDiscountError("");
    setValidatingCode(true);
    try {
      const res = await fetchFromHasura(validateDiscountQuery, {
        partner_id: hotelData.id,
        code: trimmed,
      });
      const disc = res?.discounts?.[0];
      if (!disc) {
        setDiscountError("Invalid code.");
        return;
      }
      if (!disc.is_active) {
        setDiscountError("This discount is no longer active.");
        return;
      }
      const now = new Date();
      if (disc.starts_at && now < new Date(disc.starts_at)) {
        setDiscountError("This discount hasn't started yet.");
        return;
      }
      if (disc.expires_at && now > new Date(disc.expires_at)) {
        setDiscountError("This discount has expired.");
        return;
      }
      if (disc.min_order_value && subtotal < Number(disc.min_order_value)) {
        setDiscountError(`Minimum order of ${currency}${disc.min_order_value} required.`);
        return;
      }
      if (disc.usage_limit != null && disc.used_count >= disc.usage_limit) {
        setDiscountError("This code has reached its usage limit.");
        return;
      }
      if (disc.per_user_usage_limit != null && (user as any)?.id) {
        try {
          const usageRes = await fetchFromHasura(getUserDiscountUsageQuery, {
            user_id: (user as any).id,
            partner_id: hotelData.id,
            code: disc.code,
          });
          const userUsed = usageRes?.orders_aggregate?.aggregate?.count ?? 0;
          if (userUsed >= Number(disc.per_user_usage_limit)) {
            setDiscountError(`You've already used this code ${userUsed} time${userUsed === 1 ? "" : "s"}.`);
            return;
          }
        } catch {
          setDiscountError("Failed to validate code. Please try again.");
          return;
        }
      }
      setAppliedDiscount({
        id: disc.id,
        code: disc.code,
        type: disc.discount_type,
        value: Number(disc.discount_value),
        max_discount_amount: disc.max_discount_amount ? Number(disc.max_discount_amount) : undefined,
        min_order_value: disc.min_order_value ? Number(disc.min_order_value) : undefined,
        description: disc.description || undefined,
        terms_conditions: disc.terms_conditions || undefined,
        discount_on_total: disc.discount_on_total,
        discount_order_types: disc.discount_order_types || undefined,
        valid_days: disc.valid_days || undefined,
        applicable_on: disc.applicable_on || undefined,
        has_coupon: disc.has_coupon,
        rank: disc.rank ? Number(disc.rank) : undefined,
        pp_discount_id: disc.pp_discount_id || undefined,
        freebie_item_count: disc.freebie_item_count ? Number(disc.freebie_item_count) : undefined,
        freebie_item_ids: disc.freebie_item_ids || undefined,
      });
      setDiscountInput("");
      setView("main");
      toast.success(`Applied ${disc.code}`);
    } catch {
      setDiscountError("Failed to validate code. Please try again.");
    } finally {
      setValidatingCode(false);
    }
  };

  const applyFromList = (d: AvailableDiscount) => {
    if (d.min_order_value && subtotal < Number(d.min_order_value)) {
      toast.error(`Minimum order of ${currency}${d.min_order_value} required.`);
      return;
    }
    setAppliedDiscount({
      id: d.id,
      code: d.code,
      type: d.discount_type as AppliedDiscount["type"],
      value: Number(d.discount_value),
      max_discount_amount: d.max_discount_amount ? Number(d.max_discount_amount) : undefined,
      min_order_value: d.min_order_value ? Number(d.min_order_value) : undefined,
      description: d.description || undefined,
      terms_conditions: d.terms_conditions || undefined,
      has_coupon: true,
    });
    setView("main");
    toast.success(`Applied ${d.code}`);
  };

  // Address handling
  const handleSelectSavedAddress = useCallback((addr: SavedAddress) => {
    const fullAddress =
      addr.address ||
      [addr.flat_no, addr.house_no, addr.area, addr.city]
        .filter(Boolean)
        .join(", ");
    useOrderStore.getState().setUserAddress(fullAddress);
    if (addr.latitude && addr.longitude) {
      const coords = { lat: addr.latitude, lng: addr.longitude };
      useOrderStore.getState().setUserCoordinates(coords);
      useLocationStore.getState().setCoords(coords);
    }
    setSelectedReceiverPhone(addr.receiverPhone?.trim() || null);
    setShowAddressSheet(false);
    if (orderType === "delivery") {
      const coords = addr.latitude && addr.longitude
        ? { lat: addr.latitude, lng: addr.longitude }
        : null;
      calculateDeliveryDistanceAndCost(hotelData, coords);
    }
  }, [hotelData, orderType]);

  const saveAddressesForUser = useCallback(async (addresses: SavedAddress[]) => {
    if (!user || (user as any).role !== "user") return false;
    try {
      await fetchFromHasura(updateUserAddressesMutation, {
        id: user.id,
        addresses,
      });
      useAuthStore.setState({
        userData: { ...user, addresses } as any,
      });
      return true;
    } catch {
      toast.error("Failed to save address");
      return false;
    }
  }, [user]);

  const handleAddressModalSaved = useCallback((addr: SavedAddress) => {
    // Address coming from map picker — show the details form
    setPendingAddress(addr);
    setAddressFormData({
      useAccountDetails: false,
      receiverName: "",
      receiverPhone: "",
      locationType: "Other",
      buildingFloor: "",
      street: "",
      saveAs: "",
      deliveryInstructions: "",
    });
    setShowAddressModal(false);
    setShowAddressSheet(false);
    setShowAddressForm(true);
  }, []);

  const handleSaveAddressForm = useCallback(async () => {
    if (!pendingAddress) return;
    const label =
      addressFormData.saveAs.trim() ||
      addressFormData.locationType;

    const finalAddress: SavedAddress = {
      ...pendingAddress,
      label,
      house_no: addressFormData.buildingFloor.trim() || undefined,
      street: addressFormData.street.trim() || undefined,
      customLabel: addressFormData.saveAs.trim() || undefined,
      receiverName: addressFormData.receiverName.trim() || undefined,
      receiverPhone: addressFormData.receiverPhone.trim() || undefined,
    };

    const existing = [...savedAddresses];
    const idx = existing.findIndex((a) => a.id === finalAddress.id);
    if (idx >= 0) existing[idx] = finalAddress;
    else existing.push(finalAddress);

    const success = await saveAddressesForUser(existing);
    if (success) {
      toast.success("Address saved");
      handleSelectSavedAddress(finalAddress);
    }
    setShowAddressForm(false);
    setPendingAddress(null);
  }, [pendingAddress, addressFormData, savedAddresses, saveAddressesForUser, handleSelectSavedAddress]);

  const handleDeleteAddress = useCallback(async (addressId: string) => {
    const updated = savedAddresses.filter((a) => a.id !== addressId);
    const success = await saveAddressesForUser(updated);
    if (success) {
      toast.success("Address deleted");
      if (address === savedAddresses.find((a) => a.id === addressId)?.address) {
        useOrderStore.getState().setUserAddress("");
      }
    }
  }, [savedAddresses, saveAddressesForUser, address]);

  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setOpenPlaceOrderModal(false);
      setOpenDrawerBottom(true);
      setClosing(false);
    }, 250);
  };

  const handleAddMoreItems = () => {
    setClosing(true);
    setTimeout(() => {
      setOpenPlaceOrderModal(false);
      setOpenOrderDrawer(false);
      setOpenDrawerBottom(true);
      setClosing(false);
    }, 250);
  };

  const buildExtraCharges = (
    cartItems: typeof items,
    ot: typeof orderType,
  ): { name: string; amount: number; charge_type: string }[] => {
    const list: { name: string; amount: number; charge_type: string }[] = [];
    if (qrGroup?.name) {
      const apply =
        isQrScan ||
        (tableNumber === 0 && (ot === "delivery" || ot === "takeaway"));
      if (apply) {
        const amt = getExtraCharge(
          cartItems || [],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE",
        );
        if (amt > 0)
          list.push({
            name: qrGroup.name,
            amount: amt,
            charge_type: qrGroup.charge_type || "FLAT_FEE",
          });
      }
    }
    if (!isQrScan && ot === "delivery") {
      let charge = 0;
      // Porter takes precedence — its live quote IS the customer-billed
      // delivery charge. Falls through to Adloggs, then to delivery_rules.
      if (usePorterForCharge) {
        if (porterQuote?.available && typeof porterQuote.fare === "number") {
          charge = porterQuote.fare;
        }
      } else if (useAgentForCharge) {
        if (agentQuote?.available && typeof agentQuote.estimatedPrice === "number") {
          charge = agentQuote.estimatedPrice + DELIVERY_AGENT_PRICE_MARKUP;
        }
      } else if (
        deliveryInfo?.cost &&
        !deliveryInfo?.isOutOfRange &&
        !hotelData?.delivery_rules?.hide_delivery_charge
      ) {
        charge = deliveryInfo.cost;
      }
      if (charge > 0) {
        list.push({
          name: "Delivery Charge",
          amount: charge,
          charge_type: "FLAT_FEE",
        });
      }
    }
    if (
      tableNumber === 0 &&
      hotelData?.delivery_rules?.parcel_charge &&
      hotelData.delivery_rules.parcel_charge > 0
    ) {
      const chargeType = hotelData.delivery_rules.parcel_charge_type || "fixed";
      let parcelAmount: number;
      if (chargeType === "itemwise") {
        const defC = hotelData.delivery_rules.parcel_charge || 0;
        const custC = hotelData.delivery_rules.parcel_charge_items || {};
        parcelAmount = (cartItems || []).reduce(
          (acc, item) =>
            acc + (custC[item.id.split("|")[0]] ?? defC) * item.quantity,
          0,
        );
      } else {
        const itemCount = (cartItems || []).reduce(
          (a, i) => a + i.quantity,
          0,
        );
        parcelAmount =
          chargeType === "variable"
            ? itemCount * hotelData.delivery_rules.parcel_charge
            : hotelData.delivery_rules.parcel_charge;
      }
      if (parcelAmount > 0)
        list.push({
          name: "Parcel Charge",
          amount: parcelAmount,
          charge_type: "FLAT_FEE",
        });
    }
    return list;
  };

  const verifyAndPlaceCfOrder = async (pending: {
    cfOrderId: string;
    partnerId: string;
    orderType?: string | null;
    orderNote?: string | null;
    prebooking?: (PrebookingSelection & { dineIn?: boolean }) | null;
    skipAuthWait?: boolean;
  }) => {
    if (verifyingCfOrderRef.current === pending.cfOrderId) return;
    verifyingCfOrderRef.current = pending.cfOrderId;

    setOpenPlaceOrderModal(true);
    setOrderStatus("verifying");
    setCashfreePaid(true);

    const waitForAuth = () =>
      new Promise<void>((resolve) => {
        const check = () => {
          const authUser = useAuthStore.getState().userData;
          if (authUser?.id) {
            resolve();
            return;
          }
          setTimeout(check, 300);
        };
        setTimeout(check, 500);
        setTimeout(resolve, 15000);
      });

    try {
      const verifyRes = await verifyCashfreePayment(
        pending.partnerId,
        pending.cfOrderId,
      );

      if (!verifyRes.success || !verifyRes.paid) {
        const reason = !verifyRes.success
          ? `Verify error: ${verifyRes.error}`
          : verifyRes.orderStatus === "ACTIVE"
            ? "Payment was not completed (status: ACTIVE). You may have cancelled or dropped off during checkout."
            : `Payment status: ${verifyRes.orderStatus || "unknown"}. Please try again.`;
        setPaymentFailReason(reason || "Payment could not be completed.");
        toast.error(`Payment failed: ${reason || "could not be completed"}`, { duration: 30000 });
        setOrderStatus("failed");
        setCashfreePaid(false);
        return;
      }

      setOrderStatus("loading");
      if (!pending.skipAuthWait) await waitForAuth();

      const storeState = useOrderStore.getState();
      const authUser = useAuthStore.getState().userData;
      if (!authUser?.id) {
        toast.error("Session expired. Please login and try again.");
        setOrderStatus("idle");
        return;
      }
      if (!storeState.items || storeState.items.length === 0) {
        toast.error("Cart is empty. Your order could not be restored.");
        setOrderStatus("idle");
        return;
      }

      const cfItems = storeState.items;
      const cfOrderType = (pending.orderType as typeof orderType) || orderType;
      const cfExtraCharges = buildExtraCharges(cfItems, cfOrderType);

      const { additionalGst: cfGst } = calculateGstForItems(
        cfItems.map((item) => {
          const baseId = item.id.split("|")[0];
          const mi = allMenus.find((m: any) => m.id === baseId);
          return {
            price: item.price,
            quantity: item.quantity,
            tax_inclusive: mi?.tax_inclusive ?? (item as any).tax_inclusive,
          };
        }),
        Number(hotelData?.gst_percentage) || 0,
      );

      const result = await storeState.placeOrder(
        hotelData,
        tableNumber,
        qrId as string,
        cfGst,
        cfExtraCharges.length > 0 ? cfExtraCharges : null,
        undefined,
        pending.orderNote || "",
        tableName,
        null,
        (authUser as any)?.full_name || undefined,
        undefined,
        pending.cfOrderId,
        pending.prebooking || null,
      );

      if (result) {
        if (result.id) {
          localStorage?.setItem("last-order-id", result.id);
          setPlacedOrderId(result.id);
          markOrderAsPaid(result.id, verifyRes.cfPaymentId || undefined).catch(
            () => {},
          );
        }
        setSavedOrderTotal(grandTotal);
        useOrderStore.getState().notifyOrderPlaced();
        try {
          sessionStorage.removeItem(`order_type_${hotelData.id}`);
        } catch {}
        setOrderStatus("success");
      } else {
        toast.error("Failed to place order.");
        setOrderStatus("idle");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setPaymentFailReason("Could not verify payment. Please contact support.");
      setOrderStatus("failed");
    }
  };

  const handleCashfreePayAndPlaceOrder = async () => {
    if (!items || items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!user) {
      toast.error("Please login first.");
      return;
    }
    if (!isQrScan && !orderType) {
      toast.error("Please select an order type.");
      return;
    }
    if (isDineIn && !prebookingArg) {
      toast.error("Please choose a date, time and number of guests for your table.");
      return;
    }
    if (!isQrScan && orderType === "delivery" && !isDeliveryOpen) {
      toast.error("Delivery is not available right now.");
      return;
    }
    if (!isQrScan && orderType === "takeaway" && !isTakeawayOpen) {
      toast.error("Takeaway is not available right now.");
      return;
    }
    if (incompatibleItems.length > 0) {
      toast.error(`Some items are not available for ${orderType}. Please remove them.`);
      return;
    }
    if (isBelowMinimum) {
      toast.error(`Minimum order of ${currency}${minimumOrderAmount} required for delivery.`);
      return;
    }
    if (orderType === "delivery") {
      if (!address?.trim()) {
        toast.error("Please set a delivery address.");
        return;
      }
      const needLocation = hotelData?.delivery_rules?.needDeliveryLocation ?? true;
      if (needLocation) {
        const coords = useOrderStore.getState().coordinates;
        if (hotelData?.geo_location && !coords) {
          toast.error("Please select your location on the map.");
          return;
        }
        if (deliveryInfo?.isOutOfRange) {
          toast.error("Delivery is not available to your location.");
          return;
        }
      }
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOrderStatus("loading");

    try {
      const cfOrderId = `CF_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      sessionStorage.setItem(
        "cashfree_pending_order",
        JSON.stringify({
          cfOrderId,
          partnerId: hotelData.id,
          amount: grandTotal,
          orderType: orderType || null,
          address: address || null,
          orderNote: orderNote || null,
          discountId: appliedDiscount?.id || null,
          prebooking: prebookingArg,
        }),
      );

      const returnUrl = `${window.location.origin}${window.location.pathname}?cf_order=${cfOrderId}&back=true`;

      const cfRes = await createCashfreeOrderForPartner(
        hotelData.id,
        cfOrderId,
        Math.round(grandTotal * 100) / 100,
        {
          id: user.id,
          name: (user as any)?.full_name || "Customer",
          phone: ((user as any)?.phone || "9999999999").replace(/\D/g, "").slice(-10),
          email: (user as any)?.email,
        },
        returnUrl,
      );

      if (!cfRes.success) {
        toast.error(`Payment failed: ${cfRes.error || "could not create payment order"}`, { duration: 30000 });
        setOrderStatus("idle");
        sessionStorage.removeItem("cashfree_pending_order");
        return;
      }

      setOrderStatus("idle");
      setShowCashfreeEmbed(true);
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (!cashfreeContainerRef.current) {
        throw new Error("Checkout container not ready");
      }

      const cashfreeMode =
        process.env.NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION"
          ? "production"
          : "sandbox";
      const cashfree = await loadCashfree({
        mode: cashfreeMode as "sandbox" | "production",
      });
      const result: any = await cashfree.checkout({
        paymentSessionId: cfRes.paymentSessionId!,
        redirectTarget: cashfreeContainerRef.current,
        appearance: {
          width: `${window.innerWidth}px`,
          height: `${Math.max(window.innerHeight - 56, 500)}px`,
        },
      } as any);

      setShowCashfreeEmbed(false);
      sessionStorage.removeItem("cashfree_pending_order");

      if (result?.error) {
        console.error("Cashfree error:", result.error);
        const full =
          typeof result.error === "string"
            ? result.error
            : `${result.error?.message || "checkout error"} ${JSON.stringify(result.error)}`;
        toast.error(`Payment failed: ${full}`, { duration: 30000 });
        setOrderStatus("idle");
        return;
      }

      await verifyAndPlaceCfOrder({
        cfOrderId,
        partnerId: hotelData.id,
        orderType: orderType || null,
        orderNote: orderNote || null,
        prebooking: prebookingArg,
        skipAuthWait: true,
      });
    } catch (error: any) {
      console.error("Cashfree payment error:", error);
      const full = error?.message || error?.toString?.() || JSON.stringify(error);
      toast.error(`Payment failed: ${full}`, { duration: 30000 });
      setShowCashfreeEmbed(false);
      setOrderStatus("idle");
    }
  };

  useEffect(() => {
    const pendingStr =
      typeof window !== "undefined"
        ? sessionStorage.getItem("cashfree_pending_order")
        : null;
    if (!pendingStr) return;
    try {
      const pending = JSON.parse(pendingStr);
      if (!pending?.cfOrderId || !pending?.partnerId) return;
      sessionStorage.removeItem("cashfree_pending_order");
      if (pending.orderType) setOrderType(pending.orderType);
      if (pending.address) useOrderStore.getState().setUserAddress(pending.address);
      if (pending.orderNote) setOrderNote(pending.orderNote);
      verifyAndPlaceCfOrder({
        cfOrderId: pending.cfOrderId,
        partnerId: pending.partnerId,
        orderType: pending.orderType,
        orderNote: pending.orderNote,
        prebooking: pending.prebooking || null,
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = async () => {
    if (!items || items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!user) {
      toast.error("Please login first.");
      return;
    }
    if (!isQrScan && !orderType) {
      toast.error("Please select an order type.");
      return;
    }
    if (isDineIn && !prebookingArg) {
      toast.error("Please choose a date, time and number of guests for your table.");
      return;
    }
    if (!isQrScan && orderType === "delivery" && !isDeliveryOpen) {
      toast.error("Delivery is not available right now.");
      return;
    }
    if (!isQrScan && orderType === "takeaway" && !isTakeawayOpen) {
      toast.error("Takeaway is not available right now.");
      return;
    }
    if (incompatibleItems.length > 0) {
      toast.error(`Some items are not available for ${orderType}. Please remove them.`);
      return;
    }
    if (isBelowMinimum) {
      toast.error(`Minimum order of ${currency}${minimumOrderAmount} required for delivery.`);
      return;
    }
    if (orderType === "delivery") {
      if (!address?.trim()) {
        toast.error("Please set a delivery address.");
        return;
      }
      const needLocation = hotelData?.delivery_rules?.needDeliveryLocation ?? true;
      if (needLocation) {
        const coords = useOrderStore.getState().coordinates;
        if (hotelData?.geo_location && !coords) {
          toast.error("Please select your location on the map.");
          return;
        }
        if (useAgentForCharge) {
          if (agentQuoteLoading) {
            toast.error("Hold on — getting a delivery quote.");
            return;
          }
          if (!agentQuote) {
            toast.error("Please select your location on the map.");
            return;
          }
          if (!agentQuote.available) {
            toast.error(
              agentQuote.reason === "DISTANCE_TOO_LONG"
                ? "Delivery distance is too long for this restaurant."
                : "Delivery is not available to your location.",
            );
            return;
          }
        } else if (deliveryInfo?.isOutOfRange) {
          toast.error("Delivery is not available to your location.");
          return;
        }
      }
    }

    if (paymentMethod === "online" && hasCashfree) {
      handleCashfreePayAndPlaceOrder();
      return;
    }

    setSavedOrderTotal(grandTotal);
    setOrderStatus("placing");
    try {
      const extraCharges: { name: string; amount: number; charge_type: string }[] = [];
      if (qrExtraCharge > 0 && qrGroup?.name) {
        extraCharges.push({
          name: qrGroup.name,
          amount: qrExtraCharge,
          charge_type: qrGroup.charge_type || "FLAT_FEE",
        });
      }
      if (deliveryCharge > 0) {
        extraCharges.push({
          name: "Delivery Charge",
          amount: deliveryCharge,
          charge_type: "FLAT_FEE",
        });
      }
      if (parcelCharge > 0) {
        extraCharges.push({
          name: "Parcel Charge",
          amount: parcelCharge,
          charge_type: "FLAT_FEE",
        });
      }

      const result = await placeOrder(
        hotelData,
        tableNumber,
        qrId as string,
        additionalGst,
        extraCharges.length > 0 ? extraCharges : null,
        undefined,
        orderNote || "",
        tableName,
        appliedDiscount
          ? {
              code: appliedDiscount.code,
              type: appliedDiscount.type,
              value: appliedDiscount.value,
              savings: discountSavings,
              pp_discount_id: appliedDiscount.pp_discount_id,
              description: appliedDiscount.description,
              terms_conditions: appliedDiscount.terms_conditions,
              max_discount_amount: appliedDiscount.max_discount_amount,
              min_order_value: appliedDiscount.min_order_value,
              discount_on_total: appliedDiscount.discount_on_total,
              discount_order_types: appliedDiscount.discount_order_types,
              valid_days: appliedDiscount.valid_days,
              applicable_on: appliedDiscount.applicable_on,
              rank: appliedDiscount.rank,
              freebie_item_count: appliedDiscount.freebie_item_count,
              freebie_item_ids: appliedDiscount.freebie_item_ids,
              freebie_item_names: appliedDiscount.freebie_item_ids
                ? appliedDiscount.freebie_item_ids
                    .split(",")
                    .map((id) => hotelData?.menus?.find((m) => m.id === id.trim())?.name)
                    .filter(Boolean)
                    .join(", ")
                : undefined,
              freebie_items:
                appliedDiscount.type === "freebie" && appliedDiscount.freebie_item_ids
                  ? (appliedDiscount.freebie_item_ids
                      .split(",")
                      .map((id) => {
                        const m = hotelData?.menus?.find((menu) => menu.id === id.trim());
                        return m
                          ? {
                              id: m.id,
                              name: m.name,
                              price: m.price,
                              pp_id: (m as any).pp_id,
                              category: m.category,
                            }
                          : null;
                      })
                      .filter(Boolean) as {
                      id: string;
                      name: string;
                      price: number;
                      pp_id?: string;
                      category?: any;
                    }[])
                  : undefined,
            }
          : null,
        (user as any)?.full_name || undefined,
        selectedReceiverPhone || (user as any)?.phone || undefined,
        null,
        prebookingArg,
      );

      if (result) {
        if (result.id) {
          localStorage?.setItem("last-order-id", result.id);
          setPlacedOrderId(result.id);
        }
        if (appliedDiscount?.id) {
          fetchFromHasura(incrementDiscountUsageMutation, { id: appliedDiscount.id }).catch(() => {});
        }
        setAppliedDiscount(null);
        setDiscountInput("");
        setDiscountError("");
        useOrderStore.getState().notifyOrderPlaced();
        try {
          sessionStorage.removeItem(`order_type_${hotelData.id}`);
        } catch {}
        setOrderStatus("success");
      } else {
        toast.error("Failed to place order. Please try again.");
        setOrderStatus("idle");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to place order.");
      setOrderStatus("idle");
    }
  };

  const handleSuccessClose = () => {
    setSuccessClosing(true);
    setTimeout(() => {
      setOrderStatus("idle");
      setSavedOrderTotal(null);
      setPlacedOrderId(null);
      setSuccessClosing(false);
      setOpenPlaceOrderModal(false);
      setOpenOrderDrawer(false);
      setOpenDrawerBottom(true);
    }, 300);
  };

  /** Same teardown as "Back to Menu" but routes to the order details page. */
  const handleSuccessOpenOrder = () => {
    const id = placedOrderId || localStorage?.getItem("last-order-id");
    if (!id) {
      handleSuccessClose();
      return;
    }
    setOrderStatus("idle");
    setSavedOrderTotal(null);
    setPlacedOrderId(null);
    setOpenPlaceOrderModal(false);
    setOpenOrderDrawer(false);
    router.push(`/order/${id}`);
  };

  if (!open_place_order_modal) return null;

  if (
    orderStatus === "placing" ||
    orderStatus === "verifying" ||
    orderStatus === "loading" ||
    orderStatus === "success" ||
    orderStatus === "failed"
  ) {
    return (
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center bg-white transition-opacity duration-300"
        style={{ opacity: successClosing ? 0 : 1 }}
      >
        <style>{`
          @keyframes v3PlacingFadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes v3PlacingPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
          @keyframes v3PlacingDot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
          }
          @keyframes v3PlacingSpin {
            to { transform: rotate(360deg); }
          }
          @keyframes v3PlacingToSuccess {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0.92); }
          }
          @keyframes v3SuccessFadeIn {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes v3SuccessRing {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes v3SuccessCheck {
            0% { stroke-dashoffset: 24; opacity: 0; }
            50% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
        `}</style>

        {(orderStatus === "placing" || orderStatus === "loading") && (
          <PlacingScreen accent={accent} label="Placing your order" />
        )}

        {orderStatus === "verifying" && (
          <PlacingScreen accent={accent} label="Verifying payment" />
        )}

        {orderStatus === "failed" && (
          <div className="flex flex-col items-center gap-6 px-8 text-center max-w-sm">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
              <X className="h-12 w-12 text-red-600" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Payment Failed
              </h2>
              <p className="mt-2 text-sm text-gray-500 whitespace-pre-line">
                {paymentFailReason || "We couldn't process your payment."}
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setOrderStatus("idle");
                  setCashfreePaid(false);
                  setPaymentFailReason("");
                  verifyingCfOrderRef.current = null;
                }}
                className="flex-1 rounded-xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderStatus("idle");
                  setCashfreePaid(false);
                  setPaymentFailReason("");
                  verifyingCfOrderRef.current = null;
                  handleCashfreePayAndPlaceOrder();
                }}
                className="flex-1 rounded-xl px-6 py-3 text-sm font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {orderStatus === "success" && (
          <div
            className="flex flex-col items-center gap-6 px-8 text-center"
            style={{ animation: successClosing ? "none" : "v3SuccessFadeIn 500ms ease-out forwards" }}
          >
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100"
              style={{ animation: successClosing ? "none" : "v3SuccessRing 600ms ease-out forwards" }}
            >
              <svg
                className="h-12 w-12 text-emerald-600"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                style={{ strokeDasharray: 24, animation: successClosing ? "none" : "v3SuccessCheck 500ms ease-out 300ms both" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Order Placed!</h2>
              <p className="mt-2 text-sm text-gray-400">Your order of {currency}{(savedOrderTotal ?? 0).toFixed(0)} has been placed.</p>
              <p className="mt-1 text-xs text-gray-400">You will be notified when it&apos;s ready.</p>
            </div>
            <div className="mt-4 flex w-full max-w-xs flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleSuccessClose}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-900 shadow-sm transition active:scale-[0.98]"
              >
                Back to Menu
              </button>
              <button
                type="button"
                onClick={handleSuccessOpenOrder}
                className="flex-1 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition active:scale-[0.98]"
              >
                Order Details
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const freebieItems =
    appliedDiscount?.type === "freebie" && appliedDiscount.freebie_item_ids
      ? appliedDiscount.freebie_item_ids
          .split(",")
          .map((id) => hotelData?.menus?.find((m) => m.id === id.trim()))
          .filter(Boolean)
      : [];

  const restaurantName = hotelData?.store_name || (hotelData as any)?.name || "";
  const restaurantSubtitle = hotelData?.district || (hotelData as any)?.address || "";

  return (
    <>
    <div className="fixed inset-0 z-[500] md:bg-black/40">
      <style>{`
        @keyframes v3CheckoutIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes v3CheckoutOut {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @media (min-width: 768px) {
          .v2-checkout-column { max-width: 42rem !important; margin-left: auto !important; margin-right: auto !important; }
          .v2-checkout-fixed { left: 50% !important; right: auto !important; transform: translateX(-50%) !important; max-width: 42rem !important; width: 100% !important; }
        }
      `}</style>
    <div
      className="v2-checkout-column w-full h-full bg-gray-100 overflow-y-auto pb-20"
      style={{
        animation: closing ? "v3CheckoutOut 250ms ease-in forwards" : "v3CheckoutIn 300ms ease-out forwards",
      }}
    >
      {view === "main" ? (
        <>
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200/60 bg-white">
           <div className="px-3 flex items-center gap-2 h-14">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <ArrowLeft className="h-5 w-5 text-gray-900" />
            </button>
            {orderType === "delivery" ? (
              <button
                type="button"
                onClick={() => setShowAddressSheet(true)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Deliver to
                  </p>
                  <p className="truncate text-sm font-bold" style={{ color: accent }}>
                    {address || "Add delivery address"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
            ) : (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Pickup from
                  </p>
                  <p className="truncate text-sm font-bold" style={{ color: accent }}>
                    {restaurantName || "Checkout"}
                  </p>
                </div>
              </div>
            )}
           </div>
          </div>

          <div className="p-4 space-y-4 pb-40">
            {/* Order Type Switcher */}
            {!isQrScan && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 tracking-wide mb-3">ORDER TYPE</div>
                <div className="flex gap-2">
                  {([
                    ...(offered.delivery
                      ? [{ type: "delivery" as const, label: "Delivery", icon: Bike, open: isDeliveryOpen }]
                      : []),
                    ...(offered.takeaway
                      ? [{ type: "takeaway" as const, label: "Takeaway", icon: ShoppingBag, open: isTakeawayOpen }]
                      : []),
                    ...(allowDineInReservation
                      ? [{ type: "dine_in" as const, label: "Dine-in", icon: Users, open: true }]
                      : []),
                  ]).map(({ type, label, icon: Icon, open }) => {
                    const selected = orderType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          if (!open) return;
                          setOrderType(type);
                          if (type === "delivery") calculateDeliveryDistanceAndCost(hotelData, userCoordinates);
                        }}
                        disabled={!open}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                          !open
                            ? "opacity-40 cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400"
                            : selected
                              ? "text-white border-transparent shadow-sm"
                              : "border-gray-100 bg-gray-50 text-gray-700"
                        }`}
                        style={selected && open ? { backgroundColor: accent, borderColor: accent } : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                {!isDeliveryOpen && deliveryTimeAllowed?.from && deliveryTimeAllowed?.to && (
                  <p className="text-[11px] text-red-500 mt-2 px-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {!isDeliveryActive
                      ? "Delivery is currently unavailable"
                      : `Delivery: ${formatTime12h(deliveryTimeAllowed.from)} – ${formatTime12h(deliveryTimeAllowed.to)}`}
                  </p>
                )}
                {!isTakeawayOpen && takeawayTimeAllowed?.from && takeawayTimeAllowed?.to && (
                  <p className="text-[11px] text-red-500 mt-1 px-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Takeaway: {formatTime12h(takeawayTimeAllowed.from)} – {formatTime12h(takeawayTimeAllowed.to)}
                  </p>
                )}
              </div>
            )}

            {/* Delivery out of range warning */}
            {orderType === "delivery" && !useAgentForCharge && deliveryInfo?.isOutOfRange && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Delivery not available</p>
                  <p className="text-xs text-red-500 mt-0.5">Your location is outside the delivery area. Try a different address or switch to takeaway.</p>
                </div>
              </div>
            )}

            {/* 3PL agent serviceability + live quote */}
            {orderType === "delivery" && useAgentForCharge && userCoordinates && (
              agentQuoteLoading ? (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                  <Bike className="h-4 w-4 text-gray-500 animate-pulse flex-shrink-0" />
                  <p className="text-sm text-gray-600">Checking delivery availability…</p>
                </div>
              ) : agentQuote && !agentQuote.available ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Delivery not available</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      {agentQuote.reason === "DISTANCE_TOO_LONG"
                        ? "This restaurant is too far for our delivery partner. Try another address or switch to takeaway."
                        : "No delivery agents service this address. Try another address or switch to takeaway."}
                    </p>
                  </div>
                </div>
              ) : null
            )}

            {/* Delivery charge notice */}
            {orderType === "delivery" && effectiveHideDeliveryCharge && (
              <div
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
                style={{
                  backgroundColor: `${accent}14`,
                  color: accent,
                  border: `1px solid ${accent}40`,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>Extra delivery charges apply</span>
              </div>
            )}

            {/* Incompatible items warning */}
            {incompatibleItems.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  Not available for {orderType}
                </p>
                {incompatibleItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-amber-700">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Minimum order warning */}
            {isBelowMinimum && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                <ShoppingBag className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  Minimum order of <span className="font-bold">{currency}{minimumOrderAmount}</span> required for delivery. Add {currency}{(minimumOrderAmount - subtotal).toFixed(0)} more.
                </p>
              </div>
            )}

            {/* Prebooking (scheduled orders) / dine-in slot booking */}
            {showPicker && prebookingSettings && (
              <PrebookingPicker
                settings={prebookingSettings}
                orderTypeKey={prebookOrderTypeKey}
                onChange={setPrebooking}
                accentColor={accent}
                className="bg-white rounded-2xl p-4 shadow-sm space-y-3"
                reservation={isDineIn}
              />
            )}

            {/* Items Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              {(items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="text-sm font-bold text-gray-900 truncate">{item.name}</div>
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-lg border px-2 py-1 mr-3"
                    style={{ borderColor: `${accent}40`, color: accent }}
                  >
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.id)}
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium min-w-[14px] text-center text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.id)}
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-xs font-bold text-gray-900 min-w-[60px] text-right">
                    {currency}
                    {(item.price * item.quantity).toFixed(0)}
                  </div>
                </div>
              ))}

              {/* Freebie items (auto-applied discount) */}
              {freebieItems.length > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                  {freebieItems.map((fi: any) => (
                    <div key={fi.id} className="flex items-center justify-between py-1.5">
                      <div className="text-sm text-gray-700">{fi.name}</div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: `${accent}1A`, color: accent }}
                        >
                          FREE
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          × {appliedDiscount?.freebie_item_count || 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3">
                {/* Saved note display */}
                {orderNote && !showOrderNoteInput && (
                  <div className="mb-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-gray-700 italic transition-all duration-300 ease-out">
                    &ldquo;{orderNote}&rdquo;
                  </div>
                )}

                {/* Inline input */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: showOrderNoteInput ? "50px" : "0px",
                    opacity: showOrderNoteInput ? 1 : 0,
                    marginBottom: showOrderNoteInput ? "8px" : "0px",
                  }}
                >
                  <input
                    type="text"
                    value={orderNote || ""}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Any special requests for the chef?"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOrderNoteInput((v) => !v)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold hover:bg-gray-50 transition-colors ${
                      showOrderNoteInput || orderNote
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {showOrderNoteInput ? "Done" : orderNote ? "Edit note" : "Order note"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMoreItems}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add More Items
                  </button>
                </div>

                
              </div>
            </div>

            {/* Savings Corner */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 tracking-wide">
                SAVINGS CORNER
              </div>
              <button
                type="button"
                onClick={() => setView("discounts")}
                className="w-full px-4 py-3 flex items-center gap-3"
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-500"
                >
                  <Tag className="h-5 w-5 text-white" fill="currentColor" strokeWidth={0} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-gray-900">
                    {appliedDiscount
                      ? `Applied: ${appliedDiscount.code}`
                      : "Apply Discounts"}
                  </div>
                  {appliedDiscount && discountSavings > 0 && (
                    <div className="text-xs font-medium mt-0.5" style={{ color: accent }}>
                      You save {currency}{discountSavings.toFixed(0)}
                    </div>
                  )}
                </div>
                <ChevronDown className="h-5 w-5 -rotate-90 text-gray-400" />
              </button>

              {appliedDiscount && !appliedDiscount.has_coupon && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    <Tag className="h-5 w-5 text-white" fill="currentColor" strokeWidth={0} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {appliedDiscount.code}
                    </div>
                    {(appliedDiscount.description || discountSavings > 0) && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {appliedDiscount.description ? `${appliedDiscount.description}` : ""}
                        {appliedDiscount.description && discountSavings > 0 ? " · " : ""}
                        {discountSavings > 0 ? (
                          <span style={{ color: accent }} className="font-semibold">
                            Saved {currency}{discountSavings.toFixed(0)}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1" style={{ color: accent }}>
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Applied</span>
                  </div>
                </div>
              )}

              {appliedDiscount?.has_coupon && (
                <div className="px-4 pb-3 -mt-1">
                  <button
                    type="button"
                    onClick={() => setAppliedDiscount(null)}
                    className="text-xs text-gray-500 underline"
                  >
                    Remove coupon
                  </button>
                </div>
              )}
            </div>

            {/* To Pay Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="w-full px-4 py-3 flex items-center gap-3"
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: accent }}
                >
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-left text-sm font-bold text-gray-900">
                  To Pay {currency}
                  {grandTotal.toFixed(0)}
                </div>
                {showBreakdown ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {showBreakdown && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                  <Row
                    label="Item Total"
                    value={`${currency}${(subtotal + discountSavings).toFixed(0)}`}
                  />
                  {discountSavings > 0 && (
                    <Row
                      label={`Discount (${appliedDiscount?.code || ""})`}
                      value={`-${currency}${discountSavings.toFixed(0)}`}
                      accent={accent}
                    />
                  )}
                  {orderType === "delivery" &&
                    !effectiveHideDeliveryCharge &&
                    useAgentForCharge &&
                    agentQuote?.available && (
                      <div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Delivery Charges</span>
                          {deliveryCharge > 0 ? (
                            <span className="text-gray-900">{`${currency}${deliveryCharge.toFixed(0)}`}</span>
                          ) : (
                            <span className="font-semibold" style={{ color: accent }}>
                              Free
                            </span>
                          )}
                        </div>
                        {agentQuote.distanceKm !== undefined && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {agentQuote.distanceKm.toFixed(1)} kms
                          </div>
                        )}
                      </div>
                    )}
                  {orderType === "delivery" &&
                    !effectiveHideDeliveryCharge &&
                    !useAgentForCharge &&
                    !usePorterForCharge &&
                    !deliveryInfo?.isOutOfRange &&
                    deliveryInfo?.distance != null && (
                      <div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Delivery Charges</span>
                          {deliveryCharge > 0 ? (
                            <span className="text-gray-900">{`${currency}${deliveryCharge.toFixed(0)}`}</span>
                          ) : (
                            <span className="font-semibold" style={{ color: accent }}>
                              Free
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {deliveryInfo.distance.toFixed(1)} kms
                        </div>
                      </div>
                    )}
                  {/* Porter Bridge: dedicated row with loading state so we
                      never flash a stale delivery_rules-based amount before
                      the live quote arrives. */}
                  {orderType === "delivery" && usePorterForCharge && (
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Delivery Charges</span>
                        {porterQuoteLoading || !porterQuote ? (
                          <span className="text-gray-400 inline-flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                            Calculating…
                          </span>
                        ) : porterQuote.available && typeof porterQuote.fare === "number" ? (
                          <span className="text-gray-900">{`${currency}${porterQuote.fare.toFixed(0)}`}</span>
                        ) : (
                          <span className="text-rose-600 text-xs">
                            Not serviceable
                          </span>
                        )}
                      </div>
                      {porterQuote?.available && typeof porterQuote.etaMins === "number" && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          ETA {porterQuote.etaMins} min · via Porter
                        </div>
                      )}
                    </div>
                  )}
                  {orderType === "delivery" && effectiveHideDeliveryCharge && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Delivery Charge</span>
                      <span className="font-semibold" style={{ color: accent }}>Informed at delivery</span>
                    </div>
                  )}
                  {parcelCharge > 0 && (
                    <Row label="Parcel Charge" value={`${currency}${parcelCharge.toFixed(0)}`} />
                  )}
                  {qrExtraCharge > 0 && qrGroup?.name && (
                    <Row label={qrGroup.name} value={`${currency}${qrExtraCharge.toFixed(0)}`} />
                  )}
                  {additionalGst > 0 && (
                    <Row label="GST & Other Charges" value={`${currency}${additionalGst.toFixed(0)}`} />
                  )}
                  <div className="border-t border-dashed border-gray-200 pt-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">To Pay</span>
                    <span className="text-sm font-bold text-gray-900">
                      {currency}
                      {grandTotal.toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cancellation policy */}
            <div className="px-1">
              <div className="text-[13px] font-semibold text-gray-500 mb-1">Cancellation policy:</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                Please double-check your order and address details. Orders are non-refundable once
                placed.
              </div>
            </div>
          </div>

        </>
      ) : (
        <DiscountsView
          onBack={() => setView("main")}
          cartTotal={subtotal}
          currency={currency}
          available={availableDiscounts}
          discountInput={discountInput}
          setDiscountInput={setDiscountInput}
          discountError={discountError}
          validatingCode={validatingCode}
          onApplyCode={validateAndApplyCode}
          onApplyOffer={applyFromList}
          accent={accent}
        />
      )}
    </div>

    {/* Footer Pay Bar — outside animated div so fixed positioning works */}
    {view === "main" && (items?.length ?? 0) > 0 && (
      <>
        <div className="v2-checkout-fixed fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[510]">
         <div className="px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (hasCashfree && hasCod) setShowPaymentMethods((v) => !v);
            }}
            className="flex flex-col items-start"
            style={{ cursor: hasCashfree && hasCod ? "pointer" : "default" }}
          >
            <span className="text-[11px] text-gray-500 flex items-center gap-1 uppercase tracking-wide">
              Pay using{" "}
              {hasCashfree && hasCod ? (
                showPaymentMethods ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )
              ) : null}
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {paymentMethod === "online" ? "Pay Online" : orderType === "delivery" ? "Cash on Delivery" : "Pay at Store"}
            </span>
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={orderStatus !== "idle" || !items || items.length === 0 || (orderType === "delivery" && !useAgentForCharge && !usePorterForCharge && deliveryInfo?.isOutOfRange) || agentBlocksOrder || porterBlocksOrder || (!isQrScan && !orderType) || (!isQrScan && orderType === "delivery" && !isDeliveryOpen) || (!isQrScan && orderType === "takeaway" && !isTakeawayOpen) || incompatibleItems.length > 0 || isBelowMinimum}
            className="flex-1 max-w-[60%] rounded-xl py-3.5 font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {paymentMethod === "online" ? (
              `Pay ${currency}${grandTotal.toFixed(0)}`
            ) : (
              "Place Order"
            )}
          </button>
         </div>
        </div>

        {showPaymentMethods && (
          <div
            className="fixed inset-0 bg-black/30 z-[520] animate-fade-in flex items-end justify-center"
            onClick={() => setShowPaymentMethods(false)}
          >
            <div
              className="w-full md:max-w-2xl bg-white rounded-t-2xl p-4 space-y-2 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-semibold mb-2 text-gray-900">Choose Payment Method</div>
              {(
                [
                  ...(hasCod
                    ? [{ id: "cash" as const, label: orderType === "delivery" ? "Cash on Delivery" : "Pay at Store" }]
                    : []),
                  ...(hasCashfree
                    ? [{ id: "online" as const, label: "Pay Online" }]
                    : []),
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(opt.id);
                    setShowPaymentMethods(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl border p-3 text-sm ${
                    paymentMethod === opt.id
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <span className="font-medium text-gray-900">{opt.label}</span>
                  {paymentMethod === opt.id && (
                    <Check className="h-4 w-4" style={{ color: accent }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    )}
    </div>

    {/* Address overlays — rendered outside scrollable container */}

    {/* Delivery address sheet */}
    {showAddressSheet && (
      <V3AddressSheet
        currentAddress={address || ""}
        savedAddresses={savedAddresses}
        onDeleteSaved={handleDeleteAddress}
        accent={accent}
        onSelect={(addr, coords) => {
          if (addr) {
            useOrderStore.getState().setUserAddress(addr);
            if (coords) {
              useOrderStore.getState().setUserCoordinates(coords);
              useLocationStore.getState().setCoords(coords);
            }
            if (orderType === "delivery") {
              calculateDeliveryDistanceAndCost(hotelData, coords ?? null);
            }
          }
          setShowAddressSheet(false);
        }}
        onPickForMap={(addr, coords) => {
          setShowAddressSheet(false);
          if (coords) {
            setMapInitialPick({ address: addr, coords });
          } else {
            setMapInitialPick(null);
          }
          setShowAddressModal(true);
        }}
        onClose={() => setShowAddressSheet(false)}
      />
    )}

    {/* Address Picker V2 (map + search) */}
    <AddressPickerV2
      open={showAddressModal}
      onClose={() => {
        setShowAddressModal(false);
        setMapInitialPick(null);
      }}
      onSaved={(a) => {
        setMapInitialPick(null);
        handleAddressModalSaved(a);
      }}
      hotelData={hotelData}
      accent={accent}
      initialPick={mapInitialPick}
    />

    {/* Address details form (after saving from map) */}
    {showAddressForm && pendingAddress && (
      <div className="v2-checkout-fixed fixed inset-0 z-[600] bg-gray-50 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
         <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setShowAddressForm(false);
              setPendingAddress(null);
            }}
            className="p-1"
          >
            <ArrowLeft className="h-6 w-6 text-gray-900" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {pendingAddress.area || pendingAddress.city || "Location"}{" "}
              <span className="text-gray-400 font-normal">| </span>
              <span className="text-gray-500 font-normal text-xs truncate">
                {pendingAddress.address?.slice(0, 40)}...
              </span>
            </div>
          </div>
         </div>
        </div>

        <div className="p-4 space-y-5 pb-32">
          {/* Receiver Details */}
          <div>
            <h4 className="text-base font-bold text-gray-900 mb-3">Receiver Details</h4>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addressFormData.useAccountDetails}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAddressFormData((prev) => ({
                    ...prev,
                    useAccountDetails: checked,
                    receiverName: checked ? ((user as any)?.full_name || "") : "",
                    receiverPhone: checked ? ((user as any)?.phone || "") : "",
                  }));
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Use my account details</span>
            </label>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Receiver name *"
                value={addressFormData.receiverName}
                onChange={(e) =>
                  setAddressFormData((prev) => ({ ...prev, receiverName: e.target.value }))
                }
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                type="tel"
                placeholder="Receiver's number *"
                value={addressFormData.receiverPhone}
                onChange={(e) =>
                  setAddressFormData((prev) => ({ ...prev, receiverPhone: e.target.value }))
                }
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          {/* Location Details */}
          <div>
            <h4 className="text-base font-bold text-gray-900 mb-3">Location Details</h4>
            <div className="flex gap-2 mb-4">
              {(["House", "Office", "Other"] as const).map((type) => {
                const selected = addressFormData.locationType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setAddressFormData((prev) => ({ ...prev, locationType: type }))
                    }
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                    style={
                      selected
                        ? { backgroundColor: accent, borderColor: accent, color: "white" }
                        : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#4b5563" }
                    }
                  >
                    {type === "House" && <Home className="h-3.5 w-3.5" />}
                    {type === "Office" && <Building2 className="h-3.5 w-3.5" />}
                    {type === "Other" && <Navigation className="h-3.5 w-3.5" />}
                    {type}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Building / Floor *"
                value={addressFormData.buildingFloor}
                onChange={(e) =>
                  setAddressFormData((prev) => ({ ...prev, buildingFloor: e.target.value }))
                }
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                type="text"
                placeholder="Street (Recommended)"
                value={addressFormData.street}
                onChange={(e) =>
                  setAddressFormData((prev) => ({ ...prev, street: e.target.value }))
                }
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />

              {/* Area / Locality with Change */}
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400">Area/Locality</div>
                  <div className="text-sm text-gray-700 truncate mt-0.5">
                    {pendingAddress.address || ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setPendingAddress(null);
                    setShowAddressModal(true);
                  }}
                  className="flex items-center gap-1 shrink-0"
                  style={{ color: accent }}
                >
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-semibold">Change</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Save address as *"
                value={addressFormData.saveAs}
                onChange={(e) =>
                  setAddressFormData((prev) => ({ ...prev, saveAs: e.target.value }))
                }
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

        </div>

        {/* Save button */}
        <div className="v2-checkout-fixed fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
         <div className="px-4 py-3">
          <button
            type="button"
            onClick={handleSaveAddressForm}
            className="w-full rounded-xl py-3.5 font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Save Address
          </button>
         </div>
        </div>
      </div>
    )}

    <CashfreeEmbedModal
      ref={cashfreeContainerRef}
      open={showCashfreeEmbed}
      onClose={() => {
        setShowCashfreeEmbed(false);
        setOrderStatus("idle");
        sessionStorage.removeItem("cashfree_pending_order");
      }}
      accent={accent}
      banner={(hotelData as any)?.store_banner}
      partnerName={hotelData?.store_name || "Restaurant"}
    />
    </>
  );
};

const Row = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-600">{label}</span>
    <span className="text-gray-900 font-medium" style={accent ? { color: accent } : undefined}>
      {value}
    </span>
  </div>
);

const DiscountsView = ({
  onBack,
  cartTotal,
  currency,
  available,
  discountInput,
  setDiscountInput,
  discountError,
  validatingCode,
  onApplyCode,
  onApplyOffer,
  accent,
}: {
  onBack: () => void;
  cartTotal: number;
  currency: string;
  available: AvailableDiscount[];
  discountInput: string;
  setDiscountInput: (v: string) => void;
  discountError: string;
  validatingCode: boolean;
  onApplyCode: (code: string) => void;
  onApplyOffer: (d: AvailableDiscount) => void;
  accent: string;
}) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white px-4 py-4 flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1">
          <ArrowLeft className="h-6 w-6 text-gray-900" />
        </button>
        <div className="flex-1">
          <div className="font-bold text-lg text-gray-900 uppercase tracking-wide">
            Apply Discounts
          </div>
          <div className="text-xs text-gray-500">
            Your cart: {currency}
            {cartTotal.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Code input */}
        <div className="bg-white rounded-xl border border-gray-200 flex items-stretch">
          <input
            type="text"
            placeholder="Enter Discount Code"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            className="flex-1 bg-transparent px-4 py-3 text-sm outline-none text-gray-900 placeholder-gray-400 uppercase"
          />
          <button
            type="button"
            disabled={!discountInput.trim() || validatingCode}
            onClick={() => onApplyCode(discountInput)}
            className="px-4 text-sm font-bold uppercase tracking-wide disabled:opacity-40"
            style={{ color: accent }}
          >
            {validatingCode ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </button>
        </div>
        {discountError && (
          <div className="text-xs text-red-500 -mt-2 px-1">{discountError}</div>
        )}

        {available.length > 0 && (
          <>
            <div className="text-base font-semibold text-gray-800 pt-2">More offers</div>
            <div className="space-y-3">
              {available.map((d) => {
                const label =
                  d.discount_type === "percentage"
                    ? `${Number(d.discount_value).toFixed(0)}% OFF`
                    : d.discount_type === "freebie"
                      ? "FREEBIE"
                      : `${currency}${Number(d.discount_value).toFixed(0)} OFF`;
                return (
                  <div
                    key={d.id}
                    className="bg-white rounded-xl overflow-hidden flex shadow-sm"
                  >
                    <div
                      className="flex-shrink-0 w-16 flex items-center justify-center"
                      style={{ backgroundColor: accent }}
                    >
                      <div
                        className="text-white text-[11px] font-extrabold uppercase tracking-wide"
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-bold text-gray-900 uppercase tracking-wide">
                          {d.code}
                        </div>
                        <button
                          type="button"
                          onClick={() => onApplyOffer(d)}
                          className="text-sm font-bold uppercase tracking-wide"
                          style={{ color: accent }}
                        >
                          Apply
                        </button>
                      </div>
                      <div className="border-b border-dashed border-gray-200 my-2" />
                      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {d.description || d.terms_conditions || "No description"}
                      </div>
                      {d.min_order_value && (
                        <div className="mt-1 text-xs text-gray-400">
                          Min order: {currency}
                          {Number(d.min_order_value).toFixed(0)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {available.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-8">
            No offers available right now.
          </div>
        )}
      </div>
    </div>
  );
};

function PlacingScreen({ accent, label = "Placing your order" }: { accent: string; label?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-7 px-8 text-center"
      style={{ animation: "v3PlacingFadeIn 400ms ease-out forwards" }}
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border-[3px] border-transparent"
          style={{
            borderTopColor: accent,
            borderRightColor: `${accent}30`,
            animation: "v3PlacingSpin 1s linear infinite",
          }}
        />
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            backgroundColor: `${accent}12`,
            animation: "v3PlacingPulse 1.8s ease-in-out infinite",
          }}
        >
          <svg className="h-9 w-9" style={{ color: accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">{label}</h2>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: accent,
                animation: `v3PlacingDot 1.4s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-3">Please wait...</p>
      </div>
    </div>
  );
}

export default PlaceOrderModalV2;
