"use client";
import useOrderStore, { OrderItem } from "@/store/orderStore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  ChevronDown,
  X,
  MessageCircle,
  CreditCard,
  Banknote,
} from "lucide-react";
import { useLocationStore } from "@/store/geolocationStore";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { getGstAmount, calculateDeliveryDistanceAndCost } from "../OrderDrawer";
import { QrGroup } from "@/app/admin/qr-management/page";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getFeatures } from "@/lib/getFeatures";
import DescriptionWithTextBreak from "@/components/DescriptionWithTextBreak";
import { useQrDataStore } from "@/store/qrDataStore";
import { motion, AnimatePresence } from "framer-motion";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserAddressesMutation, updateUserFullNameMutation, updateUserPhoneMutation } from "@/api/auth";
import {
  validatePhoneNumber,
  getPhoneValidationError,
} from "@/lib/getUserCountry";
import { getPhoneDigitsForCountry } from "@/lib/countryPhoneMap";
import { validateDiscountQuery, incrementDiscountUsageMutation } from "@/api/discounts";
import { Tag } from "lucide-react";
import { UpiPaymentScreen } from "./UpiPaymentScreen";
import AddressManagementModal, { type SavedAddress, type AddressModalTheme } from "./AddressManagementModal";
import { Notification } from "@/app/actions/notification";
import { useWhatsAppOtp } from "@/hooks/useWhatsAppOtp";
import { OtpInput } from "@/components/ui/otp-input";
import { createCashfreeOrderForPartner, verifyCashfreePayment, markOrderAsPaid } from "@/app/actions/cashfree";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";

// Helper: detect if a hex color is dark
function isDarkColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// Add type for deliveryInfo
interface DeliveryInfo {
  distance: number;
  cost: number;
  ratePerKm: number;
  isOutOfRange: boolean;
  minimumOrderAmount: number;
}

// =================================================================
// Modern Address Section Component
// =================================================================

const UnifiedAddressSection = ({
  setAddress,
  hotelData,
  theme,
}: {
  address: string;
  setAddress: (addr: string) => void;
  deliveryInfo: DeliveryInfo | null;
  hotelData: HotelData;
  theme?: AddressModalTheme;
}) => {
  const { userData: user } = useAuthStore();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(
    null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerAddress = useOrderStore((s) => s.userAddress);

  const savedAddresses = useMemo(
    () => ((user as any)?.addresses || []) as SavedAddress[],
    [(user as any)?.addresses],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Only show address if user explicitly selected one from the location header
    const orderCoords = useOrderStore.getState().coordinates;
    const orderAddress = useOrderStore.getState().userAddress;
    if (orderCoords && orderAddress && !selectedAddressId) {
      const matchingAddr = savedAddresses.find(
        (a) => a.latitude === orderCoords.lat && a.longitude === orderCoords.lng
      );
      if (matchingAddr) {
        setSelectedAddressId(matchingAddr.id);
      }
      setAddress(orderAddress);
    }
    // No auto-selection of default saved address — user must pick from location header
  }, [savedAddresses, selectedAddressId]);

  const saveAddressesForUser = async (addresses: SavedAddress[]) => {
    try {
      if (!user || (user as any).role !== "user") {
        toast.error("Login to save addresses");
        return false;
      }

      await fetchFromHasura(updateUserAddressesMutation, {
        id: user.id,
        addresses: addresses,
      });

      useAuthStore.setState({
        userData: {
          ...user,
          addresses: addresses,
        } as any,
      });

      return true;
    } catch (error) {
      console.error("Error saving addresses:", error);
      toast.error("Failed to save addresses");
      return false;
    }
  };

  const handleAddressSelect = (addr: SavedAddress | null) => {
    setSelectedAddressId(addr?.id || null);

    const fullAddress =
      addr?.address ||
      [
        addr?.flat_no,
        addr?.house_no,
        addr?.road_no,
        addr?.street,
        addr?.area,
        addr?.district,
        addr?.landmark,
        addr?.city,
        addr?.pincode,
      ]
        .filter(Boolean)
        .join(", ");
    setAddress(fullAddress);

    if (addr?.latitude && addr?.longitude) {
      const newCoords = { lat: addr.latitude, lng: addr.longitude };
      useOrderStore.getState().setUserCoordinates(newCoords);
      // Also update geolocation store so LocationHeader syncs
      const { setCoords } = useLocationStore.getState();
      setCoords(newCoords);
    } else {
      useOrderStore.getState().setUserCoordinates(null);
    }

    setShowDropdown(false);
  };

  const handleAddressSaved = async (addr: SavedAddress) => {
    const existing = [...savedAddresses];
    const index = existing.findIndex((a) => a.id === addr.id);

    // If address already exists and hasn't changed, just select it without re-saving
    if (index >= 0 && JSON.stringify(existing[index]) === JSON.stringify(addr)) {
      setEditingAddress(null);
      handleAddressSelect(addr);
      return;
    }

    if (index >= 0) {
      existing[index] = addr;
    } else {
      existing.push(addr);
    }

    const success = await saveAddressesForUser(existing);
    if (success) {
      setEditingAddress(null);
      handleAddressSelect(addr);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    const updated = savedAddresses.filter((a) => a.id !== addressId);
    const success = await saveAddressesForUser(updated);
    if (success) {
      if (selectedAddressId === addressId) {
        setSelectedAddressId(null);
        setAddress("");
        setEditingAddress(null);
        handleAddressSelect(null);
      }
      toast.success("Address deleted successfully");
    }
  };

  const selectedAddress = savedAddresses.find(
    (a) => a.id === selectedAddressId,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden"
    >
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm" style={{ color: "var(--pom-text-muted)" }}>Deliver to</span>
          <button
            onClick={() => { setEditingAddress(null); setShowAddressModal(true); }}
            className="text-xs font-semibold text-[var(--pom-accent,#ea580c)]"
          >
            Change
          </button>
        </div>

        {selectedAddress ? (() => {
          const addressText =
            selectedAddress.address ||
            [selectedAddress.flat_no, selectedAddress.house_no, selectedAddress.area, selectedAddress.city]
              .filter(Boolean)
              .join(", ");
          return (
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--pom-accent,#ea580c)]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-inherit truncate">{selectedAddress.label}</p>
                <p className="text-xs truncate" style={{ color: "var(--pom-text-muted)" }}>{addressText}</p>
              </div>
            </div>
          );
        })() : headerAddress ? (
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-[var(--pom-accent,#ea580c)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-inherit truncate">Selected Location</p>
              <p className="text-xs truncate" style={{ color: "var(--pom-text-muted)" }}>{headerAddress}</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setEditingAddress(null); setShowAddressModal(true); }}
            className="flex items-center gap-2.5 w-full text-left"
          >
            <MapPin className="h-4 w-4 shrink-0 text-[var(--pom-accent,#ea580c)]" />
            <span className="text-sm text-[var(--pom-accent,#ea580c)] font-medium">Add delivery address</span>
          </button>
        )}
      </div>

      {/* Address Management Modal */}
      <AddressManagementModal
        open={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSaved={handleAddressSaved}
        editAddress={editingAddress}
        hotelData={hotelData}
        savedAddresses={savedAddresses}
        onDeleteAddress={handleDeleteAddress}
        theme={theme}
      />
    </motion.div>
  );
};

// =================================================================
// Modern Order Status Dialog
// =================================================================

const OrderStatusDialog = ({
  status,
  onClose,
  partnerId,
  whatsappLink,
  isPetpooja,
  hasUpiQr,
  cashfreePaid,
  orderId,
  failReason,
}: {
  status: "idle" | "loading" | "verifying" | "success" | "failed";
  onClose: () => void;
  partnerId?: string;
  whatsappLink?: string;
  isPetpooja?: boolean;
  hasUpiQr?: boolean;
  cashfreePaid?: boolean;
  orderId?: string;
  failReason?: string;
}) => {
  const [loadingText, setLoadingText] = useState("Getting your items...");

  useEffect(() => {
    if (status === "loading") {
      setLoadingText("Getting your items...");
      const texts = ["Preparing your order...", "Finalizing your order..."];
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < texts.length) {
          setLoadingText(texts[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const isLoading = status === "loading" || status === "verifying";

  return (
    <AnimatePresence>
      {status !== "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[7000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center text-white"
            >
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-white" />
              <AnimatePresence mode="wait">
                <motion.p
                  key={status === "verifying" ? "verifying" : loadingText}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="mt-6 text-2xl font-semibold"
                >
                  {status === "verifying" ? "Verifying payment..." : loadingText}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center text-white p-8  rounded-2xl shadow-lg flex flex-col items-center max-w-md mx-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                }}
              >
                <CheckCircle2 className="w-24 h-24 text-green-400 mx-auto" />
              </motion.div>
              <h2 className="mt-6 text-3xl font-bold">
                {cashfreePaid ? "Payment Completed!" : "Order Placed Successfully!"}
              </h2>
              {cashfreePaid && (
                <p className="mt-3 text-sm text-white/80 text-center px-4">
                  Your payment has been received and your order has been placed successfully.
                </p>
              )}
              {!cashfreePaid && partnerId === "098fa941-3476-4a2c-b1f8-ea88eb15ad4f" && (
                <p className="mt-3 text-sm text-white/80 text-center px-4">
                  Kindly make the payment using the WhatsApp QR code and share the payment confirmation screenshot to confirm your order.
                </p>
              )}
              <div className="w-full mt-8 px-4 space-y-3">
                {whatsappLink && !isPetpooja && !hasUpiQr && !cashfreePaid && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <button className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors">
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      Send Order to WhatsApp
                    </button>
                  </a>
                )}
                {cashfreePaid && orderId ? (
                  <a
                    href={`/order/${orderId}`}
                    className="w-full px-6 py-2.5 border rounded-xl font-medium hover:opacity-80 transition-colors block text-center"
                    style={{ borderColor: "var(--pom-card-border, #d6d3d1)" }}
                  >
                    View Order Details
                  </a>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full px-6 py-2.5 border rounded-xl font-medium hover:opacity-80 transition-colors"
                    style={{ borderColor: "var(--pom-card-border, #d6d3d1)" }}
                  >
                    Back to Menu
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {status === "failed" && (
            <motion.div
              key="failed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center text-white p-8 rounded-2xl shadow-lg flex flex-col items-center max-w-md mx-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                }}
              >
                <X className="w-24 h-24 text-red-400 mx-auto" />
              </motion.div>
              <h2 className="mt-6 text-3xl font-bold">
                Payment Failed
              </h2>
              <p className="mt-3 text-sm text-white/80 text-center px-4">
                {failReason || "Your payment could not be completed. Please try again."}
              </p>
              <div className="w-full mt-8 px-4 space-y-3">
                <button
                  onClick={onClose}
                  className="w-full px-6 py-2.5 border rounded-xl font-medium hover:opacity-80 transition-colors"
                  style={{ borderColor: "var(--pom-card-border, #d6d3d1)" }}
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =================================================================
// Modern Items Card
// =================================================================

const ItemsCard = ({
  items,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  currency,
  onAddMore,
}: {
  items: OrderItem[];
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  removeItem: (id: string) => void;
  currency: string;
  onAddMore?: () => void;
}) => {
  return (
    <div>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`flex items-start justify-between py-3.5 ${index !== items.length - 1 ? "border-b" : ""}`}
          style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}
        >
          {/* Left: Name + Price stacked */}
          <div className="flex-1 min-w-0 pr-4">
            <DescriptionWithTextBreak
              spanClassName="text-[14px] font-semibold leading-tight !opacity-100"
              style={{ color: "inherit" }}
              accent="black"
              maxChars={35}
            >
              {item.name}
            </DescriptionWithTextBreak>
            <p className="text-[13px] mt-1 font-medium" style={{ color: "var(--pom-text-muted)" }}>
              {currency}{" "}{(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
          {/* Right: Quantity control */}
          <div className="shrink-0 flex items-center rounded-lg overflow-hidden" style={{ backgroundColor: "var(--pom-accent, #ea580c)" }}>
            <button
              onClick={() => {
                if (item.quantity > 1) {
                  decreaseQuantity(item.id as string);
                } else {
                  removeItem(item.id as string);
                }
              }}
              className="w-9 h-9 flex items-center justify-center text-white font-bold text-lg active:brightness-90"
            >
              −
            </button>
            <span className="text-sm font-bold w-5 text-center text-white">
              {item.quantity}
            </span>
            <button
              onClick={() => increaseQuantity(item.id as string)}
              className="w-9 h-9 flex items-center justify-center text-white font-bold text-lg active:brightness-90"
            >
              +
            </button>
          </div>
        </div>
      ))}

      {/* Add more items */}
      {onAddMore && (
        <button
          onClick={onAddMore}
          className="flex items-center gap-1.5 mt-3 text-[13px] font-semibold active:opacity-70"
          style={{ color: "var(--pom-accent, #ea580c)" }}
        >
          <span className="text-base leading-none">+</span>
          Add more items
        </button>
      )}
    </div>
  );
};

// =================================================================
// Modern Bill Card
// =================================================================

interface BillCardProps {
  items: OrderItem[];
  currency: string;
  gstPercentage?: number;
  deliveryInfo: DeliveryInfo | null;
  isDelivery: boolean;
  hotelData: HotelData;
  qrGroup: QrGroup | null;
  tableNumber: number;
  discount?: { type: "percentage" | "flat" | "freebie"; value: number; max_discount_amount?: number; freebie_item_count?: number; freebie_item_ids?: string; freebie_item_names?: string } | null;
}

const BillCard = ({
  items,
  currency,
  gstPercentage,
  deliveryInfo,
  isDelivery,
  hotelData,
  qrGroup,
  tableNumber,
  discount,
}: BillCardProps) => {
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const qrExtraCharges = qrGroup?.extra_charge
    ? getExtraCharge(
      items,
      qrGroup.extra_charge,
      qrGroup.charge_type || "FLAT_FEE",
    )
    : 0;

  const hideDeliveryCharge = hotelData?.delivery_rules?.hide_delivery_charge ?? false;
  const deliveryCharges =
    isDelivery && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange && !hideDeliveryCharge
      ? deliveryInfo.cost
      : 0;

  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const parcelChargeType = hotelData?.delivery_rules?.parcel_charge_type || "fixed";
  const parcelChargeValue = hotelData?.delivery_rules?.parcel_charge || 0;
  let parcelCharge = 0;
  if (tableNumber === 0 && parcelChargeValue > 0) {
    if (parcelChargeType === "itemwise") {
      const custCharges = hotelData?.delivery_rules?.parcel_charge_items || {};
      parcelCharge = items.reduce((acc, item) => {
        const charge = custCharges[item.id] ?? parcelChargeValue;
        return acc + charge * item.quantity;
      }, 0);
    } else {
      parcelCharge = parcelChargeType === "variable"
        ? totalItemCount * parcelChargeValue
        : parcelChargeValue;
    }
  }

  const gstAmount = (subtotal * (gstPercentage || 0)) / 100;
  // Calculate freebie item prices
  const freebieItems = discount?.type === "freebie" && discount.freebie_item_ids
    ? discount.freebie_item_ids.split(",").map((id) => {
        const item = hotelData?.menus?.find((m) => m.id === id.trim());
        return item ? { name: item.name, price: item.price } : null;
      }).filter(Boolean) as { name: string; price: number }[]
    : [];
  const freebieCount = discount?.freebie_item_count || 1;
  const freebieTotalPrice = freebieItems.reduce((sum, item) => sum + item.price * freebieCount, 0);

  let discountSavings = 0;
  if (discount) {
    if (discount.type === "freebie") {
      discountSavings = freebieTotalPrice;
    } else if (discount.type === "percentage") {
      discountSavings = (subtotal * discount.value) / 100;
      if (discount.max_discount_amount) discountSavings = Math.min(discountSavings, discount.max_discount_amount);
    } else {
      discountSavings = discount.value;
    }
    discountSavings = Math.min(discountSavings, subtotal);
  }
  const grandTotal = Math.max(0, subtotal + qrExtraCharges + deliveryCharges + parcelCharge + gstAmount - discountSavings);

  return (
    <div>
      <h3 className="font-bold text-inherit text-[15px] mb-3">Bill Details</h3>
      <div className="space-y-2.5">
        <div className="flex justify-between text-sm">
          <span style={{ color: "var(--pom-text-muted)" }}>Item Total</span>
          <span className="text-inherit">{currency}{" "}{(subtotal + freebieTotalPrice).toFixed(2)}</span>
        </div>

        {qrGroup && qrExtraCharges > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--pom-text-muted)" }}>
              {qrGroup.name || "Service Charge"}
              {qrGroup.charge_type === "PER_ITEM" && <span className="text-xs ml-1">(Per item)</span>}
            </span>
            <span className="text-inherit">{currency}{" "}{qrExtraCharges.toFixed(2)}</span>
          </div>
        )}

        {isDelivery && (deliveryInfo?.cost ?? 0) > 0 && !deliveryInfo?.isOutOfRange && !hideDeliveryCharge && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--pom-text-muted)" }}>
              Delivery Fee | {deliveryInfo?.distance?.toFixed(1)} kms
            </span>
            <span className="text-inherit">{currency}{" "}{deliveryInfo?.cost?.toFixed(2)}</span>
          </div>
        )}

        {isDelivery && hideDeliveryCharge && (
          <div className="text-sm" style={{ color: "var(--pom-text-muted)" }}>
            Delivery charge applicable
          </div>
        )}

        {parcelCharge > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--pom-text-muted)" }}>
              Parcel Charge
              {parcelChargeType === "variable" && <span className="text-xs ml-1">({totalItemCount} items)</span>}
            </span>
            <span className="text-inherit">{currency}{" "}{parcelCharge.toFixed(2)}</span>
          </div>
        )}

        {gstPercentage ? (
          <>
            <div className="border-t my-2" style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--pom-text-muted)" }}>
                {hotelData?.country === "United Arab Emirates" ? "VAT" : "GST"} &amp; Other Charges ({gstPercentage}%)
              </span>
              <span className="text-inherit">{currency}{" "}{gstAmount.toFixed(2)}</span>
            </div>
          </>
        ) : null}

        {discountSavings > 0 && (
          <div className="flex justify-between text-sm opacity-70">
            <span className="font-medium">
              {discount?.type === "freebie" ? "Freebie Discount" : "Discount"}
            </span>
            <span>-{currency}{" "}{discountSavings.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t pt-3 mt-1" style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}>
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-inherit text-[15px]">Grand Total</span>
            <span className="font-extrabold text-inherit text-lg">
              {currency}{" "}{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// Modern Order Type Card
// =================================================================

const OrderTypeCard = ({
  orderType,
  setOrderType,
  deliveryTimeAllowed,
  takeawayTimeAllowed,
  isDeliveryActive = true,
}: {
  orderType: "takeaway" | "delivery" | null;
  setOrderType: (type: "takeaway" | "delivery") => void;
  deliveryTimeAllowed?: { from: string; to: string } | null;
  takeawayTimeAllowed?: { from: string; to: string } | null;
  isDeliveryActive?: boolean;
}) => {
  const { isWithinTimeWindow, formatTime12h } = (() => {
    const check = (tw: { from: string; to: string } | null | undefined) => {
      if (!tw?.from || !tw?.to) return true;
      const now = new Date();
      const [fH, fM] = tw.from.split(":").map(Number);
      const [tH, tM] = tw.to.split(":").map(Number);
      const s = new Date(); s.setHours(fH, fM, 0, 0);
      const e = new Date(); e.setHours(tH, tM, 0, 0);
      return s > e ? (now >= s || now <= e) : (now >= s && now <= e);
    };
    const fmt = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const p = h >= 12 ? "PM" : "AM";
      return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, "0")} ${p}`;
    };
    return { isWithinTimeWindow: check, formatTime12h: fmt };
  })();

  const timeMap: Record<string, { allowed: boolean; window?: { from: string; to: string } | null; inactiveMsg?: string }> = {
    delivery: {
      allowed: isDeliveryActive && isWithinTimeWindow(deliveryTimeAllowed),
      window: deliveryTimeAllowed,
      inactiveMsg: !isDeliveryActive ? "Delivery is currently unavailable" : undefined,
    },
    takeaway: { allowed: isWithinTimeWindow(takeawayTimeAllowed), window: takeawayTimeAllowed },
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {(["delivery", "takeaway"] as const).map((type) => {
          const { allowed } = timeMap[type];
          return (
            <button
              key={type}
              onClick={() => allowed && setOrderType(type)}
              disabled={!allowed}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                !allowed ? "opacity-40 cursor-not-allowed" : ""
              } ${orderType === type ? "text-white" : ""}`}
              style={orderType === type
                ? { backgroundColor: "var(--pom-accent, #ea580c)" }
                : { backgroundColor: "color-mix(in srgb, var(--pom-accent, #ea580c) 12%, transparent)", color: "var(--pom-text-muted)" }
              }
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          );
        })}
      </div>
      {(["delivery", "takeaway"] as const).map((type) => {
        const { allowed, window: tw, inactiveMsg } = timeMap[type];
        if (allowed) return null;
        if (inactiveMsg) return (
          <p key={type} className="text-[11px] text-red-500 px-1">{inactiveMsg}</p>
        );
        if (!tw) return null;
        return (
          <p key={type} className="text-[11px] text-red-500 px-1">
            {type.charAt(0).toUpperCase() + type.slice(1)} available {formatTime12h(tw.from)} - {formatTime12h(tw.to)}
          </p>
        );
      })}
    </div>
  );
};

// =================================================================
// Multi WhatsApp Card Component
// =================================================================

const MultiWhatsappCard = ({
  hotelData,
  selectedLocation,
  setSelectedLocation,
}: {
  hotelData: HotelData;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
}) => {
  const hasMultiWhatsapp =
    getFeatures(hotelData?.feature_flags || "")?.multiwhatsapp?.enabled &&
    hotelData?.whatsapp_numbers?.length > 0;

  if (!hasMultiWhatsapp) return null;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="rounded-xl p-4" ref={dropdownRef} style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-3 px-4 border rounded-lg text-left flex justify-between items-center transition-colors"
          style={{ borderColor: "var(--pom-card-border, #d6d3d1)" }}
        >
          <div>
            <span className="text-xs block" style={{ color: "var(--pom-text-muted)" }}>Hotel Location</span>
            <span className="text-sm font-medium text-inherit">
              {selectedLocation ? selectedLocation.toUpperCase() : "Select Area"}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
              style={{ borderColor: "var(--pom-card-border, #d6d3d1)", backgroundColor: "var(--pom-modal-bg, white)", backdropFilter: "blur(24px)" }}
            >
              <div
                className="p-3 cursor-pointer transition-colors hover:opacity-70"
                onClick={() => { setSelectedLocation(""); setIsOpen(false); }}
              >
                <span className="text-sm" style={{ color: "var(--pom-text-muted)" }}>Select Area</span>
              </div>
              {hotelData.whatsapp_numbers.map((item) => (
                <div
                  key={item.area}
                  className="p-3 cursor-pointer border-t transition-colors hover:opacity-70"
                  style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}
                  onClick={() => { setSelectedLocation(item.area); setIsOpen(false); }}
                >
                  <span className="text-sm font-medium text-inherit">{item.area.toUpperCase()}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// =================================================================
// Table Number Card
// =================================================================

const TableNumberCard = ({
  tableNumber,
  hotelData,
  tableName,
}: {
  tableNumber: number;
  hotelData: HotelData;
  tableName?: string;
}) => {
  const isRoom = hotelData?.id === "33f5474e-4644-4e47-a327-94684c71b170";

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm" style={{ color: "var(--pom-text-muted)" }}>{isRoom ? "Room" : "Table"}</span>
      <span className="text-sm font-semibold text-inherit">
        {tableName || tableNumber}
      </span>
    </div>
  );
};

// =================================================================
// Login Card
// =================================================================

const LoginCard = ({
  setShowLoginDrawer,
}: {
  setShowLoginDrawer: (show: boolean) => void;
}) => {
  return (
    <div className="py-2 text-center">
      <p className="text-sm mb-3" style={{ color: "var(--pom-text-muted)" }}>Login to place your order</p>
      <button
        onClick={() => setShowLoginDrawer(true)}
        className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98]"
        style={{ backgroundColor: "var(--pom-accent, #ea580c)", boxShadow: "0 4px 14px color-mix(in srgb, var(--pom-accent, #ea580c) 40%, transparent)" }}
      >
        Continue with Phone Number
      </button>
    </div>
  );
};

// =================================================================
// Login Drawer
// =================================================================

const LoginDrawer = ({
  showLoginDrawer,
  setShowLoginDrawer,
  hotelId,
  hotelData,
  onLoginSuccess,
  requireOtp = false,
}: {
  showLoginDrawer: boolean;
  setShowLoginDrawer: (show: boolean) => void;
  hotelId: string;
  hotelData: HotelData;
  onLoginSuccess: () => void;
  requireOtp?: boolean;
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithPhone } = useAuthStore();
  const needUserName = hotelData?.delivery_rules?.need_user_name ?? false;
  const {
    step: otpStep,
    isSending,
    isVerifying,
    error: otpError,
    sendOtp,
    verifyOtp,
    reset: resetOtp,
  } = useWhatsAppOtp(hotelId);

  // Reset state when drawer closes
  const wasOpen = useRef(false);
  useEffect(() => {
    if (showLoginDrawer && !wasOpen.current) {
      resetOtp();
      setOtp("");
      setPhoneNumber("");
      setUserName("");
    }
    wasOpen.current = showLoginDrawer;
  }, [showLoginDrawer, resetOtp]);

  const handleDirectLogin = async () => {
    const countryCode = hotelData?.country_code?.replace(/[\+\s]/g, "") || "91";
    const phoneDigits = getPhoneDigitsForCountry(countryCode);

    if (!phoneNumber || !validatePhoneNumber(phoneNumber, countryCode)) {
      toast.error(getPhoneValidationError(countryCode));
      return;
    }

    if (needUserName && !userName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signInWithPhone(phoneNumber, hotelId, {
        country: hotelData?.country || "India",
        countryCode,
        callingCode: hotelData?.country_code || "+91",
        phoneDigits,
      });
      if (result) {
        if (userName.trim() && result.id) {
          try {
            await fetchFromHasura(updateUserFullNameMutation, {
              id: result.id,
              full_name: userName.trim(),
            });
            useAuthStore.setState({
              userData: { ...result, full_name: userName.trim(), role: "user" } as any,
            });
          } catch { }
        }
        toast.success("Logged in successfully");
        Notification.token.save(hotelId);
        onLoginSuccess();
        setShowLoginDrawer(false);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Login failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    const countryCode = hotelData?.country_code?.replace(/[\+\s]/g, "") || "91";
    const phoneDigits = getPhoneDigitsForCountry(countryCode);

    if (!phoneNumber || !validatePhoneNumber(phoneNumber, countryCode)) {
      toast.error(getPhoneValidationError(countryCode));
      return;
    }

    if (needUserName && !userName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      const fullPhone = `${hotelData?.country_code || "+91"}${phoneNumber}`;
      await sendOtp(fullPhone);
      toast.success("OTP sent to your WhatsApp!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send OTP"
      );
    }
  };

  const handleVerifyAndLogin = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit OTP");
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyOtp(otp);

      const countryCode = hotelData?.country_code?.replace(/[\+\s]/g, "") || "91";
      const phoneDigits = getPhoneDigitsForCountry(countryCode);

      const result = await signInWithPhone(phoneNumber, hotelId, {
        country: hotelData?.country || "India",
        countryCode,
        callingCode: hotelData?.country_code || "+91",
        phoneDigits,
      });
      if (result) {
        if (userName.trim() && result.id) {
          try {
            await fetchFromHasura(updateUserFullNameMutation, {
              id: result.id,
              full_name: userName.trim(),
            });
            useAuthStore.setState({
              userData: { ...result, full_name: userName.trim(), role: "user" } as any,
            });
          } catch { }
        }
        toast.success("Logged in successfully");
        Notification.token.save(hotelId);
        onLoginSuccess();
        setShowLoginDrawer(false);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Verification failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showLoginDrawer) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
        className="fixed inset-0 z-[70] flex flex-col"
        style={{ backgroundColor: "var(--pom-modal-bg, white)" }}
      >
        {/* Top bar with close */}
        <div className="shrink-0 flex items-center justify-between px-4 py-4">
          <button
            onClick={() => {
              if (otpStep === "otp" && requireOtp) {
                resetOtp();
                setOtp("");
              } else {
                setShowLoginDrawer(false);
              }
            }}
            className="p-1.5 rounded-full hover:opacity-80 transition-all duration-200"
            aria-label={otpStep === "otp" && requireOtp ? "Back" : "Close"}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="text-base font-bold">
            {otpStep === "otp" && requireOtp ? "Verify OTP" : "Login"}
          </span>
          <div className="w-9" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 flex flex-col justify-center max-w-md mx-auto w-full">
          {otpStep === "phone" || !requireOtp ? (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-3xl font-bold text-inherit mb-3">
                    Welcome Back
                  </h2>
                  <p className="opacity-70 text-[15px] leading-relaxed">
                    Please enter your phone number to place your order
                  </p>
                </motion.div>
              </div>

              {/* Name Input */}
              {needUserName && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-4"
                >
                  <Label
                    htmlFor="userName"
                    className="text-sm font-semibold text-inherit mb-3 block"
                  >
                    Your Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="rounded-xl text-inherit placeholder:opacity-70 bg-transparent border-[var(--pom-card-border,#e7e5e4)] focus:border-[var(--pom-accent,#ea580c)] focus:ring-2 focus:ring-[var(--pom-accent,#ea580c)]/20 h-14 text-base px-5 transition-all duration-200"
                  />
                </motion.div>
              )}

              {/* Phone Input */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <Label
                  htmlFor="phone"
                  className="text-sm font-semibold text-inherit mb-3 block"
                >
                  Phone Number
                  {hotelData?.country && (
                    <span className="opacity-60 font-normal ml-2 text-xs">
                      ({hotelData.country})
                    </span>
                  )}
                </Label>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center px-5 rounded-xl text-base font-bold text-[var(--pom-accent,#ea580c)] border border-[var(--pom-card-border,#e7e5e4)]" style={{ backgroundColor: "color-mix(in srgb, var(--pom-accent, #ea580c) 10%, transparent)" }}>
                    {hotelData?.country_code || "+91"}
                  </div>
                  <Input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => {
                      const countryCode =
                        hotelData?.country_code?.replace(/[\+\s]/g, "") || "91";
                      const maxDigits = getPhoneDigitsForCountry(countryCode);
                      setPhoneNumber(
                        e.target.value.replace(/\D/g, "").slice(0, maxDigits),
                      );
                    }}
                    placeholder="Enter your phone number"
                    className="flex-1 rounded-xl text-inherit placeholder:opacity-70 bg-transparent border-[var(--pom-card-border,#e7e5e4)] focus:border-[var(--pom-accent,#ea580c)] focus:ring-2 focus:ring-[var(--pom-accent,#ea580c)]/20 h-14 text-base px-5 transition-all duration-200"
                    autoFocus
                  />
                </div>
              </motion.div>

              {/* Send OTP / Continue Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <button
                  onClick={requireOtp ? handleSendOtp : handleDirectLogin}
                  disabled={(requireOtp ? isSending : isSubmitting) || !phoneNumber || (needUserName && !userName.trim())}
                  className="w-full px-6 py-4 text-[var(--pom-accent,#ea580c)] rounded-full hover:text-white border border-[var(--pom-accent,#ea580c)] transition-all duration-300 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{ backgroundColor: "color-mix(in srgb, var(--pom-accent, #ea580c) 15%, transparent)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--pom-accent, #ea580c)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--pom-accent, #ea580c) 15%, transparent)"; }}
                >
                  {(requireOtp ? isSending : isSubmitting) ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {requireOtp ? "Sending OTP..." : "Logging in..."}
                    </span>
                  ) : (
                    requireOtp ? "Send OTP" : "Continue"
                  )}
                </button>

                <button
                  onClick={() => setShowLoginDrawer(false)}
                  className="w-full px-6 py-3.5 rounded-full border bg-transparent hover:opacity-80 transition-all duration-200 font-medium text-base"
                  style={{ borderColor: "var(--pom-card-border, #d6d3d1)" }}
                >
                  Cancel
                </button>
              </motion.div>

              {/* Privacy Note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs opacity-60 text-center mt-6 leading-relaxed"
              >
                By continuing, you agree to our{" "}
                <span className="text-[var(--pom-accent,#ea580c)] hover:underline cursor-pointer">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-[var(--pom-accent,#ea580c)] hover:underline cursor-pointer">
                  Privacy Policy
                </span>
              </motion.p>
            </>
          ) : (
            <>
              {/* OTP Verification Step */}
              <div className="mb-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-3xl font-bold text-inherit mb-3">
                    Verify OTP
                  </h2>
                  <p className="opacity-70 text-[15px] leading-relaxed">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-semibold">
                      {hotelData?.country_code || "+91"} {phoneNumber}
                    </span>
                  </p>
                </motion.div>
              </div>

              {/* OTP Input */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  accentColor="var(--pom-accent, #ea580c)"
                />
                {otpError && (
                  <p className="text-sm text-red-500 text-center mt-2">{otpError}</p>
                )}
              </motion.div>

              {/* Verify Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <button
                  onClick={handleVerifyAndLogin}
                  disabled={isVerifying || isSubmitting || otp.length !== 6}
                  className="w-full px-6 py-4 text-[var(--pom-accent,#ea580c)] rounded-full hover:text-white border border-[var(--pom-accent,#ea580c)] transition-all duration-300 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{ backgroundColor: "color-mix(in srgb, var(--pom-accent, #ea580c) 15%, transparent)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--pom-accent, #ea580c)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--pom-accent, #ea580c) 15%, transparent)"; }}
                >
                  {isVerifying || isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {isVerifying ? "Verifying OTP..." : "Logging in..."}
                    </span>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => {
                      resetOtp();
                      setOtp("");
                    }}
                    className="text-sm font-medium transition-colors"
                    style={{ color: "var(--pom-text-muted, #78716c)" }}
                  >
                    Change Number
                  </button>
                  <button
                    onClick={handleSendOtp}
                    disabled={isSending}
                    className="text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ color: "var(--pom-accent, #ea580c)" }}
                  >
                    {isSending ? "Sending..." : "Resend OTP"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </div>

      </motion.div>
    </AnimatePresence>
  );
};

// =================================================================
// Phone Number Card with inline editing
// =================================================================

const PhoneNumberCard = ({
  user,
  hotelData,
}: {
  user: any;
  hotelData: HotelData;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const countryCode = hotelData?.country_code?.replace(/[\+\s]/g, "") || "91";
  const maxDigits = getPhoneDigitsForCountry(countryCode);

  const handleSave = async () => {
    if (!newPhone || !validatePhoneNumber(newPhone, countryCode)) {
      toast.error(getPhoneValidationError(countryCode));
      return;
    }
    setIsSaving(true);
    try {
      const fullPhone = `${hotelData?.country_code || "+91"}${newPhone}`;
      await fetchFromHasura(updateUserPhoneMutation, { id: user.id, phone: fullPhone });
      useAuthStore.setState({ userData: { ...user, phone: fullPhone } as any });
      toast.success("Phone number updated");
      setIsEditing(false);
      setNewPhone("");
    } catch {
      toast.error("Failed to update phone number");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
      <label className="text-sm font-semibold block mb-1" style={{ color: "var(--pom-text-muted)" }}>Phone Number</label>
      {isEditing ? (
        <div className="flex gap-2 items-center">
          <div className="flex items-center justify-center px-3 rounded-lg text-sm font-bold border" style={{ borderColor: "var(--pom-card-border, #e7e5e4)", color: "var(--pom-accent, #ea580c)" }}>
            {hotelData?.country_code || "+91"}
          </div>
          <Input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, maxDigits))}
            placeholder="New phone number"
            className="flex-1 rounded-lg text-sm text-inherit placeholder:text-inherit placeholder:opacity-40 focus-visible:ring-0 shadow-none"
            style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: "var(--pom-accent, #ea580c)" }}
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </button>
          <button
            type="button"
            onClick={() => { setIsEditing(false); setNewPhone(""); }}
            className="text-xs font-semibold px-2 py-1.5 rounded-lg"
            style={{ color: "var(--pom-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-inherit">{user.phone}</span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--pom-accent, #ea580c)", backgroundColor: "color-mix(in srgb, var(--pom-accent, #ea580c) 10%, transparent)" }}
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
};

// =================================================================
// Main PlaceOrderModal Component
// =================================================================

const PlaceOrderModal = ({
  hotelData,
  tableNumber,
  getWhatsappLink: _getWhatsappLinkProp,
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
    setOpenDrawerBottom,
    setOpenPlaceOrderModal,
    items,
    totalPrice,
    orderId,
    placeOrder,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    coordinates: selectedCoords,
    userAddress: address,
    setUserAddress: setAddress,
    clearOrder,
    deliveryInfo,
    orderNote,
    setOrderNote,
    orderType,
    setOrderType,
  } = useOrderStore();

  const { userData: user } = useAuthStore();

  // Check for cart items incompatible with current order type
  // Use allMenus (unfiltered) since filtered menus already excludes incompatible items
  const allMenus = (hotelData as any)?.allMenus || hotelData?.menus || [];
  const incompatibleItems = useMemo(() => {
    if (!orderType || !items?.length || !allMenus.length) return [];
    return items.filter((cartItem) => {
      const menuItem = allMenus.find((m: any) => m.id === cartItem.id);
      if (!menuItem) return false;
      if (orderType === "delivery" && menuItem.show_on_delivery === false) return true;
      if (orderType === "takeaway" && menuItem.show_on_takeaway === false) return true;
      return false;
    });
  }, [orderType, items, allMenus]);

  const hasIncompatibleItems = incompatibleItems.length > 0;

  const [showLoginDrawer, setShowLoginDrawer] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const showGrid = themeStyles?.showGrid === true;
  const isDark = themeStyles ? isDarkColor(themeStyles.backgroundColor || "#fafaf9") : false;

  // Check immediately on first render if returning from Cashfree
  const hasCashfreeReturn = typeof window !== "undefined" && !!sessionStorage.getItem("cashfree_pending_order");

  const [orderStatus, setOrderStatus] = useState<
    "idle" | "loading" | "verifying" | "success" | "failed"
  >(hasCashfreeReturn ? "verifying" : "idle");
  const [paymentFailReason, setPaymentFailReason] = useState("");
  const [showUpiScreen, setShowUpiScreen] = useState(false);
  const [finalOrderAmount, setFinalOrderAmount] = useState(0);
  const [generatedWhatsappLink, setGeneratedWhatsappLink] = useState<string>("");
  const [cashfreePaid, setCashfreePaid] = useState(hasCashfreeReturn);

  // Customer name state
  const needUserName = hotelData?.delivery_rules?.need_user_name ?? false;
  const [customerName, setCustomerName] = useState("");
  const [customerNameSaved, setCustomerNameSaved] = useState(false);

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
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
    valid_time_from?: string;
    valid_time_to?: string;
    applicable_on?: string;
    category_item_ids?: string;
    has_coupon?: boolean;
    rank?: number;
    pp_discount_id?: string;
    freebie_item_count?: number;
    freebie_item_ids?: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [hasActiveCodes, setHasActiveCodes] = useState(false);
  const [availableDiscounts, setAvailableDiscounts] = useState<{ id: string; code: string; description: string | null; discount_type: string; discount_value: number; min_order_value: number | null; max_discount_amount: number | null; }[]>([]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsAndroid(/Android/i.test(navigator.userAgent));
    }
  }, []);

  const isDelivery =
    tableNumber === 0 ? orderType === "delivery" : !tableNumber;
  const hasDelivery = hotelData?.geo_location;
  const isQrScan = qrId !== null && tableNumber !== 0;

  const getFreebieItemsTotal = (disc: typeof appliedDiscount) => {
    if (!disc || disc.type !== "freebie" || !disc.freebie_item_ids) return 0;
    const count = disc.freebie_item_count || 1;
    return disc.freebie_item_ids.split(",").reduce((total, id) => {
      const item = hotelData?.menus?.find((m) => m.id === id.trim());
      return total + (item?.price || 0) * count;
    }, 0);
  };

  const computeDiscountSavings = (disc: typeof appliedDiscount) => {
    if (!disc) return 0;
    if (disc.type === "freebie") return getFreebieItemsTotal(disc);
    const sub = items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
    let savings = disc.type === "percentage" ? (sub * disc.value) / 100 : disc.value;
    if (disc.type === "percentage" && disc.max_discount_amount) savings = Math.min(savings, disc.max_discount_amount);
    return Math.min(savings, sub);
  };

  const hotelFeatures = getFeatures(hotelData?.feature_flags || "");
  const showDiscountSection =
    (isQrScan ? hotelFeatures?.ordering?.enabled : hotelFeatures?.delivery?.enabled);

  // Fetch active coupon discounts for this partner
  useEffect(() => {
    if (!showDiscountSection || !hotelData?.id) return;
    fetchFromHasura(
      `query GetActiveDiscounts($partner_id: uuid!) {
        discounts(where: { partner_id: { _eq: $partner_id }, is_active: { _eq: true }, has_coupon: { _eq: true }, _or: [{ expires_at: { _is_null: true } }, { expires_at: { _gt: "now()" } }] }, order_by: [{ rank: asc_nulls_last }], limit: 5) {
          id code description discount_type discount_value min_order_value max_discount_amount
        }
      }`,
      { partner_id: hotelData.id }
    ).then((res) => {
      const discs = res?.discounts ?? [];
      setAvailableDiscounts(discs);
      setHasActiveCodes(discs.length > 0);
    }).catch(() => { });
  }, [hotelData?.id, showDiscountSection]);

  // Auto-apply non-coupon discounts (e.g. freebies) when order qualifies
  useEffect(() => {
    if (!showDiscountSection || !hotelData?.id || appliedDiscount) return;
    if (!items || items.length === 0) return;
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
    if (subtotal <= 0) return;

    fetchFromHasura(
      `query GetAutoApplyDiscounts($partner_id: uuid!) {
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
          expires_at valid_time_from valid_time_to terms_conditions
          usage_limit used_count
        }
      }`,
      { partner_id: hotelData.id }
    ).then((res) => {
      const discs = res?.discounts ?? [];
      const now = new Date();
      const currentOrderTypeMap: Record<string, string> = { delivery: "1", takeaway: "2" };
      const currentTypeCode = isQrScan ? "3" : (currentOrderTypeMap[orderType || "delivery"] || "1");
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
          valid_time_from: eligible.valid_time_from || undefined,
          valid_time_to: eligible.valid_time_to || undefined,
          applicable_on: eligible.applicable_on || undefined,
          category_item_ids: eligible.category_item_ids || undefined,
          has_coupon: eligible.has_coupon,
          rank: eligible.rank ? Number(eligible.rank) : undefined,
          pp_discount_id: eligible.pp_discount_id || undefined,
          freebie_item_count: eligible.freebie_item_count ? Number(eligible.freebie_item_count) : undefined,
          freebie_item_ids: eligible.freebie_item_ids || undefined,
        });
      }
    }).catch(() => {});
  }, [hotelData?.id, showDiscountSection, items, appliedDiscount, orderType, isQrScan]);

  // Prefill customer name from user data
  useEffect(() => {
    if (user && needUserName && !customerNameSaved) {
      const fullName = (user as any)?.full_name || "";
      // Only prefill if it's not a default generated name like "User12345"
      if (fullName && !/^User\d+$/.test(fullName)) {
        setCustomerName(fullName);
      }
    }
  }, [user, needUserName, customerNameSaved]);

  useEffect(() => {
    if (open_place_order_modal && items?.length === 0) {
      setOpenPlaceOrderModal(false);
      setOpenDrawerBottom(true);
    }
  }, [
    open_place_order_modal,
    items,
    setOpenDrawerBottom,
    setOpenPlaceOrderModal,
  ]);

  // Read onboarding data from localStorage
  const isDeliveryAvailable =
    (hotelData?.delivery_rules?.isDeliveryActive ?? true) &&
    isWithinTimeWindow(hotelData?.delivery_rules?.delivery_time_allowed);

  useEffect(() => {
    if (open_place_order_modal && tableNumber === 0 && !orderType) {
      try {
        const savedType = localStorage.getItem("onboarding_order_type");
        if (savedType === "delivery" || savedType === "takeaway") {
          setOrderType(!isDeliveryAvailable && savedType === "delivery" ? "takeaway" : savedType);
        } else {
          setOrderType(isDeliveryAvailable ? "delivery" : "takeaway");
        }
      } catch {
        setOrderType(isDeliveryAvailable ? "delivery" : "takeaway");
      }
    }
  }, [open_place_order_modal, tableNumber, orderType, setOrderType, isDeliveryAvailable]);

  // Pre-fill address from onboarding
  useEffect(() => {
    if (open_place_order_modal && !address) {
      try {
        const savedAddr = localStorage.getItem("onboarding_address");
        if (savedAddr) {
          const parsed = JSON.parse(savedAddr);
          if (parsed.address) {
            setAddress(parsed.address);
          }
        }
      } catch {}
    }
  }, [open_place_order_modal, address, setAddress]);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        if (windowHeight - currentHeight > 150) {
          setKeyboardOpen(true);
        } else {
          setKeyboardOpen(false);
        }
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  const hasMultiWhatsapp =
    getFeatures(hotelData?.feature_flags || "")?.multiwhatsapp?.enabled &&
    hotelData?.whatsapp_numbers?.length > 0;

  const hasCashfree =
    (hotelData as any)?.accept_payments_via_cashfree === true &&
    !!(hotelData as any)?.cashfree_merchant_id;

  const hasCod = (hotelData as any)?.accept_cod !== false; // default true if null/undefined

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cod" | "cashfree">(
    hasCashfree ? "cashfree" : "cod"
  );
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentSheetClosing, setPaymentSheetClosing] = useState(false);
  const closePaymentSheet = (newMethod?: "cod" | "cashfree") => {
    if (newMethod) setSelectedPaymentMethod(newMethod);
    setPaymentSheetClosing(true);
    setTimeout(() => {
      setShowPaymentSheet(false);
      setPaymentSheetClosing(false);
    }, 250);
  };

  const hasUpiQr =
    hotelData?.show_payment_qr === true &&
    !!hotelData?.upi_id;

  const postPaymentMessage = hotelData?.post_payment_message ?? null;

  useEffect(() => {
    if (
      selectedLocation &&
      hotelData.whatsapp_numbers?.some((item) => item.area === selectedLocation)
    ) {
      return;
    }
    const savedArea = localStorage?.getItem(
      `hotel-${hotelData.id}-selected-area`,
    );
    if (
      savedArea &&
      hotelData.whatsapp_numbers?.some((item) => item.area === savedArea)
    ) {
      setSelectedLocation(savedArea);
      return;
    }
    const selectedPhone = localStorage?.getItem(
      `hotel-${hotelData.id}-whatsapp-area`,
    );
    if (selectedPhone) {
      const location = hotelData.whatsapp_numbers?.find(
        (item) => item.number === selectedPhone,
      );
      if (location) {
        setSelectedLocation(location.area);
      }
    } else {
      setSelectedLocation("");
    }
  }, [hotelData.id, hotelData.whatsapp_numbers, selectedLocation]);

  useEffect(() => {
    if (user && !selectedLocation) {
      const savedArea = localStorage?.getItem(
        `hotel-${hotelData.id}-selected-area`,
      );
      if (
        savedArea &&
        hotelData.whatsapp_numbers?.some((item) => item.area === savedArea)
      ) {
        setSelectedLocation(savedArea);
      }
    }
  }, [user, selectedLocation, hotelData.id, hotelData.whatsapp_numbers]);

  const handleSelectHotelLocation = (location: string | null) => {
    setSelectedLocation(location || "");
    if (location) {
      const phoneNumber = hotelData.whatsapp_numbers?.find(
        (item) => item.area === location,
      )?.number;
      localStorage?.setItem(
        `hotel-${hotelData.id}-whatsapp-area`,
        phoneNumber || "",
      );
      localStorage?.setItem(`hotel-${hotelData.id}-selected-area`, location);
    } else {
      localStorage?.removeItem(`hotel-${hotelData.id}-whatsapp-area`);
      localStorage?.removeItem(`hotel-${hotelData.id}-selected-area`);
    }
  };

  useEffect(() => {
    const checkGeolocationPermission = async () => {
      try {
        if (navigator.permissions) {
          const permissionStatus = await navigator.permissions.query({
            name: "geolocation",
          });
          if (permissionStatus.state === "denied") {
            useLocationStore.setState({
              error:
                "Location permission is denied. Please enable it in your browser settings.",
              isLoading: false,
            });
          }
        }
      } catch (error) {
        console.error("Error checking geolocation permission:", error);
      }
    };
    checkGeolocationPermission();
  }, []);

  useEffect(() => {
    if (
      isDelivery &&
      hasDelivery &&
      selectedCoords !== null &&
      !isQrScan &&
      orderType === "delivery"
    ) {
      calculateDeliveryDistanceAndCost(hotelData as HotelData);
    }
  }, [selectedCoords, isDelivery, hasDelivery, isQrScan, orderType, hotelData]);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setDiscountError("");
    setValidatingCode(true);
    try {
      const subtotal = totalPrice || 0;
      const res = await fetchFromHasura(validateDiscountQuery, {
        partner_id: hotelData.id,
        code: discountInput.trim().toUpperCase(),
      });
      const disc = res?.discounts?.[0];
      if (!disc) {
        setDiscountError("Invalid or expired discount code.");
        return;
      }
      if (disc.usage_limit != null && disc.used_count >= disc.usage_limit) {
        setDiscountError("This code has reached its usage limit.");
        return;
      }
      // Check start date
      if (disc.starts_at && new Date(disc.starts_at) > new Date()) {
        setDiscountError("This discount is not active yet.");
        return;
      }
      // Check valid days
      if (disc.valid_days && disc.valid_days !== "All") {
        const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
        const validDays = disc.valid_days.split(",").map((d: string) => d.trim());
        if (!validDays.includes(today)) {
          setDiscountError("This discount is not valid today.");
          return;
        }
      }
      // Check valid date/time window
      const now = new Date();
      if (disc.starts_at && now < new Date(disc.starts_at)) {
        setDiscountError(`This discount starts on ${new Date(disc.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.`);
        return;
      }
      if (disc.expires_at && now > new Date(disc.expires_at)) {
        setDiscountError("This discount has expired.");
        return;
      }
      // Check order type
      if (disc.discount_order_types) {
        const allowedTypes = disc.discount_order_types.split(",").map((t: string) => t.trim());
        const currentOrderTypeMap: Record<string, string> = { delivery: "1", takeaway: "2" };
        const currentTypeCode = isQrScan ? "3" : (currentOrderTypeMap[orderType || "delivery"] || "1");
        if (!allowedTypes.includes(currentTypeCode)) {
          setDiscountError("This discount is not valid for your order type.");
          return;
        }
      }
      if (disc.min_order_value && subtotal < Number(disc.min_order_value)) {
        setDiscountError(`Minimum order of ${hotelData?.currency || "₹"}${disc.min_order_value} required.`);
        return;
      }
      const discountValue = Number(disc.discount_value);
      setAppliedDiscount({
        id: disc.id,
        code: disc.code,
        type: disc.discount_type,
        value: discountValue,
        max_discount_amount: disc.max_discount_amount ? Number(disc.max_discount_amount) : undefined,
        min_order_value: disc.min_order_value ? Number(disc.min_order_value) : undefined,
        description: disc.description || undefined,
        terms_conditions: disc.terms_conditions || undefined,
        discount_on_total: disc.discount_on_total,
        discount_order_types: disc.discount_order_types || undefined,
        valid_days: disc.valid_days || undefined,
        valid_time_from: disc.valid_time_from || undefined,
        valid_time_to: disc.valid_time_to || undefined,
        applicable_on: disc.applicable_on || undefined,
        category_item_ids: disc.category_item_ids || undefined,
        has_coupon: disc.has_coupon,
        rank: disc.rank ? Number(disc.rank) : undefined,
        pp_discount_id: disc.pp_discount_id || undefined,
        freebie_item_count: disc.freebie_item_count ? Number(disc.freebie_item_count) : undefined,
        freebie_item_ids: disc.freebie_item_ids || undefined,
      });
      setDiscountInput("");
    } catch {
      setDiscountError("Failed to validate code. Please try again.");
    } finally {
      setValidatingCode(false);
    }
  };

  // Auto-revalidate discount when items or order type change
  useEffect(() => {
    if (!appliedDiscount) return;
    // Skip revalidation if order was just placed (items cleared)
    if (!items || items.length === 0) return;
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;

    // Check min order value
    if (appliedDiscount.min_order_value && subtotal < appliedDiscount.min_order_value) {
      setAppliedDiscount(null);
      setDiscountError("");
      toast.info("Discount removed: order below minimum amount.");
      return;
    }

    // Check order type
    if (appliedDiscount.discount_order_types) {
      const allowedTypes = appliedDiscount.discount_order_types.split(",").map((t: string) => t.trim());
      const currentOrderTypeMap: Record<string, string> = { delivery: "1", takeaway: "2" };
      const currentTypeCode = isQrScan ? "3" : (currentOrderTypeMap[orderType || "delivery"] || "1");
      if (!allowedTypes.includes(currentTypeCode)) {
        setAppliedDiscount(null);
        setDiscountError("");
        toast.info("Discount removed: not valid for this order type.");
        return;
      }
    }
  }, [items, appliedDiscount, orderType, isQrScan]);

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError("");
    setDiscountInput("");
  };

  // Complete WhatsApp link generation with all order details
  const getWhatsappLink = (orderId?: string) => {
    // Client timezone (used for formatting times in messages)
    const tz = typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

    // First try to get order ID from function parameter, then from localStorage, then from order store
    const finalOrderId = orderId || localStorage?.getItem('last-order-id') || useOrderStore.getState().orderId;
    const savedAddress = address || "N/A";
    const selectedWhatsAppNumber = localStorage?.getItem(
      `hotel-${hotelData.id}-whatsapp-area`
    );
    const selectedArea = localStorage?.getItem(
      `hotel-${hotelData.id}-selected-area`
    );

    const currentSelectedArea = selectedArea || "";

    // Get location from localStorage or from the order store
    let locationLink = "";
    const userLocationData = localStorage?.getItem("user-location-store") ||
      JSON.stringify({ state: { coords: selectedCoords } });

    if (userLocationData) {
      try {
        const location = JSON.parse(userLocationData);
        if (location?.state?.coords) {
          const { lat, lng } = location.state.coords;
          locationLink = `\n*📍 Location:* https://www.google.com/maps?q=${lat},${lng}`;
        }
      } catch (error) {
        console.error("Error parsing location data:", error);
      }
    }

    const baseTotal =
      items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
    const qrCharge = qrGroup?.extra_charge
      ? getExtraCharge(
        items || [],
        qrGroup.extra_charge,
        qrGroup.charge_type || "FLAT_FEE"
      )
      : 0;
    const deliveryCharge =
      !isQrScan &&
        orderType === "delivery" &&
        deliveryInfo?.cost &&
        !deliveryInfo?.isOutOfRange
        ? deliveryInfo.cost
        : 0;
    const parcelChargeType = hotelData?.delivery_rules?.parcel_charge_type || "fixed";
    const parcelItemCount = items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
    let parcelCharge = 0;
    if (tableNumber === 0 && hotelData?.delivery_rules?.parcel_charge) {
      if (parcelChargeType === "itemwise") {
        const defC = hotelData.delivery_rules.parcel_charge || 0;
        const custC = hotelData.delivery_rules.parcel_charge_items || {};
        parcelCharge = (items || []).reduce((acc, item) => acc + (custC[item.id] ?? defC) * item.quantity, 0);
      } else {
        parcelCharge = parcelChargeType === "variable"
          ? parcelItemCount * hotelData.delivery_rules.parcel_charge
          : hotelData.delivery_rules.parcel_charge;
      }
    }
    const gstAmount = hotelData?.gst_percentage
      ? getGstAmount(baseTotal, hotelData.gst_percentage)
      : 0;

    const discountSavingsAmount = appliedDiscount ? computeDiscountSavings(appliedDiscount) : 0;
    const grandTotal = Math.max(0, baseTotal + qrCharge + deliveryCharge + parcelCharge + gstAmount - discountSavingsAmount);

    const hasMultiWhatsapp = getFeatures(hotelData?.feature_flags || "")
      ?.multiwhatsapp?.enabled;
    const hasMultipleWhatsappNumbers = hotelData?.whatsapp_numbers?.length > 1;
    const shouldShowHotelLocation =
      (hasMultiWhatsapp || hasMultipleWhatsappNumbers) &&
      currentSelectedArea &&
      currentSelectedArea.trim() !== "";

    const showTableLabel = hotelData?.id !== '33f5474e-4644-4e47-a327-94684c71b170'; // Krishnakripa Residency
    const nowTime = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hour12: true, timeZone: tz }).format(new Date());

    const currentOrder = useOrderStore.getState().order;
    const displayId = currentOrder?.id === finalOrderId ? currentOrder?.display_id : null;
    const dateParts = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).formatToParts(new Date());
    const day = dateParts.find(p => p.type === 'day')?.value;
    const month = dateParts.find(p => p.type === 'month')?.value;

    const shortId = displayId || (finalOrderId ? finalOrderId.slice(0, 4).toUpperCase() : 'N/A');
    const formattedOrderId = `${shortId}-${month} ${day}`;

    const headerLine = hotelData?.id === '7eb04e2d-9c20-42ba-a6b6-fce8019cad5f' ? '*Order Details*' : '*🍽️ Order Details 🍽️*';
    const tableLine = (tableNumber ?? 0) > 0
      ? `${showTableLabel ? "*Table:* " : ""}${qrData?.table_name || tableName || tableNumber}`
      : `*Order Type:* ${orderType || "Delivery"}`;
    const itemsList = items
      ?.map(
        (item, index) =>
          `${index + 1}. ${item.name} (${item.category.name})\n   ➤ Qty: ${item.quantity} × ${hotelData.currency}${item.price.toFixed(2)} = ${hotelData.currency}${(item.price * item.quantity).toFixed(2)}`
      )
      .join("\n\n") || "";

    const billingLines = [
      `*Subtotal:* ${hotelData.currency}${baseTotal.toFixed(2)}`,
      hotelData?.gst_percentage ? `*${hotelData?.country === "United Arab Emirates" ? "VAT" : "GST"} (${hotelData.gst_percentage}%):* ${hotelData.currency}${gstAmount.toFixed(2)}` : "",
      !isQrScan && orderType === "delivery" && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange ? `*Delivery Charge:* ${hotelData.currency}${deliveryInfo.cost.toFixed(2)}` : "",
      qrGroup?.extra_charge ? `*${qrGroup.name}:* ${hotelData.currency}${qrCharge.toFixed(2)}` : "",
      parcelCharge > 0 ? `*Parcel Charge:* ${hotelData.currency}${parcelCharge.toFixed(2)}` : "",
      discountSavingsAmount > 0 ? `*Discount:* -${hotelData.currency}${discountSavingsAmount.toFixed(2)}` : "",
      `*Total Price:* ${hotelData.currency}${grandTotal.toFixed(2)}`,
    ].filter(Boolean).join("\n");

    const infoLines = [
      `*Order ID:* ${formattedOrderId}`,
      tableLine,
      shouldShowHotelLocation ? `*Hotel Location:* ${currentSelectedArea.toUpperCase()}` : "",
      orderType === "delivery" ? `*Delivery Address:* ${savedAddress}${locationLink}` : "",
      (user as any)?.phone ? `*Customer Phone:* ${(user as any).phone}` : "",
      customerName?.trim() ? `*Customer Name:* ${customerName.trim()}` : "",
      `*Time:* ${nowTime}`,
    ].filter(Boolean).join("\n");

    const whatsappMsg = [
      headerLine,
      "",
      infoLines,
      "",
      "*📋 Order Items:*",
      itemsList,
      "",
      billingLines,
      orderNote ? `\n*📝 Note:* ${orderNote}` : "",
    ].filter((line) => line !== undefined).join("\n");

    // Get WhatsApp number (prefer whatsapp_numbers over phone)
    let number =
      selectedWhatsAppNumber ||
      hotelData?.whatsapp_numbers?.[0]?.number ||
      hotelData?.phone ||
      "8590115462";

    // Clean the number (remove non-digits)
    number = number.replace(/\D/g, "");

    // Get and clean country code
    const countryCode = hotelData?.country_code;
    if (countryCode) {
      const cleanCountryCode = countryCode.replace(/\D/g, "");
      // Only prepend country code if number doesn't already start with it
      if (!number.startsWith(cleanCountryCode)) {
        number = cleanCountryCode + number;
      }
    }

    // Add + prefix for international format
    const formattedNumber = number.startsWith('+') ? number : `+${number}`;

    return `https://api.whatsapp.com/send?phone=${formattedNumber}&text=${encodeURIComponent(whatsappMsg)}`;
  };

  const handlePlaceOrder = async (onSuccessCallback?: () => void) => {
    if (tableNumber === 0 && !orderType) {
      toast.error("Please select an order type");
      return;
    }

    if (needUserName && !customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (orderType === "delivery" && !address?.trim()) {
      toast.error("Please select a delivery address");
      return;
    }

    if (isDelivery) {
      const needLocation =
        hotelData?.delivery_rules?.needDeliveryLocation ?? true;
      if (!address?.trim()) {
        toast.error("Please enter your delivery address");
        return;
      }

      if (needLocation) {
        if (hasDelivery && !selectedCoords) {
          toast.error("Please select your location on the map");
          return;
        }

        if (deliveryInfo?.isOutOfRange) {
          toast.error("Delivery is not available to your location");
          return;
        }
      }
    }

    if (hasMultiWhatsapp && !selectedLocation) {
      toast.error("Please select a hotel location");
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setOrderStatus("loading");

    try {
      const subtotal =
        items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
      const extraCharges = [];

      if (isQrScan && qrGroup && qrGroup.name) {
        const qrChargeAmount = getExtraCharge(
          items || [],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE",
        );
        if (qrChargeAmount > 0) {
          extraCharges.push({
            name: qrGroup.name,
            amount: qrChargeAmount,
            charge_type: qrGroup.charge_type || "FLAT_FEE",
          });
        }
      }

      if (
        !isQrScan &&
        tableNumber === 0 &&
        qrGroup &&
        qrGroup.name &&
        (orderType === "delivery" || orderType === "takeaway")
      ) {
        const table0ChargeAmount = getExtraCharge(
          items || [],
          qrGroup.extra_charge,
          qrGroup.charge_type || "FLAT_FEE",
        );
        if (table0ChargeAmount > 0) {
          extraCharges.push({
            name: qrGroup.name,
            amount: table0ChargeAmount,
            charge_type: qrGroup.charge_type || "FLAT_FEE",
          });
        }
      }

      if (
        !isQrScan &&
        deliveryInfo?.cost &&
        !deliveryInfo?.isOutOfRange &&
        orderType === "delivery" &&
        !(hotelData?.delivery_rules?.hide_delivery_charge)
      ) {
        extraCharges.push({
          name: "Delivery Charge",
          amount: deliveryInfo.cost,
          charge_type: "FLAT_FEE",
        });
      }

      if (
        tableNumber === 0 &&
        hotelData?.delivery_rules?.parcel_charge &&
        hotelData.delivery_rules.parcel_charge > 0
      ) {
        const chargeType = hotelData.delivery_rules.parcel_charge_type || "fixed";
        const itemCount = items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
        let parcelAmount: number;
        if (chargeType === "itemwise") {
          const defC = hotelData.delivery_rules.parcel_charge || 0;
          const custC = hotelData.delivery_rules.parcel_charge_items || {};
          parcelAmount = (items || []).reduce((acc, item) => acc + (custC[item.id] ?? defC) * item.quantity, 0);
        } else {
          parcelAmount = chargeType === "variable"
            ? itemCount * hotelData.delivery_rules.parcel_charge
            : hotelData.delivery_rules.parcel_charge;
        }
        extraCharges.push({
          name: "Parcel Charge",
          amount: parcelAmount,
          charge_type: "FLAT_FEE",
        });
      }

      const gstAmount = getGstAmount(
        subtotal,
        hotelData?.gst_percentage as number,
      );

      const extraChargesTotal = extraCharges.reduce((acc, c) => acc + c.amount, 0);
      const discountSavingsAmount = appliedDiscount ? computeDiscountSavings(appliedDiscount) : 0;
      setFinalOrderAmount(Math.max(0, subtotal + extraChargesTotal + gstAmount - discountSavingsAmount));

      // Generate WhatsApp link BEFORE placing order to capture current state
      const whatsappLink = getWhatsappLink(orderId as string);
      setGeneratedWhatsappLink(whatsappLink);

      const result = await placeOrder(
        hotelData,
        tableNumber,
        qrId as string,
        gstAmount,
        extraCharges.length > 0 ? extraCharges : null,
        undefined,
        orderNote || "",
        tableName,
        appliedDiscount ? {
          code: appliedDiscount.code,
          type: appliedDiscount.type,
          value: appliedDiscount.value,
          savings: discountSavingsAmount,
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
            ? appliedDiscount.freebie_item_ids.split(",").map((id) => hotelData?.menus?.find((m) => m.id === id.trim())?.name).filter(Boolean).join(", ")
            : undefined,
          freebie_items: appliedDiscount.type === "freebie" && appliedDiscount.freebie_item_ids
            ? appliedDiscount.freebie_item_ids.split(",").map((id) => {
                const m = hotelData?.menus?.find((menu) => menu.id === id.trim());
                return m ? { id: m.id, name: m.name, price: m.price, pp_id: (m as any).pp_id, category: m.category } : null;
              }).filter(Boolean) as { id: string; name: string; price: number; pp_id?: string; category?: any }[]
            : undefined,
        } : null,
        needUserName ? customerName.trim() : undefined,
      );

      if (result) {
        if (result.id) {
          localStorage?.setItem("last-order-id", result.id);
        }

        if (appliedDiscount?.id) {
          fetchFromHasura(incrementDiscountUsageMutation, { id: appliedDiscount.id }).catch(() => { });
        }

        // Clear only the sessionStorage order type so the order type screen re-prompts on reload.
        try {
          sessionStorage.removeItem(`order_type_${hotelData.id}`);
        } catch {}

        if (onSuccessCallback) {
          onSuccessCallback();
        }
        setOrderStatus("success");
      } else {
        toast.error("Failed to place order. Please try again.");
        setOrderStatus("idle");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order. Please try again.");
      setOrderStatus("idle");
    }
  };

  const handleCashfreePayAndPlaceOrder = async () => {
    // Run the same validations as handlePlaceOrder
    if (tableNumber === 0 && !orderType) {
      toast.error("Please select an order type");
      return;
    }
    if (needUserName && !customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (orderType === "delivery" && !address?.trim()) {
      toast.error("Please select a delivery address");
      return;
    }
    if (isDelivery) {
      const needLocation = hotelData?.delivery_rules?.needDeliveryLocation ?? true;
      if (!address?.trim()) { toast.error("Please enter your delivery address"); return; }
      if (needLocation) {
        if (hasDelivery && !selectedCoords) { toast.error("Please select your location on the map"); return; }
        if (deliveryInfo?.isOutOfRange) { toast.error("Delivery is not available to your location"); return; }
      }
    }
    if (hasMultiWhatsapp && !selectedLocation) { toast.error("Please select a hotel location"); return; }
    if (!user) { toast.error("Please login first"); return; }

    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setOrderStatus("loading");

    try {
      // Compute the grand total (same logic as handlePlaceOrder)
      const subtotal = items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
      const extraCharges: { name: string; amount: number; charge_type: string }[] = [];
      if (isQrScan && qrGroup && qrGroup.name) {
        const amt = getExtraCharge(items || [], qrGroup.extra_charge, qrGroup.charge_type || "FLAT_FEE");
        if (amt > 0) extraCharges.push({ name: qrGroup.name, amount: amt, charge_type: qrGroup.charge_type || "FLAT_FEE" });
      }
      if (!isQrScan && tableNumber === 0 && qrGroup && qrGroup.name && (orderType === "delivery" || orderType === "takeaway")) {
        const amt = getExtraCharge(items || [], qrGroup.extra_charge, qrGroup.charge_type || "FLAT_FEE");
        if (amt > 0) extraCharges.push({ name: qrGroup.name, amount: amt, charge_type: qrGroup.charge_type || "FLAT_FEE" });
      }
      if (!isQrScan && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange && orderType === "delivery" && !(hotelData?.delivery_rules?.hide_delivery_charge)) {
        extraCharges.push({ name: "Delivery Charge", amount: deliveryInfo.cost, charge_type: "FLAT_FEE" });
      }
      if (tableNumber === 0 && hotelData?.delivery_rules?.parcel_charge && hotelData.delivery_rules.parcel_charge > 0) {
        const chargeType = hotelData.delivery_rules.parcel_charge_type || "fixed";
        const itemCount = items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
        let parcelAmount: number;
        if (chargeType === "itemwise") {
          const defC = hotelData.delivery_rules.parcel_charge || 0;
          const custC = hotelData.delivery_rules.parcel_charge_items || {};
          parcelAmount = (items || []).reduce((acc, item) => acc + (custC[item.id] ?? defC) * item.quantity, 0);
        } else {
          parcelAmount = chargeType === "variable" ? itemCount * hotelData.delivery_rules.parcel_charge : hotelData.delivery_rules.parcel_charge;
        }
        extraCharges.push({ name: "Parcel Charge", amount: parcelAmount, charge_type: "FLAT_FEE" });
      }
      const gstAmount = getGstAmount(subtotal, hotelData?.gst_percentage as number);
      const extraChargesTotal = extraCharges.reduce((acc, c) => acc + c.amount, 0);
      const discountSavingsAmount = appliedDiscount ? computeDiscountSavings(appliedDiscount) : 0;
      const grandTotal = Math.max(0, subtotal + extraChargesTotal + gstAmount - discountSavingsAmount);

      // Create a temporary order ID for Cashfree
      const cfOrderId = `CF_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Store order context in sessionStorage so we can resume after redirect
      sessionStorage.setItem("cashfree_pending_order", JSON.stringify({
        cfOrderId,
        partnerId: hotelData.id,
        amount: grandTotal,
        orderType: orderType || null,
        address: address || null,
        customerName: customerName || null,
        orderNote: orderNote || null,
        selectedLocation: selectedLocation || null,
        discountId: appliedDiscount?.id || null,
      }));

      // Build return URL — current page URL so Cashfree redirects back here
      const returnUrl = `${window.location.origin}${window.location.pathname}?cf_order=${cfOrderId}`;

      const cfRes = await createCashfreeOrderForPartner(
        hotelData.id,
        cfOrderId,
        Math.round(grandTotal * 100) / 100,
        {
          id: user.id,
          name: (user as any)?.full_name || customerName || "Customer",
          phone: ((user as any)?.phone || "9999999999").replace(/\D/g, "").slice(-10),
          email: (user as any)?.email,
        },
        returnUrl,
      );

      if (!cfRes.success) {
        toast.error(cfRes.error || "Failed to create payment");
        setOrderStatus("idle");
        return;
      }

      // Launch Cashfree checkout
      const cashfreeMode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox";
      const cashfree = await loadCashfree({ mode: cashfreeMode as "sandbox" | "production" });

      cashfree.checkout({
        paymentSessionId: cfRes.paymentSessionId!,
        redirectTarget: "_self",
      });
      // Page will redirect — flow continues in useEffect below
    } catch (error) {
      console.error("Cashfree payment error:", error);
      toast.error("Payment failed. Please try again.");
      setOrderStatus("idle");
    }
  };

  // Handle return from Cashfree checkout redirect — runs on mount
  useEffect(() => {
    const pendingStr = sessionStorage.getItem("cashfree_pending_order");
    if (!pendingStr) return;

    const pending = JSON.parse(pendingStr);
    if (!pending?.cfOrderId || !pending?.partnerId) return;

    // Clear immediately so we don't re-trigger
    sessionStorage.removeItem("cashfree_pending_order");

    // Restore saved state
    if (pending.orderType) setOrderType(pending.orderType);
    if (pending.address) setAddress(pending.address);
    if (pending.customerName) setCustomerName(pending.customerName);
    if (pending.orderNote) setOrderNote(pending.orderNote);
    if (pending.selectedLocation) setSelectedLocation(pending.selectedLocation);

    // Auto-open the place order modal and show verifying state
    setOpenPlaceOrderModal(true);
    setOrderStatus("verifying");
    setCashfreePaid(true);

    // Wait for auth store to hydrate (it's not persisted, needs cookie-based reauth)
    const waitForAuth = () => new Promise<void>((resolve) => {
      const check = () => {
        const authUser = useAuthStore.getState().userData;
        if (authUser?.id) { resolve(); return; }
        setTimeout(check, 300);
      };
      // Start checking after a brief delay for initial page load
      setTimeout(check, 500);
      // Timeout after 15s
      setTimeout(resolve, 15000);
    });

    const verifyAndPlace = async () => {
      try {
        const verifyRes = await verifyCashfreePayment(pending.partnerId, pending.cfOrderId);

        if (!verifyRes.success || !verifyRes.paid) {
          const reason = !verifyRes.success
            ? verifyRes.error
            : verifyRes.orderStatus === "ACTIVE"
              ? "Payment was not completed. You may have cancelled or dropped off during checkout."
              : `Payment status: ${verifyRes.orderStatus || "unknown"}. Please try again.`;
          setPaymentFailReason(reason || "Payment could not be completed.");
          setOrderStatus("failed");
          setCashfreePaid(false);
          return;
        }

        // Payment verified — wait for auth then place order
        setOrderStatus("loading");
        await waitForAuth();

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

        // Compute extra charges (same logic as handlePlaceOrder)
        const cfItems = storeState.items;
        const cfSubtotal = cfItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const cfExtraCharges: { name: string; amount: number; charge_type: string }[] = [];

        if (isQrScan && qrGroup && qrGroup.name) {
          const amt = getExtraCharge(cfItems, qrGroup.extra_charge, qrGroup.charge_type || "FLAT_FEE");
          if (amt > 0) cfExtraCharges.push({ name: qrGroup.name, amount: amt, charge_type: qrGroup.charge_type || "FLAT_FEE" });
        }
        if (!isQrScan && tableNumber === 0 && qrGroup && qrGroup.name) {
          const amt = getExtraCharge(cfItems, qrGroup.extra_charge, qrGroup.charge_type || "FLAT_FEE");
          if (amt > 0) cfExtraCharges.push({ name: qrGroup.name, amount: amt, charge_type: qrGroup.charge_type || "FLAT_FEE" });
        }

        const cfDeliveryInfo = storeState.deliveryInfo;
        if (!isQrScan && cfDeliveryInfo?.cost && !cfDeliveryInfo?.isOutOfRange && pending.orderType === "delivery" && !(hotelData?.delivery_rules?.hide_delivery_charge)) {
          cfExtraCharges.push({ name: "Delivery Charge", amount: cfDeliveryInfo.cost, charge_type: "FLAT_FEE" });
        }
        if (tableNumber === 0 && hotelData?.delivery_rules?.parcel_charge && hotelData.delivery_rules.parcel_charge > 0) {
          const chargeType = hotelData.delivery_rules.parcel_charge_type || "fixed";
          const itemCount = cfItems.reduce((acc, item) => acc + item.quantity, 0);
          let parcelAmount: number;
          if (chargeType === "itemwise") {
            const defC = hotelData.delivery_rules.parcel_charge || 0;
            const custC = hotelData.delivery_rules.parcel_charge_items || {};
            parcelAmount = cfItems.reduce((acc, item) => acc + (custC[item.id] ?? defC) * item.quantity, 0);
          } else {
            parcelAmount = chargeType === "variable" ? itemCount * hotelData.delivery_rules.parcel_charge : hotelData.delivery_rules.parcel_charge;
          }
          cfExtraCharges.push({ name: "Parcel Charge", amount: parcelAmount, charge_type: "FLAT_FEE" });
        }

        const result = await storeState.placeOrder(
          hotelData,
          tableNumber,
          qrId as string,
          getGstAmount(cfSubtotal, hotelData?.gst_percentage as number),
          cfExtraCharges.length > 0 ? cfExtraCharges : null,
          undefined,
          pending.orderNote || "",
          tableName,
          null,
          pending.customerName || undefined,
        );

        if (result) {
          if (result.id) {
            localStorage?.setItem("last-order-id", result.id);
            markOrderAsPaid(result.id, verifyRes.cfPaymentId || undefined).catch(() => {});
          }
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

    verifyAndPlace();
  }, []);

  const handleLoginSuccess = () => {
    const savedArea = localStorage?.getItem(
      `hotel-${hotelData.id}-selected-area`,
    );
    if (savedArea && !selectedLocation) {
      setSelectedLocation(savedArea);
    }
    setShowLoginDrawer(false);
  };

  const handleCloseSuccessDialog = () => {
    setAddress("");
    setOrderNote("");
    clearOrder();
    setOpenPlaceOrderModal(false);
    setOrderStatus("idle");
  };

  const handleCloseUpiScreen = () => {
    setShowUpiScreen(false);
    setAddress("");
    setOrderNote("");
    clearOrder();
    setOpenPlaceOrderModal(false);
    setOrderStatus("idle");
  };

  const minimumOrderAmount = deliveryInfo?.minimumOrderAmount || 0;

  const _noOrderingAvailable = tableNumber === 0 &&
    !isWithinTimeWindow(hotelData?.delivery_rules?.delivery_time_allowed) &&
    !isWithinTimeWindow(hotelData?.delivery_rules?.takeaway_time_allowed);
  const isPlaceOrderDisabled =
    _noOrderingAvailable ||
    orderStatus === "loading" || orderStatus === "verifying" || orderStatus === "failed" ||
    (tableNumber === 0 && !orderType) ||
    (isDelivery &&
      hasDelivery &&
      !isQrScan &&
      (!address ||
        ((hotelData?.delivery_rules?.needDeliveryLocation ?? true) &&
          !selectedCoords))) ||
    (isDelivery && deliveryInfo?.isOutOfRange) ||
    (hasMultiWhatsapp && !selectedLocation);

  const { qrData } = useQrDataStore();

  // Compute grand total for sticky bar
  const _barSubtotal = items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
  const _barQrCharge = qrGroup?.extra_charge ? getExtraCharge(items || [], qrGroup.extra_charge, qrGroup.charge_type || "FLAT_FEE") : 0;
  const _barHideDelivery = hotelData?.delivery_rules?.hide_delivery_charge ?? false;
  const _barDeliveryCharge = !isQrScan && orderType === "delivery" && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange && !_barHideDelivery ? deliveryInfo.cost : 0;
  const _barTotalItemCount = items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const _barParcelCharge = (() => {
    if (!(tableNumber === 0 && (hotelData?.delivery_rules?.parcel_charge || 0) > 0)) return 0;
    const ct = hotelData?.delivery_rules?.parcel_charge_type || "fixed";
    if (ct === "itemwise") {
      const defC = hotelData?.delivery_rules?.parcel_charge || 0;
      const custC = hotelData?.delivery_rules?.parcel_charge_items || {};
      return (items || []).reduce((acc, item) => acc + (custC[item.id] ?? defC) * item.quantity, 0);
    }
    return ct === "variable" ? _barTotalItemCount * (hotelData?.delivery_rules?.parcel_charge || 0) : (hotelData?.delivery_rules?.parcel_charge || 0);
  })();
  const _barGst = (_barSubtotal * (hotelData?.gst_percentage || 0)) / 100;
  const _barDiscountSavings = appliedDiscount ? computeDiscountSavings(appliedDiscount) : 0;
  const _barGrandTotal = Math.max(0, _barSubtotal + _barQrCharge + _barDeliveryCharge + _barParcelCharge + _barGst - _barDiscountSavings);

  return (
    <>
      <div
        className={`fixed inset-0 z-[1000] flex flex-col ${open_place_order_modal ? "flex" : "hidden"
          }`}
        style={(() => {
          return {
            backgroundColor: "white",
            color: "#000000",
            "--pom-card-bg": "rgba(0,0,0,0.04)",
            "--pom-card-border": "rgba(0,0,0,0.08)",
            "--pom-accent": "#ea580c",
            "--pom-card-shadow": "0 1px 4px rgba(0,0,0,0.06)",
            "--pom-text-muted": "rgba(0,0,0,0.75)",
            "--pom-modal-bg": "white",
          } as React.CSSProperties;
        })()}
      >
        {/* Header */}
        <div
          className="shrink-0 z-10"
          style={{
            backgroundColor: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center gap-3 px-4 py-4 max-w-2xl mx-auto">
            <button
              onClick={() => {
                setOpenPlaceOrderModal(false);
                setOpenDrawerBottom(true);
              }}
              className="p-1 active:opacity-70 transition-opacity"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold">Checkout</h1>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {(items?.length ?? 0) > 0 && (
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
              {/* Restaurant / Hotel Name + Order Type */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                <h2 className="font-bold text-base">{hotelData?.store_name || hotelData?.name}</h2>
                {(hotelData?.location_details || hotelData?.district || hotelData?.country) && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--pom-text-muted)" }}>
                    {hotelData.location_details || [hotelData.district, hotelData.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {tableNumber === 0 && (
                  <div className="mt-3">
                    <OrderTypeCard
                      orderType={orderType}
                      setOrderType={setOrderType}
                      deliveryTimeAllowed={hotelData?.delivery_rules?.delivery_time_allowed}
                      takeawayTimeAllowed={hotelData?.delivery_rules?.takeaway_time_allowed}
                      isDeliveryActive={hotelData?.delivery_rules?.isDeliveryActive ?? true}
                    />
                  </div>
                )}
              </div>

              {/* Items Card */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                <h3 className="font-bold text-[15px] mb-1">Your Order</h3>
                {hasIncompatibleItems && (
                  <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs font-semibold text-red-700 mb-1">
                      Some items are not available for {orderType}
                    </p>
                    {incompatibleItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-red-600">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <ItemsCard
                  items={items || []}
                  increaseQuantity={increaseQuantity}
                  decreaseQuantity={decreaseQuantity}
                  removeItem={removeItem}
                  currency={hotelData?.currency || "₹"}
                  onAddMore={() => {
                    setOpenPlaceOrderModal(false);
                    setOpenDrawerBottom(true);
                  }}
                />
                {appliedDiscount?.type === "freebie" && appliedDiscount.freebie_item_ids && (
                  <div className="mt-2 space-y-2">
                    {appliedDiscount.freebie_item_ids.split(",").map((id) => {
                      const item = hotelData?.menus?.find((m) => m.id === id.trim());
                      if (!item) return null;
                      return (
                        <div key={id} className="flex items-center justify-between py-2 px-1 rounded-lg opacity-80" style={{ backgroundColor: "var(--pom-card-bg, #fff)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                          <div>
                            <p className="text-sm font-semibold">{item.name}</p>
                            <p className="text-xs opacity-60">{hotelData?.currency || "₹"}{item.price.toFixed(2)} <span className="font-bold">FREE</span></p>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-md opacity-70">x{appliedDiscount.freebie_item_count || 1}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Note for restaurant — pill style */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border" style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}>
                    <MessageCircle className="w-4 h-4 shrink-0" style={{ color: "var(--pom-text-muted)" }} />
                    <Textarea
                      placeholder="Add a note for the restaurant..."
                      value={orderNote ?? ""}
                      onChange={(e) => setOrderNote(e.target.value)}
                      className="resize-none border-0 p-0 text-[13px] text-inherit placeholder:text-inherit placeholder:opacity-70 focus-visible:ring-0 shadow-none min-h-0 bg-transparent"
                      rows={1}
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>

              {/* Table / QR Info */}
              {isQrScan && (
                <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                  <TableNumberCard
                    hotelData={hotelData}
                    tableNumber={tableNumber}
                    tableName={qrData?.table_name || undefined}
                  />
                </div>
              )}

              {/* Multi WhatsApp Location */}
              <MultiWhatsappCard
                hotelData={hotelData}
                selectedLocation={selectedLocation}
                setSelectedLocation={handleSelectHotelLocation}
              />

              {/* Delivery Address */}
              {!isQrScan && isDelivery && orderType === "delivery" && (
                <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                  <UnifiedAddressSection
                    address={address || ""}
                    setAddress={setAddress}
                    deliveryInfo={deliveryInfo}
                    hotelData={hotelData}
                    theme={themeStyles ? {
                      accent: themeStyles.accent,
                      bg: themeStyles.backgroundColor,
                      text: themeStyles.color,
                      showGrid: themeStyles.showGrid,
                    } : undefined}
                  />
                </div>
              )}

              {/* Customer Name */}
              {needUserName && user && (
                <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                  <label className="text-sm font-semibold block mb-1" style={{ color: "var(--pom-text-muted)" }}>Your Name *</label>
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setCustomerNameSaved(false); }}
                    onBlur={async () => {
                      if (customerName.trim() && user?.id && !customerNameSaved) {
                        try {
                          await fetchFromHasura(updateUserFullNameMutation, { id: user.id, full_name: customerName.trim() });
                          useAuthStore.setState({ userData: { ...user, full_name: customerName.trim() } as any });
                          setCustomerNameSaved(true);
                        } catch { }
                      }
                    }}
                    placeholder="Enter your name"
                    className="rounded-lg text-sm text-inherit placeholder:text-inherit placeholder:opacity-40 focus-visible:ring-0 shadow-none"
                    style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}
                  />
                </div>
              )}

              {/* Phone Number */}
              {user && (user as any)?.phone && (
                <PhoneNumberCard user={user} hotelData={hotelData} />
              )}

              {/* Discount Code */}
              {showDiscountSection && hasActiveCodes && (
                <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                  {!appliedDiscount && availableDiscounts.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {availableDiscounts.map((disc) => (
                        <button
                          key={disc.id}
                          onClick={() => { setDiscountInput(disc.code); setDiscountError(""); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed text-left transition-colors active:scale-[0.99]"
                          style={{ borderColor: "var(--pom-accent, #ea580c)" }}
                        >
                          <Tag className="h-3.5 w-3.5 text-[var(--pom-accent,#ea580c)] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold font-mono text-[var(--pom-accent,#ea580c)] tracking-wider">{disc.code}</span>
                            <span className="text-[10px] block leading-tight" style={{ color: "var(--pom-text-muted)" }}>
                              {disc.discount_type === "freebie"
                                ? "Free item"
                                : disc.discount_type === "percentage"
                                ? `${disc.discount_value}% off`
                                : `${hotelData?.currency || "₹"}${disc.discount_value} off`}
                              {disc.min_order_value ? ` above ${hotelData?.currency || "₹"}${disc.min_order_value}` : ""}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-[var(--pom-accent,#ea580c)] shrink-0">APPLY</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {appliedDiscount ? (
                    <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--pom-card-bg, #fff)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                      <div>
                        <p className="text-sm font-semibold font-mono">{appliedDiscount.code}</p>
                        <p className="text-xs mt-0.5 opacity-60">
                          {appliedDiscount.type === "freebie"
                            ? (() => {
                                const names = appliedDiscount.freebie_item_ids?.split(",").map((id) => {
                                  const item = hotelData?.menus?.find((m) => m.id === id.trim());
                                  return item?.name;
                                }).filter(Boolean);
                                return names?.length ? `Free: ${names.join(", ")}` : "Free item included!";
                              })()
                            : `You save ${hotelData?.currency || "₹"}${computeDiscountSavings(appliedDiscount).toFixed(2)}`}
                        </p>
                      </div>
                      <button onClick={handleRemoveDiscount} className="p-1 rounded-full opacity-60">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={discountInput}
                          onChange={(e) => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
                          placeholder="Enter discount code"
                          className="uppercase font-mono rounded-lg text-sm text-inherit placeholder:text-inherit placeholder:opacity-50"
                          style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}
                        />
                        <button
                          onClick={handleApplyDiscount}
                          disabled={validatingCode || !discountInput.trim()}
                          className="shrink-0 px-4 py-2 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                          style={{ backgroundColor: "var(--pom-accent, #ea580c)" }}
                        >
                          {validatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                        </button>
                      </div>
                      {discountError && <p className="text-xs text-red-500">{discountError}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method selector removed — now in bottom bar */}

              {/* Bill Details */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                <BillCard
                  items={items || []}
                  currency={hotelData?.currency || "₹"}
                  gstPercentage={hotelData?.gst_percentage}
                  deliveryInfo={deliveryInfo}
                  isDelivery={isDelivery && !isQrScan && orderType === "delivery"}
                  qrGroup={qrGroup}
                  hotelData={hotelData}
                  tableNumber={tableNumber}
                  discount={appliedDiscount ? { type: appliedDiscount.type, value: appliedDiscount.value, max_discount_amount: appliedDiscount.max_discount_amount, freebie_item_count: appliedDiscount.freebie_item_count, freebie_item_ids: appliedDiscount.freebie_item_ids, freebie_item_names: appliedDiscount.freebie_item_ids?.split(",").map((id) => hotelData?.menus?.find((m) => m.id === id.trim())?.name).filter(Boolean).join(", ") } : null}
                />
              </div>

              {/* Login prompt */}
              {!user && (
                <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                  <LoginCard setShowLoginDrawer={setShowLoginDrawer} />
                </div>
              )}

              {/* Warnings */}
              {isDelivery && !isQrScan && orderType === "delivery" && deliveryInfo?.isOutOfRange && (
                <div className="text-sm p-3 rounded-xl text-center" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
                  Delivery is not available to your selected location
                </div>
              )}

              {(items?.length === 0 || (isDelivery && orderType === "delivery" && (totalPrice ?? 0) < minimumOrderAmount)) && (
                <div className="text-sm p-3 rounded-xl text-center" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#fcd34d" }}>
                  Minimum order amount: {hotelData?.currency || "₹"}{deliveryInfo?.minimumOrderAmount.toFixed(2)}
                </div>
              )}

              {/* Bottom spacer for sticky bar */}
              <div className="h-20" />
            </div>
          )}
        </div>

        {/* Payment Method Bottom Sheet */}
        {showPaymentSheet && (
          <div
            className="fixed inset-0 z-[60] flex items-end"
            onClick={() => closePaymentSheet()}
            style={{ transition: "opacity 0.25s ease", opacity: paymentSheetClosing ? 0 : 1 }}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative w-full rounded-t-2xl p-5 pb-8"
              style={{
                backgroundColor: "#ffffff",
                transition: "transform 0.25s ease",
                transform: paymentSheetClosing ? "translateY(100%)" : "translateY(0)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5 bg-gray-300" />
              <h3 className="font-bold text-[16px] mb-4 text-gray-900">Select payment method</h3>
              <div className="flex flex-col gap-2">
                {hasCod && (
                  <button
                    onClick={() => closePaymentSheet("cod")}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: selectedPaymentMethod === "cod" ? "#ea580c" : "#e5e5e5",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-orange-50">
                      <Banknote size={20} className="text-orange-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-[14px] text-gray-900">Pay on delivery</p>
                      <p className="text-[12px] text-gray-500">UPI/Cash</p>
                    </div>
                    {selectedPaymentMethod === "cod" && (
                      <CheckCircle2 size={20} className="ml-auto shrink-0" style={{ color: "var(--pom-accent, #ea580c)" }} />
                    )}
                  </button>
                )}
                {hasCashfree && (
                  <button
                    onClick={() => closePaymentSheet("cashfree")}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: selectedPaymentMethod === "cashfree" ? "#ea580c" : "#e5e5e5",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-orange-50">
                      <CreditCard size={20} className="text-orange-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-[14px] text-gray-900">Pay Online</p>
                      <p className="text-[12px] text-gray-500">Cards/UPI/Net Banking</p>
                    </div>
                    {selectedPaymentMethod === "cashfree" && (
                      <CheckCircle2 size={20} className="ml-auto shrink-0" style={{ color: "var(--pom-accent, #ea580c)" }} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sticky Bottom Bar — Place Order */}
        {(items?.length ?? 0) > 0 && (
          <div
            className="shrink-0 px-3 py-2.5 z-10"
            style={{
              backgroundColor: "var(--pom-card-bg, white)",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
              borderTop: "1px solid var(--pom-card-border, #e7e5e4)",
              bottom: keyboardOpen ? `${window.visualViewport?.offsetTop || 0}px` : "0",
            }}
          >
            <div className="max-w-2xl mx-auto">
              {user?.role !== "partner" && user?.role !== "superadmin" ? (
                <div className="flex items-center gap-2">
                  {/* Left: Pay Using selector */}
                  <div
                    className="shrink-0 min-w-0"
                    onClick={() => {
                      if (hasCashfree && hasCod) setShowPaymentSheet(true);
                    }}
                    style={{ cursor: hasCashfree && hasCod ? "pointer" : "default" }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CreditCard size={14} style={{ color: "var(--pom-text-muted, #78716c)", flexShrink: 0 }} />
                      <span className="text-[11px] font-semibold tracking-wide whitespace-nowrap" style={{ color: "var(--pom-text-muted, #78716c)" }}>
                        PAY USING {hasCashfree && hasCod && "▲"}
                      </span>
                    </div>
                    <p className="font-bold text-[13px] leading-tight whitespace-nowrap" style={{ color: "var(--pom-accent, #ea580c)" }}>
                      {selectedPaymentMethod === "cashfree" ? "Pay Online" : "Pay on delivery"}
                    </p>
                    <p className="text-[11px] whitespace-nowrap" style={{ color: "var(--pom-accent, #ea580c)", opacity: 0.7 }}>
                      {selectedPaymentMethod === "cashfree" ? "Cards/UPI/Net Banking" : "UPI/Cash"}
                    </p>
                  </div>

                  {/* Right: Place Order button */}
                  <button
                    onClick={() => {
                      const useCashfree = hasCashfree && (!hasCod || selectedPaymentMethod === "cashfree");
                      if (useCashfree) {
                        handleCashfreePayAndPlaceOrder();
                      } else {
                        handlePlaceOrder(() => {
                          if (hasUpiQr) setShowUpiScreen(true);
                        });
                      }
                    }}
                    disabled={
                      isPlaceOrderDisabled ||
                      hasIncompatibleItems ||
                      !user ||
                      items?.length === 0 ||
                      (isDelivery && orderType === "delivery" && (totalPrice ?? 0) < minimumOrderAmount)
                    }
                    className="flex-1 min-w-0 py-3 rounded-xl text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-4 active:scale-[0.98]"
                    style={{ backgroundColor: "var(--pom-accent, #ea580c)" }}
                  >
                    {(orderStatus === "loading" || orderStatus === "verifying") ? (
                      <span className="flex items-center gap-2 mx-auto text-[14px]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {orderStatus === "verifying" ? "Verifying..." : selectedPaymentMethod === "cashfree" ? "Processing..." : "Placing..."}
                      </span>
                    ) : (
                      <>
                        <span className="text-left shrink-0">
                          <span className="block text-[14px] font-bold leading-tight">{hotelData?.currency || "₹"}{_barGrandTotal.toFixed(2)}</span>
                          <span className="block text-[10px] font-semibold opacity-80 leading-tight">TOTAL</span>
                        </span>
                        <span className="flex items-center gap-1 text-[14px] font-bold whitespace-nowrap">
                          Place Order
                          <ArrowLeft size={14} className="rotate-180" />
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginDrawer(true)}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] transition-all active:scale-[0.98]"
                  style={{ backgroundColor: "var(--pom-accent, #ea580c)" }}
                >
                  Login to Place Order
                </button>
              )}
            </div>
          </div>
        )}

        <LoginDrawer
          showLoginDrawer={showLoginDrawer}
          setShowLoginDrawer={setShowLoginDrawer}
          hotelId={hotelData?.id || ""}
          hotelData={hotelData}
          onLoginSuccess={handleLoginSuccess}
          requireOtp={!isQrScan && hotelFeatures.whatsappnotifications.access && hotelFeatures.whatsappnotifications.enabled}
        />
      </div>

      <OrderStatusDialog
        status={showUpiScreen ? "idle" : orderStatus}
        onClose={handleCloseSuccessDialog}
        partnerId={hotelData?.id}
        whatsappLink={generatedWhatsappLink}
        isPetpooja={!!hotelData.petpooja_restaurant_id}
        hasUpiQr={hasUpiQr}
        cashfreePaid={cashfreePaid}
        orderId={orderId || (typeof localStorage !== "undefined" ? localStorage.getItem("last-order-id") : undefined) || undefined}
        failReason={paymentFailReason}
      />

      {showUpiScreen && !cashfreePaid && (
        <UpiPaymentScreen
          upiId={hotelData.upi_id}
          storeName={hotelData.store_name}
          amount={finalOrderAmount}
          currency={hotelData.currency || "₹"}
          orderId={orderId as string}
          postPaymentMessage={postPaymentMessage}
          whatsappLink={generatedWhatsappLink}
          onBack={() => setShowUpiScreen(false)}
          onClose={handleCloseUpiScreen}
        />
      )}
    </>
  );
};

export default PlaceOrderModal;
