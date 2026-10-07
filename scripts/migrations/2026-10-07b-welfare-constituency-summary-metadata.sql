-- Migration: add metadata_json to welfare_constituency_summary
-- Date: 2026-10-07
--
-- The original 2026-10-06 schema migration did not include a
-- metadata_json column on welfare_constituency_summary. When
-- compute-welfare-constituency-summary.js was first run live, it needed
-- somewhere to record the per-benefit spend breakdown, each benefit's own
-- latest period_end (the six benefits publish on different schedules —
-- see that script's header comment), the population data's period_end,
-- and the England & Wales-only scope decision with its rationale (PIP,
-- DLA, and Carer's Allowance are devolved in Scotland; see
-- import-welfare-pip.js / import-welfare-dla.js / import-welfare-ca.js).
--
-- That column was added live via ALTER TABLE before this migration file
-- was written, so this migration documents what's already in place
-- (idempotent via IF NOT EXISTS) rather than being the first application
-- of the change — if this project's schema is ever rebuilt from scratch,
-- this migration ensures the table matches what's actually running.
--
-- No RLS change needed — welfare_constituency_summary already has RLS
-- disabled from the original migration.

BEGIN;

ALTER TABLE public.welfare_constituency_summary
  ADD COLUMN IF NOT EXISTS metadata_json jsonb;

COMMIT;
