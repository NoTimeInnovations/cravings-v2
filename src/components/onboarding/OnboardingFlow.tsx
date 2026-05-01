"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { useLocationStore } from "@/store/geolocationStore";
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
  skipStorefront?: boolean;
  initialDeliveryOpen?: boolean;
  initialTakeawayOpen?: boolean;
  hotelTimezone?: string;
  onDismiss?: () => void;
  /**
   * When true, ignore the ?back=true URL flag and always render the flow.
   * Set by the V3 menu back button so re-opening the storefront works even if
   * the URL hasn't yet been cleaned up by the router.
   */
  forceStart?: boolean;
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
  skipStorefront,
  initialDeliveryOpen,
  initialTakeawayOpen,
  hotelTimezone,
  onDismiss,
  forceStart,
}: OnboardingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?back=true is set by /order/[id] (and other pages) when navigating back to
  // the storefront. In that case, skip the entire storefront/onboarding flow.
  // forceStart overrides this so the V3 menu back button can re-open the flow.
  const isBackNav = !forceStart && searchParams?.get("back") === "true";
  const features = getFeatures(featureFlags);
  const hasWhatsappOtp = features.whatsappnotifications.enabled;
  const hasDelivery = features.delivery.enabled;
  const hasStorefront = features.storefront.enabled;
  const hasNewOnboarding = features.newonboarding.enabled;

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
  const hasStorefrontSplash = !!parsedStorefront;
  const showStorefrontSplashInitially = hasStorefrontSplash && !skipStorefront;
  const bc = parsedStorefront?.brandColor || "burnt-orange";
  const accent = bc.startsWith("custom:") ? bc.replace("custom:", "") : (BRAND_COLOR_MAP[bc] || "#e85d04");

  const hasOrdering = features.ordering.enabled;
  const needsAddress = hasNewOnboarding && hasDelivery && tableNumber === 0;
  const needsOrderType = hasNewOnboarding && (hasDelivery || hasOrdering) && tableNumber === 0;
  const needsLogin = hasNewOnboarding && !isLoggedIn;

  const getInitialStep = (): OnboardingStep => {
    if (showStorefrontSplashInitially) return "splash";
    if (needsLogin) return "login";
    if (needsOrderType) return "orderType";
    return "splash";
  };

  const initialStep = getInitialStep();
  const skipOnboarding =
    isBackNav || (!showStorefrontSplashInitially && !needsLogin && !needsOrderType);

  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [dismissed, setDismissed] = useState(skipOnboarding);
  const [closing, setClosing] = useState(false);

  const { userData } = useAuthStore();

  useEffect(() => {
    if (skipOnboarding) onDismiss?.();
  }, []);

  // When the user lands here via a back-navigation from /my-orders or
  // /order/[id], skip the entire onboarding flow once. The originating page
  // sets the sessionStorage flag right before calling router.back().
  useEffect(() => {
    try {
      if (sessionStorage.getItem("skip-storefront-onboarding-once") === "1") {
        sessionStorage.removeItem("skip-storefront-onboarding-once");
        setDismissed(true);
        onDismiss?.();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const clientLoggedIn = userData?.role === "user";
    if (hasNewOnboarding && !isLoggedIn && !clientLoggedIn && step === "orderType") {
      setStep(showStorefrontSplashInitially ? "splash" : "login");
    }
  }, [userData, isLoggedIn, hasNewOnboarding]);

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
        // calculateDeliveryDistanceAndCost reads coords from useLocationStore,
        // so mirror them there too.
        useLocationStore.getState().setCoords(saved.coords);
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
      useLocationStore.getState().setCoords(coords);
    }
    try {
      localStorage.setItem("onboarding_address", JSON.stringify({ address: addr, coords }));
    } catch {}
    await setOnboardingDataCookie(partnerId, { address: addr, coords });
    dismissWithAnimation();
  }, [setUserAddress, setUserCoordinates, partnerId, dismissWithAnimation]);

  const handleOrderTypeSelect = useCallback(async (type: "delivery" | "takeaway") => {
    setOrderType(type);
    try {
      sessionStorage.setItem(`order_type_${partnerId}`, type);
    } catch {}

    if (type === "delivery" && needsAddress) {
      // If a delivery address from a prior session is already saved, skip
      // the address step — the user shouldn't be re-prompted on every reload.
      try {
        const saved = await getOnboardingDataCookie(partnerId);
        if (saved?.address && saved?.coords) {
          setUserAddress(saved.address);
          setUserCoordinates(saved.coords);
          useLocationStore.getState().setCoords(saved.coords);
          dismissWithAnimation();
          return;
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
      className={`fixed inset-0 overflow-y-auto scrollbar-hidden transition-all duration-300 ${closing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      style={{ zIndex: 9999 } as React.CSSProperties}
    >
      <div
        key={step}
        className={`${hasStorefrontSplash && step === "splash" ? "" : "absolute inset-0 overflow-y-auto scrollbar-hidden"} animate-slide-in-right`}
      >
        {step === "splash" && hasStorefrontSplash && (
            <StorefrontScreen
              storefront={parsedStorefront}
              storeName={storeName}
              storeBanner={storeBanner}
              onContinue={() => {
                if (needsLogin) setStep("login");
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
            onBack={hasStorefrontSplash ? () => setStep("splash") : undefined}
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
            onBack={() => setStep("orderType")}
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
            onBack={hasStorefrontSplash ? () => setStep("splash") : isLoggedIn ? handleSkip : () => setStep("login")}
            onChangeLocation={handleChangeLocation}
            deliveryTimeAllowed={deliveryTimeAllowed}
            takeawayTimeAllowed={takeawayTimeAllowed}
            isDeliveryActive={isDeliveryActive}
            initialDeliveryOpen={initialDeliveryOpen}
            initialTakeawayOpen={initialTakeawayOpen}
            hotelTimezone={hotelTimezone}
            accent={accent}
          />
        )}
      </div>
    </div>
  );
}
