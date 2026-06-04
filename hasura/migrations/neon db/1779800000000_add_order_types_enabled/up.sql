-- Store-wide order-type availability toggles { delivery, takeaway, dine_in }.
-- NULL = all order types enabled (backward compatible).
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS order_types_enabled jsonb NULL;
