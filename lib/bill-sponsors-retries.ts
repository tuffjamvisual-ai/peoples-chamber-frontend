// Retries for the bill sponsors sync's Parliament reads (moved from app/api/sync-bill-sponsors/route.ts on 11 Nov 2026,
// T1-DF (f), so they can be tested; a route file may only export its handlers).
// 5 Nov 2026 (owner): every Parliament request has REQUEST_MS and up to three retries, RETRY_WAITS_MS apart, inside the
// run's time budget: with no time for another try, the bill counts as failed. Only a timeout, no answer or a 5xx is retried.
import { BudgetReached, isPoliteStop, type SyncBudget } from '@/lib/sync-budget';

export const REQUEST_MS = 30_000;
// 11 Nov 2026 (T1-DF (f), Cowork): Parliament bill 618 answered in 28.3 s against the 30 s limit. A request that timed
// out at 30 s gets one retry at 45 s, started only when the run has that much time left; other retries keep REQUEST_MS.
export const LONG_RETRY_MS = 45_000;
const RETRY_WAITS_MS = [5_000, 15_000, 30_000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The Bills API no longer has the bill (404): handled like the stages sync (lib/bill-stages.ts BillNotFoundError).
export class BillNotFoundError extends Error {
  constructor(parliamentId: number) {
    super(`Bills API 404 for bill ${parliamentId}`);
    this.name = 'BillNotFoundError';
  }
}

// Any other refusal (4xx): asking again would get the same answer.
export class ApiRefused extends Error {}

// Runs one Parliament read, trying again after a timeout, no answer or a 5xx. A 429 or the end of the run's time on the
// first try stops the run as usual; if the time ends on a retry, the error the bill actually had is what counts. The
// first retry after a timeout has LONG_RETRY_MS instead of REQUEST_MS (T1-DF (f)).
export function isTimeout(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  return name === 'TimeoutError' || name === 'AbortError';
}
export async function withRetries<T>(read: (timeoutMs: number) => Promise<T>, budget: Pick<SyncBudget, 'stopStarting'>, sleepFn: (ms: number) => Promise<unknown> = sleep): Promise<T> {
  let lastError: unknown = null;
  let timeoutMs = REQUEST_MS;
  let longUsed = false;
  for (let attempt = 0; ; attempt++) {
    try {
      return await read(timeoutMs);
    } catch (err) {
      if (err instanceof BudgetReached && lastError) throw lastError;
      if (isPoliteStop(err) || err instanceof BillNotFoundError || err instanceof ApiRefused) throw err;
      lastError = err;
      const wait = RETRY_WAITS_MS[attempt];
      const long = !longUsed && isTimeout(err);
      timeoutMs = long ? LONG_RETRY_MS : REQUEST_MS;
      if (long) longUsed = true;
      if (wait === undefined || budget.stopStarting(wait + (long ? LONG_RETRY_MS : 1_000))) throw err;
      console.warn(`[sync-bill-sponsors] try ${attempt + 1} failed (${(err as Error).message}); trying again in ${wait / 1000}s${long ? ` with ${LONG_RETRY_MS / 1000}s` : ''}`);
      await sleepFn(wait);
    }
  }
}

