-- Support "Delay" flow steps (wait up to 24h, then continue). A delayed run is
-- parked SLEEPING: status stays 'active' (holds the single conversation slot),
-- resume_at holds the wake time, phone_number_id records the number to send from
-- when the resume-flow-delays cron wakes it. Both columns are additive/nullable.
ALTER TABLE public.whatsapp_flow_execution_state
  ADD COLUMN IF NOT EXISTS resume_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_number_id text;

-- Partial index: the cron only ever scans due, sleeping runs.
CREATE INDEX IF NOT EXISTS idx_wa_flow_exec_resume
  ON public.whatsapp_flow_execution_state (resume_at)
  WHERE (status = 'active' AND resume_at IS NOT NULL);
