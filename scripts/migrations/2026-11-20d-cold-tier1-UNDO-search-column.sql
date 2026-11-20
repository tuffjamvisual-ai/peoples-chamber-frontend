-- UNDO of 2026-11-20a-cold-tier1.sql, part 3 (Cowork ENTRY 420): hansard_contributions.search back as the generated
-- column it was (expression from pg_attribute and pg_get_expr on 20 Nov 2026,
-- archive-cold-data/2026-11-20/hansard_contributions.search.definition.sql). Its values are computed, so nothing is
-- copied back. Adding a STORED generated column REWRITES the whole table (about 600 MB after the 2026-11-20a repack
-- plus the new column's 230 MB) under a lock that blocks every read and write of hansard_contributions (the /pmqs pages
-- read it through the data cache) and needs that much free disk while it runs; it will take longer than 60 s, so this
-- file allows 600 s and must only run on the owner's say, at a quiet hour, never during a sync-parliament-archive run.
-- Then the index: 2026-11-20b-cold-tier1-index-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '600s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.hansard_contributions'::regclass AND attname = 'search' AND NOT attisdropped) THEN RAISE EXCEPTION 'hansard_contributions.search already exists'; END IF;
END $$;
ALTER TABLE public.hansard_contributions ADD COLUMN search tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((COALESCE(debate_title, ''::text) || ' '::text) || COALESCE(contribution_text, ''::text)))) STORED;
SELECT attname, attgenerated, pg_get_expr(d.adbin, d.adrelid) FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum WHERE a.attrelid = 'public.hansard_contributions'::regclass AND a.attname = 'search';
COMMIT;
