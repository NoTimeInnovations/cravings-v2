"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  ExternalLink,
  Headphones,
  ListOrdered,
  MessageSquare,
  Palette,
  Plug,
  Settings as SettingsIcon,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  UtensilsCrossed,
} from "lucide-react";

import { Partner, useAuthStore } from "@/store/authStore";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { AdminV3Button, MiniProgress, V3Card } from "../ui/primitives";

/* ------------------------------------------------------------- Trial card */

export function TrialCard() {
  const { gate } = useSubscriptionGate();
  const router = useRouter();

  // Only gated plans (trial / Pro) have a usage story worth a card. Everyone
  // else — including partners on the digital/petpooja plans — would just get an
  // empty progress bar, so the card is not rendered for them at all.
  if (!gate.isGated || !gate.isTrial || gate.limit == null) return null;

  const usage = gate.usage ?? 0;
  const limit = gate.limit;
  const pct = limit > 0 ? (usage / limit) * 100 : 0;

  return (
    <V3Card className="p-[18px]">
      <div className="flex items-baseline gap-2">
        <h2 className="m-0 text-[14.5px] font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
          Free Trial
        </h2>
        <span className="text-xs font-semibold leading-none text-zinc-400 dark:text-zinc-500">
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
        onClick={() => router.push("/admin-v2?view=Billing")}
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
  /** admin-v2 deep link, appended to /admin-v2? */
  query?: string;
  /** External/storefront URL opened in a new tab instead. */
  href?: string;
  muted?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Manage Orders", icon: ListOrdered, query: "view=Orders" },
  { label: "Edit Menu", icon: UtensilsCrossed, query: "view=Menu" },
  { label: "Availability", icon: CalendarClock, query: "view=Menu&menuPanel=availability" },
  { label: "Priority", icon: SlidersHorizontal, query: "view=Menu&menuPanel=priority" },
  { label: "Order Settings", icon: ShoppingBag, query: "view=Settings&sg=ordering&ss=delivery" },
  { label: "Themes", icon: Palette, query: "view=Settings&sg=appearance&ss=theme" },
  { label: "Settings", icon: SettingsIcon, query: "view=Settings" },
  { label: "Analytics", icon: BarChart3, query: "view=Analytics" },
];

export function QuickActionsCard() {
  const { userData } = useAuthStore();
  const router = useRouter();
  const partner = userData as Partner | undefined;
  const username = partner?.username;

  const tiles: QuickAction[] = [
    ...QUICK_ACTIONS,
    ...(username
      ? [
          { label: "View Menu", icon: Store, href: `/${username}` },
          { label: "View Website", icon: ExternalLink, href: `/${username}/home` },
        ]
      : []),
    { label: "Contact Us", icon: Headphones, href: "https://wa.me/917012944024" },
    {
      label: "Integrations",
      icon: Plug,
      query: "view=Settings&sg=integrations&ss=integrations",
      muted: true,
    },
  ];

  return (
    <V3Card className="p-[18px]">
      <h2 className="m-0 mb-3.5 text-[14.5px] font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
        Quick Actions
      </h2>
      <div className="grid gap-[9px] [grid-template-columns:repeat(auto-fit,minmax(86px,1fr))]">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                if (t.href) window.open(t.href, "_blank", "noopener,noreferrer");
                else if (t.query) router.push(`/admin-v2?${t.query}`);
              }}
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
  const router = useRouter();

  return (
    <V3Card className="p-[18px]">
      <div className="flex items-center gap-2.5">
        <MessageSquare
          size={17}
          strokeWidth={1.8}
          className={connected ? "text-green-600 dark:text-green-400" : "text-zinc-400 dark:text-zinc-500"}
        />
        <span className="text-[13.5px] font-bold leading-none text-zinc-950 dark:text-zinc-50">
          WhatsApp channel
        </span>
        <span
          className={[
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none",
            connected
              ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
              : "border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              connected ? "bg-green-600" : "bg-zinc-400 dark:bg-zinc-500",
            ].join(" ")}
          />
          {connected ? "Live" : "Not connected"}
        </span>
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
        onClick={() => router.push("/admin-v2?view=WhatsApp")}
        className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold leading-none text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        {connected ? "Manage flows" : "Connect WhatsApp"}
        <ChevronRight size={13} strokeWidth={2.2} />
      </button>
    </V3Card>
  );
}
