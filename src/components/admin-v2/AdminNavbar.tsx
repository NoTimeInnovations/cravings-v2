import { Button } from "@/components/ui/button";
import { Menu, Printer, RefreshCw } from "lucide-react";

import { useState } from "react";
import { SheetTrigger } from "@/components/ui/sheet";
import { AdminThemeToggle } from "./AdminThemeToggle";
import { AdminShopToggle } from "./AdminShopToggle";
import { AdminLanguageSwitcher } from "./AdminLanguageSwitcher";
import { Partner, useAuthStore } from "@/store/authStore";
import { OrderNotification } from "./OrderNotification";
import { getFeatures } from "@/lib/getFeatures";
import { isFreePlan } from "@/lib/getPlanLimits";
import { AdminAccountSwitcher } from "./AdminAccountSwitcher";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { usePOSStore } from "@/store/posStore";
import { confirmDialog } from "@/components/ui/confirm-dialog";

interface AdminNavbarProps {
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    onUpgrade?: () => void;
}

export function AdminNavbar({ onToggleSidebar, isSidebarOpen }: AdminNavbarProps) {
    const { userData } = useAuthStore();
    const [reloading, setReloading] = useState(false);

    // Hard reload, not an in-app refetch. The dashboard's state is spread across
    // ~10 independent zustand stores with no aggregate refetch, fetchUser() runs
    // once at boot, and the Hasura ws client (src/lib/hasuraSubscription.ts) is a
    // module-level singleton with no reconnect — once its socket dies the order
    // feed stays dead until the JS context is torn down. Reloading is the only
    // thing that resyncs all of it; ?view= is already in the URL so the user
    // lands back on the same tab.
    const handleReload = async () => {
        if (reloading) return;

        // The POS cart and unsaved settings live in memory only.
        const hasOpenBill = usePOSStore.getState().cartItems.length > 0;
        const hasUnsavedSettings = useAdminSettingsStore.getState().hasChanges;
        if (hasOpenBill || hasUnsavedSettings) {
            const what = hasOpenBill ? "an open bill" : "unsaved changes";
            if (!(await confirmDialog({
                title: "Discard and refresh?",
                description: `You have ${what}. Refreshing will discard it.`,
                confirmText: "Refresh anyway",
                destructive: true,
            }))) return;
        }

        setReloading(true);
        // Un-stick the button if the unload never happens (offline webview).
        setTimeout(() => setReloading(false), 8000);
        window.location.reload();
    };

    return (
        <nav className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
            <div className="flex items-center gap-4 min-w-0">
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
                <div className="flex items-center gap-2 hidden lg:flex min-w-0">
                    <img src="/menuthere-logo-new.png" alt="Menuthere" width={24} height={24} className="h-6 w-6 object-contain shrink-0" />
                    {/* A brand name is a proper noun — machine-translating
                        "Kerala Specials" helps nobody and makes the partner think
                        their store was renamed. */}
                    <span translate="no" className="notranslate text-xl font-bold text-orange-600 dark:text-orange-400 truncate">
                        {userData?.role === 'partner' ? (userData as Partner).store_name : "Menuthere"}
                    </span>
                    {userData?.role === 'partner' && (() => {
                        const planName = (userData as any)?.subscription_details?.plan?.name || "Free";
                        const isOnFreePlan = isFreePlan((userData as Partner)?.subscription_details?.plan?.id);

                        return (
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
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

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                {/* Open / close the store. Both breakpoints on purpose: it is a
                    twice-a-day action and burying it in Settings on a phone is
                    exactly the trip this is meant to save. Replaces the old
                    read-only "Store Closed" badge, which showed the same state
                    without being able to change it. */}
                <AdminShopToggle />
                <AdminLanguageSwitcher />
                {/* Light/dark, desktop only. On phones this sat in a very tight
                    row next to notifications, refresh and the account switcher;
                    the same control now lives among the dashboard quick actions,
                    where it has room for a label. lg: matches the sidebar
                    breakpoint used by the hamburger above, so exactly one of the
                    two is reachable at any width. */}
                <div data-tour="dark-mode" className="hidden lg:flex">
                    <AdminThemeToggle label />
                </div>
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
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReload}
                    disabled={reloading}
                    title="Refresh"
                    aria-label="Refresh"
                >
                    <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${reloading ? "animate-spin" : ""}`} />
                </Button>
                {userData?.role === 'partner' && (
                    <div data-tour="account-switcher">
                        <AdminAccountSwitcher />
                    </div>
                )}
            </div>
        </nav>
    );
}
