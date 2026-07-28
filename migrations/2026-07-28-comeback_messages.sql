-- 2026-07-28 — Comeback Messages
--
-- Backs the WhatsApp → Comeback Messages screen: an always-on win-back sender
-- that finds customers who have quietly stopped coming and, once a human has
-- approved the batch, messages them through the existing broadcast pipeline.
--
-- Additive + idempotent — safe to run on production. After running it, reload
-- Hasura metadata and TRACK the five new tables, or every query below returns
-- "field not found in type: query_root".
--
-- Design notes worth keeping with the schema:
--
--  * Approving a batch inserts an ordinary whatsapp_broadcasts row plus its
--    whatsapp_broadcast_recipients, and the existing /api/cron/dispatch-broadcasts
--    worker sends it untouched. That is deliberate: it inherits delivery/read
--    receipts, per-message cost reconciliation, cancel/resume, CSV export, and —
--    critically — makes comeback traffic visible to the same daily-cap accounting
--    as everything else. A parallel sender would have got none of that.
--
--  * comeback_contact_log is the ledger that makes "we never pester the same
--    person" true across batches. Rows are written at BUILD time with a hold, not
--    at approval, so two unapproved previews cannot both contain the same person
--    and double-send when the owner approves both.
--
--  * marketing_consent is per (partner, phone). Consent given to one restaurant
--    is not consent for another, which is also what makes the shared-number case
--    safe: 32 partners send from one phone_number_id, and a customer who opted
--    out of one of them must not keep hearing from the rest.

-- ─────────────────────────── per-partner settings ───────────────────────────

CREATE TABLE IF NOT EXISTS comeback_settings (
  partner_id            uuid PRIMARY KEY REFERENCES partners(id) ON DELETE CASCADE,
  enabled               boolean NOT NULL DEFAULT false,
  -- Which display segments to include. Empty array = no segment restriction
  -- (eligibility is the cadence rule; segments only narrow it further).
  segments              text[] NOT NULL DEFAULT '{}',
  min_visits            integer NOT NULL DEFAULT 2,
  -- Template used for the message. Stored by name + language because that is what
  -- the Graph send call takes; template_id is kept for the UI to resolve back.
  template_id           uuid,
  template_name         text,
  template_language     text NOT NULL DEFAULT 'en',
  -- Position of the dynamic URL button in the template, when it has one.
  url_button_index      integer,
  send_from_phone_number_id text,
  -- Optional offer attached to touch 2. Flat rupees only; percentage-off is not
  -- offered because it scales with the bill against a 3-9% net margin.
  offer_discount_id     uuid,
  monthly_message_cap   integer NOT NULL DEFAULT 400,
  -- Cron bookkeeping. locked_at makes the claim-lock idiom implementable; without
  -- it the nightly builder cannot avoid overlapping ticks.
  locked_at             timestamptz,
  last_built_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- The build cron scans for due partners; this keeps that scan off a seq scan.
CREATE INDEX IF NOT EXISTS comeback_settings_due_idx
  ON comeback_settings (enabled, last_built_at)
  WHERE enabled = true;

-- ─────────────────────────── batches ───────────────────────────

CREATE TABLE IF NOT EXISTS comeback_batches (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  -- preview → approving → approved → sent → measured, or discarded / expired / blocked.
  status                text NOT NULL DEFAULT 'preview',
  blocked_reason        text,
  blocked_detail        text,
  -- Full exclusion arithmetic, shown to the partner so the audience size is
  -- explainable rather than a bare number: {totalCustomers, noPhone, badPhone,
  -- tooRecent, tooStale, tooFewVisits, cooldown, optedOut, noConsent, eligible}.
  breakdown             jsonb NOT NULL DEFAULT '{}'::jsonb,
  treatment_count       integer NOT NULL DEFAULT 0,
  holdout_count         integer NOT NULL DEFAULT 0,
  est_cost              numeric NOT NULL DEFAULT 0,
  est_cost_currency     text,
  -- treatment_count × the offer's maximum value: the worst case if every single
  -- messaged customer redeems. The discount, not the sub-rupee message fee, is
  -- the real money at risk.
  est_discount_exposure numeric NOT NULL DEFAULT 0,
  template_name         text,
  template_language     text,
  -- Rendered body of the message exactly as it will arrive, so approval is
  -- informed consent rather than a leap of faith.
  message_preview       text,
  send_from_phone_number_id text,
  -- Set when approved: the broadcast this batch became.
  broadcast_id          uuid,
  phone_coverage        numeric,
  store_cadence_days    integer,
  built_at              timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  approved_at           timestamptz,
  approved_by           text,
  scheduled_at          timestamptz,
  measure_due_at        timestamptz,
  measured_at           timestamptz,
  -- Outcome, filled by the measure cron.
  results               jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comeback_batches_partner_idx
  ON comeback_batches (partner_id, created_at DESC);

-- At most ONE batch per partner awaiting a decision. This is the constraint that
-- makes stacked previews impossible: without it the nightly builder would create
-- a fresh preview every night against a cooldown ledger that has not yet been
-- written, and approving two of them would message the same people twice.
CREATE UNIQUE INDEX IF NOT EXISTS comeback_batches_one_live_idx
  ON comeback_batches (partner_id)
  WHERE status IN ('preview', 'approving');

CREATE INDEX IF NOT EXISTS comeback_batches_measure_idx
  ON comeback_batches (measure_due_at)
  WHERE status = 'sent';

-- ─────────────────────────── recipients ───────────────────────────

CREATE TABLE IF NOT EXISTS comeback_recipients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          uuid NOT NULL REFERENCES comeback_batches(id) ON DELETE CASCADE,
  -- Last 9 digits of the country-qualified number: the identity that folds a
  -- guest checkout and a signed-in account for the same human into one person.
  identity_key      text NOT NULL,
  phone             text NOT NULL,
  name              text,
  -- 'treatment' is messaged; 'holdout' is deliberately not, so the result is a
  -- measured difference rather than a reactivation rate that counts people who
  -- would have come back anyway.
  arm               text NOT NULL DEFAULT 'treatment',
  segment           text,
  visits            integer,
  total_spent       numeric,
  days_quiet        integer,
  cadence_days      integer,
  trigger_days      integer,
  -- Whether they returned inside the attribution window, and what it was worth.
  returned          boolean,
  returned_at       timestamptz,
  return_value      numeric,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- One row per human per batch, enforced on the PHONE identity rather than on a
-- user_id, because the same person can arrive through both. A CONSTRAINT, not a
-- unique index: Hasura only accepts real constraints in on_conflict.
ALTER TABLE comeback_recipients
  DROP CONSTRAINT IF EXISTS comeback_recipients_batch_identity_key,
  ADD CONSTRAINT comeback_recipients_batch_identity_key UNIQUE (batch_id, identity_key);

CREATE INDEX IF NOT EXISTS comeback_recipients_batch_idx
  ON comeback_recipients (batch_id, arm);

-- ─────────────────────────── contact ledger ───────────────────────────

CREATE TABLE IF NOT EXISTS comeback_contact_log (
  partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  identity_key    text NOT NULL,
  attempts        integer NOT NULL DEFAULT 0,
  last_contact_at timestamptz,
  -- Set at BUILD time. While this is in the future the person cannot be pulled
  -- into another batch, which is what stops an unapproved preview from being
  -- silently duplicated by the next night's build.
  reserved_until  timestamptz,
  -- Holdout members get rows too, with virtual_send = true, so both arms age out
  -- of the pool at the same rate. Otherwise the control group would slowly fill
  -- with chronically unresponsive people and stop being comparable.
  virtual_send    boolean NOT NULL DEFAULT false,
  sunset_until    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, identity_key)
);

CREATE INDEX IF NOT EXISTS comeback_contact_log_partner_idx
  ON comeback_contact_log (partner_id, last_contact_at);

-- ─────────────────────────── marketing consent ───────────────────────────

CREATE TABLE IF NOT EXISTS marketing_consent (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  -- Identity key, same shape as comeback_recipients.identity_key.
  identity_key  text NOT NULL,
  phone         text NOT NULL,
  -- Where it was collected: 'checkout', 'whatsapp_reply', 'import', 'manual'.
  source        text NOT NULL,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  -- Verbatim wording the customer agreed to, so consent is auditable years later
  -- rather than a bare boolean whose meaning has been lost.
  consent_text  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Must be a CONSTRAINT rather than a unique index — the consent upsert relies on
-- it in on_conflict, and Hasura rejects bare unique indexes there.
ALTER TABLE marketing_consent
  DROP CONSTRAINT IF EXISTS marketing_consent_partner_identity_key,
  ADD CONSTRAINT marketing_consent_partner_identity_key UNIQUE (partner_id, identity_key);

CREATE INDEX IF NOT EXISTS marketing_consent_partner_idx
  ON marketing_consent (partner_id) WHERE revoked_at IS NULL;

-- ─────────────────────────── supporting index ───────────────────────────

-- The audience builder scans a partner's orders back ~2 years. Without this the
-- nightly build is a seq scan of the orders table per partner.
CREATE INDEX IF NOT EXISTS orders_partner_created_idx
  ON orders (partner_id, created_at DESC);

-- ─────────────── per-segment messages (added same day) ───────────────
--
-- One template per customer group rather than one for everybody: "we miss you"
-- is wrong for someone who enquired and never ordered, and a lapsed VIP should
-- not get the same words as a one-and-done. A group with no template here is
-- simply never messaged, which is also how a partner switches one off.

CREATE TABLE IF NOT EXISTS comeback_segment_templates (
  partner_id        uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  segment           text NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  template_id       uuid,
  template_name     text,
  template_language text NOT NULL DEFAULT 'en',
  url_button_index  integer,
  -- Days of silence before THIS group is messaged. Null falls back to the
  -- partner-wide setting, and then to each customer's own ordering rhythm.
  trigger_days      integer,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, segment)
);

ALTER TABLE comeback_settings
  -- With auto_send on, the rule runs unattended: no preview waits for approval.
  ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trigger_days integer,
  ADD COLUMN IF NOT EXISTS check_every_hours integer NOT NULL DEFAULT 24;
