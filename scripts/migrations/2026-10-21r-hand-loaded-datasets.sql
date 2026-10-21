-- Datasets loaded by hand: where each comes from, what is held, when the next release is expected, and how the
-- weekly /api/check-hand-loaded-releases spots a newer one (owner's approval, 21 Oct 2026). The check only emails;
-- nothing is imported automatically.
--   check_kind 'page_period': fetch check_url (HTML, or GOV.UK Content API JSON) and find period_pattern matches;
--     a period newer than held_period means a new release. 'reminder': email once in reminder_month each year.
--     'automated': has its own scheduled import; listed for the record only.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
DO $$ BEGIN
  IF to_regclass('public.hand_loaded_datasets') IS NOT NULL THEN RAISE EXCEPTION 'hand_loaded_datasets already exists'; END IF;
END $$;

CREATE TABLE public.hand_loaded_datasets (
  key text PRIMARY KEY,
  label text NOT NULL,
  tables text NOT NULL,
  held_period text NOT NULL,
  loaded_on date,
  source_page text NOT NULL,
  expected_release text NOT NULL,
  check_kind text NOT NULL CHECK (check_kind IN ('page_period', 'reminder', 'automated')),
  check_url text,
  period_pattern text,
  reminder_month smallint CHECK (reminder_month BETWEEN 1 AND 12),
  last_checked_at timestamptz,
  last_found_period text,
  last_error text,
  notified_period text,
  notified_at timestamptz,
  CHECK (check_kind <> 'page_period' OR (check_url IS NOT NULL AND period_pattern IS NOT NULL)),
  CHECK (check_kind <> 'reminder' OR reminder_month IS NOT NULL)
);
ALTER TABLE public.hand_loaded_datasets ENABLE ROW LEVEL SECURITY;  -- service role only
COMMENT ON TABLE public.hand_loaded_datasets IS 'hand-loaded datasets and the weekly new-release check (migration 2026-10-21r)';

INSERT INTO public.hand_loaded_datasets (key, label, tables, held_period, loaded_on, source_page, expected_release, check_kind, check_url, period_pattern, reminder_month) VALUES
 ('council_tax', 'Council tax levels (England, Scotland, Wales)', 'council_tax_levels, councils.council_tax_band_d_pounds', '2026-27', '2026-10-19',
  'https://www.gov.uk/government/collections/council-tax-statistics', 'March (each nation publishes the coming year''s levels)',
  'page_period', 'https://www.gov.uk/api/content/government/collections/council-tax-statistics', 'England (20\d\d) to (20\d\d)', NULL),
 ('population', 'Population (mid-year estimates)', 'councils.population', 'mid-2025', '2026-10-15',
  'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland',
  'summer (ONS mid-year estimates; NRS and NISRA about the same time)',
  'page_period', 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland', '[Mm]id-(20\d\d)', NULL),
 ('fly_tipping', 'Fly-tipping (England and Wales)', 'council_fly_tipping', '2024-25', '2026-10-19',
  'https://www.gov.uk/government/statistics/fly-tipping-statistics-for-england', 'February (England; the 2024-25 figures were published 25 Feb 2026)',
  'page_period', 'https://www.gov.uk/api/content/government/statistics/fly-tipping-statistics-for-england', '(20\d\d) to (20\d\d)', NULL),
 ('ehcp', 'Education, health and care plans (England)', 'council_ehcp', '2026', '2026-10-20',
  'https://explore-education-statistics.service.gov.uk/find-statistics/education-health-and-care-plans', 'June (DfE, one release a year)',
  'page_period', 'https://explore-education-statistics.service.gov.uk/find-statistics/education-health-and-care-plans', 'Reporting year (20\d\d)', NULL),
 ('ombudsman', 'Ombudsman complaints (LGSCO, England)', 'council_ombudsman', '2025-26', '2026-10-20',
  'https://www.lgo.org.uk/information-centre/reports/annual-review-reports/local-government-complaint-reviews', 'July (annual review of complaints)',
  'page_period', 'https://www.lgo.org.uk/information-centre/reports/annual-review-reports/local-government-complaint-reviews', '(20\d\d)[-/](\d\d)\b', NULL),
 ('major_projects', 'Government major projects (NISTA annual report)', 'major_projects', '2025-26', '2026-10-20',
  'https://www.gov.uk/government/collections/major-projects-data', 'July (the 2025-26 report was published 13 Jul 2026)',
  'page_period', 'https://www.gov.uk/api/content/government/collections/major-projects-data', 'Annual Report (20\d\d)-(?:20)?(\d\d)', NULL),
 ('ministerial_directions', 'Ministerial directions', 'ministerial_directions', '2026-02-23 (collection last updated; newest direction held is 16 Feb 2026)', '2026-10-20',
  'https://www.gov.uk/government/collections/ministerial-directions', 'whenever a direction is issued (no schedule)',
  'page_period', 'https://www.gov.uk/api/content/government/collections/ministerial-directions', '"public_updated_at":"(20\d\d-\d\d-\d\d)', NULL),
 ('council_leaders', 'Council leaders', 'councils.leader_name, leader_party, leader_since', 'checked 19 Oct 2026', '2026-10-19',
  'each council''s own website (no central feed)', 'after the May local elections and annual council meetings (check in June)',
  'reminder', NULL, NULL, 6),
 ('council_elections', 'Council election results', 'council_elections, council_election_wards, council_election_candidates', 'elections to 25 Jun 2026', '2026-10-19',
  'Wikipedia''s record of each council''s results (CC BY-SA 4.0) and the Local Elections Archive Project', 'May (local elections; results compiled in the following weeks)',
  'reminder', NULL, NULL, 6),
 ('foi', 'FOI statistics', 'foi_statistics', 'Q4 2025', '2026-10-20',
  'https://www.gov.uk/government/collections/government-foi-statistics', 'quarterly; imported weekly by .github/workflows/weekly-foi-statistics.yml',
  'automated', NULL, NULL, NULL);
COMMIT;
