import { Button } from "@/components/ui/button";
import { Menu, Printer, RefreshCw, MoreVertical, Globe, Check, Bell, ChevronDown } from "lucide-react";

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
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Partner, useAuthStore } from "@/store/authStore";
import { OrderNotification } from "./OrderNotification";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
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
    const showNotifications = !isFreePlan((userData as Partner)?.subscription_details?.plan?.id);
    // The bell now lives in the overflow menu, so the sheet is opened from a
    // menu item and its state has to live out here.
    const [notifOpen, setNotifOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    // Pending count is mirrored onto the menu button. Burying a live order alert
    // behind a menu would otherwise mean a new order is invisible until someone
    // opens it — the badge keeps the glanceable part on the row.
    const pendingCount = useOrderSubscriptionStore((st) =>
        st.orders.filter((o) => o.status === "pending").length,
    );
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
            <div className="flex items-center gap-1 sm:gap-3 min-w-0">
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" data-tour="hamburger-menu">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>
                </SheetTrigger>
                <Button variant="ghost" size="icon" className="hidden h-8 w-8 lg:flex" onClick={onToggleSidebar} data-tour="hamburger-menu">
                    <Menu className="h-5 w-5" />
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

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
                    className="h-8 w-8"
                    onClick={handleReload}
                    disabled={reloading}
                    title="Refresh"
                    aria-label="Refresh"
                >
                    <RefreshCw className={`h-[18px] w-[18px] text-gray-600 dark:text-gray-400 ${reloading ? "animate-spin" : ""}`} />
                </Button>
                {/* Light/dark, desktop only — see AdminThemeToggle. */}
                <div data-tour="dark-mode" className="hidden lg:flex">
                    <AdminThemeToggle label />
                </div>
                {/* Overflow: language and printer settings. Both are set-once
                    preferences, so a tap to reach them costs nothing.
                    Deliberately NOT in here: the notification bell, which carries a
                    live count of pending orders — burying that behind a menu is the
                    difference between seeing a new order and missing it. */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative h-8 w-8"
                            aria-label={pendingCount > 0 ? `More options (${pendingCount} pending orders)` : "More options"}
                            title="More"
                        >
                            <MoreVertical className="h-[18px] w-[18px] text-gray-600 dark:text-gray-400" />
                            {showNotifications && pendingCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} collisionPadding={8} className="max-h-[75vh] w-56 overflow-y-auto">
                        {showNotifications && (
                            <DropdownMenuItem onClick={() => setNotifOpen(true)}>
                                <Bell className="mr-2 h-4 w-4" />
                                Pending orders
                                {pendingCount > 0 && (
                                    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                        {pendingCount}
                                    </span>
                                )}
                            </DropdownMenuItem>
                        )}
                        {/* Inline expander, not a Radix submenu: a submenu is a side
                            flyout, and on a phone there is no side to fly out to —
                            the language list rendered half off the left edge.
                            onSelect is prevented so picking "Language" expands the
                            list instead of closing the whole menu. */}
                        <DropdownMenuItem
                            onSelect={(e) => {
                                e.preventDefault();
                                setLangOpen((o) => !o);
                            }}
                        >
                            <Globe className="mr-2 h-4 w-4" />
                            Language
                            <span className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                                {currentLang}
                                <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`}
                                />
                            </span>
                        </DropdownMenuItem>
                        {langOpen && (
                            /* notranslate: a language list rendered in the language
                               you are trying to leave is a one-way door. */
                            <div translate="no" className="notranslate max-h-56 overflow-y-auto">
                                {MENU_LANGUAGES.map((l) => (
                                    <DropdownMenuItem
                                        key={l.code}
                                        className="pl-8"
                                        onClick={() => setLang(l.code)}
                                    >
                                        {l.label}
                                        {currentLang === l.code && (
                                            <Check className="ml-auto h-4 w-4 text-orange-600" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        )}
                        {showPrinter && (
                            <DropdownMenuItem onClick={() => console.log("PRINTER SETTINGS OPEN")}>
                                <Printer className="mr-2 h-4 w-4" />
                                Printer Settings
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
                {showNotifications && (
                    <div data-tour="notifications">
                        <OrderNotification open={notifOpen} onOpenChange={setNotifOpen} hideTrigger />
                    </div>
                )}
                {userData?.role === 'partner' && (
                    <div data-tour="account-switcher">
                        <AdminAccountSwitcher />
                    </div>
                )}
            </div>
        </nav>
    );
}
