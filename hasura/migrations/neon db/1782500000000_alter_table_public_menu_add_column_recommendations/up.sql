alter table "public"."menu" add column "recommendations" jsonb not null default '[]'::jsonb;
