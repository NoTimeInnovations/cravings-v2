DROP INDEX IF EXISTS public.orders_pending_cf_idx;
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS cf_pp_payload,
  DROP COLUMN IF EXISTS cf_finalized_at;
