ALTER TABLE public.partners DROP COLUMN IF EXISTS prebooking_settings;
ALTER TABLE public.orders DROP COLUMN IF EXISTS scheduled_time;
ALTER TABLE public.orders DROP COLUMN IF EXISTS scheduled_date;
