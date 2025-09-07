alter table "public"."order_items" add column "items" jsonb
 null default jsonb_build_array();
