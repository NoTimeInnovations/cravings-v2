import { Button } from "@/components/ui/button";
import { Menu, Printer, RefreshCw, MoreVertical, Globe, Check } from "lucide-react";

import { useState } from "react";
import { SheetTrigger } from "@/components/ui/sheet";
import { AdminThemeToggle } from "./AdminThemeToggle";
import { AdminShopToggle } from "./AdminShopToggle";
import { useAdminTranslate } from "./AdminLanguageSwitcher";
import { MENU_LANGUAGES } from "@/lib/menuLanguages";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    // Google Translate bootstrap. Called here rather than in a child so the
    // widget loads with the navbar and the language list can live in the
    // overflow menu below.
    const { current: currentLang, setLang } = useAdminTranslate();
    // Printer settings only exist inside the wrapped app, and only for partners
    // whose plan includes an order surface to print from.
    const showPrinter =
        userData?.role === "partner" &&
        (() => {
            const f = getFeatures((userData as Partner).feature_flags || "");
            return (
                (f.ordering.access || f.delivery.access || f.pos.access) &&
                typeof window !== "undefined" &&
                window.localStorage?.getItem("isApp") === "true"
            );
        })();

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
            {/* Google Translate mounts its (hidden) widget here. Without this
                node TranslateElement throws on init and .goog-te-combo never
                exists, so picking a language would silently do nothing. */}
            <div id="admin_google_translate_element" className="hidden" aria-hidden="true" />
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
                {/* Refresh stays on the row with the store toggle: those two are the
                    controls a partner reaches for mid-service, and a reload buried
                    one tap deep is a reload they stop using when the feed looks
                    stale. */}
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
                {/* Light/dark, desktop only — see AdminThemeToggle. */}
                <div data-tour="dark-mode" className="hidden lg:flex">
                    <AdminThemeToggle label />
                </div>
                {!isFreePlan((userData as Partner)?.subscription_details?.plan?.id) && (
                    <div data-tour="notifications">
                        <OrderNotification />
                    </div>
                )}
                {/* Overflow: language and printer settings. Both are set-once
                    preferences, so a tap to reach them costs nothing.
                    Deliberately NOT in here: the notification bell, which carries a
                    live count of pending orders — burying that behind a menu is the
                    difference between seeing a new order and missing it. */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="More options" title="More">
                            <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Globe className="mr-2 h-4 w-4" />
                                Language
                                <span className="ml-auto text-xs font-semibold uppercase text-muted-foreground">
                                    {currentLang}
                                </span>
                            </DropdownMenuSubTrigger>
                            {/* notranslate: a language list rendered in the language
                                you are trying to leave is a one-way door. */}
                            <DropdownMenuSubContent
                                translate="no"
                                className="notranslate max-h-[60vh] overflow-y-auto"
                            >
                                {MENU_LANGUAGES.map((l) => (
                                    <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>
                                        {l.label}
                                        {currentLang === l.code && (
                                            <Check className="ml-auto h-4 w-4 text-orange-600" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {showPrinter && (
                            <DropdownMenuItem onClick={() => console.log("PRINTER SETTINGS OPEN")}>
                                <Printer className="mr-2 h-4 w-4" />
                                Printer Settings
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
                {userData?.role === 'partner' && (
                    <div data-tour="account-switcher">
                        <AdminAccountSwitcher />
                    </div>
                )}
            </div>
        </nav>
    );
}
