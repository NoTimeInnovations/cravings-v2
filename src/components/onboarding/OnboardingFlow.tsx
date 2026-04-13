"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { useWhatsAppOtp } from "@/hooks/useWhatsAppOtp";
import { getFeatures, FeatureFlags } from "@/lib/getFeatures";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
import { UserCountryInfo } from "@/lib/getUserCountry";
import LoginScreen from "./LoginScreen";
import OTPScreen from "./OTPScreen";
import DeliveryAddressScreen from "./DeliveryAddressScreen";
import OrderTypeScreen from "./OrderTypeScreen";

type OnboardingStep = "login" | "otp" | "address" | "orderType";

interface OnboardingFlowProps {
  isLoggedIn: boolean;
  theme: ThemeConfig | null;
  featureFlags: string;
  storeName: string;
  storeBanner?: string;
  partnerId: string;
  tableNumber: number;
  onComplete: () => void;
}

const ONBOARDING_KEY = "onboarding_completed";

export function getOnboardingCompleted(partnerId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const data = localStorage.getItem(ONBOARDING_KEY);
    if (!data) return false;
    const parsed = JSON.parse(data);
    return parsed[partnerId] === true;
  } catch {
    return false;
  }
}

function setOnboardingCompleted(partnerId: string) {
  try {
    const data = localStorage.getItem(ONBOARDING_KEY);
    const parsed = data ? JSON.parse(data) : {};
    parsed[partnerId] = true;
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(parsed));
  } catch {}
}

export default function OnboardingFlow({
  isLoggedIn,
  theme,
  featureFlags,
  storeName,
  storeBanner,
  partnerId,
  tableNumber,
  onComplete,
}: OnboardingFlowProps) {
  const features = getFeatures(featureFlags);
  const hasWhatsappOtp = features.whatsappnotifications.enabled;
  const hasDelivery = features.delivery.enabled;
  const hasOrdering = features.ordering.enabled;
  const needsAddress = hasDelivery && tableNumber === 0;
  const needsOrderType = (hasDelivery || hasOrdering) && tableNumber === 0;

  // Determine initial step
  const getInitialStep = (): OnboardingStep => {
    if (!isLoggedIn) return "login";
    if (needsAddress) return "address";
    if (needsOrderType) return "orderType";
    return "orderType"; // fallback, will auto-complete
  };

  const [step, setStep] = useState<OnboardingStep>(getInitialStep);
  const [phone, setPhone] = useState("");
  const [countryInfo, setCountryInfo] = useState<UserCountryInfo | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { signInWithPhone } = useAuthStore();
  const { setOrderType, setUserAddress, setUserCoordinates } = useOrderStore();
  const { sendOtp, verifyOtp, reset: resetOtp, isSending, isVerifying, error: otpError } = useWhatsAppOtp(partnerId);

  const bgColor = theme?.colors?.bg || "#ffffff";
  const accentColor = theme?.colors?.accent || "#EA580C";

  const handleLoginContinue = useCallback(async (phoneNum: string, ci: UserCountryInfo) => {
    setPhone(phoneNum);
    setCountryInfo(ci);

    if (hasWhatsappOtp) {
      setLoginLoading(true);
      try {
        await sendOtp(ci.callingCode.replace("+", "") + phoneNum);
        setStep("otp");
      } catch {
        // error handled by hook
      } finally {
        setLoginLoading(false);
      }
    } else {
      // Direct login without OTP
      setLoginLoading(true);
      try {
        await signInWithPhone(phoneNum, partnerId, ci);
        if (needsAddress) {
          setStep("address");
        } else if (needsOrderType) {
          setStep("orderType");
        } else {
          finishOnboarding();
        }
      } catch {
        // error handled
      } finally {
        setLoginLoading(false);
      }
    }
  }, [hasWhatsappOtp, sendOtp, signInWithPhone, partnerId, needsAddress, needsOrderType]);

  const handleOtpVerify = useCallback(async (otp: string) => {
    try {
      await verifyOtp(otp);
      // OTP verified, now sign in
      await signInWithPhone(phone, partnerId, countryInfo!);
      if (needsAddress) {
        setStep("address");
      } else if (needsOrderType) {
        setStep("orderType");
      } else {
        finishOnboarding();
      }
    } catch {
      // error handled by hook
    }
  }, [verifyOtp, signInWithPhone, phone, partnerId, countryInfo, needsAddress, needsOrderType]);

  const handleAddressContinue = useCallback((addr: string, coords: { lat: number; lng: number } | null) => {
    setAddress(addr);
    setAddressCoords(coords);
    setUserAddress(addr);
    if (coords) {
      setUserCoordinates(coords);
    }
    // Save to localStorage for checkout
    try {
      localStorage.setItem("onboarding_address", JSON.stringify({ address: addr, coords }));
    } catch {}

    if (needsOrderType) {
      setStep("orderType");
    } else {
      finishOnboarding();
    }
  }, [setUserAddress, setUserCoordinates, needsOrderType]);

  const handleOrderTypeSelect = useCallback((type: "delivery" | "takeaway") => {
    setOrderType(type);
    try {
      localStorage.setItem("onboarding_order_type", type);
    } catch {}
    finishOnboarding();
  }, [setOrderType]);

  const finishOnboarding = useCallback(() => {
    setOnboardingCompleted(partnerId);
    onComplete();
  }, [partnerId, onComplete]);

  const handleSkip = useCallback(() => {
    finishOnboarding();
  }, [finishOnboarding]);

  const handleChangeNumber = useCallback(() => {
    resetOtp();
    setStep("login");
  }, [resetOtp]);

  const handleResendOtp = useCallback(async () => {
    if (countryInfo) {
      try {
        await sendOtp(countryInfo.callingCode.replace("+", "") + phone);
      } catch {}
    }
  }, [sendOtp, countryInfo, phone]);

  const handleChangeLocation = useCallback(() => {
    setStep("address");
  }, []);

  const slideVariants = {
    enter: { x: "100%", opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <AnimatePresence mode="wait">
        {step === "login" && (
          <motion.div
            key="login"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <LoginScreen
              storeName={storeName}
              storeBanner={storeBanner}
              bgColor={bgColor}
              accentColor={accentColor}
              onContinue={handleLoginContinue}
              loading={loginLoading || isSending}
            />
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div
            key="otp"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <OTPScreen
              phone={phone}
              callingCode={countryInfo?.callingCode || "+91"}
              storeBanner={storeBanner}
              storeName={storeName}
              accentColor={accentColor}
              onVerify={handleOtpVerify}
              onResend={handleResendOtp}
              onChangeNumber={handleChangeNumber}
              loading={isVerifying}
              error={otpError}
            />
          </motion.div>
        )}

        {step === "address" && (
          <motion.div
            key="address"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <DeliveryAddressScreen
              storeBanner={storeBanner}
              storeName={storeName}
              accentColor={accentColor}
              onContinue={handleAddressContinue}
            />
          </motion.div>
        )}

        {step === "orderType" && (
          <motion.div
            key="orderType"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <OrderTypeScreen
              storeBanner={storeBanner}
              storeName={storeName}
              accentColor={accentColor}
              hasDelivery={hasDelivery}
              hasOrdering={hasOrdering}
              onSelect={handleOrderTypeSelect}
              onSkip={handleSkip}
              onChangeLocation={handleChangeLocation}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
