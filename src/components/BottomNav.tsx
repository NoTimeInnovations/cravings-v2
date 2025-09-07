"use client";
import { getFeatures } from "@/lib/getFeatures";
import { Partner, useAuthStore } from "@/store/authStore";
import {
  BadgePercent,
  Telescope,
  ShoppingBag,
  User,
  LayoutDashboard,
  Package,
  Shield,
  Home,
  Info,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

const BottomNav = ({ userData }: { userData: any }) => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Define navigation items based on user role
  const getNavItems = () => {
    // Default navigation for non-logged-in users
    if (!userData?.role) {
      return [
        {
          href: "/",
          name: "Explore",
          icon: <Telescope size={20} />,
          exactMatch: false,
        },
        {
          href: "/offers",
          name: "Offers",
          icon: <BadgePercent size={20} />,
          exactMatch: false,
        },
        {
          href: "/hotels",
          name: "Hotels",
          icon: <Home size={20} />,
          exactMatch: false,
        },
        {
          href: "/about-us",
          name: "About Us",
          icon: <Info size={20} />,
          exactMatch: false,
        },
      ];
    }

    const features = getFeatures((userData as Partner)?.feature_flags || "");

    switch (userData.role) {
      case "user":
        return [
          {
            href: "/",
            name: "Explore",
            icon: <Telescope size={20} />,
            exactMatch: true,
          },
          {
            href: "/offers",
            name: "Offers",
            icon: <BadgePercent size={20} />,
            exactMatch: false,
          },
          {
            href: "/hotels",
            name: "Hotels",
            icon: <Home size={20} />,
            exactMatch: false,
          },
          
          
        ];
      case "partner":
        const partnerItems = [
          {
            href: "/admin",
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

  // Don't show on /captain* routes, otherwise show if items exist
  const shouldShow = items.length > 0 && !pathname.startsWith("/captain") && !pathname.startsWith("/kot") && !pathname.startsWith("/bill") && !pathname.startsWith("/whatsappQr");

  if (!shouldShow) return null;

  return (
    <section className={`lg:hidden`}>
      {/* Spacer to prevent content from being hidden behind the fixed nav */}
      {/* <div className="h-[64px] w-full" aria-hidden="true"></div> */}
      {/* Bottom Navigation Bar */}
      <div
        className={`fixed bottom-0 left-0 w-full bg-white px-4 py-3 flex justify-around z-[500] border-t border-gray-200 transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {items.map((item) => {
          // Special handling for home ("/") route
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
                className={`flex flex-col items-center text-sm font-medium ${
                  isActive ? "text-orange-600" : "text-gray-600"
                }`}
              >
                <div className="mb-1">{item.icon}</div>
                <span className="text-xs">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Gradient overlay at bottom to indicate scrollable content */}
      <div className="fixed bottom-0 left-0 w-full h-[100px] bg-gradient-to-t from-black/10 to-transparent z-[40] pointer-events-none"></div>
    </section>
  );
};

export default BottomNav;
