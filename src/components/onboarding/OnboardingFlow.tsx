"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { useWhatsAppOtp } from "@/hooks/useWhatsAppOtp";
import { getFeatures } from "@/lib/getFeatures";
import { UserCountryInfo } from "@/lib/getUserCountry";
import { setOnboardingCookie, setOnboardingDataCookie, getOnboardingDataCookie } from "@/app/auth/actions";
import LoginScreen from "./LoginScreen";
import OTPScreen from "./OTPScreen";
import DeliveryAddressScreen from "./DeliveryAddressScreen";
import OrderTypeScreen from "./OrderTypeScreen";

type OnboardingStep = "login" | "otp" | "address" | "orderType";

interface OnboardingFlowProps {
  isLoggedIn: boolean;
  featureFlags: string;
  storeName: string;
  storeBanner?: string;
  partnerId: string;
  tableNumber: number;
  themeBg?: string;
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

async function setOnboardingCompleted(partnerId: string) {
  try {
    const data = localStorage.getItem(ONBOARDING_KEY);
    const parsed = data ? JSON.parse(data) : {};
    parsed[partnerId] = true;
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(parsed));
  } catch {}
  // Set cookie so server can read it on next page load
  await setOnboardingCookie(partnerId);
}

export default function OnboardingFlow({
  isLoggedIn,
  featureFlags,
  storeName,
  storeBanner,
  partnerId,
  tableNumber,
  themeBg,
  onComplete,
}: OnboardingFlowProps) {
  const features = getFeatures(featureFlags);
  const hasWhatsappOtp = features.whatsappnotifications.enabled;
  const hasDelivery = features.delivery.enabled;
  const hasOrdering = features.ordering.enabled;
  const needsAddress = hasDelivery && tableNumber === 0;
  const needsOrderType = (hasDelivery || hasOrdering) && tableNumber === 0;

  const getInitialStep = (): OnboardingStep => {
    if (!isLoggedIn) return "login";
    if (needsAddress) return "address";
    if (needsOrderType) return "orderType";
    return "orderType";
  };

  const [step, setStep] = useState<OnboardingStep>(getInitialStep);
  const [phone, setPhone] = useState("");
  const [countryInfo, setCountryInfo] = useState<UserCountryInfo | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const { signInWithPhone } = useAuthStore();
  const { setOrderType, setUserAddress, setUserCoordinates } = useOrderStore();
  const { sendOtp, verifyOtp, reset: resetOtp, isSending, isVerifying, error: otpError } = useWhatsAppOtp(partnerId);

  // On mount, check if we have saved onboarding data and restore it
  useEffect(() => {
    getOnboardingDataCookie(partnerId).then((saved) => {
      if (!saved) return;
      if (saved.address) {
        setUserAddress(saved.address);
      }
      if (saved.coords) {
        setUserCoordinates(saved.coords);
      }
      if (saved.orderType) {
        setOrderType(saved.orderType as "delivery" | "takeaway");
      }
    }).catch(() => {});
  }, [partnerId]);

  const finishOnboarding = useCallback(async () => {
    await setOnboardingCompleted(partnerId);
    onComplete();
  }, [partnerId, onComplete]);

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
      setLoginLoading(true);
      try {
        await signInWithPhone(phoneNum, partnerId, ci);
        if (needsAddress) {
          setStep("address");
        } else if (needsOrderType) {
          setStep("orderType");
        } else {
          await finishOnboarding();
        }
      } catch {
        // error handled
      } finally {
        setLoginLoading(false);
      }
    }
  }, [hasWhatsappOtp, sendOtp, signInWithPhone, partnerId, needsAddress, needsOrderType, finishOnboarding]);

  const handleOtpVerify = useCallback(async (otp: string) => {
    try {
      await verifyOtp(otp);
      await signInWithPhone(phone, partnerId, countryInfo!);
      if (needsAddress) {
        setStep("address");
      } else if (needsOrderType) {
        setStep("orderType");
      } else {
        await finishOnboarding();
      }
    } catch {
      // error handled by hook
    }
  }, [verifyOtp, signInWithPhone, phone, partnerId, countryInfo, needsAddress, needsOrderType, finishOnboarding]);

  const handleAddressContinue = useCallback(async (addr: string, coords: { lat: number; lng: number } | null) => {
    setUserAddress(addr);
    if (coords) {
      setUserCoordinates(coords);
    }
    try {
      localStorage.setItem("onboarding_address", JSON.stringify({ address: addr, coords }));
    } catch {}
    // Save to cookie and wait for it
    await setOnboardingDataCookie(partnerId, { address: addr, coords });

    if (needsOrderType) {
      setStep("orderType");
    } else {
      await finishOnboarding();
    }
  }, [setUserAddress, setUserCoordinates, needsOrderType, partnerId, finishOnboarding]);

  const handleOrderTypeSelect = useCallback(async (type: "delivery" | "takeaway") => {
    setOrderType(type);
    try {
      localStorage.setItem("onboarding_order_type", type);
    } catch {}
    // Save to cookie and wait for it
    await setOnboardingDataCookie(partnerId, { orderType: type });
    await finishOnboarding();
  }, [setOrderType, partnerId, finishOnboarding]);

  const handleSkip = useCallback(async () => {
    await finishOnboarding();
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
              themeBg={themeBg}
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
              themeBg={themeBg}
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
              themeBg={themeBg}
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
              themeBg={themeBg}
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
