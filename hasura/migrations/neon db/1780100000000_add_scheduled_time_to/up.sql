-- Slot end time, stored at booking so a booked slot displays as a full
-- "from – to" range without depending on the partner's current settings.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_time_to time;
