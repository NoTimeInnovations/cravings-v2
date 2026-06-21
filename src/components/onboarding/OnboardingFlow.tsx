"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useOrderStore from "@/store/orderStore";
import { useLocationStore } from "@/store/geolocationStore";
import { getFeatures } from "@/lib/getFeatures";
import { parseOrderTypesEnabled, parsePrebookingSettings } from "@/lib/prebooking";
import { setOnboardingDataCookie, getOnboardingDataCookie } from "@/app/auth/actions";
import StorefrontScreen from "./StorefrontScreen";
import DeliveryAddressScreen from "./DeliveryAddressScreen";
import OrderTypeScreen from "./OrderTypeScreen";
import OutletPickerScreen from "./OutletPickerScreen";
import { brandColorToHex } from "@/lib/brandColor";
import { getPartnerMapsUrl } from "@/lib/getPartnerMapsUrl";
import type { BranchContext, BranchOutlet } from "@/api/branches";

type OnboardingStep = "splash" | "address" | "orderType" | "outletPicker";

interface OnboardingFlowProps {
  featureFlags: string;
  storeName: string;
  storeBanner?: string;
  partnerId: string;
  tableNumber: number;
  hotelData?: any;
  themeBg?: string;
  onboardingCompleted?: boolean;
  deliveryTimeAllowed?: { from: string; to: string } | null;
  takeawayTimeAllowed?: { from: string; to: string } | null;
  isDeliveryActive?: boolean;
  storeTagline?: string;
  notices?: any[];
  socialLinks?: any;
  storefrontSettings?: string | null;
  /** Theme-level brandColor token. Takes precedence over storefront.brandColor. */
  themeBrandColor?: string | null;
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
  /** When set, this partner is a brand parent and visiting users must pick an outlet. */
  branchContext?: BranchContext | null;
  /**
   * When set (read from ?orderType= on outlet pages), skip the OrderType step
   * and pre-set the chosen type. Used after redirect from a brand parent.
   */
  preselectedOrderType?: "delivery" | "takeaway" | null;
}

export default function OnboardingFlow({
  featureFlags,
  storeName,
  storeBanner,
  partnerId,
  tableNumber,
  hotelData,
  themeBg,
  onboardingCompleted = false,
  deliveryTimeAllowed,
  takeawayTimeAllowed,
  isDeliveryActive = true,
  storeTagline,
  notices = [],
  socialLinks,
  storefrontSettings,
  themeBrandColor,
  skipStorefront,
  initialDeliveryOpen,
  initialTakeawayOpen,
  hotelTimezone,
  onDismiss,
  forceStart,
  branchContext,
  preselectedOrderType,
}: OnboardingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?pickOutlet=1 is set by the "Change outlet" link in the delivery sheet,
  // forcing the picker on a brand-parent page (skipping orderType and the
  // single-outlet auto-skip). Read directly from window.location because the
  // parent's in-place reopen uses history.replaceState, which doesn't update
  // Next.js's router state (useSearchParams would still see the stale value).
  // useState initializer captures the URL fresh at every mount; OnboardingFlow
  // is remounted via key change on reopen, so this re-evaluates each time.
  const [forceShowPicker] = useState(() => {
    if (typeof window === "undefined") {
      return searchParams?.get("pickOutlet") === "1";
    }
    return (
      new URLSearchParams(window.location.search).get("pickOutlet") === "1"
    );
  });
  const isBrandParent = !!(branchContext && branchContext.outlets.length > 0);
  const brandDisplayName = branchContext?.name || storeName;
  const brandDisplayTagline = branchContext?.tagline || storeTagline;
  // ?back=true is set by /order/[id] (and other pages) when navigating back to
  // the storefront. In that case, skip the entire storefront/onboarding flow.
  // forceStart overrides this so the V3 menu back button can re-open the flow.
  const isBackNav = !forceStart && searchParams?.get("back") === "true";
  const features = getFeatures(featureFlags);
  const offered = parseOrderTypesEnabled(hotelData?.order_types_enabled);
  const hasDelivery = features.delivery.enabled && offered.delivery;
  const hasStorefront = features.storefront.enabled;
  const hasNewOnboarding = features.newonboarding.enabled;

  let parsedStorefront: any = null;
  if (hasStorefront && storefrontSettings) {
    try {
      const data = typeof storefrontSettings === "string" ? JSON.parse(storefrontSettings) : storefrontSettings;
      if (data?.enabled) parsedStorefront = data;
    } catch {}
  }
  // For the storefront *splash*, we also need to peek at the raw config even
  // when its `enabled` flag is unset — but for the *accent color* we always
  // honour the new theme.brandColor first so it applies even with the
  // storefront unpublished or the feature disabled.
  let rawStorefront: any = null;
  if (storefrontSettings) {
    try {
      rawStorefront = typeof storefrontSettings === "string" ? JSON.parse(storefrontSettings) : storefrontSettings;
    } catch {}
  }
  const hasStorefrontSplash = !!parsedStorefront;
  const showStorefrontSplashInitially = hasStorefrontSplash && !skipStorefront;
  const accent = brandColorToHex(themeBrandColor || rawStorefront?.brandColor);

  const hasOrdering = features.ordering.enabled && offered.takeaway;
  // Dine-in table reservation: offered + prebooking feature on.
  const slotBookingEnabled = parsePrebookingSettings(hotelData?.prebooking_settings)?.slot_booking_enabled !== false;
  const hasDineIn = offered.dine_in && features.prebooking.enabled && slotBookingEnabled;
  const needsAddress =
    !isBrandParent && hasNewOnboarding && hasDelivery && tableNumber === 0;
  const needsOrderType =
    hasNewOnboarding && (hasDelivery || hasOrdering || hasDineIn) && tableNumber === 0;
  const needsOutletPicker = isBrandParent && tableNumber === 0;

  const getInitialStep = (): OnboardingStep => {
    // Explicit "Change outlet" click — skip splash + orderType, jump to picker.
    if (forceShowPicker && needsOutletPicker) return "outletPicker";
    if (showStorefrontSplashInitially) return "splash";
    if (needsOrderType) return "orderType";
    if (needsOutletPicker) return "outletPicker";
    return "splash";
  };

  const initialStep = getInitialStep();
  const skipOnboarding =
    isBackNav ||
    (!showStorefrontSplashInitially && !needsOrderType && !needsOutletPicker);

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

  // Used by the outlet picker (brand-parent + delivery) to persist the typed
  // address so the chosen outlet sees the same data the standalone
  // DeliveryAddressScreen would have produced.
  const handleOutletAddressSave = useCallback(async (addr: string, coords: { lat: number; lng: number } | null) => {
    setUserAddress(addr);
    if (coords) {
      setUserCoordinates(coords);
      useLocationStore.getState().setCoords(coords);
    }
    try {
      localStorage.setItem("onboarding_address", JSON.stringify({ address: addr, coords }));
    } catch {}
    await setOnboardingDataCookie(partnerId, { address: addr, coords });
  }, [setUserAddress, setUserCoordinates, partnerId]);

  const handleOrderTypeSelect = useCallback(async (type: "delivery" | "takeaway" | "dine_in") => {
    setOrderType(type);
    try {
      sessionStorage.setItem(`order_type_${partnerId}`, type);
    } catch {}

    if (needsOutletPicker) {
      setStep("outletPicker");
      return;
    }

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
  }, [setOrderType, partnerId, dismissWithAnimation, needsAddress, needsOutletPicker, setUserAddress, setUserCoordinates]);

  const handleOutletSelect = useCallback((outlet: BranchOutlet) => {
    const chosenType =
      (typeof window !== "undefined" &&
        (sessionStorage.getItem(`order_type_${partnerId}`) as
          | "delivery"
          | "takeaway"
          | null)) ||
      null;
    // If the user picks the partner whose page they're already on (only
    // possible on a brand-parent that's also one of the outlets), skip
    // navigation. Next.js same-path router.push doesn't remount client state,
    // so this OnboardingFlow's dismissed flag would stay false and the menu
    // would stay hidden behind a transparent overlay. Just dismiss locally.
    if (outlet.id === partnerId) {
      if (chosenType) setOrderType(chosenType);
      // Strip ?pickOutlet=1 so a reload doesn't re-trigger the picker.
      if (typeof window !== "undefined" && window.location.search) {
        try {
          const sp = new URLSearchParams(window.location.search);
          if (sp.has("pickOutlet")) {
            sp.delete("pickOutlet");
            const next = sp.toString();
            window.history.replaceState(
              null,
              "",
              window.location.pathname + (next ? `?${next}` : ""),
            );
          }
        } catch {}
      }
      dismissWithAnimation();
      return;
    }
    const qs = new URLSearchParams();
    if (chosenType) qs.set("orderType", chosenType);
    qs.set("fromBrand", "1");
    // back=true tells the outlet's OnboardingFlow to skip the
    // splash/onboarding entirely — the user has already gone through it on
    // the brand parent, so re-showing it would feel like a regression.
    qs.set("back", "true");
    setClosing(true);
    setTimeout(() => {
      router.push(`/${outlet.username}?${qs.toString()}`);
    }, 200);
  }, [partnerId, router, setOrderType, dismissWithAnimation]);

  // When redirected from a brand parent with ?orderType=, pre-set the order
  // type and route the user past the orderType step. Runs only once per mount;
  // re-running would loop because setOrderType cascades to a parent re-render
  // (inline onDismiss → new dismissWithAnimation ref → effect re-fires).
  // Skip entirely if forceShowPicker is set — the user explicitly clicked
  // "Change outlet" and wants to stay on the picker, not be auto-dismissed by
  // a stale orderType prop carried over from the previous server render.
  // Likewise skip when forceStart is set: that means the user re-opened the flow
  // from the menu's back button. The URL still carries the old ?orderType=, and
  // auto-applying it would re-pick the order type and instantly dismiss back to
  // the menu (because the address is already saved) — the exact jank we want to
  // avoid. Let them land on the delivery/takeaway screen and choose fresh; the
  // normal handleOrderTypeSelect then routes correctly (saved address → skip the
  // address step / go straight to outlets).
  const preselectApplied = useRef(false);
  useEffect(() => {
    if (!preselectedOrderType) return;
    if (forceShowPicker) return;
    if (forceStart) return;
    if (preselectApplied.current) return;
    preselectApplied.current = true;
    setOrderType(preselectedOrderType);
    try {
      sessionStorage.setItem(`order_type_${partnerId}`, preselectedOrderType);
    } catch {}
    if (preselectedOrderType === "delivery" && needsAddress) {
      (async () => {
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
      })();
    } else {
      dismissWithAnimation();
    }
    // Intentionally not depending on dismissWithAnimation / store setters —
    // see the ref guard above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedOrderType, partnerId, needsAddress]);

  // Auto-skip the picker when only one active outlet exists — redirect
  // straight to that outlet on mount. One-shot for the same reason.
  // Bypassed when the user explicitly clicked "Change outlet" (forceShowPicker),
  // otherwise they'd get bounced right back to the only outlet.
  const autoSkipApplied = useRef(false);
  useEffect(() => {
    if (!needsOutletPicker || !branchContext) return;
    if (forceShowPicker) return;
    if (branchContext.outlets.length !== 1) return;
    if (autoSkipApplied.current) return;
    autoSkipApplied.current = true;
    handleOutletSelect(branchContext.outlets[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsOutletPicker, branchContext, forceShowPicker]);

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
              storeName={brandDisplayName}
              storeBanner={storeBanner}
              onContinue={() => {
                if (needsOrderType) setStep("orderType");
                else if (needsOutletPicker) setStep("outletPicker");
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
            hotelData={hotelData}
          />
        )}

        {step === "orderType" && (
          <OrderTypeScreen
            storeBanner={storeBanner}
            storeName={brandDisplayName}
            themeBg={themeBg}
            hasDelivery={hasDelivery}
            hasOrdering={hasOrdering}
            hasDineIn={hasDineIn}
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
            locationText={hotelData?.location_details || hotelData?.district || hotelData?.country || ""}
            socialLinks={socialLinks}
            mapHref={getPartnerMapsUrl(hotelData)}
          />
        )}

        {step === "outletPicker" && branchContext && (
          <OutletPickerScreen
            brand={{ ...branchContext, tagline: brandDisplayTagline ?? branchContext.tagline }}
            onSelect={handleOutletSelect}
            onBack={
              needsOrderType
                ? () => setStep("orderType")
                : hasStorefrontSplash
                  ? () => setStep("splash")
                  : undefined
            }
            accent={accent}
            orderType={
              typeof window !== "undefined"
                ? (sessionStorage.getItem(`order_type_${partnerId}`) as
                    | "delivery"
                    | "takeaway"
                    | null)
                : null
            }
            onAddressSave={handleOutletAddressSave}
            hotelData={hotelData}
          />
        )}
      </div>
    </div>
  );
}
