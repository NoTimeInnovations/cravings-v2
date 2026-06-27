-- WhatsApp REAL cost tracking from Meta pricing_analytics.
-- STRICTLY ADDITIVE: only ADD COLUMN IF NOT EXISTS / CREATE TABLE / CREATE INDEX.
-- No DROP / DELETE / ALTER-of-existing-columns. No existing data is touched.
--
-- Cost model (two layers):
--   1) ESTIMATE  — written the moment a message is delivered, from the rate card
--      (official published seed, or the real rate already observed from this WABA's
--      own pricing_analytics). Clearly labelled as an estimate in the UI.
--   2) ACTUAL    — Meta's real billed cost, pulled from the WhatsApp Business
--      Account `pricing_analytics` Graph field (cost ÷ volume per market/category/
--      type bucket) by a reconciliation cron, a few hours after delivery. This
--      OVERWRITES the estimate and flips cost_source -> 'meta_analytics'.

-- 1) Per-recipient: keep BOTH the estimate and the reconciled actual, plus the
--    pricing type, the reconciliation state, and which number actually sent it
--    (partner WABA vs Menuthere fallback → reconcile against the right WABA).
ALTER TABLE "public"."whatsapp_broadcast_recipients"
  ADD COLUMN IF NOT EXISTS "pricing_type" text,
  ADD COLUMN IF NOT EXISTS "cost_estimated" numeric(12,6),
  ADD COLUMN IF NOT EXISTS "cost_source" text,            -- pending|estimate|meta_analytics|meta_free|unmatched
  ADD COLUMN IF NOT EXISTS "cost_reconciled_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "sent_from_phone_number_id" text;

-- delivered_at drives reconciliation matching (which Meta time-bucket a message
-- falls in); index it for the range scans the reconciler runs.
CREATE INDEX IF NOT EXISTS "wa_recipients_delivered_at_idx"
  ON "public"."whatsapp_broadcast_recipients" ("delivered_at");
CREATE INDEX IF NOT EXISTS "wa_recipients_cost_source_idx"
  ON "public"."whatsapp_broadcast_recipients" ("cost_source");

-- 2) Per-broadcast rollup of the reconciliation state.
ALTER TABLE "public"."whatsapp_broadcasts"
  ADD COLUMN IF NOT EXISTS "cost_estimated" numeric(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cost_source" text,            -- estimate|partial|meta_analytics
  ADD COLUMN IF NOT EXISTS "cost_reconciled_at" timestamptz;

-- 3) Global message ledger — same fields so spend across OTP/order/inbox/broadcast
--    can be reconciled and reported the same way.
ALTER TABLE "public"."whatsapp_message_logs"
  ADD COLUMN IF NOT EXISTS "pricing_type" text,
  ADD COLUMN IF NOT EXISTS "cost_estimated" numeric(12,6),
  ADD COLUMN IF NOT EXISTS "cost_source" text,
  ADD COLUMN IF NOT EXISTS "cost_reconciled_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "sent_from_phone_number_id" text;

CREATE INDEX IF NOT EXISTS "wa_logs_delivered_at_idx"
  ON "public"."whatsapp_message_logs" ("delivered_at");

-- 4) Raw Meta pricing_analytics ledger — the SOURCE OF TRUTH for actual cost and
--    the source of "observed" real rates used for future estimates. One row per
--    (waba, time-bucket, country, category, pricing_type, tier). Dimension columns
--    are NOT NULL DEFAULT '' so the unique key works for idempotent upserts
--    (Postgres treats NULLs as distinct, which would break ON CONFLICT).
CREATE TABLE IF NOT EXISTS "public"."whatsapp_pricing_analytics" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "waba_id" text NOT NULL,
  "partner_id" uuid,
  "period_start" timestamptz NOT NULL,
  "period_end" timestamptz NOT NULL,
  "granularity" text NOT NULL,                            -- HALF_HOUR|DAILY|MONTHLY
  "country" text NOT NULL DEFAULT '',                     -- ISO-2 (Meta dimension COUNTRY)
  "pricing_category" text NOT NULL DEFAULT '',            -- MARKETING|UTILITY|AUTHENTICATION|...
  "pricing_type" text NOT NULL DEFAULT '',                -- REGULAR|FREE_ENTRY_POINT|FREE_CUSTOMER_SERVICE|...
  "tier" text NOT NULL DEFAULT '',                        -- volume tier (omitted by Meta for free msgs)
  "volume" bigint NOT NULL DEFAULT 0,
  "cost" numeric(16,6) NOT NULL DEFAULT 0,
  "currency" text,                                        -- Meta's billing currency for this WABA
  "fetched_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "wa_pricing_analytics_bucket_uidx"
  ON "public"."whatsapp_pricing_analytics"
  ("waba_id", "period_start", "period_end", "granularity", "country", "pricing_category", "pricing_type", "tier");
-- Reconciler matches a delivered message to the bucket whose [start,end) contains
-- delivered_at and whose dimensions match.
CREATE INDEX IF NOT EXISTS "wa_pricing_analytics_match_idx"
  ON "public"."whatsapp_pricing_analytics"
  ("waba_id", "country", "pricing_category", "period_start", "period_end");
-- Observed-rate lookup (latest real rate per market/category/type) for estimates.
CREATE INDEX IF NOT EXISTS "wa_pricing_analytics_observed_idx"
  ON "public"."whatsapp_pricing_analytics"
  ("country", "pricing_category", "pricing_type", "period_end");
