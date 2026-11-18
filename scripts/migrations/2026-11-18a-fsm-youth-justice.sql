-- Free school meals and youth justice (owner approved 18 Nov 2026, Cowork ENTRY 303, job FSM-YJ;
-- drafts/plan-free-school-meals-youth-justice-2026-11-18.md). Three tables, empty here; loaded by the import scripts.
--
-- area_free_school_meals: DfE "Schools, pupils and their characteristics" (January school census), statistics API data set
--   019e7404-df19-71ce-90a8-f2e3db7dd7fa, academic years 2015/16 to 2025/26. One row per area, year and school type.
--   area_level: england (E92), region (E12), council (E06/E08/E09/E10, the census local authority; old codes such as
--   Bournemouth E06000028 kept under their own code for the years DfE gives them) or constituency (E14).
--   pupils: all pupils on roll; fsm_eligible: pupils known to be eligible for free school meals; fsm_eligible_pct: DfE's
--   percentage of all pupils; fsm_taking_meal: eligible pupils who took a free school meal on census day.
--   A value DfE suppresses or gives as a symbol is NULL, the symbol kept in symbols (field -> symbol).
-- council_youth_first_entrants: Youth Justice Statistics 2024 to 2025 (MoJ and YJB, 29 Jan 2026), supplementary tables,
--   Ch 2 tables 2.10 (number) and 2.11 (rate per 100,000 children aged 10 to 17), by local authority of RESIDENCE, years
--   ending December 2014 to 2024, England and Wales. area_code is the council's GSS code (E or W; an old code for an area
--   before a boundary change, e.g. Dorset E10000009 to 2018), a region (E12, W92) or England and Wales (K04000001).
--   fte_count is the published modelled estimate (decimals kept; pages round it); a ".." (fewer than ten) or "*" (boundary
--   change) cell is NULL with the symbol in symbols.
-- youth_justice_services: the same release, by youth justice service (YJS), years ending March 2015 to 2025:
--   children_cautioned_sentenced from the local level open data (Children_Table.ods, its rows summed per service and year:
--   the file repeats rows, and the sums equal the published Ch 3 table 3.1 totals); for the year ending March 2025 the
--   service's funding by source (Annex C, table C.4), in pounds. council_codes: the councils the service covers (GSS codes,
--   from a checked list in the import; a shared service lists every council).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.area_free_school_meals') IS NOT NULL THEN RAISE EXCEPTION 'area_free_school_meals already exists'; END IF;
  IF to_regclass('public.council_youth_first_entrants') IS NOT NULL THEN RAISE EXCEPTION 'council_youth_first_entrants already exists'; END IF;
  IF to_regclass('public.youth_justice_services') IS NOT NULL THEN RAISE EXCEPTION 'youth_justice_services already exists'; END IF;
  IF EXISTS (SELECT 1 FROM public.hand_loaded_datasets WHERE key IN ('free_school_meals', 'youth_justice')) THEN RAISE EXCEPTION 'hand_loaded_datasets rows already exist'; END IF;
END $$;

CREATE TABLE public.area_free_school_meals (
  area_code        text NOT NULL CHECK (area_code ~ '^E(92|12|06|08|09|10|14)\d{6}$'),
  area_name        text NOT NULL CHECK (area_name <> ''),
  area_level       text NOT NULL CHECK (area_level IN ('england', 'region', 'council', 'constituency')),
  academic_year    text NOT NULL CHECK (academic_year ~ '^\d{4}/\d{2}$'),
  school_type      text NOT NULL CHECK (school_type IN ('total', 'primary', 'secondary', 'special', 'alternative_provision', 'nursery', 'non_maintained_special')),
  pupils           integer CHECK (pupils >= 0),
  fsm_eligible     integer CHECK (fsm_eligible >= 0),
  fsm_eligible_pct numeric CHECK (fsm_eligible_pct BETWEEN 0 AND 100),
  fsm_taking_meal  integer CHECK (fsm_taking_meal >= 0),
  symbols          jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(symbols) = 'object'),
  source_url       text NOT NULL CHECK (source_url ~ '^https://'),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (area_code, academic_year, school_type),
  CHECK ((area_level = 'england') = (area_code LIKE 'E92%')),
  CHECK ((area_level = 'region') = (area_code LIKE 'E12%')),
  CHECK ((area_level = 'constituency') = (area_code LIKE 'E14%'))
);
CREATE INDEX area_free_school_meals_level_year ON public.area_free_school_meals (area_level, academic_year, school_type);
COMMENT ON TABLE public.area_free_school_meals IS
  'Pupils eligible for free school meals by area and school type, England (DfE school census, statistics API); migration 2026-11-18a';
ALTER TABLE public.area_free_school_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY area_free_school_meals_read ON public.area_free_school_meals FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.area_free_school_meals TO anon, authenticated;

CREATE TABLE public.council_youth_first_entrants (
  area_code   text NOT NULL CHECK (area_code ~ '^(E(06|08|09|10|12)\d{6}|W(06|92)\d{6}|K04000001)$'),
  area_name   text NOT NULL CHECK (area_name <> ''),
  area_level  text NOT NULL CHECK (area_level IN ('england_wales', 'region', 'council')),
  country     text NOT NULL CHECK (country IN ('England', 'Wales', 'England and Wales')),
  year        integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  fte_count   numeric CHECK (fte_count >= 0),
  fte_rate    numeric CHECK (fte_rate >= 0),
  symbols     jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(symbols) = 'object'),
  source_url  text NOT NULL CHECK (source_url ~ '^https://'),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (area_code, year),
  CHECK ((area_level = 'england_wales') = (area_code = 'K04000001'))
);
COMMENT ON TABLE public.council_youth_first_entrants IS
  'Child first time entrants to the youth justice system by local authority of residence, England and Wales (Youth Justice Statistics, tables 2.10 and 2.11); migration 2026-11-18a';
ALTER TABLE public.council_youth_first_entrants ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_youth_first_entrants_read ON public.council_youth_first_entrants FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.council_youth_first_entrants TO anon, authenticated;

CREATE TABLE public.youth_justice_services (
  yjs_name                     text NOT NULL CHECK (yjs_name <> ''),
  country                      text NOT NULL CHECK (country IN ('England', 'Wales')),
  region                       text,
  year                         text NOT NULL CHECK (year ~ '^\d{4}-\d{2}$'),
  council_codes                text[] NOT NULL CHECK (cardinality(council_codes) >= 1),
  children_cautioned_sentenced integer CHECK (children_cautioned_sentenced >= 0),
  funding_yjb_grant            numeric CHECK (funding_yjb_grant >= 0),
  funding_local_authority      numeric CHECK (funding_local_authority >= 0),
  funding_police               numeric CHECK (funding_police >= 0),
  funding_pcc                  numeric CHECK (funding_pcc >= 0),
  funding_probation            numeric CHECK (funding_probation >= 0),
  funding_health               numeric CHECK (funding_health >= 0),
  funding_welsh_government     numeric CHECK (funding_welsh_government >= 0),
  funding_other                numeric CHECK (funding_other >= 0),
  funding_total                numeric CHECK (funding_total >= 0),
  population_10_17             integer CHECK (population_10_17 >= 0),
  source_url                   text NOT NULL CHECK (source_url ~ '^https://'),
  updated_at                   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (yjs_name, year)
);
CREATE INDEX youth_justice_services_councils ON public.youth_justice_services USING gin (council_codes);
COMMENT ON TABLE public.youth_justice_services IS
  'Youth justice services: children cautioned or sentenced (local level open data) and, year ending March 2025, funding by source (Annex C table C.4), England and Wales; migration 2026-11-18a';
ALTER TABLE public.youth_justice_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY youth_justice_services_read ON public.youth_justice_services FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.youth_justice_services TO anon, authenticated;

INSERT INTO public.hand_loaded_datasets (key, label, tables, held_period, loaded_on, source_page, expected_release, check_kind, check_url, period_pattern, reminder_month) VALUES
 ('free_school_meals', 'Free school meals by council and constituency (England)', 'area_free_school_meals', 'not loaded yet', '2026-11-18',
  'https://explore-education-statistics.service.gov.uk/find-statistics/school-pupils-and-their-characteristics',
  'June (DfE; January 2026 census published 4 June 2026, next June 2027)', 'automated', NULL, NULL, NULL),
 ('youth_justice', 'Youth justice by council and service (England and Wales)', 'council_youth_first_entrants, youth_justice_services', 'not loaded yet', '2026-11-18',
  'https://www.gov.uk/government/collections/youth-justice-statistics',
  'January or February (MoJ and YJB; 2024 to 2025 published 29 January 2026)', 'automated', NULL, NULL, NULL);
COMMIT;
