-- UNDO of 2026-11-20a-cold-tier1.sql, part 2 (Cowork ENTRY 420): puts the values of hansard_contributions.value_html and
-- pmqs_archive_exchanges.parlparse_text back from the EDGE_SSD copy, after 2026-11-20a-cold-tier1-UNDO.sql has added the
-- two columns back empty. Not one transaction: the 263 MB value_html file is loaded into a temporary table (81 s in the
-- 20 Nov restore check, so that one \copy is allowed 300 s), then written in 15 batches of about 20,000 rows, each its
-- own statement under 60 s, so a stop part way keeps the batches done and the file can be run again (a batch only
-- fills rows still null).
-- pmqs_archive_exchanges has the trigger set_changed_at, which would stamp changed_at = now() on every row; it is
-- disabled for the fill and enabled again in the same transaction, so a failure leaves it enabled (the transaction holds
-- the table's lock for the fill, about 20 s for 157,652 rows of 57 MB). parlparse_text is NOT NULL again at the end, as
-- in 2026-11-05h.
-- Rows added to hansard_contributions after 20 Nov 2026 have no copy and stay null (the sync no longer stores HTML).
-- Expected checksums (archive-cold-data/2026-11-20/CHECKSUMS.tsv, computed the same way): value_html
-- cdfe9eeb6287eeb8c6c5d0c39c309fc9 over the 298,572 copied ids, parlparse_text 8ab402894365e8af89f4c31dd69d7226.
\set ON_ERROR_STOP on
SET statement_timeout = '60s';
SET lock_timeout = '5s';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.hansard_contributions'::regclass AND attname = 'value_html' AND NOT attisdropped) THEN RAISE EXCEPTION 'hansard_contributions.value_html missing: run 2026-11-20a-cold-tier1-UNDO.sql first'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.pmqs_archive_exchanges'::regclass AND attname = 'parlparse_text' AND NOT attisdropped) THEN RAISE EXCEPTION 'pmqs_archive_exchanges.parlparse_text missing: run 2026-11-20a-cold-tier1-UNDO.sql first'; END IF;
END $$;

-- hansard_contributions.value_html
CREATE TEMP TABLE u_value_html (ext_id text PRIMARY KEY, value_html text);
SET statement_timeout = '300s';
\copy u_value_html FROM '/Volumes/EDGE_SSD/opengovt-work/archive-cold-data/2026-11-20/hansard_contributions.value_html.csv' WITH (FORMAT csv, HEADER)
SET statement_timeout = '60s';
SELECT count(*) AS value_html_rows_in_copy FROM u_value_html;
SELECT format('UPDATE public.hansard_contributions p SET value_html = u.value_html FROM u_value_html u WHERE u.ext_id = p.ext_id AND p.value_html IS NULL AND u.value_html IS NOT NULL AND u.ext_id BETWEEN %L AND %L', min(ext_id), max(ext_id))
FROM (SELECT ext_id, ntile(15) OVER (ORDER BY ext_id) AS b FROM u_value_html) s GROUP BY b ORDER BY b
\gexec

-- pmqs_archive_exchanges.parlparse_text
CREATE TEMP TABLE u_parlparse (date date, item_order integer, parlparse_text text, PRIMARY KEY (date, item_order));
\copy u_parlparse FROM '/Volumes/EDGE_SSD/opengovt-work/archive-cold-data/2026-11-20/pmqs_archive_exchanges.parlparse_text.csv' WITH (FORMAT csv, HEADER)
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.pmqs_archive_exchanges DISABLE TRIGGER set_changed_at;
UPDATE public.pmqs_archive_exchanges p SET parlparse_text = u.parlparse_text FROM u_parlparse u
  WHERE u.date = p.date AND u.item_order = p.item_order AND p.date < '1990-01-01';
UPDATE public.pmqs_archive_exchanges p SET parlparse_text = u.parlparse_text FROM u_parlparse u
  WHERE u.date = p.date AND u.item_order = p.item_order AND p.date >= '1990-01-01';
ALTER TABLE public.pmqs_archive_exchanges ENABLE TRIGGER set_changed_at;
ALTER TABLE public.pmqs_archive_exchanges ALTER COLUMN parlparse_text SET NOT NULL;
COMMIT;

-- Checks (the value_html checksum reads 250 MB of text: 67 s on 20 Nov, so it is allowed 300 s)
SELECT 'parlparse_text' AS item, count(*), md5(string_agg(date::text || '/' || item_order || ':' || coalesce(md5(parlparse_text), 'NULL'), ',' ORDER BY date, item_order)) AS content_md5 FROM public.pmqs_archive_exchanges;
SET statement_timeout = '300s';
SELECT 'value_html' AS item, count(*), md5(string_agg(p.ext_id || ':' || coalesce(md5(p.value_html), 'NULL'), ',' ORDER BY p.ext_id)) AS content_md5 FROM public.hansard_contributions p JOIN u_value_html u USING (ext_id);
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'public.pmqs_archive_exchanges'::regclass AND tgname = 'set_changed_at';
