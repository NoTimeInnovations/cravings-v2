/**
 * Server-only WhatsApp feature gating.
 *
 * `whatsappOrdering` is the master switch for a partner's WhatsApp business suite
 * (Inbox, Broadcast, Templates, Flows) — the same flag that gates the admin nav.
 * When it's OFF, every WhatsApp send/flow path must stop. This module provides a
 * cheap, cached check so gating never slows the hot inbound path.
 *
 * Fail-closed: if the flag can't be resolved we treat WhatsApp as DISABLED.
 * (Partners can only reach these features in the UI when the flag is on, so any
 * partner actually using broadcasts/flows already has it enabled.)
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { getFeatures } from "@/lib/getFeatures";

// Parse `whatsappOrdering.enabled` straight from a feature_flags CSV string —
// zero DB round-trips. Use this when the string is already in hand (e.g. folded
// into the webhook's cached phone→partner lookup).
export function whatsappEnabledFromFlags(
  featureFlags: string | null | undefined,
): boolean {
  return !!getFeatures(featureFlags ?? null).whatsappOrdering?.enabled;
}

// Welcome-flow read receipt + typing animation. Requires BOTH the WhatsApp
// Ordering master switch AND the whatsappFlowTyping sub-toggle. The webhook
// already has the feature_flags string in hand (folded into the cached lookup),
// so this is a pure parse — zero DB round-trips. The runtime additionally only
// fires it when the welcome flow actually runs (handled in the flow engine), so
// welcome-enable / once-per-customer / cooldown are all respected automatically.
export function flowTypingEnabledFromFlags(
  featureFlags: string | null | undefined,
): boolean {
  const f = getFeatures(featureFlags ?? null);
  return !!(f.whatsappOrdering?.enabled && f.whatsappFlowTyping?.enabled);
}

// Per-instance cache of partner → whatsappOrdering.enabled. Feature flags change
// rarely; a 60s TTL bounds staleness (a toggle applies within a minute) and keeps
// the per-broadcast / per-request check effectively free on a warm instance.
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; enabled: boolean }>();

export async function isWhatsappEnabled(partnerId: string): Promise<boolean> {
  if (!partnerId) return false;
  const hit = cache.get(partnerId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.enabled;

  let enabled = false;
  try {
    const q = `query PartnerFeatureFlags($id: uuid!) {
      partners_by_pk(id: $id) { feature_flags }
    }`;
    const d = await fetchFromHasuraServer(q, { id: partnerId });
    enabled = whatsappEnabledFromFlags(d?.partners_by_pk?.feature_flags ?? null);
  } catch (e) {
    // Fail-closed but DON'T cache the error, so a transient blip re-checks next time.
    console.error("isWhatsappEnabled lookup failed:", e);
    return false;
  }
  cache.set(partnerId, { at: Date.now(), enabled });
  return enabled;
}
