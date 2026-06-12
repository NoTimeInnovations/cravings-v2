"use client";

import { Workflow } from "lucide-react";

// WhatsApp Flows — automated conversation flows (ordering bot, FAQ, capture,
// branching menus) that run on the partner's own WhatsApp number. The visual
// flow builder + engine land in a follow-up; this is the placeholder shown
// while that ships so the merged WhatsApp view has its third tab in place.
export function AdminV2WhatsAppFlows() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <div className="rounded-full bg-muted p-3">
        <Workflow className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">WhatsApp Flows</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Build automated conversation flows — welcome menus, order capture,
        FAQs and branching replies — that run automatically on your own
        WhatsApp number. The flow builder is being set up and will appear here
        shortly.
      </p>
    </div>
  );
}
