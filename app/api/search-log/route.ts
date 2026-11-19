// POST /api/search-log: one search, from the search pages' SearchLog (owner approved, Cowork ENTRY 375 item 2).
// Body (JSON, sent as text by navigator.sendBeacon): { "term": "...", "box": "site", "results": 12 }. Stored in
// public.search_terms (migration 2026-11-19c): the cleaned term (lib/search-terms.ts: lower case, at most 100
// characters; an email address or phone number is dropped, a full postcode cut to its outward code), the box, the start
// of the current hour (UTC) and the result count. Nothing else: this route never reads the IP address, user agent,
// cookies or account (the site wide proxy.ts rate limit by IP runs before every /api route, in memory only, as before).
// The table has row level security with no policies, so only this route (the service key) writes it.
// POST only; body at most 2 KB; at most 60 searches a minute per server instance; always 204, never cached.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { searchLogRow } from '@/lib/search-terms';

export const dynamic = 'force-dynamic'; // a POST receiver, never a page (A16 covers pages and layouts, not API routes)

const MAX_BYTES = 2 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_IN_WINDOW = 60;
const recent: number[] = [];
const NO_CONTENT = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });

export async function POST(req: Request) {
  // Another site's page cannot post searches here (the browser marks such a request cross-site).
  if (req.headers.get('sec-fetch-site') === 'cross-site') return NO_CONTENT();
  const now = Date.now();
  while (recent.length && now - recent[0] > WINDOW_MS) recent.shift();
  if (recent.length >= MAX_IN_WINDOW) return NO_CONTENT();
  recent.push(now);
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return NO_CONTENT();
    const row = searchLogRow(JSON.parse(text), new Date(now));
    if (!row) return NO_CONTENT();
    const { error } = await supabaseAdmin.from('search_terms').insert(row);
    if (error) console.error('search-log: insert failed:', error.message);
  } catch { /* not JSON: ignored */ }
  return NO_CONTENT();
}
