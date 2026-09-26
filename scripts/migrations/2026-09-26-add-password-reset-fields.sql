-- Migration: add password-reset fields to users
-- Applied: 2026-09-26
-- Purpose: support two password-reset paths:
--   1. force_password_reset — set true for all existing accounts as part of the
--      emergency incident response (hashes may have been exposed while the
--      anon SELECT policy was open). Login succeeds on correct password but
--      no session is issued until the user sets a new one.
--   2. reset_token / reset_token_sent_at — support the forgot-password email
--      flow. Token is a UUID, one-time use, expires 1 hour after sent.
--
-- Design decisions:
--   - force_password_reset NOT NULL DEFAULT false — every new account starts
--     clean; existing rows get a one-time UPDATE below.
--   - reset_token / reset_token_sent_at nullable — absent on rows that have
--     never requested a reset; cleared to null on use.

ALTER TABLE public.users
  ADD COLUMN force_password_reset boolean NOT NULL DEFAULT false,
  ADD COLUMN reset_token          text,
  ADD COLUMN reset_token_sent_at  timestamptz;

-- Flag every existing account: require a password reset on next login.
UPDATE public.users SET force_password_reset = true;
