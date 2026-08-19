"use client";

import * as React from "react";
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  ExternalLink,
  ListOrdered,
  MessageSquare,
  Palette,
  Settings as SettingsIcon,
  ShoppingBag,
  SlidersHorizontal,
  UtensilsCrossed,
} from "lucide-react";

import { Partner, useAuthStore } from "@/store/authStore";
import { useV3Navigate } from "../useV3Navigate";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { AdminV3Button, MiniProgress, V3Card } from "../ui/primitives";

/* ------------------------------------------------------------- Trial card */

export function TrialCard() {
  const { gate } = useSubscriptionGate();
  const navigate = useV3Navigate();

  // Only gated plans (trial / Pro) have a usage story worth a card. Everyone
  // else — including partners on the digital/petpooja plans — would just get an
  // empty progress bar, so the card is not rendered for them at all.
  if (!gate.isGated || !gate.isTrial || gate.limit == null) return null;

  const usage = gate.usage ?? 0;
  const limit = gate.limit;
  const pct = limit > 0 ? (usage / limit) * 100 : 0;

  return (
    <V3Card className="p-[18px]">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="m-0 whitespace-nowrap text-[14.5px] font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
          Free Trial
        </h2>
        <span className="whitespace-nowrap text-xs font-semibold leading-none text-zinc-400 dark:text-zinc-500">
          {limit} orders included
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
          {usage}
        </span>
        <span className="text-[12.5px] font-semibold leading-none text-zinc-500 dark:text-zinc-400">
          of {limit} orders used
        </span>
      </div>
      <MiniProgress value={pct} animated={false} className="mb-3.5 mt-3" />
      <AdminV3Button
        variant="strong"
        className="w-full"
        onClick={() => navigate("Billing")}
      >
        Upgrade plan
      </AdminV3Button>
    </V3Card>
  );
}

/* ----------------------------------------------------------- Quick actions */

type QuickAction = {
  label: string;
  icon: React.ElementType;
  /** The v3 activeView to switch to, in-shell. */
  view?: string;
  /**
   * Deep-link params written onto /admin-v3 before the view switches. The
   * target screens read these at mount from window.location — Settings via
   * ?sg/?ss, Menu via ?menuPanel — so they must land BEFORE the screen mounts.
   */
  params?: string;
  /** External/storefront URL opened in a new tab instead. */
  href?: string;
  muted?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Manage Orders", icon: ListOrdered, view: "Orders" },
  { label: "Edit Menu", icon: UtensilsCrossed, view: "Menu" },
  { label: "Availability", icon: CalendarClock, view: "Menu", params: "menuPanel=availability" },
  { label: "Priority", icon: SlidersHorizontal, view: "Menu", params: "menuPanel=priority" },
  { label: "Order Settings", icon: ShoppingBag, view: "Settings", params: "sg=ordering&ss=delivery" },
  { label: "Themes", icon: Palette, view: "Settings", params: "sg=appearance&ss=theme" },
  { label: "Settings", icon: SettingsIcon, view: "Settings" },
  { label: "Analytics", icon: BarChart3, view: "Analytics" },
];

export function QuickActionsCard() {
  const { userData } = useAuthStore();
  const navigate = useV3Navigate();
  const partner = userData as Partner | undefined;
  const username = partner?.username;

  /** Quick actions stay inside v3 — see useV3Navigate for the deep-link rule. */
  const go = (t: QuickAction) => {
    if (t.href) {
      window.open(t.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (t.view) navigate(t.view, t.params);
  };

  const tiles: QuickAction[] = [
    ...QUICK_ACTIONS,
    // View Menu, Contact Us and Integrations were dropped: the storefront is one
    // tap from View Website, support lives in Help & Support, and Integrations is
    // a Settings section reachable from the sidebar.
    ...(username
      ? [{ label: "View Website", icon: ExternalLink, href: `/${username}/home` }]
      : []),
  ];

  return (
    <V3Card className="p-[18px]">
      <h2 className="m-0 mb-3.5 text-[14.5px] font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-[9px]">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => go(t)}
              className={[
                "flex flex-col items-center gap-[7px] rounded-lg px-1.5 py-3.5 transition-colors",
                t.muted
                  ? "border border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  : "border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              ].join(" ")}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span
                className={[
                  "text-center text-[11.5px] font-medium leading-[1.25]",
                  t.muted ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300",
                ].join(" ")}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </V3Card>
  );
}

/* ------------------------------------------------------- WhatsApp channel */

export type WhatsAppStatus = {
  connected: boolean;
  displayPhone?: string | null;
  flowsActive?: number;
  flowsTotal?: number;
};

export function WhatsAppChannelCard({ status }: { status: WhatsAppStatus | null }) {
  const connected = !!status?.connected;
  const navigate = useV3Navigate();

  return (
    <V3Card className="p-[18px]">
      {/* nowrap on the title, wrap on the row: the rail is 260px, and without
          this the title split to "WhatsApp / channel". With the pill now only
          rendered when connected, the row normally holds one line. */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <MessageSquare
          size={17}
          strokeWidth={1.8}
          className={connected ? "shrink-0 text-green-600 dark:text-green-400" : "shrink-0 text-zinc-400 dark:text-zinc-500"}
        />
        <span className="whitespace-nowrap text-[13.5px] font-bold leading-none text-zinc-950 dark:text-zinc-50">
          WhatsApp channel
        </span>
        {/* Only for the CONNECTED state. "Not connected" repeated what the
            body copy and the "Connect WhatsApp" action already say, and in the
            260px rail it wrapped onto its own line. */}
        {connected && (
          <span
            className={[
              "ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none",
                "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                "shrink-0",
                connected ? "bg-green-600" : "bg-zinc-400 dark:bg-zinc-500",
              ].join(" ")}
            />
            {"Live"}
          </span>
        )}
      </div>

      <div className="mt-2.5 text-xs font-normal leading-normal text-zinc-500 dark:text-zinc-400">
        {connected
          ? [
              status?.displayPhone ? `Connected to ${status.displayPhone}.` : "Connected.",
              status?.flowsTotal
                ? `${status.flowsActive ?? 0} of ${status.flowsTotal} flows active.`
                : null,
            ]
              .filter(Boolean)
              .join(" ")
          : "Link your WhatsApp Business number to take orders and send live updates on chat."}
      </div>

      <button
        type="button"
        onClick={() => navigate("WhatsApp")}
        className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold leading-none text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        {connected ? "Manage flows" : "Connect WhatsApp"}
        <ChevronRight size={13} strokeWidth={2.2} />
      </button>
    </V3Card>
  );
}
