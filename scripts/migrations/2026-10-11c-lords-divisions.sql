-- House of Lords divisions (formal votes) + how each peer voted.
--
-- Source: UK Parliament Lords Votes API (lordsvotes-api.parliament.uk),
-- no API key, live-verified 2026-10-11. 437 divisions since the
-- 4 July 2024 general election at the time of writing.
--
-- The API has no bill link field. The division title is the bill's name
-- (e.g. "Financial Services and Markets Bill [HL]"), so bill_id is
-- resolved by lib/lords-votes.ts: the same title normalisation as
-- scripts/backfill-division-bill-ids.js (Commons), then the division date
-- must fall within that bill's own recorded sitting dates (so a 2025 vote
-- on the "Employment Rights Bill" links to the 2024-25 bill, not the 2009
-- or 2014 bills of the same name). Divisions that aren't on a bill (e.g.
-- motions on regulations), or that still can't be pinned to exactly one
-- bill, keep bill_id NULL rather than being guessed.
--
-- motion_text is amendmentMotionNotes with HTML stripped and entities
-- decoded to plain text, so nothing from the API is ever rendered as
-- markup on the site.
--
-- Counts: content_count / not_content_count are the API's authoritative
-- counts, which include tellers (live-verified: division 3719 has 258
-- authoritative Contents = 256 members + 2 tellers, and the contents
-- array has 258 entries including the tellers). party_breakdown is built
-- from the same arrays, so its totals sum to the authoritative counts.
--
-- Size estimate: ~437 divisions x ~330 votes = ~145k vote rows, roughly
-- 20-25 MB including indexes (database was 1,231 MB on Pro, 8 GB included,
-- before petitions added 43 MB).

CREATE TABLE IF NOT EXISTS public.lords_divisions (
  division_id            integer PRIMARY KEY,   -- Lords Votes API divisionId
  division_date          date NOT NULL,
  division_number        integer,
  title                  text NOT NULL,
  motion_text            text,                  -- amendmentMotionNotes, plain text
  notes_text             text,                  -- notes, plain text
  content_count          integer NOT NULL,      -- authoritative, includes tellers
  not_content_count      integer NOT NULL,      -- authoritative, includes tellers
  is_government_content  boolean,
  is_government_win      boolean,
  is_whipped             boolean,
  -- [{ party, content, not_content }], sorted by total descending
  party_breakdown        jsonb,
  bill_id                integer,               -- bill.id, NULL when no confident match
  synced_at              timestamptz NOT NULL DEFAULT now(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lords_divisions_bill_date
  ON public.lords_divisions (bill_id, division_date DESC);

CREATE INDEX IF NOT EXISTS idx_lords_divisions_date
  ON public.lords_divisions (division_date DESC);

CREATE TABLE IF NOT EXISTS public.lords_division_votes (
  division_id   integer NOT NULL REFERENCES public.lords_divisions (division_id) ON DELETE CASCADE,
  member_id     integer NOT NULL,              -- UK Parliament member id
  member_name   text NOT NULL,
  party         text,
  vote          text NOT NULL CHECK (vote IN ('content', 'not_content')),
  was_teller    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (division_id, member_id)
);

-- Ready for future peer profile pages (not displayed yet).
CREATE INDEX IF NOT EXISTS idx_lords_division_votes_member
  ON public.lords_division_votes (member_id);

-- Read-only public access via the anon key; writes go through the
-- service-role client, which bypasses RLS. Same as petitions/editorials.
ALTER TABLE public.lords_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lords_division_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lords_divisions_anon_read"
  ON public.lords_divisions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "lords_division_votes_anon_read"
  ON public.lords_division_votes
  FOR SELECT
  TO anon
  USING (true);
