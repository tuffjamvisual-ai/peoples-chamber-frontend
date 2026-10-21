-- DWP PIP figures from Stat-Xplore join the hand-loaded datasets (John's decision, 21 Oct 2026): council_pip_mobility
-- holds July 2025 and July 2026. The Monday check reads the PIP_Monthly_new month list (Stat-Xplore schema API, with
-- the project's STAT_XPLORE_API_KEY) and emails when a month later than July 2026 appears. Loading it stays by hand
-- (scripts/import-pip-mobility.js --months=...).
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM hand_loaded_datasets WHERE key = 'dwp_pip_mobility') THEN RAISE EXCEPTION 'dwp_pip_mobility already listed'; END IF;
END $$;
INSERT INTO public.hand_loaded_datasets (key, label, tables, held_period, loaded_on, source_page, expected_release, check_kind, check_url, period_pattern) VALUES
 ('dwp_pip_mobility', 'PIP mobility awards by council (DWP Stat-Xplore)', 'council_pip_mobility', '2026-07 (July 2026)', '2026-10-21',
  'https://stat-xplore.dwp.gov.uk/ (database PIP_Monthly_new, "PIP Cases with Entitlement from 2019")',
  'monthly; each month is usually added about three months later',
  'page_period', 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1/schema/str%3Avalueset%3APIP_Monthly_new%3AF_PIP_DATE%3ADATE2%3AC_PIP_DATE',
  'C_PIP_DATE:(20\d\d(?:0[1-9]|1[0-2]))"');
COMMIT;
