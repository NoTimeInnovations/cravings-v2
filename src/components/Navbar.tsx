"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Globe,
  Smartphone,
  Monitor,
  ClipboardList,
  Boxes,
  ScanLine,
  ChevronDown,
  Briefcase,
  Building2,
  TrendingUp,
  Users,
  Utensils,
  Hotel,
  ShoppingCart,
  BookOpen,
  HelpCircle,
  Menu,
  X,
  Coffee,
  Cake,
  ChefHat,
  Truck,
  Wine,
  PartyPopper,
} from "lucide-react";

import Image from "next/image"; // Added import

import { getFeatures } from "@/lib/getFeatures";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import UserAvatar from "./UserAvatar";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PRODUCTS = [
  {
    title: "Digital Menu",
    description: "Accept orders via QR code scan",
    icon: ScanLine,
    href: "/product/digital-menu",
  },
  {
    title: "Own Delivery Website",
    description: "Commission-free delivery platform",
    icon: Globe,
    href: "/product/delivery-website",
  },
  {
    title: "Point Of Sale (POS)",
    description: "Manage billing and operations",
    icon: Monitor,
    href: "/product/pos",
  },
  {
    title: "Table Ordering",
    description: "Seamless dining experience for customers",
    icon: Smartphone,
    href: "/product/table-ordering",
  },
  {
    title: "Captain Ordering",
    description: "Efficient order taking for staff",
    icon: ClipboardList,
    href: "/product/captain-ordering",
  },
  /*
  {
    title: "Inventory & Purchase",
    description: "Track stock and manage suppliers",
    icon: Boxes,
    href: "/product/inventory-management"
  }
  */
];

const SOLUTIONS_ROLES = [
  {
    title: "Owners",
    description: "Oversee operations and grow revenue",
    href: "/solutions/owners",
    icon: Briefcase,
  },
  {
    title: "Agencies",
    description: "Manage multiple client accounts easily",
    href: "/solutions/agencies",
    icon: Building2,
  },
  // {
  //   title: "Digital Marketers",
  //   description: "Drive engagement and track conversions",
  //   href: "/solutions/marketers",
  //   icon: TrendingUp
  // },
  // {
  //   title: "Part Time Workers",
  //   description: "Flexible shifts and earnings tracking",
  //   href: "/solutions/workers",
  //   icon: Users
  // }
];

const SOLUTIONS_INDUSTRIES = [
  {
    title: "Restaurants",
    description: "Smart digital menus for dine-in",
    href: "/solutions/restaurants",
    icon: Utensils,
  },
  {
    title: "Cafés & Coffee Shops",
    description: "Modern menus for the perfect brew",
    href: "/solutions/cafes",
    icon: Coffee,
  },
  {
    title: "Bakeries",
    description: "Showcase fresh bakes beautifully",
    href: "/solutions/bakeries",
    icon: Cake,
  },
  {
    title: "Cloud Kitchens",
    description: "Multi-brand menu management",
    href: "/solutions/cloud-kitchens",
    icon: ChefHat,
  },
  {
    title: "Hotels & Resorts",
    description: "Elegant guest dining experience",
    href: "/solutions/hotels",
    icon: Hotel,
  },
  {
    title: "Food Trucks",
    description: "Mobile menus on the go",
    href: "/solutions/food-trucks",
    icon: Truck,
  },
  {
    title: "Bars & Pubs",
    description: "Dynamic drink menus with style",
    href: "/solutions/bars",
    icon: Wine,
  },
  {
    title: "Catering",
    description: "Professional event menus",
    href: "/solutions/catering",
    icon: PartyPopper,
  },
];

const RESOURCES = [
  // {
  //   title: "About Us",
  //   description: "Learn more about our company",
  //   href: "/about-us",
  //   icon: Users
  // },
  // {
  //   title: "Blogs",
  //   description: "Read our latest articles and updates",
  //   href: "/blogs",
  //   icon: BookOpen
  // },
  {
    title: "Help Center",
    description: "Get support and find answers",
    href: "/help-center",
    icon: HelpCircle,
  },
  {
    title: "Download App",
    description: "Get the app for iOS and Android",
    href: "/download-app",
    icon: Download,
  },
];

const HIDDEN_PATHS = [
  "/hotels",
  "/hotels/.*",
  "/captain",
  "/captain/.*",
  "/bill/.*",
  "/kot/.*",
  "/qrScan",
  "/qrScan/.*",
  "/whatsappQr/.*",
  "/get-started",
  "/admin-v2",
  "/admin-v2/.*",
  "/admin",
  "/admin/.*",
  "/order",
  "/order/.*",
  "/my-orders",
  "/onboard",
  "/onboard/.*",
];

import { Partner, useAuthStore } from "@/store/authStore";
import { ButtonV2 } from "@/components/ui/ButtonV2";

export function Navbar() {
  const { userData: storeUserData } = useAuthStore();
  const userData = storeUserData as any;
  const features = getFeatures(userData?.feature_flags as string);
  const router = useRouter();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const currentPath = pathname.split("?")[0];
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileSection, setExpandedMobileSection] = useState<
    string | null
  >(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const solutionsDropdownRef = useRef<HTMLDivElement>(null);
  const resourcesDropdownRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const toggleMobileSection = (section: string) => {
    setExpandedMobileSection(
      expandedMobileSection === section ? null : section,
    );
  };

  const handleNavHover = (e: React.MouseEvent<HTMLElement>) => {
    const container = navContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = e.currentTarget.getBoundingClientRect();
    setPillStyle({
      left: targetRect.left - containerRect.left,
      width: targetRect.width,
      opacity: 1,
    });
  };

  const handleNavLeave = () => {
    setPillStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  // Clamp dropdown horizontally so it never overflows the viewport
  const clampDropdownToViewport = (el: HTMLDivElement | null) => {
    if (!el) return;
    el.style.marginLeft = "0px";
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const gap = 16;
      if (rect.right > vw - gap) {
        el.style.marginLeft = `${vw - gap - rect.right}px`;
      } else if (rect.left < gap) {
        el.style.marginLeft = `${gap - rect.left}px`;
      }
    });
  };

  useEffect(() => {
    if (isSolutionsOpen) clampDropdownToViewport(solutionsDropdownRef.current);
  }, [isSolutionsOpen]);

  useEffect(() => {
    if (isResourcesOpen) clampDropdownToViewport(resourcesDropdownRef.current);
  }, [isResourcesOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (isSolutionsOpen) clampDropdownToViewport(solutionsDropdownRef.current);
      if (isResourcesOpen) clampDropdownToViewport(resourcesDropdownRef.current);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSolutionsOpen, isResourcesOpen]);

  const isUserOrGuest = userData?.role === "user" || !userData?.role;

  useEffect(() => {
    const isApp = window?.localStorage.getItem("isApp");
    if (isApp === "true") {
      setIsInstalled(true);
    } else {
      setIsInstalled(false);
    }
  }, []);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      toast.success("App installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      toast.info(
        "To install the app on iOS:\n1. Tap the Share button\n2. Scroll down and tap 'Add to Home Screen'",
        { duration: 5000 },
      );
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("App installed successfully!");
      }
      setDeferredPrompt(null);
    } else {
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      if (isStandalone) {
        window.location.reload();
      } else {
        toast.info(
          "To install the app:\n1. Open your browser menu\n2. Look for 'Install App' or 'Add to Home Screen'\n3. Follow the prompts to install",
          { duration: 5000 },
        );
      }
    }
  };

  const shouldHideNavbar = HIDDEN_PATHS.some((path) => {
    const pattern = path.replace(/\[.*?\]/g, "[^/]+");
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(currentPath);
  });

  if (shouldHideNavbar) {
    return null;
  }

  const isHomePage = ["/offers", "/explore", "/"].includes(pathname);

  const renderBranding = () => (
    <Link
      href="/"
      className="flex items-center cursor-pointer"
    >
      <Image
        src="/menuthere_logo_full.svg"
        alt="Menuthere"
        width={171}
        height={46}
        className="h-8 w-auto object-contain"
        priority
      />
    </Link>
  );

  const renderAuthButtons = () => {
    if (!userData) {
      return (
        <div className="flex items-center gap-3">
          <ButtonV2
            href="/login"
            variant="secondary"
            className="hidden sm:inline-flex"
          >
            Login
          </ButtonV2>
          <ButtonV2 href="/get-started" variant="primary">
            Start for free
          </ButtonV2>
        </div>
      );
    }
    return null;
  };

  const renderUserProfile = () => {
    if (!userData) return null;

    return <UserAvatar userData={userData} />;
  };

  const renderNavigationLinks = () => {
    const adminLinks = [
      ...(userData?.role === "partner"
        ? [
            { href: "/admin", label: "Admin" },
            ...((features?.ordering.access || features?.delivery.access) &&
            userData.status === "active"
              ? [{ href: "/admin/orders", label: "Orders" }]
              : []),
            ...(features?.stockmanagement.access && userData.status === "active"
              ? [{ href: "/admin/stock-management", label: "Stock Management" }]
              : []),
            ...(features?.purchasemanagement.access &&
            userData.status === "active"
              ? [
                  {
                    href: "/admin/purchase-management",
                    label: "Purchase Management",
                  },
                ]
              : []),
          ]
        : []),
      ...(userData?.role === "superadmin"
        ? [{ href: "/superadmin", label: "Super Admin" }]
        : []),
    ];

    return (
      <>
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onMouseEnter={handleNavHover}
            className={cn(
              "items-center px-3 py-1.5 text-sm font-medium transition-colors hidden lg:inline-flex text-nowrap",
              currentPath === link.href
                ? "text-gray-900"
                : "text-[#544b47] hover:text-gray-900",
            )}
          >
            {link.label}
          </Link>
        ))}

        {/* {isUserOrGuest && (
          <div
            className={cn(
              "relative px-3 py-1 text-sm font-medium cursor-pointer hidden lg:inline-flex items-center gap-1 transition-colors",
              isDarkText ? "text-gray-700 hover:text-gray-900" : "text-white"
            )}
            onMouseEnter={() => setIsProductsOpen(true)}
            onMouseLeave={() => setIsProductsOpen(false)}
            onClick={() => setIsProductsOpen(!isProductsOpen)}
          >
            <span className={cn(
              "flex items-center gap-1 transition-colors relative",
              isDarkText ? "text-gray-900" : "text-white"
            )}>
              Products
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isProductsOpen ? "rotate-180" : "")} />

              {/* Custom Underline */}
        {/* <span className={cn(
                "absolute -bottom-2 left-0 w-full h-[1.5px] rounded-full transition-all duration-300 ease-out origin-left",
                isDarkText ? "bg-gray-900" : "bg-white",
                isProductsOpen ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
              )} />
            </span>

            {/* Mega Menu Dropdown */}
        {/* <div
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[600px] bg-white rounded-xl shadow-xl p-6 transition-all duration-200 z-[70] border border-gray-100 before:absolute before:-top-2 before:left-0 before:right-0 before:h-4 before:bg-transparent cursor-default",
                isProductsOpen ? "opacity-100 visible" : "opacity-0 invisible"
              )}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content? Or let it close if link is clicked (link click bubbles up)
            >
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {PRODUCTS.map((product) => (
                  <Link
                    key={product.title}
                    href={product.href}
                    className="flex items-start gap-4 group/item hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                    onClick={() => setIsProductsOpen(false)}
                  >
                    <div className="mt-1">
                      <product.icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-semibold text-sm group-hover/item:text-orange-600 transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                        {product.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )} */}

        {isUserOrGuest && (
          <div
            className={cn(
              "relative px-3 py-1.5 text-sm font-medium cursor-pointer hidden lg:inline-flex items-center gap-1 transition-colors",
              "text-[#544b47] hover:text-gray-900",
            )}
            onMouseEnter={(e) => {
              setIsSolutionsOpen(true);
              handleNavHover(e);
            }}
            onMouseLeave={() => setIsSolutionsOpen(false)}
            onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
          >
            <span className="flex items-center gap-1 transition-colors">
              Solutions
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isSolutionsOpen ? "rotate-180" : "",
                )}
              />
            </span>

            {/* Mega Menu Dropdown */}
            <div
              ref={solutionsDropdownRef}
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[820px] max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_60px_-10px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out z-[70] border border-stone-200/60 before:absolute before:-top-3 before:left-0 before:right-0 before:h-4 before:bg-transparent cursor-default",
                isSolutionsOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Featured: Google Business */}
              <div className="px-5 pt-5 pb-4">
                <Link
                  href="/solutions/google-business"
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-gradient-to-r from-[#a64e2a]/8 to-[#a64e2a]/4 border border-[#a64e2a]/10 hover:border-[#a64e2a]/25 hover:from-[#a64e2a]/12 hover:to-[#a64e2a]/6 transition-all duration-200 group/gbp"
                  onClick={() => setIsSolutionsOpen(false)}
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden ring-1 ring-stone-100">
                    <Image
                      src="/google_business_logo.png"
                      alt="Google Business"
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-stone-900 font-semibold text-sm group-hover/gbp:text-[#a64e2a] transition-colors">
                        Google Business Profile Sync
                      </h3>
                      <span className="px-1.5 py-0.5 bg-[#a64e2a] text-white text-[9px] font-bold rounded-md uppercase leading-none tracking-wide">
                        New
                      </span>
                    </div>
                    <p className="text-stone-500 text-xs mt-0.5">
                      Sync your menu to Google Maps automatically
                    </p>
                  </div>
                </Link>
              </div>

              <div className="h-px bg-stone-100 mx-5" />

              <div className="grid grid-cols-[1fr_2fr] gap-0 p-5">
                {/* Roles Column */}
                <div className="pr-5 border-r border-stone-100">
                  <h4 className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-3 px-2">
                    By Role
                  </h4>
                  <div className="space-y-0.5">
                    {SOLUTIONS_ROLES.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-center gap-3 group/item hover:bg-stone-50 px-2 py-2.5 rounded-lg transition-colors"
                        onClick={() => setIsSolutionsOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-stone-100/80 flex items-center justify-center flex-shrink-0 group-hover/item:bg-[#a64e2a]/10 transition-colors">
                          <item.icon className="w-4 h-4 text-stone-500 group-hover/item:text-[#a64e2a] transition-colors" />
                        </div>
                        <div>
                          <h3 className="text-stone-800 font-medium text-[13px] group-hover/item:text-[#a64e2a] transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-stone-400 text-[11px] leading-snug">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Industries Column */}
                <div className="pl-5">
                  <h4 className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-3 px-2">
                    By Industry
                  </h4>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {SOLUTIONS_INDUSTRIES.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-center gap-2.5 group/item hover:bg-stone-50 px-2 py-2 rounded-lg transition-colors"
                        onClick={() => setIsSolutionsOpen(false)}
                      >
                        <div className="w-7 h-7 rounded-md bg-stone-100/80 flex items-center justify-center flex-shrink-0 group-hover/item:bg-[#a64e2a]/10 transition-colors">
                          <item.icon className="w-3.5 h-3.5 text-stone-500 group-hover/item:text-[#a64e2a] transition-colors" />
                        </div>
                        <div>
                          <h3 className="text-stone-700 font-medium text-[13px] group-hover/item:text-[#a64e2a] transition-colors leading-tight">
                            {item.title}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isUserOrGuest && (
          <div
            className={cn(
              "relative px-3 py-1.5 text-sm font-medium cursor-pointer hidden lg:inline-flex items-center gap-1 transition-colors",
              "text-[#544b47] hover:text-gray-900",
            )}
            onMouseEnter={(e) => {
              setIsResourcesOpen(true);
              handleNavHover(e);
            }}
            onMouseLeave={() => setIsResourcesOpen(false)}
            onClick={() => setIsResourcesOpen(!isResourcesOpen)}
          >
            <span className="flex items-center gap-1 transition-colors">
              Resources
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isResourcesOpen ? "rotate-180" : "",
                )}
              />
            </span>

            {/* Mega Menu Dropdown */}
            <div
              ref={resourcesDropdownRef}
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[320px] max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_60px_-10px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out z-[70] border border-stone-200/60 before:absolute before:-top-3 before:left-0 before:right-0 before:h-4 before:bg-transparent cursor-default",
                isResourcesOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 space-y-0.5">
                {RESOURCES.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center gap-3 group/item hover:bg-stone-50 px-3 py-3 rounded-xl transition-colors"
                    onClick={() => setIsResourcesOpen(false)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-stone-100/80 flex items-center justify-center flex-shrink-0 group-hover/item:bg-[#a64e2a]/10 transition-colors">
                      <item.icon className="w-4 h-4 text-stone-500 group-hover/item:text-[#a64e2a] transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-stone-800 font-medium text-[13px] group-hover/item:text-[#a64e2a] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-stone-400 text-[11px] leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {isUserOrGuest && (
          <Link
            href="/pricing"
            onMouseEnter={handleNavHover}
            className="px-3 py-1.5 text-sm font-medium transition-colors hidden lg:inline-flex text-[#544b47] hover:text-gray-900"
          >
            Pricing
          </Link>
        )}
      </>
    );
  };

  return (
    <header className="fixed w-full z-[60] top-0 left-0 right-0 geist-font border-b border-stone-200">
      {/* Main Navbar */}
      <nav className="w-full bg-[#fcfbf7]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex justify-between h-16 items-center">
            {/* Left: Branding + Nav Links */}
            <div className="flex items-center gap-10">
              {renderBranding()}

              {/* Desktop Navigation Links */}
              <div
                ref={navContainerRef}
                className="hidden lg:flex items-center gap-1 relative"
                onMouseLeave={handleNavLeave}
              >
                <div
                  className="absolute rounded-full bg-[#544b47]/10 pointer-events-none transition-all duration-300 ease-in-out"
                  style={{
                    left: pillStyle.left,
                    width: pillStyle.width,
                    opacity: pillStyle.opacity,
                    height: 32,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                {userData?.role !== "user" && renderNavigationLinks()}
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="lg:hidden flex justify-end">
              {userData?.role !== "user" ? (
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 text-gray-900"
                >
                  <Menu className="w-6 h-6" />
                </button>
              ) : (
                renderUserProfile()
              )}
            </div>

            {/* Right: Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {renderUserProfile()}

              {userData && userData.role !== "user" && !isInstalled ? (
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center h-fit text-nowrap text-xs gap-2 px-3 md:px-4 py-2 font-medium border rounded-lg transition-colors text-gray-900 border-gray-200 hover:bg-gray-100"
                >
                  <Download className="w-4 h-4" />
                </button>
              ) : null}

              {renderAuthButtons()}
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={cn(
            "fixed inset-0 z-[100] bg-[#fcfbf7] transition-transform duration-300 ease-in-out lg:hidden flex flex-col",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-stone-200 shrink-0">
            {renderBranding()}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-900 p-2"
            >
              <X className="w-8 h-8" />
            </button>
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-2">
            {isUserOrGuest && (
              <>
                {/* Products Accordion */}
                {/* <div className="border-b border-white/10 pb-2">
                  <button
                    onClick={() => toggleMobileSection('products')}
                    className="flex items-center justify-between w-full text-white font-medium text-lg py-3"
                  >
                    Products
                    <ChevronDown className={cn("w-5 h-5 transition-transform duration-200", expandedMobileSection === 'products' ? "rotate-180" : "")} />
                  </button>
                  <div className={cn("space-y-4 pl-2 overflow-hidden transition-all duration-300", expandedMobileSection === 'products' ? "max-h-[1000px] opacity-100 pb-4" : "max-h-0 opacity-0")}>
                    {PRODUCTS.map(item => (
                      <Link key={item.title} href={item.href} className="flex items-start gap-4 text-white/90 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                        <item.icon className="w-5 h-5 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-white/60 leading-snug">{item.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div> */}

                {/* Solutions Accordion */}
                <div className="border-b border-stone-200 pb-2">
                  <button
                    onClick={() => toggleMobileSection("solutions")}
                    className="flex items-center justify-between w-full text-gray-900 font-medium text-lg py-3"
                  >
                    Solutions
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 transition-transform duration-200",
                        expandedMobileSection === "solutions"
                          ? "rotate-180"
                          : "",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "space-y-6 pl-2 overflow-hidden transition-all duration-300",
                      expandedMobileSection === "solutions"
                        ? "max-h-[1000px] opacity-100 pb-4"
                        : "max-h-0 opacity-0",
                    )}
                  >
                    {/* Featured: Google Business */}
                    <Link
                      href="/solutions/google-business"
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#F4E0D0]/30 border border-[#B5581A]/10"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Globe className="w-5 h-5 text-[#B5581A]" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            Google Business Sync
                          </span>
                          <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded uppercase leading-none">
                            New
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          Sync menu to Google Maps
                        </span>
                      </div>
                    </Link>
                    {/* Roles */}
                    <div>
                      <h4 className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wider">
                        Roles
                      </h4>
                      <div className="space-y-3">
                        {SOLUTIONS_ROLES.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <item.icon className="w-4 h-4 text-[#B5581A]" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                    {/* Industries */}
                    <div>
                      <h4 className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wider">
                        Industries
                      </h4>
                      <div className="space-y-3">
                        {SOLUTIONS_INDUSTRIES.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <item.icon className="w-4 h-4 text-[#B5581A]" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resources Accordion */}
                <div className="border-b border-stone-200 pb-2">
                  <button
                    onClick={() => toggleMobileSection("resources")}
                    className="flex items-center justify-between w-full text-gray-900 font-medium text-lg py-3"
                  >
                    Resources
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 transition-transform duration-200",
                        expandedMobileSection === "resources"
                          ? "rotate-180"
                          : "",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "space-y-4 pl-2 overflow-hidden transition-all duration-300",
                      expandedMobileSection === "resources"
                        ? "max-h-[1000px] opacity-100 pb-4"
                        : "max-h-0 opacity-0",
                    )}
                  >
                    {RESOURCES.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-start gap-4 text-gray-700 hover:text-gray-900"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon className="w-5 h-5 mt-0.5 shrink-0 text-[#B5581A]" />
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-gray-500 leading-snug">
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Pricing Mobile Link */}
                <div className="border-b border-stone-200 pb-2">
                  <Link
                    href="/pricing"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between w-full text-gray-900 font-medium text-lg py-3"
                  >
                    Pricing
                  </Link>
                </div>
              </>
            )}
            {/* Mobile Auth Buttons */}
            <div className="pt-6 space-y-3">
              {!userData && (
                <div className="flex flex-col gap-3">
                  <ButtonV2
                    href="/get-started"
                    variant="primary"
                    className="w-full justify-center"
                  >
                    Start for free
                  </ButtonV2>
                  <ButtonV2
                    href="/login"
                    variant="secondary"
                    className="w-full justify-center"
                  >
                    Login
                  </ButtonV2>
                </div>
              )}
              {userData && (
                <UserAvatar
                  userData={userData}
                  align="left"
                  label="My Account"
                  className="text-gray-900 font-medium gap-4 hover:text-gray-700 py-2"
                />
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
