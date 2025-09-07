alter table "public"."order_items" rename column "item" to "items";
alter table "public"."order_items" alter column "items" set default jsonb_build_array();
