-- Blue Badges by council, England (owner's approval, 28 Oct 2026): DfT Blue Badge scheme statistics. One row per area
-- and year (31 March): England (E92), regions (E12) and badge issuing councils (counties, unitaries, metropolitan and
-- London boroughs, Isles of Scilly). Old county codes (Buckinghamshire 2020, Northamptonshire to 2021, Cumbria, North
-- Yorkshire and Somerset to 2023) are kept under their own codes. held: valid badges at 31 March; issued: in the year to
-- 31 March; automatic = "without further assessment", discretionary = "subject to further assessment" (assessed by the
-- council). population_dft_thousands and held_pct_dft are DfT's; held_per_1000_population is calculated by Open Govt
-- from DfT's held figure and the population DfT uses. A cell DfT shows as "[low]" is NULL and named in low_fields.
-- rounded_to: 1 where DfT gives exact counts (2020 to 2023 councils), 100 from 2024, 1000 for 2020's England row
-- (from DIS0101 and DIS0111, in thousands). Loaded by scripts/import-blue-badges.ts (2026-10-28e) and then
-- /api/sync-blue-badges.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.council_blue_badges') IS NOT NULL THEN RAISE EXCEPTION 'council_blue_badges already exists'; END IF;
  IF EXISTS (SELECT 1 FROM public.hand_loaded_datasets WHERE key = 'blue_badges') THEN RAISE EXCEPTION 'hand_loaded_datasets blue_badges already exists'; END IF;
END $$;

CREATE TABLE public.council_blue_badges (
  ons_code                 text NOT NULL CHECK (ons_code ~ '^E(92|12|06|08|09|10)\d{6}$'),
  area_name                text NOT NULL CHECK (area_name <> ''),
  area_level               text NOT NULL CHECK (area_level IN ('england', 'region', 'council')),
  year                     date NOT NULL CHECK (extract(month FROM year) = 3 AND extract(day FROM year) = 31),
  held                     integer CHECK (held >= 0),
  held_automatic           integer CHECK (held_automatic >= 0),
  held_discretionary       integer CHECK (held_discretionary >= 0),
  held_organisations       integer CHECK (held_organisations >= 0),
  issued                   integer CHECK (issued >= 0),
  issued_automatic         integer CHECK (issued_automatic >= 0),
  issued_discretionary     integer CHECK (issued_discretionary >= 0),
  issued_organisations     integer CHECK (issued_organisations >= 0),
  population_dft_thousands numeric CHECK (population_dft_thousands > 0),
  held_pct_dft             numeric CHECK (held_pct_dft >= 0 AND held_pct_dft <= 100),
  held_per_1000_population numeric CHECK (held_per_1000_population >= 0),
  lost                     integer CHECK (lost >= 0),
  stolen                   integer CHECK (stolen >= 0),
  low_fields               text[] NOT NULL DEFAULT '{}',
  rounded_to               integer NOT NULL CHECK (rounded_to IN (1, 100, 1000)),
  source_table             text NOT NULL,
  source_url               text NOT NULL CHECK (source_url ~ '^https://'),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ons_code, year),
  CHECK ((area_level = 'england') = (ons_code LIKE 'E92%')),
  CHECK ((area_level = 'region') = (ons_code LIKE 'E12%'))
);
COMMENT ON TABLE public.council_blue_badges IS
  'Blue Badges held, issued and lost or stolen by council, England (DfT Blue Badge scheme statistics, DIS0108, DIS0105, DIS0109, DIS0301); migration 2026-10-28d';
COMMENT ON COLUMN public.council_blue_badges.held_per_1000_population IS
  'calculated by Open Govt: held divided by the population DfT uses (population_dft_thousands)';
ALTER TABLE public.council_blue_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_blue_badges_read ON public.council_blue_badges FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.council_blue_badges TO anon, authenticated;

INSERT INTO public.hand_loaded_datasets (key, label, tables, held_period, loaded_on, source_page, expected_release, check_kind, check_url, period_pattern, reminder_month) VALUES
 ('blue_badges', 'Blue Badges by council (England)', 'council_blue_badges', '2025 (held at 31 March 2025)', '2026-10-28',
  'https://www.gov.uk/government/statistical-data-sets/blue-badge-scheme-statistics-data-tables-dis',
  'winter (DfT; the 2025 figures were published 19 March 2026, next winter 2026 to 2027)', 'automated', NULL, NULL, NULL);
COMMIT;
