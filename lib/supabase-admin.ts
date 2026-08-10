import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service-role Supabase client for TRUSTED server-side writes/reads in API
// routes only. It bypasses Row Level Security, so it must never be imported
// into a client component. The key is a server-only env var (no NEXT_PUBLIC_
// prefix), so it is never included in the browser bundle.
//
// Why this is needed: the app uses custom `users`-table auth, not Supabase
// Auth, so the anon client has no JWT `sub`. The RLS policies on `vote` /
// `poll_vote` are keyed on that `sub`, which means the anon client can neither
// read a user's own votes nor read back an inserted row — every vote insert
// failed with a 42501 RLS error. The API validates the user itself (exists,
// email-verified, not already voted), so it is the correct trusted writer.
//
// Created lazily via a Proxy so the client is only instantiated on first use
// (request time, when the runtime env is present), not at build/import time —
// otherwise `next build` fails with "supabaseKey is required" because the
// service key isn't available during the build step.
let client: SupabaseClient | null = null;
function get(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = get() as unknown as Record<string | symbol, unknown>;
    const value = c[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(c) : value;
  },
});
