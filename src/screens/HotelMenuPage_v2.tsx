"use client";

import { Offer } from "@/store/offerStore_hasura";
import { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
import { brandColorToHex } from "@/lib/brandColor";
import { Category, formatStorageName } from "@/store/categoryStore_hasura";
import OrderDrawer from "@/components/hotelDetail/OrderDrawer";
import useOrderStore from "@/store/orderStore";
// Import useMemo and useCallback
import { useEffect, useMemo, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getFeatures } from "@/lib/getFeatures";
import { isFreePlan } from "@/lib/getPlanLimits";
import { QrGroup } from "@/app/admin/qr-management/page";
import { addToRecent } from "@/lib/addToRecent";
import { getQrScanCookie, setQrScanCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { INCREMENT_QR_CODE_SCAN_COUNT } from "@/api/qrcodes";
import Default from "@/components/hotelDetail/styles/Default/Default";
import Compact from "@/components/hotelDetail/styles/Compact/Compact";
import Sidebar from "@/components/hotelDetail/styles/Sidebar/Sidebar";
import V3 from "@/components/hotelDetail/styles/V3/V3";
import V4 from "@/components/hotelDetail/styles/V4/V4";
import V5 from "@/components/hotelDetail/styles/V5/V5";
import { saveUserLocation } from "@/lib/saveUserLocLocal";
import { applyVisibilityState } from "@/lib/visibility";
import { QrCode, useQrDataStore } from "@/store/qrDataStore";
import DeliveryTimeCampain from "@/components/hotelDetail/DeliveryTimeCampain";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import NoticesOverlay from "@/components/NoticesOverlay";
import ReorderHandler from "@/components/hotelDetail/ReorderHandler";
import type { BranchContext } from "@/api/branches";
import type { BrandLinkInfo } from "@/app/[username]/page";

export type MenuItem = {
  description: string;
  id: string;
  image: string;
  name: string;
  price: number;
};

export type Styles = {
  backgroundColor: string;
  color: string;
  accent: string;
  showGrid?: boolean;
  border: {
    borderColor: string;
    borderWidth: string;
    borderStyle: string;
  };
};

interface HotelMenuPageProps {
  offers: Offer[];
  hoteldata: HotelData;
  auth: {
    id: string;
    role: string;
  } | null;
  theme: ThemeConfig | null;
  tableNumber: number;
  socialLinks: SocialLinks;
  qrGroup?: QrGroup | null;
  qrId?: string | null;
  selectedCategory?: string;
  hideOtherCategories?: boolean;
  qrData?: QrCode | null;
  onboardingCompleted?: boolean;
  skipNotices?: boolean;
  skipStorefront?: boolean;
  initialDeliveryOpen?: boolean;
  initialTakeawayOpen?: boolean;
  hotelTimezone?: string;
  branchContext?: BranchContext | null;
  preselectedOrderType?: "delivery" | "takeaway" | null;
  brandLink?: BrandLinkInfo | null;
}

// The "My Orders" back button sets this one-shot flag right before router.back()
// so the storefront/onboarding splash is skipped on arrival. We PEEK it here
// (OnboardingFlow consumes/removes it) so the menu can paint immediately on the
// first render instead of flashing the onboarding overlay for a frame before it
// self-dismisses. Guarded for SSR (sessionStorage is client-only); the flag is
// only ever set during a client-side back-navigation, so there's no hydration
// mismatch on a fresh server-rendered load.
const peekSkipStorefrontOnce = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem("skip-storefront-onboarding-once") === "1";
  } catch {
    return false;
  }
};

const HotelMenuPage = ({
  offers,
  hoteldata,
  auth,
  theme,
  tableNumber,
  socialLinks,
  qrData,
  qrGroup,
  qrId,
  selectedCategory: selectedCategoryProp,
  onboardingCompleted,
  skipNotices,
  skipStorefront,
  initialDeliveryOpen,
  initialTakeawayOpen,
  hotelTimezone,
  branchContext,
  preselectedOrderType,
  brandLink,
}: HotelMenuPageProps) => {
  // Read URL params on the client. URL is the source of truth so navigating
  // from /name?category=x&hide=others to /name correctly clears the filter,
  // even if Next.js's router cache serves stale server props.
  // hide=others — show ONLY the listed category (locks the filter)
  // hide=this   — hide the listed category names (comma-separated supported)
  const searchParams = useSearchParams();
  const urlCategoryRaw = searchParams?.get("category") ?? searchParams?.get("cat") ?? "";
  const urlHide = searchParams?.get("hide") ?? "";
  const urlCategoryList = useMemo(
    () => urlCategoryRaw.split(",").map((c) => c.trim()).filter(Boolean),
    [urlCategoryRaw]
  );
  const effectiveSelectedCategoryProp = urlCategoryList[0] || selectedCategoryProp || "";
  const effectiveHideOtherCategories = urlHide === "others" && urlCategoryList.length > 0;
  const resolvedSelectedCategory = useMemo(() => {
    if (!effectiveSelectedCategoryProp) return "";
    if (effectiveSelectedCategoryProp === "all" || effectiveSelectedCategoryProp === "Offer") return effectiveSelectedCategoryProp;
    const normalized = formatStorageName(effectiveSelectedCategoryProp);
    const match = hoteldata?.menus?.find(
      (m: any) => formatStorageName(m.category?.name || "") === normalized
    );
    return match?.category?.name || effectiveSelectedCategoryProp;
  }, [effectiveSelectedCategoryProp, hoteldata?.menus]);
  const lockedCategory = effectiveHideOtherCategories ? resolvedSelectedCategory || null : null;
  const hiddenCategoryNames = useMemo(() => {
    if (urlHide !== "this" || urlCategoryList.length === 0) return null;
    const names = new Set<string>();
    for (const raw of urlCategoryList) {
      const normalized = formatStorageName(raw);
      const match = hoteldata?.menus?.find(
        (m: any) => formatStorageName(m.category?.name || "") === normalized
      );
      names.add(match?.category?.name || raw);
    }
    return names;
  }, [urlHide, urlCategoryList, hoteldata?.menus]);
  const pathname = usePathname();
  const router = useRouter();
  const { setHotelId, genOrderId, open_place_order_modal, orderType } = useOrderStore();
  const { setQrData } = useQrDataStore();

  // Onboarding state
  const features = getFeatures(hoteldata?.feature_flags || "");
  // New onboarding always presents the order-type screen at table 0 — even when
  // only one (or no) order type qualifies — so don't gate the onboarding mount
  // on the delivery/ordering feature flags. OnboardingFlow / OrderTypeScreen
  // adapt to whatever's available (down to an "Explore Menu" CTA).
  const needsOnboarding = features.newonboarding.enabled && tableNumber === 0;
  // Storefront splash should also mount the overlay even when newonboarding is off,
  // so a partner can use just the storefront feature without the rest of the flow.
  const hasStorefrontSplash = useMemo(() => {
    if (!features.storefront.enabled || tableNumber !== 0) return false;
    const raw = (hoteldata as any)?.storefront_settings;
    if (!raw) return false;
    try {
      const sf = typeof raw === "string" ? JSON.parse(raw) : raw;
      return !!sf?.enabled;
    } catch { return false; }
  }, [features.storefront.enabled, tableNumber, (hoteldata as any)?.storefront_settings]);
  // Always mount the onboarding overlay when needed; it dismisses itself once the
  // user picks an order type and re-mounts on every reload so the order type screen
  // shows again (value persists only in sessionStorage).
  const showOnboarding = needsOnboarding || hasStorefrontSplash;
  // If the URL signals a fast-dismiss case (?back=true from picker redirect),
  // pre-mark onboarding dismissed so the menu renders on first paint without
  // waiting for the client-side dismiss effect.
  const isBackNavInitial = searchParams?.get("back") === "true";
  // A reorder deep link (?ro=<order> or legacy ?reorder=1, both with ?back=true)
  // goes straight to a pre-filled checkout — never show the onboarding splash
  // (it would cover the checkout modal and block the menu from mounting, since
  // renderPage only mounts once onboarding is dismissed). Latched once, because
  // ReorderHandler strips the params after it runs and onboarding must not
  // re-appear when it does.
  const [isReorderMode] = useState(
    () => searchParams?.get("ro") != null || searchParams?.get("reorder") === "1",
  );
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () =>
      !showOnboarding ||
      isBackNavInitial ||
      isReorderMode ||
      peekSkipStorefrontOnce(),
  );
  const [onboardingKey, setOnboardingKey] = useState(0);
  // When the menu-page back button reopens onboarding, start at the storefront
  // splash even if the URL has search params (which normally sets skipStorefront).
  const [forceStorefront, setForceStorefront] = useState(false);

  const brandAccent = useMemo(() => {
    try {
      const raw = (hoteldata as any)?.storefront_settings;
      let sf: any = null;
      if (raw) {
        sf = typeof raw === "string" ? JSON.parse(raw) : raw;
      }
      // Theme is the new source of truth; storefront brandColor is legacy fallback.
      const themeToken = (theme as any)?.brandColor;
      const sfToken = sf?.brandColor;
      const token = themeToken || sfToken;
      if (!token) return null;
      return brandColorToHex(token);
    } catch {
      return null;
    }
  }, [(hoteldata as any)?.storefront_settings, (theme as any)?.brandColor]);

  const styles: Styles = useMemo(() => ({
    backgroundColor: theme?.colors?.bg || "#F5F5F5",
    color: theme?.colors?.text || "#000",
    // Brand color (theme.brandColor / storefront.brandColor) is the source of
    // truth. Legacy theme.colors.accent is only used if no brand color is set.
    accent: brandAccent || theme?.colors?.accent || "#EA580C",
    showGrid: theme?.showGrid === true,
    border: {
      borderColor: theme?.colors?.text ? `${theme.colors.text}1D` : "#0000001D",
      borderWidth: "1px",
      borderStyle: "solid",
    },
  }), [theme?.colors?.bg, theme?.colors?.text, theme?.colors?.accent, theme?.showGrid, brandAccent]);

  // useEffect(() => {
  //   saveUserLocation(false);
  // }, []);

  // Save theme + last visited store to localStorage and cookie for loading screens
  useEffect(() => {
    try {
      localStorage.setItem(
        "hotelTheme",
        JSON.stringify({
          accent: styles.accent,
          bg: styles.backgroundColor,
          text: styles.color,
          showGrid: theme?.showGrid,
          storeName: hoteldata?.store_name,
          storePath: pathname,
          storeBanner: hoteldata?.store_banner || "",
        })
      );
      // Set cookie for server-side loading screens
      const banner = hoteldata?.store_banner;
      const cookieData = JSON.stringify({
        banner: banner && !banner.endsWith(".mp4") ? banner : undefined,
        bg: styles.backgroundColor || undefined,
        name: hoteldata?.store_name || undefined,
      });
      document.cookie = `store_theme=${encodeURIComponent(cookieData)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } catch {}
  }, [styles.accent, styles.backgroundColor, styles.color, theme?.showGrid, hoteldata?.store_name, pathname, hoteldata?.store_banner]);

  useEffect(() => {
    setQrData(qrData || null);
  }, [qrData, setQrData]);

  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    const handleUpdateQrCount = async () => {
      if (!qrId) return;
      const canUpdateScanCount = !(await getQrScanCookie(qrId));
      if (canUpdateScanCount) {
        try {
          const { trackQrScan } = await import("@/app/actions/trackQrScan");
          const result = await trackQrScan(qrId);

          if (result.success) {
            await setQrScanCookie(qrId);
          }
        } catch (error) {
          console.error("Failed to update QR scan count:", error);
        }
      }
    };

    if (qrId) {
      handleUpdateQrCount();
    }
  }, [qrId]);

  if (limitReached) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 py-8">
        <div className="text-center p-4 sm:p-8 bg-white rounded-3xl shadow-lg w-full max-w-[90%] sm:max-w-md mx-auto">
          <h1 className="text-xl sm:text-3xl font-bold mb-4 text-orange-600">
            Monthly Limit Reached
          </h1>
          <p className="mb-6 text-sm sm:text-base text-gray-600">
            This restaurant has reached its monthly scan limit. Please contact the staff or try again next month.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (hoteldata?.id) {
      setHotelId(hoteldata.id, hoteldata.currency);
      genOrderId();
      addToRecent(hoteldata.id);
    }
  }, [hoteldata?.id, setHotelId, genOrderId]);

  // Filter menus by order type visibility, then resolve visibility state so items
  // from inactive categories with hideItems=false remain (marked unavailable),
  // while truly hidden items are dropped.
  const filteredMenus = useMemo(() => {
    if (!hoteldata?.menus) return [];
    const tz = (hoteldata as any)?.timezone || hotelTimezone || "Asia/Kolkata";
    const hideUnav = (hoteldata as any)?.hide_unavailable;
    return hoteldata.menus
      .filter((item: any) => {
        if (orderType === "delivery" && item.show_on_delivery === false) return false;
        if (orderType === "takeaway" && item.show_on_takeaway === false) return false;
        if (lockedCategory && item.category?.name !== lockedCategory) return false;
        if (hiddenCategoryNames && hiddenCategoryNames.has(item.category?.name)) return false;
        return true;
      })
      .map((item: any) => applyVisibilityState(item, tz, undefined, hideUnav))
      .filter(Boolean) as any[];
  }, [hoteldata?.menus, orderType, lockedCategory, hiddenCategoryNames, hotelTimezone]);

  // ✅ Memoize offeredItems to avoid recalculating on every render
  const offeredItems = useMemo(() => {
    if (!filteredMenus || !offers) return [];
    const activeOfferMenuIds = new Set(offers.map((offer) => offer.menu?.id));
    return filteredMenus.filter((item) => activeOfferMenuIds.has(item.id || ""));
  }, [filteredMenus, offers]);

  // ✅ Memoize categories to prevent recalculating unless the menu changes
  const categories = useMemo(() => {
    if (!filteredMenus.length) return [];
    const uniqueCategoriesMap = new Map<string, Category>();

    filteredMenus.forEach((item) => {
      if (!uniqueCategoriesMap.has(item.category.name)) {
        uniqueCategoriesMap.set(item.category.name, item.category);
      }
    });

    const uniqueCategories = Array.from(uniqueCategoriesMap.values()).sort(
      (a, b) => (a.priority || 0) - (b.priority || 0)
    );

    if (offeredItems.length > 0) {
      const offerCategory: Category = {
        id: "offer-category",
        name: "Offer",
        priority: -999,
        is_active: true,
      };
      return [offerCategory, ...uniqueCategories];
    }
    return uniqueCategories;
  }, [filteredMenus, offeredItems]);

  const [selectedCategory, setSelectedCat] = useState(
    lockedCategory || resolvedSelectedCategory || "all"
  );

  useEffect(() => {
    setSelectedCat(lockedCategory || resolvedSelectedCategory || "all");
  }, [lockedCategory, resolvedSelectedCategory]);

  // ✅ Memoize the filtered and sorted items for the selected category
  const items = useMemo(() => {
    if (!filteredMenus.length) return [];

    let filteredItems = [];

    if (selectedCategory === "all") {
      filteredItems = filteredMenus;
    } else if (selectedCategory === "Offer") {
      filteredItems = offeredItems;
    } else {
      filteredItems =
        filteredMenus.filter(
          (item) => item.category.name === selectedCategory
        ) || [];
    }

    // Sort items with images to appear first
    return [...filteredItems].sort((a, b) => {
      const aHasImage = a.image_url && a.image_url.length > 0;
      const bHasImage = b.image_url && b.image_url.length > 0;
      if (aHasImage && !bHasImage) return -1;
      if (!aHasImage && bHasImage) return 1;
      return 0;
    });
  }, [selectedCategory, filteredMenus, offeredItems]);

  // ✅ Memoize top-selling / bestseller items for the V3 "Must Try" section.
  // Built straight from hoteldata.menus (NOT filteredMenus) with hide_unavailable
  // forced OFF: a bestseller is an intentional highlight, so it must still surface
  // at the top even when the partner hides unavailable items everywhere else — it
  // simply shows the "Unavailable" badge. Truly hidden items (inactive category or
  // scheduled-off with hideItems) are still dropped by applyVisibilityState.
  const topItems = useMemo(() => {
    if (!hoteldata?.menus) return [];
    const tz = (hoteldata as any)?.timezone || hotelTimezone || "Asia/Kolkata";
    return hoteldata.menus
      .filter((item: any) => {
        if (item.is_top !== true) return false;
        if (orderType === "delivery" && item.show_on_delivery === false) return false;
        if (orderType === "takeaway" && item.show_on_takeaway === false) return false;
        if (lockedCategory && item.category?.name !== lockedCategory) return false;
        if (hiddenCategoryNames && hiddenCategoryNames.has(item.category?.name)) return false;
        return true;
      })
      .map((item: any) => applyVisibilityState(item, tz, undefined, false))
      .filter(Boolean) as any[];
  }, [hoteldata?.menus, orderType, lockedCategory, hiddenCategoryNames, hotelTimezone]);

  // ✅ Memoize the function passed as a prop to prevent child re-renders
  const setSelectedCategory = useCallback(
    (category: string) => {
      if (lockedCategory) return;
      setSelectedCat(category);
    },
    [lockedCategory]
  );

  const hotelPlanId = (hoteldata as any)?.subscription_details?.plan?.id;
  const isHotelOnFreePlan = isFreePlan(hotelPlanId);

  // Pass hoteldata with order-type-filtered menus to child components
  // Keep allMenus (unfiltered) for checkout cart validation
  const filteredHotelData = useMemo(() => ({
    ...hoteldata,
    menus: filteredMenus,
    allMenus: hoteldata?.menus || [],
  }), [hoteldata, filteredMenus]);

  const reopenOutletPicker = useCallback(() => {
    if (typeof window !== "undefined") {
      // For brand parents, keep ?pickOutlet=1 so OnboardingFlow forces the
      // picker step and bypasses the single-outlet auto-skip (which would
      // otherwise instantly bounce the user back to the only active outlet).
      const targetSearch = branchContext ? "?pickOutlet=1" : "";
      if (window.location.search !== targetSearch) {
        window.history.replaceState(null, "", pathname + targetSearch);
      }
    }
    setForceStorefront(true);
    setOnboardingDismissed(false);
    setOnboardingKey((k) => k + 1);
  }, [pathname, branchContext]);

  const brandHeader = useMemo(() => {
    // Child outlet: Change → brand parent with ?pickOutlet=1 so the picker
    // always shows even if the brand has just one active outlet (otherwise
    // the single-outlet auto-skip would bounce the user back instantly).
    if (brandLink) {
      const outletLabel =
        (hoteldata as any)?.location_details ||
        (hoteldata as any)?.location ||
        (hoteldata as any)?.district ||
        (hoteldata as any)?.store_name ||
        null;
      return {
        brandName: brandLink.brandName,
        outletLabel,
        onChange: () =>
          router.push(`/${brandLink.parentUsername}?pickOutlet=1`),
      };
    }
    // Brand parent: Change → re-open the outlet picker overlay in place.
    if (branchContext) {
      return {
        brandName: branchContext.name,
        outletLabel: null,
        onChange: reopenOutletPicker,
      };
    }
    return null;
  }, [brandLink, branchContext, hoteldata, router, reopenOutletPicker]);

  const defaultProps = {
    offers,
    hoteldata: filteredHotelData,
    auth,
    theme,
    tableNumber,
    styles,
    socialLinks,
    qrGroup,
    qrId,
    categories,
    setSelectedCategory,
    selectedCategory,
    items,
    topItems,
    open_place_order_modal: open_place_order_modal,
    pathname: pathname,
    isOnFreePlan: isHotelOnFreePlan,
    hideOtherCategories: !!lockedCategory,
    onShowStorefront: showOnboarding ? reopenOutletPicker : undefined,
    brandHeader,
  };

  const renderPage = () => {
    switch (theme?.menuStyle) {
      case "compact":
        return <Compact {...defaultProps} />;
      case "sidebar":
        return <Sidebar {...defaultProps} />;
      case "v3":
        return <V3 {...defaultProps} />;
      case "v4":
        return <V4 {...defaultProps} />;
      case "v5":
        return <V5 {...defaultProps} />;
      default:
        return <Default {...defaultProps} />;
    }
  };

  const isWithinDeliveryTime = () => {
    if (!hoteldata?.delivery_rules?.delivery_time_allowed) {
      return true;
    }

    const convertTimeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const startTime = convertTimeToMinutes(
      hoteldata.delivery_rules.delivery_time_allowed.from ?? "00:00"
    );
    const endTime = convertTimeToMinutes(
      hoteldata.delivery_rules.delivery_time_allowed.to ?? "23:59"
    );

    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  };

  const showOrderDrawer =
    theme?.menuStyle !== "compact" &&
    theme?.menuStyle !== "sidebar" &&
    theme?.menuStyle !== "v3" &&
    theme?.menuStyle !== "v4" &&
    theme?.menuStyle !== "v5" &&
    ((pathname.includes("qrScan") && features?.ordering.enabled) ||
      (!pathname.includes("qrScan") &&
        features?.delivery.enabled &&
        (hoteldata?.delivery_rules?.isDeliveryActive ?? true) &&
        isWithinDeliveryTime()));

  return (
    <>
      {isReorderMode && <ReorderHandler hotelData={hoteldata} />}
      {!onboardingDismissed ? null : (
        <>
          {features?.delivery.enabled &&
            hoteldata?.delivery_rules?.delivery_time_allowed && (
              <DeliveryTimeCampain
                deliveryRules={hoteldata.delivery_rules}
                accent={styles.accent}
              />
            )}
          {renderPage()}
          {isHotelOnFreePlan && (
            <div className="w-full py-3 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
              Powered by{" "}
              <a
                href="https://menuthere.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                Menuthere
              </a>
            </div>
          )}
          {showOrderDrawer && (
            <section>
              <OrderDrawer
                qrGroup={qrGroup}
                styles={styles}
                qrId={qrId || undefined}
                hotelData={hoteldata}
                tableNumber={tableNumber}
              />
            </section>
          )}
        </>
      )}
      {showOnboarding && !isReorderMode && (
        <OnboardingFlow
          key={onboardingKey}
          featureFlags={hoteldata?.feature_flags || ""}
          storeName={hoteldata?.store_name || ""}
          storeBanner={hoteldata?.store_banner}
          partnerId={hoteldata?.id || ""}
          tableNumber={tableNumber}
          hotelData={hoteldata}
          themeBg={theme?.colors?.bg}
          onboardingCompleted={onboardingCompleted}
          deliveryTimeAllowed={hoteldata?.delivery_rules?.delivery_time_allowed}
          takeawayTimeAllowed={hoteldata?.delivery_rules?.takeaway_time_allowed}
          isDeliveryActive={hoteldata?.delivery_rules?.isDeliveryActive ?? true}
          storeTagline={(hoteldata as any)?.store_tagline}
          notices={(hoteldata as any)?.notices || []}
          socialLinks={socialLinks}
          storefrontSettings={(hoteldata as any)?.storefront_settings}
          themeBrandColor={(theme as any)?.brandColor || null}
          skipStorefront={forceStorefront ? false : skipStorefront}
          forceStart={forceStorefront}
          initialDeliveryOpen={initialDeliveryOpen}
          initialTakeawayOpen={initialTakeawayOpen}
          hotelTimezone={hotelTimezone}
          branchContext={branchContext}
          preselectedOrderType={preselectedOrderType}
          onDismiss={() => { setOnboardingDismissed(true); setForceStorefront(false); }}
        />
      )}
      {/* Notices now shown in splash/storefront screen only */}
    </>
  );
};

export default HotelMenuPage;
