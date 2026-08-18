-- 2026-08-18 — per-partner admin dashboard version
--
-- WHY: we are shipping a redesigned partner dashboard at /admin-v3. v2 stays the
-- default for everyone; individual partners are opted in one at a time from
-- superadmin > Admin Dashboard.
--
-- This is a *version*, not a feature toggle, so it deliberately does NOT live in
-- the feature_flags CSV: revertFeatureToString() (src/lib/getFeatures.ts) rebuilds
-- that string from a hardcoded key whitelist, so any key it does not model is
-- silently dropped the next time any of five save paths runs. It also does not
-- live in storefront_settings, which is half stringified JSON in prod and is
-- read-modify-written by several unrelated settings sections.
--
-- AFTER RUNNING THIS: reload Hasura metadata, or the column never appears in
-- partners_set_input and every write fails with "field not found in type".

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS admin_dashboard_version text NOT NULL DEFAULT 'v2';

COMMENT ON COLUMN public.partners.admin_dashboard_version IS
  'Which partner dashboard this store gets: ''v2'' (default, /admin-v2) or ''v3'' (/admin-v3). Set from superadmin > Admin Dashboard.';
