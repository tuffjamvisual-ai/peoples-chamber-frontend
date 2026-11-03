-- 2026-11-03j: Companies House names for the organisation pages created by 2026-11-03i (owner's option B brief,
-- 3 Nov 2026). companies_house now holds the profile of 2,133 of the 2,144 companies (2,130 fetched on 3 Nov through
-- scripts/fetch-companies-house-profiles.js, 3 held before; 11 not found). For each page with a record: name becomes
-- the registered name, ch_name and ch_status are filled, name_source becomes 'companies_house', and the spelling from
-- our records it replaces goes first in the other spellings ("Also recorded as"). The 11 with no record keep the
-- spelling from our records and are marked checked. No slug changes, and no page outside organisation_company_pages
-- changes (guarded). organisation_index is refreshed concurrently, so pages keep reading while it rebuilds.
-- Backup: "Claude outputs/organisation-company-pages-backup-2026-11-03.csv". Undo: ...-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-03j-organisation-company-names.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
-- The concurrent refresh of organisation_index at the end takes about 30 s, over the usual 60 s with the rest.
SET LOCAL statement_timeout = '300s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE pages_before ON COMMIT DROP AS SELECT company_number, slug, name FROM public.organisation_company_pages;
CREATE TEMP TABLE index_before ON COMMIT DROP AS SELECT slug, kind, company_number, name FROM public.organisation_index;

UPDATE public.organisation_company_pages p
   SET ch_name = c.company_name,
       ch_status = c.status,
       ch_checked_at = now(),
       name = c.company_name,
       name_source = 'companies_house',
       variants = (CASE WHEN upper(p.name) = upper(c.company_name) THEN p.variants
                        ELSE array_prepend(p.name, coalesce(p.variants, '{}'::text[])) END)[1:12]
  FROM public.companies_house c
 WHERE normalise_company_number(c.company_number) = p.company_number
   AND nullif(btrim(c.company_name), '') IS NOT NULL
   AND p.name_source = 'records';

UPDATE public.organisation_company_pages SET ch_checked_at = now()
 WHERE name_source = 'records' AND company_number = ANY(ARRAY['00035965', '00209907', '00303675', '00390210', '00521013', '00539588', '00591315', '02774740', '85949299', '91421840', 'IN000857']::text[]);

REFRESH MATERIALIZED VIEW CONCURRENTLY public.organisation_index;

DO $$
DECLARE moved int; outside int; missing int; named int;
BEGIN
  SELECT count(*) INTO moved FROM pages_before b JOIN public.organisation_company_pages p USING (company_number) WHERE p.slug <> b.slug;
  SELECT count(*) INTO outside FROM index_before b
    WHERE b.slug NOT IN (SELECT slug FROM public.organisation_company_pages)
      AND NOT EXISTS (SELECT 1 FROM public.organisation_index o WHERE o.slug = b.slug AND (o.kind, o.company_number, o.name) IS NOT DISTINCT FROM (b.kind, b.company_number, b.name));
  SELECT count(*) INTO missing FROM public.organisation_company_pages p WHERE NOT EXISTS (SELECT 1 FROM public.organisation_index o WHERE o.slug = p.slug);
  SELECT count(*) INTO named FROM public.organisation_index o JOIN public.organisation_company_pages p USING (slug) WHERE o.name IS DISTINCT FROM p.name;
  IF moved + outside + missing + named > 0 THEN
    RAISE EXCEPTION 'refused: % slugs moved, % other pages changed, % pages missing, % names not shown', moved, outside, missing, named;
  END IF;
END $$;

COMMIT;
