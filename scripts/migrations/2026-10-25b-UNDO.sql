-- Undo 2026-10-25b: the name based contractor_donor_matches, its stored copy without company_number, and no
-- normalise_company_number(). The backup table contractor_donor_matches_backup_20261027 is left in place.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP MATERIALIZED VIEW public.contractor_donor_matches_stored;
DROP VIEW public.contractor_donor_matches;
CREATE VIEW public.contractor_donor_matches WITH (security_invoker = true) AS
 WITH s AS (
         SELECT government_contracts_counted.norm,
            count(*) FILTER (WHERE NOT government_contracts_counted.is_framework AND NOT government_contracts_counted.superseded) AS contracts,
            COALESCE(sum(government_contracts_counted.value) FILTER (WHERE NOT government_contracts_counted.is_framework AND NOT government_contracts_counted.superseded), 0::numeric) AS contract_value,
            count(*) FILTER (WHERE government_contracts_counted.is_framework) AS framework_places,
            count(*) FILTER (WHERE government_contracts_counted.value IS NULL AND NOT government_contracts_counted.is_framework AND NOT government_contracts_counted.superseded) AS unpublished
           FROM government_contracts_counted
          GROUP BY government_contracts_counted.norm
        ), d AS (
         SELECT upper(regexp_replace(btrim(political_donations.donor_name), '\s+'::text, ' '::text, 'g'::text)) AS norm,
            min(political_donations.donor_name) AS display_name,
            count(*) AS donations,
            sum(COALESCE(political_donations.amount, 0::numeric)) AS donated
           FROM political_donations
          WHERE political_donations.donor_name IS NOT NULL AND btrim(political_donations.donor_name) <> ''::text
          GROUP BY (upper(regexp_replace(btrim(political_donations.donor_name), '\s+'::text, ' '::text, 'g'::text)))
        )
 SELECT d.display_name,
    s.norm,
    s.contracts,
    s.contract_value,
    d.donations,
    d.donated,
    s.framework_places,
    s.unpublished
   FROM s
     JOIN d USING (norm);
GRANT SELECT ON public.contractor_donor_matches TO anon, authenticated;
CREATE MATERIALIZED VIEW public.contractor_donor_matches_stored AS
  SELECT display_name, norm, contracts, contract_value, donations, donated, framework_places, unpublished
  FROM public.contractor_donor_matches;
CREATE UNIQUE INDEX contractor_donor_matches_stored_norm_idx ON public.contractor_donor_matches_stored (norm);
REVOKE ALL ON public.contractor_donor_matches_stored FROM anon, authenticated;
GRANT SELECT ON public.contractor_donor_matches_stored TO anon, authenticated;
DROP FUNCTION public.normalise_company_number(text);
COMMIT;
