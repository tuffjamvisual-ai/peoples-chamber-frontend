-- Undo of 2026-11-03k-bio-4857-rewrite.sql: puts member 4857's biography text, sources, review date and review flag
-- back from the backup taken before it. Run from the repository root (the backup path below is relative):
--   psql "$DATABASE_URL" -f scripts/migrations/2026-11-03k-bio-4857-rewrite-UNDO.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE bio_backup (LIKE public.mp_biography) ON COMMIT DROP;
\copy bio_backup FROM 'Claude outputs/mp-biography-4857-backup-2026-11-03.csv' WITH (FORMAT csv, HEADER true)
DO $do$
DECLARE n int;
BEGIN
  UPDATE public.mp_biography p
     SET political_bio = b.political_bio, bio_sources = b.bio_sources, bio_last_reviewed = b.bio_last_reviewed,
         bio_review_reason = b.bio_review_reason, bio_review_flagged_at = b.bio_review_flagged_at
    FROM bio_backup b WHERE b.member_id = p.member_id AND p.member_id = 4857;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'refused: % rows, expected 1', n; END IF;
END $do$;

COMMIT;
