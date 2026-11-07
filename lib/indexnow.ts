// IndexNow (owner, 7 Nov 2026, V1): tells Bing and the other IndexNow engines when a page has changed, through the one global
// endpoint (https://www.indexnow.org/documentation). Called only from the places that already know a page changed: the
// /api/revalidate route (terminal scripts, publishes and migrations), the MP page refresh after syncs, and the syncs that
// refresh their own pages. A removed or redirected address is submitted the same way. Never a bulk resubmission of the site.
//   - production only, and only page addresses on www.opengovt.uk (no route patterns, feeds, sitemaps or API routes);
//   - an address submitted in the last 10 minutes is skipped (kept in sync_cursor 'indexnow:recent');
//   - on a 429 nothing more is sent until the time the engine gives, or an hour; the addresses wait in 'indexnow:retry' and go
//     with the next submission after that;
//   - one log line per submission run: the count and the response code.
// The key is public by design: the engines check it against /<key>.txt (public/).
import 'server-only';
import { after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const INDEXNOW_KEY = 'b4d1204607572c73516741de5a749dbc';
const HOST = 'www.opengovt.uk';
const SITE = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const PER_REQUEST = 10000;
const RESUBMIT_AFTER_MS = 10 * 60 * 1000;
const BACKOFF_MS = 60 * 60 * 1000;
const RECENT = 'indexnow:recent';
const RETRY = 'indexnow:retry';

type Recent = Record<string, number>;
type Retry = { until: number; urls: string[] };

// A page address on our host, or null: no route patterns ("/mps/[id]"), API routes, feeds, sitemaps or files.
export function pageUrl(path: string): string | null {
  if (typeof path !== 'string') return null;
  const p = path.startsWith(SITE) ? path.slice(SITE.length) || '/' : path;
  if (!p.startsWith('/') || p.includes('[') || p.startsWith('/api/') || /\.(xml|txt|json|rss|ico|png|jpg|webp|svg)$/i.test(p.split('?')[0])) return null;
  return SITE + (p === '/' ? '' : p);
}

async function readCursor<T>(route: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin.from('sync_cursor').select('cursor').eq('route', route).maybeSingle();
  if (error) throw new Error(`sync_cursor ${route}: ${error.message}`);
  return (data?.cursor as T | undefined) ?? null;
}
async function writeCursor(route: string, cursor: unknown) {
  const { error } = await supabaseAdmin.from('sync_cursor').upsert({ route, cursor, updated_at: new Date().toISOString() }, { onConflict: 'route' });
  if (error) throw new Error(`sync_cursor ${route}: ${error.message}`);
}

async function post(urls: string[]): Promise<{ status: number; retryAfterMs: number | null }> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: urls }),
    signal: AbortSignal.timeout(20000),
  });
  const ra = Number(res.headers.get('retry-after'));
  return { status: res.status, retryAfterMs: Number.isFinite(ra) && ra > 0 ? ra * 1000 : null };
}

// Submits the changed pages. Errors are logged, never thrown: a page refresh must not fail because a search engine did.
export async function submitIndexNow(paths: Iterable<string>, reason: string, opts: { force?: boolean } = {}): Promise<{ sent: number; status: number | null }> {
  if (process.env.VERCEL_ENV !== 'production' && !opts.force) return { sent: 0, status: null };
  try {
    const now = Date.now();
    const wanted = [...new Set([...paths].map(pageUrl).filter((u): u is string => !!u))];
    const retry = await readCursor<Retry>(RETRY);
    if (retry && retry.until > now) {
      // Still backing off after a 429: these wait with the others.
      if (wanted.length) await writeCursor(RETRY, { until: retry.until, urls: [...new Set([...retry.urls, ...wanted])].slice(0, 50000) });
      console.log(`[indexnow] ${reason}: 0 sent, ${wanted.length} held (429 back off until ${new Date(retry.until).toISOString()})`);
      return { sent: 0, status: 429 };
    }
    const recentAll = (await readCursor<Recent>(RECENT)) ?? {};
    const recent: Recent = Object.fromEntries(Object.entries(recentAll).filter(([, t]) => now - t < RESUBMIT_AFTER_MS));
    const due = [...new Set([...(retry?.urls ?? []), ...wanted])].filter((u) => !recent[u]);
    if (!due.length) {
      if (retry) await writeCursor(RETRY, { until: 0, urls: [] });
      console.log(`[indexnow] ${reason}: 0 sent (${wanted.length} given, all sent in the last 10 minutes or not pages)`);
      return { sent: 0, status: null };
    }
    let sent = 0, status = 0;
    for (let i = 0; i < due.length; i += PER_REQUEST) {
      const batch = due.slice(i, i + PER_REQUEST);
      const r = await post(batch);
      status = r.status;
      if (r.status === 429) {
        await writeCursor(RETRY, { until: now + (r.retryAfterMs ?? BACKOFF_MS), urls: due.slice(i) });
        break;
      }
      if (r.status === 200 || r.status === 202) { sent += batch.length; for (const u of batch) recent[u] = now; }
    }
    await writeCursor(RECENT, recent);
    if (status !== 429 && retry?.urls?.length) await writeCursor(RETRY, { until: 0, urls: [] });
    console.log(`[indexnow] ${reason}: ${sent} of ${due.length} sent, HTTP ${status}`);
    return { sent, status };
  } catch (e) {
    console.error(`[indexnow] ${reason}: not sent (${e instanceof Error ? e.message : e})`);
    return { sent: 0, status: null };
  }
}

// From a route handler: submit once the response has gone, so a sync or refresh is never slowed by the engines.
export function indexNowAfter(paths: Iterable<string>, reason: string): void {
  const list = [...paths];
  if (!list.length) return;
  try {
    after(() => submitIndexNow(list, reason).then(() => undefined));
  } catch {
    // Outside a request (a script or a test): nothing is sent.
  }
}
