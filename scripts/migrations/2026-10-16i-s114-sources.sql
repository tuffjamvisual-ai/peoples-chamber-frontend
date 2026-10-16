-- Audit L2: section 114 warning flags linked to Wikipedia. The primary record is the House of
-- Commons Levelling Up, Housing and Communities Committee report "Financial distress in local
-- authorities" (HC 56, 2024), footnote 3, which lists every notice since 2018: Northamptonshire
-- (Feb and Jul 2018), Croydon (Nov 2020, Dec 2020, Nov 2022), Slough (Jul 2021), Nottingham
-- (Dec 2021, Nov 2023), Northumberland (May 2022), Thurrock (Dec 2022), Woking (Jun 2023) and
-- Birmingham (Sep 2023). Checked 16 Oct 2026.

\set ON_ERROR_STOP on
BEGIN;
UPDATE council_finance_events
SET source = 'House of Commons Levelling Up, Housing and Communities Committee, Financial distress in local authorities (HC 56, 2024), footnote 3',
    source_url = 'https://publications.parliament.uk/pa/cm5804/cmselect/cmcomloc/56/report.html'
WHERE event_type = 'section_114' AND source_url ILIKE '%wikipedia%';
SELECT council_gss_code, period, source_url FROM council_finance_events WHERE event_type = 'section_114' ORDER BY period;
COMMIT;

-- Northumberland County Council's section 114 notice (May 2022, footnote 3 of the same report)
-- was missing. The report gives the month only, so event_date is left empty.
BEGIN;
INSERT INTO council_finance_events (council_gss_code, event_type, period, event_date, amount_gbp, detail, source, source_url)
SELECT 'E06000057', 'section_114', '2022-05', NULL, NULL, '{"council": "Northumberland County Council"}'::jsonb,
       'House of Commons Levelling Up, Housing and Communities Committee, Financial distress in local authorities (HC 56, 2024), footnote 3',
       'https://publications.parliament.uk/pa/cm5804/cmselect/cmcomloc/56/report.html'
WHERE NOT EXISTS (SELECT 1 FROM council_finance_events WHERE council_gss_code = 'E06000057' AND event_type = 'section_114');
SELECT council_gss_code, period, event_date FROM council_finance_events WHERE council_gss_code = 'E06000057';
COMMIT;
