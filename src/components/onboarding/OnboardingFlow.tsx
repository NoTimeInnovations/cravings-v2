"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useOrderStore from "@/store/orderStore";
import { useLocationStore } from "@/store/geolocationStore";
import { getFeatures } from "@/lib/getFeatures";
import { setOnboardingDataCookie, getOnboardingDataCookie } from "@/app/auth/actions";
import StorefrontScreen from "./StorefrontScreen";
import DeliveryAddressScreen from "./DeliveryAddressScreen";
import OrderTypeScreen from "./OrderTypeScreen";

type OnboardingStep = "splash" | "address" | "orderType";

interface OnboardingFlowProps {
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
  const searchParams = useSearchParams();
  // ?back=true is set by /order/[id] (and other pages) when navigating back to
  // the storefront. In that case, skip the entire storefront/onboarding flow.
  // forceStart overrides this so the V3 menu back button can re-open the flow.
  const isBackNav = !forceStart && searchParams?.get("back") === "true";
  const features = getFeatures(featureFlags);
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

  const getInitialStep = (): OnboardingStep => {
    if (showStorefrontSplashInitially) return "splash";
    if (needsOrderType) return "orderType";
    return "splash";
  };

  const initialStep = getInitialStep();
  const skipOnboarding =
    isBackNav || (!showStorefrontSplashInitially && !needsOrderType);

  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [dismissed, setDismissed] = useState(skipOnboarding);
  const [closing, setClosing] = useState(false);

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

  const dismissWithAnimation = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  const { setOrderType, setUserAddress, setUserCoordinates } = useOrderStore();

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
                if (needsOrderType) setStep("orderType");
                else dismissWithAnimation();
              }}
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
            onBack={hasStorefrontSplash ? () => setStep("splash") : handleSkip}
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
