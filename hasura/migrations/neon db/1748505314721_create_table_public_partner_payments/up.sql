CREATE TABLE "public"."partner_payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "partner_id" uuid NOT NULL, "date" date NOT NULL, "amount" numeric NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON UPDATE restrict ON DELETE restrict, UNIQUE ("id"));
CREATE EXTENSION IF NOT EXISTS pgcrypto;
