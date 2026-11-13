// MP spoken contributions sync (app/api/sync-mp-contributions): each current MP's total spoken contributions and word
// count for the current Parliament, from the Hansard search API, into mp_contribution_totals.
//
// Batches that resume (Cowork 13 Nov 2026, COWORK-TO-T1 ENTRY 4; the 15:43 GMT run that day was killed at 300 s, and
// for 14 days runs had ended at the old 235 s budget): an MP is counted page by page (100 speeches a page). When the
// run's time is up, an MP still being counted is not thrown away: where it got to (the next page, the words so far, the
// total) is saved in sync_cursor, and the next run carries on from there before starting anyone new. So an MP with
// thousands of speeches is finished over two or three runs instead of being restarted every run.
//
// Each count has a fixed end date (yesterday, set when the MP's count starts), so the pages do not move between runs:
// Hansard lists the newest speeches first, and a speech added between two runs would otherwise shift every page by one
// and be counted twice or missed. Speeches after that date are counted at the MP's next refresh (every 4 to 5 days).
// A saved position older than RESUME_MAX_DAYS is dropped and the MP is counted again from the start.
//
// Every run ends well inside the route's 300 s: no new MP starts after START_CUTOFF_MS, every request's timeout is cut
// to the time left before RUN_BUDGET_MS, and each database call has its own time limit (DB_TIMEOUT_MS).

export const PARLIAMENT_START = '2024-07-04';
export const PAGE = 100;
export const RUN_BUDGET_MS = 200_000;
export const START_CUTOFF_MS = 150_000;
export const DB_TIMEOUT_MS = 15_000;
export const RESUME_MAX_DAYS = 3;
export const CURSOR_ROUTE = '/api/sync-mp-contributions';

// Where an MP's count got to. skip: speeches read so far (the next page starts there); total: Hansard's count for the
// whole window, from the first page; endDate: the window's last day, fixed for the whole count.
export type InProgress = { skip: number; words: number; total: number; endDate: string; startedAt: string };
export type Cursor = { inProgress: Record<string, InProgress> };

export type Page = { total: number; texts: string[] };
export type FetchPage = (memberId: number, skip: number, endDate: string, deadline: number) => Promise<Page>;

export type StepResult =
  | { kind: 'done'; total: number; words: number }
  | { kind: 'paused'; state: InProgress }
  | { kind: 'failed' };

export const yesterday = (now: Date) => new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
export const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length;

// Counts one MP from where it got to (or from the start), page by page, until done, the time is up or a page fails.
// A page that fails ends this MP's count for the run: what was read before it is kept as the position to resume from,
// so nothing is counted twice and a part count is never saved as the MP's total. RateLimited is passed up to the caller.
export async function countMember(
  memberId: number,
  from: InProgress | null,
  fetchPage: FetchPage,
  opts: { deadline: number; now: Date; clock?: () => number; isStop?: (e: unknown) => boolean },
): Promise<StepResult> {
  const clock = opts.clock ?? Date.now;
  let state: InProgress = from ?? { skip: 0, words: 0, total: -1, endDate: yesterday(opts.now), startedAt: opts.now.toISOString() };
  for (let guard = 0; guard < 500; guard++) {
    if (state.total >= 0 && state.skip >= state.total) return { kind: 'done', total: state.total, words: state.words };
    if (opts.deadline - clock() < 1_000) return state.total >= 0 || state.skip > 0 ? { kind: 'paused', state } : { kind: 'failed' };
    let page: Page;
    try {
      page = await fetchPage(memberId, state.skip, state.endDate, opts.deadline);
    } catch (e) {
      if (opts.isStop?.(e)) throw e;
      // Out of time part way through a page: keep the position (the page is read again next run).
      if (opts.deadline - clock() < 1_000 && (state.total >= 0 || state.skip > 0)) return { kind: 'paused', state };
      return state.total >= 0 || state.skip > 0 ? { kind: 'paused', state } : { kind: 'failed' };
    }
    const total = state.total >= 0 ? state.total : page.total;
    const words = state.words + page.texts.reduce((n, t) => n + countWords(t), 0);
    state = { ...state, total, words, skip: state.skip + page.texts.length };
    if (page.texts.length < PAGE) return { kind: 'done', total, words };
  }
  return { kind: 'paused', state };
}

// The run's queue: MPs part way through first (in the order they were started), then current MPs never counted, then
// the stalest. Saved positions for MPs no longer current, or older than RESUME_MAX_DAYS, are dropped.
export function planQueue(
  current: number[],
  syncedAt: Map<number, string>,
  cursor: Cursor | null,
  now: Date,
  limit: number,
): { queue: number[]; resume: Map<number, InProgress> } {
  const isCurrent = new Set(current);
  const resume = new Map<number, InProgress>();
  for (const [k, v] of Object.entries(cursor?.inProgress ?? {})) {
    const id = Number(k);
    if (!isCurrent.has(id)) continue;
    if (now.getTime() - Date.parse(v.startedAt) > RESUME_MAX_DAYS * 86_400_000) continue;
    resume.set(id, v);
  }
  const resumed = [...resume.entries()].sort((a, b) => a[1].startedAt.localeCompare(b[1].startedAt)).map(([id]) => id);
  const rest = current
    .filter((id) => !resume.has(id))
    .map((id) => ({ id, u: syncedAt.get(id) ?? '' }))
    .sort((a, b) => a.u.localeCompare(b.u) || a.id - b.id)
    .map((x) => x.id);
  return { queue: [...resumed, ...rest].slice(0, limit), resume };
}
