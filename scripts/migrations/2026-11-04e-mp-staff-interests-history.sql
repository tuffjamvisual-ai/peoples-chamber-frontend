-- 2026-11-04e: staff register, stage 1 (owner, 4 Nov 2026). public.mp_staff_interests already exists (2026-11-03d), so
-- this adds what stage 1 needs rather than creating it: the anonymous staff identifier, the entry's published date, and
-- when it was first and last seen, with is_current for entries in the newest edition. No staff name column, and no
-- summary text (owner's decision: summaries can name a ward).
-- Existing rows, all from the newest edition, count as first and last seen in that edition.
-- Undo: 2026-11-04e-mp-staff-interests-history-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-04e-mp-staff-interests-history.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.mp_staff_interests
  ADD COLUMN staff_identifier text,          -- the register's anonymous id, never a name
  ADD COLUMN published_date   date,
  ADD COLUMN first_seen_date  date,
  ADD COLUMN last_seen_date   date,
  ADD COLUMN is_current       boolean NOT NULL DEFAULT true;

UPDATE public.mp_staff_interests SET first_seen_date = register_date, last_seen_date = register_date;

CREATE INDEX mp_staff_interests_member_current_idx ON public.mp_staff_interests (member_id) WHERE is_current;

COMMIT;
