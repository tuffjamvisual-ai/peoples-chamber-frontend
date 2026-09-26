-- Migration: add pending_return_to to users
-- Applied: 2026-09-26
-- Purpose: preserve the returnTo path across the email verification gap.
--          When a user signs up from a gated page (bill vote, poll), the
--          returnTo is stored here so the verify route can redirect them
--          back to where they came from after confirming their email —
--          instead of always dumping them at /.
--
-- Design decisions:
--   - Nullable, no DEFAULT. Existing rows unaffected.
--   - Cleared back to NULL by the verify route immediately after reading,
--     so it acts as a one-shot carry, not a durable preference.
--   - Only a safe relative path (starts with /, not //) is stored;
--     the signup route validates before write.

ALTER TABLE public.users
  ADD COLUMN pending_return_to text;
