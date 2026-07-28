/**
 * Turning an audience into a batch a partner can look at and approve.
 *
 * The shape of the whole feature is here: nothing sends until a human has seen
 * the exact message, the exact recipients, the exact cost and the worst-case
 * discount exposure, and pressed Approve. Automatic mode is something a partner
 * earns after they have watched it work, not the day-one default — this sends
 * marketing from the same number that carries their order confirmations, and a
 * damaged quality rating takes that down with it.
 */

import crypto from "crypto";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { buildAudience, type AudienceMember, type ExclusionBreakdown } from "./audience";
import { blockedIdentities, comebackHeadroom } from "./guards";
import type { PartnerDialContext } from "./phone";
import {
  HOLDOUT_RATIO,
  MIN_AUDIENCE_FOR_HOLDOUT,
  PER_CUSTOMER_COOLDOWN_DAYS,
  MAX_ATTEMPTS_PER_CUSTOMER,
  EST_MARKETING_COST_INR,
  PREVIEW_EXPIRY_HOURS,
  SEND_HOUR_START,
  SEND_HOUR_END,
  type BlockedReason,
} from "./config";

const DAY_MS = 86_400_000;

/**
 * Stable arm assignment. Hashing (partner, identity) rather than sampling at
 * random means a given customer lands in the same arm every time, so the control
 * group does not quietly reshuffle between batches and destroy comparability.
 */
export function isHoldout(partnerId: string, identityKey: string): boolean {
  const h = crypto.createHash("sha256").update(`${partnerId}:${identityKey}`).digest();
  return (h.readUInt32BE(0) % 1000) / 1000 < HOLDOUT_RATIO;
}

/**
 * Deterministic send minute inside the partner's local window.
 *
 * 93% of partners here are Asia/Kolkata. A fixed send hour would give every
 * approved batch the same scheduled_at and hand the once-a-minute dispatcher a
 * burst it cannot drain inside its 60-second budget, leaving later broadcasts
 * locked and stalled. Spreading partners across the window fixes that without
 * any coordination between them.
 */
export function sendOffsetMinutes(partnerId: string): number {
  const h = crypto.createHash("sha256").update(partnerId).digest();
  const span = (SEND_HOUR_END - SEND_HOUR_START) * 60;
  return h.readUInt32BE(4) % span;
}

/** The next send slot, as a UTC instant, honouring the partner's IANA timezone. */
export function nextSendAt(partnerId: string, timezone: string, now = new Date()): Date {
  const tz = timezone || "Asia/Kolkata";
  const offsetMin = sendOffsetMinutes(partnerId);
  const targetH = SEND_HOUR_START + Math.floor(offsetMin / 60);
  const targetM = offsetMin % 60;

  // Find the partner-local wall-clock time for `now`, then work out how far it is
  // from the target. Intl is the only timezone source available here, so the
  // offset is derived by formatting rather than by arithmetic on a fixed offset —
  // which also makes it DST-correct for the non-India partners.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const localNowMin = Number(parts.hour) * 60 + Number(parts.minute);
  const targetMin = targetH * 60 + targetM;

  let deltaMin = targetMin - localNowMin;
  if (deltaMin <= 0) deltaMin += 24 * 60; // already past today's slot
  return new Date(now.getTime() + deltaMin * 60_000);
}

export interface ContactLedgerRow {
  identity_key: string;
  attempts: number;
  last_contact_at: string | null;
  reserved_until: string | null;
  sunset_until: string | null;
}

const LEDGER_QUERY = `
  query ComebackLedger($partner_id: uuid!) {
    comeback_contact_log(where: { partner_id: { _eq: $partner_id } }) {
      identity_key
      attempts
      last_contact_at
      reserved_until
      sunset_until
    }
  }
`;

const CONSENT_QUERY = `
  query ComebackConsent($partner_id: uuid!) {
    marketing_consent(
      where: { partner_id: { _eq: $partner_id }, revoked_at: { _is_null: true } }
    ) { identity_key }
  }
`;

export interface BuildBatchInput {
  partnerId: string;
  partner: PartnerDialContext & { timezone?: string | null; currency?: string | null };
  minVisits?: number;
  segments?: any[];
  /** Per-segment days-of-silence thresholds, set by the partner. */
  triggerBySegment?: Record<string, number>;
  /** Partner-wide fallback for segments without their own number. */
  triggerDays?: number | null;
  phoneNumberId: string | null;
  /**
   * When true, only customers with a recorded marketing consent are eligible.
   * Off by default: consent capture starts empty, so requiring it on day one
   * would make every batch zero until the checkout opt-in has had months to fill.
   */
  requireConsent?: boolean;
  /** Maximum messages this batch may contain, from the quota headroom check. */
  maxRecipients?: number;
  now?: number;
}

export interface BuiltBatch {
  members: AudienceMember[];
  treatment: AudienceMember[];
  holdout: AudienceMember[];
  breakdown: ExclusionBreakdown;
  phoneCoverage: number;
  storeCadenceDays: number | null;
  /** Set when the batch cannot proceed; members will be empty. */
  blocked?: { reason: BlockedReason; detail: string };
  estCost: number;
  capped: number;
}

/**
 * Assemble a batch: audience, minus everyone we must not or should not contact,
 * split into treatment and holdout.
 */
export async function buildBatch(input: BuildBatchInput): Promise<BuiltBatch> {
  const now = input.now ?? Date.now();

  const audience = await buildAudience({
    partnerId: input.partnerId,
    partner: input.partner,
    minVisits: input.minVisits,
    segments: input.segments,
    triggerBySegment: input.triggerBySegment as any,
    triggerDays: input.triggerDays,
    now,
  });

  const breakdown = audience.breakdown;

  // Hard exclusions. blockedIdentities throws rather than returning empty on
  // failure, so a Hasura blip can never be mistaken for "nobody opted out".
  let blocked: Set<string>;
  try {
    blocked = await blockedIdentities(input.partnerId, input.phoneNumberId, input.partner);
  } catch {
    return {
      members: [], treatment: [], holdout: [], breakdown,
      phoneCoverage: audience.phoneCoverage,
      storeCadenceDays: audience.storeCadenceDays,
      blocked: {
        reason: "quota_low",
        detail: "Couldn't verify who has opted out, so nothing was queued. This will retry.",
      },
      estCost: 0, capped: 0,
    };
  }

  const [ledgerRes, consentRes] = await Promise.all([
    fetchFromHasuraServer(LEDGER_QUERY, { partner_id: input.partnerId }),
    input.requireConsent
      ? fetchFromHasuraServer(CONSENT_QUERY, { partner_id: input.partnerId })
      : Promise.resolve(null),
  ]);
  const ledger = new Map<string, ContactLedgerRow>(
    (ledgerRes?.comeback_contact_log || []).map((r: ContactLedgerRow) => [r.identity_key, r]),
  );
  const consented = consentRes
    ? new Set<string>((consentRes.marketing_consent || []).map((r: any) => r.identity_key))
    : null;

  const eligible: AudienceMember[] = [];
  for (const m of audience.members) {
    if (blocked.has(m.key)) {
      breakdown.optedOut++;
      continue;
    }
    if (consented && !consented.has(m.key)) {
      breakdown.noConsent++;
      continue;
    }
    const led = ledger.get(m.key);
    if (led) {
      const lastMs = led.last_contact_at ? new Date(led.last_contact_at).getTime() : 0;
      const reservedMs = led.reserved_until ? new Date(led.reserved_until).getTime() : 0;
      const sunsetMs = led.sunset_until ? new Date(led.sunset_until).getTime() : 0;
      const withinCooldown = lastMs && now - lastMs < PER_CUSTOMER_COOLDOWN_DAYS * DAY_MS;
      if (
        reservedMs > now ||
        sunsetMs > now ||
        withinCooldown ||
        (led.attempts ?? 0) >= MAX_ATTEMPTS_PER_CUSTOMER
      ) {
        breakdown.cooldown++;
        continue;
      }
    }
    eligible.push(m);
  }
  breakdown.eligible = eligible.length;

  if (!eligible.length) {
    return {
      members: [], treatment: [], holdout: [], breakdown,
      phoneCoverage: audience.phoneCoverage,
      storeCadenceDays: audience.storeCadenceDays,
      blocked: { reason: "audience_empty", detail: "No one is due a comeback message right now." },
      estCost: 0, capped: 0,
    };
  }

  // Split arms. Below the minimum audience a 10% holdout is three people and one
  // of them returning moves the headline by a third — so hold nobody back and let
  // results pool across batches instead of publishing noise as a measurement.
  const useHoldout = eligible.length >= MIN_AUDIENCE_FOR_HOLDOUT;
  const treatmentAll: AudienceMember[] = [];
  const holdout: AudienceMember[] = [];
  for (const m of eligible) {
    if (useHoldout && isHoldout(input.partnerId, m.key)) holdout.push(m);
    else treatmentAll.push(m);
  }

  // Respect the day's remaining quota. Longest-quiet first (audience is already
  // sorted that way) so a capped batch reaches the people closest to timing out.
  const cap = input.maxRecipients ?? treatmentAll.length;
  const treatment = treatmentAll.slice(0, Math.max(0, cap));
  const capped = treatmentAll.length - treatment.length;

  return {
    members: eligible,
    treatment,
    holdout,
    breakdown,
    phoneCoverage: audience.phoneCoverage,
    storeCadenceDays: audience.storeCadenceDays,
    estCost: treatment.length * EST_MARKETING_COST_INR,
    capped,
  };
}

/** When an unapproved preview goes stale. */
export function previewExpiry(from = new Date()): Date {
  return new Date(from.getTime() + PREVIEW_EXPIRY_HOURS * 3_600_000);
}

/** Headroom-aware recipient cap for a partner's next batch. */
export async function recipientCap(
  partnerId: string,
  phoneNumberId: string | null,
): Promise<number> {
  const { headroom } = await comebackHeadroom(partnerId, phoneNumberId);
  return headroom;
}
