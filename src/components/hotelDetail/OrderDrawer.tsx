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
import { useAuthStore } from "@/store/authStore"; // <-- Added
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const bottomNavFilter = ["PETRAZ", "HENZU"];

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
    const distanceInKm = Math.ceil(exactDistance);
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
}: {
  styles: Styles;
  hotelData: HotelData;
  tableNumber?: number;
  qrId?: string;
  qrGroup?: QrGroup | null;
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
  const [isMoveUp, setMoveUp] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isBottomNavHidden = bottomNavFilter.some((filter) =>
    pathname.includes(filter)
  );

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
    if (isBottomNavHidden && (items?.length || 0) > 0) {
      setMoveUp(true);
    }
  }, [items, setOpenDrawerBottom]);

  const calculateGrandTotal = () => {
    const baseTotal =
      items?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
    let grandTotal = baseTotal;

    if (hotelData?.gst_percentage) {
      grandTotal += getGstAmount(baseTotal, hotelData.gst_percentage);
    }

    if (qrGroup?.extra_charge) {
      grandTotal += getExtraCharge(
        items || [],
        qrGroup.extra_charge,
        qrGroup.charge_type || "FLAT_FEE"
      );
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
    const gstAmount = hotelData?.gst_percentage
      ? getGstAmount(baseTotal, hotelData.gst_percentage)
      : 0;
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
    const grandTotal = baseTotal + gstAmount + qrCharge + deliveryCharge;

    const hasMultiWhatsapp = getFeatures(hotelData?.feature_flags || "")
      ?.multiwhatsapp?.enabled;
    const hasMultipleWhatsappNumbers = hotelData?.whatsapp_numbers?.length > 1;
    const shouldShowHotelLocation =
      (hasMultiWhatsapp || hasMultipleWhatsappNumbers) &&
      currentSelectedArea &&
      currentSelectedArea.trim() !== "";

    const whatsappMsg = `
    *🍽️ Order Details 🍽️*
    
    *Order ID:* ${finalOrderId ? finalOrderId.slice(0, 8) : 'N/A'}
    ${
      (tableNumber ?? 0) > 0
        ? `*Table:* ${qrData?.table_name || tableNumber}`
        : `*Order Type:* ${orderType || "Delivery"}`
    }
    ${
      shouldShowHotelLocation
        ? `\n*Hotel Location:* ${currentSelectedArea.toUpperCase()}`
        : ""
    }
    ${
      orderType === "delivery"
        ? `\n*Delivery Address:* ${savedAddress}${locationLink}`
        : ""
    }
    *Time:* ${new Date().toLocaleTimeString()}
    
    *📋 Order Items:*
    ${items
      ?.map(
        (item, index) =>
          `${index + 1}. ${item.name} (${item.category.name})
       ➤ Qty: ${item.quantity} × ${hotelData.currency}${item.price.toFixed(
            2
          )} = ${hotelData.currency}${(item.price * item.quantity).toFixed(2)}`
      )
      .join("\n\n")}
    
    *Subtotal:* ${hotelData.currency}${baseTotal.toFixed(2)}
    
    ${
      hotelData?.gst_percentage
        ? `*GST (${hotelData.gst_percentage}%):* ${
            hotelData.currency
          }${gstAmount.toFixed(2)}`
        : ""
    }
    
    ${
      !isQrScan &&
      orderType === "delivery" &&
      deliveryInfo?.cost &&
      !deliveryInfo?.isOutOfRange
        ? `*Delivery Charge:* ${hotelData.currency}${deliveryInfo.cost.toFixed(
            2
          )}`
        : ""
    }
    
    ${
      qrGroup?.extra_charge
        ? `*${qrGroup.name}:* ${hotelData.currency}${qrCharge.toFixed(2)}`
        : ""
    }
    
    *Total Price:* ${hotelData.currency}${grandTotal.toFixed(2)}
    ${orderNote ? `\n*📝 Note:* ${orderNote}` : ""}
    `;

    const number =
      selectedWhatsAppNumber ||
      hotelData?.whatsapp_numbers[0]?.number ||
      hotelData?.phone ||
      "8590115462";

    return `https://api.whatsapp.com/send?phone=${
      hotelData?.country_code || "+91"
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
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await signInWithPhone(phoneNumber, hotelData.id);
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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        if ((items?.length ?? 0) > 0 && isBottomNavHidden) {
          setMoveUp(true);
        } else {
          setMoveUp(false);
        }
      } else if (currentScrollY < lastScrollY) {
        setMoveUp(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* Render PlaceOrderModal (controlled by store) */}
      <PlaceOrderModal
        qrGroup={qrGroup || null}
        qrId={qrId || null}
        getWhatsappLink={getWhatsappLink}
        hotelData={hotelData}
        tableNumber={tableNumber || 0}
      />

      {/* Bottom Drawer */}
      <div
        style={{ ...styles.border }}
        className={`fixed ${
          isMoveUp
            ? isBottomNavHidden
              ? "bottom-24 sm:bottom-0"
              : "bottom-16 sm:bottom-0"
            : "bottom-0"
        } z-[200] left-1/2 -translate-x-1/2 transition-all duration-300 ${
          !open_drawer_bottom
            ? "translate-y-[200%]"
            : isBottomNavHidden
            ? "translate-y-full"
            : "translate-y-0"
        } lg:max-w-[50%] bg-white text-black w-full px-[8%] py-6 rounded-t-[35px] bottom-bar-shadow flex items-center justify-between`}
      >
        <div>
          <div className="flex gap-2 items-center font-black text-xl">
            <div>PRICE :</div>
            <div style={{ color: styles.accent }}>
              {hotelData.currency}
              {items?.reduce((acc, item) => {
                return acc + item.price * item.quantity;
              }, 0) || 0}
            </div>
          </div>
          <div className="flex gap-2 items-center text-sm text-black/70">
            <div>Items :</div>
            <div>{items?.length}</div>
            {!isQrScan &&
              orderType === "delivery" &&
              deliveryInfo &&
              items?.length &&
              !deliveryInfo.isOutOfRange && (
                <div className="ml-2">(Delivery)</div>
              )}
          </div>
        </div>

        <div
          onClick={handlePlaceOrder}
          style={{ color: styles.accent }}
          className="font-black relative cursor-pointer"
        >
          View Order
        </div>
      </div>

      {/* Full-Screen Login Modal (only shown when user is not logged in) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[70] bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <button
              onClick={() => {
                setShowLoginModal(false);
                // setOpenOrderDrawer(true);
                // setOpenDrawerBottom(false);
              }}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold">Login to Continue</h2>
            <div className="w-10" />
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div>
              <h3 className="text-xl font-bold">Welcome Back</h3>
              <p className="text-gray-600 mt-1">
                Please enter your phone number to review your order.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your 10-digit phone number"
                value={phoneNumber}
                onChange={(e) =>
                  setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                autoFocus
              />
            </div>

            <Button
              className="w-full bg-black text-white"
              disabled={isSubmitting}
              onClick={handleLoginAndProceed}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging In...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            <div className="text-sm text-gray-500 mt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderDrawer;