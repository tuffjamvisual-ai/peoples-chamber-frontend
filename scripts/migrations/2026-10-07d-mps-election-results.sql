-- Migration: MP latest election result (majority)
-- Date: 2026-10-07
--
-- Adds the MP's latest general election result to the mps table, so the
-- welfare explorer's constituency results card can show "majority N" the
-- same way TPA's own tool does.
--
-- SOURCE: UK Parliament Members API, GET
-- /api/Location/Constituency/{constituency_id}/ElectionResults, where
-- {constituency_id} is mps.constituency_id (already populated from the
-- Members API's own membershipFromId — see app/api/sync-mp-roster/route.ts
-- line ~82). Confirmed via a live test query (Manchester Central,
-- constituency_id 4167): the response's value[0] carries a top-level
-- `majority` field directly (13797), plus `result` ("Lab Hold"),
-- `winningParty`, `electionTitle` ("2024 General Election") and
-- `electionDate`. Same API family already used by sync-mp-parties and
-- sync-mp-roster, licensed under the Open Parliament Licence v3.0 — the
-- same source TPA's own "Data Sources" panel discloses for "Parliamentary
-- information".
--
-- No RLS change needed — mps already has no RLS policy restricting reads
-- of these public fields (consistent with its other columns).

BEGIN;

ALTER TABLE public.mps
  ADD COLUMN IF NOT EXISTS latest_election_majority integer,
  ADD COLUMN IF NOT EXISTS latest_election_result   text,   -- e.g. "Lab Hold", "Con Gain from Lab"
  ADD COLUMN IF NOT EXISTS latest_election_title     text,   -- e.g. "2024 General Election"
  ADD COLUMN IF NOT EXISTS latest_election_date       date;

COMMIT;
