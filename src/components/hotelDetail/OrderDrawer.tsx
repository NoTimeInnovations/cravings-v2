"use client";
import { HotelData } from "@/app/hotels/[...id]/page";
import { Styles } from "@/screens/HotelMenuPage_v2";
import React, { useEffect, useState } from "react";
import useOrderStore from "@/store/orderStore";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { FeatureFlags, getFeatures } from "@/lib/getFeatures";
import { QrGroup } from "@/app/admin/qr-management/page";
import PlaceOrderModal from "./placeOrder/PlaceOrderModal";
import { getExtraCharge } from "@/lib/getExtraCharge";
import path from "path/win32";
import { useQrDataStore } from "@/store/qrDataStore";
import { useAuthStore, User } from "@/store/authStore"; // <-- Added
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { validatePhoneNumber, getPhoneValidationError } from "@/lib/getUserCountry";
import { getPhoneDigitsForCountry } from "@/lib/countryPhoneMap";



export const getGstAmount = (price: number, gstPercentage: number) => {
  return (price * gstPercentage) / 100;
};

export const calculateDeliveryDistanceAndCost = async (
  hotelData: HotelData
) => {
  const { setDeliveryInfo } = useOrderStore.getState();

  try {
    const userCoordsStr = localStorage?.getItem("user-location-store");
    if (!userCoordsStr) return;

    const userLocationData = JSON.parse(userCoordsStr);
    if (
      !userLocationData.state?.coords ||
      typeof userLocationData.state.coords.lng !== "number" ||
      typeof userLocationData.state.coords.lat !== "number"
    ) {
      return;
    }

    const restaurantCoords = hotelData?.geo_location?.coordinates;
    if (!restaurantCoords) return;

    const userLocation = [
      userLocationData.state.coords.lng,
      userLocationData.state.coords.lat,
    ];

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) return;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.join(
      ","
    )};${restaurantCoords.join(",")}?access_token=${mapboxToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) return;

    const exactDistance = data.routes[0].distance / 1000;
    // Ceil the distance for whole kilometer charging
    // const distanceInKm = Math.ceil(exactDistance);
    const distanceInKm = exactDistance
    const deliveryRate = hotelData?.delivery_rate || 0;

    const {
      delivery_radius,
      delivery_ranges,
      first_km_range,
      delivery_mode,
      is_fixed_rate,
      minimum_order_amount,
    } = hotelData?.delivery_rules || {};

    if (delivery_radius && distanceInKm > delivery_radius) {
      setDeliveryInfo({
        distance: distanceInKm, // Already ceiled
        cost: 0,
        ratePerKm: deliveryRate,
        isOutOfRange: true,
        minimumOrderAmount: minimum_order_amount || 0,
      });
      return;
    }

    let calculatedCost = 0;

    if (is_fixed_rate) {
      calculatedCost = deliveryRate;
    } else if (delivery_mode === "advanced" && delivery_ranges && delivery_ranges.length > 0) {
      // Advanced mode: Range-based pricing
      const applicableRange = delivery_ranges.find(
        (range) => distanceInKm >= range.from_km && distanceInKm <= range.to_km
      );

      if (applicableRange) {
        calculatedCost = applicableRange.rate;
      } else {
        // If no range matches, find the highest range and apply its rate
        const sortedRanges = [...delivery_ranges].sort((a, b) => b.to_km - a.to_km);
        if (sortedRanges.length > 0 && distanceInKm > sortedRanges[0].to_km) {
          // Beyond all ranges, use the default delivery rate per km
          calculatedCost = distanceInKm * deliveryRate;
        } else {
          // Below all ranges, use free delivery
          calculatedCost = 0;
        }
      }
    } else if ((delivery_mode === "basic" || !delivery_mode) && first_km_range && first_km_range.km > 0) {
      // Basic mode or legacy format: First KM + per km pricing
      if (distanceInKm <= first_km_range.km) {
        calculatedCost = first_km_range.rate;
      } else {
        const remainingDistance = distanceInKm - first_km_range.km;
        calculatedCost = first_km_range.rate + remainingDistance * deliveryRate;
      }
    } else {
      // Fallback: Simple per km pricing
      calculatedCost = distanceInKm * deliveryRate;
    }

    calculatedCost = Math.max(0, calculatedCost);

    setDeliveryInfo({
      distance: distanceInKm, // Already ceiled
      cost: calculatedCost,
      ratePerKm: deliveryRate,
      isOutOfRange: false,
      minimumOrderAmount: minimum_order_amount || 0,
    });
  } catch (error) {
    console.error("Error calculating delivery distance:", error);
  }
};

const OrderDrawer = ({
  styles,
  hotelData,
  tableNumber,
  qrId,
  qrGroup,
  hasBottomNav = false, // Added prop
}: {
  styles: Styles;
  hotelData: HotelData;
  tableNumber?: number;
  qrId?: string;
  qrGroup?: QrGroup | null;
  hasBottomNav?: boolean; // Added type
}) => {
  const {
    userAddress,
    items,
    orderId,
    open_drawer_bottom,
    setOpenDrawerBottom,
    open_order_drawer,
    setOpenPlaceOrderModal,
    setOpenOrderDrawer,
    deliveryInfo,
    setDeliveryInfo,
    orderNote,
    orderType,
  } = useOrderStore();
  const { qrData } = useQrDataStore();
  const { userData: user, signInWithPhone } = useAuthStore(); // Get user and login function

  const pathname = usePathname();
  const [isQrScan, setIsQrScan] = useState(false);
  const [features, setFeatures] = useState<FeatureFlags | null>(null);


  // Client timezone (used for formatting times in messages)
  const tz = typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsQrScan(pathname.includes("qrScan") && !!qrId && !(tableNumber === 0));
  }, [pathname, qrId, tableNumber]);

  useEffect(() => {
    if (hotelData) {
      setFeatures(getFeatures(hotelData?.feature_flags as string));
      setDeliveryInfo({
        distance: deliveryInfo?.distance || 0,
        cost: deliveryInfo?.cost || 0,
        ratePerKm: deliveryInfo?.ratePerKm || 0,
        isOutOfRange: deliveryInfo?.isOutOfRange || false,
        minimumOrderAmount:
          hotelData?.delivery_rules?.minimum_order_amount || 0,
      });
    }
  }, [hotelData]);

  useEffect(() => {
    setOpenPlaceOrderModal(false);
  }, [setOpenPlaceOrderModal]);

  useEffect(() => {
    setOpenDrawerBottom((items?.length || 0) > 0 ? true : false);

  }, [items, setOpenDrawerBottom]);

  const calculateGrandTotal = () => {
    const baseTotal =
      items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;

    let grandTotal = baseTotal;

    if (qrGroup?.extra_charge) {
      grandTotal += getExtraCharge(
        items || [],
        qrGroup.extra_charge,
        qrGroup.charge_type || "FLAT_FEE"
      );
    }

    if (tableNumber === 0 && hotelData?.delivery_rules?.parcel_charge) {
      const chargeType = hotelData.delivery_rules.parcel_charge_type || "fixed";
      const itemCount = items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
      grandTotal += chargeType === "variable"
        ? itemCount * hotelData.delivery_rules.parcel_charge
        : hotelData.delivery_rules.parcel_charge;
    }

    if (hotelData?.gst_percentage) {
      grandTotal += getGstAmount(baseTotal, hotelData.gst_percentage);
    }

    return grandTotal.toFixed(2);
  };

  const getWhatsappLink = (orderId?: string) => {
    // First try to get order ID from function parameter, then from localStorage, then from order store
    const finalOrderId = orderId || localStorage?.getItem('last-order-id') || useOrderStore.getState().orderId;
    const savedAddress = userAddress || "N/A";
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
      JSON.stringify({ state: { coords: useOrderStore.getState().coordinates } });

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
    const grandTotal = baseTotal + qrCharge + deliveryCharge + parcelCharge + gstAmount;

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

    const whatsappMsg = `
    ${hotelData?.id === '7eb04e2d-9c20-42ba-a6b6-fce8019cad5f' ? '*Order Details*' : '*🍽️ Order Details 🍽️*'}
    
    *Order ID:* ${formattedOrderId}
    ${(tableNumber ?? 0) > 0
        ? `${showTableLabel ? "*Table:* " : ""}${qrData?.table_name || tableNumber}`
        : `*Order Type:* ${orderType || "Delivery"}`
      }
    ${shouldShowHotelLocation
        ? `\n*Hotel Location:* ${currentSelectedArea.toUpperCase()}`
        : ""
      }
    ${orderType === "delivery"
        ? `\n*Delivery Address:* ${savedAddress}${locationLink}`
        : ""
      }
    ${(user as User)?.phone ? `\n*Customer Phone:* ${(user as User).phone} \n` : ""
      }
* Time:* ${nowTime}
    
    *📋 Order Items:*
    ${items
        ?.map(
          (item, index) =>
            `${index + 1}. ${item.name} (${item.category.name})
       ➤ Qty: ${item.quantity} × ${hotelData.currency}${item.price.toFixed(
              2
            )} = ${hotelData.currency}${(item.price * item.quantity).toFixed(2)}`
        )
        .join("\n\n")
      }
    
    * Subtotal:* ${hotelData.currency}${baseTotal.toFixed(2)}
    
    ${hotelData?.gst_percentage
        ? `*${hotelData?.country === "United Arab Emirates" ? "VAT" : "GST"} (${hotelData.gst_percentage}%):* ${hotelData.currency
        }${gstAmount.toFixed(2)}`
        : ""
      }
    
    ${!isQrScan &&
        orderType === "delivery" &&
        deliveryInfo?.cost &&
        !deliveryInfo?.isOutOfRange
        ? `*Delivery Charge:* ${hotelData.currency}${deliveryInfo.cost.toFixed(
          2
        )}`
        : ""
      }
    
    ${qrGroup?.extra_charge
        ? `*${qrGroup.name}:* ${hotelData.currency}${qrCharge.toFixed(2)}`
        : ""
      }

    ${parcelCharge > 0
        ? `*Parcel Charge:* ${hotelData.currency}${parcelCharge.toFixed(2)}`
        : ""
      }

    * Total Price:* ${hotelData.currency}${grandTotal.toFixed(2)}
    ${orderNote ? `\n*📝 Note:* ${orderNote}` : ""}
  `;

    const number =
      selectedWhatsAppNumber ||
      hotelData?.whatsapp_numbers[0]?.number ||
      hotelData?.phone ||
      "8590115462";

    return `https://api.whatsapp.com/send?phone=${hotelData?.country_code || "+91"
      }${number}&text=${encodeURIComponent(whatsappMsg)}`;
  };

  // Modified: Intercept "View Order" click
  const handlePlaceOrder = async () => {
    if (!user) {
      // Show full-screen login modal
      setShowLoginModal(true);
      setOpenDrawerBottom(false);
    } else {
      // User is logged in → proceed
      setOpenPlaceOrderModal(true);
      setOpenOrderDrawer(false);
      setOpenDrawerBottom(false);
    }
  };

  // Handle login and proceed
  const handleLoginAndProceed = async () => {
    // Get country code from hotelData
    const countryCode = hotelData?.country_code?.replace(/[\+\s]/g, '') || '91'; // Default to India if not available
    const phoneDigits = getPhoneDigitsForCountry(countryCode);

    if (!phoneNumber || !validatePhoneNumber(phoneNumber, countryCode)) {
      toast.error(getPhoneValidationError(countryCode));
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await signInWithPhone(phoneNumber, hotelData.id, {
        country: hotelData?.country || 'India',
        countryCode,
        callingCode: hotelData?.country_code || '+91',
        phoneDigits
      });
      if (success) {
        toast.success("Logged in successfully!");
        setShowLoginModal(false);
        setPhoneNumber("");

        // Now open the PlaceOrderModal
        setOpenPlaceOrderModal(true);
        setOpenOrderDrawer(false);
        setOpenDrawerBottom(false);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <>
      {/* Render PlaceOrderModal (controlled by store) */}
      <PlaceOrderModal
        qrGroup={qrGroup || null}
        qrId={qrId || null}
        getWhatsappLink={getWhatsappLink}
        hotelData={hotelData}
        tableNumber={tableNumber || 0}
        tableName={qrData?.table_name || undefined}
      />

      {/* Bottom Drawer */}
      <div
        onClick={handlePlaceOrder}
        style={{
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          backgroundColor: styles.accent || "#ea580c",
          color: "#ffffff",
        }}
        className={`fixed left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md px-6 py-4 rounded-2xl flex items-center justify-between transition-all duration-300 cursor-pointer ${open_drawer_bottom ? "translate-y-0" : "translate-y-[200%]"
          } ${hasBottomNav ? "bottom-20" : "bottom-6"}`}
      >
        <div className="font-semibold text-lg">
          {items?.length || 0} item{(items?.length || 0) !== 1 ? "s" : ""} added
        </div>

        <div className="font-bold text-lg flex items-center gap-2">
          View Order
        </div>
      </div>

      {/* Full-Screen Login Modal - Mobile First */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[70] bg-white flex flex-col">
          {/* Header Bar */}
          <div className="border-b border-stone-200 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between px-4 pt-4">
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-2 -ml-2 rounded-full hover:bg-stone-100 transition-all duration-200"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-gray-900">Login to Continue</h2>
              <div className="w-9" />
            </div>
            <p className="text-stone-500 text-xs text-center pb-3 px-4">
              Please enter your phone number to review your order
            </p>
          </div>

          {/* Content Container */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-md mx-auto px-6 py-8 space-y-8">
              {/* Phone Input */}
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-900 block">
                  Phone Number
                  {hotelData?.country && (
                    <span className="text-stone-500 font-normal ml-2 text-xs">
                      ({hotelData.country})
                    </span>
                  )}
                </Label>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center px-4 sm:px-5 bg-orange-100/30 rounded-2xl text-base font-bold text-orange-600 border border-orange-600/20">
                    {hotelData?.country_code || '+91'}
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChange={(e) => {
                      const countryCode = hotelData?.country_code?.replace(/[\+\s]/g, '') || '91';
                      const maxDigits = getPhoneDigitsForCountry(countryCode);
                      setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, maxDigits));
                    }}
                    autoFocus
                    className="flex-1 rounded-2xl text-gray-900 placeholder:text-gray-400 bg-white border-stone-200 focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20 h-14 text-base px-4 sm:px-5 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={handleLoginAndProceed}
                  disabled={isSubmitting || !phoneNumber}
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
                  onClick={() => setShowLoginModal(false)}
                  className="w-full px-6 py-3.5 rounded-full border border-stone-300 bg-transparent text-stone-800 hover:bg-stone-100 hover:text-stone-900 hover:border-stone-500 transition-all duration-200 font-medium text-base"
                >
                  Cancel
                </button>
              </div>

              {/* Privacy Note */}
              <p className="text-xs text-stone-500 text-center leading-relaxed pt-2">
                By continuing, you agree to our{" "}
                <span className="text-orange-600 hover:underline cursor-pointer">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-orange-600 hover:underline cursor-pointer">
                  Privacy Policy
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderDrawer;