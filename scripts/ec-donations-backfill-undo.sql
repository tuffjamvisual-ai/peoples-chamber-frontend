-- UNDO for the Electoral Commission donations backfill (scripts/ec-donations-backfill.ts, 1 Nov 2026): deletes exactly
-- the imported rows, from the saved list of imported references (import-refs-fetched.txt, kept off the repo), and only
-- rows above the highest id before the import, so no row that existed before can be touched. One transaction.
-- Guard (RAISE): every listed reference is deleted, and nothing else.
-- Usage: psql "$DATABASE_URL" -v max_id=<highest id before> \
--        -f scripts/ec-donations-backfill-undo.sql < '<import-refs-fetched.txt>'
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE bf_undo_refs (ec_ref text) ON COMMIT DROP;
\copy bf_undo_refs FROM pstdin
SELECT set_config('bf.undo_max_id', :'max_id', true);
DO $$
DECLARE deleted integer; listed integer;
BEGIN
  SELECT count(*) INTO listed FROM bf_undo_refs;
  DELETE FROM public.political_donations p USING bf_undo_refs r
   WHERE p.ec_ref = r.ec_ref AND p.id > current_setting('bf.undo_max_id')::bigint;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RAISE NOTICE 'UNDO: deleted % of % listed', deleted, listed;
  IF deleted <> listed THEN RAISE EXCEPTION 'expected to delete % rows, deleted %', listed, deleted; END IF;
END $$;
COMMIT;
