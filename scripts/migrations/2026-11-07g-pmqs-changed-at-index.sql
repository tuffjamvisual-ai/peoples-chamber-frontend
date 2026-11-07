-- Applied on the owner's yes, 7 Nov 2026 (U2). A partial index on pmqs_archive_exchanges (changed_at) for the rows that have
-- one, so the sitemap's read of corrected rows looks up the few rows changed instead of walking all 156,864 (it passed the 8 s
-- statement timeout on the 60966e0b build). Built CONCURRENTLY, so reads and writes carry on: run outside a transaction block,
-- on a session connection (port 5432). No data changes. Undo: 2026-11-07g-pmqs-changed-at-index-UNDO.sql.
SET statement_timeout = '120s';
SET lock_timeout = '5s';
CREATE INDEX CONCURRENTLY IF NOT EXISTS pmqs_archive_exchanges_changed_at_idx ON public.pmqs_archive_exchanges (changed_at) WHERE changed_at IS NOT NULL;
RESET statement_timeout;
RESET lock_timeout;
