alter table "public"."offers"
  add constraint "offers_menu_item_id_fkey"
  foreign key ("menu_item_id")
  references "public"."menu"
  ("id") on update restrict on delete restrict;
