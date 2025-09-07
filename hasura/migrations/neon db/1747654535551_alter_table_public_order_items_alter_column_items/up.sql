alter table "public"."order_items" alter column "items" set default jsonb_build_object();
alter table "public"."order_items" rename column "items" to "item";
