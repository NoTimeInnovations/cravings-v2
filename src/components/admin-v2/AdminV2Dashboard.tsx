"use client";

import React, { useState, useEffect } from "react";
import { format, startOfMonth } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  UtensilsCrossed,
  ShoppingBag,
  Settings,
  BarChart3,
  ExternalLink,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Partner, useAuthStore } from "@/store/authStore";
import { useAdminStore } from "@/store/adminStore";
import { isFreePlan } from "@/lib/getPlanLimits";
import { getFeatures } from "@/lib/getFeatures";
import { GET_SCAN_ANALYTICS } from "@/api/analytics";
import { GET_QR_CODES_BY_PARTNER } from "@/api/qrcodes";

const tutorialVideos = [
  {
    id: 1,
    heading: "How to do restaurant login",
    videoUrl: "https://www.youtube.com/embed/UGyePyi8hQU?si=rjglx2JlKMGDXJH7",
  },
  {
    id: 2,
    heading: "Advanced React Patterns",
    videoUrl: "https://www.youtube.com/embed/UGyePyi8hQU?si=rjglx2JlKMGDXJH7",
  },
];

const tips = [
  {
    title: "Set up your menu",
    description: "Add your items and categories to start receiving orders from customers.",
  },
  {
    title: "Share your QR code",
    description: "Print and place QR codes at your tables to let customers scan and order.",
  },
  {
    title: "Enable delivery",
    description: "Expand your reach by enabling delivery orders for your restaurant.",
  },
];

interface QuickAction {
  title: string;
  icon: React.ElementType;
  view?: string;
  href?: string;
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

  useEffect(() => {
    if (!userData?.id) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const start = format(startOfMonth(now), "yyyy-MM-dd'T'00:00:00'Z'");
        const end = format(now, "yyyy-MM-dd'T'23:59:59'Z'");

        const qrCodesRes = await fetchFromHasura(GET_QR_CODES_BY_PARTNER, { partner_id: userData.id });
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

  const features = partner?.feature_flags ? getFeatures(partner.feature_flags || "") : null;

  const allQuickActions: (QuickAction & { hidden?: boolean })[] = [
    ...(qrId
      ? [{
          title: "View Menu",
          icon: ExternalLink,
          href: partner?.username ? `/${partner.username}` : `/qrScan/${storeName?.replace(/ /g, "-")}/${qrId}`,
        }]
      : []),
    {
      title: "Manage Orders",
      icon: ShoppingBag,
      view: "Orders",
      hidden: isOnFreePlan || !(features?.ordering?.enabled || features?.delivery?.enabled || features?.pos?.enabled),
    },
    { title: "Edit Menu", icon: UtensilsCrossed, view: "Menu" },
    {
      title: "QR Codes",
      icon: QrCode,
      view: "QrCodes",
      hidden: isOnFreePlan,
    },
    { title: "Analytics", icon: BarChart3, view: "Analytics" },
    { title: "Settings", icon: Settings, view: "Settings" },
  ];

  const quickActions = allQuickActions.filter((a) => !a.hidden);

  const handleQuickAction = async (action: QuickAction) => {
    if (action.href) {
      window.open(action.href, "_blank");
    } else if (action.view) {
      setActiveView(action.view);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {partner?.store_name || "there"}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Monthly Scans Stat */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView("Analytics")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month&apos;s Scans</CardTitle>
          <QrCode className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
          ) : (
            <div className="text-2xl font-bold">{monthlyScans}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Tap to view full analytics
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Card
              key={action.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleQuickAction(action)}
            >
              <CardContent className="flex flex-col items-center justify-center py-6 gap-2">
                <action.icon className="h-6 w-6 text-orange-600" />
                <span className="text-sm font-medium text-center">{action.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Getting Started / Tutorials */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tutorials</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tutorialVideos.map((tutorial) => (
            <Card key={tutorial.id} className="overflow-hidden">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src={tutorial.videoUrl}
                  title={tutorial.heading}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <CardContent className="pt-3 pb-4">
                <p className="font-medium text-sm">{tutorial.heading}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tips & Announcements */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tips</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {tips.map((tip, index) => (
            <Card key={index}>
              <CardContent className="flex gap-3 py-4">
                <Lightbulb className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
