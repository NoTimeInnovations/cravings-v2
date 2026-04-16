"use client";

import { Offer } from "@/store/offerStore_hasura";
import { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
import { Category } from "@/store/categoryStore_hasura";
import OrderDrawer from "@/components/hotelDetail/OrderDrawer";
import useOrderStore from "@/store/orderStore";
// Import useMemo and useCallback
import { useEffect, useMemo, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
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
import { saveUserLocation } from "@/lib/saveUserLocLocal";
import { QrCode, useQrDataStore } from "@/store/qrDataStore";
import DeliveryTimeCampain from "@/components/hotelDetail/DeliveryTimeCampain";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

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
  qrData?: QrCode | null;
  onboardingCompleted?: boolean;
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
}: HotelMenuPageProps) => {
  const pathname = usePathname();
  const { setHotelId, genOrderId, open_place_order_modal, orderType } = useOrderStore();
  const { setQrData } = useQrDataStore();

  // Onboarding state
  const isUserLoggedIn = auth?.role === "user";
  const features = getFeatures(hoteldata?.feature_flags || "");
  const needsOnboarding = (features.delivery.enabled || features.ordering.enabled) && tableNumber === 0;
  // Always mount the onboarding overlay when needed; it dismisses itself once the
  // user picks an order type and re-mounts on every reload so the order type screen
  // shows again (value persists only in sessionStorage).
  const showOnboarding = needsOnboarding;

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
  }), [theme?.colors?.bg, theme?.colors?.text, theme?.colors?.accent, theme?.showGrid]);

  // useEffect(() => {
  //   saveUserLocation(false);
  // }, []);

  // Save theme + last visited store to localStorage so other screens can use it
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
        })
      );
    } catch {}
  }, [styles.accent, styles.backgroundColor, styles.color, theme?.showGrid, hoteldata?.store_name, pathname]);

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
      return true;
    });
  }, [hoteldata?.menus, orderType]);

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

  const [selectedCategory, setSelectedCat] = useState(selectedCategoryProp || "all");

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
      setSelectedCat(category);
    },
    []
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
  };

  const renderPage = () => {
    switch (theme?.menuStyle) {
      case "compact":
        return <Compact {...defaultProps} />;
      case "sidebar":
        return <Sidebar {...defaultProps} />;
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
    ((pathname.includes("qrScan") && features?.ordering.enabled) ||
      (!pathname.includes("qrScan") &&
        features?.delivery.enabled &&
        (hoteldata?.delivery_rules?.isDeliveryActive ?? true) &&
        isWithinDeliveryTime()));

  return (
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
      {showOnboarding && (
        <OnboardingFlow
          isLoggedIn={isUserLoggedIn}
          featureFlags={hoteldata?.feature_flags || ""}
          storeName={hoteldata?.store_name || ""}
          storeBanner={hoteldata?.store_banner}
          partnerId={hoteldata?.id || ""}
          tableNumber={tableNumber}
          themeBg={theme?.colors?.bg}
          onboardingCompleted={onboardingCompleted}
        />
      )}
    </>
  );
};

export default HotelMenuPage;
