comment on column "public"."followers"."phone" is E'followers of each store';
alter table "public"."followers" alter column "phone" drop not null;
alter table "public"."followers" add column "phone" text;
