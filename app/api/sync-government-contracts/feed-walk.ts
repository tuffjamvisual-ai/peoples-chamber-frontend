// How the daily contracts sync walks Find a Tender's release feed (T1-CS, 12 Nov 2026, accuracy first).
//
// The feed lists releases newest first and pages down to updatedFrom (checked 12 Nov 2026: page 1 of
// updatedFrom=10 Nov ran from 12 Nov 08:35 to 11 Nov 16:23, page 2 from 11 Nov 16:19 to 14:12). Before this, a run
// that found a saved position walked older pages from there and never read the newest, so the 12 Nov run stored no
// notice published after 10 Nov 23:22; and a page that failed (anything but a 429) was taken as the end of the feed,
// so the run called itself complete and dropped its saved position.
//
// Now every run:
//  1. reads from the newest release down to the newest it had already read (newestRead, less a two hour overlap;
//     at most windowDays back), so new notices are never skipped. Reaching updatedFrom is the real end: a page that
//     loaded and has no next link.
//  2. with the time left, carries on older pages from saved positions (a walk stopped by the time budget, a 429 or
//     an error), newest gap first.
// A page that fails for any reason is never the end: its address is kept to resume from, and the run is partial.
// The fetch, the page handler and the clock are passed in, so the walk is tested without the network
// (scripts/checks/contracts-feed-walk.test.ts).

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PageResult = { data?: any; error?: string; status?: number };
export type Pending = { url: string; savedAt: string };
export type WalkState = { newestRead: string | null; pending: Pending[] };

export const OVERLAP_MS = 2 * 3_600_000;

// The cursor as stored in sync_cursor; the old shape ({ next }) becomes one saved position.
export function readState(cursor: unknown, updatedAt: string | null): WalkState {
  const c = (cursor ?? {}) as { newestRead?: unknown; pending?: unknown; next?: unknown };
  const pending: Pending[] = Array.isArray(c.pending)
    ? c.pending.filter((p: any) => typeof p?.url === 'string' && typeof p?.savedAt === 'string')
    : typeof c.next === 'string' ? [{ url: c.next, savedAt: updatedAt ?? new Date(0).toISOString() }] : [];
  return { newestRead: typeof c.newestRead === 'string' ? c.newestRead : null, pending };
}

const feedTime = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, '');

export function windowFrom(state: WalkState, nowMs: number, windowDays: number): string {
  const floor = nowMs - windowDays * 86_400_000;
  const mark = state.newestRead ? Date.parse(state.newestRead) - OVERLAP_MS : NaN;
  return feedTime(Number.isFinite(mark) ? Math.max(floor, mark) : floor);
}

type Chain = { ended: boolean; stoppedAt: string | null; error: string | null; status?: number; pages: number; top: string | null };

export type WalkOptions = {
  api: string; limit: number; windowDays: number; maxPages: number; pendingMaxAgeMs: number;
  now: () => number;
  outOfTime: () => boolean;
  fetchPage: (url: string) => Promise<PageResult>;
  handlePage: (releases: any[]) => Promise<void>;
  pause?: () => Promise<void>;
  log?: (msg: string) => void;
};

export type WalkResult = {
  state: WalkState; partial: boolean; pages: number; caughtUp: boolean; error: string | null;
  resumedGaps: number; droppedGaps: number;
};

export async function walkFeed(start: WalkState, o: WalkOptions): Promise<WalkResult> {
  const log = o.log ?? (() => {});
  let pages = 0;
  let firstError: string | null = null;

  async function chain(url: string): Promise<Chain> {
    let top: string | null = null;
    let n = 0;
    for (;;) {
      if (o.outOfTime()) return { ended: false, stoppedAt: url, error: 'time budget reached', pages: n, top };
      if (pages >= o.maxPages) return { ended: false, stoppedAt: url, error: `page limit ${o.maxPages} reached`, pages: n, top };
      const res = await o.fetchPage(url);
      const releases = res.data?.releases;
      if (res.error || !Array.isArray(releases)) {
        return { ended: false, stoppedAt: url, error: res.error ?? 'page had no releases list', status: res.status, pages: n, top };
      }
      pages++; n++;
      for (const r of releases) { const d = typeof r?.date === 'string' ? r.date : null; if (d && (!top || d > top)) top = d; }
      if (releases.length) await o.handlePage(releases);
      const next = res.data?.links?.next;
      if (!next || releases.length === 0) return { ended: true, stoppedAt: null, error: null, pages: n, top };
      url = next;
      if (o.pause) await o.pause();
    }
  }

  // 1. Newest first, down to what was already read.
  const nowMs = o.now();
  const from = windowFrom(start, nowMs, o.windowDays);
  const a = await chain(`${o.api}?${new URLSearchParams({ updatedFrom: from, limit: String(o.limit) })}`);
  let newestRead = start.newestRead;
  if (a.top && (!newestRead || a.top > newestRead)) newestRead = a.top;
  let pending = start.pending.filter((p) => nowMs - Date.parse(p.savedAt) < o.pendingMaxAgeMs);
  const droppedGaps = start.pending.length - pending.length;
  if (droppedGaps) log(`${droppedGaps} saved position(s) older than ${Math.round(o.pendingMaxAgeMs / 86_400_000)} days dropped`);
  if (!a.ended) {
    firstError = a.error;
    log(`newest-first read stopped (${a.error}); kept to resume from`);
    // Nothing loaded at all: the window is read again next run, so there is no gap to save.
    if (a.pages > 0 && a.stoppedAt) pending = [{ url: a.stoppedAt, savedAt: new Date(nowMs).toISOString() }, ...pending];
  }

  // 2. Older pages from saved positions, while time is left.
  let resumedGaps = 0;
  if (a.ended) {
    while (pending.length && !o.outOfTime() && pages < o.maxPages) {
      const p = pending[0];
      const b = await chain(p.url);
      resumedGaps++;
      if (b.ended) { pending = pending.slice(1); continue; }
      if (b.pages === 0 && b.status && b.status >= 400 && b.status < 500 && b.status !== 429) {
        // The saved address no longer works (an expired cursor): drop it; the next newest-first read covers what it can.
        log(`saved position failed (${b.error}); dropped`);
        pending = pending.slice(1);
        continue;
      }
      firstError ??= b.error;
      if (b.stoppedAt) pending = [{ url: b.stoppedAt, savedAt: p.savedAt }, ...pending.slice(1)];
      break;
    }
  }

  return {
    state: { newestRead, pending },
    partial: !a.ended || pending.length > 0,
    pages, caughtUp: a.ended, error: firstError, resumedGaps, droppedGaps,
  };
}
