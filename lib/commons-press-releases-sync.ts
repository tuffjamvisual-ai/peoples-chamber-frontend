// House of Commons committee reports into press_releases (app/api/sync-commons-press-releases, report 79).
//
// Time budget and resume (26 Oct 2026): the Committees API takes 15 to 27 seconds to answer a request it has not
// answered recently, and about 50 ms once it has (it keeps working on a request after we give up and caches the
// answer). One request for the newest 60 publications, cut off at 20 s, failed whenever the API was cold (504s on
// 26 Oct at 10:15, 14:15 and 16:15). So a run now:
//   - reads the same newest 60 publications as three pages of 20 (one batch each), each request cut off at 20 s;
//   - when a page does not answer in time, records it and moves on to the next page, then tries it again at the end
//     of the run if there is time (it is usually ready by then);
//   - writes each page's new or changed reports as soon as the page is read;
//   - stops before its 50 s budget runs out and saves in sync_cursor the pages still to do and the publications
//     already handled, so the next run carries on from there and no publication is handled twice in one pass;
//   - returns partial: true (HTTP 200) when the budget stopped it, and fails (5xx) on a real error: a database
//     error, an error answer from the API, or no page answering at all.

import type { SupabaseClient } from '@supabase/supabase-js';

export const COMMITTEES_API = 'https://committees-api.parliament.uk/api/Publications';
export const CURSOR_ROUTE = '/api/sync-commons-press-releases';
const PAGE_SIZE = 20;
const PAGES = 3;                          // the newest 60 publications, as before
export const BUDGET_MS = 50_000;          // the function's limit is 60 s (maxDuration); keep 10 s in hand
export const API_TIMEOUT_MS = 20_000;     // per request (b96ae20, report 43)
const MIN_REQUEST_MS = 3_000;             // do not start a request with less time than this left
const WRITE_RESERVE_MS = 3_000;           // kept back for the page's database writes and the cursor
const CURSOR_MAX_AGE_MS = 24 * 60 * 60 * 1000; // an older saved position is dropped and a new pass started

const REPORT_TYPES = new Set(['Report', 'Special Report']);

type Publication = {
  id: number;
  description?: string | null;
  publicationStartDate?: string | null;
  type?: { name?: string } | null;
  committee?: { name?: string; house?: string } | null;
  hcNumber?: { number?: string; sessionDescription?: string } | null;
};

// What sync_cursor holds between runs: the pages (by skip) still to read in this pass, and the publication ids
// already handled in it.
type Cursor = { pending: number[]; done: number[]; passStartedAt: string };

export type SyncDeps = {
  supabase: SupabaseClient;
  fetchFn?: typeof fetch;
  budgetMs?: number;
  apiTimeoutMs?: number;
  log?: (msg: string) => void;
};

export type SyncResult = { status: number; body: Record<string, unknown> };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Build an on-site HTML body from the metadata we have. The report text itself
// is a PDF on parliament.uk, so we do not inline it; we present the summary and
// cite the source as plain text (no offsite links).
function buildBody(p: Publication, committee: string): string {
  const parts: string[] = [];
  if (p.description) parts.push(`<p>${esc(p.description)}</p>`);
  const date = fmtDate(p.publicationStartDate || null);
  const typeName = p.type?.name || 'Report';
  parts.push(
    `<p>${esc(typeName)} published by the ${esc(committee)} (House of Commons)${date ? ` on ${esc(date)}` : ''}.</p>`,
  );
  if (p.hcNumber?.number) {
    const session = p.hcNumber.sessionDescription ? `, Session ${esc(p.hcNumber.sessionDescription)}` : '';
    parts.push(`<p>Report reference: ${esc(p.hcNumber.number)}${session}.</p>`);
  }
  parts.push(
    `<p>Source: UK Parliament, Committees. The full report is published by the committee on parliament.uk.</p>`,
  );
  return parts.join('\n');
}

const isReport = (p: Publication) =>
  p.committee?.house === 'Commons' && REPORT_TYPES.has(p.type?.name || '') && !!p.description;

export async function runCommonsPressReleasesSync(deps: SyncDeps): Promise<SyncResult> {
  const { supabase } = deps;
  const fetchFn = deps.fetchFn ?? fetch;
  const budgetMs = deps.budgetMs ?? BUDGET_MS;
  const apiTimeoutMs = deps.apiTimeoutMs ?? API_TIMEOUT_MS;
  const log = deps.log ?? ((m: string) => console.log(`[commons-press-releases] ${m}`));
  const started = Date.now();
  const deadline = started + budgetMs;
  const now = new Date().toISOString();
  const left = () => deadline - Date.now();

  // Where the last run stopped, if it was stopped by the budget.
  const { data: cur, error: curErr } = await supabase.from('sync_cursor').select('cursor, updated_at').eq('route', CURSOR_ROUTE).maybeSingle();
  if (curErr) return { status: 500, body: { ok: false, error: `cursor: ${curErr.message}` } };
  const saved = cur?.cursor as Cursor | null | undefined;
  const fresh = !!saved && Array.isArray(saved.pending) && saved.pending.length > 0
    && Date.now() - new Date(cur!.updated_at as string).getTime() < CURSOR_MAX_AGE_MS;
  const resumed = fresh ? saved! : null;
  const queue: number[] = resumed ? [...resumed.pending] : Array.from({ length: PAGES }, (_, i) => i * PAGE_SIZE);
  const done = new Set<number>(resumed?.done ?? []);
  const passStartedAt = resumed?.passStartedAt ?? now;

  let fetched = 0, commonsReports = 0, added = 0, updated = 0, unchanged = 0, alreadyDone = 0, upserted = 0;
  const pagesRead: number[] = [];
  const noAnswer: { skip: number; afterMs: number }[] = [];
  const retried = new Set<number>();
  let stoppedByBudget = false;
  let gaveUpOn: number | null = null; // a page that did not answer twice in this run; the next run starts with it

  async function readPage(skip: number, timeoutMs: number): Promise<{ items: Publication[] } | { noAnswer: true } | { error: string }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const t0 = Date.now();
    try {
      const res = await fetchFn(`${COMMITTEES_API}?${new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip) })}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
        signal: ctrl.signal,
      });
      if (!res.ok) return { error: `committees-api ${res.status} (skip ${skip})` };
      const data = (await res.json()) as { items?: Publication[] };
      log(`page skip=${skip}: ${(data.items || []).length} items in ${Date.now() - t0} ms`);
      return { items: data.items || [] };
    } catch (e) {
      if (ctrl.signal.aborted) {
        log(`page skip=${skip}: no answer within ${Math.round(timeoutMs / 1000)} s`);
        return { noAnswer: true };
      }
      return { error: `committees-api: ${(e as Error).message} (skip ${skip})` };
    } finally {
      clearTimeout(timer);
    }
  }

  // One batch: the page's Commons reports, minus any already handled in this pass; write the new and changed ones.
  async function writePage(items: Publication[]): Promise<string | null> {
    fetched += items.length;
    const reports = items.filter(isReport);
    commonsReports += reports.length;
    const todo = reports.filter((p) => !done.has(p.id));
    alreadyDone += reports.length - todo.length;
    const records = todo.map((p) => {
      const committee = p.committee?.name || 'House of Commons';
      return {
        title: p.description as string,
        description: p.type?.name === 'Special Report' ? 'Special report' : 'Select committee report',
        organisation: committee,
        published_at: p.publicationStartDate || null,
        gov_url: `https://committees.parliament.uk/publications/${p.id}`,
        body: buildBody(p, committee),
        body_fetched_at: now,
        fetched_at: now,
      };
    });
    if (records.length) {
      // Each report is written once (report 43): only new reports and any whose details changed.
      const { data: stored, error: storedErr } = await supabase.from('press_releases')
        .select('gov_url, title, description, organisation, published_at, body').in('gov_url', records.map((r) => r.gov_url));
      if (storedErr) return `stored reports: ${storedErr.message}`;
      const byUrl = new Map((stored ?? []).map((r) => [r.gov_url as string, r]));
      const sameTime = (a: string | null, b: string | null) => (a && b ? Date.parse(a) === Date.parse(b) : a === b);
      const changed = records.filter((r) => {
        const old = byUrl.get(r.gov_url);
        return !old || old.title !== r.title || old.description !== r.description || old.organisation !== r.organisation
          || old.body !== r.body || !sameTime(old.published_at as string | null, r.published_at);
      });
      if (changed.length) {
        const { error } = await supabase.from('press_releases').upsert(changed, { onConflict: 'gov_url' });
        if (error) return `upsert: ${error.message}`;
        upserted += changed.length;
      }
      added += changed.filter((r) => !byUrl.has(r.gov_url)).length;
      updated += changed.filter((r) => byUrl.has(r.gov_url)).length;
      unchanged += records.length - changed.length;
    }
    for (const p of items) done.add(p.id);
    return null;
  }

  let failure: { status: number; error: string } | null = null;
  while (queue.length) {
    const skip = queue[0];
    const timeLeft = left() - WRITE_RESERVE_MS;
    if (timeLeft < MIN_REQUEST_MS) { stoppedByBudget = true; break; }
    const page = await readPage(skip, Math.min(apiTimeoutMs, timeLeft));
    if ('error' in page) { failure = { status: 502, error: page.error }; break; }
    if ('noAnswer' in page) {
      noAnswer.push({ skip, afterMs: Date.now() - started });
      queue.shift();
      // Try it once more at the end of this run (the API is usually ready by then); otherwise the next run does.
      if (!retried.has(skip)) { retried.add(skip); queue.push(skip); } else { gaveUpOn = skip; queue.unshift(skip); break; }
      continue;
    }
    const writeErr = await writePage(page.items);
    if (writeErr) { failure = { status: 500, error: writeErr }; break; }
    pagesRead.push(skip);
    queue.shift();
  }

  // Save where this pass stands (pages left to read), or clear it when the pass is complete.
  const remaining = [...new Set(queue)];
  let cursorSaved: boolean | null = null;
  if (remaining.length) {
    const { error } = await supabase.from('sync_cursor').upsert(
      { route: CURSOR_ROUTE, cursor: { pending: remaining, done: [...done], passStartedAt } satisfies Cursor, updated_at: new Date().toISOString() },
      { onConflict: 'route' },
    );
    cursorSaved = !error;
    if (error) log(`could not save the position to resume from: ${error.message}`);
  } else if (cur) {
    const { error } = await supabase.from('sync_cursor').delete().eq('route', CURSOR_ROUTE);
    if (error) log(`could not clear the saved position: ${error.message}`);
  }

  const body = {
    ok: !failure && pagesRead.length > 0,
    partial: remaining.length > 0,
    stoppedByBudget,
    gaveUpOn,
    resumedFrom: resumed ? (cur!.updated_at as string) : null,
    passStartedAt,
    pagesRead,
    pagesLeft: remaining,
    noAnswer,
    fetched,
    commonsReports,
    alreadyDone,
    added,
    updated,
    unchanged,
    upserted,
    cursorSaved,
    durationMs: Date.now() - started,
    syncedAt: now,
    ...(failure ? { error: failure.error } : {}),
  };
  if (failure) return { status: failure.status, body };
  // No page answered at all: the source is down, so fail loudly (the position is kept for the next run).
  if (!pagesRead.length) return { status: 504, body: { ...body, ok: false, error: `committees-api: no page answered within ${Math.round(apiTimeoutMs / 1000)} s` } };
  return { status: 200, body };
}
