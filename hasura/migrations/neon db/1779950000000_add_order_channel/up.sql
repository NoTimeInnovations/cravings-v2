-- Distinguish where a customer order was placed from: the website ("web") vs a
-- published TWA Android app ("app"). Detected client-side (android-app://
-- referrer + standalone/fullscreen display-mode) since the TWA loads the same
-- site in Chrome and is otherwise indistinguishable server-side.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_channel text;
