-- EMERGENCY: drop anon SELECT and INSERT policies on users
-- Applied: 2026-09-26
--
-- FINDING: "Users can only see their own data" (SELECT, USING(true)) was
-- exposing every column of every row in users — including bcrypt password
-- hashes, verification_token, is_admin, email — to anyone with the public
-- NEXT_PUBLIC_SUPABASE_ANON_KEY via a direct GET /rest/v1/users?select=*
-- call. The anon key is baked into every page's JS bundle (NEXT_PUBLIC_
-- prefix), so it must be treated as fully public.
--
-- "Users can insert own data" (INSERT, WITH CHECK(true)) allowed direct
-- POST /rest/v1/users with arbitrary column values — including is_admin:true
-- — bypassing all validation in the signup route.
--
-- FIX: drop both policies. All legitimate reads/writes go through the
-- supabaseAdmin (service role) client in API routes, which bypasses RLS
-- entirely. The anon client no longer touches the users table at all.
-- app/api/auth/login/route.ts and app/api/auth/me/route.ts switched to
-- supabaseAdmin in the same commit.
--
-- VERIFIED: GET /rest/v1/users?select=* now returns [].
-- VERIFIED: POST /rest/v1/users returns 42501 RLS violation.

DROP POLICY "Users can only see their own data" ON public.users;
DROP POLICY "Users can insert own data" ON public.users;
