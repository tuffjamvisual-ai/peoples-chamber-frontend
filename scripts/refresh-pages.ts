// Refreshing the pages a script sync changed (owner's standing approval, 8 Nov 2026, PR1; backlog item 30). Used by the
// nightly syncs that run as GitHub Actions scripts, outside the site: scripts/sync-career-parliament.ts and
// scripts/sync-written-statements.ts. The site's own Vercel cron syncs refresh their pages through lib/mp-refresh.ts.
//
// The same mechanism as the hand refresh after PCL2 (scripts/revalidate.js): POST /api/revalidate on the live site with
// {"paths": [path]} and Authorization: Bearer $CRON_SECRET, one page a request, one request a second. A 5xx or no answer is
// tried again after 2, 4 and 8 seconds; when the third retry fails, or on 401, 403 or 429, the refreshing stops and the
// rest are reported as not refreshed. Any other refusal fails that page only. At most 700 pages a run: over the cap the
// first 700 are refreshed and the number left is logged.
// Then IndexNow, the way scripts/indexnow-once.mjs sends a list: the refreshed pages in batches of up to 10,000 addresses
// to api.indexnow.org, recording each in sync_cursor 'indexnow:recent'. An address already there from the last 10 minutes
// is left out: in production /api/revalidate submits each page it refreshes itself (lib/indexnow.ts), so normally nothing
// is sent twice. IndexNow problems are logged and never fail the run.
// Fallback: Vercel's bot protection can refuse a request from a GitHub runner (403 or 429; see daily-sync.yml). Every MP
// page that was not refreshed (refused, failed, over the cap or no CRON_SECRET) is added to the queue the site itself
// empties at 05:15 UTC (sync_cursor 'mp-refresh-queue', scripts/mp-refresh-queue.js and /api/refresh-nightly-pages), which
// refreshes them inside the site and sends them to IndexNow.
// Needs CRON_SECRET (refresh) and NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (the IndexNow record), never printed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

export const MAX_PATHS = 700;
export const RETRY_WAITS = [2000, 4000, 8000];
const HOST = 'www.opengovt.uk';
const INDEXNOW = 'https://api.indexnow.org/indexnow';
const PER_INDEXNOW = 10000;
const RECENT_MS = 10 * 60 * 1000;

// A hash of a JSON value that does not depend on the order of object keys (Postgres jsonb reorders them); array order
// counts. Used to tell whether a stored value really changed.
export function stableHash(value: unknown): string {
  const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
    : v === undefined ? null : v);
  return crypto.createHash('sha256').update(JSON.stringify(canon(value))).digest('hex');
}

export type RefreshResult = {
  requested: number; refreshed: string[]; failed: Array<{ path: string; reason: string }>; notRefreshed: string[];
  overCap: number; sentToIndexNow: number; alreadySent: number; indexNowStatus: number | null; stopped: string | null;
  queued: number;
};
export type RefreshDeps = {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  sleep: (ms: number) => Promise<void>;
  log: (line: string) => void;
  indexNow: (paths: string[]) => Promise<{ sent: number; already: number; status: number | null }>;
  queue: (memberIds: number[]) => Promise<string>;
};

class Stop extends Error {}

export async function refreshPages(paths: Iterable<string>, opts: { dryRun?: boolean; base?: string; secret?: string; reason?: string; deps?: Partial<RefreshDeps> } = {}): Promise<RefreshResult> {
  const deps: RefreshDeps = { fetch: (u, i) => fetch(u, i), sleep: (ms) => new Promise((r) => setTimeout(r, ms)), log: (l) => console.log(l), indexNow: (p) => submitIndexNow(p, opts.reason ?? 'sync'), queue: queueForSite, ...opts.deps };
  const all = [...new Set([...paths].filter((p) => typeof p === 'string' && p.startsWith('/')))];
  const list = all.slice(0, MAX_PATHS);
  const res: RefreshResult = { requested: all.length, refreshed: [], failed: [], notRefreshed: [], overCap: all.length - list.length, sentToIndexNow: 0, alreadySent: 0, indexNowStatus: null, stopped: null, queued: 0 };
  if (res.overCap > 0) deps.log(`[refresh] ${all.length} pages changed, more than the ${MAX_PATHS} a run: refreshing the first ${MAX_PATHS}, ${res.overCap} left`);
  if (opts.dryRun) {
    deps.log(`[refresh] dry run: would refresh ${list.length} page(s)${list.length ? `: ${list.join(' ')}` : ''}`);
    res.notRefreshed = list;
    return res;
  }
  const secret = opts.secret ?? process.env.CRON_SECRET;
  const base = (opts.base ?? process.env.REFRESH_BASE ?? `https://${HOST}`).replace(/\/+$/, '');
  if (!secret) {
    res.stopped = 'CRON_SECRET is not set: nothing refreshed';
    res.notRefreshed = list;
  } else {
    let last = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        for (let attempt = 0; ; attempt++) {
          const wait = 1000 - (Date.now() - last);
          if (last && wait > 0) await deps.sleep(wait);
          last = Date.now();
          let problem: string;
          try {
            const r = await deps.fetch(`${base}/api/revalidate`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', 'User-Agent': 'opengovt sync refresh' },
              body: JSON.stringify({ paths: [p] }),
              signal: AbortSignal.timeout(30000),
            });
            if (r.ok) { res.refreshed.push(p); break; }
            if (r.status === 401 || r.status === 403 || r.status === 429) { res.notRefreshed = list.slice(i); throw new Stop(`HTTP ${r.status} on ${p}: stopped`); }
            if (r.status < 500) { res.failed.push({ path: p, reason: `HTTP ${r.status}` }); break; }
            problem = `HTTP ${r.status}`;
          } catch (e) {
            if (e instanceof Stop) throw e;
            problem = `no answer (${e instanceof Error ? e.message : String(e)})`;
          }
          if (attempt >= RETRY_WAITS.length) { res.failed.push({ path: p, reason: `${problem} after ${RETRY_WAITS.length} retries` }); res.notRefreshed = list.slice(i + 1); throw new Stop(`${problem} on ${p} after ${RETRY_WAITS.length} retries: stopped`); }
          deps.log(`[refresh] retry ${attempt + 1} of ${RETRY_WAITS.length}: ${p}, ${problem}; again in ${RETRY_WAITS[attempt] / 1000} s`);
          await deps.sleep(RETRY_WAITS[attempt]);
        }
      }
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
      res.stopped = e.message;
    }
  }
  // Every MP page not refreshed here goes to the site's own 05:15 UTC refresh.
  const left = [...res.failed.map((f) => f.path), ...res.notRefreshed, ...all.slice(MAX_PATHS)]
    .map((p) => /^\/mps\/(\d+)$/.exec(p)?.[1]).filter((x): x is string => !!x).map(Number);
  if (left.length) {
    try { deps.log(`[refresh] ${await deps.queue(left)}`); res.queued = left.length; }
    catch (e) { deps.log(`[refresh] could not queue ${left.length} MP page(s) for the 05:15 UTC refresh: ${e instanceof Error ? e.message : String(e)}`); }
  }
  if (res.refreshed.length) {
    try {
      const n = await deps.indexNow(res.refreshed);
      res.sentToIndexNow = n.sent; res.alreadySent = n.already; res.indexNowStatus = n.status;
    } catch (e) {
      deps.log(`[refresh] IndexNow not sent: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  deps.log(`[refresh] requested ${res.requested}, refreshed ${res.refreshed.length}, failed ${res.failed.length}, not refreshed ${res.notRefreshed.length}${res.overCap ? `, over the cap ${res.overCap}` : ''}; IndexNow sent ${res.sentToIndexNow}${res.alreadySent ? ` (${res.alreadySent} already sent by the site)` : ''}${res.indexNowStatus ? `, HTTP ${res.indexNowStatus}` : ''}${res.queued ? `; ${res.queued} queued for the 05:15 UTC refresh` : ''}${res.stopped ? `; ${res.stopped}` : ''}`);
  for (const f of res.failed) deps.log(`[refresh]   failed: ${f.path}: ${f.reason}`);
  return res;
}

// The IndexNow submission, as scripts/indexnow-once.mjs makes it, leaving out addresses sent in the last 10 minutes.
export async function submitIndexNow(paths: string[], reason: string): Promise<{ sent: number; already: number; status: number | null }> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const keyFile = fs.readdirSync(path.join(__dirname, '..', 'public')).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  if (!keyFile) throw new Error('no IndexNow key file in public/');
  const key = fs.readFileSync(path.join(__dirname, '..', 'public', keyFile), 'utf8').trim();
  const { data } = await db.from('sync_cursor').select('cursor').eq('route', 'indexnow:recent').maybeSingle();
  const now = Date.now();
  const recent: Record<string, number> = Object.fromEntries(Object.entries((data?.cursor ?? {}) as Record<string, number>).filter(([, t]) => now - t < RECENT_MS));
  const urls = [...new Set(paths.filter((p) => p.startsWith('/') && !p.includes('[')).map((p) => `https://${HOST}${p === '/' ? '' : p}`))];
  const fresh = urls.filter((u) => !recent[u]);
  let sent = 0, status: number | null = null;
  for (let i = 0; i < fresh.length; i += PER_INDEXNOW) {
    const batch = fresh.slice(i, i + PER_INDEXNOW);
    const r = await fetch(INDEXNOW, {
      method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList: batch }),
      signal: AbortSignal.timeout(30000),
    });
    status = r.status;
    console.log(`[indexnow] ${reason}: ${batch.length} sent, HTTP ${r.status}`);
    if (r.status !== 200 && r.status !== 202) break;
    sent += batch.length;
    for (const u of batch) recent[u] = Date.now();
  }
  if (sent) {
    const { error } = await db.from('sync_cursor').upsert({ route: 'indexnow:recent', cursor: recent, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    if (error) console.error(`sync_cursor indexnow:recent not written: ${error.message}`);
  }
  return { sent, already: urls.length - fresh.length, status };
}

// The fallback queue (scripts/mp-refresh-queue.js), with the server key.
async function queueForSite(memberIds: number[]): Promise<string> {
  const { queueMpRefresh } = await import('./mp-refresh-queue.js');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  return queueMpRefresh(db, memberIds);
}

// One line for the GitHub Actions run summary, when there is one; a warning annotation when a page was not refreshed.
export function reportToRun(label: string, r: RefreshResult): void {
  const line = `${label}: ${r.refreshed.length} of ${r.requested} MP pages refreshed, ${r.failed.length} failed, ${r.notRefreshed.length} not refreshed${r.overCap ? ` (${r.overCap} over the cap)` : ''}${r.queued ? `, ${r.queued} queued for the site's 05:15 UTC refresh` : ''}; IndexNow ${r.sentToIndexNow} sent${r.stopped ? `; ${r.stopped}` : ''}`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
  if (process.env.GITHUB_ACTIONS && (r.failed.length || r.notRefreshed.length)) console.log(`::warning title=Page refresh::${line}`);
}
