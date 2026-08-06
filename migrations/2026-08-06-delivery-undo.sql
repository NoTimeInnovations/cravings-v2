-- Delivery Undo — superadmin-managed listing layer.
--
-- Delivery Undo is a separate consumer app that lists a hand-picked subset of
-- Cravings partners. Nothing here changes partner behaviour in Cravings; these
-- tables only decide who appears in that app and how they are presented.
--
-- Deliberately additive: no column is added to `partners`, so a partner row
-- means exactly what it always did and this can be dropped without trace.

-- ─────────────────────────────────────────────────────────────────────────
-- du_listings — which partners appear, and their per-listing presentation
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.du_listings (
  partner_id            uuid PRIMARY KEY
                          REFERENCES public.partners(id) ON DELETE CASCADE,
  is_listed             boolean      NOT NULL DEFAULT false,

  -- Ordering. The app sorts nearest-first; rank_boost lifts a kitchen above
  -- that ordering, so it is the manual override, not the primary sort.
  rank_boost            integer      NOT NULL DEFAULT 0,

  -- The pill over the card image ("Popular", "Late night", "New").
  -- NULL = no pill.
  badge                 text,

  -- Cuisine tags for this restaurant. Drives the metadata line on the card
  -- and which home-screen category pill it matches.
  cuisines              text[]       NOT NULL DEFAULT '{}',

  -- Presentation overrides. NULL falls back to the partner row.
  display_name_override text,
  tagline_override      text,
  banner_override       text,

  -- WhatsApp handoff. NULL derives from partners.whatsapp_numbers / phone.
  wa_number_override    text,
  wa_message_template   text         NOT NULL DEFAULT 'Hi',

  -- Geo. NULL falls back to partners.geo_location; set when that is wrong.
  lat                   double precision,
  lng                   double precision,

  -- Ops / audit
  listed_at             timestamptz,
  listed_by             text,
  notes                 text,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

-- Partial index: the app only ever reads listed rows, and listed rows are a
-- small fraction of 1000+ partners.
CREATE INDEX IF NOT EXISTS du_listings_listed_idx
  ON public.du_listings (is_listed) WHERE is_listed;

CREATE INDEX IF NOT EXISTS du_listings_rank_idx
  ON public.du_listings (rank_boost DESC) WHERE is_listed;

-- ─────────────────────────────────────────────────────────────────────────
-- du_app_config — remote-controlled app configuration (single row)
-- ─────────────────────────────────────────────────────────────────────────
-- Kept as one jsonb blob rather than columns: it is read whole by the app on
-- every launch, written only by superadmin, and its shape will keep changing
-- as the app grows. Columns would mean a migration per tweak.
CREATE TABLE IF NOT EXISTS public.du_app_config (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config     jsonb   NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.du_app_config (id, config)
VALUES (1, jsonb_build_object(
  'cuisineChips', jsonb_build_array('Biryani','Arabic','Malabar','Tea','Seafood'),
  'trendingSearches', jsonb_build_array(
     'Chicken Mandi','Alfaham','Kozhikodan Biryani','Beef Fry','Shawarma'),
  'defaultRadiusKm', 10,
  'maxRadiusKm', 25,
  'sortMode', 'distance',
  'showClosedRestaurants', true
))
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- du_notifications — what was sent, to whom, and how it went
-- ─────────────────────────────────────────────────────────────────────────
-- A send is irreversible and goes to real phones. Logging every one gives an
-- audit trail and stops the same broadcast being fired twice by accident.
CREATE TABLE IF NOT EXISTS public.du_notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  message        text        NOT NULL,

  -- 'all' | 'district' | 'area'
  audience_type  text        NOT NULL DEFAULT 'all',
  -- The district/area values targeted. Empty for 'all'.
  audience_values text[]     NOT NULL DEFAULT '{}',

  -- Deep link, e.g. '/r/kaifan'. NULL just opens the app.
  route          text,

  onesignal_id   text,
  recipients     integer,
  status         text        NOT NULL DEFAULT 'queued',
  error          text,

  sent_by        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS du_notifications_created_idx
  ON public.du_notifications (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.du_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS du_listings_touch ON public.du_listings;
CREATE TRIGGER du_listings_touch
  BEFORE UPDATE ON public.du_listings
  FOR EACH ROW EXECUTE FUNCTION public.du_touch_updated_at();

DROP TRIGGER IF EXISTS du_app_config_touch ON public.du_app_config;
CREATE TRIGGER du_app_config_touch
  BEFORE UPDATE ON public.du_app_config
  FOR EACH ROW EXECUTE FUNCTION public.du_touch_updated_at();
