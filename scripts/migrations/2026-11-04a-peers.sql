-- 2026-11-04a: peers, every member of the House of Lords, current and former, from Parliament's Members API (owner's
-- yes, 3 Nov 2026). Keyed by Parliament's member id (the same id lords_division_votes.member_id and
-- parliament_written_questions.asking_member_id use). Filled by scripts/load-peers.ts (first load) and kept current by
-- /api/sync-peers (the list weekly, posts daily), both through lib/peers.ts. Read by /lords, /lords/[id] and
-- /lords/[id]/questions. Same access as the site's other tables: row level security on, no public grants, read and
-- written with the service role key.
-- Undo: 2026-11-04a-peers-UNDO.sql. Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-04a-peers.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.peers') IS NOT NULL THEN RAISE EXCEPTION 'peers already exists'; END IF;
END $$;

CREATE TABLE public.peers (
  member_id             integer PRIMARY KEY,           -- Parliament's member id
  name_display          text NOT NULL,                 -- "Baroness Adams of Craigielea"
  name_list_as          text,                          -- "Adams of Craigielea, B."
  name_full_title       text,                          -- "The Baroness Adams of Craigielea"
  gender                text,
  party                 text,                          -- latest party, as Parliament names it
  party_id              integer,
  party_colour          text,                          -- hex without '#', as the API gives it
  peerage_type          text,                          -- membershipFrom: Life peer, Hereditary, Bishops, ...
  peerage_type_id       integer,
  start_date            date,                          -- latest Lords membership start ("Sitting since")
  end_date              date,                          -- null while a member
  end_reason            text,
  status                text,                          -- Current Member, Leave of Absence, Suspended, Disqualified, ...
  is_current            boolean NOT NULL,              -- no end date
  thumbnail_url         text,                          -- Parliament's official thumbnail
  government_posts      jsonb,                         -- Members API Biography: [{ name, startDate, endDate }]
  opposition_posts      jsonb,
  other_posts           jsonb,
  committee_memberships jsonb,
  posts_checked_at      timestamptz,                   -- when the Biography was last read
  synced_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX peers_current_idx ON public.peers (is_current, name_list_as);
CREATE INDEX peers_party_idx ON public.peers (party);
CREATE INDEX peers_type_idx ON public.peers (peerage_type);
CREATE INDEX peers_posts_checked_idx ON public.peers (posts_checked_at NULLS FIRST);

ALTER TABLE public.peers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.peers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peers TO service_role;

COMMIT;
