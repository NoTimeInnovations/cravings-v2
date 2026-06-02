-- Prebooking (scheduled orders) feature.
-- Scheduled date/time on orders (restaurant-local; NULL = immediate order).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_date date NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_time time NULL;

-- Partner-level prebooking config (lead time, max days ahead, daily windows, allowed order types).
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS prebooking_settings jsonb NULL;
