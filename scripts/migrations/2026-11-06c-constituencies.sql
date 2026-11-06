-- Applied to production on 6 Nov 2026 at 11:21:22 GMT, with the load, on the owner's yes.
-- Constituency pages (owner, backlog item 15d), this Parliament only. Four new tables; no existing table is touched, and there
-- is no foreign key to mps, because two 2024 winners have no row in it. Public read only. The data is loaded by
-- scripts/load-constituencies.py, which runs this file and the load in one transaction, so this file alone leaves empty tables.
-- constituency_mp_terms is a fourth table beyond the three in the brief: every MP since 2024 with official dates and end
-- reason cannot come from mps (Gwynne and Amesbury have no row, and Farage has two terms).
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.constituencies (
  ons_code text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  nation text NOT NULL,
  region text,                         -- blank outside England, as in the source
  parliament_id integer NOT NULL UNIQUE,
  electorate integer NOT NULL,         -- this and the next six: the 2024 general election
  valid_votes integer NOT NULL,
  invalid_votes integer NOT NULL,
  turnout_pct numeric(5,2) NOT NULL,   -- valid votes divided by electorate, as the Commons Library defines it
  majority integer NOT NULL,
  majority_pct numeric(5,2) NOT NULL,
  result_summary text NOT NULL,
  result_url text NOT NULL,
  councils jsonb NOT NULL,             -- [{code, name, slug}] from the ONS ward lookup, May 2025: overlaps, not shares
  county jsonb                         -- {code, name, slug} where there is a county council
);

CREATE TABLE public.constituency_byelections (
  election_id integer PRIMARY KEY,     -- the Commons Library's id, the last part of url
  ons_code text NOT NULL REFERENCES public.constituencies (ons_code),
  election_date date NOT NULL,
  writ_issued date,
  electorate integer NOT NULL,
  valid_votes integer NOT NULL,
  invalid_votes integer NOT NULL,
  turnout_pct numeric(5,2) NOT NULL,
  majority integer NOT NULL,           -- from the votes; Arbroath and Broughty Ferry is 5,278, as the Members API has it
  majority_official_page integer,      -- as printed on the results page; Arbroath and Broughty Ferry prints 5,178
  result_summary text NOT NULL,
  url text NOT NULL
);
CREATE INDEX constituency_byelections_ons_code_idx ON public.constituency_byelections (ons_code);

CREATE TABLE public.constituency_election_results (
  election_id integer NOT NULL,        -- the Commons Library's id, for the 2024 result or a byelection
  position smallint NOT NULL,
  ons_code text NOT NULL REFERENCES public.constituencies (ons_code),
  election_kind text NOT NULL CHECK (election_kind IN ('general', 'byelection')),
  election_date date NOT NULL,
  given_name text,
  family_name text NOT NULL,
  member_id integer,
  party text NOT NULL,
  party_abbreviation text,
  adjunct_party text,
  votes integer NOT NULL,
  share_pct numeric(5,2) NOT NULL,     -- from the votes
  share_official numeric,              -- as published; some byelection shares are cut to three decimal places
  share_change_official numeric,
  is_sitting_mp boolean,
  is_former_mp boolean,
  PRIMARY KEY (election_id, position)
);
CREATE INDEX constituency_election_results_ons_code_idx ON public.constituency_election_results (ons_code);

CREATE TABLE public.constituency_mp_terms (
  ons_code text NOT NULL REFERENCES public.constituencies (ons_code),
  member_id integer NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  end_reason text,                     -- Parliament's words from the Members API, or null where it records none
  end_reason_notes text,
  source text NOT NULL,
  PRIMARY KEY (ons_code, member_id, start_date)
);

ALTER TABLE public.constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_byelections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_election_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constituency_mp_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY constituencies_public_read ON public.constituencies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY constituency_byelections_public_read ON public.constituency_byelections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY constituency_election_results_public_read ON public.constituency_election_results FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY constituency_mp_terms_public_read ON public.constituency_mp_terms FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.constituencies, public.constituency_byelections, public.constituency_election_results, public.constituency_mp_terms FROM anon, authenticated;
GRANT SELECT ON public.constituencies, public.constituency_byelections, public.constituency_election_results, public.constituency_mp_terms TO anon, authenticated;
COMMIT;
