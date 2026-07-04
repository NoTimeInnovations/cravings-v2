"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Inbox, MessageSquare, Workflow, Megaphone, ChevronLeft, MousePointerClick, Activity } from "lucide-react";
import { AdminV2WhatsAppInbox } from "@/components/admin-v2/AdminV2WhatsAppInbox";
import { AdminV2WhatsAppTemplates } from "@/components/admin-v2/AdminV2WhatsAppTemplates";
import { AdminV2WhatsAppFlows } from "@/components/admin-v2/AdminV2WhatsAppFlows";
import { AdminV2WhatsAppBroadcast } from "@/components/admin-v2/AdminV2WhatsAppBroadcast";
import { AdminV2WhatsAppLinkClicks } from "@/components/admin-v2/AdminV2WhatsAppLinkClicks";
import { AdminV2WhatsAppApiUsage } from "@/components/admin-v2/AdminV2WhatsAppApiUsage";
import { useAuthStore } from "@/store/authStore";
import { canSeeApiUsage } from "@/lib/demoPartner";

type Screen = "Inbox" | "Templates" | "Flows" | "Broadcast" | "LinkClicks" | "ApiUsage";

const SCREENS: {
  id: Screen;
  title: string;
  desc: string;
  icon: React.ElementType;
  accent: string;
}[] = [
  { id: "Inbox", title: "Inbox", desc: "View and reply to customer conversations.", icon: Inbox, accent: "text-green-600" },
  { id: "Templates", title: "Templates", desc: "Create and manage message templates.", icon: MessageSquare, accent: "text-blue-600" },
  { id: "Flows", title: "Flows", desc: "Build automated conversation flows.", icon: Workflow, accent: "text-purple-600" },
  { id: "Broadcast", title: "Broadcast", desc: "Send a template to many customers at once.", icon: Megaphone, accent: "text-orange-600" },
  { id: "LinkClicks", title: "Order link taps", desc: "See who tapped an “order now” link from your flows.", icon: MousePointerClick, accent: "text-pink-600" },
  { id: "ApiUsage", title: "API usage", desc: "Calls & messages sent through your public API.", icon: Activity, accent: "text-emerald-600" },
];

const SCREEN_IDS = SCREENS.map((s) => s.id);

// The merged WhatsApp view: a hub of buttons that open Inbox / Templates / Flows.
// Each panel lazy-mounts on first open and stays mounted (block/hidden) so its
// state and fetches survive going back to the hub and reopening.
export function AdminV2WhatsApp() {
  const { userData } = useAuthStore();
  const showApiUsage = canSeeApiUsage((userData as any)?.id);
  // API usage is only for partners on the public API (allow-listed).
  const screens = showApiUsage ? SCREENS : SCREENS.filter((s) => s.id !== "ApiUsage");

  const [screen, setScreen] = useState<Screen | null>(null);
  const [mounted, setMounted] = useState<Screen[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Reflect the open sub-screen in the URL (?waScreen=) so a reload restores it
  // and the address bar is a shareable link. We write it when opening a screen
  // and read it back in the effect below — keeping state and URL in sync both
  // ways (including external deep-links and browser back/forward).
  const writeScreenUrl = (s: Screen | null) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (s) params.set("waScreen", s);
    else params.delete("waScreen");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const open = (s: Screen) => {
    setScreen(s);
    setMounted((m) => (m.includes(s) ? m : [...m, s]));
    writeScreenUrl(s);
  };

  const goHub = () => {
    setScreen(null);
    writeScreenUrl(null);
  };

  // Apply ?waScreen= into local state whenever it changes. Keyed on the param via
  // a signature ref so it acts once per distinct value and never loops with our
  // own writeScreenUrl. An absent/invalid value leaves the hub (screen=null).
  const lastWaRef = useRef<string>("");
  useEffect(() => {
    const raw = searchParams.get("waScreen") || "";
    if (raw === lastWaRef.current) return;
    lastWaRef.current = raw;
    if (!raw || !SCREEN_IDS.includes(raw as Screen)) return;
    setScreen(raw as Screen);
    setMounted((m) => (m.includes(raw as Screen) ? m : [...m, raw as Screen]));
  }, [searchParams]);

  return (
    <div className="space-y-4">
      {screen === null ? (
        <>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">WhatsApp</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage customer conversations, message templates, and automated flows.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {screens.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => open(s.id)}
              className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left transition-all hover:border-orange-300 hover:shadow-md"
            >
              <div className="rounded-lg bg-muted p-3">
                <s.icon className={`h-6 w-6 ${s.accent}`} />
              </div>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </button>
          ))}
          </div>
        </>
      ) : screen !== "Inbox" ? (
        // Inbox renders its own back button in its header (it's a full-height
        // layout that would otherwise hide a button placed above it).
        <Button
          variant="ghost"
          size="sm"
          onClick={goHub}
          className="-ml-2 text-muted-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> WhatsApp
        </Button>
      ) : null}

      {mounted.includes("Inbox") && (
        <div className={screen === "Inbox" ? "block" : "hidden"}>
          <AdminV2WhatsAppInbox onBack={goHub} />
        </div>
      )}
      {mounted.includes("Templates") && (
        <div className={screen === "Templates" ? "block" : "hidden"}>
          <AdminV2WhatsAppTemplates />
        </div>
      )}
      {mounted.includes("Flows") && (
        <div className={screen === "Flows" ? "block" : "hidden"}>
          <AdminV2WhatsAppFlows />
        </div>
      )}
      {mounted.includes("Broadcast") && (
        <div className={screen === "Broadcast" ? "block" : "hidden"}>
          <AdminV2WhatsAppBroadcast />
        </div>
      )}
      {mounted.includes("LinkClicks") && (
        <div className={screen === "LinkClicks" ? "block" : "hidden"}>
          <AdminV2WhatsAppLinkClicks />
        </div>
      )}
      {showApiUsage && mounted.includes("ApiUsage") && (
        <div className={screen === "ApiUsage" ? "block" : "hidden"}>
          <AdminV2WhatsAppApiUsage />
        </div>
      )}
    </div>
  );
}
