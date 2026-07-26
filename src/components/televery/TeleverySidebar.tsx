"use client";

import { Building2, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TeleveryView } from "./types";

interface SidebarItem {
  title: TeleveryView;
  icon: React.ElementType;
  id: string;
}

const sidebarItems: SidebarItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { title: "Businesses", icon: Building2, id: "businesses" },
];

/**
 * Left nav for the marketplace dashboard.
 *
 * Same reason as TeleveryNavbar for not reusing <AdminSidebar/>: its item list
 * is the partner feature set (Menu, POS, Captains, Inventory, Integrations…)
 * gated by feature flags and plan tier read off the partner session. Televery
 * has two sections and no plan, so this copies the item styling and active-state
 * treatment verbatim and swaps the items.
 */
interface TeleverySidebarProps {
  activeView: TeleveryView;
  onNavigate: (view: TeleveryView) => void;
  onSignOut: () => void;
  className?: string;
}

export function TeleverySidebar({
  activeView,
  onNavigate,
  onSignOut,
  className,
}: TeleverySidebarProps) {
  return (
    <div className={cn("flex flex-col h-full py-4", className)}>
      <div className="px-3 py-2">
        <div className="space-y-1">
          {sidebarItems.map((item) => (
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
          ))}
        </div>
      </div>

      {/* Same footer slot admin-v2 uses for Integrations / Help & Support. */}
      <div className="mt-auto px-3 py-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
