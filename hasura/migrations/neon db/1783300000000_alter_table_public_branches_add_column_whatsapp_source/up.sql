-- Superadmin branch feature: whether a brand's outlets manage their own WhatsApp
-- ("direct", default) or inherit a copy of the main/parent branch's WhatsApp
-- ("main"). The actual copy of whatsapp_business_integrations + whatsapp_flows is
-- performed by the app (src/app/actions/branchWhatsapp.ts); this column only
-- records the chosen mode per brand.
alter table "public"."branches"
  add column if not exists "whatsapp_source" text not null default 'direct';

alter table "public"."branches"
  add constraint "branches_whatsapp_source_check" check ("whatsapp_source" in ('direct','main'));
