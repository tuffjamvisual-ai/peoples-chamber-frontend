-- Ministerial directions (owner's approval, 20 Oct 2026): one row per direction in the GOV.UK collection
-- https://www.gov.uk/government/collections/ministerial-directions. A minister directs a department's accounting
-- officer (usually the permanent secretary) to go ahead with spending the accounting officer has formally objected to.
-- Loaded by scripts/import-ministerial-directions.js.
--
--   id                     GOV.UK content_id of the direction's page
--   published_on           when GOV.UK first published the page (first_published_at)
--   direction_date         the date the direction was given, read from the minister's letter (its title, then its
--                          text); NULL where it cannot be read or fails the checks (see check_notes)
--   direction_date_source  'letter title' | 'letter text'; NULL with direction_date (no date is guessed)
--   minister_names         who gave the direction: the name as signed on the direction letter; GOV.UK's person tag
--                          (present-day name, post-nominals removed) only where the letter gives none; for the
--                          Prime Minister's letters signed by title only, the owner's decision
--   minister_source        'letter text' | 'GOV.UK tag' | 'owner decision'; NULL with minister_names
--   minister_roles         GOV.UK's role tags (e.g. 'Secretary of State for Transport'), as tagged
--   organisations          GOV.UK organisation tags, as tagged (old names kept)
--   dept_slugs             our department pages (/departments/<slug>) the direction appears on
--   letters                [{title, url, format: 'pdf'|'html', kind: 'request'|'direction'|'other'}]
--   check_notes            why direction_date or minister_names is missing, in plain words
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.ministerial_directions') IS NOT NULL THEN RAISE EXCEPTION 'ministerial_directions already exists'; END IF;
END $$;

CREATE TABLE public.ministerial_directions (
  id                    text PRIMARY KEY CHECK (id ~ '^[0-9a-f-]{36}$'),
  slug                  text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title                 text NOT NULL,
  subject               text NOT NULL,
  summary               text,
  govuk_url             text NOT NULL CHECK (govuk_url ~ '^https://www\.gov\.uk/'),
  published_on          date NOT NULL,
  updated_on            date,
  direction_date        date CHECK (direction_date <= published_on),
  direction_date_source text CHECK (direction_date_source IN ('letter title', 'letter text')),
  minister_names        text[],
  minister_source       text CHECK (minister_source IN ('letter text', 'GOV.UK tag', 'owner decision')),
  minister_roles        text[] NOT NULL DEFAULT '{}',
  organisations         text[] NOT NULL DEFAULT '{}',
  dept_slugs            text[] NOT NULL DEFAULT '{}',
  letters               jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(letters) = 'array'),
  check_notes           text,
  imported_at           timestamptz NOT NULL DEFAULT now(),
  CHECK ((direction_date IS NULL) = (direction_date_source IS NULL)),
  CHECK ((minister_names IS NULL) = (minister_source IS NULL))
);
CREATE INDEX ministerial_directions_dept_slugs_idx ON public.ministerial_directions USING gin (dept_slugs);
COMMENT ON TABLE public.ministerial_directions IS
  'Ministerial directions to accounting officers, from the GOV.UK collection; dates and ministers read from the letters (migration 2026-10-20a)';

-- Row level security: anyone may read; only the service role (which bypasses RLS) may write.
ALTER TABLE public.ministerial_directions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ministerial_directions FROM anon, authenticated;
GRANT SELECT ON public.ministerial_directions TO anon, authenticated;
CREATE POLICY ministerial_directions_public_read ON public.ministerial_directions FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ministerial_directions';
  IF n <> 18 THEN RAISE EXCEPTION 'expected 18 columns, found %', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ministerial_directions';
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 policy, found %', n; END IF;
  IF has_table_privilege('anon', 'public.ministerial_directions', 'INSERT') OR has_table_privilege('anon', 'public.ministerial_directions', 'UPDATE')
     OR has_table_privilege('anon', 'public.ministerial_directions', 'DELETE') THEN RAISE EXCEPTION 'anon must only read'; END IF;
  IF NOT has_table_privilege('anon', 'public.ministerial_directions', 'SELECT') THEN RAISE EXCEPTION 'anon must be able to read'; END IF;
END $$;

COMMIT;
