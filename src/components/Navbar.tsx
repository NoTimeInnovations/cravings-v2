"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  Download,
  ShoppingBag,
  Globe,
  Smartphone,
  Monitor,
  ClipboardList,
  Boxes,
  Megaphone,
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
  X
} from "lucide-react";

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
    href: "/product/digital-menu"
  },
  {
    title: "Own Delivery Website",
    description: "Commission-free delivery platform",
    icon: Globe,
    href: "/product/delivery-website"
  },
  {
    title: "Point Of Sale (POS)",
    description: "Manage billing and operations",
    icon: Monitor,
    href: "/product/pos"
  },
  {
    title: "Table Ordering",
    description: "Seamless dining experience for customers",
    icon: Smartphone,
    href: "/product/table-ordering"
  },
  {
    title: "Captain Ordering",
    description: "Efficient order taking for staff",
    icon: ClipboardList,
    href: "/product/captain-ordering"
  },
  {
    title: "Inventory & Purchase",
    description: "Track stock and manage suppliers",
    icon: Boxes,
    href: "/product/inventory-management"
  },
  {
    title: "Marketing",
    description: "Grow your business with tools",
    icon: Megaphone,
    href: "/product/marketing-tools"
  }
];

const SOLUTIONS_ROLES = [
  {
    title: "Owners",
    description: "Oversee operations and grow revenue",
    href: "/solutions/owners",
    icon: Briefcase
  },
  {
    title: "Agencies",
    description: "Manage multiple client accounts easily",
    href: "/solutions/agencies",
    icon: Building2
  },
  {
    title: "Digital Marketers",
    description: "Drive engagement and track conversions",
    href: "/solutions/marketers",
    icon: TrendingUp
  },
  {
    title: "Part Time Workers",
    description: "Flexible shifts and earnings tracking",
    href: "/solutions/workers",
    icon: Users
  }
];

const SOLUTIONS_INDUSTRIES = [
  {
    title: "Food & Beverage",
    description: "Streamline orders and inventory",
    href: "/solutions/fnb",
    icon: Utensils
  },
  {
    title: "Hotels & Resorts",
    description: "Enhance guest in-room dining",
    href: "/solutions/hotels",
    icon: Hotel
  },
  {
    title: "Online & Retailers",
    description: "Expand your digital presence",
    href: "/solutions/retail",
    icon: ShoppingCart
  }
];

const RESOURCES = [
  {
    title: "About Us",
    description: "Learn more about our company",
    href: "/about-us",
    icon: Users
  },
  {
    title: "Blogs",
    description: "Read our latest articles and updates",
    href: "/blogs",
    icon: BookOpen
  },
  {
    title: "Help Center",
    description: "Get support and find answers",
    href: "/help-center",
    icon: HelpCircle
  },
  {
    title: "Download App",
    description: "Get the app for iOS and Android",
    href: "/download-app",
    icon: Download
  }
];

const HIDDEN_PATHS = [
  "/hotels/[id]/reviews/new",
  "/hotels/[id]/reviews",
  "/hotels/[id]/menu/[mId]/reviews/new",
  "/hotels/[id]/menu/[mId]/reviews",
  "/captain",
  "/bill/[id]",
  "/kot/[id]",
  "/qrScan/DOWNTREE/[id]",
  "/hotels/DOWNTREE/4ba747b0-827c-48de-b148-70e7a573564a",
  "/whatsappQr/[id]",
  "/get-started",
  "/admin-v2/.*",
  "/admin-v2",
  "/pricing"
];

export function Navbar({ userData, country }: { userData: any; country?: string }) {
  const features = getFeatures(userData?.feature_flags as string);
  const router = useRouter();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const currentPath = pathname.split("?")[0];
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileSection, setExpandedMobileSection] = useState<string | null>(null);

  const toggleMobileSection = (section: string) => {
    setExpandedMobileSection(expandedMobileSection === section ? null : section);
  };

  const isProductPage = pathname.startsWith("/product/");
  const isDarkText = !isScrolled && isProductPage;

  useEffect(() => {
    const isApp = window?.localStorage.getItem("isApp");
    if (isApp === "true") {
      setIsInstalled(true);
    } else {
      setIsInstalled(false);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      toast.info(
        "To install the app on iOS:\n1. Tap the Share button\n2. Scroll down and tap 'Add to Home Screen'",
        { duration: 5000 }
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
        "(display-mode: standalone)"
      ).matches;
      if (isStandalone) {
        window.location.reload();
      } else {
        toast.info(
          "To install the app:\n1. Open your browser menu\n2. Look for 'Install App' or 'Add to Home Screen'\n3. Follow the prompts to install",
          { duration: 5000 }
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
    <div
      className="flex items-center space-x-2 cursor-pointer"
      onClick={() => (isHomePage ? null : router.back())}
    >
      <UtensilsCrossed className="h-6 w-6 text-orange-500" />
      <span className={cn("text-2xl font-bold tracking-tight lowercase transition-colors", isDarkText ? "text-gray-900" : "text-white")}>
        cravings
      </span>
    </div>
  );

  const renderAuthButtons = () => {
    if (!userData) {
      return (
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={cn(
              "hidden sm:inline-flex items-center justify-center h-fit text-nowrap text-sm px-4 py-2 font-medium border rounded-md transition-colors",
              isDarkText
                ? "text-gray-900 border-gray-200 hover:bg-gray-100"
                : "text-white border-white hover:bg-white/10"
            )}
          >
            Log In
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center h-fit text-nowrap text-sm px-4 py-2 font-medium text-white bg-[#0a0b10] rounded-md hover:bg-gray-900 transition-colors"
          >
            Book Demo
          </Link>
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

    const isUserOrGuest = userData?.role === "user" || !userData?.role;
    const showIndiaLinks = country === "IN";

    return (
      <>
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "items-center px-3 py-1 text-sm transition-colors hidden lg:inline-flex",
              currentPath === link.href
                ? (isDarkText ? "text-gray-900 font-medium" : "text-white font-medium")
                : (isDarkText ? "text-gray-500 hover:text-gray-900 font-medium" : "text-gray-400 hover:text-gray-200 font-medium")
            )}
          >
            {link.label}
          </Link>
        ))}

        {isUserOrGuest && showIndiaLinks && (
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
              <span className={cn(
                "absolute -bottom-2 left-0 w-full h-[1.5px] rounded-full transition-all duration-300 ease-out origin-left",
                isDarkText ? "bg-gray-900" : "bg-white",
                isProductsOpen ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
              )} />
            </span>

            {/* Mega Menu Dropdown */}
            <div
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
        )}

        {isUserOrGuest && showIndiaLinks && (
          <div
            className={cn(
              "relative px-3 py-1 text-sm font-medium cursor-pointer hidden lg:inline-flex items-center gap-1 transition-colors",
              isDarkText ? "text-gray-700 hover:text-gray-900" : "text-white"
            )}
            onMouseEnter={() => setIsSolutionsOpen(true)}
            onMouseLeave={() => setIsSolutionsOpen(false)}
            onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
          >
            <span className={cn(
              "flex items-center gap-1 transition-colors relative",
              isDarkText ? "text-gray-900" : "text-white"
            )}>
              Solutions
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isSolutionsOpen ? "rotate-180" : "")} />

              {/* Custom Underline */}
              <span className={cn(
                "absolute -bottom-2 left-0 w-full h-[1.5px] rounded-full transition-all duration-300 ease-out origin-left",
                isDarkText ? "bg-gray-900" : "bg-white",
                isSolutionsOpen ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
              )} />
            </span>

            {/* Mega Menu Dropdown */}
            <div
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[600px] bg-white rounded-xl shadow-xl p-6 transition-all duration-200 z-[70] border border-gray-100 before:absolute before:-top-2 before:left-0 before:right-0 before:h-4 before:bg-transparent cursor-default",
                isSolutionsOpen ? "opacity-100 visible" : "opacity-0 invisible"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-2 gap-x-12">
                {/* Roles Column */}
                <div className="space-y-4">
                  <h4 className="text-gray-900 font-medium text-base px-2">Roles</h4>
                  <div className="space-y-2">
                    {SOLUTIONS_ROLES.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-start gap-3 group/item hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={() => setIsSolutionsOpen(false)}
                      >
                        <div className="mt-0.5">
                          <item.icon className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-gray-900 font-semibold text-sm group-hover/item:text-orange-600 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Industries Column */}
                <div className="space-y-4">
                  <h4 className="text-gray-900 font-medium text-base px-2">Industries</h4>
                  <div className="space-y-2">
                    {SOLUTIONS_INDUSTRIES.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-start gap-3 group/item hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={() => setIsSolutionsOpen(false)}
                      >
                        <div className="mt-0.5">
                          <item.icon className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-gray-900 font-semibold text-sm group-hover/item:text-orange-600 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div >
        )
        }

        {isUserOrGuest && showIndiaLinks && (
          <div
            className={cn(
              "relative px-3 py-1 text-sm font-medium cursor-pointer hidden lg:inline-flex items-center gap-1 transition-colors",
              isDarkText ? "text-gray-700 hover:text-gray-900" : "text-white"
            )}
            onMouseEnter={() => setIsResourcesOpen(true)}
            onMouseLeave={() => setIsResourcesOpen(false)}
            onClick={() => setIsResourcesOpen(!isResourcesOpen)}
          >
            <span className={cn(
              "flex items-center gap-1 transition-colors relative",
              isDarkText ? "text-gray-900" : "text-white"
            )}>
              Resources
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isResourcesOpen ? "rotate-180" : "")} />

              {/* Custom Underline */}
              <span className={cn(
                "absolute -bottom-2 left-0 w-full h-[1.5px] rounded-full transition-all duration-300 ease-out origin-left",
                isDarkText ? "bg-gray-900" : "bg-white",
                isResourcesOpen ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
              )} />
            </span>

            {/* Mega Menu Dropdown */}
            <div
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[600px] bg-white rounded-xl shadow-xl p-6 transition-all duration-200 z-[70] border border-gray-100 before:absolute before:-top-2 before:left-0 before:right-0 before:h-4 before:bg-transparent cursor-default",
                isResourcesOpen ? "opacity-100 visible" : "opacity-0 invisible"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {RESOURCES.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-start gap-4 group/item hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                    onClick={() => setIsResourcesOpen(false)}
                  >
                    <div className="mt-1">
                      <item.icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-semibold text-sm group-hover/item:text-orange-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {isUserOrGuest && showIndiaLinks && (
          <Link
            href="/pricing"
            className={cn(
              "px-3 py-1 text-sm font-medium transition-colors hidden lg:inline-flex",
              isDarkText ? "text-gray-700 hover:text-gray-900" : "text-white hover:text-white/80"
            )}
          >
            Pricing
          </Link>
        )}
      </>
    );
  };

  return (
    <header className="fixed w-full z-[60] top-0 left-0 right-0 font-sans">
      {/* Announcement Bar */}
      <div
        className={cn(
          "w-full bg-[#0a0b10] text-[#e0e0e0] text-xs sm:text-sm text-center px-4 leading-tight transition-all duration-300 ease-in-out overflow-hidden origin-top",
          isScrolled ? "max-h-0 py-0 opacity-0" : "max-h-12 py-2.5 opacity-100"
        )}
      >
        Announcement: Now earn 2% interest on all CAD & USD balances across all plans!{" "}
        <span className="text-orange-500 cursor-pointer hover:underline font-medium ml-1">
          Learn more.
        </span>
      </div>

      {/* Main Navbar */}
      <nav
        className={cn(
          "w-full border-b transition-all duration-300",
          isScrolled ? "bg-[#C04812] shadow-sm border-transparent" : "bg-transparent border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-16 items-center">
            {/* Left: Branding */}
            <div className="flex-1 flex justify-start">
              {renderBranding()}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="lg:hidden flex justify-end">
              <button onClick={() => setIsMobileMenuOpen(true)} className={cn("p-2", isDarkText ? "text-gray-900" : "text-white")}>
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Center: Navigation Links */}
            <div className="hidden lg:flex flex-1 justify-center items-center space-x-6 lg:space-x-8">
              {renderNavigationLinks()}
            </div>

            {/* Right: Actions */}
            <div className="hidden lg:flex flex-1 items-center justify-end gap-4">
              {userData?.role === "user" ? (
                <Link href="/my-orders">
                  <ShoppingBag className={cn("w-5 h-5 transition-colors", isDarkText ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-white")} />
                </Link>
              ) : null}

              {renderUserProfile()}

              {userData && !isInstalled ? (
                <button
                  onClick={handleInstallClick}
                  className={cn(
                    "inline-flex items-center h-fit text-nowrap text-xs gap-2 px-3 md:px-4 py-2 font-medium border rounded-lg transition-colors",
                    isDarkText
                      ? "text-gray-900 border-gray-200 hover:bg-gray-100"
                      : "text-white border-white/20 hover:bg-white/10"
                  )}
                >
                  <Download className="w-4 h-4" />
                </button>
              ) : null}

              {renderAuthButtons()}
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <div className={cn(
          "fixed inset-0 z-[100] bg-[#C04812] transition-transform duration-300 ease-in-out lg:hidden flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-white/10 shrink-0">
            {renderBranding()}
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-white p-2">
              <X className="w-8 h-8" />
            </button>
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-2">
            {/* Products Accordion */}
            <div className="border-b border-white/10 pb-2">
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
            </div>

            {/* Solutions Accordion */}
            <div className="border-b border-white/10 pb-2">
              <button
                onClick={() => toggleMobileSection('solutions')}
                className="flex items-center justify-between w-full text-white font-medium text-lg py-3"
              >
                Solutions
                <ChevronDown className={cn("w-5 h-5 transition-transform duration-200", expandedMobileSection === 'solutions' ? "rotate-180" : "")} />
              </button>
              <div className={cn("space-y-6 pl-2 overflow-hidden transition-all duration-300", expandedMobileSection === 'solutions' ? "max-h-[1000px] opacity-100 pb-4" : "max-h-0 opacity-0")}>
                {/* Roles */}
                <div>
                  <h4 className="text-white/50 text-xs font-bold mb-3 uppercase tracking-wider">Roles</h4>
                  <div className="space-y-3">
                    {SOLUTIONS_ROLES.map(item => (
                      <Link key={item.title} href={item.href} className="flex items-center gap-3 text-white/90 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                {/* Industries */}
                <div>
                  <h4 className="text-white/50 text-xs font-bold mb-3 uppercase tracking-wider">Industries</h4>
                  <div className="space-y-3">
                    {SOLUTIONS_INDUSTRIES.map(item => (
                      <Link key={item.title} href={item.href} className="flex items-center gap-3 text-white/90 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Resources Accordion */}
            <div className="border-b border-white/10 pb-2">
              <button
                onClick={() => toggleMobileSection('resources')}
                className="flex items-center justify-between w-full text-white font-medium text-lg py-3"
              >
                Resources
                <ChevronDown className={cn("w-5 h-5 transition-transform duration-200", expandedMobileSection === 'resources' ? "rotate-180" : "")} />
              </button>
              <div className={cn("space-y-4 pl-2 overflow-hidden transition-all duration-300", expandedMobileSection === 'resources' ? "max-h-[1000px] opacity-100 pb-4" : "max-h-0 opacity-0")}>
                {RESOURCES.map(item => (
                  <Link key={item.title} href={item.href} className="flex items-start gap-4 text-white/90 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                    <item.icon className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-white/60 leading-snug">{item.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pricing Mobile Link */}
            <div className="border-b border-white/10 pb-2">
              <Link
                href="/pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between w-full text-white font-medium text-lg py-3"
              >
                Pricing
              </Link>
            </div>

            {/* Mobile Auth Buttons */}
            <div className="pt-6 space-y-4">
              {!userData && (
                <>
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center py-3 text-white font-medium text-lg border border-white rounded-lg hover:bg-white/10 transition-colors">Log In</Link>
                  <Link href="/demo" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center py-3 text-white font-medium text-lg bg-black rounded-lg hover:bg-gray-900 transition-colors">Book Demo</Link>
                </>
              )}
              {userData && (
                <div className="flex items-center gap-4">
                  <UserAvatar userData={userData} />
                  <span className="text-white font-medium">My Account</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </nav>
    </header>
  );
}
