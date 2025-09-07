CREATE TABLE "public"."stocks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "stock_quantity" numeric NOT NULL DEFAULT 9999, "menu_id" uuid NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON UPDATE restrict ON DELETE restrict, UNIQUE ("id"));
CREATE EXTENSION IF NOT EXISTS pgcrypto;
