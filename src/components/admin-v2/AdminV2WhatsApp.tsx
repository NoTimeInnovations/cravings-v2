"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminV2WhatsAppInbox } from "@/components/admin-v2/AdminV2WhatsAppInbox";
import { AdminV2WhatsAppTemplates } from "@/components/admin-v2/AdminV2WhatsAppTemplates";
import { AdminV2WhatsAppFlows } from "@/components/admin-v2/AdminV2WhatsAppFlows";

const TABS = ["Inbox", "Templates", "Flows"] as const;
type Tab = (typeof TABS)[number];

// Single "WhatsApp" admin view that hosts the Inbox, Templates and Flows panels
// as tabs. Each panel is lazy-mounted on first visit (and kept mounted via
// block/hidden) so switching tabs doesn't tear down its state or re-fetch.
export function AdminV2WhatsApp() {
  const [tab, setTab] = useState<Tab>("Inbox");
  const [mounted, setMounted] = useState<Tab[]>(["Inbox"]);

  const open = (t: Tab) => {
    setTab(t);
    setMounted((m) => (m.includes(t) ? m : [...m, t]));
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => open(v as Tab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {mounted.includes("Inbox") && (
        <div className={tab === "Inbox" ? "block" : "hidden"}>
          <AdminV2WhatsAppInbox />
        </div>
      )}
      {mounted.includes("Templates") && (
        <div className={tab === "Templates" ? "block" : "hidden"}>
          <AdminV2WhatsAppTemplates />
        </div>
      )}
      {mounted.includes("Flows") && (
        <div className={tab === "Flows" ? "block" : "hidden"}>
          <AdminV2WhatsAppFlows />
        </div>
      )}
    </div>
  );
}
