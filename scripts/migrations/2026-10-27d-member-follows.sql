-- 2026-10-27d: member follows, weekly digest and saved searches (report 72 section 4; owner's approval "approve member
-- plan", 25 Oct 2026, job 74). The download log is left out: the owner dropped downloads.
--
-- Access: the site has its own users table and session cookie (lib/session.ts), not Supabase Auth, so auth.uid() is
-- always empty. Every table below has row level security on with no policies, and anon and authenticated have no
-- rights on it, so only the service role (the site's server routes) can read or write. The routes filter every query
-- by the signed in member's id from getSessionUserId() (lib/member-data.ts).
--
-- mp_expenses_detail.first_seen_at: when a claim line first appeared, for "new expenses claim" in the digest. A
-- constant default, so adding it rewrites no rows; existing rows get this migration's time and are never alerted on.
-- scripts/sync-ipsa-expenses-detail.js keeps the time across its delete and reload of a year.
-- Undo: 2026-10-27d-UNDO.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

DO $$ BEGIN
  IF to_regclass('public.member_alert_settings') IS NOT NULL THEN RAISE EXCEPTION 'member_alert_settings already exists'; END IF;
  IF to_regclass('public.member_follows') IS NOT NULL THEN RAISE EXCEPTION 'member_follows already exists'; END IF;
  IF to_regclass('public.saved_searches') IS NOT NULL THEN RAISE EXCEPTION 'saved_searches already exists'; END IF;
  IF to_regclass('public.alert_log') IS NOT NULL THEN RAISE EXCEPTION 'alert_log already exists'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_expenses_detail' AND column_name = 'first_seen_at') THEN
    RAISE EXCEPTION 'mp_expenses_detail.first_seen_at already exists';
  END IF;
END $$;

-- One row per member who has agreed to follows: the explicit consent (the time they ticked the box at their first
-- follow or saved search), the digest setting, the day of the week their digest goes, and the hash of their one
-- click unsubscribe token.
CREATE TABLE public.member_alert_settings (
  user_id bigint PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'off')),
  send_day smallint NOT NULL CHECK (send_day BETWEEN 0 AND 6),
  unsubscribe_token_hash text NOT NULL,
  consented_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_alert_settings_token_idx ON public.member_alert_settings (unsubscribe_token_hash);

CREATE TABLE public.member_follows (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('mp', 'donor', 'bill', 'organisation')),
  target_key text NOT NULL CHECK (length(target_key) BETWEEN 1 AND 120),
  target_label text NOT NULL CHECK (length(target_label) BETWEEN 1 AND 300),
  last_state jsonb,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, target_key)
);
CREATE INDEX member_follows_target_idx ON public.member_follows (kind, target_key);

CREATE TABLE public.saved_searches (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 120),
  query text NOT NULL CHECK (length(query) BETWEEN 2 AND 200),
  filters jsonb NOT NULL DEFAULT '{}',
  alert boolean NOT NULL DEFAULT false,
  seen_keys text[] NOT NULL DEFAULT '{}' CHECK (cardinality(seen_keys) <= 200),
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_searches_user_idx ON public.saved_searches (user_id);

-- One row per member per digest day. status 'sent' rows on a day are the daily cap count (60, lib/member-digest.ts).
-- Kept 12 months (the digest cron removes older rows). A deleted account leaves its rows without the member.
CREATE TABLE public.alert_log (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES public.users(id) ON DELETE SET NULL,
  digest_date date NOT NULL,
  items integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('sent', 'nothing_new', 'budget_reached', 'failed')),
  resend_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, digest_date)
);
CREATE INDEX alert_log_day_status_idx ON public.alert_log (digest_date, status);

ALTER TABLE public.member_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_alert_settings, public.member_follows, public.saved_searches, public.alert_log FROM anon, authenticated, PUBLIC;
REVOKE ALL ON SEQUENCE public.member_follows_id_seq, public.saved_searches_id_seq, public.alert_log_id_seq FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_alert_settings, public.member_follows, public.saved_searches, public.alert_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.member_follows_id_seq, public.saved_searches_id_seq, public.alert_log_id_seq TO service_role;

ALTER TABLE public.mp_expenses_detail ADD COLUMN first_seen_at timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN public.mp_expenses_detail.first_seen_at IS 'When the claim line first appeared (migration 2026-10-27d); kept across reloads by scripts/sync-ipsa-expenses-detail.js';

COMMIT;
