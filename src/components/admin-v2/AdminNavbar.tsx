import { Button } from "@/components/ui/button";
import { Menu, Printer, Crown } from "lucide-react";

import { SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { Partner, useAuthStore } from "@/store/authStore";
import { OrderNotification } from "./OrderNotification";
import { getFeatures } from "@/lib/getFeatures";
import { isFreePlan } from "@/lib/getPlanLimits";
import { AdminAccountSwitcher } from "./AdminAccountSwitcher";

interface AdminNavbarProps {
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    onUpgrade?: () => void;
}

export function AdminNavbar({ onToggleSidebar, isSidebarOpen, onUpgrade }: AdminNavbarProps) {
    const { userData } = useAuthStore();
    const planId = (userData as any)?.subscription_details?.plan?.id;
    const isOnFreePlan = isFreePlan(planId);

    return (
        <nav className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
            <div className="flex items-center gap-4">
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden" data-tour="hamburger-menu">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>
                </SheetTrigger>
                <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={onToggleSidebar} data-tour="hamburger-menu">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle sidebar</span>
                </Button>
                <div className="flex items-center gap-2 hidden lg:flex">
                    <img src="/menuthere-logo-new.png" alt="Menuthere" width={24} height={24} className="h-6 w-6 object-contain" />
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {userData?.role === 'partner' ? (userData as Partner).store_name : "Menuthere"}
                    </span>
                    {userData?.role === 'partner' && (() => {
                        const planName = (userData as any)?.subscription_details?.plan?.name || "Free";
                        const isOnFreePlan = isFreePlan((userData as Partner)?.subscription_details?.plan?.id);

                        return (
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                isOnFreePlan
                                    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            }`}>
                                {planName}
                            </span>
                        );
                    })()}
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                {userData?.role === 'partner' && isOnFreePlan && onUpgrade && (
                    <Button
                        variant="default"
                        size="sm"
                        className="lg:hidden bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-full"
                        onClick={onUpgrade}
                    >
                        <Crown className="h-4 w-4 mr-1.5" />
                        Upgrade
                    </Button>
                )}
                {userData?.role === 'partner' && !(userData as Partner).is_shop_open && (
                    <div className="hidden sm:flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full border border-red-200 dark:border-red-800 animate-pulse">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Store Closed
                    </div>
                )}
                {userData?.role === 'partner' && (() => {
                    const features = getFeatures((userData as Partner).feature_flags || "");
                    const hasPrintingFeatures = features.ordering.access || features.delivery.access || features.pos.access;
                    const isApp = window?.localStorage?.getItem("isApp") === "true";

                    if (hasPrintingFeatures && isApp) {
                        return (
                            <Button
                                variant="ghost"
                                size="icon"
                                className=""
                                onClick={() => console.log("PRINTER SETTINGS OPEN")}
                                title="Printer Settings"
                            >
                                <Printer className="h-5 w-5" />
                            </Button>
                        );
                    }
                    return null;
                })()}
                {!isFreePlan((userData as Partner)?.subscription_details?.plan?.id) && (
                    <div data-tour="notifications">
                        <OrderNotification />
                    </div>
                )}
                <div data-tour="dark-mode">
                    <ModeToggle />
                </div>
                {userData?.role === 'partner' && (
                    <div data-tour="account-switcher">
                        <AdminAccountSwitcher />
                    </div>
                )}
            </div>
        </nav>
    );
}
