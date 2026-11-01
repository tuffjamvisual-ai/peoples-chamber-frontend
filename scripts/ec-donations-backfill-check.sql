-- Guard (changes nothing; ends in ROLLBACK) for the Electoral Commission donations backfill (scripts/ec-donations-backfill.ts, 1 Nov 2026).
-- Compares political_donations with the "before" backup taken just ahead of the import:
--   the row count is the count before plus the rows inserted;
--   no existing row changed: the ids up to the highest id before, and the hash of each of those rows, are unchanged;
--   no ec_ref is on two rows; every row above the old highest id is one of the imported references.
-- Usage (values from the backup, never printed secrets):
--   psql "$DATABASE_URL" -v before_count=... -v max_id=... -v md5_ids=... -v md5_rows=... -v inserted=... \
--        -f scripts/ec-donations-backfill-check.sql < '<import-refs-fetched.txt>'
\set ON_ERROR_STOP on
-- Not READ ONLY only because the reference list goes into a temporary table; the transaction always ends in ROLLBACK.
BEGIN;
SET LOCAL statement_timeout = '60s';
CREATE TEMP TABLE bf_refs (ec_ref text) ON COMMIT DROP;
\copy bf_refs FROM pstdin
SELECT set_config('bf.before_count', :'before_count', true), set_config('bf.max_id', :'max_id', true),
       set_config('bf.md5_ids', :'md5_ids', true), set_config('bf.md5_rows', :'md5_rows', true),
       set_config('bf.inserted', :'inserted', true);
DO $$
DECLARE
  n bigint; ids text; row_hashes text; dup bigint; new_rows bigint; new_unlisted bigint;
  max_id bigint := current_setting('bf.max_id')::bigint;
BEGIN
  SELECT count(*) INTO n FROM public.political_donations;
  SELECT md5(string_agg(id::text, ',' ORDER BY id)), md5(string_agg(md5(p::text), ',' ORDER BY id))
    INTO ids, row_hashes FROM public.political_donations p WHERE id <= max_id;
  SELECT count(*) - count(DISTINCT ec_ref) INTO dup FROM public.political_donations;
  SELECT count(*), count(*) FILTER (WHERE ec_ref NOT IN (SELECT ec_ref FROM bf_refs)) INTO new_rows, new_unlisted
    FROM public.political_donations WHERE id > max_id;
  RAISE NOTICE 'CHECK: rows % (before % + inserted %), rows above the old highest id % (% not on the list), existing ids unchanged %, existing rows unchanged %, duplicate ec_ref %',
    n, current_setting('bf.before_count'), current_setting('bf.inserted'), new_rows, new_unlisted,
    ids = current_setting('bf.md5_ids'), row_hashes = current_setting('bf.md5_rows'), dup;
  IF n <> current_setting('bf.before_count')::bigint + current_setting('bf.inserted')::bigint THEN RAISE EXCEPTION 'row count is not before + inserted'; END IF;
  IF ids <> current_setting('bf.md5_ids') THEN RAISE EXCEPTION 'the existing ids changed'; END IF;
  IF row_hashes <> current_setting('bf.md5_rows') THEN RAISE EXCEPTION 'an existing row changed'; END IF;
  IF dup <> 0 THEN RAISE EXCEPTION '% duplicate ec_ref values', dup; END IF;
  IF new_unlisted <> 0 THEN RAISE EXCEPTION '% new rows are not on the import list', new_unlisted; END IF;
END $$;
ROLLBACK;
