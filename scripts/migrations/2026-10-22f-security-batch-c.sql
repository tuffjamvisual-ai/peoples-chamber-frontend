-- 2026-10-22f: security batch C (owner's approval, 22 Oct 2026).
--  1. users.session_version (integer, default 0) goes into every signed session cookie. Password reset,
--     password change and logout raise it through bump_session_version(), so older cookies stop working.
--  2. Reset and verification tokens are now stored as SHA-256 hashes (hex). Tokens already sent are
--     hashed in place, so links already in people's inboxes keep working until they expire.
-- The backup table records which rows held a token and when it was sent, not the token values: keeping
-- plain tokens would defeat the change, and anyone affected can request a new link.
\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.users_tokens_backup_20261022') IS NOT NULL THEN RAISE EXCEPTION 'backup table already exists'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'session_version') THEN
    RAISE EXCEPTION 'users.session_version already exists';
  END IF;
  -- Refuse to hash twice: a stored value that is already 64 hex characters would mean this already ran.
  IF EXISTS (SELECT 1 FROM public.users WHERE verification_token ~ '^[0-9a-f]{64}$' OR reset_token ~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'tokens already look hashed';
  END IF;
END $$;

CREATE TABLE public.users_tokens_backup_20261022 AS
  SELECT id AS user_id, verification_token IS NOT NULL AS had_verification_token, verification_sent_at,
         reset_token IS NOT NULL AS had_reset_token, reset_token_sent_at, now() AS backed_up_at
  FROM public.users
  WHERE verification_token IS NOT NULL OR reset_token IS NOT NULL;
ALTER TABLE public.users_tokens_backup_20261022 ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ADD COLUMN session_version integer NOT NULL DEFAULT 0;

CREATE FUNCTION public.bump_session_version(p_user_id bigint)
RETURNS integer
LANGUAGE sql
SET search_path = public, pg_temp
AS $fn$
  UPDATE public.users SET session_version = session_version + 1 WHERE id = p_user_id RETURNING session_version;
$fn$;
REVOKE EXECUTE ON FUNCTION public.bump_session_version(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_session_version(bigint) TO service_role;

UPDATE public.users SET verification_token = encode(sha256(convert_to(verification_token, 'UTF8')), 'hex')
  WHERE verification_token IS NOT NULL;
UPDATE public.users SET reset_token = encode(sha256(convert_to(reset_token, 'UTF8')), 'hex')
  WHERE reset_token IS NOT NULL;

DO $$ DECLARE b int; v int; r int; BEGIN
  SELECT count(*) INTO b FROM public.users_tokens_backup_20261022;
  SELECT count(*) INTO v FROM public.users WHERE verification_token IS NOT NULL AND verification_token !~ '^[0-9a-f]{64}$';
  SELECT count(*) INTO r FROM public.users WHERE reset_token IS NOT NULL AND reset_token !~ '^[0-9a-f]{64}$';
  IF v + r <> 0 THEN RAISE EXCEPTION '% tokens not hashed', v + r; END IF;
  IF (SELECT count(*) FROM public.users WHERE session_version <> 0) <> 0 THEN RAISE EXCEPTION 'session_version not defaulted to 0'; END IF;
  RAISE NOTICE 'rows with a token backed up: %', b;
END $$;

SELECT (SELECT count(*) FROM public.users) AS users,
       (SELECT count(*) FROM public.users_tokens_backup_20261022 WHERE had_verification_token) AS verification_tokens_hashed,
       (SELECT count(*) FROM public.users_tokens_backup_20261022 WHERE had_reset_token) AS reset_tokens_hashed;

COMMIT;
