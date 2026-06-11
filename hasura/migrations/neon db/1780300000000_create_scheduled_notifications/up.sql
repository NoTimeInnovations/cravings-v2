-- Scheduled & recurring broadcast notifications for the partner "Notify" feature.
--
-- Today AdminV2Notify sends a single push immediately. These two tables add
-- "schedule for later" and "recurring" support, designed for many partners
-- running many schedules at once:
--
--   scheduled_notifications      one row per schedule. `next_run_at` (indexed,
--                                always UTC) is the single column a once-a-minute
--                                Vercel cron polls to find what is due. Recurring
--                                rows are re-armed (next_run_at recomputed from
--                                cron_expr + timezone) after each fire.
--
--   scheduled_notification_runs  append-only audit of every fire. The
--                                UNIQUE(schedule_id, run_at) constraint is also
--                                the idempotency guard: even if two cron
--                                invocations overlap, only one run row inserts,
--                                so a notification is never double-sent.
--
-- All writes go through the server-only admin client (hasuraServerClient); the
-- browser never touches these tables. Token resolution + send happen server-side
-- at fire time (never snapshotted at create), so recipients are always current.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

  -- payload
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  audience text NOT NULL DEFAULT 'app' CHECK (audience IN ('app','followers')),

  -- schedule definition
  schedule_type text NOT NULL CHECK (schedule_type IN ('once','recurring')),
  scheduled_at timestamptz,                 -- for schedule_type = 'once'
  cron_expr text,                           -- for schedule_type = 'recurring' (5-field cron)
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',  -- IANA tz the cron_expr / scheduled_at is interpreted in
  start_at timestamptz,                     -- optional: don't fire before this (recurring)
  end_at timestamptz,                       -- optional: stop firing after this (recurring)
  max_runs integer,                         -- optional: stop after this many fires (recurring)

  -- lifecycle (managed server-side)
  next_run_at timestamptz,                  -- next UTC fire time; NULL once completed/cancelled
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  locked_at timestamptz,                    -- reserved for optional claim hardening

  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scheduled_notifications_once_has_time
    CHECK (schedule_type <> 'once' OR scheduled_at IS NOT NULL),
  CONSTRAINT scheduled_notifications_recurring_has_cron
    CHECK (schedule_type <> 'recurring' OR cron_expr IS NOT NULL)
);

-- The hot path: the dispatcher cron asks "what is due now?" once a minute.
-- Partial index keeps it tiny — only active schedules are ever scanned.
CREATE INDEX IF NOT EXISTS scheduled_notifications_due_idx
  ON public.scheduled_notifications (next_run_at)
  WHERE status = 'active';

-- The manage list: a partner's schedules, newest first.
CREATE INDEX IF NOT EXISTS scheduled_notifications_partner_idx
  ON public.scheduled_notifications (partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.scheduled_notification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.scheduled_notifications(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL,              -- the scheduled slot this run satisfies
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  recipients_count integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Idempotency: at most one run per (schedule, slot). A duplicate insert from an
  -- overlapping cron invocation fails here and is skipped — never double-sent.
  CONSTRAINT scheduled_notification_runs_schedule_run_key UNIQUE (schedule_id, run_at)
);

CREATE INDEX IF NOT EXISTS scheduled_notification_runs_schedule_idx
  ON public.scheduled_notification_runs (schedule_id, created_at DESC);
