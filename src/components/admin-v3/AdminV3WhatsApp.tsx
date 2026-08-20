"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronRight,
  // Inbox,  // re-enable with the hub row below
  Megaphone,
  MessageSquare,
  MousePointerClick,
  RotateCcw,
  Settings as SettingsIcon,
  ShoppingBag,
  Workflow,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { canSeeApiUsage } from "@/lib/demoPartner";
import { getFeatures } from "@/lib/getFeatures";
import { useWhatsAppStatus } from "./dashboard/useWhatsAppStatus";
import { AdminV3Button, V3Card } from "./ui/primitives";
import { useBackOrReturn } from "./useV3Navigate";
import { WhatsAppNumberSettings } from "./whatsapp/NumberSettings";

/**
 * /admin-v3 → WhatsApp.
 *
 * This is the HUB only: the channel header (which number is connected, and the
 * way into its settings) plus a "Where to go" list that opens each WhatsApp
 * sub-screen. Templates / Flows / Broadcast / Comeback / Link taps are separate
 * v3 screens owned elsewhere — this file never renders them. (Inbox is one too,
 * but its row is commented out below, so there is currently no way into it.) Until the
 * shell wires them up, every row deep-links into admin-v2's hub with the same
 * `?waScreen=` param admin-v2 already reads back, so the screen is usable today
 * and becomes a pure in-shell navigation the moment `onOpenScreen` is passed.
 *
 * Gating matches admin-v2 exactly: API usage is allow-listed by partner id, and
 * Catalogue is behind the `whatsappcatalog` feature flag (the flag also gates
 * whether a catalogue was ever provisioned, so showing the row without it would
 * offer an action that can only fail).
 */

export type AdminV3WhatsAppScreen =
  | "Inbox"
  | "Templates"
  | "Flows"
  | "Broadcast"
  | "Comeback"
  | "LinkClicks"
  | "ApiUsage"
  | "Catalogue";

type HubRow = {
  id: AdminV3WhatsAppScreen;
  title: string;
  desc: string;
  icon: React.ElementType;
};

const ROWS: HubRow[] = [
  // Inbox is hidden for now — uncomment this row (and the `Inbox` icon import
  // above) to bring it back. The screen itself is untouched and still wired up
  // in viewRegistry, so this row is the only thing gating it.
  // {
  //   id: "Inbox",
  //   title: "Inbox",
  //   desc: "Read and reply to customer conversations.",
  //   icon: Inbox,
  // },
  {
    id: "Templates",
    title: "Templates",
    desc: "The approved messages your flows send.",
    icon: MessageSquare,
  },
  {
    id: "Flows",
    title: "Flows",
    desc: "Ordering, live updates and reminders on autopilot.",
    icon: Workflow,
  },
  {
    id: "Broadcast",
    title: "Broadcast",
    desc: "Send one template to many customers at once.",
    icon: Megaphone,
  },
  {
    id: "Comeback",
    title: "Comeback messages",
    desc: "Win back customers who stopped ordering.",
    icon: RotateCcw,
  },
  {
    id: "LinkClicks",
    title: "Order link taps",
    desc: "Who tapped an order link from your flows.",
    icon: MousePointerClick,
  },
  {
    id: "ApiUsage",
    title: "API usage",
    desc: "Calls and messages sent through your public API.",
    icon: Activity,
  },
  {
    id: "Catalogue",
    title: "Catalogue",
    desc: "Publish your menu to WhatsApp so customers can browse in chat.",
    icon: ShoppingBag,
  },
];

export function AdminV3WhatsApp({
  onOpenScreen,
}: {
  /**
   * Set by the shell once the v3 sub-screens exist. Without it the rows fall
   * back to admin-v2's hub, which restores the same sub-screen from `?waScreen=`.
   */
  onOpenScreen?: (screen: AdminV3WhatsAppScreen) => void;
} = {}) {
  const router = useRouter();
  const { userData } = useAuthStore();
  const { status, loading } = useWhatsAppStatus();
  // Connecting, adding and removing numbers is its own screen — it is the only
  // part of the hub that writes anything.
  const [numbersOpen, setNumbersOpen] = React.useState(false);
  // Whether ?wa=numbers put us straight here. If it did, the hub was never on
  // screen and Back belongs to whoever sent us — Settings > Integrations links
  // in this way. Opening it from a hub row below sets this false, so Back there
  // still goes up to the hub the user was just looking at.
  const [enteredAtNumbers, setEnteredAtNumbers] = React.useState(false);

  // Integrations links straight here with ?wa=numbers. Read at MOUNT from
  // window.location — the same reason Settings and Menu do: useSearchParams
  // would need a Suspense boundary this screen does not have.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("wa") === "numbers") {
      setNumbersOpen(true);
      setEnteredAtNumbers(true);
    }
  }, []);

  const partnerId = (userData as { id?: string } | undefined)?.id;
  const showApiUsage = canSeeApiUsage(partnerId);
  const showCatalogue = !!getFeatures(
    (userData as { feature_flags?: string } | undefined)?.feature_flags || "",
  )?.whatsappcatalog?.enabled;

  const rows = React.useMemo(
    () =>
      ROWS.filter(
        (r) =>
          (r.id !== "ApiUsage" || showApiUsage) &&
          (r.id !== "Catalogue" || showCatalogue),
      ),
    [showApiUsage, showCatalogue],
  );

  const open = (id: AdminV3WhatsAppScreen) => {
    if (onOpenScreen) {
      onOpenScreen(id);
      return;
    }
    router.push(`/admin-v2?view=WhatsApp&waScreen=${id}`);
  };

  const numbersBack = useBackOrReturn(
    () => {
      setNumbersOpen(false);
      // Drop the deep-link param with the page it opened. The shell only strips
      // ?wa once activeView LEAVES WhatsApp, so backing out to the hub left it
      // on the URL and a reload silently reopened Numbers.
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search);
        if (p.has("wa")) {
          p.delete("wa");
          const qs = p.toString();
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${qs ? `?${qs}` : ""}`,
          );
        }
      }
    },
    "Back to WhatsApp",
    enteredAtNumbers,
  );

  const connected = !!status?.connected;

  // Only ever built from what the status endpoint actually returns. When there
  // is nothing to say beyond "connected", we say exactly that rather than
  // padding the line with numbers we do not have.
  const statusLine = loading
    ? "Checking your WhatsApp connection…"
    : connected
      ? status?.flowsTotal
        ? `${status.flowsActive ?? 0} of ${status.flowsTotal} automation flows active.`
        : "Connected. No automation flows set up yet."
      : "Link your WhatsApp Business number to take orders and send live updates on chat.";


  if (numbersOpen) {
    return <WhatsAppNumberSettings onBack={numbersBack.goBack} />;
  }

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* ------------------------------------------------ channel header */}
      <V3Card className="flex flex-wrap items-center gap-3.5 gap-y-3 px-4 py-3.5">
        <span
          className={[
            "flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] border",
            connected
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
              : "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
          ].join(" ")}
        >
          <MessageSquare size={19} strokeWidth={1.8} />
        </span>

        <div className="min-w-0 flex-[1_1_200px]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              translate="no"
              className="notranslate text-[14px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 tabular-nums dark:text-zinc-50"
            >
              {loading
                ? "…"
                : connected
                  ? status?.displayPhone || "WhatsApp Business"
                  : "No number connected"}
            </span>
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none",
                connected
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                  : "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-green-600" : "bg-zinc-400 dark:bg-zinc-500",
                ].join(" ")}
              />
              {loading ? "Checking…" : connected ? "Connected" : "Not connected"}
            </span>
          </div>
          <div className="mt-[3px] text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500">
            {statusLine}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3"
            onClick={() => {
              setEnteredAtNumbers(false);
              setNumbersOpen(true);
            }}
          >
            {connected ? (
              <>
                <SettingsIcon
                  size={15}
                  strokeWidth={1.7}
                  className="flex-none text-zinc-500 dark:text-zinc-400"
                />
                Number settings
              </>
            ) : (
              <>
                <MessageSquare
                  size={15}
                  strokeWidth={1.7}
                  className="flex-none text-zinc-500 dark:text-zinc-400"
                />
                Connect WhatsApp
              </>
            )}
          </AdminV3Button>
        </div>
      </V3Card>

      {/* -------------------------------------------------- where to go */}
      <V3Card className="w-full min-w-0">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Where to go
          </span>
        </div>

        {rows.map((row, i) => {
          const Icon = row.icon;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => open(row.id)}
              className={[
                "flex w-full items-center gap-3 px-4 py-[13px] text-left transition-colors",
                "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                i < rows.length - 1
                  ? "border-b border-zinc-100 dark:border-zinc-800"
                  : "",
              ].join(" ")}
            >
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <Icon size={17} strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                  {row.title}
                </span>
                <span className="mt-[2px] block text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500">
                  {row.desc}
                </span>
              </span>
              <ChevronRight
                size={16}
                strokeWidth={2}
                className="flex-none text-zinc-300 dark:text-zinc-600"
              />
            </button>
          );
        })}
      </V3Card>
    </div>
  );
}
