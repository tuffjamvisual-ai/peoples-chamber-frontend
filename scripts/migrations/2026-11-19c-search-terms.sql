-- Search term log (owner approved 19 Nov 2026, Cowork ENTRY 375 item 2). One row per search run in one of the site's
-- search boxes: the term (cleaned before it is stored, lib/search-terms.ts: trimmed, lower case, at most 100 characters;
-- an email address or phone number is never stored, a full postcode only as its outward code), which box, the start of
-- the hour (UTC) and the number of results. Nothing that identifies a person: no IP address, user agent, account,
-- cookie or exact time. Written only by POST /api/search-log with the service key; row level security is on with no
-- policies, and anon and authenticated have no grants, so the public API can neither read nor write it. Rows older than
-- 13 months are deleted daily by /api/cron/search-terms-retention. Read by scripts/search-terms-weekly.mjs (read only).
-- Backup: none needed, the table is new (the guard below stops if it already exists). UNDO: 2026-11-19c-search-terms-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.search_terms') IS NOT NULL THEN RAISE EXCEPTION 'search_terms already exists'; END IF;
END $$;

CREATE TABLE public.search_terms (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  term    text NOT NULL CHECK (char_length(term) BETWEEN 1 AND 100 AND term = lower(term)),
  box     text NOT NULL CHECK (box IN ('site', 'home-site', 'councils', 'home-council', 'pmqs', 'home-pmqs', 'mps', 'home-mp')),
  at_hour timestamptz NOT NULL CHECK (date_trunc('hour', at_hour) = at_hour),
  results integer CHECK (results >= 0)
);
CREATE INDEX search_terms_at_hour_idx ON public.search_terms (at_hour);
COMMENT ON TABLE public.search_terms IS
  'Search term log: cleaned term, box, hour (UTC) and result count per search; nothing personal; service role only; kept 13 months; migration 2026-11-19c';
ALTER TABLE public.search_terms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_terms FROM anon, authenticated;

-- Self-check: its five columns, primary key and index, row level security on, no policies, no grants to anon or
-- authenticated, empty.
DO $$ BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_terms') <> 5 THEN
    RAISE EXCEPTION 'search_terms does not have exactly its 5 columns';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.search_terms'::regclass AND contype = 'p') THEN
    RAISE EXCEPTION 'primary key missing';
  END IF;
  IF to_regclass('public.search_terms_at_hour_idx') IS NULL THEN RAISE EXCEPTION 'at_hour index missing'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.search_terms'::regclass) THEN
    RAISE EXCEPTION 'row level security is off';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_terms') <> 0 THEN
    RAISE EXCEPTION 'unexpected policies';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'search_terms'
               AND grantee IN ('anon', 'authenticated')) THEN
    RAISE EXCEPTION 'anon or authenticated still has a grant';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_terms) THEN RAISE EXCEPTION 'table is not empty'; END IF;
  RAISE NOTICE '2026-11-19c: search_terms created (empty, RLS on, no policies, no anon or authenticated grants)';
END $$;

COMMIT;
