"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Target, X } from "lucide-react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { getFeatures } from "@/lib/getFeatures";
import { setAllFlowsEnabled } from "@/lib/whatsappFlowsBulk";
import { Partner, useAuthStore } from "@/store/authStore";
import { AdminV3Button, MiniProgress, V3Card } from "../ui/primitives";
import type { WhatsAppStatus } from "./RightRail";

/**
 * The three-step setup checklist.
 *
 * Detection and persistence mirror admin-v2's DashboardGetStarted: WhatsApp
 * connection and flow state are DETECTED from the API rather than stored, and
 * only the manual override / dismissal live in
 * `partners.storefront_settings.dashboardOnboarding`. That column is read-
 * modify-written by several unrelated settings sections and is stored as a JSON
 * *string* on many rows, so it is always parsed defensively and merged, never
 * replaced.
 */

type OnboardingDb = {
  dismissed?: boolean;
  overrides?: Record<string, boolean>;
};

/** storefront_settings is a string on some rows and an object on others. */
function parseStorefrontSettings(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, any>;
  try {
    const parsed = JSON.parse(raw as string);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function GetStartedCard({
  whatsapp,
  onRefreshWhatsApp,
}: {
  whatsapp: WhatsAppStatus | null;
  onRefreshWhatsApp: () => void;
}) {
  const { userData, setState } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id;

  const [busy, setBusy] = React.useState(false);
  const router = useRouter();

  const onboarding: OnboardingDb = React.useMemo(() => {
    const sf = parseStorefrontSettings((partner as any)?.storefront_settings);
    return (sf.dashboardOnboarding || {}) as OnboardingDb;
  }, [(partner as any)?.storefront_settings]);

  const persist = async (mutate: (cur: OnboardingDb) => OnboardingDb) => {
    if (!partnerId) return;
    const original = (useAuthStore.getState().userData as any)?.storefront_settings;
    const sf = parseStorefrontSettings(original);
    // Merge, never replace: other settings sections own other keys in here.
    const merged = { ...sf, dashboardOnboarding: mutate((sf.dashboardOnboarding || {}) as OnboardingDb) };
    setState({ storefront_settings: merged } as any);
    try {
      await updatePartner(partnerId, { storefront_settings: merged });
    } catch (e) {
      console.error("[V3 GetStarted] persist failed:", e);
      setState({ storefront_settings: original } as any);
      toast.error("Couldn't save that");
    }
  };

  const flowsTotal = whatsapp?.flowsTotal ?? 0;
  const flowsActive = whatsapp?.flowsActive ?? 0;

  // Gate the same way admin-v2's DashboardGetStarted does. Without this, a
  // partner with no WhatsApp feature is told to "Connect WhatsApp" and to turn
  // on flows they cannot reach, and — because the progress bar divides by the
  // step count — their checklist can never read more than 1/3 complete no
  // matter what they do.
  const feats = React.useMemo(
    () => getFeatures(partner?.feature_flags || null),
    [partner?.feature_flags],
  );
  const showWhatsApp = !!(
    feats.whatsappOrdering?.access || feats.whatsappOrdering?.enabled
  );
  const showOrdering = !!(
    feats.ordering?.access ||
    feats.delivery?.access ||
    feats.ordering?.enabled ||
    feats.delivery?.enabled
  );

  const allSteps = [
    {
      key: "whatsapp",
      title: "Connect WhatsApp",
      description: "Link your own WhatsApp Business number to take orders on chat.",
      show: showWhatsApp,
      done: !!whatsapp?.connected,
      action: { label: "Connect", href: "/admin-v2?view=WhatsApp" },
    },
    {
      key: "flows",
      title: "Turn on WhatsApp flows",
      description: "Enable all flows so customers can order and get live updates.",
      show: showWhatsApp,
      done: flowsTotal > 0 && flowsActive === flowsTotal,
      turnOnAll: !!whatsapp?.connected && flowsTotal > 0,
    },
    {
      key: "ordering",
      title: "Set ordering details",
      description: "Delivery radius, delivery & takeaway timings, and delivery pricing.",
      show: showOrdering,
      done: !!onboarding.overrides?.ordering,
      action: { label: "Set up", href: "/admin-v2?view=Settings&sg=ordering&ss=delivery" },
    },
  ];

  const steps = allSteps.filter((s) => s.show);
  const doneCount = steps.filter((s) => s.done).length;
  const pct = steps.length ? (doneCount / steps.length) * 100 : 0;

  // Fully set up, dismissed, or nothing applicable → the card has done its job.
  if (onboarding.dismissed || steps.length === 0 || doneCount === steps.length) {
    return null;
  }

  const turnOnAllFlows = async () => {
    if (!partnerId || busy) return;
    setBusy(true);
    try {
      await setAllFlowsEnabled(partnerId, true);
      toast.success("All WhatsApp flows turned on");
      onRefreshWhatsApp();
    } catch (e) {
      console.error("[V3 GetStarted] turn on flows failed:", e);
      toast.error("Couldn't turn on the flows");
    } finally {
      setBusy(false);
    }
  };

  return (
    <V3Card className="shrink-0 px-[22px] py-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          <Target size={18} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15.5px] font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50">
            Get started
          </div>
          <div className="mt-0.5 text-[13px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
            Make the necessary setup to start getting orders.
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="whitespace-nowrap text-xs font-bold leading-none text-zinc-600 dark:text-zinc-300">
            {doneCount}/{steps.length} complete
          </span>
          <button
            type="button"
            aria-label="Dismiss setup checklist"
            onClick={() => persist((o) => ({ ...o, dismissed: true }))}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={15} strokeWidth={1.9} />
          </button>
        </div>
      </div>

      <MiniProgress value={pct} className="mb-1.5 mt-4" />

      <div>
        {steps.map((step, i) => (
          <div
            key={step.key}
            className={[
              "flex items-center gap-3.5 py-3.5",
              i < steps.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : "",
            ].join(" ")}
          >
            {step.done ? (
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <Check size={12} strokeWidth={3} />
              </span>
            ) : (
              <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px] border-zinc-200 dark:border-zinc-700" />
            )}

            <div className="min-w-0 flex-1">
              <div
                className={[
                  "text-[13.5px] font-medium leading-tight",
                  step.done ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-950 dark:text-zinc-50",
                ].join(" ")}
              >
                {step.title}
              </div>
              <div
                className={[
                  "mt-px text-[12.5px] font-medium leading-tight",
                  step.done ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400",
                ].join(" ")}
              >
                {step.description}
              </div>
            </div>

            {step.done ? (
              <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-[9px] py-[3px] text-[11px] font-bold leading-none text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
                Done
              </span>
            ) : step.turnOnAll ? (
              <AdminV3Button
                variant="primary"
                disabled={busy}
                onClick={turnOnAllFlows}
                className="h-8 shrink-0 px-3 text-[12.5px]"
              >
                {busy ? "Turning on…" : "Turn on all"}
                <ChevronRight size={13} strokeWidth={2.2} />
              </AdminV3Button>
            ) : step.action ? (
              <AdminV3Button
                variant="secondary"
                onClick={() => router.push(step.action!.href)}
                className="h-8 shrink-0 px-3 text-[12.5px]"
              >
                {step.action.label}
                <ChevronRight size={13} strokeWidth={2.2} />
              </AdminV3Button>
            ) : null}
          </div>
        ))}
      </div>
    </V3Card>
  );
}
