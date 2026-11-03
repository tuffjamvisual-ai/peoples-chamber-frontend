-- Undo of 2026-11-03j-organisation-company-names.sql: puts each page's name, other spellings and Companies House
-- fields back as in the backup taken before it ("Claude outputs/organisation-company-pages-backup-2026-11-03.csv"),
-- then refreshes organisation_index. Slugs never changed, so none are touched. Load the backup into a temporary table:
--   psql "$DATABASE_URL" -f scripts/migrations/2026-11-03j-organisation-company-names-UNDO.sql
-- (run from the repository root, where the backup path below resolves).
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
-- The concurrent refresh of organisation_index at the end takes about 30 s, over the usual 60 s with the rest.
SET LOCAL statement_timeout = '300s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE pages_backup (LIKE public.organisation_company_pages) ON COMMIT DROP;
\copy pages_backup FROM 'Claude outputs/organisation-company-pages-backup-2026-11-03.csv' WITH (FORMAT csv, HEADER true)
UPDATE public.organisation_company_pages p
   SET name = b.name, variants = b.variants, name_source = b.name_source, ch_name = b.ch_name, ch_status = b.ch_status, ch_checked_at = b.ch_checked_at
  FROM pages_backup b WHERE b.company_number = p.company_number;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.organisation_index;

COMMIT;
