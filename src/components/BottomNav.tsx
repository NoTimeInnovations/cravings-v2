"use client";
import { getFeatures } from "@/lib/getFeatures";
import { Partner, useAuthStore } from "@/store/authStore";
import {
  ShoppingBag,
  User,
  LayoutDashboard,
  Package,
  Shield,
  CreditCard,
  ArrowLeft,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const BottomNav = () => {
  const { userData } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [lastStorePath, setLastStorePath] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hotelTheme");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.storePath) setLastStorePath(parsed.storePath);
      }
    } catch {}
  }, []);

  // Check if current path is a username route
  const isUsernameRoute = (() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return false;
    const knownRoutes = new Set([
      "actions", "admin", "admin-v2", "api", "auth", "bill", "business",
      "captain", "captainlogin", "coupons", "create-offer-promotion", "demo",
      "download-app", "explore", "get-started", "help-center", "hotels",
      "join-community", "kot", "login", "my-earnings", "my-orders", "newlogin",
      "offers", "onboard", "order", "partner", "partnerlogin", "pricing",
      "privacy-policy", "product", "profile", "qrScan", "reel-analytics",
      "refund-policy", "sentry-example-page", "solutions", "superadmin",
      "superLogin", "terms-and-conditions", "test", "tutorials", "user-map",
      "user-profile",
      "whatsappQr",
    ]);
    return !knownRoutes.has(segments[0]);
  })();

  // Show back button for users when NOT on username routes, /hotels, or /qrScan
  const showBackButton =
    userData?.role === "user" &&
    !isUsernameRoute &&
    !pathname.startsWith("/qrScan");

  // Define navigation items based on user role
  const getNavItems = () => {
    // Default navigation for non-logged-in users
    if (!userData?.role) {
      return [];
    }

    const features = getFeatures((userData as Partner)?.feature_flags || "");

    switch (userData.role) {
      case "user":
        return [
          {
            href: "/my-orders",
            name: "Orders",
            icon: <ShoppingBag size={20} />,
            exactMatch: false,
          },
          {
            href: "/user-profile",
            name: "Profile",
            icon: <User size={20} />,
            exactMatch: true,
          },
        ];
      case "partner":
        const partnerItems = [
          {
            href: "/admin-v2",
            name: "Dashboard",
            icon: <LayoutDashboard size={20} />,
            exactMatch: true,
          },
        ];

        // Add Orders if ordering is enabled
        if (features?.ordering?.enabled || features?.delivery?.enabled || features?.pos?.enabled) {
          partnerItems.push({
            href: "/admin/orders",
            name: "Orders",
            icon: <ShoppingBag size={20} />,
            exactMatch: false,
          });
        }

        // Add Stock if stockmanagement is enabled
        if (features?.stockmanagement?.enabled) {
          partnerItems.push({
            href: "/admin/stock-management",
            name: "Stock",
            icon: <Package size={20} />,
            exactMatch: false,
          });
        }

        // Add POS if pos is enabled
        if (features?.pos?.enabled) {
          partnerItems.push({
            href: "/admin/pos",
            name: "POS",
            icon: <CreditCard size={20} />,
            exactMatch: false,
          });
        }


        if (features?.purchasemanagement?.enabled) {
          partnerItems.push({
            href: "/admin/purchase-management",
            name: "Purchase Management",
            icon: <ShoppingBag size={20} />,
            exactMatch: false,
          });
        }


        return partnerItems;
      case "superadmin":
        return [
          {
            href: "/superadmin",
            name: "Admin",
            icon: <Shield size={20} />,
            exactMatch: false,
          }
        ];
      default:
        return [];
    }
  };

  const items = getNavItems();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide navbar
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show navbar
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Don't show on certain routes (allow /hotels but not /hotels/*)
  const isHotelSubRoute = pathname.startsWith("/hotels/");
  const shouldShow = items.length > 0 && !isUsernameRoute && !isHotelSubRoute && !pathname.startsWith("/captain") && !pathname.startsWith("/kot") && !pathname.startsWith("/bill") && !pathname.startsWith("/whatsappQr") && !pathname.startsWith("/get-started") && !pathname.startsWith("/admin-v2") && !pathname.startsWith("/pricing") && !pathname.startsWith("/business") && !pathname.startsWith("/order/") && !pathname.startsWith("/delivery-app/download") && pathname !== "/user-profile";

  if (!shouldShow) return null;

  return (
    <section className={`lg:hidden`}>
      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Bottom navigation"
        className={`fixed bottom-0 left-0 w-full bg-white px-4 py-3 flex justify-around z-[500] border-t border-gray-200 transition-transform duration-300 ${isVisible ? "translate-y-0" : "translate-y-full"
          }`}
      >
        {showBackButton && (
          lastStorePath ? (
            <Link
              href={lastStorePath}
              className="text-center flex-1 min-w-[60px]"
            >
              <div className="flex flex-col items-center text-sm font-medium text-gray-600">
                <div className="mb-1"><UtensilsCrossed size={20} /></div>
                <span className="text-xs">Food</span>
              </div>
            </Link>
          ) : (
            <button
              onClick={() => router.back()}
              className="text-center flex-1 min-w-[60px]"
            >
              <div className="flex flex-col items-center text-sm font-medium text-gray-600">
                <div className="mb-1"><ArrowLeft size={20} /></div>
                <span className="text-xs">Back</span>
              </div>
            </button>
          )
        )}
        {items.map((item) => {
          let isActive = false;
          if (item.href === "/") {
            isActive = pathname === "/";
          } else {
            isActive = item.exactMatch
              ? pathname === item.href
              : pathname.startsWith(item.href);
          }

          return (
            <Link
              key={`${item.href}-${item.name}`}
              href={item.href}
              className="text-center flex-1 min-w-[60px]"
            >
              <div
                className={`flex flex-col items-center text-sm font-medium ${isActive ? "text-orange-600" : "text-gray-600"
                  }`}
              >
                <div className="mb-1">{item.icon}</div>
                <span className="text-xs">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Gradient overlay at bottom to indicate scrollable content */}
      <div className="fixed bottom-0 left-0 w-full h-[100px] bg-gradient-to-t from-black/10 to-transparent z-[40] pointer-events-none"></div>
    </section>
  );
};

export default BottomNav;
