-- Idempotent stock claim for orders. Additive only.
--
-- stock_committed: authoritative "this order currently holds stock" flag. Set
--   true (atomically) when the order decrements stock at placement; set false
--   when it restocks on cancel/expire/delete. Guarantees decrement-once /
--   restock-at-most-once via affected_rows-gated conditional updates.
-- stock_date: the exact date bucket that was decremented, so restock hits the
--   same menu_date_stocks row regardless of server-vs-device timezone.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_committed boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_date date;
