// Content-Security-Policy reports (F10, ENTRY 134, owner approved 15 Nov 2026; Cowork ENTRY 175; T2's
// audit/t2-prep/f10-exact.md step 1). Browsers POST here what the report-only policy (next.config.ts) would have blocked.
// Each report is one console.warn line in Vercel's runtime logs, which Cowork reads for a week before the policy is
// enforced (step 2). POST only; body at most 8 KB; no database, no storage, no auth; at most 60 reports a minute per
// server instance; always 204 (nothing for a browser or anyone else to read back).
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // a POST receiver, never a page (A16 covers pages and layouts, not API routes)

const MAX_BYTES = 8 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_IN_WINDOW = 60;
const recent: number[] = [];
const NO_CONTENT = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

const clip = (v: unknown) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 300);

export async function POST(req: Request) {
  const now = Date.now();
  while (recent.length && now - recent[0] > WINDOW_MS) recent.shift();
  if (recent.length >= MAX_IN_WINDOW) return NO_CONTENT();
  recent.push(now);
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return NO_CONTENT();
    const body = JSON.parse(text) as Record<string, unknown>;
    // The older report-uri format wraps the report in "csp-report"; the Reporting API sends a list with a "body".
    const items = Array.isArray(body) ? body.map((x) => (x as { body?: Record<string, unknown> }).body ?? {}) : [(body['csp-report'] as Record<string, unknown>) ?? body];
    for (const r of items.slice(0, 5)) {
      console.warn('[csp]', clip(r['effective-directive'] ?? r['effectiveDirective'] ?? r['violated-directive']), clip(r['blocked-uri'] ?? r['blockedURL']), clip(r['document-uri'] ?? r['documentURL']));
    }
  } catch { /* not JSON: ignored */ }
  return NO_CONTENT();
}
