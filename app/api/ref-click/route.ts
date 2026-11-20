// POST /api/ref-click: one visit through one of our own tagged links, from RefClick (owner approved, Cowork ENTRY 440).
// Body (JSON, sent as text by navigator.sendBeacon): { "ref": "x11", "path": "/mps" }. Counted in public.ref_clicks
// (migration 2026-11-21g) by public.ref_click_add: count + 1 for the tag (lib/ref-clicks.ts allow list), the path (no
// query string, at most 200 characters) and the start of the current hour (UTC). Nothing else: this route never reads
// the IP address, user agent, cookies or account (the site wide proxy.ts rate limit by IP runs before every /api route,
// in memory only, as before). Row level security is on with no policies and the function runs for service_role only,
// so only this route (the service key) writes it.
// POST only; body at most 512 bytes; at most 60 clicks a minute per server instance; always 204, never cached.
import { NextResponse } from 'next/server';
import { refClickRow } from '@/lib/ref-clicks';

export const dynamic = 'force-dynamic'; // a POST receiver, never a page (A16 covers pages and layouts, not API routes)

const MAX_BYTES = 512;
const WINDOW_MS = 60 * 1000;
const MAX_IN_WINDOW = 60;
const recent: number[] = [];
const NO_CONTENT = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });

export async function POST(req: Request) {
  // Another site's page cannot post clicks here (the browser marks such a request cross-site).
  if (req.headers.get('sec-fetch-site') === 'cross-site') return NO_CONTENT();
  const length = Number(req.headers.get('content-length'));
  if (length > MAX_BYTES) return NO_CONTENT();
  const now = Date.now();
  while (recent.length && now - recent[0] > WINDOW_MS) recent.shift();
  if (recent.length >= MAX_IN_WINDOW) return NO_CONTENT();
  recent.push(now);
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return NO_CONTENT();
    const row = refClickRow(JSON.parse(text), new Date(now));
    if (!row) return NO_CONTENT();
    // Loaded only for a click that is counted (so the refusal tests, scripts/checks/ref-clicks.test.ts, run without it).
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    const { error } = await supabaseAdmin.rpc('ref_click_add', { p_ref: row.ref, p_path: row.path, p_hour: row.hour });
    if (error) console.error('ref-click: count failed:', error.message);
  } catch { /* not JSON: ignored */ }
  return NO_CONTENT();
}
