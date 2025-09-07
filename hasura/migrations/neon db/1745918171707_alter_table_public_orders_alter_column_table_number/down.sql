alter table "public"."orders" alter column "table_number" set not null;
alter table "public"."orders" alter column "table_number" set default '0';
