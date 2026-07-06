// Resolve a plan's `features_enabled` (from plans.json, the source of truth) into
// the partners.feature_flags CSV string, MERGING with the partner's existing flags
// so unrelated flags (storefront, newonboarding, whatsappOrdering, …) are preserved
// on upgrade instead of being clobbered.

import plansData from "@/data/plans.json";

// Feature flags this billing model manages via a plan's `features_enabled`.
const MANAGED_KEYS = [
  "ordering",
  "delivery",
  "multiwhatsapp",
  "pos",
  "stockmanagement",
  "captainordering",
  "purchasemanagement",
] as const;

export function planFeaturesEnabledMap(
  planId: string | null | undefined,
): Record<string, boolean> {
  if (!planId) return {};
  const all = [...plansData.india, ...plansData.international] as any[];
  const plan = all.find((p) => p.id === planId);
  return (plan?.features_enabled as Record<string, boolean>) || {};
}

/**
 * Turn ON every managed feature the plan enables, keep any managed feature that
 * isn't enabled at its existing value (defaulting to "-false" if unseen), and
 * leave every non-managed flag exactly as it was.
 */
export function applyPlanFeatureFlags(
  planId: string | null | undefined,
  existingFlags?: string | null,
  inlineFeaturesEnabled?: Record<string, boolean> | null,
): string {
  // Prefer plans.json (source of truth); fall back to an inline features_enabled
  // map for plans passed by id that aren't present in plans.json.
  let enabled = planFeaturesEnabledMap(planId);
  if (Object.keys(enabled).length === 0 && inlineFeaturesEnabled) {
    enabled = inlineFeaturesEnabled;
  }

  // Parse existing "key-value" CSV into a map (value is the string after the last "-").
  const map = new Map<string, string>();
  (existingFlags || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((f) => {
      const i = f.lastIndexOf("-");
      if (i > 0) map.set(f.slice(0, i), f.slice(i + 1));
    });

  for (const key of MANAGED_KEYS) {
    if (enabled[key]) map.set(key, "true");
    else if (!map.has(key)) map.set(key, "false");
  }

  return Array.from(map.entries())
    .map(([k, v]) => `${k}-${v}`)
    .join(",");
}
