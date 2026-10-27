-- 2026-10-25b: government contractors who donate are matched by Companies House number only, and individual donors
-- are left out (owner's approval, 25 Oct 2026, report 71; applied 27 Oct 2026). Until now contractor_donor_matches joined supplier and
-- donor by exact name (upper case, spaces collapsed), people included, so two different companies, or a company and a
-- person, with the same name could be linked.
--
-- The supplier's number comes from Find a Tender: each contract row (government_contracts_counted) takes the GB-COH
-- number its notices (contract_notices, same ocid) give that supplier name, and only when they give exactly one.
-- The donor's number is the Electoral Commission's company_registration_number. Both are normalised by
-- normalise_company_number(): upper case, spaces removed, digits padded to 8 and a two letter prefix (SC, NI, OC...)
-- followed by 6 digits, as Companies House writes them; anything else, and placeholders such as 00000000, is not a
-- number. One row per number.
--
-- Columns are kept (norm now holds the company number, the grouping key) and company_number is added. The stored copy
-- is rebuilt with the new column; refresh_contractor_donor_matches() is unchanged. The old rows are kept in
-- contractor_donor_matches_backup_20261027. Undo: 2026-10-25b-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.contractor_donor_matches_backup_20261027') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
  IF to_regprocedure('public.normalise_company_number(text)') IS NOT NULL THEN RAISE EXCEPTION 'normalise_company_number already exists'; END IF;
  IF to_regclass('public.contractor_donor_matches_stored') IS NULL THEN RAISE EXCEPTION 'contractor_donor_matches_stored is missing'; END IF;
END $$;

-- Before: the stored rows, kept.
CREATE TABLE public.contractor_donor_matches_backup_20261027 AS SELECT *, now() AS backed_up_at FROM public.contractor_donor_matches_stored;
ALTER TABLE public.contractor_donor_matches_backup_20261027 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_donor_matches_backup_20261027 FROM anon, authenticated;

CREATE FUNCTION public.normalise_company_number(raw text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public, pg_temp AS $fn$
  SELECT CASE
    WHEN c ~ '^0*$' OR c ~ '^[A-Z]{2}0*$' THEN NULL  -- placeholders such as 0 or 00000000 are not numbers
    WHEN c ~ '^[0-9]{1,8}$' THEN lpad(c, 8, '0')
    WHEN c ~ '^[A-Z]{2}[0-9]{1,6}$' THEN left(c, 2) || lpad(substr(c, 3), 6, '0')
    ELSE NULL END
  FROM (SELECT regexp_replace(upper(coalesce(raw, '')), '\s', '', 'g') AS c) x
$fn$;
COMMENT ON FUNCTION public.normalise_company_number(text) IS 'A Companies House number as Companies House writes it (8 digits, or 2 letters and 6 digits), or NULL (migration 2026-10-25b)';

DROP MATERIALIZED VIEW public.contractor_donor_matches_stored;

CREATE OR REPLACE VIEW public.contractor_donor_matches WITH (security_invoker = true) AS
WITH supplier_numbers AS (
  SELECT cn.ocid,
         upper(regexp_replace(btrim(s.value->>'name'), '\s+', ' ', 'g')) AS norm,
         public.normalise_company_number(substr(s.value->>'id', 8)) AS company_number
  FROM public.contract_notices cn, jsonb_array_elements(cn.suppliers) s(value)
  WHERE s.value->>'id' LIKE 'GB-COH-%'
), one_number AS (
  SELECT ocid, norm, min(company_number) AS company_number
  FROM supplier_numbers
  WHERE company_number IS NOT NULL
  GROUP BY ocid, norm
  HAVING count(DISTINCT company_number) = 1
), s AS (
  SELECT o.company_number,
         count(*) FILTER (WHERE NOT g.is_framework AND NOT g.superseded) AS contracts,
         COALESCE(sum(g.value) FILTER (WHERE NOT g.is_framework AND NOT g.superseded), 0::numeric) AS contract_value,
         count(*) FILTER (WHERE g.is_framework) AS framework_places,
         count(*) FILTER (WHERE g.value IS NULL AND NOT g.is_framework AND NOT g.superseded) AS unpublished
  FROM public.government_contracts_counted g
  JOIN one_number o ON o.ocid = g.ocid AND o.norm = g.norm
  GROUP BY o.company_number
), d AS (
  SELECT public.normalise_company_number(p.company_registration_number) AS company_number,
         mode() WITHIN GROUP (ORDER BY btrim(p.donor_name)) AS display_name,
         count(*) AS donations,
         sum(COALESCE(p.amount, 0::numeric)) AS donated
  FROM public.political_donations p
  WHERE p.donor_type IS DISTINCT FROM 'Individual'
    AND public.normalise_company_number(p.company_registration_number) IS NOT NULL
  GROUP BY 1
)
SELECT d.display_name, s.company_number AS norm, s.contracts, s.contract_value, d.donations, d.donated,
       s.framework_places, s.unpublished, s.company_number
FROM s JOIN d USING (company_number);
GRANT SELECT ON public.contractor_donor_matches TO anon, authenticated;

CREATE MATERIALIZED VIEW public.contractor_donor_matches_stored AS
  SELECT display_name, norm, contracts, contract_value, donations, donated, framework_places, unpublished, company_number
  FROM public.contractor_donor_matches;
CREATE UNIQUE INDEX contractor_donor_matches_stored_norm_idx ON public.contractor_donor_matches_stored (norm);
REVOKE ALL ON public.contractor_donor_matches_stored FROM anon, authenticated;
GRANT SELECT ON public.contractor_donor_matches_stored TO anon, authenticated;
COMMENT ON MATERIALIZED VIEW public.contractor_donor_matches_stored IS 'contractor_donor_matches stored, matched by Companies House number (migration 2026-10-25b); refreshed daily by refresh_contractor_donor_matches()';

-- Checks run afterwards as a separate read only query (no checks inside this transaction).
COMMIT;
