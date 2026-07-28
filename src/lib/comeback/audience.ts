/**
 * Builds the list of customers who have quietly stopped coming back.
 *
 * Two things here are easy to get wrong and were got wrong first time round:
 *
 *  1. Reachability comes from the USER row, not orders.phone. orders.phone is a
 *     recently-added column — 1,944 of 4,749 rows this quarter but only 25 of
 *     5,231 two quarters ago — so building the audience from it makes every
 *     long-standing customer look unreachable and hides exactly the people this
 *     feature exists to find. Joining users through user_id turns a partner's
 *     audience from single digits into hundreds.
 *
 *  2. "Quiet" is relative to the customer's OWN rhythm. A flat 30-day rule messages
 *     a twice-weekly regular a fortnight too late and a quarterly diner three
 *     months too early.
 *
 * The seven segments from customerSegments.ts are carried through for display, so
 * the vocabulary matches the Customers screen, but they are NOT the filter:
 * assignSegment classifies anyone active within 30 days as regulars/repeat/new
 * before any dormant branch is reachable, and it lets "vip" shadow "at risk" for
 * a further 60 days — so a cadence-based audience cannot be expressed through it.
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import {
  assignSegment,
  computeVipFloor,
  type SegmentId,
  type CustomerStats,
} from "@/lib/customerSegments";
import {
  CADENCE_MULTIPLIER,
  MIN_TRIGGER_DAYS,
  MAX_TRIGGER_DAYS,
  STALENESS_CAP_DAYS,
  VISIT_COLLAPSE_HOURS,
  NON_SALE_STATUSES,
  DEFAULT_MIN_VISITS,
} from "./config";
import {
  normalizeForPartner,
  identityKey,
  type PartnerDialContext,
  type PhoneRejection,
} from "./phone";

const DAY_MS = 86_400_000;

/** Every order that counts, with the phone resolved from the customer's account. */
const AUDIENCE_QUERY = `
  query ComebackAudience($partner_id: uuid!, $since: timestamptz!, $exclude: [String!]!) {
    orders(
      where: {
        partner_id: { _eq: $partner_id }
        created_at: { _gte: $since }
        _not: { status: { _in: $exclude } }
      }
      order_by: { created_at: asc }
    ) {
      id
      user_id
      phone
      total_price
      created_at
      type
      delivery_address
      user { id phone full_name }
    }
  }
`;

export interface AudienceMember {
  /** Stable identity for this human across guest and signed-in rows. */
  key: string;
  name: string | null;
  /** Country-qualified, ready to send. */
  phone: string;
  visits: number;
  totalSpent: number;
  lastOrderAt: number;
  daysQuiet: number;
  /** This customer's own median gap between visits, in days. */
  cadenceDays: number | null;
  /** The threshold they crossed, derived from their cadence. */
  triggerDays: number;
  segment: SegmentId;
}

export interface ExclusionBreakdown {
  totalCustomers: number;
  noPhone: number;
  badPhone: Partial<Record<PhoneRejection, number>>;
  tooRecent: number;
  tooStale: number;
  tooFewVisits: number;
  /** Filled in by the caller from the contact ledger and opt-out list. */
  cooldown: number;
  optedOut: number;
  noConsent: number;
  eligible: number;
}

export interface AudienceResult {
  members: AudienceMember[];
  breakdown: ExclusionBreakdown;
  /** Share of counted orders carrying a usable phone — gates the results headline. */
  phoneCoverage: number;
  /** Median inter-visit gap across the whole customer base, for display. */
  storeCadenceDays: number | null;
}

interface RawCustomer {
  key: string;
  name: string | null;
  rawPhone: string | null;
  visitTimes: number[];
  totalSpent: number;
  type: string | null;
  deliveryAddress: string | null;
}

/** Median of a numeric list. */
function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Gaps between consecutive VISITS, in days. Orders inside VISIT_COLLAPSE_HOURS of
 * each other are one visit — a table ordering three rounds must not read as three
 * visits two minutes apart, which would drag the customer's median cadence to
 * almost zero and make them permanently "quiet".
 */
function visitGaps(times: number[]): { visits: number[]; gaps: number[] } {
  const collapse = VISIT_COLLAPSE_HOURS * 3_600_000;
  const visits: number[] = [];
  for (const t of times) {
    if (!visits.length || t - visits[visits.length - 1] > collapse) visits.push(t);
    else visits[visits.length - 1] = t; // extend the visit to its last order
  }
  const gaps: number[] = [];
  for (let i = 1; i < visits.length; i++) gaps.push((visits[i] - visits[i - 1]) / DAY_MS);
  return { visits, gaps };
}

/**
 * How long this customer must be silent before we call it. Falls back to the
 * store-wide cadence for customers with only one visit (no personal gap to measure).
 */
export function triggerFor(cadenceDays: number | null, storeCadence: number | null): number {
  const basis = cadenceDays ?? storeCadence;
  if (basis == null) return MIN_TRIGGER_DAYS;
  return Math.min(MAX_TRIGGER_DAYS, Math.max(MIN_TRIGGER_DAYS, Math.round(basis * CADENCE_MULTIPLIER)));
}

export interface BuildAudienceOptions {
  partnerId: string;
  partner: PartnerDialContext;
  minVisits?: number;
  /** Restrict to these display segments. Empty/undefined means no segment filter. */
  segments?: SegmentId[];
  /**
   * Days of silence before a customer in a given segment is due a message.
   * A partner setting this is saying "chase my regulars after a week, my lapsed
   * after two months" — an explicit rule, which beats an inferred one for
   * predictability. Falls back to triggerDays, then to the customer's own rhythm.
   */
  triggerBySegment?: Partial<Record<SegmentId, number>>;
  /** Partner-wide override, used for any segment without its own number. */
  triggerDays?: number | null;
  now?: number;
}

export async function buildAudience(opts: BuildAudienceOptions): Promise<AudienceResult> {
  const now = opts.now ?? Date.now();
  const minVisits = opts.minVisits ?? DEFAULT_MIN_VISITS;

  // Reach back far enough to measure a slow customer's cadence and still see
  // whether they have since gone quiet, without scanning the whole table.
  const since = new Date(now - (STALENESS_CAP_DAYS + 540) * DAY_MS).toISOString();

  const data = await fetchFromHasuraServer(AUDIENCE_QUERY, {
    partner_id: opts.partnerId,
    since,
    exclude: NON_SALE_STATUSES,
  });
  const orders: any[] = data?.orders || [];

  // Fold orders into people. Identity prefers the account id; a guest order with
  // only a phone folds in later on the normalised number.
  const byKey = new Map<string, RawCustomer>();
  let ordersWithPhone = 0;
  for (const o of orders) {
    const rawPhone = o.user?.phone || o.phone || null;
    if (rawPhone) ordersWithPhone++;
    const key = o.user_id || (rawPhone ? `p:${rawPhone}` : null);
    if (!key) continue; // POS walk-in with no identity at all
    const t = new Date(o.created_at).getTime();
    const existing = byKey.get(key);
    if (existing) {
      existing.visitTimes.push(t);
      existing.totalSpent += Number(o.total_price) || 0;
      if (!existing.rawPhone && rawPhone) existing.rawPhone = rawPhone;
      if (!existing.name && o.user?.full_name) existing.name = o.user.full_name;
      existing.type = o.type ?? existing.type;
      existing.deliveryAddress = o.delivery_address ?? existing.deliveryAddress;
    } else {
      byKey.set(key, {
        key,
        name: o.user?.full_name || null,
        rawPhone,
        visitTimes: [t],
        totalSpent: Number(o.total_price) || 0,
        type: o.type ?? null,
        deliveryAddress: o.delivery_address ?? null,
      });
    }
  }

  const breakdown: ExclusionBreakdown = {
    totalCustomers: byKey.size,
    noPhone: 0,
    badPhone: {},
    tooRecent: 0,
    tooStale: 0,
    tooFewVisits: 0,
    cooldown: 0,
    optedOut: 0,
    noConsent: 0,
    eligible: 0,
  };

  // Second fold: collapse the guest row and the account row for one human onto a
  // single normalised phone. Without this the same person is inserted twice under
  // two different keys and receives the campaign twice.
  interface Folded extends RawCustomer {
    e164: string;
    idKey: string;
  }
  const byPhone = new Map<string, Folded>();
  for (const c of byKey.values()) {
    if (!c.rawPhone) {
      breakdown.noPhone++;
      continue;
    }
    const n = normalizeForPartner(c.rawPhone, opts.partner);
    if (!n.ok) {
      breakdown.badPhone[n.reason] = (breakdown.badPhone[n.reason] || 0) + 1;
      continue;
    }
    const id = identityKey(n.value.e164);
    const prior = byPhone.get(id);
    if (prior) {
      prior.visitTimes.push(...c.visitTimes);
      prior.totalSpent += c.totalSpent;
      // Keep whichever identity carries a name — usually the signed-in one.
      if (!prior.name && c.name) prior.name = c.name;
    } else {
      byPhone.set(id, { ...c, e164: n.value.e164, idKey: id });
    }
  }

  // Store-wide cadence, used for customers whose own history is a single visit.
  const allGaps: number[] = [];
  for (const c of byPhone.values()) {
    c.visitTimes.sort((a, b) => a - b);
    allGaps.push(...visitGaps(c.visitTimes).gaps);
  }
  const storeCadence = median(allGaps);

  // VIP floor is a percentile across this restaurant's own repeat customers, so
  // it means the same thing for a tiffin counter and a fine-dining room.
  const statsForFloor: CustomerStats[] = [];
  for (const c of byPhone.values()) {
    const { visits } = visitGaps(c.visitTimes);
    statsForFloor.push({
      totalOrders: visits.length,
      totalSpent: c.totalSpent,
      lastOrderAt: visits[visits.length - 1],
      discountedOrders: 0,
    });
  }
  const vipFloor = computeVipFloor(statsForFloor);

  const members: AudienceMember[] = [];
  for (const c of byPhone.values()) {
    const { visits, gaps } = visitGaps(c.visitTimes);
    const lastOrderAt = visits[visits.length - 1];
    const daysQuiet = (now - lastOrderAt) / DAY_MS;
    const cadence = median(gaps);

    if (visits.length < minVisits) {
      breakdown.tooFewVisits++;
      continue;
    }

    // Segment BEFORE recency, because the threshold now depends on it: a partner
    // can chase regulars after a week and lapsed customers after two months, and
    // which rule applies cannot be known until the customer is classified.
    const segment = assignSegment(
      {
        totalOrders: visits.length,
        totalSpent: c.totalSpent,
        lastOrderAt,
        discountedOrders: 0,
      },
      vipFloor,
      now,
    );
    if (opts.segments?.length && !opts.segments.includes(segment)) continue;

    const trigger =
      opts.triggerBySegment?.[segment] ??
      opts.triggerDays ??
      triggerFor(cadence, storeCadence);

    if (daysQuiet <= trigger) {
      breakdown.tooRecent++;
      continue;
    }
    if (daysQuiet > STALENESS_CAP_DAYS) {
      breakdown.tooStale++;
      continue;
    }

    members.push({
      key: c.idKey,
      name: c.name,
      phone: c.e164,
      visits: visits.length,
      totalSpent: c.totalSpent,
      lastOrderAt,
      daysQuiet: Math.round(daysQuiet),
      cadenceDays: cadence == null ? null : Math.round(cadence),
      triggerDays: trigger,
      segment,
    });
  }

  // Longest-quiet first: they are closest to the staleness cap, so if the batch is
  // capped they are the ones who would otherwise time out unreached.
  members.sort((a, b) => b.daysQuiet - a.daysQuiet);
  breakdown.eligible = members.length;

  return {
    members,
    breakdown,
    phoneCoverage: orders.length ? ordersWithPhone / orders.length : 0,
    storeCadenceDays: storeCadence == null ? null : Math.round(storeCadence),
  };
}
