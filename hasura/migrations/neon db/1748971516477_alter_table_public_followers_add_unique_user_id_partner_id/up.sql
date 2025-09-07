alter table "public"."followers" add constraint "followers_user_id_partner_id_key" unique ("user_id", "partner_id");
