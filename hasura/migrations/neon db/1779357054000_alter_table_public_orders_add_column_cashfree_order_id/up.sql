alter table "public"."orders" add column "cashfree_order_id" text;
create index if not exists "idx_orders_cashfree_order_id" on "public"."orders" ("cashfree_order_id");
