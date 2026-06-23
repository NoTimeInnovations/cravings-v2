-- WhatsApp broadcast delivery + cost tracking.
-- STRICTLY ADDITIVE: only ADD COLUMN IF NOT EXISTS / CREATE INDEX / CREATE TABLE.
-- No DROP / DELETE / ALTER-of-existing-columns. No existing data is touched.

-- 1) Per-recipient delivery timeline + pricing/cost captured from Meta status webhooks.
ALTER TABLE "public"."whatsapp_broadcast_recipients"
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "read_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "failed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "error_code" text,
  ADD COLUMN IF NOT EXISTS "error_title" text,
  ADD COLUMN IF NOT EXISTS "billable" boolean,
  ADD COLUMN IF NOT EXISTS "pricing_category" text,
  ADD COLUMN IF NOT EXISTS "pricing_model" text,
  ADD COLUMN IF NOT EXISTS "cost_amount" numeric(12,6),
  ADD COLUMN IF NOT EXISTS "cost_currency" text;

-- The webhook maps a status callback's message id -> recipient via meta_message_id.
CREATE INDEX IF NOT EXISTS "wa_broadcast_recipients_meta_msg_idx"
  ON "public"."whatsapp_broadcast_recipients" ("meta_message_id");

-- 2) Per-broadcast aggregate delivery counters + total cost.
ALTER TABLE "public"."whatsapp_broadcasts"
  ADD COLUMN IF NOT EXISTS "delivered_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "read_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_cost" numeric(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cost_currency" text;

-- 3) Global message ledger: delivery + pricing/cost on EVERY outbound message
--    (broadcast, OTP, order update, inbox) so spend can be tracked over time.
ALTER TABLE "public"."whatsapp_message_logs"
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "read_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "billable" boolean,
  ADD COLUMN IF NOT EXISTS "pricing_category" text,
  ADD COLUMN IF NOT EXISTS "cost_amount" numeric(12,6),
  ADD COLUMN IF NOT EXISTS "cost_currency" text;

CREATE INDEX IF NOT EXISTS "idx_whatsapp_logs_meta_msg"
  ON "public"."whatsapp_message_logs" ("meta_message_id");

-- 4) Rate card — editable source of truth for cost math.
--    market = ISO-3166 alpha-2 of the RECIPIENT's country, or 'DEFAULT' fallback.
--    price is expressed in `currency` (Meta's billing currency for that market);
--    the cost engine converts to the business's display currency when they differ.
CREATE TABLE IF NOT EXISTS "public"."whatsapp_message_rates" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "market" text NOT NULL,
  "category" text NOT NULL,
  "price" numeric(10,6) NOT NULL,
  "currency" text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "effective_from" date NOT NULL DEFAULT now(),
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "wa_message_rates_market_cat_idx"
  ON "public"."whatsapp_message_rates" ("market", "category");

-- Seed approximate current Meta per-message rates (2025 PMP model). These are
-- ESTIMATES and editable — the UI labels per-broadcast cost as estimated and
-- cross-checks the month total against Meta's pricing_analytics.
INSERT INTO "public"."whatsapp_message_rates" ("market","category","price","currency","is_default","notes") VALUES
  ('IN','marketing',0.880000,'INR',false,'India PMP marketing'),
  ('IN','utility',0.160000,'INR',false,'India PMP utility'),
  ('IN','authentication',0.130000,'INR',false,'India PMP authentication'),
  ('US','marketing',0.025000,'USD',false,'US PMP marketing'),
  ('US','utility',0.004000,'USD',false,'US PMP utility'),
  ('US','authentication',0.013500,'USD',false,'US PMP authentication'),
  ('GB','marketing',0.052900,'USD',false,'UK PMP marketing'),
  ('GB','utility',0.022000,'USD',false,'UK PMP utility'),
  ('GB','authentication',0.035800,'USD',false,'UK PMP authentication'),
  ('AE','marketing',0.038400,'USD',false,'UAE PMP marketing'),
  ('AE','utility',0.015700,'USD',false,'UAE PMP utility'),
  ('AE','authentication',0.015700,'USD',false,'UAE PMP authentication'),
  ('QA','marketing',0.076800,'USD',false,'Qatar PMP marketing'),
  ('QA','utility',0.015700,'USD',false,'Qatar PMP utility'),
  ('QA','authentication',0.029400,'USD',false,'Qatar PMP authentication'),
  ('SA','marketing',0.045500,'USD',false,'Saudi PMP marketing'),
  ('SA','utility',0.011800,'USD',false,'Saudi PMP utility'),
  ('SA','authentication',0.017700,'USD',false,'Saudi PMP authentication'),
  ('DEFAULT','marketing',0.050000,'USD',true,'Fallback marketing'),
  ('DEFAULT','utility',0.010000,'USD',true,'Fallback utility'),
  ('DEFAULT','authentication',0.015000,'USD',true,'Fallback authentication')
ON CONFLICT ("market","category") DO NOTHING;
