alter table "public"."orders" add column "payment_status" text
 not null default 'unpaid';
