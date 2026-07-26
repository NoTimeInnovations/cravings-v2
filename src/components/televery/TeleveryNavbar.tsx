"use client";

import { LogOut, Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";

/**
 * Top bar for the Televery marketplace dashboard.
 *
 * Deliberately NOT admin-v2's <AdminNavbar/>: that one reads the signed-in
 * partner off the auth store to render a store name, a plan badge, the
 * store-open indicator, the printer button, order notifications and the account
 * switcher — all partner-only concepts. A Televery session has none of them, so
 * reusing it would mean threading "hide everything" flags through partner
 * chrome. This copies the layout and classes instead and carries only what the
 * marketplace has: brand name, refresh, theme and sign out.
 */
interface TeleveryNavbarProps {
  brandName: string;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onSignOut: () => void;
}

export function TeleveryNavbar({
  brandName,
  onToggleSidebar,
  onRefresh,
  refreshing,
  onSignOut,
}: TeleveryNavbarProps) {
  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
      <div className="flex items-center gap-4">
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </SheetTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex"
          onClick={onToggleSidebar}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <div className="hidden lg:flex items-center gap-2">
          <img
            src="/menuthere-logo-new.png"
            alt="Menuthere"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
          <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
            {brandName}
          </span>
          {/* Sits where admin-v2 puts the plan badge, so the bar reads the same. */}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            Marketplace
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <ModeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </nav>
  );
}
