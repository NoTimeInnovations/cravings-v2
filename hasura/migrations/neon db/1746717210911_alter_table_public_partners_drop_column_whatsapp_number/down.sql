comment on column "public"."partners"."whatsapp_number" is E'business partners';
alter table "public"."partners" alter column "whatsapp_number" drop not null;
alter table "public"."partners" add column "whatsapp_number" text;
