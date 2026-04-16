"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { useWhatsAppOtp } from "@/hooks/useWhatsAppOtp";
import { getFeatures } from "@/lib/getFeatures";
import { UserCountryInfo } from "@/lib/getUserCountry";
import { setOrderSessionCookie, setOnboardingDataCookie, getOnboardingDataCookie } from "@/app/auth/actions";
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
  onboardingCompleted?: boolean;
  deliveryTimeAllowed?: { from: string; to: string } | null;
  takeawayTimeAllowed?: { from: string; to: string } | null;
  isDeliveryActive?: boolean;
  storeTagline?: string;
}

export default function OnboardingFlow({
  isLoggedIn,
  featureFlags,
  storeName,
  storeBanner,
  partnerId,
  tableNumber,
  themeBg,
  onboardingCompleted = false,
  deliveryTimeAllowed,
  takeawayTimeAllowed,
  isDeliveryActive = true,
  storeTagline,
}: OnboardingFlowProps) {
  const router = useRouter();
  const features = getFeatures(featureFlags);
  const hasWhatsappOtp = features.whatsappnotifications.enabled;
  const hasDelivery = features.delivery.enabled;
  const hasOrdering = features.ordering.enabled;
  const needsAddress = hasDelivery && tableNumber === 0;
  const needsOrderType = (hasDelivery || hasOrdering) && tableNumber === 0;

  const getInitialStep = (): OnboardingStep => {
    if (!isLoggedIn) return "login";
    if (needsAddress && !onboardingCompleted) return "address";
    if (needsOrderType) return "orderType";
    return "orderType";
  };

  const [step, setStep] = useState<OnboardingStep>(getInitialStep);
  const [dismissed, setDismissed] = useState(false);
  const [closing, setClosing] = useState(false);

  const dismissWithAnimation = useCallback(() => {
    setClosing(true);
    setTimeout(() => setDismissed(true), 400);
  }, []);
  const [phone, setPhone] = useState("");
  const [countryInfo, setCountryInfo] = useState<UserCountryInfo | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const { signInWithPhone } = useAuthStore();
  const { setOrderType, setUserAddress, setUserCoordinates } = useOrderStore();
  const { sendOtp, verifyOtp, reset: resetOtp, isSending, isVerifying, error: otpError } = useWhatsAppOtp(partnerId);

  // On mount, restore saved address/coords from cookie and any previously chosen
  // order type from sessionStorage (per-tab only).
  useEffect(() => {
    getOnboardingDataCookie(partnerId).then((saved) => {
      if (!saved) return;
      if (saved.address) {
        setUserAddress(saved.address);
      }
      if (saved.coords) {
        setUserCoordinates(saved.coords);
      }
    }).catch(() => {});
    try {
      const storedType = sessionStorage.getItem(`order_type_${partnerId}`);
      if (storedType === "delivery" || storedType === "takeaway") {
        setOrderType(storedType);
      }
    } catch {}
  }, [partnerId]);

  const finishOnboarding = useCallback(async (orderType: string = "none") => {
    await setOrderSessionCookie(partnerId, orderType);
    router.refresh();
  }, [partnerId, router]);

  const markLoginAddressDone = useCallback(async () => {
    // Persist login/address completion so reload skips straight to order type.
    await setOrderSessionCookie(partnerId, "none");
  }, [partnerId]);

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
          await markLoginAddressDone();
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
  }, [hasWhatsappOtp, sendOtp, signInWithPhone, partnerId, needsAddress, needsOrderType, finishOnboarding, markLoginAddressDone]);

  const handleOtpVerify = useCallback(async (otp: string) => {
    try {
      await verifyOtp(otp);
      await signInWithPhone(phone, partnerId, countryInfo!);
      if (needsAddress) {
        setStep("address");
      } else if (needsOrderType) {
        await markLoginAddressDone();
        setStep("orderType");
      } else {
        await finishOnboarding();
      }
    } catch {
      // error handled by hook
    }
  }, [verifyOtp, signInWithPhone, phone, partnerId, countryInfo, needsAddress, needsOrderType, finishOnboarding, markLoginAddressDone]);

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
      await markLoginAddressDone();
      setStep("orderType");
    } else {
      await finishOnboarding();
    }
  }, [setUserAddress, setUserCoordinates, needsOrderType, partnerId, finishOnboarding, markLoginAddressDone]);

  const handleOrderTypeSelect = useCallback((type: "delivery" | "takeaway") => {
    setOrderType(type);
    try {
      sessionStorage.setItem(`order_type_${partnerId}`, type);
    } catch {}
    dismissWithAnimation();
  }, [setOrderType, partnerId, dismissWithAnimation]);

  const handleSkip = useCallback(() => {
    dismissWithAnimation();
  }, [dismissWithAnimation]);

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

  if (dismissed) return null;

  return (
    <div
      className={`fixed inset-0 overflow-hidden transition-all duration-400 ${closing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      style={{ zIndex: 9999 }}
    >
      <div
        key={step}
        className="absolute inset-0 animate-slide-in-right"
      >
        {step === "login" && (
          <LoginScreen
            storeName={storeName}
            storeBanner={storeBanner}
            themeBg={themeBg}
            storeTagline={storeTagline}
            onContinue={handleLoginContinue}
            loading={loginLoading || isSending}
          />
        )}

        {step === "otp" && (
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
        )}

        {step === "address" && (
          <DeliveryAddressScreen
            storeBanner={storeBanner}
            storeName={storeName}
            themeBg={themeBg}
            onContinue={handleAddressContinue}
          />
        )}

        {step === "orderType" && (
          <OrderTypeScreen
            storeBanner={storeBanner}
            storeName={storeName}
            themeBg={themeBg}
            hasDelivery={hasDelivery}
            hasOrdering={hasOrdering}
            onSelect={handleOrderTypeSelect}
            onSkip={handleSkip}
            onChangeLocation={handleChangeLocation}
            deliveryTimeAllowed={deliveryTimeAllowed}
            takeawayTimeAllowed={takeawayTimeAllowed}
            isDeliveryActive={isDeliveryActive}
          />
        )}
      </div>
    </div>
  );
}
