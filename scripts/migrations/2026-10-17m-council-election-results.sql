-- Council election results, collected from each council's own results pages or declarations
-- (7 May 2026 first). Loaded by scripts/import-council-election-results.js from the reviewed
-- batch CSVs; nothing is loaded until the complete file has been reviewed.
--
-- council_gss_code is not a foreign key to councils: East Surrey and West Surrey held elections
-- on 7 May 2026 but are not yet in the councils table.
--
-- party_names maps each party name exactly as published on a ballot paper to one standard party.
-- party_id is our own key for that standard party (e.g. 'labour-coop'); parties_slug links it to
-- the parties table where we have a page for it (Labour and Co-operative links to 'labour').
--
-- ward_code is the ward's GSS code where ONS has issued one (ward_code_source 'gss'). Wards and
-- divisions first used in 2026 (Norfolk, Suffolk, Essex, East Surrey, West Surrey) have no GSS code
-- yet; they use Democracy Club's division code, e.g. 'NFK:hingham' (ward_code_source
-- 'democracy-club'). When ONS issues the GSS codes, update ward_code and set ward_code_source to 'gss'.

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE public.party_names (
  published_name text PRIMARY KEY,                       -- exactly as on the ballot paper
  party_id       text NOT NULL,                          -- standard party key, e.g. 'conservative', 'labour-coop'
  party_name     text NOT NULL,                          -- name on the Electoral Commission register, e.g. 'Conservative and Unionist Party'
  parties_slug   text REFERENCES public.parties(slug) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX party_names_party_id_idx ON public.party_names (party_id);

CREATE TABLE public.council_elections (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  council_gss_code text NOT NULL,
  election_date    date NOT NULL,
  wards_contested  smallint NOT NULL CHECK (wards_contested > 0),
  seats_contested  smallint NOT NULL CHECK (seats_contested >= wards_contested),
  turnout_pct      numeric(5,2) CHECK (turnout_pct BETWEEN 0 AND 100), -- electorate weighted, from ward totals
  source_note      text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (council_gss_code, election_date)
);
CREATE INDEX council_elections_council_gss_code_idx ON public.council_elections (council_gss_code);

CREATE TABLE public.council_election_wards (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id      bigint NOT NULL REFERENCES public.council_elections(id) ON DELETE CASCADE,
  ward_code        text NOT NULL,                        -- GSS code, or Democracy Club's code where no GSS code exists
  ward_code_source text NOT NULL CHECK (ward_code_source IN ('gss', 'democracy-club')),
  ward_name        text NOT NULL,
  seats            smallint NOT NULL CHECK (seats > 0),
  electorate       integer CHECK (electorate > 0),
  turnout_pct      numeric(5,2) CHECK (turnout_pct BETWEEN 0 AND 100), -- as published; null when not published, or when it
                                                         -- differs from the council's own ballot figures by more than 1 point
  ballots_rejected integer CHECK (ballots_rejected >= 0),
  source_url       text NOT NULL,
  UNIQUE (election_id, ward_code),
  CHECK (ward_code_source <> 'gss' OR ward_code ~ '^[EWSN][0-9]{8}$')
);
CREATE INDEX council_election_wards_election_id_idx ON public.council_election_wards (election_id);
CREATE INDEX council_election_wards_ward_code_idx ON public.council_election_wards (ward_code);

CREATE TABLE public.council_election_candidates (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ward_id             bigint NOT NULL REFERENCES public.council_election_wards(id) ON DELETE CASCADE,
  candidate_published text NOT NULL,                      -- exactly as published
  candidate_display   text NOT NULL,                      -- "Forename Surname"
  party_published     text,                               -- exactly as published; null for no description
  party_id            text NOT NULL,                      -- from party_names; 'no-description' when the ballot paper gave none
  votes               integer NOT NULL CHECK (votes >= 0),
  share_pct           numeric(5,2) NOT NULL CHECK (share_pct BETWEEN 0 AND 100), -- votes / all votes cast in the ward
  elected             boolean NOT NULL
);
CREATE INDEX council_election_candidates_ward_id_idx ON public.council_election_candidates (ward_id);
CREATE INDEX council_election_candidates_party_id_idx ON public.council_election_candidates (party_id);

-- Row level security: anyone may read; only the service role (which bypasses RLS) may write.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['party_names', 'council_elections', 'council_election_wards', 'council_election_candidates'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t || '_public_read', t);
  END LOOP;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('party_names', 'council_elections', 'council_election_wards', 'council_election_candidates')
     AND cmd = 'SELECT';
  IF n <> 4 THEN RAISE EXCEPTION 'expected 4 read policies, found %', n; END IF;
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('party_names', 'council_elections', 'council_election_wards', 'council_election_candidates')
     AND cmd <> 'SELECT';
  IF n <> 0 THEN RAISE EXCEPTION 'unexpected write policies: %', n; END IF;
END $$;

COMMIT;
