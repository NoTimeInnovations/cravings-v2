"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  describeNextOpen,
  isStoreOpen,
  localNow,
  storeHoursFromSettings,
} from "@/lib/storeHours";
import { useRouter, useSearchParams } from "next/navigation";
import useOrderStore from "@/store/orderStore";
import { useLocationStore } from "@/store/geolocationStore";
import { getFeatures } from "@/lib/getFeatures";
import { parseOrderTypesEnabled, parsePrebookingSettings } from "@/lib/prebooking";
import { canSkipOnboarding, getSessionOrderType, setSessionOrderType } from "@/lib/onboardingSession";
import { setOnboardingDataCookie, getOnboardingDataCookie } from "@/app/auth/actions";
import { saveLastDeliveryLocation, readLastDeliveryLocation } from "@/lib/deliveryLocation";
import StorefrontScreen from "./StorefrontScreen";
import DeliveryAddressScreen from "./DeliveryAddressScreen";
import OrderTypeScreen from "./OrderTypeScreen";
import OutletPickerScreen from "./OutletPickerScreen";
import OrderTypeLocationSheet from "./OrderTypeLocationSheet";
import { useAuthStore } from "@/store/authStore";
import type { SavedAddress } from "../hotelDetail/placeOrder/AddressManagementModal";
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
  /** Server-computed: already chose an order type this session — start dismissed
   * (no SSR flash). */
  initialSkipOnboarding?: boolean;
  /** "sheet" renders the V6 bottom-sheet order-type + address picker instead of
   * the full-screen order-type/address screens. */
  variant?: "screen" | "sheet";
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
  initialSkipOnboarding = false,
  variant = "screen",
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
  // Storefront setting: render the onboarding logo full-screen (vs the small badge).
  const onboardingLogoFullScreen = !!rawStorefront?.onboardingLogoFullScreen;
  // Storefront setting: order-type screen as a 2-column grid where tapping a
  // tile selects that type directly (no "Continue" button). Default = list.
  const orderTypeGridSelect = !!rawStorefront?.orderTypeGridSelect;

  const hasOrdering = features.ordering.enabled && offered.takeaway;
  // Dine-in table reservation: offered + prebooking feature on.
  const slotBookingEnabled = parsePrebookingSettings(hotelData?.prebooking_settings)?.slot_booking_enabled !== false;
  const hasDineIn = offered.dine_in && features.prebooking.enabled && slotBookingEnabled;
  // Partner opt-out: some stores don't want the delivery/takeaway question up
  // front (order type is then chosen at checkout instead). Stored in
  // storefront_settings.showOrderTypeScreen; absent/true = show (back-compat).
  const showOrderTypeScreen = rawStorefront?.showOrderTypeScreen !== false;
  const needsAddress =
    !isBrandParent && hasNewOnboarding && hasDelivery && tableNumber === 0 && showOrderTypeScreen;
  // Show the order-type screen whenever new onboarding is on (at table 0) AND
  // the partner hasn't turned it off, even if only one — or zero — order types
  // currently qualify. The screen adapts: it renders the available type(s), or
  // an "Explore Menu" CTA when none are open. Turning it off decouples it from
  // the outlet picker — a brand parent then goes straight to the outlet list.
  const needsOrderType = hasNewOnboarding && tableNumber === 0 && showOrderTypeScreen;
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
  // Compute the initial dismissed state SYNCHRONOUSLY so the overlay never
  // paints a frame before self-dismissing. This covers both the static skip
  // cases AND the one-shot "skip-storefront-onboarding-once" flag set by the
  // /my-orders (and /order) back button right before router.back() — previously
  // that flag was consumed in a post-mount effect, which made the onboarding
  // flash on screen and then immediately disappear.
  const [dismissed, setDismissed] = useState(() => {
    if (skipOnboarding) return true;
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem("skip-storefront-onboarding-once") === "1") {
          sessionStorage.removeItem("skip-storefront-onboarding-once");
          return true;
        }
      } catch {}
    }
    // Already picked delivery/takeaway (+ address) this session — don't re-show
    // the order-type screen on reload. `initialSkipOnboarding` is decided on the
    // SERVER (from cookies) so this matches the SSR HTML and never flashes; the
    // client check is a fallback for soft navigations. The mount effect below
    // restores the saved order type + address into the store.
    // Sheet mode (V6): the location/order-type popup appears once per browser
    // session (sessionStorage flag). It persists across reloads within the
    // session but resets on tab close / new session — so a fresh visit always
    // re-prompts. Other variants keep the standard skip-after-selection.
    let sheetSessionDone = false;
    if (variant === "sheet" && typeof window !== "undefined") {
      try { sheetSessionDone = sessionStorage.getItem(`mt_v6_onboarded_${partnerId}`) === "1"; } catch {}
    }
    const skipAllowed =
      variant === "sheet"
        ? sheetSessionDone
        : initialSkipOnboarding ||
          canSkipOnboarding({
            partnerId,
            featureFlags,
            orderTypesEnabled: hotelData?.order_types_enabled,
            tableNumber,
            isBrandParent,
          });
    if (!forceStart && !forceShowPicker && skipAllowed) {
      return true;
    }
    return false;
  });
  const [closing, setClosing] = useState(false);

  // If we mounted already dismissed, tell the parent on mount so it reveals the
  // menu (the parent peeks the same flag, so this is usually a no-op).
  useEffect(() => {
    if (dismissed) onDismiss?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissWithAnimation = useCallback(() => {
    // V6 sheet: remember (per browser-tab session) that the customer confirmed
    // their location/order type, so reloads within the session don't re-prompt.
    if (variant === "sheet" && typeof window !== "undefined") {
      try { sessionStorage.setItem(`mt_v6_onboarded_${partnerId}`, "1"); } catch {}
    }
    setClosing(true);
    setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 300);
  }, [onDismiss, variant, partnerId]);

  const { setOrderType, setUserAddress, setUserCoordinates, userAddress } = useOrderStore();
  const { userData: onbAuthUser } = useAuthStore();
  const onbSavedAddresses = (((onbAuthUser as any)?.addresses || []) as SavedAddress[]);
  const partnerCoords =
    Array.isArray((hotelData?.geo_location as any)?.coordinates)
      ? {
          lat: (hotelData!.geo_location as any).coordinates[1],
          lng: (hotelData!.geo_location as any).coordinates[0],
        }
      : null;

  // On mount, restore saved address/coords from cookie and any previously chosen
  // order type from sessionStorage (per-tab only).
  useEffect(() => {
    // The device's last-used location wins over the cookie, and is applied
    // SYNCHRONOUSLY. The cookie read is a server-action round trip, so restoring
    // from it alone made a freshly-picked address visibly flip back to the older
    // one a moment after load — the "it keeps changing my location" report. Any
    // picker that changes the location now writes both, so in the steady state
    // they agree; this ordering only decides who wins while they disagree.
    const local = readLastDeliveryLocation(partnerId);
    if (local) {
      if (local.address) setUserAddress(local.address);
      if (local.coords) {
        setUserCoordinates(local.coords);
        useLocationStore.getState().setCoords(local.coords);
      }
    }

    getOnboardingDataCookie(partnerId).then((saved) => {
      if (!saved) return;
      // Do NOT overwrite what the device already restored — that is precisely
      // the clobber this whole change exists to stop. The cookie is the fallback
      // for a device with no local record (new browser, cleared storage, or a
      // link opened in an in-app browser with its own storage).
      if (local) return;
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
    const storedType = getSessionOrderType(partnerId);
    if (storedType) {
      setOrderType(storedType);
    }
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
    // Mirror to the device as well: the restore prefers the local record, so
    // onboarding must keep it current or a later reload would resurrect an
    // older locally-saved address over the one just entered here.
    saveLastDeliveryLocation(partnerId, addr, coords);
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
    // Mirror to the device as well: the restore prefers the local record, so
    // onboarding must keep it current or a later reload would resurrect an
    // older locally-saved address over the one just entered here.
    saveLastDeliveryLocation(partnerId, addr, coords);
    await setOnboardingDataCookie(partnerId, { address: addr, coords });
  }, [setUserAddress, setUserCoordinates, partnerId]);

  const handleOrderTypeSelect = useCallback(async (type: "delivery" | "takeaway" | "dine_in") => {
    setOrderType(type);
    // Persist to a server-readable session cookie so a reload skips this screen
    // without an SSR flash. dine_in isn't a stored "session order type".
    if (type === "delivery" || type === "takeaway") {
      setSessionOrderType(partnerId, type);
    }

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
    const chosenType = getSessionOrderType(partnerId);
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
    // Also record the "arrived via the brand picker" fact per-tab, keyed by the
    // destination outlet. The ?fromBrand=1 URL param can be cleaned by later
    // navigations, which would make the outlet's back arrow fall back to its own
    // onboarding (order-type screen). This marker keeps the back arrow reliably
    // pointing at the brand's outlet picker regardless of URL churn.
    try {
      sessionStorage.setItem(`mt_from_brand_${outlet.id}`, "1");
    } catch {}
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
    setSessionOrderType(partnerId, preselectedOrderType);
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
  // straight to that outlet. One-shot for the same reason. Bypassed when the
  // user explicitly clicked "Change outlet" (forceShowPicker), otherwise they'd
  // get bounced right back to the only outlet.
  //
  // IMPORTANT: only fire once we're actually ON the outletPicker step. With new
  // onboarding the initial step is "orderType", so firing on mount would
  // auto-select the lone outlet and bypass the order-type screen entirely (the
  // exact "le_grand_cafe skips delivery/takeaway" bug). The order-type screen
  // advances to "outletPicker" after the user picks a type, and only then does
  // this auto-select the single outlet. When new onboarding is off, the initial
  // step is already "outletPicker", so this still fires immediately as before.
  const autoSkipApplied = useRef(false);
  useEffect(() => {
    if (step !== "outletPicker") return;
    if (!needsOutletPicker || !branchContext) return;
    if (forceShowPicker) return;
    if (branchContext.outlets.length !== 1) return;
    if (autoSkipApplied.current) return;
    autoSkipApplied.current = true;
    handleOutletSelect(branchContext.outlets[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, needsOutletPicker, branchContext, forceShowPicker]);

  const handleSkip = useCallback(() => {
    dismissWithAnimation();
  }, [dismissWithAnimation]);

  const handleChangeLocation = useCallback(() => {
    try { localStorage.removeItem("onboarding_address"); } catch {}
    setStep("address");
  }, []);

  // MUST stay above the early returns below. These three hooks used to sit at
  // the bottom of the component, after `if (dismissed) return null` and after
  // the V6 sheet return. Dismissing the order-type screen flips `dismissed`,
  // the component then returns 21 hooks where it had rendered 24, and React
  // throws "Rendered fewer hooks than during the previous render" straight to
  // the root error boundary — the "Something went wrong" a customer saw on
  // their FIRST visit to a store, because the very action that crashed also
  // wrote the session cookie that stops the overlay appearing again.
  // Is the shop shut right now — manually, or by its working hours? Computed
  // here because this component already holds the partner row, the timezone and
  // storefront_settings, and it decides whether the order-type question is worth
  // asking at all. Re-checked on a timer so a customer sitting on this screen at
  // 8:59 watches it come alive rather than being told to come back tomorrow.
  const [storeClockTick, setStoreClockTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStoreClockTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const storeSchedule = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => isStoreOpen(storeHoursFromSettings(storefrontSettings), hotelTimezone || "Asia/Kolkata"),
    [storefrontSettings, hotelTimezone, storeClockTick],
  );
  const manuallyClosed = (hotelData as any)?.is_shop_open === false;
  const storeClosed = manuallyClosed || !storeSchedule.open;
  // Only the SCHEDULE knows when the doors open again; a manual close has no
  // reopening time and must not be given an invented one.
  const storeClosedNote = manuallyClosed
    ? null
    : describeNextOpen(storeSchedule, localNow(hotelTimezone || "Asia/Kolkata").date);

  if (dismissed) return null;

  // V6 bottom-sheet onboarding: a single popup with order-type tabs + the
  // address picker (delivery) / outlet info (takeaway·dine-in). Only for the
  // simple order-type/address case — brand parents + storefront splash keep the
  // full-screen flow.
  if (
    variant === "sheet" &&
    !isBrandParent &&
    !closing &&
    (step === "orderType" || step === "address") &&
    (hasDelivery || hasOrdering || hasDineIn)
  ) {
    return (
      <OrderTypeLocationSheet
        storeName={brandDisplayName}
        outletAddress={
          hotelData?.location_details ||
          (hotelData as any)?.location ||
          hotelData?.district ||
          hotelData?.country ||
          ""
        }
        accent={accent}
        availableTypes={{ delivery: hasDelivery, takeaway: hasOrdering, dine_in: hasDineIn }}
        initialType={hasDelivery ? "delivery" : hasOrdering ? "takeaway" : "dine_in"}
        currentAddress={userAddress || ""}
        savedAddresses={onbSavedAddresses}
        partnerCoords={partnerCoords}
        partnerId={partnerId}
        hotelData={hotelData}
        onOrderTypeChange={(t) => {
          setOrderType(t);
          if (t !== "dine_in") setSessionOrderType(partnerId, t);
        }}
        onDeliveryAddress={(addr, coords) => {
          setOrderType("delivery");
          setSessionOrderType(partnerId, "delivery");
          void handleAddressContinue(addr, coords);
        }}
        onConfirm={(t) => { void handleOrderTypeSelect(t); }}
        /* No onClose: on load the customer must pick a delivery address or an
           order type before reaching the menu (no backdrop dismiss). */
      />
    );
  }


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
            locationText={hotelData?.location_details || (hotelData as any)?.location || hotelData?.district || hotelData?.country || ""}
            tagline={brandDisplayTagline}
            socialLinks={socialLinks}
            mapHref={getPartnerMapsUrl(hotelData)}
            logoFullScreen={onboardingLogoFullScreen}
            gridSelect={orderTypeGridSelect}
            storeClosed={storeClosed}
            storeClosedNote={storeClosedNote}
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
            orderType={getSessionOrderType(partnerId)}
            onAddressSave={handleOutletAddressSave}
            hotelData={hotelData}
          />
        )}
      </div>
    </div>
  );
}
