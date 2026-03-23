"use client";
import useOrderStore, { OrderItem } from "@/store/orderStore";
import { useEffect, useRef, useState } from "react";
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

  const savedAddresses = ((user as any)?.addresses || []) as SavedAddress[];

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
    if (savedAddresses.length === 0) return;
    const defaultAddress =
      savedAddresses.find((addr) => addr.isDefault) || savedAddresses[0];
    if (
      defaultAddress &&
      defaultAddress.id !== selectedAddressId &&
      !selectedAddressId
    ) {
      handleAddressSelect(defaultAddress);
    }
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
      const locationData = {
        state: {
          coords: {
            lat: addr.latitude,
            lng: addr.longitude,
          },
        },
      };
      localStorage?.setItem(
        "user-location-store",
        JSON.stringify(locationData),
      );
    }

    if (addr?.latitude && addr?.longitude) {
      useOrderStore.getState().setUserCoordinates({
        lat: addr.latitude,
        lng: addr.longitude,
      });
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
        })() : (
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
}: {
  status: "idle" | "loading" | "success";
  onClose: () => void;
  partnerId?: string;
  whatsappLink?: string;
  isPetpooja?: boolean;
  hasUpiQr?: boolean;
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

  return (
    <AnimatePresence>
      {status !== "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[7000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          {status === "loading" && (
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
                  key={loadingText}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="mt-6 text-2xl font-semibold"
                >
                  {loadingText}
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
                Order Placed Successfully!
              </h2>
              {partnerId === "098fa941-3476-4a2c-b1f8-ea88eb15ad4f" && (
                <p className="mt-3 text-sm text-white/80 text-center px-4">
                  Kindly make the payment using the WhatsApp QR code and share the payment confirmation screenshot to confirm your order.
                </p>
              )}
              <div className="w-full mt-8 px-4 space-y-3">
                {whatsappLink && !isPetpooja && !hasUpiQr && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <button className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors">
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      Send Order to WhatsApp
                    </button>
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="w-full px-6 py-2.5 border rounded-xl font-medium hover:opacity-80 transition-colors"
                  style={{ borderColor: "var(--pom-card-border, #d6d3d1)" }}
                >
                  Back to Menu
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
              {currency}{(item.price * item.quantity).toFixed(2)}
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
  discount?: { type: "percentage" | "flat"; value: number; max_discount_amount?: number } | null;
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

  const deliveryCharges =
    isDelivery && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange
      ? deliveryInfo.cost
      : 0;

  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const parcelChargeType = hotelData?.delivery_rules?.parcel_charge_type || "fixed";
  const parcelChargeValue = hotelData?.delivery_rules?.parcel_charge || 0;
  const parcelCharge =
    tableNumber === 0 && parcelChargeValue > 0
      ? parcelChargeType === "variable"
        ? totalItemCount * parcelChargeValue
        : parcelChargeValue
      : 0;

  const gstAmount = (subtotal * (gstPercentage || 0)) / 100;
  let discountSavings = 0;
  if (discount) {
    if (discount.type === "percentage") {
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
          <span className="text-inherit">{currency}{subtotal.toFixed(2)}</span>
        </div>

        {qrGroup && qrExtraCharges > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--pom-text-muted)" }}>
              {qrGroup.name || "Service Charge"}
              {qrGroup.charge_type === "PER_ITEM" && <span className="text-xs ml-1">(Per item)</span>}
            </span>
            <span className="text-inherit">{currency}{qrExtraCharges.toFixed(2)}</span>
          </div>
        )}

        {isDelivery && (deliveryInfo?.cost ?? 0) > 0 && !deliveryInfo?.isOutOfRange && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--pom-text-muted)" }}>
              Delivery Fee | {deliveryInfo?.distance?.toFixed(1)} kms
            </span>
            <span className="text-inherit">{currency}{deliveryInfo?.cost?.toFixed(2)}</span>
          </div>
        )}

        {parcelCharge > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--pom-text-muted)" }}>
              Parcel Charge
              {parcelChargeType === "variable" && <span className="text-xs ml-1">({totalItemCount} items)</span>}
            </span>
            <span className="text-inherit">{currency}{parcelCharge.toFixed(2)}</span>
          </div>
        )}

        {gstPercentage ? (
          <>
            <div className="border-t my-2" style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }} />
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--pom-text-muted)" }}>
                {hotelData?.country === "United Arab Emirates" ? "VAT" : "GST"} &amp; Other Charges ({gstPercentage}%)
              </span>
              <span className="text-inherit">{currency}{gstAmount.toFixed(2)}</span>
            </div>
          </>
        ) : null}

        {discountSavings > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600 font-medium">Discount</span>
            <span className="text-green-600">-{currency}{discountSavings.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t pt-3 mt-1" style={{ borderColor: "var(--pom-card-border, #e7e5e4)" }}>
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-inherit text-[15px]">Grand Total</span>
            <span className="font-extrabold text-inherit text-lg">
              {currency}{grandTotal.toFixed(2)}
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
}: {
  orderType: "takeaway" | "delivery" | null;
  setOrderType: (type: "takeaway" | "delivery") => void;
}) => {
  return (
    <div className="flex gap-2">
      {(["delivery", "takeaway"] as const).map((type) => (
        <button
          key={type}
          onClick={() => setOrderType(type)}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${orderType === type
            ? "text-white"
            : ""
            }`}
          style={orderType === type
            ? { backgroundColor: "var(--pom-accent, #ea580c)" }
            : { backgroundColor: "color-mix(in srgb, var(--pom-accent, #ea580c) 12%, transparent)", color: "var(--pom-text-muted)" }
          }
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
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
}: {
  showLoginDrawer: boolean;
  setShowLoginDrawer: (show: boolean) => void;
  hotelId: string;
  hotelData: HotelData;
  onLoginSuccess: () => void;
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
  } = useWhatsAppOtp();

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
        Notification.token.save();
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
              if (otpStep === "otp") {
                resetOtp();
                setOtp("");
              } else {
                setShowLoginDrawer(false);
              }
            }}
            className="p-1.5 rounded-full hover:opacity-80 transition-all duration-200"
            aria-label={otpStep === "otp" ? "Back" : "Close"}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="text-base font-bold">
            {otpStep === "otp" ? "Verify OTP" : "Login"}
          </span>
          <div className="w-9" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 flex flex-col justify-center max-w-md mx-auto w-full">
          {otpStep === "phone" ? (
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
                    Please enter your phone number to review your order
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

              {/* Send OTP Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <button
                  onClick={handleSendOtp}
                  disabled={isSending || !phoneNumber || (needUserName && !userName.trim())}
                  className="w-full px-6 py-4 text-[var(--pom-accent,#ea580c)] rounded-full hover:text-white border border-[var(--pom-accent,#ea580c)] transition-all duration-300 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{ backgroundColor: "color-mix(in srgb, var(--pom-accent, #ea580c) 15%, transparent)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--pom-accent, #ea580c)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--pom-accent, #ea580c) 15%, transparent)"; }}
                >
                  {isSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending OTP...
                    </span>
                  ) : (
                    "Send OTP"
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

  const [showLoginDrawer, setShowLoginDrawer] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const showGrid = themeStyles?.showGrid === true;

  const [orderStatus, setOrderStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");
  const [showUpiScreen, setShowUpiScreen] = useState(false);
  const [finalOrderAmount, setFinalOrderAmount] = useState(0);
  const [generatedWhatsappLink, setGeneratedWhatsappLink] = useState<string>("");

  // Customer name state
  const needUserName = hotelData?.delivery_rules?.need_user_name ?? false;
  const [customerName, setCustomerName] = useState("");
  const [customerNameSaved, setCustomerNameSaved] = useState(false);

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string;
    code: string;
    type: "percentage" | "flat";
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

  const computeDiscountSavings = (disc: typeof appliedDiscount) => {
    if (!disc) return 0;
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

  useEffect(() => {
    if (open_place_order_modal && tableNumber === 0 && !orderType) {
      setOrderType("delivery");
    }
  }, [open_place_order_modal, tableNumber, orderType, setOrderType]);

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
      // Check valid time window
      if (disc.valid_time_from && disc.valid_time_to) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        if (currentTime < disc.valid_time_from || currentTime > disc.valid_time_to) {
          setDiscountError(`This discount is valid only between ${disc.valid_time_from} and ${disc.valid_time_to}.`);
          return;
        }
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
    const parcelCharge =
      tableNumber === 0 && hotelData?.delivery_rules?.parcel_charge
        ? parcelChargeType === "variable"
          ? parcelItemCount * hotelData.delivery_rules.parcel_charge
          : hotelData.delivery_rules.parcel_charge
        : 0;
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
        orderType === "delivery"
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
        const parcelAmount = chargeType === "variable"
          ? itemCount * hotelData.delivery_rules.parcel_charge
          : hotelData.delivery_rules.parcel_charge;
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

  const isPlaceOrderDisabled =
    orderStatus === "loading" ||
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
  const _barDeliveryCharge = !isQrScan && orderType === "delivery" && deliveryInfo?.cost && !deliveryInfo?.isOutOfRange ? deliveryInfo.cost : 0;
  const _barTotalItemCount = items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const _barParcelCharge = tableNumber === 0 && (hotelData?.delivery_rules?.parcel_charge || 0) > 0
    ? (hotelData?.delivery_rules?.parcel_charge_type === "variable" ? _barTotalItemCount * (hotelData?.delivery_rules?.parcel_charge || 0) : (hotelData?.delivery_rules?.parcel_charge || 0))
    : 0;
  const _barGst = (_barSubtotal * (hotelData?.gst_percentage || 0)) / 100;
  const _barDiscountSavings = appliedDiscount ? computeDiscountSavings(appliedDiscount) : 0;
  const _barGrandTotal = Math.max(0, _barSubtotal + _barQrCharge + _barDeliveryCharge + _barParcelCharge + _barGst - _barDiscountSavings);

  return (
    <>
      <div
        className={`fixed inset-0 z-[1000] flex flex-col ${open_place_order_modal ? "flex" : "hidden"
          }`}
        style={(() => {
          const bgColor = themeStyles?.backgroundColor || "#fafaf9";
          const dark = themeStyles ? isDarkColor(bgColor) : false;
          return {
            backgroundColor: bgColor,
            color: themeStyles?.color || undefined,
            ...(themeStyles && showGrid ? {
              backgroundImage: `linear-gradient(${themeStyles.color}08 1px, transparent 1px), linear-gradient(90deg, ${themeStyles.color}08 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            } : {}),
            "--pom-card-bg": dark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.04)",
            "--pom-card-border": dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.08)",
            "--pom-accent": themeStyles?.accent || "#ea580c",
            "--pom-card-shadow": dark ? "0 4px 16px rgba(0,0,0,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
            "--pom-text-muted": dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)",
            "--pom-modal-bg": dark ? "rgba(255,255,255,0.18)" : (themeStyles?.backgroundColor || "white"),
          } as React.CSSProperties;
        })()}
      >
        {/* Header */}
        <div
          className="shrink-0 z-10"
          style={{
            backgroundColor: themeStyles?.backgroundColor || "white",
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
                {hotelData?.location && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--pom-text-muted)" }}>{hotelData.location}</p>
                )}
                {tableNumber === 0 && (
                  <div className="mt-3">
                    <OrderTypeCard orderType={orderType} setOrderType={setOrderType} />
                  </div>
                )}
              </div>

              {/* Items Card */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--pom-card-bg, white)", boxShadow: "var(--pom-card-shadow)", border: "1px solid var(--pom-card-border, #e7e5e4)" }}>
                <h3 className="font-bold text-[15px] mb-1">Your Order</h3>
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
                              {disc.discount_type === "percentage"
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
                    <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                      <div>
                        <p className="text-sm font-semibold font-mono" style={{ color: "#4ade80" }}>{appliedDiscount.code}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#86efac" }}>
                          You save {hotelData?.currency || "₹"}{computeDiscountSavings(appliedDiscount).toFixed(2)}
                        </p>
                      </div>
                      <button onClick={handleRemoveDiscount} className="p-1 rounded-full" style={{ color: "#4ade80" }}>
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
                  discount={appliedDiscount ? { type: appliedDiscount.type, value: appliedDiscount.value, max_discount_amount: appliedDiscount.max_discount_amount } : null}
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

        {/* Sticky Bottom Bar — Place Order */}
        {(items?.length ?? 0) > 0 && (
          <div
            className="shrink-0 px-4 py-3 z-10"
            style={{
              backgroundColor: "var(--pom-card-bg, white)",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
              borderTop: "1px solid var(--pom-card-border, #e7e5e4)",
              bottom: keyboardOpen ? `${window.visualViewport?.offsetTop || 0}px` : "0",
            }}
          >
            <div className="max-w-2xl mx-auto">
              {user?.role !== "partner" && user?.role !== "superadmin" ? (
                <button
                  onClick={() =>
                    handlePlaceOrder(() => {
                      if (hasUpiQr) setShowUpiScreen(true);
                    })
                  }
                  disabled={
                    isPlaceOrderDisabled ||
                    !user ||
                    items?.length === 0 ||
                    (isDelivery && orderType === "delivery" && (totalPrice ?? 0) < minimumOrderAmount)
                  }
                  className="w-full py-4 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-6 active:scale-[0.98]"
                  style={{ backgroundColor: "var(--pom-accent, #ea580c)" }}
                >
                  <span>
                    {orderStatus === "loading" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Placing...
                      </span>
                    ) : (
                      `${hotelData?.currency || "₹"}${_barGrandTotal.toFixed(2)}`
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    PLACE ORDER
                    <ArrowLeft size={15} className="rotate-180" />
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginDrawer(true)}
                  className="w-full py-4 rounded-xl text-white font-bold text-[15px] transition-all active:scale-[0.98]"
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
        />
      </div>

      <OrderStatusDialog
        status={showUpiScreen ? "idle" : orderStatus}
        onClose={handleCloseSuccessDialog}
        partnerId={hotelData?.id}
        whatsappLink={generatedWhatsappLink}
        isPetpooja={!!hotelData.petpooja_restaurant_id}
        hasUpiQr={hasUpiQr}
      />

      {showUpiScreen && (
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
