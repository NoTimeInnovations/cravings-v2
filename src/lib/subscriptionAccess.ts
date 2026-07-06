// Pure decision logic for the partner subscription access model. No I/O — callers
// pass in the current subscription_details, live order usage, and (when past the
// trial cap) the 100th order's timestamp; this returns what admin-v2 should do.
//
// SCOPE: only partners on a gated plan (in_trial_100 or in_pro_monthly) are ever
// evaluated. Everyone else resolves to "ok" so legacy-plan partners are untouched.

import plansData from "@/data/plans.json";
import {
  GATED_PLAN_IDS,
  PRO_PLAN_ID,
  TRIAL_GRACE_HOURS,
  TRIAL_ORDER_LIMIT,
  TRIAL_PLAN_IDS,
  TRIAL_WARN_AT,
  isProPlan,
  isTrialPlan,
} from "./subscriptionConfig";

export type GateState =
  | "ok" // full access, no notice
  | "trial_warning" // approaching the 100-order cap (>= TRIAL_WARN_AT)
  | "trial_grace" // hit the cap; 24h countdown before block
  | "trial_blocked" // trial over + grace elapsed → admin locked
  | "paid_warning" // Pro autopay stopped; access remains until expiry
  | "paid_blocked"; // Pro lapsed past expiry → admin locked

export interface SubscriptionGate {
  state: GateState;
  isBlocked: boolean;
  isTrial: boolean;
  isPro: boolean;
  /** true when this plan is evaluated at all (gated model). */
  isGated: boolean;
  planId: string | null;
  planName: string | null;
  // Trial fields
  usage: number | null;
  limit: number | null;
  remaining: number | null;
  /** When admin will be / was blocked (trial grace end or Pro expiry). */
  blockAt: Date | null;
  // Pro fields
  expiryDate: Date | null;
  /** Razorpay subscription status stored on the partner (active/halted/…). */
  subStatus: string | null;
}

export interface GateInputs {
  subscriptionDetails: any | null | undefined;
  /** Non-cancelled order count for the partner (only needed for trial plans). */
  usage?: number | null;
  /** created_at of the 100th non-cancelled order, if the cap has been reached. */
  hundredthOrderAt?: string | Date | null;
  now?: Date;
}

const PAID_LAPSE_STATUSES = new Set(["halted", "cancelled", "paused", "expired"]);

function planConfig(planId: string | null) {
  if (!planId) return null;
  const all = [...plansData.india, ...plansData.international] as any[];
  return all.find((p) => p.id === planId) || null;
}

function baseGate(planId: string | null, planName: string | null): SubscriptionGate {
  return {
    state: "ok",
    isBlocked: false,
    isTrial: isTrialPlan(planId),
    isPro: isProPlan(planId),
    isGated: !!planId && GATED_PLAN_IDS.includes(planId),
    planId,
    planName,
    usage: null,
    limit: null,
    remaining: null,
    blockAt: null,
    expiryDate: null,
    subStatus: null,
  };
}

export function computeSubscriptionGate(inputs: GateInputs): SubscriptionGate {
  const now = inputs.now ?? new Date();
  const sub = inputs.subscriptionDetails || null;
  const planId: string | null = sub?.plan?.id ?? null;
  const planName: string | null = sub?.plan?.name ?? planConfig(planId)?.name ?? null;

  const gate = baseGate(planId, planName);

  // Not on the gated model → never touch admin access.
  if (!gate.isGated) return gate;

  // ---- Trial (order-capped) ----
  if (gate.isTrial) {
    const cfg = planConfig(planId);
    const limit = (cfg?.order_limit as number) || TRIAL_ORDER_LIMIT;
    const usage = Math.max(0, inputs.usage ?? 0);
    gate.limit = limit;
    gate.usage = usage;
    gate.remaining = Math.max(0, limit - usage);

    if (usage >= limit) {
      // Anchor the grace window to the 100th order's timestamp (deterministic).
      const anchor = inputs.hundredthOrderAt
        ? new Date(inputs.hundredthOrderAt)
        : null;
      const graceMs = TRIAL_GRACE_HOURS * 60 * 60 * 1000;
      // If the 100th-order timestamp can't be resolved (transient query miss),
      // FAIL OPEN: grant a full grace window from now rather than locking the
      // partner out instantly.
      const blockAt =
        anchor && !isNaN(anchor.getTime())
          ? new Date(anchor.getTime() + graceMs)
          : new Date(now.getTime() + graceMs);
      gate.blockAt = blockAt;
      if (now.getTime() >= blockAt.getTime()) {
        gate.state = "trial_blocked";
        gate.isBlocked = true;
      } else {
        gate.state = "trial_grace";
      }
    } else if (usage >= TRIAL_WARN_AT) {
      gate.state = "trial_warning";
    } else {
      gate.state = "ok";
    }
    return gate;
  }

  // ---- Pro (₹3000/mo recurring) ----
  if (gate.isPro) {
    const subStatus: string | null = sub?.status ?? null;
    const expiryDate = sub?.expiryDate ? new Date(sub.expiryDate) : null;
    gate.subStatus = subStatus;
    gate.expiryDate = expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate : null;
    gate.blockAt = gate.expiryDate;

    const pastExpiry = !!gate.expiryDate && now.getTime() >= gate.expiryDate.getTime();
    const autopayStopped = !!subStatus && PAID_LAPSE_STATUSES.has(subStatus);

    if (pastExpiry) {
      // Current billing period is over and Razorpay hasn't renewed → lock admin.
      gate.state = "paid_blocked";
      gate.isBlocked = true;
    } else if (autopayStopped) {
      // Autopay stopped mid-period: keep access until the paid period ends.
      gate.state = "paid_warning";
    } else {
      gate.state = "ok";
    }
    return gate;
  }

  return gate;
}
