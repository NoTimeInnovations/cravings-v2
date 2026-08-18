"use client";

import * as React from "react";

import { GetStartedCard } from "./dashboard/GetStartedCard";
import { LiveOrdersPanel } from "./dashboard/LiveOrdersPanel";
import {
  QuickActionsCard,
  TrialCard,
  WhatsAppChannelCard,
  type WhatsAppStatus,
} from "./dashboard/RightRail";

/**
 * The v3 dashboard body.
 *
 * Deliberately carries NO stat/analytics tiles — revenue, order counts, AOV and
 * prep time all live in Analytics, and duplicating them here only created a
 * second set of numbers to keep in agreement. The dashboard is the operational
 * screen: what needs doing (setup), what is happening now (live orders), and
 * the shortcuts.
 *
 * SCROLLING, from `lg` up: the dashboard fills the viewport exactly once and
 * does not scroll as a page. The Live Orders card owns the only scrollbar — its
 * header stays pinned and the order list moves underneath it — so the right rail
 * (Quick Actions, WhatsApp) never slides away while a busy partner works through
 * a queue. `lg:min-h-[320px]` on the split is the escape hatch: on a short laptop
 * the columns stop shrinking and `main` regains a page scrollbar rather than
 * clipping the orders out of reach.
 *
 * Below `lg` all of that is off and the page scrolls normally, because a phone
 * has no room to give a nested scroller its own viewport.
 */
export function AdminV3Dashboard({
  whatsapp,
  onRefreshWhatsApp,
}: {
  whatsapp: WhatsAppStatus | null;
  onRefreshWhatsApp: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 pb-10 pt-5 lg:min-h-0 lg:flex-1 lg:px-[clamp(14px,3vw,28px)] lg:pb-5">
      <GetStartedCard whatsapp={whatsapp} onRefreshWhatsApp={onRefreshWhatsApp} />

      {/* flex-nowrap from lg so the two columns shrink rather than stacking —
          a stacked pair inside a fixed-height box would be unusable. */}
      <div className="flex flex-wrap items-start gap-5 lg:min-h-[320px] lg:flex-1 lg:flex-nowrap lg:items-stretch">
        <LiveOrdersPanel />

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 lg:h-full lg:overflow-y-auto">
          <TrialCard />
          <QuickActionsCard />
          <WhatsAppChannelCard status={whatsapp} />
        </div>
      </div>
    </div>
  );
}
