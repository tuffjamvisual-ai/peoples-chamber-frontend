-- Laws made without a vote and treaties (owner's brief, 26 Oct 2026; discovery in report 80). Two tables filled from
-- UK Parliament's free APIs (Open Parliament Licence v3.0):
--   statutory_instruments  every statutory instrument laid before Parliament (Statutory Instruments API v2)
--   treaties               every treaty laid before Parliament under the Constitutional Reform and Governance Act 2010
--                          (Treaties API v1)
-- Loaded once by scripts/load-statutory-instruments-treaties.ts, then kept up to date daily by
-- /api/sync-statutory-instruments-treaties (lib/si-treaties-sync.ts). Public read only (RLS, select policy); only the
-- service role writes.
--
-- statutory_instrument (singular, migration 2026-10-21n) is NOT replaced: it holds one row per Commons division on an
-- instrument (vote counts), keyed by division_id; these tables hold one row per instrument or treaty, keyed by the
-- API's id. /statutory-instruments/[id] shows a division for a numeric id and an instrument from this table for an
-- API id.
--
-- Run: psql "$DB" -f scripts/migrations/2026-10-27b-statutory-instruments-treaties.sql
-- Undo: scripts/migrations/2026-10-27b-UNDO.sql
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.statutory_instruments') IS NOT NULL THEN RAISE EXCEPTION 'statutory_instruments already exists'; END IF;
  IF to_regclass('public.treaties') IS NOT NULL THEN RAISE EXCEPTION 'treaties already exists'; END IF;
END $$;

CREATE TABLE public.statutory_instruments (
  api_id              text PRIMARY KEY CHECK (api_id ~ '^[A-Za-z0-9]{6,12}$'),
  title               text NOT NULL,
  si_number           text,                                   -- "SI 2026/1110"; null for drafts not yet made
  procedure           text,                                   -- "Made negative", "Draft affirmative", ...
  laying_department   text,
  made_date           date,
  laid_date           date,                                   -- the earlier of the Commons and Lords laying dates
  in_force_date       date,
  committee_concerns  boolean NOT NULL DEFAULT false,         -- the JCSI or the SLSC raised concerns
  prayed_against      boolean NOT NULL DEFAULT false,         -- a motion to stop it (prayer, motion to annul or reject)
  debated             boolean NOT NULL DEFAULT false,
  legislation_url     text CHECK (legislation_url IS NULL OR legislation_url ~ '^https://'),
  timeline            jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{date, step, houses, link}], from its business items
  timeline_fetched_at timestamptz,                            -- null until its detail and timeline have been read
  preceded_by_id      text,                                   -- the API's precededByInstrument (for example the draft
  followed_by_id      text,                                   -- or proposal) and followedByInstrument (the made version)
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX statutory_instruments_laid_date_idx ON public.statutory_instruments (laid_date DESC NULLS LAST);
CREATE INDEX statutory_instruments_department_idx ON public.statutory_instruments (laying_department, laid_date DESC);
CREATE INDEX statutory_instruments_preceded_by_idx ON public.statutory_instruments (preceded_by_id) WHERE preceded_by_id IS NOT NULL;
CREATE INDEX statutory_instruments_followed_by_idx ON public.statutory_instruments (followed_by_id) WHERE followed_by_id IS NOT NULL;
CREATE INDEX statutory_instruments_title_laid_idx ON public.statutory_instruments (title, laid_date);
CREATE INDEX statutory_instruments_timeline_todo_idx ON public.statutory_instruments (laid_date DESC) WHERE timeline_fetched_at IS NULL;
COMMENT ON TABLE public.statutory_instruments IS
  'Statutory instruments laid before Parliament, from the UK Parliament Statutory Instruments API (migration 2026-10-27b)';

CREATE TABLE public.treaties (
  api_id              text PRIMARY KEY CHECK (api_id ~ '^[A-Za-z0-9]{6,12}$'),
  title               text NOT NULL,
  command_paper       text,                                   -- "CP 1678"
  signed_date         date,
  laid_date           date,
  lead_department     text,
  laying_department   text,
  crag_end_date       date,                                   -- the last "Objection period ... ends" step
  scrutiny_concluded  boolean NOT NULL DEFAULT false,
  conclusion          text,                                   -- NotConcluded, CanRatify or CantRatify, as the API gives it
  govuk_url           text CHECK (govuk_url IS NULL OR govuk_url ~ '^https://'),
  committee_reports   jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{date, step, link}]
  timeline            jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline_fetched_at timestamptz,
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX treaties_laid_date_idx ON public.treaties (laid_date DESC NULLS LAST);
CREATE INDEX treaties_department_idx ON public.treaties (lead_department, laid_date DESC);
COMMENT ON TABLE public.treaties IS
  'Treaties laid before Parliament under CRaG, from the UK Parliament Treaties API (migration 2026-10-27b)';

-- The department filter on /laws/made-without-a-vote: each laying department with its count, without reading every
-- row in the page.
CREATE VIEW public.statutory_instrument_departments WITH (security_invoker = true) AS
  SELECT laying_department, count(*)::integer AS instruments
  FROM public.statutory_instruments
  WHERE laying_department IS NOT NULL
  GROUP BY laying_department;

ALTER TABLE public.statutory_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treaties ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.statutory_instruments, public.treaties, public.statutory_instrument_departments FROM anon, authenticated;
CREATE POLICY statutory_instruments_read ON public.statutory_instruments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY treaties_read ON public.treaties FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.statutory_instruments, public.treaties, public.statutory_instrument_departments TO anon, authenticated;
COMMIT;
