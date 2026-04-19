"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { getGstAmount, calculateDeliveryDistanceAndCost } from "../OrderDrawer";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  validateDiscountQuery,
  incrementDiscountUsageMutation,
} from "@/api/discounts";

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
    orderNote,
    setOrderNote,
    orderType,
  } = useOrderStore();

  const { userData: user } = useAuthStore();

  const accent = themeStyles?.accent || "#16A34A";
  const currency = hotelData?.currency || "₹";

  const [view, setView] = useState<"main" | "discounts">("main");
  const [showOrderNoteInput, setShowOrderNoteInput] = useState(!!orderNote);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("cash");
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [orderStatus, setOrderStatus] = useState<"idle" | "loading" | "success">("idle");
  const [successClosing, setSuccessClosing] = useState(false);
  const [savedOrderTotal, setSavedOrderTotal] = useState<number | null>(null);

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

  const subtotal = useMemo(
    () =>
      (items || []).reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items],
  );

  const deliveryCharge = useMemo(() => {
    if (
      !isQrScan &&
      orderType === "delivery" &&
      deliveryInfo?.cost &&
      !deliveryInfo?.isOutOfRange &&
      !hotelData?.delivery_rules?.hide_delivery_charge
    ) {
      return deliveryInfo.cost;
    }
    return 0;
  }, [isQrScan, orderType, deliveryInfo, hotelData?.delivery_rules?.hide_delivery_charge]);

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
          const charge = customCharges[item.id] ?? defaultCharge;
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

  const gstAmount = useMemo(
    () => getGstAmount(subtotal, Number(hotelData?.gst_percentage) || 0),
    [subtotal, hotelData?.gst_percentage],
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
    if (appliedDiscount.type === "percentage" && appliedDiscount.max_discount_amount) {
      savings = Math.min(savings, appliedDiscount.max_discount_amount);
    }
    return Math.min(savings, subtotal);
  }, [appliedDiscount, subtotal, hotelData?.menus]);

  const extraChargesTotal = deliveryCharge + parcelCharge + qrExtraCharge;
  const grandTotal = Math.max(0, subtotal + extraChargesTotal + gstAmount - discountSavings);

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
          expires_at terms_conditions usage_limit used_count
        }
      }`,
      { partner_id: hotelData.id },
    )
      .then((res) => {
        const discs = res?.discounts ?? [];
        const now = new Date();
        const orderTypeMap: Record<string, string> = { delivery: "1", takeaway: "2" };
        const currentTypeCode = isQrScan ? "3" : orderTypeMap[orderType || "delivery"] || "1";
        const today = now.toLocaleDateString("en-US", { weekday: "short" });

        const eligible = discs.find((disc: any) => {
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
    setShowAddressSheet(false);
    if (orderType === "delivery") {
      calculateDeliveryDistanceAndCost(hotelData);
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

  const handlePay = async () => {
    if (!items || items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!user) {
      toast.error("Please login first.");
      return;
    }
    if (orderType === "delivery" && !address?.trim()) {
      toast.error("Please set a delivery address.");
      return;
    }

    setSavedOrderTotal(grandTotal);
    setOrderStatus("loading");
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
        gstAmount,
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
      );

      if (result) {
        if (result.id) localStorage?.setItem("last-order-id", result.id);
        if (appliedDiscount?.id) {
          fetchFromHasura(incrementDiscountUsageMutation, { id: appliedDiscount.id }).catch(() => {});
        }
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
      setSuccessClosing(false);
      setOpenPlaceOrderModal(false);
      setOpenOrderDrawer(false);
      setOpenDrawerBottom(true);
    }, 300);
  };

  if (!open_place_order_modal) return null;

  if (orderStatus === "success") {
    return (
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center bg-white transition-opacity duration-300"
        style={{ opacity: successClosing ? 0 : 1 }}
      >
        <style>{`
          @keyframes v3SuccessFadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes v3SuccessCheck {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes v3SuccessRing {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <div
          className="flex flex-col items-center gap-6 px-8 text-center"
          style={{ animation: successClosing ? "none" : "v3SuccessFadeIn 400ms ease-out forwards" }}
        >
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100"
            style={{ animation: successClosing ? "none" : "v3SuccessRing 500ms ease-out forwards" }}
          >
            <svg
              className="h-12 w-12 text-emerald-600"
              style={{ animation: successClosing ? "none" : "v3SuccessCheck 600ms ease-out 200ms both" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Order Placed!</h2>
            <p className="mt-2 text-sm text-gray-400">Your order of {currency}{(savedOrderTotal ?? 0).toFixed(0)} has been placed.</p>
            <p className="mt-1 text-xs text-gray-400">You will be notified when it&apos;s ready.</p>
          </div>
          <button
            type="button"
            onClick={handleSuccessClose}
            className="mt-4 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition active:scale-[0.98]"
          >
            Back to Menu
          </button>
        </div>
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
    <div className="fixed inset-0 z-[500]">
      <style>{`
        @keyframes v3CheckoutIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes v3CheckoutOut {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
      `}</style>
    <div
      className="absolute inset-0 bg-gray-100 overflow-y-auto pb-20"
      style={{
        animation: closing ? "v3CheckoutOut 250ms ease-in forwards" : "v3CheckoutIn 300ms ease-out forwards",
      }}
    >
      {view === "main" ? (
        <>
          {/* Header */}
          <div
            className="sticky top-0 z-10 px-3 flex items-center gap-2 h-14 border-b border-gray-200/60 bg-white"
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <ArrowLeft className="h-5 w-5 text-gray-900" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate text-gray-900">{restaurantName || "Checkout"}</div>
              {orderType === "delivery" ? (
                <button
                  type="button"
                  onClick={() => setShowAddressSheet(true)}
                  className="text-[11px] text-gray-400 truncate flex items-center gap-1 w-full text-left"
                >
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{address || "Add delivery address"}</span>
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                </button>
              ) : restaurantSubtitle ? (
                <div className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{restaurantSubtitle}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-4 space-y-4 pb-40">
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
                    {appliedDiscount?.has_coupon ? `Applied: ${appliedDiscount.code}` : "Apply Discounts"}
                  </div>
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
                      {appliedDiscount.description || appliedDiscount.code}
                    </div>
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
                  {deliveryCharge > 0 && (
                    <Row
                      label={
                        deliveryInfo?.distance
                          ? `Delivery Charge | ${deliveryInfo.distance.toFixed(1)} Km`
                          : "Delivery Charge"
                      }
                      value={`${currency}${deliveryCharge.toFixed(0)}`}
                    />
                  )}
                  {parcelCharge > 0 && (
                    <Row label="Parcel Charge" value={`${currency}${parcelCharge.toFixed(0)}`} />
                  )}
                  {qrExtraCharge > 0 && qrGroup?.name && (
                    <Row label={qrGroup.name} value={`${currency}${qrExtraCharge.toFixed(0)}`} />
                  )}
                  {gstAmount > 0 && (
                    <Row label="GST & Other Charges" value={`${currency}${gstAmount.toFixed(0)}`} />
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3 z-[510]">
          <button
            type="button"
            onClick={() => setShowPaymentMethods((v) => !v)}
            className="flex flex-col items-start"
          >
            <span className="text-[11px] text-gray-500 flex items-center gap-1 uppercase tracking-wide">
              Pay using{" "}
              {showPaymentMethods ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {paymentMethod === "online" ? "Online Payment" : "Pay at Store"}
            </span>
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={orderStatus !== "idle" || !items || items.length === 0}
            className="flex-1 max-w-[60%] rounded-xl py-3.5 font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {orderStatus === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing...
              </span>
            ) : paymentMethod === "online" ? (
              `Pay ${currency}${grandTotal.toFixed(0)}`
            ) : (
              "Checkout"
            )}
          </button>
        </div>

        {showPaymentMethods && (
          <div
            className="fixed inset-0 bg-black/30 z-[520] animate-fade-in"
            onClick={() => setShowPaymentMethods(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 space-y-2 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-semibold mb-2 text-gray-900">Choose Payment Method</div>
              {(
                [
                  { id: "cash", label: "Pay at Store / Cash" },
                  { id: "online", label: "Online Payment" },
                ] as const
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

    {/* Choose delivery address bottom sheet */}
    {showAddressSheet && (
      <div
        className="fixed inset-0 bg-black/30 z-[600] animate-fade-in"
        onClick={() => setShowAddressSheet(false)}
      >
        <div
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pt-5 pb-3">
            <h3 className="text-lg font-bold text-gray-900">Choose a delivery address</h3>
            <button type="button" onClick={() => setShowAddressSheet(false)}>
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Add new address */}
          <button
            type="button"
            onClick={() => {
              setShowAddressSheet(false);
              setShowAddressModal(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3"
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${accent}15` }}
            >
              <Plus className="h-5 w-5" style={{ color: accent }} />
            </div>
            <span className="text-sm font-extrabold" style={{ color: accent }}>
              Add new Address
            </span>
          </button>

          {/* Saved addresses list */}
          {savedAddresses.length > 0 && (
            <div className="border-t border-gray-100">
              {savedAddresses.map((addr) => {
                const addrText =
                  addr.address ||
                  [addr.flat_no, addr.house_no, addr.area, addr.city]
                    .filter(Boolean)
                    .join(", ");
                const isSelected = address === addrText || address === addr.address;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-gray-50"
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gray-100 shrink-0 mt-0.5">
                      {addr.label?.toLowerCase() === "home" ? (
                        <Home className="h-4 w-4 text-gray-600" />
                      ) : addr.label?.toLowerCase() === "office" ? (
                        <Building2 className="h-4 w-4 text-gray-600" />
                      ) : (
                        <Navigation className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-gray-900">
                          {addr.label}
                        </span>
                        {isSelected && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: accent }}
                          >
                            SELECTED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {addrText}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="h-safe-area-bottom pb-4" />
        </div>
      </div>
    )}

    {/* Address Picker V2 (map + search) */}
    <AddressPickerV2
      open={showAddressModal}
      onClose={() => setShowAddressModal(false)}
      onSaved={handleAddressModalSaved}
      hotelData={hotelData}
      accent={accent}
    />

    {/* Address details form (after saving from map) */}
    {showAddressForm && pendingAddress && (
      <div className="fixed inset-0 z-[600] bg-gray-50 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
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
              {(["House", "Office", "Other"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setAddressFormData((prev) => ({ ...prev, locationType: type }))
                  }
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    addressFormData.locationType === type
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {type === "House" && <Home className="h-3.5 w-3.5" />}
                  {type === "Office" && <Building2 className="h-3.5 w-3.5" />}
                  {type === "Other" && <Navigation className="h-3.5 w-3.5" />}
                  {type}
                </button>
              ))}
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
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
    )}
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

export default PlaceOrderModalV2;
