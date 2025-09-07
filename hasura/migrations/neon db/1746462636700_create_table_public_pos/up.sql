CREATE TABLE "public"."pos" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "total_amt" integer NOT NULL, "phone" integer DEFAULT 0, "order_id" uuid, PRIMARY KEY ("id") , FOREIGN KEY ("order_id") REFERENCES "public"."order_items"("id") ON UPDATE restrict ON DELETE restrict);COMMENT ON TABLE "public"."pos" IS E'track pos';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
