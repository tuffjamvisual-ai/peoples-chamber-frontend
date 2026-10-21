-- mp_contribution_totals: the spoken-contributions sync's own refresh time (owner's approval, 21 Oct 2026).
-- /api/sync-mp-contributions picked the "stalest" MPs by updated_at, which /api/sync-mp-written-questions also sets
-- every night, so its order was effectively random; and it saved only at the end, so a run killed at 300 s saved
-- nothing. It now orders by spoken_synced_at (NULL first) and saves each MP as it finishes.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_contribution_totals' AND column_name = 'spoken_synced_at')
    THEN RAISE EXCEPTION 'spoken_synced_at already exists'; END IF;
END $$;
ALTER TABLE public.mp_contribution_totals ADD COLUMN spoken_synced_at timestamptz;
COMMENT ON COLUMN public.mp_contribution_totals.spoken_synced_at IS 'when /api/sync-mp-contributions last refreshed total_contributions and word_count (NULL: not since 21 Oct 2026)';
COMMIT;
