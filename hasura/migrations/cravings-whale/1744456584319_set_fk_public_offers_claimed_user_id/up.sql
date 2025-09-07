alter table "public"."offers_claimed"
  add constraint "offers_claimed_user_id_fkey"
  foreign key ("user_id")
  references "public"."users"
  ("id") on update restrict on delete restrict;
