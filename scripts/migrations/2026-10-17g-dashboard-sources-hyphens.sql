-- Broken State dashboard follow-up (17 Oct 2026):
--  * waiting list: August 2025 comparison corrected to NHS England's revised figure;
--  * source links point to the publisher named on each card (NHS England, Skills for Care, Ofsted on GOV.UK);
--  * children's homes note rewritten from Ofsted's own report, and the unsupported 2024/25 comparison removed;
--  * hyphens between letters in reader-facing text replaced with spaces (house style: no hyphens).
-- Old rows kept in public.dashboard_indicators_backup_20261017g.
-- Each update must change exactly one row or the whole file rolls back.
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS public.dashboard_indicators_backup_20261017g AS SELECT *, now() AS saved_at FROM public.dashboard_indicators;
ALTER TABLE public.dashboard_indicators_backup_20261017g ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_indicators_backup_20261017g FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  UPDATE public.dashboard_indicators
    SET source_url = 'https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2026-27/'
  WHERE service = 'hospitals' AND label ILIKE 'A&E%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'ae: % rows', n; END IF;

  -- August 2025 uses NHS England's revised figure (7,403,612; Sheffield Teaching Hospitals' data resubmitted
  -- 13 November 2025), per the Aug26 RTT statistical press notice and the Full Time Series sheet.
  UPDATE public.dashboard_indicators
    SET source_url = 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2026-27/',
        value = 7370100,
        recent_direction = 'flat',
        recent_change = 'Down 33,512 (0.5%) on August 2025 (7.40m, revised)',
        definition_note = 'Incomplete referral to treatment pathways (treatments waiting to start) at the end of August 2026, about 6.24 million individual patients. NHS England, monthly.'
  WHERE service = 'hospitals' AND label ILIKE 'Elective%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'rtt: % rows', n; END IF;

  UPDATE public.dashboard_indicators
    SET source_url = 'https://www.skillsforcare.org.uk/news-and-events/news/adult-social-care-vacancy-rate-falls-to-lowest-level-in-a-decade-as-workforce-grows'
  WHERE service = 'adult_social_care';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'asc: % rows', n; END IF;

  UPDATE public.dashboard_indicators
    SET source_url = 'https://www.gov.uk/government/statistics/childrens-social-care-in-england-2026/main-findings-childrens-social-care-in-england-2026',
        recent_change = NULL, recent_direction = NULL,
        definition_note = 'Of 4,430 full inspections of children''s homes of all types in 2025/26, 82% judged them good or outstanding (11% outstanding, 71% good). There were 4,800 homes at 31 March 2026, up 800 (20%) on a year earlier. The report gives no comparable figure for 2024/25.'
  WHERE service = 'childrens_social_care';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'children: % rows', n; END IF;
END $do$;
-- Hyphens between letters become spaces (run twice so runs like a-b-c are fully handled).
UPDATE public.dashboard_indicators SET
  label           = regexp_replace(regexp_replace(label,           '([[:alpha:]])-([[:alpha:]])', '\1 \2', 'g'), '([[:alpha:]])-([[:alpha:]])', '\1 \2', 'g'),
  definition_note = regexp_replace(regexp_replace(definition_note, '([[:alpha:]])-([[:alpha:]])', '\1 \2', 'g'), '([[:alpha:]])-([[:alpha:]])', '\1 \2', 'g'),
  recent_change   = regexp_replace(regexp_replace(recent_change,   '([[:alpha:]])-([[:alpha:]])', '\1 \2', 'g'), '([[:alpha:]])-([[:alpha:]])', '\1 \2', 'g'),
  source_name     = regexp_replace(regexp_replace(source_name,     '([[:alpha:]])-([[:alpha:]])', '\1 \2', 'g'), '([[:alpha:]])-([[:alpha:]])', '\1 \2', 'g');
-- Anything still containing a hyphen, for review (expect no rows).
SELECT service, label, definition_note, recent_change, source_name FROM public.dashboard_indicators
WHERE label LIKE '%-%' OR definition_note LIKE '%-%' OR recent_change LIKE '%-%' OR source_name LIKE '%-%';
SELECT service, left(label, 60) AS label, left(source_url, 70) AS source_url FROM public.dashboard_indicators ORDER BY service;
COMMIT;
