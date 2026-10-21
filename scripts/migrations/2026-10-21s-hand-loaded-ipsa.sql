-- IPSA business costs join the hand-loaded datasets (owner's decision, 21 Oct 2026): theipsa.org.uk's robots.txt
-- disallows /api/*, so the nightly IPSA steps are paused and the files are downloaded in a browser into data/ipsa/.
-- IPSA's costs page carries no "latest data" date, so the weekly check emails when the page's newest content update
-- (Contentful "updatedAt") is later than the one recorded here (13 Mar 2026).
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM hand_loaded_datasets WHERE key = 'ipsa_business_costs') THEN RAISE EXCEPTION 'ipsa_business_costs already listed'; END IF;
END $$;
INSERT INTO public.hand_loaded_datasets (key, label, tables, held_period, loaded_on, source_page, expected_release, check_kind, check_url, period_pattern) VALUES
 ('ipsa_business_costs', 'MP business costs (IPSA)', 'mp_expenses_detail, mp_expenses_summary',
  '2026-03-13 (costs page last updated; claims held to early Oct 2026, year totals to 2024-25)', '2026-10-21',
  'https://www.theipsa.org.uk/mp-staffing-business-costs',
  'individual claims in tranches through the year (about every two months); annual totals some months after the year ends in March',
  'page_period', 'https://www.theipsa.org.uk/mp-staffing-business-costs', '"updatedAt":"(20\d\d-\d\d-\d\d)');
COMMIT;
