comment on column "public"."partners"."feature_flags" is E'business partners';
alter table "public"."partners" alter column "feature_flags" drop not null;
alter table "public"."partners" add column "feature_flags" jsonb;
