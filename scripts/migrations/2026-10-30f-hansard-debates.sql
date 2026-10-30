-- 2026-10-30f: debates from our own database, Stage 1, storage (owner's approval, 30 Oct 2026, including this
-- production change). Additive only (rule 10): one new table and four new nullable columns with one index on
-- hansard_contributions; nothing is dropped, renamed, retyped or tightened, so the code on main (which writes
-- hansard_contributions without these columns) keeps working unchanged.
-- Needs: app/api/sync-parliament-archive/route.ts from the Stage 1 commit (it writes hansard_debates and the new
-- columns). The debate page does not read any of this yet (Stage 2).
-- Undo: 2026-10-30f-UNDO.sql (drops hansard_debates, the index and the four columns).
-- Secured like every table since the Phase 2 lock down (2026-10-28j): row level security on, no policies, nothing
-- granted to anon or authenticated, so only the server key (service role) can read or write it.

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

-- a. One row per Hansard debate record (leaf debates, parent headings and sitting headers), from the Overview of
--    debates/debate/<guid>.json and the day's section trees. Ids are stored in upper case, as the page links them.
CREATE TABLE public.hansard_debates (
  guid         text PRIMARY KEY,          -- Hansard debate ExtId, upper case
  house        text,
  sitting_date date,
  title        text,
  location     text,                      -- Overview.Location ("Commons Chamber", "Westminster Hall")
  parent_guid  text,                      -- the parent heading in the day's section tree; null for a sitting header
  position     int,                       -- position among its parent's children, from 0, in the tree's order
  prev_guid    text,
  prev_title   text,
  next_guid    text,
  next_title   text,
  fetched_at   timestamptz,
  settled_at   timestamptz,               -- set once the debate is 14 days old; no daily re-fetch after that
  gone_at      timestamptz,               -- Hansard answered 400 or 404 for this id
  incomplete   boolean NOT NULL DEFAULT false  -- the record had something the archive could not store
);
CREATE INDEX hansard_debates_parent_idx ON public.hansard_debates (parent_guid, position);
CREATE INDEX hansard_debates_date_idx ON public.hansard_debates (sitting_date);
COMMENT ON TABLE public.hansard_debates IS
  'Commons debate records (overview, previous and next, parent links). Source: UK Parliament Hansard API (hansard-api.parliament.uk). Contains Parliamentary information licensed under the Open Parliament Licence v3.0.';

-- b. What the page needs from each item: its place in the debate, its type, the speaker label and the HTML.
ALTER TABLE public.hansard_contributions
  ADD COLUMN item_order    int,           -- index of the item in the record's Items, the order the page shows
  ADD COLUMN item_type     text,          -- 'Contribution' or 'Division'
  ADD COLUMN attributed_to text,          -- Hansard AttributedTo, the speaker label
  ADD COLUMN value_html    text;          -- Hansard Value, as published
CREATE INDEX hansard_contributions_debate_order_idx ON public.hansard_contributions (debate_ext_id, item_order);

-- c. Row level security on, no policies, nothing granted to the public roles.
ALTER TABLE public.hansard_debates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hansard_debates FROM anon, authenticated;

COMMIT;
