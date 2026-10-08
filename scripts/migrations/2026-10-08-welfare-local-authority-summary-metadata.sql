-- Migration: add metadata_json to welfare_local_authority_summary
-- Date: 2026-10-08
--
-- Same gap as the 2026-10-07b migration on welfare_constituency_summary,
-- this time on the Local Authority tier's equivalent table. The
-- 2026-10-07c schema migration (welfare_local_authority_metrics +
-- welfare_local_authority_summary) gave metadata_json to the long-form
-- metrics table but not to the denormalised summary table, even though
-- compute-welfare-la-summary.js needs somewhere to record the same kind
-- of data the constituency summary stores: the per-benefit spend
-- breakdown, each benefit's own latest/baseline period_end (the six
-- benefits publish on different schedules — see that script's header),
-- the population data's period_end, the England & Wales-only scope
-- decision with its rationale, and the Barnsley/Sheffield geography-
-- vintage caveat specific to the LA tier.
--
-- This was caught when compute-welfare-la-summary.js's first live run
-- failed on an unrecognised column before this migration existed — see
-- that script's header and the session's own record of the fix. Adding
-- the column here (idempotent via IF NOT EXISTS) brings the LA summary
-- table in line with the constituency summary table, and the LA summary
-- script is re-run live after this migration so metadata_json is
-- actually populated going forward.
--
-- No RLS change needed — welfare_local_authority_summary already has RLS
-- disabled from the 2026-10-07c migration.

BEGIN;

ALTER TABLE public.welfare_local_authority_summary
  ADD COLUMN IF NOT EXISTS metadata_json jsonb;

COMMIT;
