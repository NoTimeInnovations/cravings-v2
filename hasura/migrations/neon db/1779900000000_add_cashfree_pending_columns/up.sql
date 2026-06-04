-- Pending-payment Cashfree orders: persist the order BEFORE payment so the
-- webhook/cron can finalize it even if the customer never returns to the app.
-- cf_pp_payload holds the prebuilt Petpooja push-order payload (petpooja
-- partners only), pushed at finalize time. cf_finalized_at is the idempotency
-- claim stamp so webhook + client + cron racing each other finalize only once.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cf_pp_payload jsonb,
  ADD COLUMN IF NOT EXISTS cf_finalized_at timestamptz;

-- Fast lookup for the reconciler cron (pending_payment orders by age).
CREATE INDEX IF NOT EXISTS orders_pending_cf_idx
  ON public.orders (status, created_at)
  WHERE status = 'pending_payment';
