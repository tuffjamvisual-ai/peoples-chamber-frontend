-- Meaning search (owner approved 20 Nov 2026 20:33, Cowork ENTRY 390 GO; tested in ENTRY 390, audit/meaning-390/REPORT.md).
-- 1. The pgvector extension, in schema extensions (Supabase's place for extensions; 0.8.0 is available there, not yet
--    installed, checked read only 20 Nov 2026). halfvec needs 0.7 or later.
-- 2. public.search_embeddings: one row per page or record /search can offer as 'Related by meaning': its kind, its site
--    path (the key), its title, the date and House shown under it (nullable; Cowork ENTRY 390 PICTURES), its vector (halfvec(384): 16 bit numbers, half the size of vector(384), from the
--    Supabase/gte-small model kept in the repo) and a hash of the model and text it was made from (so a reload skips
--    unchanged rows). No body text is stored. Filled from the Mac by scripts/meaning/load-embeddings.ts in batches of 500.
--    Row level security on with a read policy, and no grants to anon or authenticated, like the other read tables
--    (councils): the site reads with the service key.
-- 3. public.search_meaning(p_query text, p_limit int): read only; the nearest rows by cosine distance (with their date
--    and House), with a score
--    (1 - distance). The query vector comes as text '[x,...]' (PostgREST passes it as is) and is cast here. Execute for
--    service_role only.
-- The HNSW index is built AFTER the load, in its own file: 2026-11-21f-meaning-search-index.sql (CONCURRENTLY).
-- Backup: none needed, everything here is new (the guards stop if any of it exists). UNDO: 2026-11-21e-meaning-search-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.search_embeddings') IS NOT NULL THEN RAISE EXCEPTION 'search_embeddings already exists'; END IF;
  IF to_regprocedure('public.search_meaning(text,integer)') IS NOT NULL THEN RAISE EXCEPTION 'search_meaning already exists'; END IF;
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'vector' AND n.nspname <> 'extensions') THEN
    RAISE EXCEPTION 'vector is installed outside schema extensions';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.search_embeddings (
  path        text PRIMARY KEY CHECK (path LIKE '/%' AND path NOT LIKE '//%' AND char_length(path) <= 300),
  kind        text NOT NULL CHECK (kind IN ('page', 'mp', 'peer', 'council', 'constituency', 'organisation', 'report', 'briefing',
                                            'bill', 'commons_vote', 'committee', 'appg', 'edm', 'petition', 'debate', 'special_adviser')),
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  item_date   date,
  house       text CHECK (house IN ('Commons', 'Lords')),
  embedding   extensions.halfvec(384) NOT NULL,
  source_hash text NOT NULL CHECK (source_hash ~ '^[0-9a-f]{32}$'),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.search_embeddings IS
  'Meaning search: one vector (Supabase/gte-small, halfvec 384) per page or record, by site path; filled from the Mac by scripts/meaning/load-embeddings.ts; migration 2026-11-21e';
ALTER TABLE public.search_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY search_embeddings_select ON public.search_embeddings FOR SELECT USING (true);
REVOKE ALL ON public.search_embeddings FROM anon, authenticated;

CREATE FUNCTION public.search_meaning(p_query text, p_limit integer DEFAULT 15)
RETURNS TABLE (kind text, path text, title text, item_date date, house text, score real)
LANGUAGE sql STABLE PARALLEL SAFE
SET search_path = public, extensions, pg_temp
AS $fn$
  SELECT e.kind, e.path, e.title, e.item_date, e.house, (1 - (e.embedding <=> p_query::extensions.halfvec(384)))::real AS score
  FROM public.search_embeddings e
  ORDER BY e.embedding <=> p_query::extensions.halfvec(384)
  LIMIT least(greatest(coalesce(p_limit, 15), 1), 50)
$fn$;
COMMENT ON FUNCTION public.search_meaning(text, integer) IS
  'Meaning search: the nearest search_embeddings rows to a query vector given as text, with score = 1 - cosine distance; read only; migration 2026-11-21e';
REVOKE ALL ON FUNCTION public.search_meaning(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_meaning(text, integer) TO service_role;

-- Self-check: the extension in extensions, the table's eight columns and key, row level security on with its one policy,
-- no grants to anon or authenticated, the function answers (no rows yet) and is not executable by anon.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'vector' AND n.nspname = 'extensions') THEN
    RAISE EXCEPTION 'vector is not in schema extensions';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_embeddings') <> 8 THEN
    RAISE EXCEPTION 'search_embeddings does not have exactly its 8 columns';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.search_embeddings'::regclass AND contype = 'p') THEN
    RAISE EXCEPTION 'primary key missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.search_embeddings'::regclass) THEN RAISE EXCEPTION 'row level security is off'; END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_embeddings') <> 1 THEN RAISE EXCEPTION 'expected one policy'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'search_embeddings'
               AND grantee IN ('anon', 'authenticated')) THEN
    RAISE EXCEPTION 'anon or authenticated still has a grant';
  END IF;
  IF has_function_privilege('anon', 'public.search_meaning(text, integer)', 'EXECUTE') THEN RAISE EXCEPTION 'anon can run search_meaning'; END IF;
  IF (SELECT count(*) FROM public.search_meaning('[' || array_to_string(array_fill(0.05::real, ARRAY[384]), ',') || ']', 5)) <> 0 THEN
    RAISE EXCEPTION 'search_meaning returned rows from a new table';
  END IF;
  RAISE NOTICE '2026-11-21e: vector in extensions, search_embeddings created (empty, RLS on, read policy, no anon or authenticated grants), search_meaning ready';
END $$;

COMMIT;
