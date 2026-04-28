"use client";

import { Offer } from "@/store/offerStore_hasura";
import { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
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
import { saveUserLocation } from "@/lib/saveUserLocLocal";
import { QrCode, useQrDataStore } from "@/store/qrDataStore";
import DeliveryTimeCampain from "@/components/hotelDetail/DeliveryTimeCampain";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import NoticesOverlay from "@/components/NoticesOverlay";

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
}

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
  const isUserLoggedIn = auth?.role === "user";
  const features = getFeatures(hoteldata?.feature_flags || "");
  const needsOnboarding = features.newonboarding.enabled && (features.delivery.enabled || features.ordering.enabled) && tableNumber === 0;
  // Always mount the onboarding overlay when needed; it dismisses itself once the
  // user picks an order type and re-mounts on every reload so the order type screen
  // shows again (value persists only in sessionStorage).
  const showOnboarding = needsOnboarding;
  const [onboardingDismissed, setOnboardingDismissed] = useState(!showOnboarding);
  const [onboardingKey, setOnboardingKey] = useState(0);
  // When the menu-page back button reopens onboarding, start at the storefront
  // splash even if the URL has search params (which normally sets skipStorefront).
  const [forceStorefront, setForceStorefront] = useState(false);

  const brandAccent = useMemo(() => {
    const BRAND_COLOR_MAP: Record<string, string> = {
      "burnt-orange": "#e85d04", "obsidian-gold": "#b8860b", "royal-burgundy": "#8b1a4a",
      "midnight-emerald": "#0d6b4e", "sapphire": "#1e4db7", "charcoal-noir": "#2c2c2c",
      "deep-violet": "#6b21a8", "rose-blush": "#be185d", "teal-luxe": "#0f766e", "warm-copper": "#b45309",
    };
    try {
      const raw = (hoteldata as any)?.storefront_settings;
      if (!raw) return null;
      const sf = typeof raw === "string" ? JSON.parse(raw) : raw;
      const bc = sf?.brandColor;
      if (!bc) return null;
      return bc.startsWith("custom:") ? bc.replace("custom:", "") : (BRAND_COLOR_MAP[bc] || null);
    } catch { return null; }
  }, [(hoteldata as any)?.storefront_settings]);

  const styles: Styles = useMemo(() => ({
    backgroundColor: theme?.colors?.bg || "#F5F5F5",
    color: theme?.colors?.text || "#000",
    accent: theme?.colors?.accent || "#EA580C",
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
      setHotelId(hoteldata.id);
      genOrderId();
      addToRecent(hoteldata.id);
    }
  }, [hoteldata?.id, setHotelId, genOrderId]);

  // Filter menus by order type visibility
  const filteredMenus = useMemo(() => {
    if (!hoteldata?.menus) return [];
    return hoteldata.menus.filter((item: any) => {
      if (orderType === "delivery" && item.show_on_delivery === false) return false;
      if (orderType === "takeaway" && item.show_on_takeaway === false) return false;
      if (lockedCategory && item.category?.name !== lockedCategory) return false;
      if (hiddenCategoryNames && hiddenCategoryNames.has(item.category?.name)) return false;
      return true;
    });
  }, [hoteldata?.menus, orderType, lockedCategory, hiddenCategoryNames]);

  // ✅ Memoize offeredItems to avoid recalculating on every render
  const offeredItems = useMemo(() => {
    if (!filteredMenus || !offers) return [];
    const activeOfferMenuIds = new Set(offers.map((offer) => offer.menu?.id));
    return filteredMenus.filter(
      (item) =>
        activeOfferMenuIds.has(item.id || "") &&
        (item.category.is_active === undefined || item.category.is_active)
    );
  }, [filteredMenus, offers]);

  // ✅ Memoize categories to prevent recalculating unless the menu changes
  const categories = useMemo(() => {
    if (!filteredMenus.length) return [];
    const uniqueCategoriesMap = new Map<string, Category>();

    filteredMenus.forEach((item) => {
      if (
        !uniqueCategoriesMap.has(item.category.name) &&
        (item.category.is_active === undefined || item.category.is_active)
      ) {
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
      filteredItems =
        filteredMenus.filter(
          (item) =>
            item.category.is_active === undefined || item.category.is_active
        ) || [];
    } else if (selectedCategory === "Offer") {
      filteredItems = offeredItems;
    } else {
      filteredItems =
        filteredMenus.filter(
          (item) =>
            item.category.name === selectedCategory &&
            (item.category.is_active === undefined || item.category.is_active)
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

  // ✅ Memoize top-selling items
  const topItems = useMemo(() => {
    return (
      filteredMenus.filter(
        (item) =>
          item.is_top === true &&
          (item.category.is_active === undefined || item.category.is_active)
      ) || []
    );
  }, [filteredMenus]);

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
    onShowStorefront: showOnboarding ? () => {
      // Clear all search params so the storefront/onboarding flow renders fresh.
      // Use window.history.replaceState for immediate effect (router.replace is
      // async and useSearchParams in the remounted OnboardingFlow would still
      // see the stale params for one render).
      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState(null, "", pathname);
      }
      setForceStorefront(true);
      setOnboardingDismissed(false);
      setOnboardingKey((k) => k + 1);
    } : undefined,
  };

  const renderPage = () => {
    switch (theme?.menuStyle) {
      case "compact":
        return <Compact {...defaultProps} />;
      case "sidebar":
        return <Sidebar {...defaultProps} />;
      case "v3":
        return <V3 {...defaultProps} />;
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
    ((pathname.includes("qrScan") && features?.ordering.enabled) ||
      (!pathname.includes("qrScan") &&
        features?.delivery.enabled &&
        (hoteldata?.delivery_rules?.isDeliveryActive ?? true) &&
        isWithinDeliveryTime()));

  return (
    <>
      {!onboardingDismissed ? null : (
        <>
          {features?.delivery.enabled &&
            hoteldata?.delivery_rules?.delivery_time_allowed && (
              <DeliveryTimeCampain deliveryRules={hoteldata.delivery_rules} />
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
      {showOnboarding && (
        <OnboardingFlow
          key={onboardingKey}
          isLoggedIn={isUserLoggedIn}
          featureFlags={hoteldata?.feature_flags || ""}
          storeName={hoteldata?.store_name || ""}
          storeBanner={hoteldata?.store_banner}
          partnerId={hoteldata?.id || ""}
          tableNumber={tableNumber}
          themeBg={theme?.colors?.bg}
          onboardingCompleted={onboardingCompleted}
          deliveryTimeAllowed={hoteldata?.delivery_rules?.delivery_time_allowed}
          takeawayTimeAllowed={hoteldata?.delivery_rules?.takeaway_time_allowed}
          isDeliveryActive={hoteldata?.delivery_rules?.isDeliveryActive ?? true}
          storeTagline={(hoteldata as any)?.store_tagline}
          notices={(hoteldata as any)?.notices || []}
          socialLinks={socialLinks}
          storefrontSettings={(hoteldata as any)?.storefront_settings}
          skipStorefront={forceStorefront ? false : skipStorefront}
          forceStart={forceStorefront}
          initialDeliveryOpen={initialDeliveryOpen}
          initialTakeawayOpen={initialTakeawayOpen}
          hotelTimezone={hotelTimezone}
          onDismiss={() => { setOnboardingDismissed(true); setForceStorefront(false); }}
        />
      )}
      {/* Notices now shown in splash/storefront screen only */}
    </>
  );
};

export default HotelMenuPage;
