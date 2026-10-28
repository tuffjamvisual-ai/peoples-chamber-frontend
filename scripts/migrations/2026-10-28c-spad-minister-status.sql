-- 2026-10-28c: whether each appointing minister in the latest Cabinet Office list of special advisers still holds
-- that post today, and today's Cabinet posts (owner, 28 Oct 2026). From the Members API (governmentPosts and
-- GovernmentPosts), recomputed by /api/sync-spad-roster every week (lib/spad-minister-status.ts).
--   kind 'listed': one row per minister title in the latest list; post_* is the post they held on the list's date,
--     left_on its end date (null while they still hold it).
--   kind 'current': one row per Cabinet post today with its holder and start date; area is the department name used
--     in the quarterly declarations, to find advisers named since the appointment.
-- Access: public read only, like the other spad tables. Undo: 2026-10-28c-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('public.spad_minister_status') IS NOT NULL THEN RAISE EXCEPTION 'spad_minister_status already exists'; END IF;
END $$;
CREATE TABLE public.spad_minister_status (
  kind text NOT NULL CHECK (kind IN ('listed', 'current')),
  minister_title text NOT NULL,
  release_slug text,
  minister_name text,
  member_id integer,
  gender text,
  post_id integer,
  post_name text,
  started_on date,
  left_on date,
  still_in_post boolean NOT NULL DEFAULT false,
  area text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, minister_title)
);
ALTER TABLE public.spad_minister_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read spad minister status" ON public.spad_minister_status FOR SELECT USING (true);
REVOKE ALL ON public.spad_minister_status FROM anon, authenticated;
GRANT SELECT ON public.spad_minister_status TO anon, authenticated;
COMMIT;
