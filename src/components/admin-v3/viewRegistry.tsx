"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { AdminV3WhatsAppScreen } from "./AdminV3WhatsApp";

/**
 * Every screen admin-v3 implements, and how to load it.
 *
 * Each entry is a `next/dynamic` import so a partner opening the Dashboard does
 * not download Settings, Orders and the WhatsApp cluster with it — the v3
 * screens are ~21k lines in total, and admin-v2 code-splits its views for the
 * same reason.
 *
 * A view NOT in this map is deliberately absent: the shell hands it to
 * admin-v2 as a `?view=` deep link, which is what keeps a half-built section
 * from 404ing.
 */

/** Shown while a screen's chunk downloads and mounts. */
function ViewLoading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400 dark:text-zinc-500" />
      <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
  );
}

const d = <P,>(load: () => Promise<{ default: React.ComponentType<P> }>) =>
  dynamic(load, { loading: ViewLoading });

/**
 * activeView string -> screen. The KEY is the human-readable title that
 * `useAdminStore().activeView` and the `?view=` param both carry — not the nav
 * item's `id`. Mixing those up is the classic break here.
 */
export const V3_VIEWS: Record<string, React.ComponentType<any>> = {
  Analytics: d(() => import("./AdminV3Analytics").then((m) => ({ default: m.AdminV3Analytics }))),
  Orders: d(() => import("./AdminV3Orders").then((m) => ({ default: m.AdminV3Orders }))),
  POS: d(() => import("./AdminV3POS").then((m) => ({ default: m.AdminV3POS }))),
  Menu: d(() => import("./AdminV3Menu").then((m) => ({ default: m.AdminV3Menu }))),
  Customers: d(() => import("./AdminV3Customers").then((m) => ({ default: m.AdminV3Customers }))),
  Reviews: d(() => import("./AdminV3Reviews").then((m) => ({ default: m.AdminV3Reviews }))),
  Website: d(() => import("./AdminV3Website").then((m) => ({ default: m.AdminV3Website }))),
  QrCodes: d(() => import("./AdminV3QrCodes").then((m) => ({ default: m.AdminV3QrCodes }))),
  Notices: d(() => import("./AdminV3Notices").then((m) => ({ default: m.AdminV3Notices }))),
  Loyalty: d(() => import("./AdminV3Loyalty").then((m) => ({ default: m.AdminV3Loyalty }))),
  Notify: d(() => import("./AdminV3Notify").then((m) => ({ default: m.AdminV3Notify }))),
  Offers: d(() => import("./AdminV3Offers").then((m) => ({ default: m.AdminV3Offers }))),
  Discounts: d(() => import("./AdminV3Discounts").then((m) => ({ default: m.AdminV3Discounts }))),
  "Delivery Boys": d(() => import("./AdminV3DeliveryBoys").then((m) => ({ default: m.AdminV3DeliveryBoys }))),
  "Delivery Pool": d(() => import("./AdminV3DeliveryPool").then((m) => ({ default: m.AdminV3DeliveryPool }))),
  "Porter & Rapido": d(() => import("./AdminV3PorterRapido").then((m) => ({ default: m.AdminV3PorterRapido }))),
  Settings: d(() => import("./AdminV3Settings").then((m) => ({ default: m.AdminV3Settings }))),
  Settlements: d(() => import("./AdminV3Settlements").then((m) => ({ default: m.AdminV3Settlements }))),
  Billing: d(() => import("./AdminV3Billing").then((m) => ({ default: m.AdminV3Billing }))),
  Tutorials: d(() => import("./AdminV3Tutorials").then((m) => ({ default: m.AdminV3Tutorials }))),
  WhatsApp: d(() => import("./AdminV3WhatsApp").then((m) => ({ default: m.AdminV3WhatsApp }))),
};

/**
 * WhatsApp sub-screens, reached from the hub rather than the sidebar.
 *
 * "ApiUsage" and "Catalogue" are deliberately absent — v3 has no screen for
 * them yet, so the hub's own fallback pushes those to admin-v2 instead.
 */
export const V3_WA_SCREENS: Partial<
  Record<AdminV3WhatsAppScreen, React.ComponentType<any>>
> = {
  Inbox: d(() => import("./AdminV3WhatsAppInbox").then((m) => ({ default: m.AdminV3WhatsAppInbox }))),
  Templates: d(() => import("./AdminV3WhatsAppTemplates").then((m) => ({ default: m.AdminV3WhatsAppTemplates }))),
  Flows: d(() => import("./AdminV3WhatsAppFlows").then((m) => ({ default: m.AdminV3WhatsAppFlows }))),
  Broadcast: d(() => import("./AdminV3WhatsAppBroadcast").then((m) => ({ default: m.AdminV3WhatsAppBroadcast }))),
  Comeback: d(() => import("./AdminV3WhatsAppComeback").then((m) => ({ default: m.AdminV3WhatsAppComeback }))),
  LinkClicks: d(() => import("./AdminV3WhatsAppLinkClicks").then((m) => ({ default: m.AdminV3WhatsAppLinkClicks }))),
};
