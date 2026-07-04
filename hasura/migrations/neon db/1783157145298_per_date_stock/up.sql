-- Per-date stock (prebooking-aware inventory). Additive only.
--
-- An item becomes "date-capped" when stocks.daily_default IS NOT NULL (and we set
-- stock_type = 'DATE'). For such items, stock is tracked per calendar date in
-- menu_date_stocks instead of the global stocks.stock_quantity counter, so each
-- bookable date locks independently once it sells out.

-- 1. Opt-in marker + per-day default cap. NULL => item not capped (always available).
ALTER TABLE "public"."stocks" ADD COLUMN IF NOT EXISTS "daily_default" numeric NULL;

-- 2. Per-(item, date) remaining counter.
CREATE TABLE IF NOT EXISTS "public"."menu_date_stocks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "menu_id" uuid NOT NULL,
  "date" date NOT NULL,
  "stock_quantity" numeric NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON UPDATE cascade ON DELETE cascade,
  CONSTRAINT "menu_date_stocks_menu_date_key" UNIQUE ("menu_id", "date")
);

CREATE INDEX IF NOT EXISTS "menu_date_stocks_menu_id_idx" ON "public"."menu_date_stocks" ("menu_id");
CREATE INDEX IF NOT EXISTS "menu_date_stocks_date_idx" ON "public"."menu_date_stocks" ("date");
