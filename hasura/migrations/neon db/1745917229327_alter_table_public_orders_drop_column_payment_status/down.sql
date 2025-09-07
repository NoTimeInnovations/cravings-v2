alter table "public"."orders" alter column "payment_status" set default ''unpaid'::text';
alter table "public"."orders" alter column "payment_status" drop not null;
alter table "public"."orders" add column "payment_status" text;
