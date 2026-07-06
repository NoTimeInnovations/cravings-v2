"use client";

import React, { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UtensilsCrossed,
  ShoppingBag,
  Settings,
  BarChart3,
  ExternalLink,
  Globe,
  MessageCircle,
  AlertTriangle,
  Bike,
  Power,
  ArrowUpDown,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Partner, useAuthStore } from "@/store/authStore";
import { useAdminStore } from "@/store/adminStore";
import { isFreePlan } from "@/lib/getPlanLimits";
import { getFeatures } from "@/lib/getFeatures";
import { GET_SCAN_ANALYTICS } from "@/api/analytics";
import { GET_QR_CODES_BY_PARTNER } from "@/api/qrcodes";
import { useTourStore } from "@/store/tourStore";
import { DashboardTour } from "./tour/DashboardTour";
import { DESKTOP_TOUR_STEPS, MOBILE_TOUR_STEPS } from "./tour/tourSteps";
import { DashboardLiveOrders } from "./DashboardLiveOrders";
import WhatsAppDashboardCard from "./WhatsAppDashboardCard";
import DashboardGetStarted from "./DashboardGetStarted";

const tutorialVideos = [
  {
    id: 1,
    heading: "Menuthere Introduction",
    en: "https://www.youtube.com/embed/sYe3nYvTfKg?si=Y6E5RDZXkS_QAJ0i",
    ml: "https://www.youtube.com/embed/wQopuUXsinE?si=cUavmaoHl2yJdecw", // replace with Malayalam URL
  },
  {
    id: 2,
    heading: "How To Edit Your Menu",
    en: "https://www.youtube.com/embed/ztXhzY0HHPc?si=WcJ3ygE5unHGP90p",
    ml: "https://www.youtube.com/embed/5dEPMGvVkfs?si=TB48iafu3Qk_0PdL", // replace with Malayalam URL
  },
  {
    id: 3,
    heading: "Availability Management",
    en: "https://www.youtube.com/embed/rG8nOXMNHg8?si=kbqj5fL4EOEaQO3q",
    ml: "https://www.youtube.com/embed/hrjoah9f8NA?si=BpiBnXTPwF0jZEW_", // replace with Malayalam URL
  },
  {
    id: 4,
    heading: "Reordering Of Menu Items",
    en: "https://www.youtube.com/embed/J_Bfd1csfSk?si=SnYAxAgS_EfrIUZk",
    ml: "https://www.youtube.com/embed/J_Bfd1csfSk?si=SnYAxAgS_EfrIUZk", // replace with Malayalam URL
  },
];

interface QuickAction {
  title: string;
  icon: React.ElementType;
  view?: string;
  href?: string;
  onClick?: () => void;
}

// "Contact Us" opens WhatsApp support with a pre-filled message.
const SUPPORT_WHATSAPP_URL = `https://wa.me/917012944024?text=${encodeURIComponent(
  "Hi Menuthere team, I need support in Menuthere.",
)}`;

export function AdminV2Dashboard() {
  const { userData } = useAuthStore();
  const { setActiveView } = useAdminStore();
  const router = useRouter();
  const pathname = usePathname();
  const partner = userData as Partner;
  const planId = (userData as any)?.subscription_details?.plan?.id;
  const isOnFreePlan = isFreePlan(planId);

  const [monthlyScans, setMonthlyScans] = useState<number | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tutorialLang, setTutorialLang] = useState<"en" | "ml">("en");

  // Tour state
  const { hasSeenDashboardTour, startTour, initFromDb } = useTourStore();

  // Initialize tour state from DB
  useEffect(() => {
    if (partner?.id) {
      initFromDb(partner.id, !!partner.has_seen_tour);
    }
  }, [partner?.id, partner?.has_seen_tour, initFromDb]);

  useEffect(() => {
    if (!userData?.id) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const monthStart = new Date(startOfMonth(now));
        monthStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(now);
        dayEnd.setHours(23, 59, 59, 999);
        const start = monthStart.toISOString();
        const end = dayEnd.toISOString();

        const qrCodesRes = await fetchFromHasura(GET_QR_CODES_BY_PARTNER, {
          partner_id: userData.id,
        });
        const qrCodes = qrCodesRes?.qr_codes || [];

        if (qrCodes.length > 0) {
          setQrId(qrCodes[0].id);
          setStoreName(qrCodes[0].partner?.store_name || "");

          const ids = qrCodes.map((qr: any) => qr.id);
          const scanResult = await fetchFromHasura(GET_SCAN_ANALYTICS, {
            qr_ids: ids,
            startDate: start,
            endDate: end,
          });
          setMonthlyScans(scanResult?.total_scans?.aggregate?.count || 0);
        } else {
          setMonthlyScans(0);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setMonthlyScans(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData?.id]);

  // Start tour for first-time users
  useEffect(() => {
    if (!hasSeenDashboardTour && !loading) {
      const isMobile = window.innerWidth < 768;
      const totalSteps = isMobile
        ? MOBILE_TOUR_STEPS.length
        : DESKTOP_TOUR_STEPS.length;

      const timer = setTimeout(() => {
        startTour(totalSteps);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [hasSeenDashboardTour, loading, startTour]);

  const features = partner?.feature_flags
    ? getFeatures(partner.feature_flags || "")
    : null;

  const handleQuickAction = async (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      window.open(action.href, "_blank");
    } else if (action.view) {
      setActiveView(action.view);
    }
  };

  // Jump straight into a Menu sub-panel (availability / priority manager). We do
  // a SINGLE navigation that sets both view=Menu and the menuPanel param — and
  // intentionally do NOT call setActiveView here. Letting the admin page's read
  // effect derive the view from the URL avoids a race where its view→URL sync
  // would strip menuPanel before AdminV2Menu can read it.
  const openMenuPanel = (panel: "availability" | "priority") => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", "Menu");
    params.set("menuPanel", panel);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Deep-link into Settings → Integrations (WhatsApp Business is shown first).
  const openIntegrations = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", "Settings");
    params.set("sg", "integrations");
    params.set("ss", "integrations");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Deep-link into Settings → Ordering → Delivery (radius / timings / pricing).
  const openOrdering = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", "Settings");
    params.set("sg", "ordering");
    params.set("ss", "delivery");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const viewMenuHref = partner?.username
    ? `/${partner.username}`
    : qrId
      ? `/qrScan/${storeName?.replace(/ /g, "-")}/${qrId}`
      : `/hotels/${partner?.id}`;

  const allQuickActions: (QuickAction & { hidden?: boolean })[] = [
    {
      title: "Manage Orders",
      icon: ShoppingBag,
      view: "Orders",
      hidden:
        isOnFreePlan ||
        !(
          features?.ordering?.enabled ||
          features?.delivery?.enabled ||
          features?.pos?.enabled
        ),
    },
    { title: "Edit Menu", icon: UtensilsCrossed, view: "Menu" },
    { title: "Availability", icon: Power, onClick: () => openMenuPanel("availability") },
    { title: "Priority", icon: ArrowUpDown, onClick: () => openMenuPanel("priority") },
    { title: "Order Settings", icon: Bike, onClick: openOrdering },
    { title: "Settings", icon: Settings, view: "Settings" },
    { title: "Analytics", icon: BarChart3, view: "Analytics" },
    { title: "View Menu", icon: ExternalLink, href: viewMenuHref },
    {
      title: "View Website",
      icon: Globe,
      href: partner?.username ? `/${partner.username}/home` : "/",
    },
    { title: "Contact Us", icon: MessageCircle, href: SUPPORT_WHATSAPP_URL },
  ];

  const quickActions = allQuickActions.filter((a) => !a.hidden);

  // Porter bridge: warn if the feature is enabled but the partner hasn't
  // bound a Porter account yet. Without porter_mobile set (or a matching
  // partner.phone), dispatch silently fails on every "accepted" order.
  const porterBridgeFeature = getFeatures(partner?.feature_flags || null)
    .porter_bridge;
  const porterMobile = partner?.porter_mobile?.trim();
  const fallbackPhoneIsValid =
    !porterMobile &&
    typeof partner?.phone === "string" &&
    /^[6-9][0-9]{9}$/.test(partner.phone.replace(/\D+/g, "").slice(-10));
  const showPorterMobileWarning =
    porterBridgeFeature.access &&
    porterBridgeFeature.enabled &&
    !porterMobile &&
    !fallbackPhoneIsValid;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <DashboardTour />

      {/* Live orders pinned at the top — stays until each order is completed */}
      <DashboardLiveOrders />

      {showPorterMobileWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/40">
          <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
            <Bike className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-3.5 w-3.5" />
              Porter Bridge enabled — but no Porter account is linked
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
              Accepted orders will <strong>not</strong> dispatch a Porter rider
              until a valid 10-digit Indian mobile is saved here.{" "}
              <a
                href="https://deliverybridge.menuthere.com/accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2"
              >
                Onboard your Porter consumer account
              </a>{" "}
              first (OTP login from that phone), then set the same number on
              this partner profile.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
                onClick={() => setActiveView("Settings")}
              >
                Set Porter mobile
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-amber-800 hover:bg-amber-100 dark:text-amber-200"
                onClick={() =>
                  window.open(
                    "https://deliverybridge.menuthere.com/accounts",
                    "_blank",
                  )
                }
              >
                Open porter-bridge
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Business — connect CTA / verification reminder */}
      <WhatsAppDashboardCard partnerId={partner?.id} onOpen={openIntegrations} />

      {/* Get started — onboarding checklist to start receiving orders */}
      {partner?.id && (
        <DashboardGetStarted
          partner={partner}
          onConnectWhatsApp={openIntegrations}
          onOrderingDetails={openOrdering}
        />
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-bold tracking-tight mb-3">
          Quick Actions
        </h2>
        <div
          className=" grid grid-cols-4 sm:flex sm:flex-wrap gap-2"
          data-tour="quick-actions"
        >
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => handleQuickAction(action)}
              className="flex flex-col items-center justify-center gap-1.5 w-20 h-20 rounded-xl border bg-background hover:bg-muted transition-colors text-xs font-medium"
            >
              <action.icon className="h-5 w-5 text-orange-600 shrink-0" />
              <span className="text-center leading-tight">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Getting Started / Tutorials — temporarily commented out
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold tracking-tight">Tutorials</h2>
          <div className="flex items-center gap-1 rounded-lg border p-0.5 text-sm">
            <button
              onClick={() => setTutorialLang("en")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                tutorialLang === "en"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setTutorialLang("ml")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                tutorialLang === "ml"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              മലയാളം
            </button>
          </div>
        </div>
        <div
          className="grid gap-3 grid-cols-1 lg:grid-cols-4"
          data-tour="tutorials"
        >
          {tutorialVideos.map((tutorial) => (
            <Card
              key={tutorial.id}
              className="overflow-hidden group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src={tutorial[tutorialLang]}
                  title={tutorial.heading}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
      */}

    </div>
  );
}
