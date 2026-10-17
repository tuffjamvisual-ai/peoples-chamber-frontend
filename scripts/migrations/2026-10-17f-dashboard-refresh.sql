-- Broken State dashboard: latest published figures, a separate "recent movement" with its period,
-- source links and a checked date (reassessment, 17 Oct 2026: the single badge mixed long-term and
-- short-term movement, "auto-updated" was shown although no job updates these rows, and several
-- figures were out of date or mislabelled). Every figure below was read from the named source on
-- 17 October 2026. Old rows kept in public.dashboard_indicators_backup_20261017.
-- Each update must change exactly one row or the whole file rolls back.
\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE public.dashboard_indicators ADD COLUMN IF NOT EXISTS recent_change text;
ALTER TABLE public.dashboard_indicators ADD COLUMN IF NOT EXISTS recent_direction text;
ALTER TABLE public.dashboard_indicators ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.dashboard_indicators ADD COLUMN IF NOT EXISTS checked_on date;
CREATE TABLE IF NOT EXISTS public.dashboard_indicators_backup_20261017 AS SELECT *, now() AS saved_at FROM public.dashboard_indicators;
ALTER TABLE public.dashboard_indicators_backup_20261017 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_indicators_backup_20261017 FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  -- General practice (NHS England Digital, 31 August 2026)
  UPDATE public.dashboard_indicators SET value = 29223, period = '2026-08', update_method = 'manual',
    trend = 'flat', recent_direction = 'improving',
    recent_change = 'Up 815 (2.9%) on August 2025',
    definition_note = 'Fully qualified GPs, full-time equivalent, excluding trainees: 29,223 at 31 August 2026. Close to the September 2015 level while registered patients have risen, so patients per GP are higher. NHS England Digital, monthly.',
    source_url = 'https://digital.nhs.uk/data-and-information/publications/statistical/general-and-personal-medical-services/31-august-2026',
    checked_on = DATE '2026-10-17'
  WHERE service = 'general_practice';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'gp: % rows', n; END IF;

  -- A&E (NHS England via BMA backlog analysis, September 2026; September 2025 from NHS figures)
  UPDATE public.dashboard_indicators SET value = 74.4, period = '2026-09', update_method = 'manual',
    trend = 'worsening', recent_direction = 'worsening',
    recent_change = 'Down 0.7 points on September 2025 (75.1%)',
    definition_note = 'Share of all A&E attendances (all department types) admitted, transferred or discharged within four hours, England. The interim target was 82% by March 2026; the constitutional standard is 95%. 2019 baseline approximate.',
    source_url = 'https://www.bma.org.uk/advice-and-support/nhs-delivery-and-workforce/pressures/nhs-backlog-data-analysis',
    checked_on = DATE '2026-10-17'
  WHERE service = 'hospitals' AND label ILIKE 'A&E%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'ae: % rows', n; END IF;

  -- Elective waiting list (August 2026: 7.37m; August 2025: 7,414,794, NHS England)
  UPDATE public.dashboard_indicators SET value = 7370000, period = '2026-08', update_method = 'manual',
    trend = 'worsening', recent_direction = 'flat',
    recent_change = 'Down about 45,000 (0.6%) on August 2025 (7.41m)',
    definition_note = 'Incomplete referral-to-treatment pathways (treatments waiting to start), about 6.24 million individual patients. Pre-pandemic level about 4.4m (early 2020).',
    source_url = 'https://www.bma.org.uk/advice-and-support/nhs-delivery-and-workforce/pressures/nhs-backlog-data-analysis',
    checked_on = DATE '2026-10-17'
  WHERE service = 'hospitals' AND label ILIKE 'Elective%';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'rtt: % rows', n; END IF;

  -- Adult social care vacancy rate (Skills for Care, 2025/26)
  UPDATE public.dashboard_indicators SET update_method = 'manual',
    trend = 'improving', recent_direction = 'improving',
    recent_change = 'Vacancies down 10.5% on 2024/25',
    source_url = 'https://www.nationalhealthexecutive.com/articles/adult-social-care-vacancy-rate-falls-decade-low-challenges-persist',
    checked_on = DATE '2026-10-17'
  WHERE service = 'adult_social_care';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'asc: % rows', n; END IF;

  -- Children's homes (Ofsted, 31 March 2026)
  UPDATE public.dashboard_indicators SET value = 82, period = '2025-26', update_method = 'manual',
    trend = 'improving', recent_direction = 'flat',
    recent_change = 'About 83% in 2024/25',
    definition_note = '82% of England''s 4,750 children''s homes were judged good or outstanding at 31 March 2026. The sector''s crisis is cost, not inspection: residential placement spend has risen sharply and some placements exceed £60,000 a week, see our investigation, Who Profits When Councils Have No Choice.',
    source_url = 'https://dera.ioe.ac.uk/id/eprint/42354/1/Main%20findings%20children%E2%80%99s%20social%20care%20in%20England%202026%20-%20GOV.UK.pdf',
    checked_on = DATE '2026-10-17'
  WHERE service = 'childrens_social_care';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'children: % rows', n; END IF;

  -- Temporary accommodation (MHCLG, 31 March 2026, published 13 August 2026)
  UPDATE public.dashboard_indicators SET value = 135580, period = '2026-Q1', update_method = 'manual',
    trend = 'worsening', recent_direction = 'worsening',
    recent_change = 'Up 3.6% on March 2025',
    definition_note = '135,580 households in temporary accommodation in England at 31 March 2026, 86,460 of them with children. MHCLG, quarterly.',
    source_url = 'https://www.gov.uk/government/statistics/statutory-homelessness-in-england-january-to-march-2026/statutory-homelessness-in-england-january-to-march-2026',
    checked_on = DATE '2026-10-17'
  WHERE service = 'homelessness';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'ta: % rows', n; END IF;

  -- Persistent absence (DfE, autumn and spring terms 2025/26, published 15 October 2026)
  UPDATE public.dashboard_indicators SET value = 17.5, period = '2025-26 (autumn and spring)', update_method = 'manual',
    trend = 'worsening', recent_direction = 'flat',
    recent_change = '17.50% against 17.63% in the same terms of 2024/25',
    definition_note = 'Pupils missing 10% or more of sessions in the autumn and spring terms of 2025/26. The 2018/19 baseline (10.9%) is a full school year, so the comparison is approximate. DfE, termly.',
    source_url = 'https://explore-education-statistics.service.gov.uk/find-statistics/pupil-absence-in-schools-in-england',
    checked_on = DATE '2026-10-17'
  WHERE service = 'schools';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'schools: % rows', n; END IF;

  -- Charge or summons (Home Office, year ending March 2026, published 23 July 2026)
  UPDATE public.dashboard_indicators SET value = 7.3, period = '2025-26', update_method = 'manual',
    label = 'Victim-based crimes resulting in a charge or summons',
    baseline_value = NULL, baseline_period = NULL,
    trend = 'improving', recent_direction = 'improving',
    recent_change = 'Up from 6.3% in the year to March 2025',
    definition_note = 'Charge or summons rate for victim-based crimes in the year to March 2026, England and Wales (fraud and computer misuse excluded). No long-term change is shown because the published measure has changed; the earlier 15.5% figure for 2015 covered a different set of offences.',
    source_url = 'https://www.gov.uk/government/statistics/crime-outcomes-in-england-and-wales-2025-to-2026/crime-outcomes-in-england-and-wales-2025-to-2026',
    checked_on = DATE '2026-10-17'
  WHERE service = 'police';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'police: % rows', n; END IF;

  -- Crown Court (MoJ, end of June 2026, published 24 September 2026)
  UPDATE public.dashboard_indicators SET value = 80829, period = '2026-Q2', update_method = 'manual',
    trend = 'worsening', recent_direction = 'worsening',
    recent_change = 'Up 3% on June 2025 (78,226) and up 392 on March 2026',
    definition_note = 'Open Crown Court cases at the end of June 2026, a series peak. More than double the December 2019 pre-Covid level (about 38,000).',
    source_url = 'https://www.gov.uk/government/statistics/criminal-court-statistics-quarterly-april-to-june-2026/criminal-court-statistics-quarterly-april-to-june-2026',
    checked_on = DATE '2026-10-17'
  WHERE service = 'criminal_courts';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'courts: % rows', n; END IF;

  -- Prisons (MoJ Justice in Numbers: 85,858 / 89,120 at June 2026; 87,334 / 89,573 at June 2025)
  UPDATE public.dashboard_indicators SET value = 96.3, period = '2026-06', update_method = 'manual',
    trend = 'flat', recent_direction = 'improving',
    recent_change = 'Down from 97.5% in June 2025',
    definition_note = 'Population 85,858 against operational capacity of 89,120 (June 2026). Occupancy is held below the roughly 99% ceiling only by the SDS40 early release scheme running since 2024, so the percentage understates the strain.',
    source_url = 'https://assets.publishing.service.gov.uk/media/6ac4c66f66673801262267c1/JiN_Summary_Tables_2026-10-06.pdf',
    checked_on = DATE '2026-10-17'
  WHERE service = 'prisons';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'prisons: % rows', n; END IF;
END $do$;
SELECT service, label, value, period, baseline_period, trend, recent_direction, checked_on FROM public.dashboard_indicators ORDER BY service;
COMMIT;
