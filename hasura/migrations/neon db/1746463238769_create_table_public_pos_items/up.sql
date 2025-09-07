CREATE TABLE "public"."pos_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "menu_id" uuid NOT NULL, "pos_id" uuid NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("pos_id") REFERENCES "public"."pos"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON UPDATE restrict ON DELETE restrict, UNIQUE ("id"));
CREATE EXTENSION IF NOT EXISTS pgcrypto;
