-- 2026-10-28b: official background for special advisers (owner's approval, 28 Oct 2026). Official sources only.
--
-- spad_interests: each declared interest or recusal, word for word, with the document it came from: the Cabinet
--   Office's yearly "Publication of Special Adviser Interests" (Cabinet Office, No 10, the Leaders of the Houses) and
--   the special adviser interests sections of other departments' annual reports and accounts. category is ours (paid
--   role, unpaid role, directorship or trusteeship, family or partner, recusal, other); entry_text is the source's.
-- spad_post_appointments: the Advisory Committee on Business Appointments' advice letters on former special advisers'
--   new jobs (ACOBA closed on 13 October 2025); one row per letter.
-- Career history needs no table: earlier Cabinet Office lists go into spad_appointments, one release_slug each.
-- Access: public read only, like the other spad tables. Undo: 2026-10-28b-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.spad_interests') IS NOT NULL THEN RAISE EXCEPTION 'spad_interests already exists'; END IF;
  IF to_regclass('public.spad_post_appointments') IS NOT NULL THEN RAISE EXCEPTION 'spad_post_appointments already exists'; END IF;
END $$;

CREATE TABLE public.spad_interests (
  id bigserial PRIMARY KEY,
  adviser_name text NOT NULL,
  department text NOT NULL,
  period text NOT NULL,
  entry_text text NOT NULL,
  category text NOT NULL CHECK (category IN ('paid role', 'unpaid role', 'directorship or trusteeship', 'family or partner', 'recusal', 'other')),
  is_recusal boolean NOT NULL DEFAULT false,
  end_date_text text,
  source_title text NOT NULL,
  source_url text NOT NULL,
  source_page integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spad_interests_adviser_department_period_entry_key UNIQUE (adviser_name, department, period, entry_text)
);
CREATE INDEX idx_spad_interests_adviser ON public.spad_interests (adviser_name);

CREATE TABLE public.spad_post_appointments (
  id bigserial PRIMARY KEY,
  adviser_name text NOT NULL,
  former_department text NOT NULL,
  new_employer text NOT NULL,
  new_role text,
  advice_date date NOT NULL,
  conditions_text text,
  source_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spad_post_appointments_source_url_key UNIQUE (source_url)
);
CREATE INDEX idx_spad_post_appointments_adviser ON public.spad_post_appointments (adviser_name);

ALTER TABLE public.spad_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spad_post_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read spad interests" ON public.spad_interests FOR SELECT USING (true);
CREATE POLICY "Anyone can read spad post appointments" ON public.spad_post_appointments FOR SELECT USING (true);
REVOKE ALL ON public.spad_interests, public.spad_post_appointments FROM anon, authenticated;
GRANT SELECT ON public.spad_interests, public.spad_post_appointments TO anon, authenticated;
REVOKE ALL ON SEQUENCE public.spad_interests_id_seq, public.spad_post_appointments_id_seq FROM anon, authenticated;
COMMIT;
