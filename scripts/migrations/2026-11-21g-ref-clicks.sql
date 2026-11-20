-- Ref tag click counter (owner approved 20 Nov 2026, Cowork ENTRY 440). One row per tag, page and hour: the tag of one
-- of our own links (lib/ref-clicks.ts allow list: x1 to x9999 and a few others, lower case), the page path (no query
-- string, at most 200 characters), the start of the hour (UTC) and the number of clicks. Nothing that identifies a
-- person: no IP address, user agent, account, cookie or exact time. Counted only by POST /api/ref-click with the service
-- key through public.ref_click_add (count + 1); row level security is on with no policies, anon and authenticated have
-- no grants on the table and may not run the function, so the public API can neither read nor write it. One row per
-- tag, page and hour, so it stays small. Read by scripts/analytics/ref-report.mjs (read only).
-- Backup: none needed, the table is new (the guard below stops if it or the function already exists).
-- UNDO: 2026-11-21g-ref-clicks-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.ref_clicks') IS NOT NULL THEN RAISE EXCEPTION 'ref_clicks already exists'; END IF;
  IF to_regprocedure('public.ref_click_add(text, text, timestamptz)') IS NOT NULL THEN RAISE EXCEPTION 'ref_click_add already exists'; END IF;
END $$;

CREATE TABLE public.ref_clicks (
  ref   text NOT NULL CHECK (ref ~ '^[a-z0-9]{1,16}$'),
  path  text NOT NULL CHECK (char_length(path) BETWEEN 1 AND 200 AND left(path, 1) = '/' AND path !~ '[?#[:space:]]'),
  hour  timestamptz NOT NULL CHECK (date_trunc('hour', hour) = hour),
  count integer NOT NULL DEFAULT 1 CHECK (count > 0),
  PRIMARY KEY (ref, path, hour)
);
COMMENT ON TABLE public.ref_clicks IS
  'Ref tag click counter: clicks per tag, page and hour (UTC); nothing personal; service role only; migration 2026-11-21g';
ALTER TABLE public.ref_clicks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ref_clicks FROM anon, authenticated;

-- count + 1 for this tag, page and hour (a new row at 1). Runs as the caller (service_role, which bypasses row level
-- security); nobody else may run it.
CREATE FUNCTION public.ref_click_add(p_ref text, p_path text, p_hour timestamptz)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
  INSERT INTO public.ref_clicks AS r (ref, path, hour, count)
  VALUES (p_ref, p_path, date_trunc('hour', p_hour), 1)
  ON CONFLICT (ref, path, hour) DO UPDATE SET count = r.count + 1;
$fn$;
REVOKE EXECUTE ON FUNCTION public.ref_click_add(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ref_click_add(text, text, timestamptz) TO service_role;

-- Self-check: its four columns and primary key, row level security on, no policies, no grants to anon or authenticated
-- on the table, the function runnable by service_role only, empty.
DO $$ BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ref_clicks') <> 4 THEN
    RAISE EXCEPTION 'ref_clicks does not have exactly its 4 columns';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ref_clicks'::regclass AND contype = 'p') THEN
    RAISE EXCEPTION 'primary key missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ref_clicks'::regclass) THEN
    RAISE EXCEPTION 'row level security is off';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ref_clicks') <> 0 THEN
    RAISE EXCEPTION 'unexpected policies';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'ref_clicks'
               AND grantee IN ('anon', 'authenticated')) THEN
    RAISE EXCEPTION 'anon or authenticated still has a grant';
  END IF;
  IF has_function_privilege('anon', 'public.ref_click_add(text, text, timestamptz)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.ref_click_add(text, text, timestamptz)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon or authenticated may run ref_click_add';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.ref_click_add(text, text, timestamptz)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role may not run ref_click_add';
  END IF;
  IF EXISTS (SELECT 1 FROM public.ref_clicks) THEN RAISE EXCEPTION 'table is not empty'; END IF;
  RAISE NOTICE '2026-11-21g: ref_clicks and ref_click_add created (empty, RLS on, no policies, service_role only)';
END $$;

COMMIT;
