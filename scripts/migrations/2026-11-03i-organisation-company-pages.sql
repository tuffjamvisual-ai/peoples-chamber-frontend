-- 2026-11-03i: organisation pages for more suppliers (owner's yes, option A, 3 Nov 2026). A company with a Companies
-- House number and no page gets one when it has at least 5 million pounds awarded (contract_awards: not frameworks,
-- not held back) or a political donation under that number; public bodies are left out by the existing name rule,
-- and lobbying registry organisations keep their registry page.
-- organisation_company_pages stores each such page once, when it is first created: its slug (never changed afterwards),
-- its name and other spellings. The name is the most common spelling in our own records (donations, contract notices,
-- grants), ranked exactly as existing pages' names are; name_source = 'records' marks the pages with no Companies House
-- name yet, so a later job can fill ch_name and ch_status and swap in the registered name without touching the slug.
-- A new slug is the name's slug, with the company number added when it is empty or would clash with any existing
-- page, registry slug or other new page.
-- organisation_index adds these pages; existing pages keep their slug, kind, company number and name (guarded). A
-- company stored here always keeps its stored slug, and a slug another company would compute that matches a stored one
-- gets the company number added, so slugs never clash or move.
-- Backup: "Claude outputs/organisation-index-backup-2026-11-03-before-new-pages.csv". Undo: 2026-11-03i-...-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03i-organisation-company-pages.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
-- Rebuilding organisation_index over every dataset takes longer than the usual 60 s.
SET LOCAL statement_timeout = '300s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.organisation_company_pages') IS NOT NULL THEN RAISE EXCEPTION 'organisation_company_pages already exists'; END IF;
END $$;

CREATE TEMP TABLE org_before ON COMMIT DROP AS SELECT slug, kind, company_number, name FROM public.organisation_index;

CREATE TABLE public.organisation_company_pages (
  company_number text PRIMARY KEY,
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,
  variants       text[],
  name_source    text NOT NULL DEFAULT 'records' CHECK (name_source IN ('records', 'companies_house')),
  reason         text NOT NULL,              -- why it qualified on creation: 'awarded', 'donations' or 'awarded and donations'
  ch_name        text,                       -- the registered name, once a later job has fetched it
  ch_status      text,
  ch_checked_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organisation_company_pages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organisation_company_pages FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organisation_company_pages TO service_role;

WITH registry_numbers AS (
  SELECT normalise_company_number(companies_house_number) AS cn FROM public.lobby_orgs WHERE companies_house_number IS NOT NULL
),
awarded AS (
  SELECT company_number, sum(value) FILTER (WHERE NOT is_framework AND NOT held_back) AS v
  FROM public.contract_awards WHERE company_number IS NOT NULL GROUP BY company_number
),
donors AS (
  SELECT DISTINCT normalise_company_number(company_registration_number) AS cn FROM public.political_donations
  WHERE company_registration_number IS NOT NULL AND donor_type IS DISTINCT FROM 'Individual'
),
cand AS (
  SELECT a.company_number,
         CASE WHEN coalesce(a.v, 0) >= 5000000 AND a.company_number IN (SELECT cn FROM donors WHERE cn IS NOT NULL) THEN 'awarded and donations'
              WHEN coalesce(a.v, 0) >= 5000000 THEN 'awarded' ELSE 'donations' END AS reason
  FROM awarded a
  WHERE a.company_number NOT IN (SELECT company_number FROM public.organisation_index WHERE company_number IS NOT NULL)
    AND a.company_number NOT IN (SELECT cn FROM registry_numbers WHERE cn IS NOT NULL)
    AND (coalesce(a.v, 0) >= 5000000 OR coalesce(a.company_number IN (SELECT cn FROM donors WHERE cn IS NOT NULL), false))
),
spellings AS (
  SELECT company_number, name, count(*) AS n FROM (
    SELECT normalise_company_number(company_registration_number) AS company_number, btrim(donor_name) AS name
      FROM public.political_donations WHERE company_registration_number IS NOT NULL AND donor_type IS DISTINCT FROM 'Individual'
    UNION ALL
    SELECT company_number, btrim(supplier) FROM public.contract_awards WHERE company_number IN (SELECT company_number FROM cand)
    UNION ALL
    SELECT normalise_company_number(recipient_company_number), btrim(recipient_name) FROM public.government_grants WHERE recipient_company_number IS NOT NULL
  ) x
  WHERE company_number IN (SELECT company_number FROM cand) AND name IS NOT NULL AND name <> ''
  GROUP BY company_number, name
),
ranked AS (
  SELECT company_number, name, row_number() OVER (PARTITION BY company_number ORDER BY n DESC, length(name), name) AS rn FROM spellings
),
named AS (
  SELECT c.company_number, c.reason,
         min(r.name) FILTER (WHERE r.rn = 1) AS name,
         (array_agg(r.name ORDER BY r.rn) FILTER (WHERE r.rn > 1))[1:12] AS variants
  FROM cand c JOIN ranked r USING (company_number)
  GROUP BY c.company_number, c.reason
),
kept AS (
  SELECT named.*, public.organisation_slug(name) AS base_slug FROM named
  WHERE name !~* '\m(university|universities|council|nhs|police|constabulary)\M|\m(primary|secondary|high|grammar|infant|junior|special) schools?\M|university college|king''?s college|imperial college|college of policing|academy trust|academies trust|multi academy|fire and rescue|combined authority|health board|integrated care board|department for|ministry of|secretary of state|\mborough of\M'
)
INSERT INTO public.organisation_company_pages (company_number, slug, name, variants, reason)
SELECT company_number,
       CASE WHEN base_slug = '' OR base_slug IN (SELECT slug FROM public.organisation_index)
              OR base_slug IN (SELECT slug FROM public.lobby_orgs WHERE slug IS NOT NULL)
              OR count(*) OVER (PARTITION BY base_slug) > 1
            THEN concat_ws('-', nullif(base_slug, ''), lower(company_number)) ELSE base_slug END,
       name, variants, reason
FROM kept;

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
          WHERE n.number_datasets >= 2 AND NOT (n.company_number IN ( SELECT organisation_company_pages.company_number FROM organisation_company_pages)) AND NOT (n.company_number IN ( SELECT registry.company_number
                   FROM registry
                  WHERE registry.company_number IS NOT NULL)) AND nm.display_name !~* '\m(university|universities|council|nhs|police|constabulary)\M|\m(primary|secondary|high|grammar|infant|junior|special) schools?\M|university college|king''?s college|imperial college|college of policing|academy trust|academies trust|multi academy|fire and rescue|combined authority|health board|integrated care board|department for|ministry of|secretary of state|\mborough of\M'::text
        ), company_slugs AS (
         SELECT c_1.company_number,
            c_1.display_name,
            c_1.variants,
            c_1.base_slug,
                CASE
                    WHEN c_1.base_slug = ''::text OR (c_1.base_slug IN ( SELECT registry.slug
                       FROM registry)) OR (c_1.base_slug IN ( SELECT organisation_company_pages.slug
                       FROM organisation_company_pages)) OR count(*) OVER (PARTITION BY c_1.base_slug) > 1 THEN concat_ws('-'::text, NULLIF(c_1.base_slug, ''::text), lower(c_1.company_number))
                    ELSE c_1.base_slug
                END AS slug
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
REVOKE ALL ON public.organisation_index FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organisation_index TO service_role;

-- Guards: no existing page changes; every stored page is in the index once, under its stored slug.
DO $$
DECLARE gone int; changed int; stored int; shown int;
BEGIN
  SELECT count(*) INTO gone FROM org_before b WHERE NOT EXISTS (SELECT 1 FROM public.organisation_index o WHERE o.slug = b.slug);
  SELECT count(*) INTO changed FROM public.organisation_index o JOIN org_before b USING (slug)
   WHERE (o.kind, o.company_number, o.name) IS DISTINCT FROM (b.kind, b.company_number, b.name);
  SELECT count(*) INTO stored FROM public.organisation_company_pages;
  SELECT count(*) INTO shown FROM public.organisation_index o JOIN public.organisation_company_pages p ON p.slug = o.slug AND p.company_number = o.company_number;
  IF gone + changed > 0 THEN RAISE EXCEPTION 'existing organisation pages would change: % removed, % renamed or renumbered', gone, changed; END IF;
  IF shown <> stored THEN RAISE EXCEPTION 'stored pages % but % in the index', stored, shown; END IF;
  IF (SELECT count(*) FROM public.organisation_index) <> (SELECT count(*) FROM org_before) + stored THEN
    RAISE EXCEPTION 'page count is not the old count plus the new pages';
  END IF;
END $$;

COMMIT;
