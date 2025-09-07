alter table "public"."partners" add column "delivery_rules" jsonb
 null default jsonb_build_object();
