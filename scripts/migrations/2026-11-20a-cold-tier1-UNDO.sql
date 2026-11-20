-- UNDO of 2026-11-20a-cold-tier1.sql, part 1 (Cowork ENTRY 420): recreates the four tables exactly as pg_dump
-- --schema-only gave them on 20 Nov 2026 (columns, defaults, constraints, indexes, comments, row level security, policy,
-- grants; Supabase's default grants to anon and authenticated are revoked again, as they were), the two archive_test
-- functions, loads every row back from the EDGE_SSD copy and sets mp_questions_id_seq as it was; then adds
-- hansard_contributions.value_html and pmqs_archive_exchanges.parlparse_text back as empty nullable text columns (a
-- catalogue change). Their values: 2026-11-20c-cold-tier1-UNDO-fill-columns.sql. The search column and its index:
-- 2026-11-20d-cold-tier1-UNDO-search-column.sql, then 2026-11-20b-cold-tier1-index-UNDO.sql.
-- The copy: /Volumes/EDGE_SSD/opengovt-work/archive-cold-data/2026-11-20/ (second copy on GoliathSSD,
-- /Volumes/GoliathSSD/opengovt-backups/cold-data-2026-11-20/; check MANIFEST.tsv sha256 first). Run from psql with the
-- drive mounted (psql does not expand variables in \copy, so the paths are written out). The largest load (mp_questions, 98 MB) took 30 s in the 20 Nov restore check.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.mp_questions') IS NOT NULL OR to_regclass('public.mp_questions_id_seq') IS NOT NULL THEN RAISE EXCEPTION 'mp_questions already exists'; END IF;
  IF to_regclass('public.government_contracts_backup') IS NOT NULL THEN RAISE EXCEPTION 'government_contracts_backup already exists'; END IF;
  IF to_regclass('public.government_contracts_duplicates_20261016') IS NOT NULL THEN RAISE EXCEPTION 'government_contracts_duplicates_20261016 already exists'; END IF;
  IF to_regclass('public.archive_test_index') IS NOT NULL THEN RAISE EXCEPTION 'archive_test_index already exists'; END IF;
  IF to_regprocedure('public.archive_test_words(text[])') IS NOT NULL OR to_regprocedure('public.archive_test_search(text, integer)') IS NOT NULL THEN RAISE EXCEPTION 'archive_test functions already exist'; END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.hansard_contributions'::regclass AND attname = 'value_html' AND NOT attisdropped) THEN RAISE EXCEPTION 'hansard_contributions.value_html already exists'; END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.pmqs_archive_exchanges'::regclass AND attname = 'parlparse_text' AND NOT attisdropped) THEN RAISE EXCEPTION 'pmqs_archive_exchanges.parlparse_text already exists'; END IF;
END $$;

-- archive_test_words (used by archive_test_index.search_vec), from pg_get_functiondef
CREATE OR REPLACE FUNCTION public.archive_test_words(a text[])
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
RETURN COALESCE(array_to_string(a, ' '::text), ''::text)
;
REVOKE ALL ON FUNCTION public.archive_test_words(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_test_words(text[]) TO service_role;

-- mp_questions
CREATE TABLE public.mp_questions (
    id bigint NOT NULL,
    pq_id integer NOT NULL,
    member_id integer NOT NULL,
    question_text text,
    answer_text text,
    department text,
    date_tabled date,
    date_answered date,
    heading text,
    uin text,
    is_withdrawn boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.mp_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.mp_questions_id_seq OWNED BY public.mp_questions.id;

ALTER TABLE ONLY public.mp_questions ALTER COLUMN id SET DEFAULT nextval('public.mp_questions_id_seq'::regclass);

ALTER TABLE ONLY public.mp_questions
    ADD CONSTRAINT mp_questions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mp_questions
    ADD CONSTRAINT mp_questions_pq_id_key UNIQUE (pq_id);

CREATE INDEX mp_questions_member_date_idx ON public.mp_questions USING btree (member_id, date_tabled DESC);

CREATE INDEX mp_questions_member_dept_idx ON public.mp_questions USING btree (member_id, department);

CREATE POLICY "Anyone can read mp questions" ON public.mp_questions FOR SELECT USING (true);

ALTER TABLE public.mp_questions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.mp_questions TO service_role;

GRANT ALL ON SEQUENCE public.mp_questions_id_seq TO service_role;
REVOKE ALL ON TABLE public.mp_questions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.mp_questions_id_seq FROM PUBLIC, anon, authenticated;
\copy public.mp_questions (id,pq_id,member_id,question_text,answer_text,department,date_tabled,date_answered,heading,uin,is_withdrawn,created_at) FROM '/Volumes/EDGE_SSD/opengovt-work/archive-cold-data/2026-11-20/mp_questions.csv' WITH (FORMAT csv, HEADER)
DO $$ BEGIN IF (SELECT count(*) FROM public.mp_questions) <> 171747 THEN RAISE EXCEPTION 'mp_questions: not 171747 rows'; END IF; END $$;

-- government_contracts_backup
CREATE TABLE public.government_contracts_backup (
    id bigint,
    dept_slug text,
    title text,
    supplier text,
    value numeric,
    awarded_date text,
    status text,
    description text,
    updated_at timestamp with time zone
);

ALTER TABLE public.government_contracts_backup ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.government_contracts_backup TO service_role;
REVOKE ALL ON TABLE public.government_contracts_backup FROM PUBLIC, anon, authenticated;
\copy public.government_contracts_backup (id,dept_slug,title,supplier,value,awarded_date,status,description,updated_at) FROM '/Volumes/EDGE_SSD/opengovt-work/archive-cold-data/2026-11-20/government_contracts_backup.csv' WITH (FORMAT csv, HEADER)
DO $$ BEGIN IF (SELECT count(*) FROM public.government_contracts_backup) <> 39611 THEN RAISE EXCEPTION 'government_contracts_backup: not 39611 rows'; END IF; END $$;

-- government_contracts_duplicates_20261016
CREATE TABLE public.government_contracts_duplicates_20261016 (
    id bigint NOT NULL,
    dept_slug text NOT NULL,
    title text,
    supplier text,
    value numeric,
    awarded_date text,
    status text,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    ocid text,
    award_id text,
    contract_id text
);

ALTER TABLE public.government_contracts_duplicates_20261016 ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.government_contracts_duplicates_20261016 TO service_role;
REVOKE ALL ON TABLE public.government_contracts_duplicates_20261016 FROM PUBLIC, anon, authenticated;
\copy public.government_contracts_duplicates_20261016 (id,dept_slug,title,supplier,value,awarded_date,status,description,updated_at,ocid,award_id,contract_id) FROM '/Volumes/EDGE_SSD/opengovt-work/archive-cold-data/2026-11-20/government_contracts_duplicates_20261016.csv' WITH (FORMAT csv, HEADER)
DO $$ BEGIN IF (SELECT count(*) FROM public.government_contracts_duplicates_20261016) <> 17974 THEN RAISE EXCEPTION 'government_contracts_duplicates_20261016: not 17974 rows'; END IF; END $$;

-- archive_test_index
CREATE TABLE public.archive_test_index (
    id text NOT NULL,
    house text NOT NULL,
    sitting_date date NOT NULL,
    title text NOT NULL,
    speakers text[] DEFAULT '{}'::text[] NOT NULL,
    snippet text DEFAULT ''::text NOT NULL,
    words integer NOT NULL,
    source_url text NOT NULL,
    rel_path text NOT NULL,
    search_vec tsvector GENERATED ALWAYS AS (((setweight(to_tsvector('english'::regconfig, title), 'A'::"char") || setweight(to_tsvector('english'::regconfig, public.archive_test_words(speakers)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, snippet), 'C'::"char"))) STORED,
    CONSTRAINT archive_test_index_house_check CHECK ((house = ANY (ARRAY['lords'::text, 'commons'::text]))),
    CONSTRAINT archive_test_index_id_check CHECK ((id ~ '^hl-[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(-[a-z0-9]+)*$'::text)),
    CONSTRAINT archive_test_index_rel_path_check CHECK ((rel_path ~ '^[0-9]{4}/[a-z]{3}-[0-9]{1,2}-[a-z0-9-]+\.html$'::text)),
    CONSTRAINT archive_test_index_snippet_check CHECK ((length(snippet) <= 400)),
    CONSTRAINT archive_test_index_source_url_check CHECK ((source_url ~ '^https://api\.parliament\.uk/historic-hansard/'::text)),
    CONSTRAINT archive_test_index_title_check CHECK ((title <> ''::text)),
    CONSTRAINT archive_test_index_words_check CHECK ((words >= 0))
);

COMMENT ON TABLE public.archive_test_index IS 'TEST, proof only (Cowork ENTRY 386, 19 Nov 2026): compact index of Lords Hansard 1950-1955 (Historic Hansard, Open Parliament Licence v3.0); full text served from the Mac, not stored here. Service role only. Drop with 2026-11-19d-archive-test-UNDO.sql; migration 2026-11-19d';

ALTER TABLE ONLY public.archive_test_index
    ADD CONSTRAINT archive_test_index_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.archive_test_index
    ADD CONSTRAINT archive_test_index_rel_path_key UNIQUE (rel_path);

CREATE INDEX archive_test_index_search_vec ON public.archive_test_index USING gin (search_vec);

CREATE INDEX archive_test_index_title_trgm ON public.archive_test_index USING gin (title public.gin_trgm_ops);

ALTER TABLE public.archive_test_index ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.archive_test_index TO service_role;
REVOKE ALL ON TABLE public.archive_test_index FROM PUBLIC, anon, authenticated;
\copy public.archive_test_index (id,house,sitting_date,title,speakers,snippet,words,source_url,rel_path) FROM '/Volumes/EDGE_SSD/opengovt-work/archive-cold-data/2026-11-20/archive_test_index.csv' WITH (FORMAT csv, HEADER)
DO $$ BEGIN IF (SELECT count(*) FROM public.archive_test_index) <> 4718 THEN RAISE EXCEPTION 'archive_test_index: not 4718 rows'; END IF; END $$;

-- archive_test_search, from pg_get_functiondef
CREATE OR REPLACE FUNCTION public.archive_test_search(q text, max_rows integer DEFAULT 20)
 RETURNS TABLE(id text, house text, sitting_date date, title text, speakers text[], snippet text, words integer, source_url text, rank real, matched text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH term AS (SELECT left(btrim(q), 200) AS t, least(greatest(coalesce(max_rows, 20), 1), 50) AS n),
  words AS (
    SELECT a.id, a.house, a.sitting_date, a.title, a.speakers, a.snippet, a.words, a.source_url,
           ts_rank_cd(a.search_vec, websearch_to_tsquery('english', term.t)) AS rank, 'words'::text AS matched
    FROM public.archive_test_index a, term
    WHERE term.t <> '' AND a.search_vec @@ websearch_to_tsquery('english', term.t)
    ORDER BY rank DESC, a.sitting_date DESC, a.id
    LIMIT (SELECT n FROM term)
  ),
  near AS (
    SELECT a.id, a.house, a.sitting_date, a.title, a.speakers, a.snippet, a.words, a.source_url,
           word_similarity(term.t, a.title) AS rank, 'title'::text AS matched
    FROM public.archive_test_index a, term
    WHERE length(term.t) >= 3 AND NOT EXISTS (SELECT 1 FROM words) AND term.t <% a.title
    ORDER BY rank DESC, a.sitting_date DESC, a.id
    LIMIT (SELECT n FROM term)
  )
  SELECT * FROM words UNION ALL SELECT * FROM near
$function$
;
REVOKE ALL ON FUNCTION public.archive_test_search(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_test_search(text, integer) TO service_role;

-- mp_questions_id_seq state on 20 Nov 2026
SELECT setval('public.mp_questions_id_seq', 332651, true);

-- The two text columns, empty (values: 2026-11-20c). parlparse_text was NOT NULL; 2026-11-20c sets that again once filled.
ALTER TABLE public.hansard_contributions ADD COLUMN value_html text;
ALTER TABLE public.pmqs_archive_exchanges ADD COLUMN parlparse_text text;

SELECT t AS restored, to_regclass(t) IS NOT NULL AS present FROM unnest(ARRAY['public.mp_questions', 'public.government_contracts_backup', 'public.government_contracts_duplicates_20261016', 'public.archive_test_index']) t;
COMMIT;
