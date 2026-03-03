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
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  Home,
  Briefcase,
  X,
  MessageCircle,
} from "lucide-react";
import { useLocationStore } from "@/store/geolocationStore";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HotelData } from "@/app/hotels/[...id]/page";
import { getGstAmount, calculateDeliveryDistanceAndCost } from "../OrderDrawer";
import { QrGroup } from "@/app/admin/qr-management/page";
import { getExtraCharge } from "@/lib/getExtraCharge";
import { getFeatures } from "@/lib/getFeatures";
import DescriptionWithTextBreak from "@/components/DescriptionWithTextBreak";
import { useQrDataStore } from "@/store/qrDataStore";
import { motion, AnimatePresence } from "framer-motion";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserAddressesMutation, updateUserFullNameMutation } from "@/api/auth";
import {
  validatePhoneNumber,
  getPhoneValidationError,
} from "@/lib/getUserCountry";
import { getPhoneDigitsForCountry } from "@/lib/countryPhoneMap";
import { validateDiscountQuery, incrementDiscountUsageMutation } from "@/api/discounts";
import { Tag } from "lucide-react";
import { UpiPaymentScreen } from "./UpiPaymentScreen";
import AddressManagementModal, { type SavedAddress } from "./AddressManagementModal";

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
}: {
  address: string;
  setAddress: (addr: string) => void;
  deliveryInfo: DeliveryInfo | null;
  hotelData: HotelData;
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
      className="bg-white rounded-2xl overflow-hidden border-stone-200 border"
    >
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-900 text-[15px]">
            Deliver to
          </h3>
          <button
            onClick={() => {
              setEditingAddress(null);
              setShowAddressModal(true);
            }}
            className="text-sm font-semibold text-orange-500"
          >
            Change Location
          </button>
        </div>

        {selectedAddress ? (() => {
          const IconComp =
            selectedAddress.label === "Home" ? Home : selectedAddress.label === "Work" ? Briefcase : MapPin;
          const addressText =
            selectedAddress.address ||
            [selectedAddress.flat_no, selectedAddress.house_no, selectedAddress.area, selectedAddress.city]
              .filter(Boolean)
              .join(", ");

          return (
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 truncate">
                    {selectedAddress.label}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {addressText}
                  </p>
                </div>
              </div>
            </div>
          );
        })() : (
          <div
            onClick={() => {
              setEditingAddress(null);
              setShowAddressModal(true);
            }}
            className="flex items-center gap-3 p-4 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Add delivery address</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Tap to add your first address
              </p>
            </div>
          </div>
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
                  className="w-full px-6 py-2.5 border border-stone-300 text-white rounded-xl font-medium hover:bg-white/10 transition-colors"
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
}: {
  items: OrderItem[];
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  removeItem: (id: string) => void;
  currency: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
    >
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-base mb-4">
          Your Order
        </h3>
        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex justify-between items-center py-3 border-b border-stone-100 last:border-b-0"
            >
              <div className="flex-1">
                <DescriptionWithTextBreak
                  spanClassName="text-sm font-medium text-gray-900"
                  accent="black"
                  maxChars={25}
                >
                  {item.name}
                </DescriptionWithTextBreak>
                <p className="text-xs text-stone-500 mt-0.5">
                  {item.category.name}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-1">
                  <button
                    onClick={() => {
                      if (item.quantity > 1) {
                        decreaseQuantity(item.id as string);
                      } else {
                        removeItem(item.id as string);
                      }
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white transition-colors text-stone-600 font-semibold"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => increaseQuantity(item.id as string)}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white transition-colors text-orange-600 font-semibold"
                  >
                    +
                  </button>
                </div>
                <span className="font-semibold text-gray-900 min-w-[70px] text-right">
                  {currency}
                  {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-orange-100/20 to-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
    >
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-base mb-4">
          Bill Summary
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Item Total</span>
            <span className="font-medium text-gray-900">
              {currency}
              {subtotal.toFixed(2)}
            </span>
          </div>

          {qrGroup && qrExtraCharges > 0 && (
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-stone-600">
                  {qrGroup.name || "Service Charge"}
                </span>
                <p className="text-xs text-stone-500">
                  {qrGroup.charge_type === "PER_ITEM" ? "Per item" : "Fixed"}
                </p>
              </div>
              <span className="font-medium text-gray-900">
                {currency}
                {qrExtraCharges.toFixed(2)}
              </span>
            </div>
          )}

          {gstPercentage ? (
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">
                {hotelData?.country === "United Arab Emirates" ? "VAT" : "GST"}{" "}
                ({gstPercentage}%)
              </span>
              <span className="font-medium text-gray-900">
                {currency}
                {gstAmount.toFixed(2)}
              </span>
            </div>
          ) : null}

          {isDelivery && (deliveryInfo?.cost ?? 0) > 0 && !deliveryInfo?.isOutOfRange && (
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-stone-600">Delivery Charge</span>
                <p className="text-xs text-stone-500">
                  {deliveryInfo?.distance?.toFixed(1)} km
                </p>
              </div>
              <span className="font-medium text-gray-900">
                {currency}
                {deliveryInfo?.cost?.toFixed(2)}
              </span>
            </div>
          )}

          {parcelCharge > 0 && (
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-stone-600">Parcel Charge</span>
                {parcelChargeType === "variable" && (
                  <p className="text-xs text-stone-500">
                    {totalItemCount} items × {currency}{parcelChargeValue.toFixed(2)}
                  </p>
                )}
              </div>
              <span className="font-medium text-gray-900">
                {currency}
                {parcelCharge.toFixed(2)}
              </span>
            </div>
          )}

          {discountSavings > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 font-medium">Discount</span>
              <span className="font-medium text-green-600">
                − {currency}{discountSavings.toFixed(2)}
              </span>
            </div>
          )}

          <div className="border-t border-stone-200 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total Amount</span>
              <span className="font-bold text-xl text-orange-600">
                {currency}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5"
    >
      <h3 className="font-semibold text-gray-900 text-base mb-4">Order Type</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setOrderType("takeaway")}
          className={`p-4 rounded-xl border-2 transition-all text-sm font-medium ${
            orderType === "takeaway"
              ? "border-orange-600 bg-orange-100/30 text-orange-600"
              : "border-stone-200 hover:border-stone-300 text-stone-600"
          }`}
        >
          Takeaway
        </button>
        <button
          onClick={() => setOrderType("delivery")}
          className={`p-4 rounded-xl border-2 transition-all text-sm font-medium ${
            orderType === "delivery"
              ? "border-orange-600 bg-orange-100/30 text-orange-600"
              : "border-stone-200 hover:border-stone-300 text-stone-600"
          }`}
        >
          Delivery
        </button>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5"
      ref={dropdownRef}
    >
      <h3 className="font-semibold text-gray-900 text-base mb-4">
        Hotel Location
      </h3>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 border border-stone-200 rounded-xl bg-stone-50 text-left flex justify-between items-center hover:bg-stone-100 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900">
            {selectedLocation ? selectedLocation.toUpperCase() : "Select Area"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-stone-600 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto"
            >
              <div
                className="p-3 hover:bg-stone-50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedLocation("");
                  setIsOpen(false);
                }}
              >
                <span className="text-sm text-stone-600">Select Area</span>
              </div>
              {hotelData.whatsapp_numbers.map((item) => (
                <div
                  key={item.area}
                  className="p-3 hover:bg-stone-50 cursor-pointer border-t border-stone-100 transition-colors"
                  onClick={() => {
                    setSelectedLocation(item.area);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-sm font-medium text-gray-900">
                    {item.area.toUpperCase()}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-orange-100/20 to-white rounded-2xl shadow-sm border border-stone-200 p-5"
    >
      <h3 className="font-semibold text-gray-900 text-base mb-3">
        {isRoom ? "Room" : "Table"} Information
      </h3>
      <div className="flex items-center gap-2">
        {tableName ? (
          <span className="text-2xl font-bold text-orange-600">{tableName}</span>
        ) : (
          <>
            {!isRoom && (
              <span className="text-sm text-stone-600">Table Number:</span>
            )}
            <span className="text-2xl font-bold text-orange-600">
              {tableNumber}
            </span>
          </>
        )}
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-orange-100/30 to-white rounded-2xl shadow-sm border border-orange-600/30 p-6"
    >
      <h3 className="font-bold text-gray-900 text-lg mb-2">Almost there!</h3>
      <p className="text-stone-600 mb-4 text-sm">
        Login or create account to place your order
      </p>
      <button
        onClick={() => setShowLoginDrawer(true)}
        className="w-full px-6 py-3.5 bg-orange-600 text-white rounded-xl hover:bg-orange-600 transition-all duration-300 font-semibold shadow-lg shadow-orange-600/20"
      >
        Continue with Phone Number
      </button>
    </motion.div>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithPhone } = useAuthStore();
  const needUserName = hotelData?.delivery_rules?.need_user_name ?? false;

  const handleLogin = async () => {
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
        // Update full_name if provided
        if (userName.trim() && result.id) {
          try {
            await fetchFromHasura(updateUserFullNameMutation, {
              id: result.id,
              full_name: userName.trim(),
            });
            useAuthStore.setState({
              userData: { ...result, full_name: userName.trim(), role: "user" } as any,
            });
          } catch {}
        }
        toast.success("Logged in successfully");
        onLoginSuccess();
        setShowLoginDrawer(false);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showLoginDrawer) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
        onClick={() => setShowLoginDrawer(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
          className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative border border-stone-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setShowLoginDrawer(false)}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone-100 transition-all duration-200 group"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-stone-500 group-hover:text-stone-700" />
          </button>

          {/* Header */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Welcome Back
              </h2>
              <p className="text-stone-600 text-[15px] leading-relaxed">
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
                className="text-sm font-semibold text-gray-900 mb-3 block"
              >
                Your Name <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="rounded-2xl text-gray-900 placeholder:text-gray-400 bg-white border-stone-200 focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20 h-14 text-base px-5 transition-all duration-200"
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
              className="text-sm font-semibold text-gray-900 mb-3 block"
            >
              Phone Number
              {hotelData?.country && (
                <span className="text-stone-500 font-normal ml-2 text-xs">
                  ({hotelData.country})
                </span>
              )}
            </Label>
            <div className="flex gap-3">
              <div className="flex items-center justify-center px-5 bg-orange-100/30 rounded-2xl text-base font-bold text-orange-600 border border-orange-600/20">
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
                className="flex-1 rounded-2xl text-gray-900 placeholder:text-gray-400 bg-white border-stone-200 focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20 h-14 text-base px-5 transition-all duration-200"
                autoFocus
              />
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <button
              onClick={handleLogin}
              disabled={isSubmitting || !phoneNumber || (needUserName && !userName.trim())}
              className="w-full px-6 py-4 bg-orange-100/70 text-orange-600 rounded-full hover:bg-orange-600 hover:text-white border border-orange-600/30 hover:border-orange-600 transition-all duration-300 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Continue"
              )}
            </button>

            <button
              onClick={() => setShowLoginDrawer(false)}
              className="w-full px-6 py-3.5 rounded-full border border-stone-300 bg-transparent text-stone-800 hover:bg-stone-100 hover:text-stone-900 hover:border-stone-500 transition-all duration-200 font-medium text-base"
            >
              Cancel
            </button>
          </motion.div>

          {/* Privacy Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-stone-500 text-center mt-6 leading-relaxed"
          >
            By continuing, you agree to our{" "}
            <span className="text-orange-600 hover:underline cursor-pointer">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-orange-600 hover:underline cursor-pointer">
              Privacy Policy
            </span>
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
}: {
  hotelData: HotelData;
  tableNumber: number;
  getWhatsappLink: (orderId: string) => string;
  qrId: string | null;
  qrGroup: QrGroup | null;
  tableName?: string;
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
    }).catch(() => {});
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
          fetchFromHasura(incrementDiscountUsageMutation, { id: appliedDiscount.id }).catch(() => {});
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

  return (
    <>
      <div
        className={`fixed inset-0 z-[1000] bg-stone-50 ${
          open_place_order_modal ? "block" : "hidden"
        }`}
      >
        {/* Modern Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 shadow-sm z-10">
          <div className="flex items-center gap-4 p-4">
            <button
              onClick={() => {
                setOpenPlaceOrderModal(false);
                setOpenDrawerBottom(true);
              }}
              className="p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-stone-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Review Your Order
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                {items?.length || 0} item{(items?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 pb-32 overflow-y-auto max-h-[calc(100vh-80px)]">
          {(items?.length ?? 0) > 0 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <ItemsCard
                items={items || []}
                increaseQuantity={increaseQuantity}
                decreaseQuantity={decreaseQuantity}
                removeItem={removeItem}
                currency={hotelData?.currency || "₹"}
              />

              {tableNumber === 0 && (
                <OrderTypeCard
                  orderType={orderType}
                  setOrderType={setOrderType}
                />
              )}

              <MultiWhatsappCard
                hotelData={hotelData}
                selectedLocation={selectedLocation}
                setSelectedLocation={handleSelectHotelLocation}
              />

              {isQrScan ? (
                <TableNumberCard
                  hotelData={hotelData}
                  tableNumber={tableNumber}
                  tableName={qrData?.table_name || undefined}
                />
              ) : isDelivery && orderType === "delivery" ? (
                <UnifiedAddressSection
                  address={address || ""}
                  setAddress={setAddress}
                  deliveryInfo={deliveryInfo}
                  hotelData={hotelData}
                />
              ) : null}

              {/* Discount Code — above bill summary */}
              {showDiscountSection && hasActiveCodes && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5"
                >
                  <h3 className="font-semibold text-gray-900 text-base mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-orange-500" />
                    Discount Code
                  </h3>
                  {/* Available discount banners */}
                  {!appliedDiscount && availableDiscounts.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {availableDiscounts.map((disc) => (
                        <button
                          key={disc.id}
                          onClick={() => {
                            setDiscountInput(disc.code);
                            setDiscountError("");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50 transition-colors active:scale-[0.99] text-left"
                        >
                          <Tag className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold font-mono text-orange-600 tracking-wider">{disc.code}</span>
                            <span className="text-[10px] text-stone-500 block leading-tight">
                              {disc.discount_type === "percentage"
                                ? `${disc.discount_value}% off`
                                : `${hotelData?.currency || "₹"}${disc.discount_value} off`}
                              {disc.min_order_value ? ` above ${hotelData?.currency || "₹"}${disc.min_order_value}` : ""}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-orange-500 shrink-0">TAP TO APPLY</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {appliedDiscount ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-green-700 font-mono">{appliedDiscount.code}</p>
                        <p className="text-xs text-green-600 mt-0.5">
                          Offer Applied! You save {hotelData?.currency || "₹"}{computeDiscountSavings(appliedDiscount).toFixed(2)}
                        </p>
                      </div>
                      <button onClick={handleRemoveDiscount} className="p-1 rounded-full hover:bg-green-100">
                        <X className="h-4 w-4 text-green-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={discountInput}
                          onChange={(e) => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
                          placeholder="Enter code"
                          className="uppercase font-mono rounded-xl border-stone-200 text-black"
                        />
                        <button
                          onClick={handleApplyDiscount}
                          disabled={validatingCode || !discountInput.trim()}
                          className="shrink-0 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                        >
                          {validatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                        </button>
                      </div>
                      {discountError && (
                        <p className="text-xs text-red-500">{discountError}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

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

              {/* Order Note */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5"
              >
                <h3 className="font-semibold text-gray-900 text-base mb-3">
                  Special Instructions
                </h3>
                <Textarea
                  placeholder="Add cooking instructions, allergies, or delivery notes..."
                  value={orderNote ?? ""}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="resize-none rounded-lg border-stone-200 text-gray-900 placeholder:text-gray-400"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-stone-500 mt-2 text-right">
                  {(orderNote ?? "").length}/500 characters
                </div>
              </motion.div>

              {/* Customer Name */}
              {needUserName && user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5"
                >
                  <h3 className="font-semibold text-gray-900 text-base mb-3">
                    Your Name <span className="text-red-500">*</span>
                  </h3>
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setCustomerNameSaved(false);
                    }}
                    onBlur={async () => {
                      if (customerName.trim() && user?.id && !customerNameSaved) {
                        try {
                          await fetchFromHasura(updateUserFullNameMutation, {
                            id: user.id,
                            full_name: customerName.trim(),
                          });
                          useAuthStore.setState({
                            userData: { ...user, full_name: customerName.trim() } as any,
                          });
                          setCustomerNameSaved(true);
                        } catch {}
                      }
                    }}
                    placeholder="Enter your name"
                    className="rounded-lg border-stone-200 text-gray-900 placeholder:text-gray-400"
                  />
                </motion.div>
              )}

              {!user && <LoginCard setShowLoginDrawer={setShowLoginDrawer} />}

              {isDelivery &&
                !isQrScan &&
                orderType === "delivery" &&
                deliveryInfo?.isOutOfRange && (
                  <div className="text-sm text-red-600 p-4 bg-red-50 rounded-xl text-center border border-red-200">
                    ⚠️ Delivery is not available to your selected location
                  </div>
                )}

              {(items?.length === 0 ||
                (isDelivery &&
                  orderType === "delivery" &&
                  (totalPrice ?? 0) < minimumOrderAmount)) && (
                <div className="text-sm text-amber-700 p-4 bg-amber-50 rounded-xl text-center border border-amber-200">
                  ⚠️ Minimum order amount for delivery is{" "}
                  {hotelData?.currency || "₹"}
                  {deliveryInfo?.minimumOrderAmount.toFixed(2)}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                {user?.role !== "partner" && user?.role !== "superadmin" ? (
                  <button
                    onClick={() =>
                      handlePlaceOrder(() => {
                        if (hasUpiQr) {
                          setShowUpiScreen(true);
                        }
                      })
                    }
                    disabled={
                      isPlaceOrderDisabled ||
                      !user ||
                      items?.length === 0 ||
                      (isDelivery &&
                        orderType === "delivery" &&
                        (totalPrice ?? 0) < minimumOrderAmount)
                    }
                    className="w-full px-6 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-600 transition-all duration-300 font-semibold shadow-lg shadow-orange-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {orderStatus === "loading" ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Placing Order...
                      </span>
                    ) : (
                      "Place Order"
                    )}
                  </button>
                ) : (
                  <div className="text-red-600 text-center text-sm bg-red-50 py-3 rounded-xl border border-red-200">
                    Login as user to place orders
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t h-4"
          style={{
            bottom: keyboardOpen
              ? `${window.visualViewport?.offsetTop || 0}px`
              : "0",
          }}
        />

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
