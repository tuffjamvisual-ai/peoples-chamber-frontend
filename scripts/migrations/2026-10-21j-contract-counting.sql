-- Contract totals, interim fix (owner's approval, 21 Oct 2026). government_contracts holds one row per Find a Tender
-- notice, not per contract, and has no notice type, so totals double-counted and framework ceilings read as spending:
--   - an award notice and its contract details notice for the same contract (contract ids 'award:1' and '1') were
--     two rows: 1,712 such pairs (Cadent Gas's £45,954,392 National Highways deed counted twice);
--   - older-rules change notices are new rows with the changed value, next to the original;
--   - framework maximums were added in as contracts: Barclays showed £11,001,022,000, of which £11bn is the
--     Government Commercial Agency's Payment Solutions 3 framework (88% of /donations/government-contractors' total).
-- government_contracts_counted applies three rules (the same as lib/contract-counting.ts, for donor pages):
--   1. one row per ocid + supplier + value (rows without an ocid stand alone);
--   2. superseded: an older-rules notice published in a later year than the contract was signed, for the same ocid,
--      supplier and signing date as another row, and not the newest of them;
--   3. is_framework: title says framework / dynamic purchasing / DPS, or the buyer is a central purchasing body.
--      Framework rows are counted as framework places and never summed.
-- These are approximations until contract_notices (notice types) replaces them.
-- contractor_donor_matches keeps its columns (contract_value now leaves out frameworks and superseded rows) and adds
-- framework_places and unpublished at the end.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
DO $$ BEGIN
  IF to_regclass('public.government_contracts_counted') IS NOT NULL THEN RAISE EXCEPTION 'government_contracts_counted already exists'; END IF;
  IF to_regclass('public.contractor_donor_matches') IS NULL THEN RAISE EXCEPTION 'contractor_donor_matches is missing'; END IF;
END $$;

CREATE VIEW public.government_contracts_counted WITH (security_invoker = true) AS
WITH g AS (
  SELECT gc.*, upper(regexp_replace(btrim(supplier), '\s+', ' ', 'g')) AS norm,
    (title ~* 'framework|dynamic purchasing|\mDPS\M|flexible purchasing|purchasing system'
     OR dept_slug ~ '(commercial-agency|crown-commercial|purchasing-organisation|^espo|^nepo|healthtrust-europe|nhs-shared-business|procurement-for-housing|pagabo|fusion21|efficiency-east-midlands|consortium)') AS is_framework
  FROM public.government_contracts gc WHERE supplier IS NOT NULL AND btrim(supplier) <> ''
), g2 AS (
  SELECT g.*, count(*) OVER (PARTITION BY ocid, norm, awarded_date) AS same_signing_rows,
         max(contract_id) OVER (PARTITION BY ocid, norm, awarded_date) AS newest_notice
  FROM g
), d AS (
  SELECT DISTINCT ON (coalesce(ocid, 'row:' || id), norm, value) *
  FROM g2 ORDER BY coalesce(ocid, 'row:' || id), norm, value, (contract_id LIKE 'award:%'), id
)
SELECT id, ocid, norm, supplier, dept_slug, title, value, awarded_date, status, contract_id, is_framework,
  coalesce(contract_id ~ '^\d{6}-\d{4}-' AND substring(contract_id from '^\d{6}-(\d{4})')::int > left(awarded_date, 4)::int
   AND ocid IS NOT NULL AND same_signing_rows > 1 AND contract_id < newest_notice, false) AS superseded
FROM d;

CREATE OR REPLACE VIEW public.contractor_donor_matches WITH (security_invoker = true) AS
WITH s AS (
  SELECT norm,
         count(*) FILTER (WHERE NOT is_framework AND NOT superseded) AS contracts,
         coalesce(sum(value) FILTER (WHERE NOT is_framework AND NOT superseded), 0) AS contract_value,
         count(*) FILTER (WHERE is_framework) AS framework_places,
         count(*) FILTER (WHERE value IS NULL AND NOT is_framework AND NOT superseded) AS unpublished
  FROM public.government_contracts_counted GROUP BY 1
), d AS (
  SELECT upper(regexp_replace(btrim(donor_name), '\s+', ' ', 'g')) AS norm,
         min(donor_name) AS display_name, count(*) AS donations, sum(coalesce(amount, 0)) AS donated
  FROM public.political_donations WHERE donor_name IS NOT NULL AND btrim(donor_name) <> '' GROUP BY 1
)
SELECT d.display_name, s.norm, s.contracts, s.contract_value, d.donations, d.donated, s.framework_places, s.unpublished
FROM s JOIN d USING (norm);

COMMENT ON VIEW public.government_contracts_counted IS 'government_contracts counted once per contract, superseded change notices and frameworks flagged (migration 2026-10-21j)';
GRANT SELECT ON public.government_contracts_counted, public.contractor_donor_matches TO anon, authenticated;

DO $$
DECLARE n bigint; v numeric; b numeric;
BEGIN
  SELECT count(*), sum(contract_value) INTO n, v FROM public.contractor_donor_matches;
  IF n < 50 THEN RAISE EXCEPTION 'only % matched companies', n; END IF;
  SELECT contract_value INTO b FROM public.contractor_donor_matches WHERE norm = 'BARCLAYS BANK PLC';
  IF b >= 1e9 THEN RAISE EXCEPTION 'Barclays still counts the framework: %', b; END IF;
  RAISE NOTICE 'matched companies %, contract value %, Barclays %', n, v, b;
END $$;
COMMIT;
