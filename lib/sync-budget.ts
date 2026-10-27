// Shared time budget, polite fetching and resume position for the scheduled syncs (owner's job 79, report 79, 27 Oct
// 2026). The same pattern as sync-government-contracts, in one place:
//  - a run ends by about 80 per cent of its maxDuration (BUDGET_FRACTION), so it always returns and records its
//    heartbeat instead of being killed by the platform; no new item starts after START_FRACTION, and a request in
//    flight is given only the time left;
//  - every outside request has a timeout;
//  - a 429 (or a 503 with Retry-After) is honoured: a short Retry-After that fits in the budget is waited out, twice at
//    most; otherwise the run stops cleanly (RateLimited) and carries on next time;
//  - a run stopped by the budget or a rate limit returns 200 with partial: true; a real error (a database error, an
//    error answer from the source, no answer at all) still fails the run with a 5xx.
//  - where the queue is not already ordered by a "last done" time, the position to carry on from is kept in
//    sync_cursor (route, cursor jsonb, updated_at).

import type { SupabaseClient } from '@supabase/supabase-js';

export const BUDGET_FRACTION = 0.8;
export const START_FRACTION = 0.7;
export const REQUEST_TIMEOUT_MS = 20_000;
// For whole-file downloads (CSV, Excel, zip): the timeout covers reading the body too.
export const DOWNLOAD_TIMEOUT_MS = 120_000;
export const RETRY_AFTER_MAX_S = 60;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A local test may shorten the budget (SYNC_TEST_BUDGET_MS); never on Vercel.
function testBudgetMs(): number | null {
  const v = process.env.SYNC_TEST_BUDGET_MS;
  if (!v || process.env.VERCEL) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export class SyncBudget {
  readonly started: number;
  readonly budgetMs: number;
  constructor(maxDurationS: number, opts: { fraction?: number; started?: number } = {}) {
    this.started = opts.started ?? Date.now();
    this.budgetMs = testBudgetMs() ?? Math.round(maxDurationS * 1000 * (opts.fraction ?? BUDGET_FRACTION));
  }
  get deadline(): number { return this.started + this.budgetMs; }
  spent(): number { return Date.now() - this.started; }
  msLeft(): number { return this.deadline - Date.now(); }
  // True once no new item should start: START_FRACTION of maxDuration, or when less than reserveMs is left.
  stopStarting(reserveMs = 0): boolean {
    return this.spent() >= this.budgetMs * (START_FRACTION / BUDGET_FRACTION) || this.msLeft() <= reserveMs;
  }
  over(): boolean { return this.msLeft() <= 0; }
}

export class BudgetReached extends Error {
  constructor() { super('run budget reached'); this.name = 'BudgetReached'; }
}

export class RateLimited extends Error {
  readonly retryAfterS: number | null;
  readonly status: number;
  constructor(url: string, status: number, retryAfterS: number | null) {
    super(`HTTP ${status} from ${new URL(url).host}${retryAfterS != null ? ` (Retry-After ${retryAfterS}s)` : ''}`);
    this.name = 'RateLimited';
    this.status = status;
    this.retryAfterS = retryAfterS;
  }
}

// Retry-After is a number of seconds or an HTTP date.
export function retryAfterSeconds(h: string | null): number | null {
  if (!h) return null;
  const t = h.trim();
  if (/^\d+$/.test(t)) return Number(t);
  const at = Date.parse(t);
  return Number.isNaN(at) ? null : Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

export type PoliteOpts = { budget?: SyncBudget; timeoutMs?: number; retryAfterMaxS?: number; maxWaits?: number; fetchFn?: typeof fetch };

// fetch with a timeout (cut to the time left when a budget is given) and 429 handling. Throws BudgetReached when there
// is no time left to start the request, RateLimited when the source asks us to stop (a 429, or a 503 with Retry-After,
// whose wait is too long or has already been waited out), and the usual errors otherwise. Other non-2xx answers are
// returned for the caller to judge. Without a budget, a Retry-After of up to retryAfterMaxS is waited out once.
export async function politeFetch(url: string, init: RequestInit = {}, opts: PoliteOpts = {}): Promise<Response> {
  const fetchFn = opts.fetchFn ?? fetch;
  const maxWaits = opts.maxWaits ?? (opts.budget ? 2 : 1);
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
  for (let waits = 0; ; waits++) {
    const left = opts.budget ? opts.budget.msLeft() : Infinity;
    if (left < 1_000) throw new BudgetReached();
    // A caller's own signal (its own timeout) is kept; with a budget, the request also ends when the time is up.
    const own = init.signal ?? null;
    const timer = AbortSignal.timeout(Math.min(timeoutMs, left));
    const signal = own ? (opts.budget ? AbortSignal.any([own, timer]) : own) : timer;
    let res: Response;
    try {
      res = await fetchFn(url, { ...init, signal });
    } catch (e) {
      // Cut off because the run's time was up (not the request's own timeout): the budget, not a failure.
      if (opts.budget && timer.aborted && left < timeoutMs && opts.budget.msLeft() < 1_000) throw new BudgetReached();
      throw e;
    }
    const limited = res.status === 429 || (res.status === 503 && !!res.headers.get('retry-after'));
    if (!limited) return res;
    const ra = retryAfterSeconds(res.headers.get('retry-after'));
    const fits = !opts.budget || (ra != null && ra * 1000 < opts.budget.msLeft() - 5_000);
    const canWait = ra != null && ra <= (opts.retryAfterMaxS ?? RETRY_AFTER_MAX_S) && waits < maxWaits && fits;
    if (!canWait) throw new RateLimited(url, res.status, ra);
    console.warn(`[sync] ${new URL(url).host} answered ${res.status}; waiting ${ra}s as Retry-After asks`);
    await sleep(ra * 1000);
  }
}

// Was this error the run's own budget or a polite stop, rather than a real failure?
export const isPoliteStop = (e: unknown) => e instanceof BudgetReached || e instanceof RateLimited;

export type Cursor<T> = { cursor: T; updatedAt: string };

export async function loadCursor<T>(supabase: SupabaseClient, route: string, maxAgeMs: number): Promise<T | null> {
  const { data, error } = await supabase.from('sync_cursor').select('cursor, updated_at').eq('route', route).maybeSingle();
  if (error) throw new Error(`sync_cursor read: ${error.message}`);
  if (!data) return null;
  if (Date.now() - new Date(data.updated_at as string).getTime() > maxAgeMs) return null;
  return data.cursor as T;
}

// Save where to carry on from, or clear it (null) when the pass is complete.
export async function saveCursor(supabase: SupabaseClient, route: string, cursor: unknown | null): Promise<boolean> {
  const { error } = cursor == null
    ? await supabase.from('sync_cursor').delete().eq('route', route)
    : await supabase.from('sync_cursor').upsert({ route, cursor, updated_at: new Date().toISOString() }, { onConflict: 'route' });
  if (error) console.error(`[sync] ${route}: could not save the position to carry on from: ${error.message}`);
  return !error;
}
