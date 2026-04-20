"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { useWhatsAppOtp } from "@/hooks/useWhatsAppOtp";
import { getFeatures } from "@/lib/getFeatures";
import { UserCountryInfo } from "@/lib/getUserCountry";
import { setOrderSessionCookie, setOnboardingDataCookie, getOnboardingDataCookie } from "@/app/auth/actions";
import StorefrontScreen from "./StorefrontScreen";
import LoginScreen from "./LoginScreen";
import OTPScreen from "./OTPScreen";
import DeliveryAddressScreen from "./DeliveryAddressScreen";
import OrderTypeScreen from "./OrderTypeScreen";

type OnboardingStep = "splash" | "login" | "otp" | "address" | "orderType";

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
  notices?: any[];
  socialLinks?: any;
  storefrontSettings?: string | null;
  onDismiss?: () => void;
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
  notices = [],
  socialLinks,
  storefrontSettings,
  onDismiss,
}: OnboardingFlowProps) {
  const router = useRouter();
  const features = getFeatures(featureFlags);
  const hasWhatsappOtp = features.whatsappnotifications.enabled;
  const hasDelivery = features.delivery.enabled;
  const hasStorefront = features.storefront.enabled;

  const BRAND_COLOR_MAP: Record<string, string> = {
    "burnt-orange": "#e85d04", "obsidian-gold": "#b8860b", "royal-burgundy": "#8b1a4a",
    "midnight-emerald": "#0d6b4e", "sapphire": "#1e4db7", "charcoal-noir": "#2c2c2c",
    "deep-violet": "#6b21a8", "rose-blush": "#be185d", "teal-luxe": "#0f766e", "warm-copper": "#b45309",
  };

  let parsedStorefront: any = null;
  if (hasStorefront && storefrontSettings) {
    try {
      const data = typeof storefrontSettings === "string" ? JSON.parse(storefrontSettings) : storefrontSettings;
      if (data?.enabled) parsedStorefront = data;
    } catch {}
  }
  const bc = parsedStorefront?.brandColor || "burnt-orange";
  const accent = bc.startsWith("custom:") ? bc.replace("custom:", "") : (BRAND_COLOR_MAP[bc] || "#e85d04");

  const hasOrdering = features.ordering.enabled;
  const needsAddress = hasDelivery && tableNumber === 0;
  const needsOrderType = (hasDelivery || hasOrdering) && tableNumber === 0;

  const getInitialStep = (): OnboardingStep => {
    if (parsedStorefront) return "splash";
    if (!isLoggedIn) return "login";
    if (needsOrderType) return "orderType";
    return "splash";
  };

  const initialStep = getInitialStep();
  const skipOnboarding = !parsedStorefront && isLoggedIn && !needsOrderType;

  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [dismissed, setDismissed] = useState(skipOnboarding);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (skipOnboarding) onDismiss?.();
  }, []);

  const dismissWithAnimation = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 300);
  }, [onDismiss]);
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
        if (needsOrderType) {
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
  }, [hasWhatsappOtp, sendOtp, signInWithPhone, partnerId, needsOrderType, finishOnboarding, markLoginAddressDone]);

  const handleOtpVerify = useCallback(async (otp: string) => {
    try {
      await verifyOtp(otp);
      await signInWithPhone(phone, partnerId, countryInfo!);
      if (needsOrderType) {
        await markLoginAddressDone();
        setStep("orderType");
      } else {
        await finishOnboarding();
      }
    } catch {
      // error handled by hook
    }
  }, [verifyOtp, signInWithPhone, phone, partnerId, countryInfo, needsOrderType, finishOnboarding, markLoginAddressDone]);

  const handleAddressContinue = useCallback(async (addr: string, coords: { lat: number; lng: number } | null) => {
    setUserAddress(addr);
    if (coords) {
      setUserCoordinates(coords);
    }
    try {
      localStorage.setItem("onboarding_address", JSON.stringify({ address: addr, coords }));
    } catch {}
    await setOnboardingDataCookie(partnerId, { address: addr, coords });
    dismissWithAnimation();
  }, [setUserAddress, setUserCoordinates, partnerId, dismissWithAnimation]);

  const handleOrderTypeSelect = useCallback((type: "delivery" | "takeaway") => {
    setOrderType(type);
    try {
      sessionStorage.setItem(`order_type_${partnerId}`, type);
    } catch {}

    if (type === "delivery" && needsAddress) {
      try {
        const saved = localStorage.getItem("onboarding_address");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.address) {
            setUserAddress(parsed.address);
            if (parsed.coords) setUserCoordinates(parsed.coords);
            dismissWithAnimation();
            return;
          }
        }
      } catch {}
      setStep("address");
      return;
    }

    dismissWithAnimation();
  }, [setOrderType, partnerId, dismissWithAnimation, needsAddress, setUserAddress, setUserCoordinates]);

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
    try { localStorage.removeItem("onboarding_address"); } catch {}
    setStep("address");
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`fixed inset-0 overflow-y-auto transition-all duration-300 ${closing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      style={{ zIndex: 9999, scrollbarWidth: "none" } as React.CSSProperties}
    >
      <div
        key={step}
        className={`${parsedStorefront && step === "splash" ? "" : "absolute inset-0 overflow-y-auto"} animate-slide-in-right`}
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {step === "splash" && parsedStorefront && (
            <StorefrontScreen
              storefront={parsedStorefront}
              storeName={storeName}
              storeBanner={storeBanner}
              onContinue={() => {
                if (!isLoggedIn) setStep("login");
                else if (needsOrderType) setStep("orderType");
                else dismissWithAnimation();
              }}
            />
        )}

        {step === "login" && (
          <LoginScreen
            storeName={storeName}
            storeBanner={storeBanner}
            themeBg={themeBg}
            storeTagline={storeTagline}
            onContinue={handleLoginContinue}
            onBack={() => setStep("splash")}
            loading={loginLoading || isSending}
            accent={accent}
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
            accent={accent}
          />
        )}

        {step === "address" && (
          <DeliveryAddressScreen
            storeBanner={storeBanner}
            storeName={storeName}
            themeBg={themeBg}
            onContinue={handleAddressContinue}
            accent={accent}
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
            accent={accent}
          />
        )}
      </div>
    </div>
  );
}
