"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Inbox, MessageSquare, Workflow, Megaphone, ChevronLeft } from "lucide-react";
import { AdminV2WhatsAppInbox } from "@/components/admin-v2/AdminV2WhatsAppInbox";
import { AdminV2WhatsAppTemplates } from "@/components/admin-v2/AdminV2WhatsAppTemplates";
import { AdminV2WhatsAppFlows } from "@/components/admin-v2/AdminV2WhatsAppFlows";
import { AdminV2WhatsAppBroadcast } from "@/components/admin-v2/AdminV2WhatsAppBroadcast";

type Screen = "Inbox" | "Templates" | "Flows" | "Broadcast";

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
];

// The merged WhatsApp view: a hub of buttons that open Inbox / Templates / Flows.
// Each panel lazy-mounts on first open and stays mounted (block/hidden) so its
// state and fetches survive going back to the hub and reopening.
export function AdminV2WhatsApp() {
  const [screen, setScreen] = useState<Screen | null>(null);
  const [mounted, setMounted] = useState<Screen[]>([]);

  const open = (s: Screen) => {
    setScreen(s);
    setMounted((m) => (m.includes(s) ? m : [...m, s]));
  };

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
            {SCREENS.map((s) => (
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
          onClick={() => setScreen(null)}
          className="-ml-2 text-muted-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> WhatsApp
        </Button>
      ) : null}

      {mounted.includes("Inbox") && (
        <div className={screen === "Inbox" ? "block" : "hidden"}>
          <AdminV2WhatsAppInbox onBack={() => setScreen(null)} />
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
    </div>
  );
}
