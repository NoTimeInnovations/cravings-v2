-- Dine-in table reservation: party size (number of guests) on a prebooked order.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS booking_persons int NULL;
