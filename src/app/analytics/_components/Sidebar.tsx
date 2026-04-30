"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Building2,
  Search,
  Wifi,
} from "lucide-react";

export type Tab = "overview" | "live" | "growth" | "restaurants" | "discovery";

export const TABS: Array<{
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Top metrics across the network",
  },
  {
    id: "live",
    label: "Live orders",
    icon: Activity,
    description: "Delivery, takeaway & dine-in right now",
  },
  {
    id: "growth",
    label: "Growth",
    icon: TrendingUp,
    description: "Onboardings, GMV and customer growth",
  },
  {
    id: "restaurants",
    label: "Restaurants",
    icon: Building2,
    description: "Rankings, channels and top performers",
  },
  {
    id: "discovery",
    label: "Discovery",
    icon: Search,
    description: "Searches, referrers and visitor geography",
  },
];

function useBuildHref() {
  const pathname = usePathname() ?? "/analytics";
  const sp = useSearchParams();
  return (tab: Tab) => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("tab", tab);
    return `${pathname}?${params.toString()}`;
  };
}

export function DesktopSidebar({ current }: { current: Tab }) {
  const buildHref = useBuildHref();

  return (
    <aside className="hidden lg:block sticky top-6 self-start">
      <div className="rounded-xl border bg-white p-4 w-full">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">Menuthere</div>
            <div className="text-[11px] text-muted-foreground truncate">
              Live network analytics
            </div>
          </div>
        </div>

        <nav className="space-y-0.5">
          {TABS.map(({ id, label, icon: Icon, description }) => {
            const active = current === id;
            return (
              <Link
                key={id}
                href={buildHref(id)}
                scroll={false}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 mt-0.5 shrink-0",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0">
                  <div className="font-medium">{label}</div>
                  <div
                    className={cn(
                      "text-[11px] leading-snug truncate",
                      active
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 pt-4 border-t flex items-center gap-1.5 text-[11px] text-muted-foreground px-2">
          <Wifi className="size-3" />
          Auto-refresh every 30s
        </div>
      </div>
    </aside>
  );
}

export function MobileTabs({ current }: { current: Tab }) {
  const buildHref = useBuildHref();

  return (
    <div className="lg:hidden">
      <div className="-mx-4 sm:mx-0 overflow-x-auto">
        <div className="flex gap-2 px-4 sm:px-0 pb-1 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = current === id;
            return (
              <Link
                key={id}
                href={buildHref(id)}
                scroll={false}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm whitespace-nowrap border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white hover:bg-muted text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
