alter table "public"."orders" add column "status_history" jsonb
 null default jsonb_build_object();
