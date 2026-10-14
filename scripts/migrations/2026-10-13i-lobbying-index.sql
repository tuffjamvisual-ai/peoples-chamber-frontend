-- Lobbying index: one organisation record per real organisation, the spellings that mean
-- it, and every organisation mention in ministers' meetings, so the Lobbying page can say
-- who meets ministers and link them to hospitality, APPGs, donations and contracts.
--
-- lobby_orgs          one row per organisation. reviewed = a person has checked it.
--                     source 'govuk' = created from GOV.UK's official organisations list
--                     (public bodies, exact titles); 'manual' = checked by hand.
-- lobby_org_aliases   normalised spelling -> organisation (e.g. "cbi" and
--                     "confederation of british industry" -> CBI).
-- lobby_excluded_names normalised entries that are not organisations ("consular meeting").
-- lobby_meeting_mentions one row per organisation named in a ministers' meeting, rebuilt in
--                     full by scripts/build-lobbying-index.js (dry run by default). It carries
--                     its own copy of the meeting details and a meeting_key, because
--                     ministers_meetings is deleted and re-inserted on every sync, so its row
--                     ids are not stable.
--
-- Source data: GOV.UK ministers' meetings transparency returns and GOV.UK organisations
-- list, Open Government Licence.

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.lobby_orgs (
  id                     bigserial PRIMARY KEY,
  slug                   text NOT NULL UNIQUE,
  name                   text NOT NULL,
  org_type               text NOT NULL DEFAULT 'other' CHECK (org_type IN ('company', 'trade_body', 'union', 'charity', 'public_body', 'campaign', 'think_tank', 'professional_body', 'academic', 'other')),
  companies_house_number text,
  source                 text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'govuk')),
  reviewed               boolean NOT NULL DEFAULT false,
  reviewed_at            timestamptz,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lobby_org_aliases (
  alias_norm    text PRIMARY KEY,
  org_id        bigint NOT NULL REFERENCES public.lobby_orgs(id) ON DELETE CASCADE,
  alias_example text,
  source        text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'govuk')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lobby_org_aliases_org_idx ON public.lobby_org_aliases (org_id);

CREATE TABLE IF NOT EXISTS public.lobby_excluded_names (
  norm_name  text PRIMARY KEY,
  reason     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lobby_meeting_mentions (
  id                bigserial PRIMARY KEY,
  meeting_key       text NOT NULL,          -- stable hash of the meeting's details
  position          smallint NOT NULL,      -- order of this organisation within the meeting entry
  minister_name     text NOT NULL,
  minister_dept     text,
  meeting_date      date,                   -- null when the published date cannot be read
  meeting_date_raw  text,
  date_flag         text CHECK (date_flag IN ('future', 'unreadable')),
  purpose           text,
  quarter           text,
  source_publication_slug text,
  raw_name          text NOT NULL,          -- the organisation as published
  norm_name         text NOT NULL,          -- normalised spelling used for matching
  org_id            bigint REFERENCES public.lobby_orgs(id) ON DELETE SET NULL,
  match_type        text NOT NULL CHECK (match_type IN ('alias', 'unmatched', 'excluded')),
  built_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_key, position)
);
CREATE INDEX IF NOT EXISTS lobby_meeting_mentions_org_idx ON public.lobby_meeting_mentions (org_id);
CREATE INDEX IF NOT EXISTS lobby_meeting_mentions_norm_idx ON public.lobby_meeting_mentions (norm_name);
CREATE INDEX IF NOT EXISTS lobby_meeting_mentions_date_idx ON public.lobby_meeting_mentions (meeting_date);

ALTER TABLE public.lobby_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_org_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_excluded_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_meeting_mentions ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lobby_orgs','lobby_org_aliases','lobby_excluded_names','lobby_meeting_mentions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t || '_public_read', t);
  END LOOP;
END $$;

-- Entries that are not organisations. More are added during the hand review.
INSERT INTO public.lobby_excluded_names (norm_name, reason) VALUES
  ('consular meeting', 'not an organisation'),
  ('consular meetings', 'not an organisation'),
  ('n a', 'not an organisation'),
  ('na', 'not an organisation'),
  ('nil return', 'not an organisation'),
  ('nil', 'not an organisation'),
  ('none', 'not an organisation'),
  ('various', 'not an organisation'),
  ('stakeholders', 'not an organisation'),
  ('various stakeholders', 'not an organisation')
ON CONFLICT (norm_name) DO NOTHING;

COMMIT;
