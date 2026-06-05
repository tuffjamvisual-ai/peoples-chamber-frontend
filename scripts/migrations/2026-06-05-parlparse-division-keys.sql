-- Migration: prepare mp_division_votes for ParlParse import
-- Date: 2026-06-05
--
-- Rationale: ParlParse uses string division IDs of the form
-- "pw-YYYY-MM-DD-N-commons" which don't map directly to our existing
-- Commons Votes API integer division_id. Per user direction (option a),
-- we add (date, number) as a natural key alongside the existing integer ID
-- and keep both. CVA-sourced rows keep their integer division_id; ParlParse
-- rows where no CVA equivalent exists will have division_id = NULL.
--
-- Bills' references to division_id stay valid — nothing existing changes.

BEGIN;

-- 1. Drop the NOT NULL on division_id so parlparse-only rows can have NULL there.
ALTER TABLE mp_division_votes ALTER COLUMN division_id DROP NOT NULL;

-- 2. Add the natural-key columns.
ALTER TABLE mp_division_votes
  ADD COLUMN IF NOT EXISTS division_number integer,
  ADD COLUMN IF NOT EXISTS division_date_only date,
  ADD COLUMN IF NOT EXISTS source text;

-- 3. Backfill the date-only column from existing division_date timestamps.
UPDATE mp_division_votes
  SET division_date_only = division_date::date
  WHERE division_date IS NOT NULL
    AND division_date_only IS NULL;

-- 4. Mark every existing row as Commons Votes API sourced.
UPDATE mp_division_votes
  SET source = 'commons_votes_api'
  WHERE source IS NULL;

-- 5. Drop the old single unique constraint (would break once division_id is nullable).
ALTER TABLE mp_division_votes
  DROP CONSTRAINT IF EXISTS mp_division_votes_member_id_division_id_key;

-- 6. Two partial unique indexes, one per identifier scheme.
--    Both keys coexist; rows can have either or both populated.
CREATE UNIQUE INDEX IF NOT EXISTS mp_division_votes_cva_key
  ON mp_division_votes (member_id, division_id)
  WHERE division_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mp_division_votes_natural_key
  ON mp_division_votes (member_id, division_date_only, division_number)
  WHERE division_date_only IS NOT NULL AND division_number IS NOT NULL;

-- 7. Lookup index for date+number joins (no member_id leading).
CREATE INDEX IF NOT EXISTS idx_mp_division_votes_date_number
  ON mp_division_votes (division_date_only, division_number);

-- 8. Expand vote_type CHECK to allow 'both' (parlparse-only value where an MP
--    walked through both lobbies — rare, usually deliberate abstention by
--    crossing both ways or genuine accident).
ALTER TABLE mp_division_votes
  DROP CONSTRAINT IF EXISTS mp_division_votes_vote_type_check;
ALTER TABLE mp_division_votes
  ADD CONSTRAINT mp_division_votes_vote_type_check
  CHECK (vote_type = ANY (ARRAY['aye', 'no', 'no_vote', 'both']));

-- 9. is_teller flag — parlparse distinguishes 'tellaye'/'tellno' (members who
--    counted votes for their side) from regular ayes/noes. We normalise the
--    vote_type to 'aye'/'no' but keep the teller status on its own column so
--    the original information isn't lost.
ALTER TABLE mp_division_votes
  ADD COLUMN IF NOT EXISTS is_teller boolean DEFAULT false;

COMMIT;

-- Verification — run after commit to confirm shape:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='mp_division_votes'
--   ORDER BY ordinal_position;
-- SELECT COUNT(*) FILTER (WHERE source='commons_votes_api') AS cva,
--        COUNT(*) FILTER (WHERE source IS NULL) AS unknown,
--        COUNT(*) FILTER (WHERE division_date_only IS NOT NULL) AS has_date_only
--   FROM mp_division_votes;
