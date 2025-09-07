alter table "public"."orders" add column "type" text
 not null default 'table_order';
