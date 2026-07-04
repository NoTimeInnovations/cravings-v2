"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  MessageCircle,
  Workflow,
  Bike,
  Loader2,
  X,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { Partner, useAuthStore } from "@/store/authStore";
import { getFeatures, revertFeatureToString } from "@/lib/getFeatures";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { setAllFlowsEnabled } from "@/lib/whatsappFlowsBulk";
import { provisionDefaultFlows } from "@/app/actions/provisionDefaultFlows";

/**
 * "Get started" onboarding checklist on the admin dashboard, under the WhatsApp
 * connect card. Steps to start receiving orders:
 *   1. Connect own WhatsApp Business number   (auto: live connection status)
 *   2. Turn on all WhatsApp flows             (auto: all flows enabled; has a
 *                                              "Turn on all" action right here)
 *   3. Set ordering details                   (MANUAL only — see below)
 *
 * Ordering has default values seeded for every new partner, so it can't be
 * auto-detected reliably; it's marked done ONLY when the partner explicitly
 * ticks it. Manual completions + "don't show again" are persisted to Hasura
 * (partners.storefront_settings.dashboardOnboarding) so they survive reloads and
 * follow the partner across devices. The "remind me later" cadence (reappear
 * every 3rd open) is a per-device nudge and stays in localStorage — it mutates
 * on every open, so a DB write each time would be wasteful.
 */

type StepId = "whatsapp" | "flows" | "ordering";

/** Shape stored at storefront_settings.dashboardOnboarding. */
interface OnboardingDb {
  dismissed?: boolean;
  overrides?: Partial<Record<StepId, boolean>>;
}

/** localStorage shape (per-device reappear cadence only). */
interface OnboardingLocal {
  openCount?: number;
  snoozeUntil?: number;
}

const REMIND_EVERY = 3;
const lsKey = (id: string) => `dashboard-onboarding_${id}`;
const sessionCountKey = (id: string) => `dashboard-onboarding-counted_${id}`;

function readLocal(id: string): OnboardingLocal {
  try {
    return JSON.parse(localStorage.getItem(lsKey(id)) || "{}") || {};
  } catch {
    return {};
  }
}

function writeLocal(id: string, next: OnboardingLocal) {
  try {
    localStorage.setItem(lsKey(id), JSON.stringify(next));
  } catch {
    /* SSR / private mode — ignore */
  }
}

/** Parse the partners.storefront_settings JSON (string or object) safely. */
function parseStorefrontSettings(sf: unknown): Record<string, any> {
  if (!sf) return {};
  if (typeof sf === "string") {
    try {
      return JSON.parse(sf);
    } catch {
      return {};
    }
  }
  return sf as Record<string, any>;
}

interface DashboardGetStartedProps {
  partner: Partner;
  /** Deep-link to Settings → Integrations (WhatsApp connect). */
  onConnectWhatsApp: () => void;
  /** Deep-link to Settings → Ordering → Delivery. */
  onOrderingDetails: () => void;
}

export default function DashboardGetStarted({
  partner,
  onConnectWhatsApp,
  onOrderingDetails,
}: DashboardGetStartedProps) {
  const partnerId = partner?.id;
  const setAuthState = useAuthStore((s) => s.setState);

  const feats = useMemo(
    () => getFeatures(partner?.feature_flags || null),
    [partner?.feature_flags],
  );
  const showFlows = !!(feats.whatsappOrdering?.access || feats.whatsappOrdering?.enabled);
  const showOrdering = !!(
    feats.ordering?.access ||
    feats.delivery?.access ||
    feats.ordering?.enabled ||
    feats.delivery?.enabled
  );

  // DB-persisted onboarding state (manual completions + dismissed), derived from
  // the partner so it stays reactive to authStore updates (optimistic saves).
  const dbOnb = useMemo<OnboardingDb>(() => {
    const sf = parseStorefrontSettings((partner as any)?.storefront_settings);
    return (sf.dashboardOnboarding || {}) as OnboardingDb;
  }, [(partner as any)?.storefront_settings]);
  const dismissed = !!dbOnb.dismissed;
  const overrides = dbOnb.overrides || {};

  // Live status (null = still loading).
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [flowsAllOn, setFlowsAllOn] = useState<boolean | null>(null);
  const [flowsBusy, setFlowsBusy] = useState(false);

  // Per-device nudge state (localStorage).
  const [hydrated, setHydrated] = useState(false);
  const [snoozedHidden, setSnoozedHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openCountRef = useRef(0);
  const [saving, setSaving] = useState(false);

  // Hydrate the reappear counter once per browser session and decide snoozing.
  useEffect(() => {
    if (!partnerId) return;
    const st = readLocal(partnerId);
    let openCount = st.openCount || 0;
    try {
      const sk = sessionCountKey(partnerId);
      if (!sessionStorage.getItem(sk)) {
        openCount += 1;
        sessionStorage.setItem(sk, "1");
        writeLocal(partnerId, { ...st, openCount });
      }
    } catch {
      /* ignore */
    }
    openCountRef.current = openCount;
    setSnoozedHidden(!!st.snoozeUntil && openCount < (st.snoozeUntil || 0));
    setHydrated(true);
  }, [partnerId]);

  // WhatsApp own-number connected?
  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/whatsapp/meta/status?partnerId=${partnerId}`);
        const j = await r.json();
        if (!cancelled) setWaConnected(!!j?.connected);
      } catch {
        if (!cancelled) setWaConnected(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  // All flows turned on? (Only when the WhatsApp feature exists.)
  useEffect(() => {
    if (!partnerId || !showFlows) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/whatsapp/flows?partnerId=${partnerId}`);
        const j = await r.json();
        const flows = Array.isArray(j?.flows) ? j.flows : [];
        if (!cancelled)
          setFlowsAllOn(flows.length > 0 && flows.every((f: any) => !!f?.enabled));
      } catch {
        if (!cancelled) setFlowsAllOn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, showFlows]);

  // Persist a change to storefront_settings.dashboardOnboarding: optimistic
  // authStore update, then DB write (revert + toast on failure).
  const persistOnboarding = async (mutate: (cur: OnboardingDb) => OnboardingDb) => {
    if (!partnerId) return;
    // Read the freshest value from the store (not the closed-over prop) so a
    // second save builds on the previous one's optimistic result rather than a
    // stale snapshot — avoids one write clobbering another's field.
    const original = (useAuthStore.getState().userData as any)?.storefront_settings;
    const sf = parseStorefrontSettings(original);
    const nextOnb = mutate((sf.dashboardOnboarding || {}) as OnboardingDb);
    const merged = { ...sf, dashboardOnboarding: nextOnb };
    setAuthState({ storefront_settings: merged } as any); // optimistic
    setSaving(true);
    try {
      await updatePartner(partnerId, { storefront_settings: merged });
      revalidateTag(partnerId);
    } catch {
      setAuthState({ storefront_settings: original } as any); // revert
      toast.error("Couldn't save your progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleOverride = (id: StepId) => {
    if (saving) return;
    persistOnboarding((o) => {
      const ov = { ...(o.overrides || {}) };
      if (ov[id]) delete ov[id];
      else ov[id] = true;
      return { ...o, overrides: ov };
    });
  };

  const handleNever = () => {
    if (saving) return; // don't race an in-flight save (last-write-wins on the JSON column)
    setMenuOpen(false);
    persistOnboarding((o) => ({ ...o, dismissed: true }));
  };

  const handleRemindLater = () => {
    if (partnerId) {
      const st = readLocal(partnerId);
      writeLocal(partnerId, { ...st, snoozeUntil: openCountRef.current + REMIND_EVERY });
    }
    setSnoozedHidden(true);
    setMenuOpen(false);
  };

  const refreshFlowsAllOn = async () => {
    if (!partnerId) return;
    try {
      const r = await fetch(`/api/whatsapp/flows?partnerId=${partnerId}`);
      const j = await r.json();
      const fl = Array.isArray(j?.flows) ? j.flows : [];
      setFlowsAllOn(fl.length > 0 && fl.every((f: any) => !!f?.enabled));
    } catch {
      /* keep prior */
    }
  };

  const turnOnAllFlows = async () => {
    if (!partnerId || flowsBusy) return;
    setFlowsBusy(true);
    try {
      // Partners who've never opened the Flows tab have no flows seeded yet, so
      // "Turn on all" would be a dead-end. Seed the built-ins first (idempotent —
      // same call the Flows screen makes on mount) so there's something to enable.
      if (feats.whatsappOrdering?.enabled) {
        try {
          await provisionDefaultFlows(partnerId);
        } catch {
          /* best-effort — fall through to enable whatever exists */
        }
        // Also flip on "Read receipt & typing on Welcome" (whatsappFlowTyping)
        // so the welcome flow shows the blue tick + typing animation. Same write
        // the Flows screen's toggle does; preserves every other feature flag.
        try {
          const f = getFeatures(
            (useAuthStore.getState().userData as any)?.feature_flags || null,
          );
          if (!f.whatsappFlowTyping?.enabled) {
            const featureString = revertFeatureToString({
              ...f,
              whatsappFlowTyping: { access: true, enabled: true },
            });
            await updatePartner(partnerId, { feature_flags: featureString });
            setAuthState({ feature_flags: featureString });
            revalidateTag(partnerId);
          }
        } catch {
          /* best-effort — the flows still get turned on below */
        }
      }
      const { total } = await setAllFlowsEnabled(partnerId, true);
      if (total === 0) {
        toast.info("No flows to turn on yet.");
        await refreshFlowsAllOn();
      } else {
        setFlowsAllOn(true);
        toast.success("All WhatsApp flows are on.");
      }
    } catch {
      toast.error("Couldn't turn on all flows. Please try again.");
      await refreshFlowsAllOn();
    } finally {
      setFlowsBusy(false);
    }
  };

  // Step definitions (computed each render — cheap). Ordering has no auto check.
  const steps: {
    id: StepId;
    title: string;
    desc: string;
    icon: React.ElementType;
    show: boolean;
    auto: boolean;
    loading: boolean;
    cta: string;
    onCta: () => void;
    ctaBusy: boolean;
    /** Show an explicit "Complete" button that marks the step done manually. */
    manualComplete?: boolean;
  }[] = [
    {
      id: "whatsapp",
      title: "Connect WhatsApp",
      desc: "Link your own WhatsApp Business number to take orders on chat.",
      icon: MessageCircle,
      show: true,
      auto: waConnected === true,
      loading: waConnected === null,
      cta: "Connect",
      onCta: onConnectWhatsApp,
      ctaBusy: false,
    },
    {
      id: "flows",
      title: "Turn on WhatsApp flows",
      desc: "Enable all flows so customers can order and get live updates.",
      icon: Workflow,
      show: showFlows,
      auto: flowsAllOn === true,
      loading: showFlows && flowsAllOn === null,
      cta: flowsBusy ? "Turning on…" : "Turn on all",
      onCta: turnOnAllFlows,
      ctaBusy: flowsBusy,
    },
    {
      id: "ordering",
      title: "Set ordering details",
      desc: "Delivery radius, delivery & takeaway timings, and delivery pricing.",
      icon: Bike,
      show: showOrdering,
      auto: false, // manual only — defaults are seeded, so we don't auto-detect
      loading: false,
      cta: "Set up",
      onCta: onOrderingDetails,
      ctaBusy: false,
      manualComplete: true, // seeded defaults can't be auto-detected → explicit Complete
    },
  ];

  const visibleSteps = steps.filter((s) => s.show);
  const isDone = (s: (typeof visibleSteps)[number]) => s.auto || !!overrides[s.id];
  const doneCount = visibleSteps.filter(isDone).length;
  const total = visibleSteps.length;
  const allDone = total > 0 && doneCount === total;

  if (!hydrated || dismissed || snoozedHidden || total === 0) return null;

  const closeMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Hide"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      {menuOpen && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-lg border bg-popover py-1 shadow-lg">
            <button
              type="button"
              onClick={handleRemindLater}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            >
              Remind me later
            </button>
            <button
              type="button"
              onClick={handleNever}
              className="block w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            >
              Don&apos;t show again
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Compact "all set" state — keeps the card unobtrusive once everything's done.
  if (allDone) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          </span>
          <div>
            <p className="text-sm font-semibold">You&apos;re all set to receive orders 🎉</p>
            <p className="text-xs text-muted-foreground">Setup complete — {doneCount}/{total} done.</p>
          </div>
        </div>
        {closeMenu}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Rocket className="h-4 w-4 text-orange-600" />
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight">Get started</h2>
            <p className="text-xs text-muted-foreground">
              Make the necessary setup to start getting orders.
            </p>
          </div>
        </div>
        {closeMenu}
      </div>

      {/* progress */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-600 transition-all"
            style={{ width: `${(doneCount / total) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {doneCount}/{total}
        </span>
      </div>

      {/* steps */}
      <div className="mt-2 divide-y">
        {visibleSteps.map((step) => {
          const done = isDone(step);
          return (
            <div key={step.id} className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => toggleOverride(step.id)}
                aria-label={done ? "Mark as not done" : "Mark as done"}
                className="shrink-0"
                disabled={step.auto || step.loading || step.ctaBusy || saving}
              >
                {step.loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="block h-5 w-5 rounded-full border-2 border-muted-foreground/30 transition-colors hover:border-green-500" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium leading-tight ${
                    done ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                  {step.desc}
                </p>
              </div>

              {!done && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={step.onCta}
                    disabled={step.ctaBusy}
                    className="inline-flex items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-60 dark:hover:bg-orange-950/30"
                  >
                    {step.ctaBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {step.cta}
                    {!step.ctaBusy && <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  {step.manualComplete && (
                    <button
                      type="button"
                      onClick={() => toggleOverride(step.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-0.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      Complete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
