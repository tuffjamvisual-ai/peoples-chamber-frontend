-- 2026-10-28a: special advisers' named list and quarterly history (owner's approval, 28 Oct 2026).
--
-- 1. spad_releases and spad_appointments: the Cabinet Office's yearly "Special adviser data releases: numbers and
--    costs" (totals, and one row per appointment: adviser, appointing minister, pay band, salary band, notes), filled
--    by /api/sync-spad-roster (lib/spad-roster.ts). A shared adviser has a row per minister. minister_member_id is
--    our MPs table's member_id when the minister matched; Lords ministers and an unnamed row stay null.
-- 2. The quarterly tables keep every quarter: /api/sync-spad-transparency no longer empties them. Each activity row
--    gets row_key, a hash of its quarter, area, adviser and own fields plus a count of identical rows before it
--    ("#1", "#2"), so the sync can upsert by it and two identical declarations both stay. The roster's unique key
--    becomes (name, area, quarter). An index on quarter for each table.
-- Access: public read only, like the existing spad tables (RLS on, one SELECT policy, anon and authenticated
-- SELECT only). Undo: 2026-10-28a-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.spad_releases') IS NOT NULL THEN RAISE EXCEPTION 'spad_releases already exists'; END IF;
  IF to_regclass('public.spad_appointments') IS NOT NULL THEN RAISE EXCEPTION 'spad_appointments already exists'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spad_gifts' AND column_name = 'row_key') THEN
    RAISE EXCEPTION 'spad_gifts.row_key already exists';
  END IF;
END $$;

CREATE TABLE public.spad_releases (
  release_slug text PRIMARY KEY,
  as_at date NOT NULL,
  headcount integer,
  fte numeric,
  paybill bigint,
  salary bigint,
  ni bigint,
  pensions bigint,
  severance bigint,
  prior_paybill bigint,
  prior_severance bigint,
  source_url text NOT NULL,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.spad_appointments (
  id bigserial PRIMARY KEY,
  release_slug text NOT NULL REFERENCES public.spad_releases(release_slug) ON DELETE CASCADE,
  as_at date NOT NULL,
  adviser_name text NOT NULL,
  minister_title text NOT NULL,
  minister_name text,
  minister_member_id integer,
  pay_band integer,
  salary_band_text text,
  salary_band_min integer,
  salary_band_max integer,
  notes text[] NOT NULL DEFAULT '{}',
  source_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spad_appointments_release_adviser_minister_key UNIQUE (release_slug, adviser_name, minister_title)
);
CREATE INDEX idx_spad_appointments_member ON public.spad_appointments (minister_member_id);

-- Keep every quarter.
CREATE INDEX IF NOT EXISTS idx_spad_gifts_quarter ON public.spad_gifts (quarter);
CREATE INDEX IF NOT EXISTS idx_spad_hospitality_quarter ON public.spad_hospitality (quarter);
CREATE INDEX IF NOT EXISTS idx_spad_media_meetings_quarter ON public.spad_media_meetings (quarter);
CREATE INDEX IF NOT EXISTS idx_special_advisers_quarter ON public.special_advisers (quarter);

ALTER TABLE public.special_advisers DROP CONSTRAINT special_advisers_name_area_key;
ALTER TABLE public.special_advisers ADD CONSTRAINT special_advisers_name_area_quarter_key UNIQUE (name, area, quarter);

-- row_key: the same text lib/spad-row-key.ts builds: md5 of the fields joined by '|' (null as empty), then '#n'.
ALTER TABLE public.spad_gifts ADD COLUMN row_key text;
ALTER TABLE public.spad_hospitality ADD COLUMN row_key text;
ALTER TABLE public.spad_media_meetings ADD COLUMN row_key text;
UPDATE public.spad_gifts t SET row_key = k.key FROM (
  SELECT id, h || '#' || row_number() OVER (PARTITION BY h ORDER BY id) AS key FROM (
    SELECT id, md5(concat_ws('|', coalesce(quarter, ''), coalesce(area, ''), coalesce(spad_name, ''), coalesce(gift_date, ''), coalesce(gift_descr, ''), coalesce(donor, ''), coalesce(value_gbp, ''), coalesce(outcome, ''))) AS h FROM public.spad_gifts) x) k
  WHERE t.id = k.id;
UPDATE public.spad_hospitality t SET row_key = k.key FROM (
  SELECT id, h || '#' || row_number() OVER (PARTITION BY h ORDER BY id) AS key FROM (
    SELECT id, md5(concat_ws('|', coalesce(quarter, ''), coalesce(area, ''), coalesce(spad_name, ''), coalesce(hosp_date, ''), coalesce(hosp_descr, ''), coalesce(provider, ''), coalesce(purpose, ''))) AS h FROM public.spad_hospitality) x) k
  WHERE t.id = k.id;
UPDATE public.spad_media_meetings t SET row_key = k.key FROM (
  SELECT id, h || '#' || row_number() OVER (PARTITION BY h ORDER BY id) AS key FROM (
    SELECT id, md5(concat_ws('|', coalesce(quarter, ''), coalesce(area, ''), coalesce(spad_name, ''), coalesce(meeting_date, ''), coalesce(media_org, ''), coalesce(individual, ''), coalesce(purpose, ''))) AS h FROM public.spad_media_meetings) x) k
  WHERE t.id = k.id;
ALTER TABLE public.spad_gifts ALTER COLUMN row_key SET NOT NULL, ADD CONSTRAINT spad_gifts_row_key_key UNIQUE (row_key);
ALTER TABLE public.spad_hospitality ALTER COLUMN row_key SET NOT NULL, ADD CONSTRAINT spad_hospitality_row_key_key UNIQUE (row_key);
ALTER TABLE public.spad_media_meetings ALTER COLUMN row_key SET NOT NULL, ADD CONSTRAINT spad_media_meetings_row_key_key UNIQUE (row_key);

-- Public read only.
ALTER TABLE public.spad_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spad_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read spad releases" ON public.spad_releases FOR SELECT USING (true);
CREATE POLICY "Anyone can read spad appointments" ON public.spad_appointments FOR SELECT USING (true);
REVOKE ALL ON public.spad_releases, public.spad_appointments FROM anon, authenticated;
GRANT SELECT ON public.spad_releases, public.spad_appointments TO anon, authenticated;
REVOKE ALL ON SEQUENCE public.spad_appointments_id_seq FROM anon, authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.spad_gifts WHERE row_key IS NULL) OR EXISTS (SELECT 1 FROM public.spad_hospitality WHERE row_key IS NULL)
     OR EXISTS (SELECT 1 FROM public.spad_media_meetings WHERE row_key IS NULL) THEN RAISE EXCEPTION 'a row has no row_key'; END IF;
END $$;
COMMIT;
