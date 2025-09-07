alter table "public"."orders" add column "status" text
 not null default 'pending';
