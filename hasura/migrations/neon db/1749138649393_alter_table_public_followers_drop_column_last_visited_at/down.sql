comment on column "public"."followers"."last_visited_at" is E'followers of each store';
alter table "public"."followers" alter column "last_visited_at" drop not null;
alter table "public"."followers" add column "last_visited_at" timestamptz;
