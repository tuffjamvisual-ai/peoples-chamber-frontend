-- 2026-10-27c: the organisation summary behind /organisations/<slug> (report 68 design; owner's approval, 25 Oct 2026,
-- report 71). One row per page:
--   registry: every lobbying registry organisation (lobby_orgs) with at least one meeting with a minister or lobbying
--             quarter, except public bodies and universities (owner's decision 6). Meetings and lobbying link through
--             the registry's checked spellings (match_type 'alias'), as /lobbying/<slug> does.
--   company:  every Companies House number found in two or more of donations (not individuals), contracts and grants,
--             except public bodies by name (universities, councils, NHS bodies, schools, police and similar).
-- Donations, contracts and grants link by Companies House number only (normalise_company_number(), migration
-- 2026-10-25b). Nothing links by name alone. A registry organisation takes the datasets of its number once
-- lobby_orgs.companies_house_number is filled (empty today), and that number then gets no page of its own.
--
-- organisation_contracts: each counted contract (government_contracts_counted) whose Find a Tender notices give its
-- supplier exactly one Companies House number, the same rule as contractor_donor_matches.
-- Both are refreshed daily by refresh_organisation_index() (/api/refresh-organisation-index). Undo:
-- 2026-10-27c-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.organisation_index') IS NOT NULL THEN RAISE EXCEPTION 'organisation_index already exists'; END IF;
  IF to_regclass('public.organisation_contracts') IS NOT NULL THEN RAISE EXCEPTION 'organisation_contracts already exists'; END IF;
  IF to_regprocedure('public.normalise_company_number(text)') IS NULL THEN RAISE EXCEPTION 'normalise_company_number is missing: run 2026-10-25b first'; END IF;
END $$;

-- The donor page slug rule (lib/donor-slug.ts donorNameToSlug), so an address can be worked out from the name.
CREATE FUNCTION public.organisation_slug(name text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public, pg_temp AS $fn$
  SELECT left(regexp_replace(regexp_replace(
           replace(replace(replace(replace(lower(coalesce(name, '')), '&', ' and '), '''', ''), '’', ''), '‘', ''),
           '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'), 100)
$fn$;
COMMENT ON FUNCTION public.organisation_slug(text) IS 'lib/donor-slug.ts donorNameToSlug in SQL (migration 2026-10-27c)';

CREATE MATERIALIZED VIEW public.organisation_contracts AS
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
)
SELECT o.company_number, g.id, g.ocid, g.supplier, g.dept_slug, g.title, g.value, g.awarded_date, g.is_framework, g.superseded
FROM public.government_contracts_counted g
JOIN one_number o ON o.ocid = g.ocid AND o.norm = g.norm;
CREATE UNIQUE INDEX organisation_contracts_id_idx ON public.organisation_contracts (id);
CREATE INDEX organisation_contracts_number_idx ON public.organisation_contracts (company_number, awarded_date DESC);

CREATE MATERIALIZED VIEW public.organisation_index AS
WITH don AS (
  SELECT public.normalise_company_number(company_registration_number) AS company_number, company_registration_number AS raw,
         btrim(donor_name) AS name, amount, donation_action, coalesce(accepted_date::text, received_date) AS on_date
  FROM public.political_donations
  WHERE donor_type IS DISTINCT FROM 'Individual' AND company_registration_number IS NOT NULL
), d AS (
  SELECT company_number,
         count(*) AS donations,
         count(*) FILTER (WHERE donation_action IS NULL) AS donations_accepted,
         COALESCE(sum(amount) FILTER (WHERE donation_action IS NULL), 0) AS donated_accepted,
         count(*) FILTER (WHERE donation_action IS NOT NULL) AS donations_not_accepted,
         max(on_date) AS last_donation,
         array_agg(DISTINCT raw) AS donation_number_raws
  FROM don WHERE company_number IS NOT NULL GROUP BY 1
), c AS (
  SELECT company_number,
         count(*) FILTER (WHERE NOT is_framework AND NOT superseded) AS contracts,
         COALESCE(sum(value) FILTER (WHERE NOT is_framework AND NOT superseded), 0) AS contract_value,
         count(*) FILTER (WHERE value IS NULL AND NOT is_framework AND NOT superseded) AS contracts_unpublished,
         count(*) FILTER (WHERE is_framework AND NOT superseded) AS framework_places,
         COALESCE(sum(value) FILTER (WHERE is_framework AND NOT superseded), 0) AS framework_max_value,
         max(awarded_date) FILTER (WHERE NOT superseded) AS last_contract
  FROM public.organisation_contracts GROUP BY 1
), gr AS (
  SELECT public.normalise_company_number(recipient_company_number) AS company_number, recipient_company_number AS raw,
         btrim(recipient_name) AS name, amount, award_date
  FROM public.government_grants
  WHERE recipient_company_number IS NOT NULL
), g AS (
  SELECT company_number, count(*) AS grants, COALESCE(sum(amount), 0) AS grant_value, max(award_date) AS last_grant,
         array_agg(DISTINCT raw) AS grant_number_raws
  FROM gr WHERE company_number IS NOT NULL GROUP BY 1
), spellings AS (
  SELECT company_number, name, count(*) AS n FROM (
    SELECT company_number, name FROM don WHERE company_number IS NOT NULL
    UNION ALL SELECT company_number, btrim(supplier) FROM public.organisation_contracts
    UNION ALL SELECT company_number, name FROM gr WHERE company_number IS NOT NULL
  ) x WHERE name IS NOT NULL AND name <> '' GROUP BY 1, 2
), ranked AS (
  SELECT company_number, name, row_number() OVER (PARTITION BY company_number ORDER BY n DESC, length(name), name) AS rn
  FROM spellings
), names AS (
  SELECT company_number, min(name) FILTER (WHERE rn = 1) AS display_name,
         (array_agg(name ORDER BY rn) FILTER (WHERE rn > 1))[1:12] AS variants
  FROM ranked GROUP BY 1
), registry AS (
  SELECT o.id, o.slug, o.name, o.org_type, public.normalise_company_number(o.companies_house_number) AS company_number
  FROM public.lobby_orgs o
  WHERE o.org_type NOT IN ('public_body', 'academic')
    AND (EXISTS (SELECT 1 FROM public.lobby_meeting_mentions m WHERE m.org_id = o.id AND m.match_type = 'alias')
      OR EXISTS (SELECT 1 FROM public.orcl_client_returns r WHERE r.client_org_id = o.id AND r.match_type = 'alias'))
), m AS (
  SELECT org_id, count(DISTINCT meeting_key) AS meetings, max(meeting_date) FILTER (WHERE date_flag IS NULL) AS last_meeting
  FROM public.lobby_meeting_mentions WHERE match_type = 'alias' AND org_id IS NOT NULL GROUP BY 1
), l AS (
  SELECT client_org_id AS org_id, count(DISTINCT quarter_start) AS lobbying_quarters, count(DISTINCT firm_norm) AS lobbying_firms,
         max(quarter_start) AS last_lobbying_quarter
  FROM public.orcl_client_returns WHERE match_type = 'alias' AND client_org_id IS NOT NULL GROUP BY 1
), aliases AS (
  SELECT a.org_id, (array_agg(DISTINCT btrim(a.alias_example)) FILTER (WHERE btrim(a.alias_example) <> btrim(o.name)))[1:12] AS variants
  FROM public.lobby_org_aliases a JOIN public.lobby_orgs o ON o.id = a.org_id
  WHERE a.alias_example IS NOT NULL GROUP BY 1
), numbers AS (
  SELECT company_number,
         (d.company_number IS NOT NULL)::int + (c.company_number IS NOT NULL)::int + (g.company_number IS NOT NULL)::int AS number_datasets
  FROM d FULL JOIN c USING (company_number) FULL JOIN g USING (company_number)
), companies AS (
  SELECT n.company_number, nm.display_name, nm.variants, public.organisation_slug(nm.display_name) AS base_slug
  FROM numbers n JOIN names nm USING (company_number)
  WHERE n.number_datasets >= 2
    AND n.company_number NOT IN (SELECT company_number FROM registry WHERE company_number IS NOT NULL)
    AND nm.display_name !~* '\m(university|universities|council|nhs|police|constabulary)\M|\m(primary|secondary|high|grammar|infant|junior|special) schools?\M|university college|king''?s college|imperial college|college of policing|academy trust|academies trust|multi academy|fire and rescue|combined authority|health board|integrated care board|department for|ministry of|secretary of state|\mborough of\M'
), company_slugs AS (
  SELECT c.*,
         CASE WHEN c.base_slug = '' OR c.base_slug IN (SELECT slug FROM registry) OR count(*) OVER (PARTITION BY c.base_slug) > 1
              THEN concat_ws('-', nullif(c.base_slug, ''), lower(c.company_number))
              ELSE c.base_slug END AS slug
  FROM companies c
), pages AS (
  SELECT r.slug, 'registry'::text AS kind, r.id AS lobby_org_id, r.name, r.org_type, r.company_number, al.variants AS name_variants
  FROM registry r LEFT JOIN aliases al ON al.org_id = r.id
  UNION ALL
  SELECT cs.slug, 'company', NULL::bigint, cs.display_name, NULL::text, cs.company_number, cs.variants
  FROM company_slugs cs
)
SELECT p.slug, p.kind, p.lobby_org_id, p.name, p.org_type, p.company_number, p.name_variants,
       COALESCE(d.donations, 0) AS donations, COALESCE(d.donations_accepted, 0) AS donations_accepted,
       COALESCE(d.donated_accepted, 0) AS donated_accepted, COALESCE(d.donations_not_accepted, 0) AS donations_not_accepted,
       d.last_donation, d.donation_number_raws,
       COALESCE(c.contracts, 0) AS contracts, COALESCE(c.contract_value, 0) AS contract_value,
       COALESCE(c.contracts_unpublished, 0) AS contracts_unpublished, COALESCE(c.framework_places, 0) AS framework_places,
       COALESCE(c.framework_max_value, 0) AS framework_max_value, c.last_contract,
       COALESCE(g.grants, 0) AS grants, COALESCE(g.grant_value, 0) AS grant_value, g.last_grant, g.grant_number_raws,
       COALESCE(m.meetings, 0) AS meetings, m.last_meeting,
       COALESCE(l.lobbying_quarters, 0) AS lobbying_quarters, COALESCE(l.lobbying_firms, 0) AS lobbying_firms, l.last_lobbying_quarter,
       ((d.company_number IS NOT NULL)::int + (c.company_number IS NOT NULL)::int + (g.company_number IS NOT NULL)::int
        + (m.org_id IS NOT NULL)::int + (l.org_id IS NOT NULL)::int) AS datasets,
       now() AS refreshed_at
FROM pages p
LEFT JOIN d ON d.company_number = p.company_number
LEFT JOIN c ON c.company_number = p.company_number
LEFT JOIN g ON g.company_number = p.company_number
LEFT JOIN m ON m.org_id = p.lobby_org_id
LEFT JOIN l ON l.org_id = p.lobby_org_id;
CREATE UNIQUE INDEX organisation_index_slug_idx ON public.organisation_index (slug);
CREATE INDEX organisation_index_number_idx ON public.organisation_index (company_number);
CREATE INDEX organisation_index_lobby_org_idx ON public.organisation_index (lobby_org_id);

-- Record lists on the pages read the source rows by the raw number strings stored above.
CREATE INDEX political_donations_company_number_idx ON public.political_donations (company_registration_number) WHERE company_registration_number IS NOT NULL;
CREATE INDEX government_grants_company_number_idx ON public.government_grants (recipient_company_number) WHERE recipient_company_number IS NOT NULL;

-- Read only for the site; nobody but the refresh writes.
REVOKE ALL ON public.organisation_index, public.organisation_contracts FROM anon, authenticated;
GRANT SELECT ON public.organisation_index, public.organisation_contracts TO anon, authenticated;
COMMENT ON MATERIALIZED VIEW public.organisation_index IS 'One row per /organisations/<slug> page (migration 2026-10-27c); refreshed daily by refresh_organisation_index()';
COMMENT ON MATERIALIZED VIEW public.organisation_contracts IS 'Counted contracts with one Companies House number for their supplier (migration 2026-10-27c); refreshed daily by refresh_organisation_index()';

CREATE FUNCTION public.refresh_organisation_index() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET statement_timeout = '120s' AS $fn$
DECLARE n bigint;
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.organisation_contracts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.organisation_index;
  SELECT count(*) INTO n FROM public.organisation_index;
  RETURN n;
END $fn$;
REVOKE ALL ON FUNCTION public.refresh_organisation_index() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_organisation_index() TO service_role;

-- Checks run afterwards as a separate read only query (no checks inside this transaction).
COMMIT;
