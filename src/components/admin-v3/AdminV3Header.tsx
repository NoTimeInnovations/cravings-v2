"use client";

import * as React from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Globe,
  Menu,
  Moon,
  MoreVertical,
  Printer,
  RefreshCw,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";
import { useOrderSubscriptionStore } from "@/store/orderSubscriptionStore";
import { getFeatures } from "@/lib/getFeatures";
import { isFreePlan } from "@/lib/getPlanLimits";
import { MENU_LANGUAGES } from "@/lib/menuLanguages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminTranslate } from "@/components/admin-v2/AdminLanguageSwitcher";
import { PendingOrdersSheet } from "./dashboard/PendingOrdersSheet";
import { StoreToggle } from "./ui/StoreToggle";

const ICON_BUTTON =
  "flex h-[34px] items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

/**
 * The dashboard header — ONE bar at every width.
 *
 * It used to be two: a mobile-only identity bar stacked above the real header.
 * That cost a whole row of vertical space on the smallest screens and put the
 * refresh / theme / overflow controls on a second line where they crowded the
 * subtitle. Now mobile gets a single app-bar — hamburger, logo, page title,
 * store toggle, actions — and the title/subtitle block only expands on desktop,
 * where there is room for it.
 *
 * Keeping it as one element also means one `sticky top-0`. Two stickies pinned
 * to the same offset inside the same scroll container overlap, and the opaque
 * one swallows the other along with its taps — which is exactly what happened
 * while there were two bars.
 *
 * Every control below is rendered exactly ONCE and reflows, rather than being
 * duplicated behind `lg:hidden` / `hidden lg:flex`. A second copy would mean a
 * second PendingOrdersSheet, and with it a second live-order subscription and
 * driver lookup mounted for no reason.
 */
export function AdminV3Header({
  title,
  subtitle,
  planLabel,
  onRefresh,
  refreshing,
  onOpenDrawer,
}: {
  title: string;
  subtitle?: string;
  /** e.g. "Free Trial (100 orders)". Hidden when the partner isn't on a gated plan. */
  planLabel?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  onOpenDrawer: () => void;
}) {
  // resolvedTheme, not theme: it is the value actually applied to <html>, which
  // is what the label has to name. Matches admin-v2's AdminThemeToggle.
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes cannot know the theme until it has read the DOM, so the first
  // client render must match the server's. Without this the label renders
  // "Light" on the server and "Dark" on the client and React throws a
  // hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const { userData } = useAuthStore();
  const { current: currentLang, setLang } = useAdminTranslate();
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);

  const showNotifications = !isFreePlan(
    (userData as Partner)?.subscription_details?.plan?.id,
  );
  const pendingCount = useOrderSubscriptionStore((st) =>
    st.orders.filter((o) => o.status === "pending").length,
  );

  // Printer settings only exist inside the wrapped Android app, and only for
  // partners whose plan includes an order surface to print from.
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

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/[0.86] px-[clamp(12px,3vw,28px)] py-2.5 backdrop-blur-md lg:py-3 dark:border-zinc-800 dark:bg-zinc-950/[0.86]">
      {/* Google Translate mounts its (hidden) widget here. Without this node
          TranslateElement throws on init and .goog-te-combo never exists, so
          picking a language silently does nothing — setLang just polls for the
          combo box for ~4s and gives up. */}
      <div id="admin_google_translate_element" className="hidden" aria-hidden="true" />

      <div className="flex items-center gap-2 lg:gap-4">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open menu"
          data-tour="hamburger-menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 lg:hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <Menu size={18} strokeWidth={1.8} />
        </button>

        {/* The page title, not the store name — the store is already named in
            the sidebar's account card, and on a phone this row has one slot for
            "where am I".

            The 30px "M" mark that used to sit here is gone for the same reason:
            with it, the title was squeezed to 71px at 375px and "Dashboard"
            rendered as "Dashbo…". The hamburger already anchors this corner and
            the sidebar carries the branding, so the mark was the cheapest thing
            to give up to make the title legible. */}
        <div className="min-w-0 flex-1 lg:flex-[0_1_auto]">
          <div className="flex flex-wrap items-center gap-x-[9px] gap-y-1.5">
            <h1 className="m-0 truncate text-[15px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950 lg:text-[clamp(17px,4.2vw,19px)] dark:text-zinc-50">
              {title}
            </h1>
            {planLabel && (
              <span className="hidden whitespace-nowrap rounded-full border border-amber-200 bg-amber-100 px-[9px] py-[3px] text-[11px] font-bold leading-none text-amber-700 lg:inline-block dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                {planLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="mt-[3px] hidden truncate text-[12.5px] font-medium leading-tight text-zinc-500 lg:block dark:text-zinc-400">
              {subtitle}
            </div>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:gap-2">
          {/* Two renders of a purely presentational toggle: it reads the auth
              store and nothing else, so the duplicate costs nothing, and the
              two shapes differ by more than a class (the compact one has no
              switch knob at all). */}
          <div className="lg:hidden">
            <StoreToggle compact />
          </div>
          <div className="hidden lg:block">
            <StoreToggle />
          </div>

          <div className="mx-0.5 hidden h-[26px] w-px bg-zinc-200 lg:block dark:bg-zinc-800" />

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            title="Refresh"
            className={cn(ICON_BUTTON, "w-[34px]")}
          >
            <RefreshCw
              size={17}
              strokeWidth={1.8}
              className={cn(refreshing && "animate-spin")}
            />
          </button>

          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            data-tour="dark-mode"
            // The label names the CURRENT mode, so the action is only clear from
            // the accessible name — spell it out there.
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
            className={cn(ICON_BUTTON, "w-[34px] gap-[7px] lg:w-auto lg:px-[11px]")}
          >
            {isDark ? <Moon size={17} strokeWidth={1.8} /> : <Sun size={17} strokeWidth={1.8} />}
            {/* Label only from lg — on a phone this row has no room for it. */}
            <span className="hidden text-[12.5px] font-semibold leading-none lg:inline">
              {isDark ? "Dark" : "Light"}
            </span>
          </button>

          {/* Overflow menu — same contents as admin-v2's navbar: pending orders,
              language, printer settings. The pending count is mirrored onto the
              trigger because burying a live order alert behind a menu is the
              difference between seeing a new order and missing it. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={
                  pendingCount > 0
                    ? `More options (${pendingCount} pending orders)`
                    : "More options"
                }
                title="More"
                className={cn(ICON_BUTTON, "relative w-[34px]")}
              >
                <MoreVertical size={17} strokeWidth={1.8} />
                {showNotifications && pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              collisionPadding={8}
              className="max-h-[75vh] w-56 overflow-y-auto"
            >
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
                  flyout, and on a phone there is no side to fly out to.
                  onSelect is prevented so picking "Language" expands the list
                  instead of closing the whole menu. */}
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
                /* notranslate: a language list rendered in the language you are
                   trying to leave is a one-way door. */
                <div translate="no" className="notranslate max-h-56 overflow-y-auto">
                  {MENU_LANGUAGES.map((l) => (
                    <DropdownMenuItem
                      key={l.code}
                      className="pl-8"
                      onClick={() => setLang(l.code)}
                    >
                      {l.label}
                      {currentLang === l.code && (
                        <Check className="ml-auto h-4 w-4 text-green-600" />
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
              <PendingOrdersSheet open={notifOpen} onOpenChange={setNotifOpen} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
