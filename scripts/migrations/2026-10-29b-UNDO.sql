-- Undo 2026-10-29b-editorials-full-copy.sql: drops only the columns it added. Existing columns are untouched.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.editorials
  DROP COLUMN IF EXISTS opinion,
  DROP COLUMN IF EXISTS hero_image,
  DROP COLUMN IF EXISTS hero_alt,
  DROP COLUMN IF EXISTS evidence,
  DROP COLUMN IF EXISTS last_checked,
  DROP COLUMN IF EXISTS update_note,
  DROP COLUMN IF EXISTS related_programme_slugs,
  DROP COLUMN IF EXISTS explore,
  DROP COLUMN IF EXISTS read_next,
  DROP COLUMN IF EXISTS topic_slugs,
  DROP COLUMN IF EXISTS unpublished,
  DROP COLUMN IF EXISTS updated_at;
COMMIT;
