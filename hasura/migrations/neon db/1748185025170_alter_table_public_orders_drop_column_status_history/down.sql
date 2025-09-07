alter table "public"."orders" alter column "status_history" set default jsonb_build_object();
alter table "public"."orders" alter column "status_history" drop not null;
alter table "public"."orders" add column "status_history" jsonb;
