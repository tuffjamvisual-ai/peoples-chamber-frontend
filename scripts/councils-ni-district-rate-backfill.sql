-- NI district rate backfill, 2026-27.
-- Source: Department of Finance, "Rate poundages" (finance-ni.gov.uk/
-- articles/rate-poundages), domestic district rates for 2026-27.
-- Cross-checked: Belfast's figure implies a 4.48% increase on the prior
-- year, matching Belfast City Council's own press release confirming a
-- 4.48% increase for 2026/27 ("Belfast councillors strike district rate
-- for 2026").
-- Conservative write: only fills ni_district_rate_poundage where NULL.

-- ===== PREVIEW =====
SELECT slug, name, ni_district_rate_poundage
FROM councils
WHERE slug IN (
  'antrim-and-newtownabbey','ards-and-north-down','armagh-city-banbridge-and-craigavon',
  'belfast','causeway-coast-and-glens','derry-city-and-strabane','fermanagh-and-omagh',
  'lisburn-and-castlereagh','mid-and-east-antrim','mid-ulster','newry-mourne-and-down'
);

-- ===== UPDATE =====
BEGIN;

UPDATE councils SET ni_district_rate_poundage = 0.004425 WHERE slug = 'antrim-and-newtownabbey' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.004435 WHERE slug = 'ards-and-north-down' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.005412 WHERE slug = 'armagh-city-banbridge-and-craigavon' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.004492 WHERE slug = 'belfast' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.005101 WHERE slug = 'causeway-coast-and-glens' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.006655 WHERE slug = 'derry-city-and-strabane' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.004468 WHERE slug = 'fermanagh-and-omagh' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.003966 WHERE slug = 'lisburn-and-castlereagh' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.005668 WHERE slug = 'mid-and-east-antrim' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.004330 WHERE slug = 'mid-ulster' AND ni_district_rate_poundage IS NULL;
UPDATE councils SET ni_district_rate_poundage = 0.004999 WHERE slug = 'newry-mourne-and-down' AND ni_district_rate_poundage IS NULL;

COMMIT;

-- ===== VERIFY =====
SELECT slug, name, ni_district_rate_poundage
FROM councils
WHERE ni_district_rate_poundage IS NOT NULL
ORDER BY name;
