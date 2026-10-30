-- 2026-10-30e: council by-elections since May 2026 (owner's approval of the design, 30 Oct 2026). A new table,
-- council_byelections, one row per poll, linked to councils by slug. Loaded by scripts/import-council-byelections.js
-- from results read off each council's own declaration or results page; shown on /councils/[slug] under the seats.
-- winner_party and runner_up_party are as written on the declaration. former_party_source says where the former
-- councillor's party came from: 'council' (the council's own page, shown) or 'secondary' (another source, not shown).
-- kind 'postponed_ordinary' is an ordinary election whose poll was postponed from May 2026, not a by-election.
-- No existing table is changed (rule 10). Secured like every table since 2026-10-28j. Undo: 2026-10-30e-UNDO.sql.

BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.council_byelections (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  council_slug             text NOT NULL REFERENCES public.councils (slug),
  ward_name                text NOT NULL,
  poll_date                date NOT NULL,
  kind                     text NOT NULL CHECK (kind IN ('by-election', 'postponed_ordinary')),
  winner_name              text NOT NULL,
  winner_party             text,
  winner_votes             integer CHECK (winner_votes >= 0),
  runner_up_name           text,
  runner_up_party          text,
  runner_up_votes          integer CHECK (runner_up_votes >= 0),
  turnout_pct              numeric(5,2) CHECK (turnout_pct >= 0 AND turnout_pct <= 100),
  declaration_url          text NOT NULL CHECK (declaration_url LIKE 'https://%'),
  former_councillor        text,
  former_party_at_vacancy  text,
  former_party_source      text CHECK (former_party_source IN ('council', 'secondary')),
  vacancy_reason           text,
  notes                    text,
  status                   text NOT NULL CHECK (status IN ('confirmed_council', 'winner_only_council')),
  checked_on               date NOT NULL,
  UNIQUE (council_slug, ward_name, poll_date)
);
COMMENT ON TABLE public.council_byelections IS
  'Council by-elections (and polls postponed from the May 2026 ordinary elections) since May 2026, one row per poll, read from each council''s own declaration of result (declaration_url). Party names as on the declaration. Added by Open Govt.';
ALTER TABLE public.council_byelections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.council_byelections FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.council_byelections_id_seq FROM anon, authenticated;

COMMIT;
