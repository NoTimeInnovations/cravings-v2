alter table "public"."offers" add column "deletion_status" integer
 not null default '0';
