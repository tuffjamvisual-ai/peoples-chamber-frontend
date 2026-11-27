-- Stable organisation addresses (Cowork ENTRY 771 fix 3, owner 'fix all 4'; T1's ENTRY 769 (b) finding): a company page's slug was made
-- from its most frequent spelling across donations, grants and contracts, so new records in another spelling changed its name AND its
-- address (26 Nov: 3 companies). organisation_slugs keeps each company's first slug for good; organisation_index reads it from there
-- (company pages only; registry and hand set company pages already have fixed slugs); a company seen for the first time keeps the slug it
-- gets (refresh_organisation_index adds it); an old slug stays as a row with current = false, so the site can send it on permanently.
-- The 3 companies flipped on 26 Nov keep their 25 Nov (live) slugs; their 26 Nov forms are kept as old slugs.
-- organisation_index is a materialized view, so it is dropped and made again with the same definition but for the slug, the same three
-- indexes, owner and grants (service_role only, as now). Nothing depends on it (checked 27 Nov).
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '240s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.organisation_slugs') IS NOT NULL THEN RAISE EXCEPTION 'organisation_slugs already exists'; END IF;
  IF md5(pg_get_viewdef('public.organisation_index'::regclass, true)) <> 'c4030cf5a7639cb6d881fefad5383f3a' THEN RAISE EXCEPTION 'organisation_index is not the definition this was made from'; END IF;
END $$;
CREATE TABLE public.organisation_slugs (
  slug           text PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  company_number text NOT NULL,
  current        boolean NOT NULL,
  first_seen     date NOT NULL DEFAULT current_date,
  replaced_at    timestamptz
);
CREATE UNIQUE INDEX organisation_slugs_one_current ON public.organisation_slugs (company_number) WHERE current;
COMMENT ON TABLE public.organisation_slugs IS 'Each company page keeps its first slug for good; old slugs (current = false) redirect to the page (migration 2026-11-27a)';
ALTER TABLE public.organisation_slugs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organisation_slugs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organisation_slugs TO service_role;
-- Seed: every company page's slug as it is now.
INSERT INTO public.organisation_slugs (slug, company_number, current)
  SELECT slug, company_number, true FROM public.organisation_index WHERE company_number IS NOT NULL;
-- The 3 companies flipped on 26 Nov keep their 25 Nov (live) slug; where this database has the 26 Nov form, that becomes an old slug.
WITH keep(company_number, slug) AS (VALUES ('02366852','edf-energy'), ('12598549','evolve-commercial-ltd'), ('00119006','novartis-pharmaceuticals-uk-ltd')),
     old AS (UPDATE public.organisation_slugs s SET current = false, replaced_at = now() FROM keep k
              WHERE s.company_number = k.company_number AND s.current AND s.slug <> k.slug RETURNING s.company_number)
INSERT INTO public.organisation_slugs (slug, company_number, current)
  SELECT k.slug, k.company_number, true FROM keep k JOIN old o USING (company_number);
DROP MATERIALIZED VIEW public.organisation_index;
CREATE MATERIALIZED VIEW public.organisation_index AS
 WITH legacy_contracts AS (
         WITH supplier_numbers AS (
                 SELECT cn.ocid,
                    upper(regexp_replace(btrim(s.value ->> 'name'::text), '\s+'::text, ' '::text, 'g'::text)) AS norm,
                    normalise_company_number(substr(s.value ->> 'id'::text, 8)) AS company_number
                   FROM contract_notices cn,
                    LATERAL jsonb_array_elements(cn.suppliers) s(value)
                  WHERE (s.value ->> 'id'::text) ~~ 'GB-COH-%'::text
                ), one_number AS (
                 SELECT supplier_numbers.ocid,
                    supplier_numbers.norm,
                    min(supplier_numbers.company_number) AS company_number
                   FROM supplier_numbers
                  WHERE supplier_numbers.company_number IS NOT NULL
                  GROUP BY supplier_numbers.ocid, supplier_numbers.norm
                 HAVING count(DISTINCT supplier_numbers.company_number) = 1
                )
         SELECT o.company_number,
            g_1.id,
            g_1.ocid,
            g_1.supplier,
            g_1.dept_slug,
            g_1.title,
            g_1.value,
            g_1.awarded_date,
            g_1.is_framework,
            g_1.superseded
           FROM government_contracts_counted g_1
             JOIN one_number o ON o.ocid = g_1.ocid AND o.norm = g_1.norm
        ), don AS (
         SELECT normalise_company_number(political_donations.company_registration_number) AS company_number,
            political_donations.company_registration_number AS raw,
            btrim(political_donations.donor_name) AS name,
            political_donations.amount,
            political_donations.donation_action,
            COALESCE(political_donations.accepted_date::text, political_donations.received_date) AS on_date
           FROM political_donations
          WHERE political_donations.donor_type IS DISTINCT FROM 'Individual'::text AND political_donations.company_registration_number IS NOT NULL
        ), d AS (
         SELECT don.company_number,
            count(*) AS donations,
            count(*) FILTER (WHERE don.donation_action IS NULL) AS donations_accepted,
            COALESCE(sum(don.amount) FILTER (WHERE don.donation_action IS NULL), 0::numeric) AS donated_accepted,
            count(*) FILTER (WHERE don.donation_action IS NOT NULL) AS donations_not_accepted,
            max(don.on_date) AS last_donation,
            array_agg(DISTINCT don.raw) AS donation_number_raws
           FROM don
          WHERE don.company_number IS NOT NULL
          GROUP BY don.company_number
        ), c AS (
         SELECT organisation_contracts.company_number,
            count(*) FILTER (WHERE NOT organisation_contracts.is_framework AND NOT organisation_contracts.superseded) AS contracts,
            COALESCE(sum(organisation_contracts.value) FILTER (WHERE NOT organisation_contracts.is_framework AND NOT organisation_contracts.superseded), 0::numeric) AS contract_value,
            count(*) FILTER (WHERE organisation_contracts.value IS NULL AND NOT organisation_contracts.is_framework AND NOT organisation_contracts.superseded) AS contracts_unpublished,
            count(*) FILTER (WHERE organisation_contracts.is_framework AND NOT organisation_contracts.superseded) AS framework_places,
            COALESCE(sum(organisation_contracts.value) FILTER (WHERE organisation_contracts.is_framework AND NOT organisation_contracts.superseded), 0::numeric) AS framework_max_value,
            max(organisation_contracts.awarded_date) FILTER (WHERE NOT organisation_contracts.superseded) AS last_contract
           FROM organisation_contracts
          GROUP BY organisation_contracts.company_number
        ), gr AS (
         SELECT normalise_company_number(government_grants.recipient_company_number) AS company_number,
            government_grants.recipient_company_number AS raw,
            btrim(government_grants.recipient_name) AS name,
            government_grants.amount,
            government_grants.award_date
           FROM government_grants
          WHERE government_grants.recipient_company_number IS NOT NULL
        ), g AS (
         SELECT gr.company_number,
            count(*) AS grants,
            COALESCE(sum(gr.amount), 0::numeric) AS grant_value,
            max(gr.award_date) AS last_grant,
            array_agg(DISTINCT gr.raw) AS grant_number_raws
           FROM gr
          WHERE gr.company_number IS NOT NULL
          GROUP BY gr.company_number
        ), spellings AS (
         SELECT x.company_number,
            x.name,
            count(*) AS n
           FROM ( SELECT don.company_number,
                    don.name
                   FROM don
                  WHERE don.company_number IS NOT NULL
                UNION ALL
                 SELECT legacy_contracts.company_number,
                    btrim(legacy_contracts.supplier) AS btrim
                   FROM legacy_contracts
                UNION ALL
                 SELECT gr.company_number,
                    gr.name
                   FROM gr
                  WHERE gr.company_number IS NOT NULL) x
          WHERE x.name IS NOT NULL AND x.name <> ''::text
          GROUP BY x.company_number, x.name
        ), ranked AS (
         SELECT spellings.company_number,
            spellings.name,
            row_number() OVER (PARTITION BY spellings.company_number ORDER BY spellings.n DESC, (length(spellings.name)), spellings.name) AS rn
           FROM spellings
        ), names AS (
         SELECT ranked.company_number,
            min(ranked.name) FILTER (WHERE ranked.rn = 1) AS display_name,
            (array_agg(ranked.name ORDER BY ranked.rn) FILTER (WHERE ranked.rn > 1))[1:12] AS variants
           FROM ranked
          GROUP BY ranked.company_number
        ), registry AS (
         SELECT o.id,
            o.slug,
            o.name,
            o.org_type,
            normalise_company_number(o.companies_house_number) AS company_number
           FROM lobby_orgs o
          WHERE (o.org_type <> ALL (ARRAY['public_body'::text, 'academic'::text])) AND ((EXISTS ( SELECT 1
                   FROM lobby_meeting_mentions m_1
                  WHERE m_1.org_id = o.id AND m_1.match_type = 'alias'::text)) OR (EXISTS ( SELECT 1
                   FROM orcl_client_returns r
                  WHERE r.client_org_id = o.id AND r.match_type = 'alias'::text)))
        ), m AS (
         SELECT lobby_meeting_mentions.org_id,
            count(DISTINCT lobby_meeting_mentions.meeting_key) AS meetings,
            max(lobby_meeting_mentions.meeting_date) FILTER (WHERE lobby_meeting_mentions.date_flag IS NULL) AS last_meeting
           FROM lobby_meeting_mentions
          WHERE lobby_meeting_mentions.match_type = 'alias'::text AND lobby_meeting_mentions.org_id IS NOT NULL
          GROUP BY lobby_meeting_mentions.org_id
        ), l AS (
         SELECT orcl_client_returns.client_org_id AS org_id,
            count(DISTINCT orcl_client_returns.quarter_start) AS lobbying_quarters,
            count(DISTINCT orcl_client_returns.firm_norm) AS lobbying_firms,
            max(orcl_client_returns.quarter_start) AS last_lobbying_quarter
           FROM orcl_client_returns
          WHERE orcl_client_returns.match_type = 'alias'::text AND orcl_client_returns.client_org_id IS NOT NULL
          GROUP BY orcl_client_returns.client_org_id
        ), aliases AS (
         SELECT a.org_id,
            (array_agg(DISTINCT btrim(a.alias_example)) FILTER (WHERE btrim(a.alias_example) <> btrim(o.name)))[1:12] AS variants
           FROM lobby_org_aliases a
             JOIN lobby_orgs o ON o.id = a.org_id
          WHERE a.alias_example IS NOT NULL
          GROUP BY a.org_id
        ), numbers AS (
         SELECT company_number,
            (d_1.company_number IS NOT NULL)::integer + (c_1.company_number IS NOT NULL)::integer + (g_1.company_number IS NOT NULL)::integer AS number_datasets
           FROM d d_1
             FULL JOIN ( SELECT DISTINCT legacy_contracts.company_number
                   FROM legacy_contracts) c_1 USING (company_number)
             FULL JOIN g g_1 USING (company_number)
        ), companies AS (
         SELECT n.company_number,
            nm.display_name,
            nm.variants,
            organisation_slug(nm.display_name) AS base_slug
           FROM numbers n
             JOIN names nm USING (company_number)
          WHERE n.number_datasets >= 2 AND NOT (n.company_number IN ( SELECT organisation_company_pages.company_number
                   FROM organisation_company_pages)) AND NOT (n.company_number IN ( SELECT registry.company_number
                   FROM registry
                  WHERE registry.company_number IS NOT NULL)) AND nm.display_name !~* '\m(university|universities|council|nhs|police|constabulary)\M|\m(primary|secondary|high|grammar|infant|junior|special) schools?\M|university college|king''?s college|imperial college|college of policing|academy trust|academies trust|multi academy|fire and rescue|combined authority|health board|integrated care board|department for|ministry of|secretary of state|\mborough of\M'::text
        ), company_slugs AS (
         SELECT c_1.company_number,
            c_1.display_name,
            c_1.variants,
            c_1.base_slug,
                COALESCE(( SELECT os.slug
                       FROM organisation_slugs os
                      WHERE os.company_number = c_1.company_number AND os.current),
                CASE
                    WHEN c_1.base_slug = ''::text OR (c_1.base_slug IN ( SELECT registry.slug
                       FROM registry)) OR (c_1.base_slug IN ( SELECT organisation_company_pages.slug
                       FROM organisation_company_pages)) OR (c_1.base_slug IN ( SELECT os2.slug
                       FROM organisation_slugs os2
                      WHERE os2.company_number <> c_1.company_number)) OR count(*) OVER (PARTITION BY c_1.base_slug) > 1 THEN concat_ws('-'::text, NULLIF(c_1.base_slug, ''::text), lower(c_1.company_number))
                    ELSE c_1.base_slug
                END) AS slug
           FROM companies c_1
        ), pages AS (
         SELECT r.slug,
            'registry'::text AS kind,
            r.id AS lobby_org_id,
            r.name,
            r.org_type,
            r.company_number,
            al.variants AS name_variants
           FROM registry r
             LEFT JOIN aliases al ON al.org_id = r.id
        UNION ALL
         SELECT cs.slug,
            'company'::text AS text,
            NULL::bigint AS int8,
            cs.display_name,
            NULL::text AS text,
            cs.company_number,
            cs.variants
           FROM company_slugs cs
        UNION ALL
         SELECT cp.slug,
            'company'::text AS text,
            NULL::bigint AS int8,
            cp.name,
            NULL::text AS text,
            cp.company_number,
            cp.variants
           FROM organisation_company_pages cp
          WHERE NOT (cp.company_number IN ( SELECT registry.company_number
                   FROM registry
                  WHERE registry.company_number IS NOT NULL))
        )
 SELECT p.slug,
    p.kind,
    p.lobby_org_id,
    p.name,
    p.org_type,
    p.company_number,
    p.name_variants,
    COALESCE(d.donations, 0::bigint) AS donations,
    COALESCE(d.donations_accepted, 0::bigint) AS donations_accepted,
    COALESCE(d.donated_accepted, 0::numeric) AS donated_accepted,
    COALESCE(d.donations_not_accepted, 0::bigint) AS donations_not_accepted,
    d.last_donation,
    d.donation_number_raws,
    COALESCE(c.contracts, 0::bigint) AS contracts,
    COALESCE(c.contract_value, 0::numeric) AS contract_value,
    COALESCE(c.contracts_unpublished, 0::bigint) AS contracts_unpublished,
    COALESCE(c.framework_places, 0::bigint) AS framework_places,
    COALESCE(c.framework_max_value, 0::numeric) AS framework_max_value,
    c.last_contract,
    COALESCE(g.grants, 0::bigint) AS grants,
    COALESCE(g.grant_value, 0::numeric) AS grant_value,
    g.last_grant,
    g.grant_number_raws,
    COALESCE(m.meetings, 0::bigint) AS meetings,
    m.last_meeting,
    COALESCE(l.lobbying_quarters, 0::bigint) AS lobbying_quarters,
    COALESCE(l.lobbying_firms, 0::bigint) AS lobbying_firms,
    l.last_lobbying_quarter,
    (d.company_number IS NOT NULL)::integer + (c.company_number IS NOT NULL)::integer + (g.company_number IS NOT NULL)::integer + (m.org_id IS NOT NULL)::integer + (l.org_id IS NOT NULL)::integer AS datasets,
    now() AS refreshed_at
   FROM pages p
     LEFT JOIN d ON d.company_number = p.company_number
     LEFT JOIN c ON c.company_number = p.company_number
     LEFT JOIN g ON g.company_number = p.company_number
     LEFT JOIN m ON m.org_id = p.lobby_org_id
     LEFT JOIN l ON l.org_id = p.lobby_org_id;
CREATE UNIQUE INDEX organisation_index_slug_idx ON public.organisation_index USING btree (slug);
CREATE INDEX organisation_index_number_idx ON public.organisation_index USING btree (company_number);
CREATE INDEX organisation_index_lobby_org_idx ON public.organisation_index USING btree (lobby_org_id);
ALTER MATERIALIZED VIEW public.organisation_index OWNER TO postgres;
REVOKE ALL ON public.organisation_index FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organisation_index TO service_role;
CREATE OR REPLACE FUNCTION public.refresh_organisation_index()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '240s'
AS $function$
DECLARE n bigint;
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.contract_awards;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.organisation_contracts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.organisation_index;
  -- ENTRY 771 fix 3: a company page seen for the first time keeps the slug it got now, for good (organisation_slugs).
  INSERT INTO public.organisation_slugs (slug, company_number, current)
    SELECT oi.slug, oi.company_number, true FROM public.organisation_index oi
     WHERE oi.company_number IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.organisation_slugs s WHERE s.company_number = oi.company_number AND s.current)
    ON CONFLICT (slug) DO NOTHING;
  SELECT count(*) INTO n FROM public.organisation_index;
  RETURN n;
END $function$;
DO $$ DECLARE n int; m int; BEGIN
  SELECT count(*) INTO n FROM public.organisation_index;
  IF n = 0 THEN RAISE EXCEPTION 'organisation_index is empty'; END IF;
  SELECT count(*) INTO m FROM public.organisation_index oi JOIN public.organisation_slugs s ON s.company_number = oi.company_number AND s.current
    WHERE s.slug <> oi.slug AND oi.company_number IN (SELECT company_number FROM public.organisation_slugs GROUP BY 1);
  RAISE NOTICE 'rows %, company pages not on their kept slug % (registry or hand set pages keep their own)', n, m;
  IF EXISTS (SELECT 1 FROM (VALUES ('02366852','edf-energy'), ('12598549','evolve-commercial-ltd'), ('00119006','novartis-pharmaceuticals-uk-ltd')) k(c, s)
             WHERE NOT EXISTS (SELECT 1 FROM public.organisation_index oi WHERE oi.company_number = k.c AND oi.slug = k.s)) THEN RAISE EXCEPTION 'a flipped company is not on its 25 Nov slug'; END IF;
  IF has_table_privilege('anon','public.organisation_slugs','SELECT') OR has_table_privilege('anon','public.organisation_index','SELECT') THEN RAISE EXCEPTION 'anon must not read these'; END IF;
END $$;
COMMIT;
