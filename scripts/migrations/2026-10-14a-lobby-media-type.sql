-- Lobbying index: add 'media' as an organisation type, so newspapers and broadcasters that
-- meet ministers (mostly interviews) are kept and shown separately from lobbyists rather
-- than excluded. Decided by the site owner, 14 Oct 2026.

\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE public.lobby_orgs DROP CONSTRAINT IF EXISTS lobby_orgs_org_type_check;
ALTER TABLE public.lobby_orgs ADD CONSTRAINT lobby_orgs_org_type_check CHECK (org_type IN ('company', 'trade_body', 'union', 'charity', 'public_body', 'campaign', 'think_tank', 'professional_body', 'academic', 'media', 'other'));
-- Self-check: the new rule is in place.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lobby_orgs_org_type_check' AND pg_get_constraintdef(oid) LIKE '%media%') THEN
    RAISE EXCEPTION 'media type not added';
  END IF;
END $$;
COMMIT;
