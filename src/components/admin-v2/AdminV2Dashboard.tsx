"use client";

import React, { useState, useEffect } from "react";
import { format, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  QrCode,
  UtensilsCrossed,
  ShoppingBag,
  Settings,
  BarChart3,
  ExternalLink,
  Lightbulb,
  Loader2,
  Download,
  MessageCircle,
} from "lucide-react";
import QRCodeLib from "qrcode";
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

const tips = [
  {
    title: "Add photos to your menu items",
    description:
      "Items with images get up to 70% more orders. Upload clear, well-lit photos to grab attention.",
  },
  {
    title: "Keep your menu updated",
    description:
      "Restaurants that update prices and availability weekly see 40% fewer order cancellations.",
  },
  {
    title: "Respond to orders quickly",
    description:
      "Accepting orders within 2 minutes boosts repeat customers by 35%. Speed builds trust.",
  },
];

interface QuickAction {
  title: string;
  icon: React.ElementType;
  view?: string;
  href?: string;
  onClick?: () => void;
}

export function AdminV2Dashboard() {
  const { userData } = useAuthStore();
  const { setActiveView } = useAdminStore();
  const partner = userData as Partner;
  const planId = (userData as any)?.subscription_details?.plan?.id;
  const isOnFreePlan = isFreePlan(planId);

  const [monthlyScans, setMonthlyScans] = useState<number | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tutorialLang, setTutorialLang] = useState<"en" | "ml">("en");

  // QR Dialog state
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(false);

  // Tour state
  const { hasSeenDashboardTour, startTour } = useTourStore();

  useEffect(() => {
    if (!userData?.id) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const start = format(startOfMonth(now), "yyyy-MM-dd'T'00:00:00'Z'");
        const end = format(now, "yyyy-MM-dd'T'23:59:59'Z'");

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

  const handleShowQr = async () => {
    if (!qrId) return;
    setIsQrDialogOpen(true);
    setQrLoading(true);
    try {
      const DOMAIN = "menuthere.com";
      const username = (userData as any)?.username;
      const url = username
        ? `https://${DOMAIN}/${username}`
        : `https://${DOMAIN}/qrScan/${storeName?.replace(/\s+/g, "-")}/${qrId}`;
      const dataUrl = await QRCodeLib.toDataURL(url, { width: 512, margin: 2 });
      setQrImageUrl(dataUrl);
    } catch {
      // silently fail
    } finally {
      setQrLoading(false);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      window.open(action.href, "_blank");
    } else if (action.view) {
      setActiveView(action.view);
    }
  };

  const allQuickActions: (QuickAction & { hidden?: boolean })[] = [
    ...(qrId
      ? [
          {
            title: "View Menu",
            icon: ExternalLink,
            href: partner?.username
              ? `/${partner.username}`
              : `/qrScan/${storeName?.replace(/ /g, "-")}/${qrId}`,
          },
          {
            title: "View QR",
            icon: QrCode,
            onClick: handleShowQr,
          },
        ]
      : []),

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
    { title: "Analytics", icon: BarChart3, view: "Analytics" },
    { title: "Settings", icon: Settings, view: "Settings" },
  ];

  const quickActions = allQuickActions.filter((a) => !a.hidden);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <DashboardTour />
      {/* Welcome Header + Monthly Scans */}
      <div
        className="rounded-xl border bg-muted/40 p-6 sm:p-8 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setActiveView("Analytics")}
      >
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Hey, {partner?.store_name || "there"} 👋
          </h1>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground mb-1">
            This Month&apos;s Scans
          </p>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-orange-500 ml-auto" />
          ) : (
            <div className="text-3xl font-bold tracking-tight">
              {monthlyScans}
            </div>
          )}
        </div>
      </div>

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

          <button
            onClick={() => window.open("https://wa.me/918590115462", "_blank")}
            className="flex flex-col items-center justify-center gap-1.5 w-20 h-20 rounded-xl border bg-background hover:bg-muted transition-colors text-xs font-medium"
          >
            <MessageCircle className="h-5 w-5 text-orange-600 shrink-0" />
            <span className="text-center leading-tight">Contact Us</span>
          </button>
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

      {/* Tips & Announcements */}
      <div>
        <h2 className="text-base font-bold tracking-tight mb-3">Tips</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {tips.map((tip, index) => (
            <Card key={index} className="transition-shadow hover:shadow-md">
              <CardContent className="flex gap-3 py-5">
                <div className="rounded-lg bg-muted p-2 shrink-0 h-fit">
                  <Lightbulb className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {tip.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* View QR Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Your QR Code</DialogTitle>
            <DialogDescription>Scan this to view your menu.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrLoading ? (
              <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            ) : qrImageUrl ? (
              <>
                <img
                  src={qrImageUrl}
                  alt="QR Code"
                  className="w-56 h-56 rounded-lg border"
                />
                <a
                  href={qrImageUrl}
                  download={`${partner?.store_name || "menu"}-qr.png`}
                  className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:underline"
                >
                  <Download className="h-4 w-4" /> Download QR
                </a>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Could not generate QR.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
