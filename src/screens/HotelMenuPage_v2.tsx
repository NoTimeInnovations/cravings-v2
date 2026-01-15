"use client";

import { Offer } from "@/store/offerStore_hasura";
import { HotelData, SocialLinks } from "@/app/hotels/[...id]/page";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
import { Category } from "@/store/categoryStore_hasura";
import OrderDrawer from "@/components/hotelDetail/OrderDrawer";
import useOrderStore from "@/store/orderStore";
// Import useMemo and useCallback
import { useEffect, useMemo, useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getFeatures } from "@/lib/getFeatures";
import { QrGroup } from "@/app/admin/qr-management/page";
import { addToRecent } from "@/lib/addToRecent";
import { getQrScanCookie, setQrScanCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { INCREMENT_QR_CODE_SCAN_COUNT } from "@/api/qrcodes";
import Default from "@/components/hotelDetail/styles/Default/Default";
import Compact from "@/components/hotelDetail/styles/Compact/Compact";
import { saveUserLocation } from "@/lib/saveUserLocLocal";
import { QrCode, useQrDataStore } from "@/store/qrDataStore";
import DeliveryTimeCampain from "@/components/hotelDetail/DeliveryTimeCampain";
import OtpLoginModal from "@/components/auth/OtpLoginModal";
import { useAuthStore } from "@/store/authStore";
import { Notification } from "@/app/actions/notification";
import { toast } from "sonner";

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
}: HotelMenuPageProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { setHotelId, genOrderId, open_place_order_modal } = useOrderStore();
  const { setQrData } = useQrDataStore();

  const styles: Styles = {
    backgroundColor: theme?.colors?.bg || "#F5F5F5",
    color: theme?.colors?.text || "#000",
    accent: theme?.colors?.accent || "#EA580C",
    border: {
      borderColor: theme?.colors?.text ? `${theme.colors.text}1D` : "#0000001D",
      borderWidth: "1px",
      borderStyle: "solid",
    },
  };

  useEffect(() => {
    saveUserLocation(false);
  }, []);

  useEffect(() => {
    setQrData(qrData || null);
  }, [qrData, setQrData]);

  useEffect(() => {
    setQrData(qrData || null);
  }, [qrData, setQrData]);

  const [limitReached, setLimitReached] = useState(false);

  // OTP Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { signInWithPhone } = useAuthStore();

  useEffect(() => {
    // If not authenticated, show login modal
    // Check if auth is present or if userData is in store (client side)
    const checkAuth = async () => {
      // We rely on the prop `auth` initially, but also check store if client-side update happens?
      // Actually `auth` prop comes from server.
      if (!auth || !auth.id) {
        // Check if we have a temp user id? No, user requested OTP verification for USER who login.
        // If we want to force login for /hotels/ and /qrScan/, we show it.
        // But usually we allow browsing. The user said "implement otp verification ofr the user who login in /hotels/ /qrscan/ and in only for the user".
        // This might mean "WHEN they login", not "Force them to login".
        // However, "implement otp verification for the user who LOGS IN".
        // Currently, how do they login in this page? They might not have a way effectively except via OrderDrawer which might prompt?
        // Or maybe I should add a Login button or force it?
        // Let's assume we want to prompt them if they try to do something or just provide the capability.
        // But the prompt says "implement otp verification ... and in only for the user".
        // It likely means REPLACE the existing login mechanism or ADD it.
        // Since I didn't see a clear "Login" button in the `HotelMenuPage` UI code (it might be in Navbar or invisible), 
        // I will add a Login Button if not logged in, or ensure that if they are prompted to login, this new OTP flow is used.
        // Wait, `HotelMenuPage` doesn't seem to have a login button directly.
        // BUT, the user might be referring to `Login.tsx` which IS used by `/hotels` users if they are redirected.
        // I already updated `Login.tsx`.
        // DO I need to add it here? "in /hotels/ /qrScan/". This implies the pages themselves.
        // Maybe I should add a check: if not logged in, show modal? 
        // "implement otp verification ofr the user who login IN /hotels/ /qrScan/"
        // I will add a mechanism to login. Maybe a Floating button or just rely on `Login.tsx` update if the flow redirects there.
        // BUT, usually these pages are for ordering and they might be guest.
        // If I am just browsing I am not logged in.
        // I will add a Login button in the header or similar if possible.
        // But `HotelMenuPage_v2` renders `Default` or `Compact` components.
        // Let's look at `Default` or `Compact`.
        // Actually, `OrderDrawer` likely handles placing order and might require login.
        // Let's check `OrderDrawer`.
      }
    };
  }, [auth]);

  const handleLoginSuccess = async (phone: string) => {
    try {
      // We need userCountryInfo. Since we are in a modal, we might need to fetch it or default it.
      // For now, let's use a default or fetch it.
      const { getUserCountry } = await import("@/lib/getUserCountry");
      const info = await getUserCountry();
      // Remove +91 or rely on phone being 10 digits
      const cleaned = phone.replace(/\D/g, "").slice(-10);
      await signInWithPhone(cleaned, undefined, info);
      await Notification.token.save();
      setShowLoginModal(false);
      router.refresh(); // Refresh to update server props
    } catch (error) {
      console.error(error);
      toast.error("Login failed");
    }
  };


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

  // ✅ Memoize offeredItems to avoid recalculating on every render
  const offeredItems = useMemo(() => {
    if (!hoteldata?.menus || !offers) return [];
    const activeOfferMenuIds = new Set(offers.map((offer) => offer.menu?.id));
    return hoteldata.menus.filter(
      (item) =>
        activeOfferMenuIds.has(item.id || "") &&
        (item.category.is_active === undefined || item.category.is_active)
    );
  }, [hoteldata?.menus, offers]);

  // ✅ Memoize categories to prevent recalculating unless the menu changes
  const categories = useMemo(() => {
    if (!hoteldata?.menus) return [];
    const uniqueCategoriesMap = new Map<string, Category>();

    hoteldata.menus.forEach((item) => {
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
  }, [hoteldata?.menus, offeredItems]);

  const selectedCategory = selectedCategoryProp || "all";

  // ✅ Memoize the filtered and sorted items for the selected category
  const items = useMemo(() => {
    if (!hoteldata?.menus) return [];

    let filteredItems = [];

    if (selectedCategory === "all") {
      filteredItems =
        hoteldata.menus.filter(
          (item) =>
            item.category.is_active === undefined || item.category.is_active
        ) || [];
    } else if (selectedCategory === "Offer") {
      filteredItems = offeredItems;
    } else {
      filteredItems =
        hoteldata.menus.filter(
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
  }, [selectedCategory, hoteldata?.menus, offeredItems]);

  // ✅ Memoize top-selling items
  const topItems = useMemo(() => {
    return (
      hoteldata?.menus?.filter(
        (item) =>
          item.is_top === true &&
          (item.category.is_active === undefined || item.category.is_active)
      ) || []
    );
  }, [hoteldata?.menus]);

  // ✅ Memoize the function passed as a prop to prevent child re-renders
  const setSelectedCategory = useCallback(
    (category: string) => {
      const url = new URL(window.location.href);
      if (category === "all") {
        url.searchParams.delete("cat");
      } else {
        url.searchParams.set("cat", category);
      }
      router.push(url.toString(), { scroll: false });
    },
    [router]
  );

  const defaultProps = {
    offers,
    hoteldata,
    auth,
    theme,
    tableNumber,
    styles,
    socialLinks,
    qrGroup,
    qrId,
    categories,
    setSelectedCategory,
    items,
    topItems,
    open_place_order_modal: open_place_order_modal,
    pathname: pathname,
  };

  const renderPage = () => {
    switch (theme?.menuStyle) {
      case "compact":
        return <Compact {...defaultProps} />;
      default:
        return <Default {...defaultProps} />;
    }
  };

  const features = getFeatures(hoteldata?.feature_flags || "");

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

      <OtpLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default HotelMenuPage;
