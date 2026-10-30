-- 2026-10-30g: archived speeches are never hard deleted (owner's approval, 30 Oct 2026, including this production
-- change). Additive only (rule 10): one nullable column, no default, so adding it rewrites nothing and the code on main
-- (which never writes it) keeps working. A contribution Hansard drops from a re-published debate gets removed_at
-- instead of being deleted; a later fetch that lists it again clears it.
-- Needs: app/api/sync-parliament-archive/route.ts from the archive safeguard commit (it writes removed_at).
-- Every read of the archive for readers (the Stage 2 debate page, a future search) must filter removed_at IS NULL.
-- Undo: 2026-10-30g-UNDO.sql.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.hansard_contributions ADD COLUMN removed_at timestamptz;
COMMENT ON COLUMN public.hansard_contributions.removed_at IS
  'Set when Hansard re-published the debate without this contribution; never deleted. Reads for readers filter removed_at IS NULL.';
COMMIT;
