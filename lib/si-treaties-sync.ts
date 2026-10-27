// Daily sync for statutory instruments and treaties (app/api/sync-statutory-instruments-treaties; report 81).
// The first full load is not done here: scripts/load-statutory-instruments-treaties.ts loads every record once, in
// batches. After that, each run reads only what can have changed:
//   1. si-list       the newest SI list pages, back to WINDOW_DAYS before today (new instruments and changes to recent
//                    ones), written as summaries: only new rows and rows whose details changed;
//   2. si-flags      the API's MotionToStop and ConcernsRaisedByCommittee lists over the same window, for
//                    prayed_against and (until a timeline is read) committee_concerns;
//   3. treaty-list   the newest TREATY_PAGE treaties;
//   4. timelines     detail and timeline, one record at a time: new and open treaties, new and recent instruments (recent
//                    ones again every REFRESH_DAYS while scrutiny can still change), then the backlog of older
//                    instruments never read (newest first), as far as the time budget allows.
// Time budget and resume (the pattern of lib/commons-press-releases-sync.ts): the run stops before BUDGET_MS, saves
// in sync_cursor the steps still to do in this pass, and the next run carries on from there. A record whose timeline
// is read gets timeline_fetched_at, so it is not read twice in a pass. A stop by the budget returns 200 with
// partial: true; a database error or an error answer from an API fails (5xx); no answer at all fails (504).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ParliamentApi, SI_API, TREATY_API, API_TIMEOUT_MS, unwrap, siRowFromSummary, siRowFromDetail, treatyRow,
  type ApiList, type ApiSi, type ApiTreaty, type ApiBusinessItem,
} from './parliament-si-treaties';

export const CURSOR_ROUTE = '/api/sync-statutory-instruments-treaties';
export const BUDGET_MS = 240_000;            // 80 per cent of the route's maxDuration (300 s)
const WINDOW_DAYS = 120;                     // scrutiny periods are 40 days (negative) or longer for some affirmatives
const REFRESH_DAYS = 3;                      // re-read a recent instrument's timeline at most this often
const RECENT_DAYS = 60;                      // "recent" for timeline refreshes
const LIST_PAGE = 100;
const TREATY_PAGE = 100;
const WRITE_CHUNK = 500;                     // no single write over 500 rows
const RESERVE_MS = 4_000;                    // kept back for writes and the cursor
const MAX_LIST_PAGES = 20;
const PASS_MAX_AGE_MS = 20 * 3600_000;    // a daily run starts a new pass

type Step = 'si-list' | 'si-flags' | 'treaty-list' | 'timelines';
const STEPS: Step[] = ['si-list', 'si-flags', 'treaty-list', 'timelines'];
type Cursor = { pending: Step[]; listSkip: number; passStartedAt: string };

export type SyncDeps = { supabase: SupabaseClient; fetchFn?: typeof fetch; budgetMs?: number; gapMs?: number; now?: () => Date; log?: (m: string) => void };
export type SyncResult = { status: number; body: Record<string, unknown> };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (now: Date, n: number) => isoDay(new Date(now.getTime() - n * 86400_000));

export async function runSiTreatiesSync(deps: SyncDeps): Promise<SyncResult> {
  const { supabase } = deps;
  const api = new ParliamentApi(deps.fetchFn, deps.gapMs);
  const budgetMs = deps.budgetMs ?? BUDGET_MS;
  const nowDate = deps.now ? deps.now() : new Date();
  const now = nowDate.toISOString();
  const started = Date.now();
  const left = () => started + budgetMs - Date.now();
  const log = deps.log ?? ((m: string) => console.log(`[si-treaties] ${m}`));
  const windowStart = daysAgo(nowDate, WINDOW_DAYS);

  const { data: cur, error: curErr } = await supabase.from('sync_cursor').select('cursor, updated_at').eq('route', CURSOR_ROUTE).maybeSingle();
  if (curErr) return { status: 500, body: { ok: false, error: `cursor: ${curErr.message}` } };
  const saved = cur?.cursor as Cursor | null | undefined;
  // A saved pass more than PASS_MAX_AGE_MS old is dropped: the list steps are cheap and must run every day, and the
  // timeline queue carries on by itself (it is read from timeline_fetched_at).
  const resumed = saved && Array.isArray(saved.pending) && saved.pending.length > 0 && nowDate.getTime() - Date.parse(saved.passStartedAt) < PASS_MAX_AGE_MS ? saved : null;
  const state: Cursor = resumed ? { ...resumed } : { pending: [...STEPS], listSkip: 0, passStartedAt: now };

  const stats = { siListed: 0, siWritten: 0, flagsWritten: 0, treatiesListed: 0, treatiesWritten: 0, siTimelines: 0, treatyTimelines: 0, noAnswer: [] as string[], backlogLeft: null as number | null };
  let answered = 0;
  let failure: { status: number; error: string } | null = null;
  let stoppedByBudget = false;

  // ---- helpers ----
  const timeout = () => Math.min(API_TIMEOUT_MS, left() - RESERVE_MS);
  async function call<T>(url: string): Promise<T | null | 'budget'> {
    if (timeout() < 3_000) return 'budget';
    try {
      const r = await api.get<T>(url, timeout());
      if (r === null) { stats.noAnswer.push(url.replace(/^https:\/\/[^/]+/, '')); return null; }
      answered++;
      return r;
    } catch (e) {
      failure = { status: 502, error: (e as Error).message };
      throw e;
    }
  }
  async function upsert(table: string, rows: Record<string, unknown>[]): Promise<boolean> {
    for (let i = 0; i < rows.length; i += WRITE_CHUNK) {
      const { error } = await supabase.from(table).upsert(rows.slice(i, i + WRITE_CHUNK), { onConflict: 'api_id' });
      if (error) { failure = { status: 500, error: `${table} upsert: ${error.message}` }; return false; }
    }
    return true;
  }
  async function stored<T>(table: string, cols: string, ids: string[]): Promise<Map<string, T> | null> {
    const out = new Map<string, T>();
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await supabase.from(table).select(cols).in('api_id', ids.slice(i, i + 100));
      if (error) { failure = { status: 500, error: `${table} read: ${error.message}` }; return null; }
      for (const r of (data ?? []) as unknown as (T & { api_id: string })[]) out.set(r.api_id, r);
    }
    return out;
  }

  try {
    // 1. Newest SI list pages, back to the window start.
    if (state.pending[0] === 'si-list') {
      for (let pages = 0; pages < MAX_LIST_PAGES; pages++) {
        const r = await call<ApiList<ApiSi>>(`${SI_API}/StatutoryInstrument?Take=${LIST_PAGE}&Skip=${state.listSkip}`);
        if (r === 'budget') { stoppedByBudget = true; break; }
        if (r === null) break;                                   // no answer: the next run tries this page again
        const items = r.items.map((x) => unwrap(x));
        stats.siListed += items.length;
        const rows = items.map((s) => siRowFromSummary(s, now));
        const old = await stored<Record<string, unknown>>('statutory_instruments', 'api_id, title, si_number, procedure, made_date, laid_date, in_force_date, legislation_url', rows.map((x) => x.api_id));
        if (!old) break;
        const changed = rows.filter((x) => {
          const o = old.get(x.api_id);
          return !o || (['title', 'si_number', 'procedure', 'made_date', 'laid_date', 'in_force_date'] as const).some((k) => (o[k] ?? null) !== (x[k] ?? null))
            || (!o.legislation_url && !!x.legislation_url);
        }).map((x) => {
          const o = old.get(x.api_id);
          // Keep a legislation.gov.uk link read from the detail record over the one built from the number.
          return o?.legislation_url ? { ...x, legislation_url: o.legislation_url as string } : x;
        });
        if (changed.length && !(await upsert('statutory_instruments', changed))) break;
        stats.siWritten += changed.length;
        state.listSkip += LIST_PAGE;
        const oldest = rows.map((x) => x.laid_date).filter(Boolean).sort()[0];
        if (items.length < LIST_PAGE || (oldest && oldest < windowStart)) { state.pending.shift(); state.listSkip = 0; break; }
      }
    }

    // 2. The API's flag lists over the window (one or two pages each).
    if (!failure && !stoppedByBudget && state.pending[0] === 'si-flags') {
      let complete = true;
      for (const [filter, col] of [['MotionToStop', 'prayed_against'], ['ConcernsRaisedByCommittee', 'committee_concerns']] as const) {
        const ids: string[] = [];
        for (let skip = 0; skip < LIST_PAGE * MAX_LIST_PAGES; skip += LIST_PAGE) {
          const r = await call<ApiList<ApiSi>>(`${SI_API}/StatutoryInstrument?${filter}=true&Take=${LIST_PAGE}&Skip=${skip}`);
          if (r === 'budget') { stoppedByBudget = true; complete = false; break; }
          if (r === null) { complete = false; break; }
          const items = r.items.map((x) => unwrap(x));
          ids.push(...items.map((s) => s.id));
          const oldest = items.map((s) => siRowFromSummary(s, now).laid_date).filter(Boolean).sort()[0];
          if (items.length < LIST_PAGE || (oldest && oldest < windowStart)) break;
        }
        if (!complete) break;
        // prayed_against: set from the list for every row; committee_concerns only where no timeline has been read
        // (a timeline says more exactly whether a committee drew it to the House's special attention).
        const old = await stored<{ api_id: string; prayed_against: boolean; committee_concerns: boolean; timeline_fetched_at: string | null }>('statutory_instruments', 'api_id, prayed_against, committee_concerns, timeline_fetched_at', ids);
        if (!old) break;
        const updates = [...old.values()].filter((o) => !o[col] && (col === 'prayed_against' || !o.timeline_fetched_at)).map((o) => ({ api_id: o.api_id, [col]: true, updated_at: now }));
        for (const u of updates) {
          const { error } = await supabase.from('statutory_instruments').update(u).eq('api_id', u.api_id);
          if (error) { failure = { status: 500, error: `flags update: ${error.message}` }; break; }
        }
        if (failure) break;
        stats.flagsWritten += updates.length;
      }
      if (complete && !failure) state.pending.shift();
    }

    // 3. Newest treaties.
    if (!failure && !stoppedByBudget && state.pending[0] === 'treaty-list') {
      const r = await call<ApiList<ApiTreaty>>(`${TREATY_API}/Treaty?Take=${TREATY_PAGE}`);
      if (r === 'budget') stoppedByBudget = true;
      else if (r !== null) {
        const rows = r.items.map((x) => treatyRow(unwrap(x), null, now));
        stats.treatiesListed = rows.length;
        const old = await stored<Record<string, unknown>>('treaties', 'api_id, title, command_paper, signed_date, laid_date, lead_department, laying_department, scrutiny_concluded, conclusion, govuk_url', rows.map((x) => x.api_id));
        if (old) {
          const keys = ['title', 'command_paper', 'signed_date', 'laid_date', 'lead_department', 'laying_department', 'scrutiny_concluded', 'conclusion', 'govuk_url'] as const;
          const changed = rows.filter((x) => { const o = old.get(x.api_id); return !o || keys.some((k) => (o[k] ?? null) !== (x[k] ?? null)); });
          if (!changed.length || (await upsert('treaties', changed))) { stats.treatiesWritten = changed.length; state.pending.shift(); }
        }
      }
    }

    // 4. Timelines, one record at a time, as far as the budget allows.
    if (!failure && !stoppedByBudget && state.pending[0] === 'timelines') {
      const refreshBefore = new Date(nowDate.getTime() - REFRESH_DAYS * 86400_000).toISOString();
      const queue: { kind: 'si' | 'treaty'; id: string }[] = [];
      const q = async (table: string, build: (b: ReturnType<SupabaseClient['from']>) => PromiseLike<{ data: unknown; error: { message: string } | null }>, kind: 'si' | 'treaty') => {
        const { data, error } = await build(supabase.from(table));
        if (error) { failure = { status: 500, error: `${table} queue: ${error.message}` }; return; }
        for (const r of (data ?? []) as { api_id: string }[]) if (!queue.some((x) => x.id === r.api_id)) queue.push({ kind, id: r.api_id });
      };
      const recent = daysAgo(nowDate, RECENT_DAYS);
      // Open and new treaties first (a few a month), then new and recent instruments.
      await q('treaties', (t) => t.select('api_id').or(`timeline_fetched_at.is.null,and(scrutiny_concluded.eq.false,timeline_fetched_at.lt.${refreshBefore})`).order('laid_date', { ascending: false }).limit(100), 'treaty');
      await q('statutory_instruments', (t) => t.select('api_id').is('timeline_fetched_at', null).gte('laid_date', windowStart).order('laid_date', { ascending: false }).limit(200), 'si');
      await q('statutory_instruments', (t) => t.select('api_id').lt('timeline_fetched_at', refreshBefore).gte('laid_date', recent).order('laid_date', { ascending: false }).limit(200), 'si');
      const urgent = queue.length;
      await q('statutory_instruments', (t) => t.select('api_id').is('timeline_fetched_at', null).lt('laid_date', windowStart).order('laid_date', { ascending: false }).limit(300), 'si');

      for (let i = 0; i < queue.length && !failure; i++) {
        const item = queue[i];
        if (item.kind === 'si') {
          const detail = await call<{ value?: ApiSi } & ApiSi>(`${SI_API}/StatutoryInstrument/${item.id}`);
          if (detail === 'budget') { stoppedByBudget = i < urgent; break; }
          if (detail === null) continue;
          const bi = await call<ApiBusinessItem[] | ApiList<ApiBusinessItem>>(`${SI_API}/StatutoryInstrument/${item.id}/BusinessItems`);
          if (bi === 'budget') { stoppedByBudget = i < urgent; break; }
          if (bi === null) continue;
          const items = Array.isArray(bi) ? bi : bi.items;
          const old = await stored<{ api_id: string; prayed_against: boolean; committee_concerns: boolean }>('statutory_instruments', 'api_id, prayed_against, committee_concerns', [item.id]);
          if (!old) break;
          const row = siRowFromDetail(unwrap(detail), items as ApiBusinessItem[], { committee: !!old.get(item.id)?.committee_concerns, motion: !!old.get(item.id)?.prayed_against }, now);
          if (!(await upsert('statutory_instruments', [row]))) break;
          stats.siTimelines++;
        } else {
          const t = await call<{ value?: ApiTreaty } & ApiTreaty>(`${TREATY_API}/Treaty/${item.id}`);
          if (t === 'budget') { stoppedByBudget = i < urgent; break; }
          if (t === null) continue;
          const bi = await call<ApiBusinessItem[] | ApiList<ApiBusinessItem>>(`${TREATY_API}/Treaty/${item.id}/BusinessItems`);
          if (bi === 'budget') { stoppedByBudget = i < urgent; break; }
          if (bi === null) continue;
          const items = Array.isArray(bi) ? bi : bi.items;
          if (!(await upsert('treaties', [treatyRow(unwrap(t), items as ApiBusinessItem[], now) as Record<string, unknown>]))) break;
          stats.treatyTimelines++;
        }
      }
      if (!failure && !stoppedByBudget) state.pending.shift();
      const { count } = await supabase.from('statutory_instruments').select('api_id', { count: 'exact', head: true }).is('timeline_fetched_at', null);
      stats.backlogLeft = count ?? null;
    }
  } catch (e) {
    if (!failure) failure = { status: 500, error: (e as Error).message };
  }

  // Save where this pass stands, or clear it when the pass is complete.
  let cursorSaved: boolean | null = null;
  if (state.pending.length) {
    const { error } = await supabase.from('sync_cursor').upsert({ route: CURSOR_ROUTE, cursor: state, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    cursorSaved = !error;
    if (error) log(`could not save the position to resume from: ${error.message}`);
  } else if (cur) {
    await supabase.from('sync_cursor').delete().eq('route', CURSOR_ROUTE);
  }

  const upserted = stats.siWritten + stats.flagsWritten + stats.treatiesWritten + stats.siTimelines + stats.treatyTimelines;
  const body = {
    ok: !failure, partial: state.pending.length > 0, stoppedByBudget, resumed: !!resumed, passStartedAt: state.passStartedAt,
    stepsLeft: state.pending, cursorSaved, ...stats, upserted, requests: api.calls.length, durationMs: Date.now() - started, syncedAt: now,
    ...(failure ? { error: (failure as { error: string }).error } : {}),
  };
  if (failure) return { status: (failure as { status: number }).status, body };
  if (answered === 0 && api.calls.length > 0) return { status: 504, body: { ...body, ok: false, error: 'no API answered within the time limit' } };
  return { status: 200, body };
}
