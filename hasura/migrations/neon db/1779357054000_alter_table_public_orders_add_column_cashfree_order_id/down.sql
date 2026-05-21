drop index if exists "public"."idx_orders_cashfree_order_id";
alter table "public"."orders" drop column "cashfree_order_id";
