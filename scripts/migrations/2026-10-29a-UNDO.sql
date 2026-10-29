-- Undo 2026-10-29a-parliament-archive.sql: drops the three archive tables it created, and nothing else.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.parliament_written_questions;
DROP TABLE IF EXISTS public.hansard_contributions;
DROP TABLE IF EXISTS public.parliament_archive_sync_state;
COMMIT;
