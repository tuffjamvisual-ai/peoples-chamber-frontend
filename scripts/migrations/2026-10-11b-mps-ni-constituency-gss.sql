-- Fill mps.constituency_gss_code for the 18 Northern Ireland constituencies.
--
-- Background: scripts/backfill-mps-constituency-gss.js deliberately left
-- NI rows NULL because the welfare explorer is GB-only. NI constituencies
-- do have official ONS codes (N05000001-N05000018, 2024 boundaries), and
-- the petitions feature (2026-10-11-petitions.sql) joins on this column,
-- so without them NI MPs never get a Petitions tab.
--
-- Codes: taken from petition.parliament.uk's signatures_by_constituency
-- (ONS codes), cross-checked against the ONS explore-local-statistics
-- area pages (e.g. N05000016 Strangford, N05000008 Foyle, verified
-- 2026-10-11). The codes run alphabetically by constituency name, which
-- the list below matches.
--
-- Safety: each UPDATE matches the exact constituency name AND only rows
-- where the code is currently NULL, so no existing value can be
-- overwritten. The welfare search (app/api/welfare/search/route.ts)
-- excludes N-prefixed codes in the same commit so NI constituencies,
-- which have no welfare data, do not start appearing there.

UPDATE public.mps AS m
SET constituency_gss_code = v.code
FROM (VALUES
  ('Belfast East',               'N05000001'),
  ('Belfast North',              'N05000002'),
  ('Belfast South and Mid Down', 'N05000003'),
  ('Belfast West',               'N05000004'),
  ('East Antrim',                'N05000005'),
  ('East Londonderry',           'N05000006'),
  ('Fermanagh and South Tyrone', 'N05000007'),
  ('Foyle',                      'N05000008'),
  ('Lagan Valley',               'N05000009'),
  ('Mid Ulster',                 'N05000010'),
  ('Newry and Armagh',           'N05000011'),
  ('North Antrim',               'N05000012'),
  ('North Down',                 'N05000013'),
  ('South Antrim',               'N05000014'),
  ('South Down',                 'N05000015'),
  ('Strangford',                 'N05000016'),
  ('Upper Bann',                 'N05000017'),
  ('West Tyrone',                'N05000018')
) AS v(name, code)
WHERE m.constituency = v.name
  AND m.constituency_gss_code IS NULL;

-- Verification (expected: 18 rows, each with its N05 code):
-- SELECT member_id, name, constituency, constituency_gss_code
-- FROM public.mps
-- WHERE constituency_gss_code LIKE 'N05%'
-- ORDER BY constituency_gss_code;
