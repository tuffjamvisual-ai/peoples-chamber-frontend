-- Houses in multiple occupation (HMOs) by council (owner approved 19 Nov 2026, Cowork ENTRY 362; sources checked in
-- Stage A, ENTRY 358: Claude outputs/audit/hmo-358/SOURCES.md). One row per area and year (31 March).
--   England (E06, E07, E08, E09; E92 England): MHCLG Local Authority Housing Statistics, section F, 2011-12 to 2024-25:
--     estimated = f8a (the council's estimate of all HMOs), licensable = f9a (its estimate of HMOs needing a mandatory
--     licence), licensed = f10a (properties with a mandatory licence). region: LAHS's region. A merged council's earlier
--     years are the sum of its predecessors (named in predecessors), only when every predecessor gave a figure. England's
--     row is the sum of the councils that gave a figure (equal to MHCLG's own England total in 2024-25).
--   Wales (W06; W92 Wales): StatsWales, estimated and known HMOs, and HMO licences (licensed = mandatory + additional),
--     2006-07 to 2024-25 (none for 2019-20).
--   Scotland (S12; S92 Scotland): Scottish Government, HMO licences in force at 31 March, 2001 to 2026 (licensed); every
--     HMO of three or more unrelated people needs a licence there, so it is not the same measure as England's.
--   homes: dwellings (England Live Table 100, Wales and Scotland dwelling stock) at homes_year (31 March); Scotland's
--     latest licences use the latest stock year, labelled with its own year.
--   symbols: field -> the publisher's mark for a figure not given ([x] and the like). notes: 'sharp_change' (the
--     council's estimate doubled or halved on the year, the larger at least 500; no reason published),
--     'brent_method_2025' (MHCLG's note: Brent changed its method in 2024-25), 'estimated_by_government' (Scotland's notes
--     5 and 10: the figure was estimated from earlier returns).
-- Loaded by 2026-11-19b (scripts/import-council-hmos.ts). Northern Ireland: no figures by council are published as data.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.council_hmos') IS NOT NULL THEN RAISE EXCEPTION 'council_hmos already exists'; END IF;
  IF EXISTS (SELECT 1 FROM public.hand_loaded_datasets WHERE key = 'hmos') THEN RAISE EXCEPTION 'hand_loaded_datasets row hmos already exists'; END IF;
END $$;

CREATE TABLE public.council_hmos (
  ons_code            text NOT NULL CHECK (ons_code ~ '^(E(92|06|07|08|09)|W(92|06)|S(92|12))\d{6}$'),
  area_name           text NOT NULL CHECK (area_name <> ''),
  nation              text NOT NULL CHECK (nation IN ('England', 'Wales', 'Scotland')),
  area_level          text NOT NULL CHECK (area_level IN ('nation', 'council')),
  region              text,
  year                date NOT NULL CHECK (extract(month FROM year) = 3 AND extract(day FROM year) = 31),
  estimated           integer CHECK (estimated >= 0),
  known               integer CHECK (known >= 0),
  licensable          integer CHECK (licensable >= 0),
  licensed            integer CHECK (licensed >= 0),
  mandatory_licences  integer CHECK (mandatory_licences >= 0),
  additional_licences integer CHECK (additional_licences >= 0),
  homes               integer CHECK (homes > 0),
  homes_year          date CHECK (homes_year IS NULL OR (extract(month FROM homes_year) = 3 AND extract(day FROM homes_year) = 31)),
  symbols             jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(symbols) = 'object'),
  predecessors        text[] NOT NULL DEFAULT '{}',
  notes               text[] NOT NULL DEFAULT '{}',
  source_url          text NOT NULL CHECK (source_url ~ '^https://'),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ons_code, year),
  CHECK ((area_level = 'nation') = (ons_code ~ '^(E92|W92|S92)')),
  CHECK ((homes IS NULL) = (homes_year IS NULL))
);
COMMENT ON TABLE public.council_hmos IS
  'Houses in multiple occupation by council: England (MHCLG LAHS section F), Wales (StatsWales), Scotland (Scottish Government licences in force); migration 2026-11-19a';
ALTER TABLE public.council_hmos ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_hmos_read ON public.council_hmos FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.council_hmos TO anon, authenticated;

INSERT INTO public.hand_loaded_datasets (key, label, tables, held_period, loaded_on, source_page, expected_release, check_kind, check_url, period_pattern, reminder_month) VALUES
 ('hmos', 'Houses in multiple occupation by council (England, Wales, Scotland)', 'council_hmos',
  'England 2011-12 to 2024-25; Wales 2006-07 to 2024-25; Scotland licences at 31 March 2001 to 2026', '2026-11-19',
  'https://www.gov.uk/government/collections/local-authority-housing-data',
  'England June (MHCLG LAHS, 2024-25 published 25 June 2026); Wales spring (StatsWales, 14 May 2026); Scotland October (gov.scot, 27 October 2026)',
  'reminder', NULL, NULL, 7);
COMMIT;
