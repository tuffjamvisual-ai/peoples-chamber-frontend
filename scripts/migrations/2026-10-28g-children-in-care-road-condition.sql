-- Children in care and road condition by council, England (owner's approval, 28 Oct 2026). Council level only.
-- council_children_in_care: DfE "Children looked after in England including adoptions", reporting year 2025 (31 March
--   2021 to 2025). One row per area and year (31 March): England (E92, rounded by DfE to the nearest 10) and children's
--   services councils (unrounded), old county codes (Cumbria, Northamptonshire) kept under their own codes. looked_after
--   and rate_per_10000 on 31 March; started and ceased during the year to 31 March; placed_outside_area: placed outside
--   the council's boundary (placed_outside_area_pct is DfE's percentage); uasc: unaccompanied asylum seeking children;
--   adopted: children who ceased to be looked after because they were adopted. A cell DfE shows as a symbol is NULL,
--   and the symbol is kept in symbols (field -> c, z, x or k; meanings in lib/children-in-care.ts).
-- council_road_condition: DfT road condition statistics (RDC0120, RDC0122, RDC0130, RDC0321), FYE 2008 to FYE 2026,
--   the last year of the red, amber and green series (PAS 2161 from April 2026). year is 31 March of the financial year
--   ending. Percentages as DfT publishes them; England's row as published (it leaves out Derbyshire from FYE 2019).
--   symbols: field -> DfT shorthand (x unavailable, y unrepresentative, z not applicable); not_comparable: fields DfT
--   flags as surveyed by an alternative method (not to be compared with other councils). treated_*_pct and
--   network_*_km (RDC0321) are for FYE 2026 only.
-- Loaded by 2026-10-28h (scripts/import-children-in-care.ts) and 2026-10-28i (scripts/import-road-condition.ts).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.council_children_in_care') IS NOT NULL THEN RAISE EXCEPTION 'council_children_in_care already exists'; END IF;
  IF to_regclass('public.council_road_condition') IS NOT NULL THEN RAISE EXCEPTION 'council_road_condition already exists'; END IF;
  IF EXISTS (SELECT 1 FROM public.hand_loaded_datasets WHERE key IN ('children_in_care', 'road_condition')) THEN RAISE EXCEPTION 'hand_loaded_datasets rows already exist'; END IF;
END $$;

CREATE TABLE public.council_children_in_care (
  ons_code                text NOT NULL CHECK (ons_code ~ '^E(92|06|08|09|10)\d{6}$'),
  area_name               text NOT NULL CHECK (area_name <> ''),
  area_level              text NOT NULL CHECK (area_level IN ('england', 'council')),
  year                    date NOT NULL CHECK (extract(month FROM year) = 3 AND extract(day FROM year) = 31),
  looked_after            integer CHECK (looked_after >= 0),
  rate_per_10000          numeric CHECK (rate_per_10000 >= 0),
  started                 integer CHECK (started >= 0),
  ceased                  integer CHECK (ceased >= 0),
  placed_outside_area     integer CHECK (placed_outside_area >= 0),
  placed_outside_area_pct numeric CHECK (placed_outside_area_pct >= 0 AND placed_outside_area_pct <= 100),
  uasc                    integer CHECK (uasc >= 0),
  adopted                 integer CHECK (adopted >= 0),
  symbols                 jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(symbols) = 'object'),
  rounded_to              integer NOT NULL CHECK (rounded_to IN (1, 10)),
  source_url              text NOT NULL CHECK (source_url ~ '^https://'),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ons_code, year),
  CHECK ((area_level = 'england') = (ons_code LIKE 'E92%'))
);
COMMENT ON TABLE public.council_children_in_care IS
  'Children looked after by council, England (DfE Children looked after in England including adoptions); migration 2026-10-28g';
ALTER TABLE public.council_children_in_care ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_children_in_care_read ON public.council_children_in_care FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.council_children_in_care TO anon, authenticated;

CREATE TABLE public.council_road_condition (
  ons_code             text NOT NULL CHECK (ons_code ~ '^E(92|06|08|09|10)\d{6}$'),
  area_name            text NOT NULL CHECK (area_name <> ''),
  area_level           text NOT NULL CHECK (area_level IN ('england', 'council')),
  year                 date NOT NULL CHECK (extract(month FROM year) = 3 AND extract(day FROM year) = 31),
  a_roads_red_pct      numeric CHECK (a_roads_red_pct BETWEEN 0 AND 100),
  b_c_roads_red_pct    numeric CHECK (b_c_roads_red_pct BETWEEN 0 AND 100),
  unclassified_red_pct numeric CHECK (unclassified_red_pct BETWEEN 0 AND 100),
  a_roads_amber_pct    numeric CHECK (a_roads_amber_pct BETWEEN 0 AND 100),
  a_roads_green_pct    numeric CHECK (a_roads_green_pct BETWEEN 0 AND 100),
  b_c_roads_amber_pct  numeric CHECK (b_c_roads_amber_pct BETWEEN 0 AND 100),
  b_c_roads_green_pct  numeric CHECK (b_c_roads_green_pct BETWEEN 0 AND 100),
  treated_a_pct        numeric CHECK (treated_a_pct BETWEEN 0 AND 100),
  treated_bcu_pct      numeric CHECK (treated_bcu_pct BETWEEN 0 AND 100),
  network_a_km         numeric CHECK (network_a_km >= 0),
  network_bcu_km       numeric CHECK (network_bcu_km >= 0),
  symbols              jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(symbols) = 'object'),
  not_comparable       text[] NOT NULL DEFAULT '{}',
  source_url           text NOT NULL CHECK (source_url ~ '^https://'),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ons_code, year),
  CHECK ((area_level = 'england') = (ons_code LIKE 'E92%'))
);
COMMENT ON TABLE public.council_road_condition IS
  'Road condition by highway authority, England (DfT RDC0120, RDC0122, RDC0130, RDC0321), FYE 2008 to 2026; migration 2026-10-28g';
ALTER TABLE public.council_road_condition ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_road_condition_read ON public.council_road_condition FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.council_road_condition TO anon, authenticated;

INSERT INTO public.hand_loaded_datasets (key, label, tables, held_period, loaded_on, source_page, expected_release, check_kind, check_url, period_pattern, reminder_month) VALUES
 ('children_in_care', 'Children in care by council (England)', 'council_children_in_care', '2025 (31 March 2021 to 2025)', '2026-10-28',
  'https://explore-education-statistics.service.gov.uk/find-statistics/children-looked-after-in-england-including-adoptions',
  'November (DfE; reporting year 2025 published 26 November 2025, next November 2026)', 'automated', NULL, NULL, NULL),
 ('road_condition', 'Road condition by council (England)', 'council_road_condition', 'FYE 2026 (April 2007 to March 2026), the last red, amber and green year', '2026-10-28',
  'https://www.gov.uk/government/statistical-data-sets/road-condition-statistics-data-tables-rdc',
  'none in this form: DfT moved to PAS 2161 in April 2026; the weekly check reports new tables', 'automated', NULL, NULL, NULL);
COMMIT;
