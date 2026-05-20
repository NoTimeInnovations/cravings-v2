CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE "public"."whatsapp_message_templates" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "partner_id" uuid NOT NULL,
  "name" text NOT NULL,
  "language" text NOT NULL DEFAULT 'en_US',
  "category" text NOT NULL,
  "components" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "meta_template_id" text DEFAULT NULL,
  "rejection_reason" text DEFAULT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "whatsapp_message_templates_partner_fk"
    FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE,
  CONSTRAINT "whatsapp_message_templates_partner_name_lang_unique"
    UNIQUE ("partner_id", "name", "language"),
  CONSTRAINT "whatsapp_message_templates_category_check"
    CHECK ("category" IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
  CONSTRAINT "whatsapp_message_templates_status_check"
    CHECK ("status" IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED'))
);

CREATE INDEX "whatsapp_message_templates_partner_id_idx"
  ON "public"."whatsapp_message_templates" ("partner_id");

CREATE INDEX "whatsapp_message_templates_status_idx"
  ON "public"."whatsapp_message_templates" ("status");

CREATE TRIGGER "set_whatsapp_message_templates_updated_at"
  BEFORE UPDATE ON "public"."whatsapp_message_templates"
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();
