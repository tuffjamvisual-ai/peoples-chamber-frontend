-- 2026-10-24b: MP Background timeline, stage 1 (owner's approval, 24 Oct 2026, "approve background plan").
-- Adds two nullable columns to public.mp_biography and changes nothing else:
--   background_timeline     jsonb  NULL or a JSON array of entries (CHECK constraint below)
--   background_last_checked date   when the timeline was last checked against its sources
-- Entry shape (also documented in lib/background-timeline.ts, which validates it):
--   { "phase": "education" | "career" | "politics",
--     "start": "YYYY" | "YYYY-MM" | null,
--     "end": "YYYY" | "YYYY-MM" | "present" | null,
--     "title": string,                 -- e.g. "BA English", "Solicitor", "Councillor"
--     "organisation": string | null,   -- e.g. "Fitzwilliam College, Cambridge"
--     "detail": string | null,         -- one plain sentence at most
--     "source": { "title": string, "url": string } }   -- required, https only
-- Privileges are untouched: the new columns are covered by the existing table-level grants (anon and authenticated
-- SELECT only, as after 2026-10-23f/g). The self-check below fails if that is no longer so.
-- Undo: 2026-10-24b-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography'
               AND column_name IN ('background_timeline', 'background_last_checked')) THEN
    RAISE EXCEPTION 'background columns already exist';
  END IF;
END $$;

-- Privileges of anon and authenticated on the table before the change, to compare afterwards.
CREATE TEMP TABLE bt_privs_before ON COMMIT DROP AS
SELECT r.role, p.priv, has_table_privilege(r.role, 'public.mp_biography', p.priv) AS held
  FROM (VALUES ('anon'), ('authenticated')) r(role),
       (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv);
CREATE TEMP TABLE bt_rows_before ON COMMIT DROP AS SELECT count(*) AS n FROM public.mp_biography;

ALTER TABLE public.mp_biography
  ADD COLUMN background_timeline jsonb,
  ADD COLUMN background_last_checked date;

ALTER TABLE public.mp_biography
  ADD CONSTRAINT mp_biography_background_timeline_is_array
  CHECK (background_timeline IS NULL OR jsonb_typeof(background_timeline) = 'array');

COMMENT ON COLUMN public.mp_biography.background_timeline IS
  'MP Background timeline: NULL or an array of {phase education|career|politics, start YYYY|YYYY-MM|null, end YYYY|YYYY-MM|present|null, title, organisation|null, detail|null, source {title, url (https)}}. Validated by lib/background-timeline.ts.';
COMMENT ON COLUMN public.mp_biography.background_last_checked IS
  'Date the background_timeline was last checked against its sources.';

-- Self-check: both columns exist with the right types, the constraint is in place, the row count is unchanged, and
-- anon and authenticated hold exactly the privileges they held before (SELECT only, no write privileges).
DO $$
DECLARE
  changed integer;
  writes integer;
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography' AND column_name = 'background_timeline') IS DISTINCT FROM 'jsonb'
     OR (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography' AND column_name = 'background_last_checked') IS DISTINCT FROM 'date' THEN
    RAISE EXCEPTION 'background columns missing or of the wrong type';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.mp_biography'::regclass AND conname = 'mp_biography_background_timeline_is_array') THEN
    RAISE EXCEPTION 'array check constraint missing';
  END IF;
  IF (SELECT count(*) FROM public.mp_biography) <> (SELECT n FROM bt_rows_before) THEN
    RAISE EXCEPTION 'row count changed';
  END IF;
  SELECT count(*) INTO changed FROM bt_privs_before b
   WHERE has_table_privilege(b.role, 'public.mp_biography', b.priv) IS DISTINCT FROM b.held;
  IF changed <> 0 THEN RAISE EXCEPTION '% anon/authenticated table privileges changed', changed; END IF;
  SELECT count(*) INTO writes FROM bt_privs_before b
   WHERE b.priv <> 'SELECT' AND has_table_privilege(b.role, 'public.mp_biography', b.priv);
  IF writes <> 0 THEN RAISE EXCEPTION 'anon or authenticated hold % write privileges on mp_biography', writes; END IF;
  IF NOT has_table_privilege('anon', 'public.mp_biography', 'SELECT') THEN RAISE EXCEPTION 'anon lost SELECT'; END IF;
END $$;

COMMIT;
