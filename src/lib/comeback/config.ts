/**
 * Every policy number for Comeback Messages, in one file, each with the reason
 * it is what it is.
 *
 * Nothing else in the feature may hard-code one of these. Meta's marketing rules
 * are genuinely unstable — the US marketing pause has been "temporary" since
 * April 2025, the per-user cap is deliberately unpublished and adapts per person
 * — so when a rule moves, it has to move in exactly one place.
 */

/** Reasons a batch can be refused. Rendered to the partner verbatim. */
export type BlockedReason =
  | "no_template"
  | "no_number"
  | "whatsapp_off"
  | "quality_low"
  | "quota_low"
  | "audience_empty"
  | "monthly_cap"
  | "too_soon";

// ─────────────────────────── who gets messaged ───────────────────────────

/**
 * A customer is "quiet" once they have missed roughly two of their OWN ordering
 * cycles — not a flat 30 days. A tiffin regular who orders every other day and a
 * fine-dining room whose guests come quarterly are both restaurants here, and a
 * single threshold is wrong for at least one of them.
 */
export const CADENCE_MULTIPLIER = 2;

/**
 * Floor on the cadence trigger. Even for a daily-order customer we will not send
 * MARKETING three days after their last order — that reads as nagging, and a
 * block costs the partner far more than the order is worth (block rate is the
 * heaviest negative input to Meta's quality rating, which also protects their
 * order confirmations). At 21 days a daily customer has missed ~10 cycles.
 */
export const MIN_TRIGGER_DAYS = 21;

/**
 * Ceiling on the cadence trigger, so a customer with one freak 8-month gap in
 * their history does not push their own trigger past the staleness cap and become
 * permanently unreachable.
 */
export const MAX_TRIGGER_DAYS = 75;

/**
 * Past this we do not message at all. Beyond six months a "we miss you" is a cold
 * marketing message to someone with no live relationship: worst response rate,
 * highest block and report rate.
 */
export const STALENESS_CAP_DAYS = 180;

/**
 * Default minimum lifetime visits to qualify. Someone who came exactly once is a
 * different problem with a different fix (the first visit disappointed them, or
 * they were passing through) and is the coldest possible audience. Partners can
 * opt one-timers in explicitly; we do not do it for them.
 */
export const DEFAULT_MIN_VISITS = 2;

/**
 * Orders from one identity inside this window are one visit. 47.6% of consecutive
 * orders in this database are within 24h of each other — a table ordering three
 * rounds is one visit, and counting them as three would corrupt both the visit
 * threshold and every cadence calculation built on inter-visit gaps.
 */
export const VISIT_COLLAPSE_HOURS = 4;

/**
 * Order statuses that are not real sales. An abandoned Cashfree checkout writes a
 * pending_payment row with a fresh created_at, which would silently reset a
 * genuinely lapsed customer's recency and hide them forever.
 */
export const NON_SALE_STATUSES = ["cancelled", "canceled", "pending_payment", "expired"];

// ─────────────────────────── how often ───────────────────────────

/** Never contact the same person twice inside this window. */
export const PER_CUSTOMER_COOLDOWN_DAYS = 60;

/**
 * Lifetime comeback attempts per customer before we stop for good. The third
 * message in a win-back ladder has the worst response and the highest block rate;
 * two is where the evidence stops supporting another send.
 */
export const MAX_ATTEMPTS_PER_CUSTOMER = 2;

/** After the last attempt, leave them alone for this long. */
export const SUNSET_DAYS = 180;

/** Minimum gap between batches, enforced in the build cron, not just the UI. */
export const MIN_BATCH_INTERVAL_DAYS = 7;

/** Hard ceiling on comeback messages per partner per calendar month. */
export const DEFAULT_MONTHLY_MESSAGE_CAP = 400;

// ─────────────────────────── when ───────────────────────────

/** Local-time send window. Nothing goes out while people are asleep or at work. */
export const SEND_HOUR_START = 11;
export const SEND_HOUR_END = 20;

/**
 * 93% of partners here are Asia/Kolkata, so a fixed send hour would pin every
 * partner's batch to the same instant and hand the once-a-minute dispatcher a
 * thundering herd it cannot drain inside its 60s budget. Each partner gets a
 * stable pseudo-random minute inside the window instead, derived from their id.
 */
export const JITTER_WITHIN_WINDOW = true;

// ─────────────────────────── safety ───────────────────────────

/**
 * Refuse to build when the sending number has less than this share of its Meta
 * daily quota left. Comeback is the least important traffic on the number — order
 * confirmations and OTPs must never be starved by marketing.
 */
export const MAX_QUOTA_SHARE = 0.35;

/** Abort a send tick after this many consecutive failures. */
export const CONSECUTIVE_FAILURE_ABORT = 5;

/** Abort a send tick once this share of the batch has failed. */
export const BATCH_FAILURE_ABORT_RATIO = 0.3;

/** A preview nobody approved goes stale — the audience it describes has moved on. */
export const PREVIEW_EXPIRY_HOURS = 48;

// ─────────────────────────── measurement ───────────────────────────

/**
 * Share of the eligible audience held back un-messaged, so the result is a
 * measured difference against a control rather than a reactivation percentage
 * that counts everyone who would have returned anyway.
 */
export const HOLDOUT_RATIO = 0.1;

/**
 * Below this audience size a 10% holdout is 3 people, and one of them returning
 * swings the headline by a third. Under this threshold we hold nobody back and
 * say plainly that the batch is too small to measure on its own — results pool
 * across batches over time instead.
 */
export const MIN_AUDIENCE_FOR_HOLDOUT = 40;

/** Days after sending that a return still counts as a return. */
export const ATTRIBUTION_WINDOW_DAYS = 14;

/**
 * Below this share of orders carrying a phone, we cannot see most returns: a
 * dine-in guest who walks back in because of the message is invisible. Above the
 * threshold we report incrementality; below it we say what we cannot see instead
 * of publishing a number we know is wrong.
 */
export const MIN_PHONE_COVERAGE_FOR_HEADLINE = 0.6;

// ─────────────────────────── money ───────────────────────────

/**
 * Refuse an offer worth more than this share of a typical order. Restaurant net
 * margins run 3-9%; a discount set carelessly is the entire financial risk here,
 * not the sub-rupee message fee.
 */
export const MAX_OFFER_SHARE_OF_AOV = 0.2;

/** Rough per-marketing-message cost used for the pre-send estimate, in INR. */
export const EST_MARKETING_COST_INR = 0.88;

// ─────────────────────────── Meta error codes ───────────────────────────

/**
 * Permanent, Meta-enforced, per-business marketing block: the customer used
 * WhatsApp's own "Offers and announcements → Not interested" control. The
 * business cannot reverse it and retrying damages the quality rating, so this is
 * recorded as a hard opt-out the moment we see it.
 */
export const ERR_USER_MARKETING_OPTOUT = "131050";

/**
 * Per-user marketing cap: the send API returned 200 and the failure arrived later
 * on the status webhook. Not the partner's fault, not a reason to stop the batch,
 * and explicitly not a reason to retry inside 24h.
 */
export const ERR_PER_USER_LIMIT = "131049";

/** Meta's permanent marketing holdout experiment. Never billed, never delivered. */
export const ERR_MARKETING_EXPERIMENT = "130472";

/** Codes that mean "stop this batch now" rather than "this one recipient failed". */
export const ABORT_ON_ERROR_CODES = [
  "131048", // spam rate limit hit
  "130429", // cloud API rate limit
  "131031", // account locked/restricted
  "190", // token expired or invalid
];

/** Codes that are expected, per-recipient, and must not count toward the abort thresholds. */
export const BENIGN_ERROR_CODES = [
  ERR_PER_USER_LIMIT,
  ERR_MARKETING_EXPERIMENT,
  ERR_USER_MARKETING_OPTOUT,
];

/**
 * Marketing templates are not delivered to US numbers — paused by Meta since
 * 1 April 2025 with no announced end date. Sending anyway burns quality signal on
 * guaranteed failures, so these are excluded at build time.
 */
export const MARKETING_BLOCKED_DIAL_CODES = ["1"];
