-- Push-notification subscriptions for our native apps (menuthere-user-app-creator).
-- Captured for EVERY install, logged-in or not (keyed by partner_id), so the
-- Notify feature can reach all of a partner's app users without requiring login.
-- Separate from device_tokens (which is user_id-scoped and drives order/delivery
-- notifications) so those flows are untouched.
CREATE TABLE IF NOT EXISTS public.app_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token text NOT NULL,          -- OneSignal subscription id
  partner_id uuid NOT NULL,            -- which partner's app this install is for
  platform text,
  user_id text,                        -- filled in once the install logs in
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT app_installs_device_token_partner_id_key UNIQUE (device_token, partner_id)
);

CREATE INDEX IF NOT EXISTS app_installs_partner_id_idx ON public.app_installs (partner_id);
