-- Applied: 2026-09-26
-- Adds retirement_pending_since to mps to support the two-strikes safeguard
-- in sync-mp-roster. When the Parliament Members API drops an MP from its
-- IsCurrentMember=true results for a single run (e.g. during prorogation),
-- the sync sets this timestamp instead of immediately retiring the row.
-- On the second consecutive miss the MP is actually retired and this column
-- is cleared back to null. Nullable, no default — zero impact on existing rows.

ALTER TABLE public.mps
  ADD COLUMN retirement_pending_since timestamptz;
