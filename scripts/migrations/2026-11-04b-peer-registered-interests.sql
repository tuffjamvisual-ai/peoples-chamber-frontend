-- 2026-11-04b: peer_registered_interests, the House of Lords register of interests from Parliament's Members API
-- (/api/Members/{id}/RegisteredInterests), for every peer in the peers table, current and former (owner's go, 4 Nov
-- 2026). Modelled on mp_registered_interests, without its donation columns and search column: the Lords register has no
-- structured donor fields, and nothing searches this table yet. Filled by scripts/sync-peer-interests.js; read by
-- /lords/[id]. Entries no longer on the register are kept with is_current false. Same access as peers: row level
-- security on, no public grants, read and written with the service role key.
-- Undo: 2026-11-04b-peer-registered-interests-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-04b-peer-registered-interests.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;  -- explicit: the transaction pooler can hand out a connection left with a read-only default
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.peer_registered_interests') IS NOT NULL THEN RAISE EXCEPTION 'peer_registered_interests already exists'; END IF;
END $$;

CREATE TABLE public.peer_registered_interests (
  id                  bigserial PRIMARY KEY,
  member_id           integer NOT NULL REFERENCES public.peers (member_id) ON DELETE CASCADE,
  category_id         integer NOT NULL,                    -- the API's category id
  category_name       text NOT NULL,                       -- "Category 1: Remunerated employment etc."
  category_sort_order integer,
  interest_id         integer NOT NULL,                    -- the API's interest id
  interest_text       text NOT NULL,
  child_interests     jsonb,                               -- items under an entry: [{ id, interest, createdWhen, ... }]
  created_when        timestamp without time zone,
  last_amended_when   timestamp without time zone,
  is_correction       boolean NOT NULL DEFAULT false,
  is_current          boolean NOT NULL DEFAULT true,       -- false once it has left the register
  first_seen_date     date NOT NULL DEFAULT CURRENT_DATE,  -- the sync never sets this, so it stays the first day seen
  last_seen_date      date NOT NULL DEFAULT CURRENT_DATE,  -- the last sync that found it on the register
  source              text NOT NULL DEFAULT 'members-api',
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, interest_id)
);
CREATE INDEX peer_registered_interests_current_idx ON public.peer_registered_interests (member_id, is_current);
CREATE INDEX peer_registered_interests_last_seen_idx ON public.peer_registered_interests (last_seen_date DESC);

ALTER TABLE public.peer_registered_interests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.peer_registered_interests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_registered_interests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.peer_registered_interests_id_seq TO service_role;

COMMIT;
