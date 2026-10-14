-- Lobbying index fixes, approved by the site owner 14 Oct 2026.
--
-- 1. Remove the GOV.UK abbreviations that scripts/build-lobbying-index.js added as automatic
--    spellings. Checked against meeting topics, many pointed to the wrong organisation
--    ("Sage" the software company matched to the Scientific Advisory Group for Emergencies,
--    "GLA" the Greater London Authority to the Gangmasters Licensing Authority, "PPF" the
--    Czech investment group to the Pension Protection Fund, "TPAS" the Tenant Participation
--    Advisory Service to The Pensions Advisory Service). GOV.UK full titles are kept.
--    Correct short forms are added back only through the hand review.
-- 2. The Trades Union Congress is a federation of unions: type 'union', not 'trade_body'.
--
-- After applying, rebuild: node scripts/build-lobbying-index.js --write
-- and: node scripts/import-orcl-returns.js --from=data/orcl --write

\set ON_ERROR_STOP on
BEGIN;

DELETE FROM public.lobby_org_aliases a
USING public.lobby_orgs o
WHERE a.org_id = o.id
  AND a.source = 'govuk'
  AND o.source = 'govuk'
  AND a.alias_example IS DISTINCT FROM o.name;

UPDATE public.lobby_orgs
SET org_type = 'union', updated_at = now()
WHERE slug = 'trades-union-congress' AND org_type <> 'union';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.lobby_org_aliases WHERE alias_norm IN ('sage', 'gla', 'ppf', 'tpas')) THEN
    RAISE EXCEPTION 'abbreviation spellings still present';
  END IF;
  IF (SELECT org_type FROM public.lobby_orgs WHERE slug = 'trades-union-congress') <> 'union' THEN
    RAISE EXCEPTION 'TUC type not changed';
  END IF;
END $$;

COMMIT;
