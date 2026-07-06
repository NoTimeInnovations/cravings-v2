DROP INDEX IF EXISTS public.idx_wa_flow_exec_resume;
ALTER TABLE public.whatsapp_flow_execution_state
  DROP COLUMN IF EXISTS phone_number_id,
  DROP COLUMN IF EXISTS resume_at;
