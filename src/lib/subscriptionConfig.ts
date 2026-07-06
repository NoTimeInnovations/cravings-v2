// Central config for the partner subscription/billing model (₹3000 Pro plan +
// 100-order free trial). Kept client-safe (no server-only imports) so both the
// admin-v2 gate UI and server actions can share the same constants.

/** Internal plan id of the recurring ₹3000/month Pro plan (Razorpay autopay). */
export const PRO_PLAN_ID = "in_pro_monthly";

/** Internal plan ids of the order-capped free trials this model enforces. */
export const TRIAL_PLAN_IDS = ["in_trial_100"] as const;

/**
 * The ONLY plans whose partners the admin-v2 access gate engages for. Existing
 * legacy-plan partners (in_digital, in_ordering, …) are intentionally excluded —
 * many are already past their expiryDate and must keep working exactly as before.
 * New signups get in_trial_100; superadmin can move a partner onto in_trial_100
 * or in_pro_monthly to opt them into this model.
 */
export const GATED_PLAN_IDS: string[] = [...TRIAL_PLAN_IDS, PRO_PLAN_ID];

/** Free-trial order allowance before the trial ends. */
export const TRIAL_ORDER_LIMIT = 100;

/** Show the "trial ending" warning banner from this order count onward. */
export const TRIAL_WARN_AT = 95;

/**
 * Grace window after the 100th order before admin-v2 is blocked. Anchored to the
 * 100th order's created_at so it needs no persisted timestamp.
 */
export const TRIAL_GRACE_HOURS = 24;

/** WhatsApp support line shown on the blocked screen (same number as Help & Support). */
export const SUPPORT_WHATSAPP = "918590115462";

export function isTrialPlan(planId: string | null | undefined): boolean {
  return !!planId && (TRIAL_PLAN_IDS as readonly string[]).includes(planId);
}

export function isProPlan(planId: string | null | undefined): boolean {
  return planId === PRO_PLAN_ID;
}

/** Whether the access gate should evaluate this plan at all. */
export function isGatedPlan(planId: string | null | undefined): boolean {
  return !!planId && GATED_PLAN_IDS.includes(planId);
}
