alter table "public"."offers_claimed"
  add constraint "offers_claimed_offer_id_fkey"
  foreign key ("offer_id")
  references "public"."offers"
  ("id") on update restrict on delete restrict;
