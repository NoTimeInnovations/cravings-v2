alter table "public"."payments" add column "created_at" date
 null default now();
