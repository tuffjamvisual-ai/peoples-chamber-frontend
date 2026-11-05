// The owner's private draft preview (owner, 5 Nov 2026), /preview/briefings, /preview/editorials, /preview/programmes. Checked
// on the server only. To see a draft, a visitor needs a valid session from the site's own sign in, a verified email, and
// that email on the list in the PREVIEW_OWNER_EMAILS environment variable (comma separated, set in Vercel, never in the
// code). A list that is not set lets nobody in. Everyone else gets a real 404 with nothing of the draft in the response,
// so the question is asked before any draft is read.
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';
import { supabaseAdminRead } from './supabase-admin';

export const isDraftViewer = cache(async (): Promise<boolean> => {
  const allowed = (process.env.PREVIEW_OWNER_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return false;
  const store = await cookies();
  const userId = await verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) return false;
  const { data, error } = await supabaseAdminRead.from('users').select('email, email_verified').eq('id', userId).maybeSingle();
  // email_verified matters: without it, anyone who signed up with the owner's address before the owner would pass.
  if (error || !data?.email || data.email_verified !== true) return false;
  return allowed.includes(String(data.email).trim().toLowerCase());
});

export async function requireDraftViewer(): Promise<void> {
  if (!(await isDraftViewer())) notFound();
}

// Never indexed, never followed. A page rendered here is dynamic because it reads the session cookie, so nothing caches it.
export const PREVIEW_ROBOTS: Metadata['robots'] = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };

export type DraftBriefingRow = {
  slug: string; headline: string; body: string; sources: unknown; is_published: boolean; published_at: string | null; created_at: string;
};

export async function readBriefingAnyState(slug: string): Promise<DraftBriefingRow | null> {
  const { data, error } = await supabaseAdminRead.from('briefings').select('slug, headline, body, sources, is_published, published_at, created_at').eq('slug', slug).maybeSingle();
  if (error && error.code !== 'PGRST116') throw new Error(`draft preview briefings: ${error.message}`);
  return (data as DraftBriefingRow) ?? null;
}
