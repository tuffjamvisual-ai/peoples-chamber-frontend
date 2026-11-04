-- 2026-11-04d: "Also see" links between a lobbying registry page with no Companies House number and a company page
-- (owner, 4 Nov 2026). A link keeps the two pages and their records separate: nothing is merged, and lobby_orgs is not
-- changed. Rows come only from scripts/link-organisations.js, which needs a reviewed registry spelling on a record
-- carrying the number and a matching check at Companies House. Never by name alone.
-- Undo: 2026-11-04d-organisation-links-UNDO.sql.
-- Run: psql "$DATABASE_URL" -f scripts/migrations/2026-11-04d-organisation-links.sql
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.organisation_links (
  lobby_org_id    bigint PRIMARY KEY REFERENCES public.lobby_orgs(id) ON DELETE CASCADE,
  company_number  text NOT NULL UNIQUE,
  matched_spelling text NOT NULL,   -- the reviewed registry spelling, as normalised
  ch_name         text NOT NULL,    -- the name at Companies House that it matched, current or former
  ch_status       text NOT NULL,
  checked_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organisation_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY organisation_links_public_read ON public.organisation_links FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.organisation_links TO anon, authenticated;
GRANT ALL ON public.organisation_links TO service_role;

COMMIT;
