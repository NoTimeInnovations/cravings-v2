-- Global (cross-partner) WhatsApp flow library. Partners can save a flow into
-- this shared library and import library flows into their own whatsapp_flows
-- (replace-by-name or add). Mirrors whatsapp_flows minus partner_id/enabled.
CREATE TABLE IF NOT EXISTS public.whatsapp_global_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  graph jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  escape_keyword text,
  run_ttl_hours integer NOT NULL DEFAULT 24,
  once_per_user boolean NOT NULL DEFAULT false,
  cooldown_hours integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Case-insensitive unique name so the library never holds two "Welcome" entries.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_global_flows_name
  ON public.whatsapp_global_flows (lower(name));
