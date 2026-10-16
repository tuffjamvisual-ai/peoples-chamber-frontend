-- Email-only newsletter sign-up (audit reassessment, 16 Oct 2026: the homepage newsletter
-- link opened account registration, asking for a name and password just to get an email).
-- One row per address. An address is added as 'pending', becomes 'confirmed' only when its
-- owner clicks the link in the confirmation email (so nobody can sign up someone else), and
-- 'unsubscribed' from the link in any email. Read and written only by the server
-- (service role): RLS is on with no policies, so the public anon key cannot see addresses.

\set ON_ERROR_STOP on
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id               bigserial PRIMARY KEY,
  email            text NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  token            uuid NOT NULL DEFAULT gen_random_uuid(),
  source           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_sent_at     timestamptz,
  confirmed_at     timestamptz,
  unsubscribed_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key ON public.newsletter_subscribers (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_token_key ON public.newsletter_subscribers (token);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;
SELECT count(*) AS rows, relrowsecurity AS rls_on
  FROM public.newsletter_subscribers, pg_class WHERE pg_class.oid = 'public.newsletter_subscribers'::regclass GROUP BY relrowsecurity;
