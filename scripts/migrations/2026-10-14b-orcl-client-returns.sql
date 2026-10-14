-- Consultant lobbyists and their clients, from the Registrar of Consultant Lobbyists (ORCL)
-- quarterly returns: one row per quarter, lobbying firm and client. Clients are linked to
-- the lobbying index (lobby_orgs) through the same reviewed spellings as ministers' meetings,
-- so the Lobbying page can show which organisations both meet ministers and pay lobbyists.
--
-- Rebuilt in full by scripts/import-orcl-returns.js (dry run by default).
-- Source: registrarofconsultantlobbyists.org.uk, Quarterly Return Reports.
-- Content available under the Open Government Licence v3.0.
--
-- The old lobbyist_register table is left untouched; nothing on the site reads it.

\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.orcl_client_returns (
  id             bigserial PRIMARY KEY,
  quarter_start  date NOT NULL,            -- first day of the quarter the return covers
  quarter_label  text NOT NULL,            -- e.g. 'April to June 2026'
  firm_name      text NOT NULL,            -- "Registered organisation name", as published
  firm_norm      text NOT NULL,
  client_name    text NOT NULL,            -- "Client name", as published
  client_norm    text NOT NULL,            -- normalised spelling used for matching
  client_org_id  bigint REFERENCES public.lobby_orgs(id) ON DELETE SET NULL,
  match_type     text NOT NULL CHECK (match_type IN ('alias', 'unmatched', 'excluded')),
  source_url     text NOT NULL,            -- the published CSV or Excel file
  source_page    text NOT NULL,            -- the Registrar page that links to it
  built_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quarter_start, firm_norm, client_norm),
  CHECK (EXTRACT(DAY FROM quarter_start) = 1 AND EXTRACT(MONTH FROM quarter_start) IN (1, 4, 7, 10))
);
CREATE INDEX IF NOT EXISTS orcl_client_returns_org_idx ON public.orcl_client_returns (client_org_id);
CREATE INDEX IF NOT EXISTS orcl_client_returns_firm_idx ON public.orcl_client_returns (firm_norm);
CREATE INDEX IF NOT EXISTS orcl_client_returns_quarter_idx ON public.orcl_client_returns (quarter_start);

ALTER TABLE public.orcl_client_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orcl_client_returns_public_read ON public.orcl_client_returns;
CREATE POLICY orcl_client_returns_public_read ON public.orcl_client_returns FOR SELECT TO anon, authenticated USING (true);

-- Self-check.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orcl_client_returns' AND policyname = 'orcl_client_returns_public_read') THEN
    RAISE EXCEPTION 'public read policy missing';
  END IF;
END $$;

COMMIT;
