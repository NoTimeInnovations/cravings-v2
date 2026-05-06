"use client";

import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  Settings,
  UserCog,
  QrCode,
  LifeBuoy,
  Percent,
  CreditCard,
  Crown,
  Receipt,
  Truck,
  Users,
  Bell,
  Star,
  Globe,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { isFreePlan } from "@/lib/getPlanLimits";

interface SidebarItem {
  title: string;
  icon: React.ElementType;
  id: string;
}

const sidebarItems: SidebarItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { title: "Analytics", icon: BarChart3, id: "analytics" },
  { title: "Orders", icon: ShoppingBag, id: "orders" },
  { title: "Reviews", icon: Star, id: "reviews" },
  { title: "Menu", icon: UtensilsCrossed, id: "menu" },
  { title: "Offers", icon: Percent, id: "offers" },
  { title: "Notices", icon: Bell, id: "notices" },
  { title: "Notify", icon: Megaphone, id: "notify" },
  { title: "Purchase & Inventory", icon: ShoppingBag, id: "inventory" },
  { title: "QrCodes", icon: QrCode, id: "qrcodes" },
  { title: "Captains", icon: UserCog, id: "captains" },
  { title: "Delivery Boys", icon: Truck, id: "deliveryboys" },
  { title: "POS", icon: CreditCard, id: "pos" },
  { title: "Customers", icon: Users, id: "customers" },
  { title: "Website", icon: Globe, id: "website" },
  { title: "Settings", icon: Settings, id: "settings" },
  { title: "Billing", icon: Receipt, id: "billing" },
];

// Items that are locked for free plan users
const FREE_PLAN_LOCKED_IDS = [
  "captains",
  "pos",
  "inventory",
  "orders",
  "qrcodes",
  "deliveryboys",
  "customers",
  "reviews",
];

interface AdminSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onUpgrade?: () => void;
  className?: string;
}

export function AdminSidebar({
  activeView,
  onNavigate,
  onUpgrade,
  className,
}: AdminSidebarProps) {
  const { features, userData } = useAuthStore();
  const planId = (userData as any)?.subscription_details?.plan?.id;
  const isOnFreePlan = isFreePlan(planId);

  const getItemState = (item: SidebarItem): "visible" | "locked" | "hidden" => {
    if (isOnFreePlan) {
      if (FREE_PLAN_LOCKED_IDS.includes(item.id)) {
        return "hidden";
      }
      return "visible";
    }

    // Original feature flag filtering for paid plans
    if (item.id === "captains") {
      return features?.captainordering?.enabled ? "visible" : "hidden";
    }
    if (item.id === "deliveryboys") {
      return features?.delivery?.enabled ? "visible" : "hidden";
    }
    if (item.id === "orders") {
      return features?.ordering?.enabled ||
        features?.delivery?.enabled ||
        features?.pos?.enabled
        ? "visible"
        : "hidden";
    }
    if (item.id === "pos") {
      return features?.pos?.enabled ? "visible" : "hidden";
    }
    if (item.id === "inventory") {
      return features?.purchasemanagement?.enabled ? "visible" : "hidden";
    }
    if (item.id === "customers") {
      return features?.ordering?.enabled || features?.delivery?.enabled
        ? "visible"
        : "hidden";
    }
    if (item.id === "reviews") {
      return features?.ordering?.enabled || features?.delivery?.enabled
        ? "visible"
        : "hidden";
    }
    return "visible";
  };

  const visibleItems = sidebarItems.filter(
    (item) => getItemState(item) !== "hidden",
  );

  return (
    <div
      className={cn("flex flex-col h-full py-4", className)}
      data-tour="sidebar"
    >
      <div className="px-3 py-2">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            return (
              <Button
                key={item.id}
                variant={activeView === item.title ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeView === item.title &&
                    "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 font-medium",
                )}
                onClick={() => onNavigate(item.title)}
              >
                <item.icon
                  className={cn(
                    "mr-2 h-4 w-4",
                    activeView === item.title &&
                      "text-orange-600 dark:text-orange-400",
                  )}
                />
                {item.title}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto px-3 py-4 border-t border-border space-y-1">
        {isOnFreePlan && onUpgrade && (
          <Button
            variant="default"
            className="hidden lg:flex w-full justify-start bg-orange-600 hover:bg-orange-700 text-white font-medium"
            onClick={onUpgrade}
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        )}
        <Button
          variant={activeView === "Help & Support" ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start text-muted-foreground",
            activeView === "Help & Support" &&
              "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 font-medium",
          )}
          onClick={() => onNavigate("Help & Support")}
        >
          <LifeBuoy
            className={cn(
              "mr-2 h-4 w-4",
              activeView === "Help & Support" &&
                "text-orange-600 dark:text-orange-400",
            )}
          />
          Help & Support
        </Button>
      </div>
    </div>
  );
}
