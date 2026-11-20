// The archive sync's shared parts (moved unchanged from app/api/sync-parliament-archive/route.ts, 17 Nov 2026, COWORK-TO-T1
// ENTRY 216): settings, the Run (time budget, requests, upserts, cursors) and the written question passes, so the daily
// route and the weekly catch-up from the owner's Mac (scripts/catchup-written-questions.ts) run the same code on the same
// cursors. A route file may export only its handlers and settings, hence this module. Nothing here refreshes pages.
import type { SupabaseClient } from '@supabase/supabase-js';
import { answerChanged, type AnswerRow } from '@/lib/written-answers-refresh';
import { htmlToText, questionRow, type WQ } from '@/lib/written-question-row';

// Hansard's shapes and the stored rows the Run compares against (moved with it).
export type Listed = { id: string; title: string; section: string; parent?: string | null; position?: number; kids?: string[] };
export type DayCursor = { date: string; debates?: Listed[]; next?: number };
export type TreeNode = { Id?: number; ParentId?: number | null; Title?: string; ExternalId?: string; SectionTreeItems?: TreeNode[] };
export type DebateItem = { ItemType: string; MemberId: number | null; AttributedTo?: string | null; Value: string | null; ExternalId: string | null };
export type Overview = {
  Title?: string; ExtId?: string; Location?: string; House?: string; Date?: string;
  NextDebateExtId?: string | null; NextDebateTitle?: string | null; PreviousDebateExtId?: string | null; PreviousDebateTitle?: string | null;
};
export type Debate = { Overview?: Overview; Items?: DebateItem[] | null; ChildDebates?: Debate[] | null };
export type Known = { guid: string; fetched_at: string | null; settled_at: string | null; gone_at: string | null };
export type Stored = { ext_id: string; item_order: number | null; item_type: string | null; attributed_to: string | null; contribution_text: string | null; removed_at?: string | null };

export async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

// The route's maxDuration (it must be a literal in the route file, so it is repeated there).
export const MAX_DURATION_S = 270;
export const START = '2024-07-04';
export const BUDGET_MS = Math.floor(MAX_DURATION_S * 1000 * 0.8); // no new request after 216 s
export const RESERVE_MS = 15_000;                              // kept for the closing save
export const GAP_MS = 500;                                     // at least 0.5 s between requests
export const REQUEST_TIMEOUT_MS = 20_000;
export const DB_TIMEOUT_MS = 10_000;
export const TOP_UP_DAYS = 3;
export const TOP_UP_EVERY_MS = 6 * 60 * 60 * 1000;
export const ITEM_BATCH = 50;                                  // rows per upsert (about 100 KB when value_html was stored)
export const SETTLE_DAYS = 14;                                 // re-fetched daily until this old, then settled
export const REFETCH_AFTER_MS = 20 * 60 * 60 * 1000;           // "daily", with slack for the 10 minute schedule
export const OUR_IDS_EVERY_MS = 24 * 60 * 60 * 1000;
export const MONTHLY_EVERY_MS = 30 * 24 * 60 * 60 * 1000;
export const MONTHLY_SAMPLE = 20;
export const ANSWERED_EVERY_MS = 30 * 60 * 1000;               // newly answered questions: due on every (now daily) run
// Owner, 16 Nov 2026 (ENTRY 205 option b): a sitting day has 180 to 520 answers, each read on its own 0.5 s apart; 60 s
// read about 110, so the once a day run fell behind. The pass may now use the rest of the run (it comes after the speeches
// top up, the debates re-fetch and the daily checks, which keep their own shares); the run's budget still ends it.
export const ANSWERED_PHASE_MS = 200_000;
export const ANSWERED_FIRST_FROM = '2026-11-02';               // where the pass starts if it has never finished
export const UNANSWERED_EVERY_MS = 20 * 60 * 60 * 1000;         // "daily", with slack for the 10 minute schedule
export const UNANSWERED_PHASE_MS = 60_000;
export const WEEKLY_EVERY_MS = 6 * 24 * 60 * 60 * 1000;
export const WEEKLY_PHASE_MS = 120_000;
export const WEEKLY_DAYS = 90;
export const GONE_KEPT = 50;                                   // ids Parliament no longer has, listed in the cursor
export const CHANGES_KEPT = 50;                                // text changes listed in the cursor (the total is kept too)
// Time given to each pass of a run (the debates backfill and questions share what is left).
export const TOP_UP_PHASE_MS = 60_000;
export const REFETCH_PHASE_MS = 45_000;
export const OUR_IDS_PHASE_MS = 45_000;
export const MONTHLY_PHASE_MS = 30_000;
export const UA = 'opengovt.uk parliament archive (https://www.opengovt.uk; contact@opengovt.uk)';
export const HANSARD = 'https://hansard-api.parliament.uk';
export const QUESTIONS = 'https://questions-statements-api.parliament.uk/api/writtenquestions';
// Spoken sections of a sitting day; written statements and corrections are left out.
export const SKIP_SECTIONS = new Set(['WMS', 'Correction', 'Petition', 'Petitions']);

export class StopRun extends Error {}           // the time budget is spent
export class SourceRefused extends Error {}     // HTTP 429 or 5xx: stop cleanly, try again next run

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const day = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return day(d); };
// Hansard ids come in either case; hansard_debates and new rows keep them in upper case, as the page links them.
export const up = (id: string | null | undefined) => (id ?? '').trim().toUpperCase() || null;

export type State = { source: string; cursor: Record<string, unknown> | null; rows_done: number | null; last_run_at: string | null; last_error: string | null; finished_at: string | null };
export type Row = Record<string, unknown>;
export type TextChange = { guid: string; at: string; via: string };
// Counters and logs kept in the debates cursor: this run's additions, written on top of the stored values.
export type DebatesExtra = { with_items: number; parents_filled: number; changes: TextChange[]; monthly?: Row; our_ids_checked_at?: string };

export class Run {
  readonly started = Date.now();
  private lastRequest = 0;
  private phaseEnd = Infinity;
  requests = 0;
  rows = 0;
  fromList = 0;                          // tabled questions stored straight from a list page (ENTRY 211)
  readSingly = 0;                        // questions read one by one by the tabled pass
  // Duplicate primary keys dropped within an upsert batch, by source, this run (owner's approval, 29 Oct 2026: a
  // debate can list the same contribution twice, and Postgres refuses a batch that updates one row twice). The running
  // total is kept in each source's cursor as dupes_dropped; baseDupes is the total stored before this run.
  readonly dupes: Record<string, number> = {};
  private readonly baseDupes: Record<string, number> = {};
  readonly extra: DebatesExtra = { with_items: 0, parents_filled: 0, changes: [] };
  private baseExtra: { with_items: number; parents_filled: number; changes: TextChange[]; total: number } | null = null;
  // Local tests only: dry runs write nothing and read nothing from the database; what would be written is kept here.
  readonly captured: { table: string; rows: Row[] }[] = [];
  private readonly dryOwners = new Map<string, string>();   // dry runs: ext_id -> debate, for rows "written" this run
  readonly answerChanges: (AnswerRow & { was: string; now: string })[] = [];   // new or changed answers written this run
  weekly: { listed: number; read: number; gone: number[] } | null = null;
  pretendChanged = false;                                  // local tests only: every question read counts as changed
  // A local test (testOptions) writes rows but never the sync state, so the backfill cursor is untouched.
  constructor(readonly db: SupabaseClient, readonly budgetMs: number, readonly saveStateToo = true, readonly dry = false) {}

  timeLeft() { return Math.min(this.budgetMs - (Date.now() - this.started), this.phaseEnd - Date.now()); }

  // One pass with its own share of the run: it stops (StopRun) when its share is spent, like the run's own budget.
  async phase<T>(ms: number, fn: () => Promise<T>): Promise<T> {
    this.phaseEnd = Date.now() + ms + RESERVE_MS;
    try { return await fn(); } finally { this.phaseEnd = Infinity; }
  }

  // `missing`: HTTP 400 or 404 returns null (Hansard's answer for an id it does not have) instead of failing the run.
  async get<T>(url: string, missing = false): Promise<T | null> {
    if (this.timeLeft() < RESERVE_MS) throw new StopRun('budget');
    const wait = this.lastRequest + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastRequest = Date.now();
    this.requests++;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(REQUEST_TIMEOUT_MS, Math.max(1000, this.timeLeft() - 5000)));
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal, cache: 'no-store' });
      if (res.status === 429 || res.status >= 500) throw new SourceRefused(`HTTP ${res.status} from ${new URL(url).host}`);
      if (missing && (res.status === 400 || res.status === 404)) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).pathname}`);
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof SourceRefused) throw e;
      if (ctrl.signal.aborted) throw new SourceRefused(`timeout from ${new URL(url).host}`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async getJson<T>(url: string): Promise<T> { return (await this.get<T>(url)) as T; }

  // A debate record, or null when Hansard no longer has the id (400 or 404, or 200 with no Overview, as the page reads it).
  async getDebate(guid: string): Promise<Debate | null> {
    const d = await this.get<Debate>(`${HANSARD}/debates/debate/${guid}.json`, true);
    return d && d.Overview ? d : null;
  }

  async state(source: string): Promise<State> {
    const blank: State = { source, cursor: null, rows_done: 0, last_run_at: null, last_error: null, finished_at: null };
    if (this.dry) return blank;
    const { data, error } = await this.db.from('parliament_archive_sync_state').select('*').eq('source', source).maybeSingle();
    if (error) throw new Error(`state read: ${error.message}`);
    const c = (data as State | null)?.cursor ?? null;
    if (!(source in this.baseDupes)) this.baseDupes[source] = Number(c?.dupes_dropped) || 0;
    if (source === 'debates' && !this.baseExtra) {
      this.baseExtra = {
        with_items: Number(c?.with_items) || 0,
        parents_filled: Number(c?.parents_filled) || 0,
        changes: Array.isArray(c?.text_changes) ? (c.text_changes as TextChange[]) : [],
        total: Number(c?.text_changes_total) || 0,
      };
    }
    return (data as State | null) ?? blank;
  }

  // `ranNow` false keeps last_run_at, so a top up stopped part way is due again on the next run.
  async saveState(s: State, ranNow = true) {
    if (!this.saveStateToo || this.dry) return;
    const dupes = (this.baseDupes[s.source] ?? 0) + (this.dupes[s.source] ?? 0);
    let cursor: Record<string, unknown> = { ...(s.cursor ?? {}), dupes_dropped: dupes };
    if (s.source === 'debates' && this.baseExtra) {
      const b = this.baseExtra;
      const x = this.extra;
      cursor = {
        ...cursor,
        with_items: b.with_items + x.with_items,
        parents_filled: b.parents_filled + x.parents_filled,
        text_changes_total: b.total + x.changes.length,
        text_changes: [...[...x.changes].reverse(), ...b.changes].slice(0, CHANGES_KEPT),
        ...(x.monthly ? { monthly: x.monthly } : {}),
        ...(x.our_ids_checked_at ? { our_ids_checked_at: x.our_ids_checked_at } : {}),
      };
    }
    const row = { ...s, cursor, ...(ranNow ? { last_run_at: new Date().toISOString() } : {}) };
    const { error } = await this.db.from('parliament_archive_sync_state').upsert(row, { onConflict: 'source' });
    if (error) throw new Error(`state save: ${error.message}`);
  }

  // One copy per primary key: `better` says whether a later copy replaces the one kept so far. Saved ITEM_BATCH rows
  // at a time. Returns the rows kept.
  async upsert(table: string, key: string, rows: Row[], source: string, better: (next: Row, kept: Row) => boolean): Promise<Row[]> {
    if (!rows.length) return [];
    const byKey = new Map<unknown, Row>();
    for (const row of rows) {
      const kept = byKey.get(row[key]);
      if (!kept || better(row, kept)) byKey.set(row[key], row);
    }
    const unique = [...byKey.values()];
    this.dupes[source] = (this.dupes[source] ?? 0) + rows.length - unique.length;
    await this.write(table, key, unique);
    return unique;
  }

  // Questions, noting first which of them carry a new or changed answer, so only those members' pages are refreshed.
  async saveQuestions(rows: Row[]) {
    if (!rows.length) return;
    const { data, error } = await this.db.from('parliament_written_questions').select('id, date_answered, answer_html, is_withdrawn, heading, answering_body, date_holding_answer, date_answer_corrected').in('id', rows.map((r) => r.id));
    if (error) throw new Error(`stored questions read: ${error.message}`);
    const held = new Map(((data ?? []) as HeldAnswer[]).map((r) => [r.id, r]));
    const kept = await this.upsert('parliament_written_questions', 'id', rows, 'questions', laterAnswer);
    for (const r of kept) {
      const h = held.get(r.id as number);
      if (!this.pretendChanged && !answerChanged(r, h)) continue;
      this.answerChanges.push({ id: r.id as number, house: r.house as string | null, asking_member_id: r.asking_member_id as number | null, was: h ? `${h.date_answered}` : 'not held', now: `${r.date_answered}` });
    }
  }

  async write(table: string, key: string, rows: Row[]) {
    for (let i = 0; i < rows.length; i += ITEM_BATCH) {
      const batch = rows.slice(i, i + ITEM_BATCH);
      if (this.dry) {
        this.captured.push({ table, rows: batch });
        if (table === 'hansard_contributions') for (const r of batch) this.dryOwners.set(String(r.ext_id), String(r.debate_ext_id));
      }
      else {
        const { error } = await this.db.from(table).upsert(batch, { onConflict: key });
        if (error) throw new Error(`${table} upsert: ${error.message}`);
      }
      this.rows += batch.length;
    }
  }

  // Contributions Hansard no longer lists under a debate it has re-published: marked removed_at, never deleted
  // (owner, 30 Oct 2026: archived speeches are never hard deleted; migration 2026-10-30g). A later fetch that lists one
  // again clears removed_at, as every stored row is written with removed_at null.
  async markRemoved(extIds: string[]) {
    const now = new Date().toISOString();
    for (let i = 0; i < extIds.length; i += ITEM_BATCH) {
      const batch = extIds.slice(i, i + ITEM_BATCH);
      if (this.dry) { this.captured.push({ table: 'hansard_contributions:removed', rows: batch.map((ext_id) => ({ ext_id })) }); continue; }
      const { error } = await this.db.from('hansard_contributions').update({ removed_at: now }).in('ext_id', batch).is('removed_at', null);
      if (error) throw new Error(`hansard_contributions mark removed: ${error.message}`);
    }
  }

  // hansard_debates rows already stored for these ids.
  async knownDebates(guids: string[]): Promise<Map<string, Known>> {
    const out = new Map<string, Known>();
    if (this.dry || !guids.length) return out;
    for (let i = 0; i < guids.length; i += 100) {
      const { data, error } = await this.db.from('hansard_debates').select('guid, fetched_at, settled_at, gone_at').in('guid', guids.slice(i, i + 100));
      if (error) throw new Error(`hansard_debates read: ${error.message}`);
      for (const r of (data ?? []) as Known[]) out.set(r.guid, r);
    }
    return out;
  }

  // The items stored for a debate, under its id in either case (rows written before Stage 1 kept Hansard's case).
  async storedItems(ids: string[]): Promise<Stored[]> {
    if (this.dry) return [];
    const out: Stored[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.db.from('hansard_contributions')
        .select('ext_id, item_order, item_type, attributed_to, contribution_text, removed_at')
        .in('debate_ext_id', [...new Set(ids)]).order('ext_id').range(from, from + 999);
      if (error) throw new Error(`hansard_contributions read: ${error.message}`);
      out.push(...((data ?? []) as Stored[]));
      if (!data || data.length < 1000) return out;
    }
  }

  // Of these contribution ids, the ones stored under a debate other than `ids` (this debate, in either case).
  async storedElsewhere(extIds: string[], ids: string[]): Promise<Set<string>> {
    const out = new Set<string>();
    const self = new Set(ids.map((i) => up(i)));
    const unique = [...new Set(extIds)];
    for (let i = 0; i < unique.length; i += 100) {
      const batch = unique.slice(i, i + 100);
      let owners: { ext_id: string; debate_ext_id: string | null }[];
      if (this.dry) owners = batch.filter((e) => this.dryOwners.has(e)).map((e) => ({ ext_id: e, debate_ext_id: this.dryOwners.get(e)! }));
      else {
        const { data, error } = await this.db.from('hansard_contributions').select('ext_id, debate_ext_id').in('ext_id', batch).is('removed_at', null);
        if (error) throw new Error(`hansard_contributions read: ${error.message}`);
        owners = (data ?? []) as typeof owners;
      }
      // A row marked removed under another debate is not kept there: this debate takes it back under its own id.
      for (const r of owners) if (!self.has(up(r.debate_ext_id))) out.add(r.ext_id);
    }
    return out;
  }

  async childrenOf(guid: string): Promise<string[]> {
    if (this.dry) return [];
    const { data, error } = await this.db.from('hansard_debates').select('guid').eq('parent_guid', guid);
    if (error) throw new Error(`hansard_debates read: ${error.message}`);
    return ((data ?? []) as { guid: string }[]).map((r) => r.guid);
  }

  // Hansard answered 400 or 404: the id is kept with gone_at, so the page can go on redirecting it (Stage 2).
  async markGone(guid: string, about: Row = {}) {
    const now = new Date().toISOString();
    await this.write('hansard_debates', 'guid', [{ guid, ...about, fetched_at: now, gone_at: now }]);
  }
}

// ---------- questions ----------

export type QCursor = { date: string; skip?: number; ids?: number[]; next?: number };
// The questions top up (owner, 4 Nov 2026) keeps its place in cursor.top_up: three days can hold over 1,000 questions and a
// run reads about 300, so starting again from the oldest day each time never reached the newest (3 Nov was missed). A top
// up in progress carries on at the next run, every 10 minutes, and top_up is removed when it finishes.
export const PAGE = 100;
// Parliament's list pages cut questionText at 255 characters and carry no answer or attachments (checked 17 Nov 2026: 42
// of the first 100 questions tabled on 16 Nov were cut). A question that is unanswered and listed under this length is
// whole on the list, so the tabled pass stores it from there; any other is read on its own (ENTRY 211).
export const LIST_TEXT_CUT = 255;
export const wholeOnList = (q: WQ) => !q.dateAnswered && !q.answerText && typeof q.questionText === 'string' && q.questionText.length < LIST_TEXT_CUT;
// Questions: the copy with the latest date_answered, or else the last one seen.
export const laterAnswer = (a: Record<string, unknown>, b: Record<string, unknown>) => String(a.date_answered ?? '') >= String(b.date_answered ?? '');

// onlyMissing (local tests only, ?missing_only=1): ids already stored are not fetched again (owner, 3 Nov 2026: the
// recovery of questions skipped before the fix, scripts/recover-written-question-days.js).
export async function runQuestions(run: Run, s: State, from: string, until: string, topUp: boolean, onlyMissing = false, keepPlace = false) {
  const base = run.rows;
  const savedTopUp = keepPlace ? (s.cursor?.top_up as QCursor | undefined) : undefined;
  let cur: QCursor = (!topUp && s.cursor && typeof s.cursor.date === 'string') ? (s.cursor as QCursor) : (savedTopUp ?? { date: from });
  if (!savedTopUp && cur.date < from) cur = { date: from };
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const cursorNow = () => (keepPlace ? { ...(s.cursor ?? {}), top_up: cur } : topUp ? s.cursor : cur);
  const save = async () => { await run.saveState({ ...s, cursor: cursorNow(), rows_done: rowsDone(), last_error: null }); };
  // Questions read but not yet written. The cursor moves past each question as it is read, so whenever a run stops
  // (time budget), times out or is refused, these are written before the cursor is saved (owner, 3 Nov 2026: before,
  // up to 19 questions were skipped at each stop). If that write fails, the cursor is not saved and they are read again.
  const batch: Record<string, unknown>[] = [];
  const flush = () => run.saveQuestions(batch.splice(0));
  try {
    while (cur.date <= until) {
      if (!cur.ids) {
        const page = await run.getJson<{ totalResults: number; results: { value: WQ }[] }>(`${QUESTIONS}/questions?tabledWhenFrom=${cur.date}&tabledWhenTo=${cur.date}&take=${PAGE}&skip=${cur.skip ?? 0}`);
        let listed = page.results.map((r) => r.value);
        if (onlyMissing && listed.length) {
          const { data, error } = await run.db.from('parliament_written_questions').select('id').in('id', listed.map((q) => q.id));
          if (error) throw new Error(`stored ids read: ${error.message}`);
          const stored = new Set((data ?? []).map((r: { id: number }) => r.id));
          listed = listed.filter((q) => !stored.has(q.id));
        }
        // Whole on the list (ENTRY 211): stored from the page, no request each. Written with the batch below, before the
        // cursor moves past this page, as the questions read one by one are.
        const whole = listed.filter(wholeOnList);
        for (const q of whole) batch.push(questionRow(q));
        run.fromList += whole.length;
        const ids = listed.filter((q) => !wholeOnList(q)).map((q) => q.id);
        cur = { date: cur.date, skip: cur.skip ?? 0, ids, next: 0 };
        (cur as QCursor & { total?: number }).total = page.totalResults;
      }
      while ((cur.next ?? 0) < (cur.ids ?? []).length) {
        const id = (cur.ids ?? [])[cur.next ?? 0];
        const q = (await run.getJson<{ value: WQ }>(`${QUESTIONS}/questions/${id}`)).value;
        batch.push(questionRow(q));
        run.readSingly++;
        cur.next = (cur.next ?? 0) + 1;
        if (batch.length >= 20) { await flush(); if (!topUp || keepPlace) await save(); }
      }
      await flush();
      const total = (cur as QCursor & { total?: number }).total ?? 0;
      const nextSkip = (cur.skip ?? 0) + PAGE;
      cur = nextSkip < total ? { date: cur.date, skip: nextSkip } : { date: addDays(cur.date, 1) };
      if (!topUp || keepPlace) await save();
    }
    const withoutTopUp = () => { const rest = { ...(s.cursor ?? {}) }; delete rest.top_up; return rest; };
    await run.saveState({ ...s, cursor: keepPlace ? withoutTopUp() : topUp ? s.cursor : { date: until }, rows_done: rowsDone(), last_error: null, finished_at: topUp ? s.finished_at : (s.finished_at ?? new Date().toISOString()) });
    return 'done';
  } catch (e) {
    // A stop, a timeout (SourceRefused) or a refusal: the questions already read are written first, then the cursor.
    if (e instanceof StopRun || e instanceof SourceRefused) await flush();
    if (e instanceof StopRun) { await save(); return 'partial'; }
    if (e instanceof SourceRefused) { await run.saveState({ ...s, cursor: cursorNow(), rows_done: rowsDone(), last_error: `${e.message} at ${new Date().toISOString()}` }); return 'refused'; }
    throw e;
  }
}

// Newly answered and corrected questions, whatever day they were tabled (owner, 5 Nov 2026): the top up re-reads only
// questions tabled in the last 3 days, and the median answer takes 8. From the day before the last finished pass, the list
// by answered date and then by corrected date; a question is read in full only if we do not hold that answer, so a pass
// costs a few list pages plus the new answers. Keeps its place in cursor.answered, like the top up.
export type ACursor = { from: string; stage: 'answered' | 'corrected'; skip: number; ids?: number[]; next?: number; total?: number };
export type ListedQ = { id: number; dateAnswered: string | null; dateAnswerCorrected: string | null; answerText?: string | null; isWithdrawn?: boolean | null; heading?: string | null; answeringBodyName?: string | null; dateHoldingAnswer?: string | null };
export type HeldAnswer = { id: number; date_answered: string | null; answer_html: string | null; is_withdrawn: boolean | null; heading: string | null; answering_body: string | null; date_holding_answer: string | null; date_answer_corrected: string | null };

export async function runAnswered(run: Run, s: State, firstFrom: string | null) {
  const base = run.rows;
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const okAt = typeof s.cursor?.answered_ok_at === 'string' ? s.cursor.answered_ok_at : null;
  const from = firstFrom ?? (okAt ? addDays(okAt.slice(0, 10), -1) : ANSWERED_FIRST_FROM);
  const startedAt = new Date().toISOString();
  let cur: ACursor = (!firstFrom && (s.cursor?.answered as ACursor | undefined)) || { from, stage: 'answered', skip: 0 };
  const save = async () => { await run.saveState({ ...s, cursor: { ...(s.cursor ?? {}), answered: cur }, rows_done: rowsDone(), last_error: null }, false); };
  const batch: Record<string, unknown>[] = [];
  const flush = () => run.saveQuestions(batch.splice(0));
  try {
    for (;;) {
      if (!cur.ids) {
        const key = cur.stage === 'answered' ? 'answeredWhenFrom' : 'correctedWhenFrom';
        const page = await run.getJson<{ totalResults: number; results: { value: ListedQ }[] }>(`${QUESTIONS}/questions?${key}=${cur.from}&take=${PAGE}&skip=${cur.skip}`);
        const listed = page.results.map((r) => r.value);
        const { data, error } = listed.length ? await run.db.from('parliament_written_questions').select('id, date_answered, fetched_at').in('id', listed.map((q) => q.id)) : { data: [], error: null };
        if (error) throw new Error(`stored answers read: ${error.message}`);
        const held = new Map(((data ?? []) as { id: number; date_answered: string | null; fetched_at: string | null }[]).map((r) => [r.id, r]));
        const stale = (q: ListedQ) => {
          const h = held.get(q.id);
          if (!h || (h.date_answered ?? null) !== (q.dateAnswered ? q.dateAnswered.slice(0, 10) : null)) return true;
          // A correction has a date, not a time: read again until a read is from a later day.
          return !!q.dateAnswerCorrected && String(h.fetched_at ?? '').slice(0, 10) <= q.dateAnswerCorrected.slice(0, 10);
        };
        cur = { ...cur, ids: listed.filter(stale).map((q) => q.id), next: 0, total: page.totalResults };
      }
      while ((cur.next ?? 0) < (cur.ids ?? []).length) {
        const q = (await run.getJson<{ value: WQ }>(`${QUESTIONS}/questions/${(cur.ids ?? [])[cur.next ?? 0]}`)).value;
        batch.push(questionRow(q));
        cur.next = (cur.next ?? 0) + 1;
        if (batch.length >= 20) { await flush(); await save(); }
      }
      await flush();
      const nextSkip = cur.skip + PAGE;
      if (nextSkip < (cur.total ?? 0)) cur = { from: cur.from, stage: cur.stage, skip: nextSkip };
      else if (cur.stage === 'answered') cur = { from: cur.from, stage: 'corrected', skip: 0 };
      else break;
      await save();
    }
    const rest = { ...(s.cursor ?? {}) };
    delete rest.answered;
    await run.saveState({ ...s, cursor: { ...rest, answered_ok_at: startedAt }, rows_done: rowsDone(), last_error: null }, false);
    return 'done';
  } catch (e) {
    if (e instanceof StopRun || e instanceof SourceRefused) await flush();
    if (e instanceof StopRun) { await save(); return 'partial'; }
    if (e instanceof SourceRefused) { await run.saveState({ ...s, cursor: { ...(s.cursor ?? {}), answered: cur }, rows_done: rowsDone(), last_error: `${e.message} at ${new Date().toISOString()}` }, false); return 'refused'; }
    throw e;
  }
}

// The last 90 days of answers against Parliament's lists, a day at a time (owner, 6 Nov 2026), for what the half hourly pass
// cannot see: an answer re-dated or changed without a correction date, or gone from the day we hold it under. A question is
// read in full only if its list entry differs from what we hold, or if we hold it under a day whose list does not have it.
// List entries carry the first 255 characters or so of an answer as plain text, so a change further in with no correction
// date is not seen; reading all of them in full would take 21,000 requests a week. Keeps its place in cursor.weekly.
export type WCursor = { date: string; until: string; skip: number; seen: number[]; ids?: number[]; next?: number; total?: number; startedAt: string; listed: number; read: number; gone: number[] };
export const squash = (html: string | null | undefined) => htmlToText(html).replace(/\s+/g, '');

// Whether a list entry differs from the row held. Differences of spacing or markup between the two do not count.
export function listEntryDiffers(q: ListedQ, h: HeldAnswer | undefined) {
  if (!h) return true;
  if ((h.date_answered ?? null) !== (q.dateAnswered ? q.dateAnswered.slice(0, 10) : null)) return true;
  if (!!h.is_withdrawn !== !!q.isWithdrawn) return true;
  if ((h.date_holding_answer ?? null) !== (q.dateHoldingAnswer ? q.dateHoldingAnswer.slice(0, 10) : null)) return true;
  if ((h.date_answer_corrected ?? null) !== (q.dateAnswerCorrected ? q.dateAnswerCorrected.slice(0, 10) : null)) return true;
  if ((h.heading ?? null) !== (q.heading ?? null) || (h.answering_body ?? null) !== (q.answeringBodyName ?? null)) return true;
  const listed = q.answerText ?? '';
  const cut = listed.endsWith('...');
  const shown = squash(cut ? listed.slice(0, -3) : listed);
  const stored = squash(h.answer_html);
  return cut ? !stored.startsWith(shown) : stored !== shown;
}

export async function runWeekly(run: Run, s: State, firstFrom: string | null, today: string) {
  const base = run.rows;
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const fresh = (): WCursor => ({ date: firstFrom ?? addDays(today, -WEEKLY_DAYS), until: today, skip: 0, seen: [], startedAt: new Date().toISOString(), listed: 0, read: 0, gone: [] });
  let cur: WCursor = (!firstFrom && (s.cursor?.weekly as WCursor | undefined)) || fresh();
  const save = async () => { await run.saveState({ ...s, cursor: { ...(s.cursor ?? {}), weekly: cur }, rows_done: rowsDone(), last_error: null }, false); };
  const batch: Record<string, unknown>[] = [];
  const flush = () => run.saveQuestions(batch.splice(0));
  try {
    while (cur.date <= cur.until) {
      if (!cur.ids) {
        const page = await run.getJson<{ totalResults: number; results: { value: ListedQ }[] }>(`${QUESTIONS}/questions?answeredWhenFrom=${cur.date}&answeredWhenTo=${cur.date}&includeWithdrawn=true&take=${PAGE}&skip=${cur.skip}`);
        const listed = page.results.map((r) => r.value);
        const { data, error } = listed.length ? await run.db.from('parliament_written_questions').select('id, date_answered, answer_html, is_withdrawn, heading, answering_body, date_holding_answer, date_answer_corrected').in('id', listed.map((q) => q.id)) : { data: [], error: null };
        if (error) throw new Error(`stored answers read: ${error.message}`);
        const held = new Map(((data ?? []) as HeldAnswer[]).map((r) => [r.id, r]));
        const ids = listed.filter((q) => listEntryDiffers(q, held.get(q.id))).map((q) => q.id);
        const seen = [...cur.seen, ...listed.map((q) => q.id)];
        // The day's last page: anything we hold under this day that Parliament does not list under it.
        if (cur.skip + PAGE >= page.totalResults) {
          const date = cur.date;
          // Not ordered: date_answered has no index, and ordering by id makes a busy day's last page walk the whole primary key
          // to its end, which hit the statement timeout on 19 Oct (1,999 rows). A row missed here is found next week.
          const ours = await readAll<{ id: number }>((from, to) => run.db.from('parliament_written_questions').select('id').eq('date_answered', date).range(from, to));
          const known = new Set(seen);
          ids.push(...ours.map((r) => r.id).filter((id) => !known.has(id)));
        }
        cur = { ...cur, seen, ids, next: 0, total: page.totalResults, listed: cur.listed + listed.length };
      }
      while ((cur.next ?? 0) < (cur.ids ?? []).length) {
        const id = (cur.ids ?? [])[cur.next ?? 0];
        const got = await run.get<{ value: WQ }>(`${QUESTIONS}/questions/${id}`, true);
        if (got?.value) batch.push(questionRow(got.value));
        else cur.gone = [...cur.gone, id].slice(-GONE_KEPT);   // kept in the table: nothing is deleted on Parliament's say so
        cur.read++;
        cur.next = (cur.next ?? 0) + 1;
        if (batch.length >= 20) { await flush(); await save(); }
      }
      await flush();
      const nextSkip = cur.skip + PAGE;
      cur = nextSkip < (cur.total ?? 0)
        ? { ...cur, skip: nextSkip, ids: undefined, next: undefined }
        : { ...cur, date: addDays(cur.date, 1), skip: 0, seen: [], ids: undefined, next: undefined, total: undefined };
      await save();
    }
    run.weekly = { listed: cur.listed, read: cur.read, gone: cur.gone };
    const rest = { ...(s.cursor ?? {}) };
    delete rest.weekly;
    await run.saveState({ ...s, cursor: { ...rest, weekly_ok_at: cur.startedAt, weekly_last: { from: firstFrom ?? null, listed: cur.listed, read: cur.read, gone: cur.gone } }, rows_done: rowsDone(), last_error: null }, false);
    return 'done';
  } catch (e) {
    if (e instanceof StopRun || e instanceof SourceRefused) await flush();
    run.weekly = { listed: cur.listed, read: cur.read, gone: cur.gone };
    if (e instanceof StopRun) { await save(); return 'partial'; }
    if (e instanceof SourceRefused) { await run.saveState({ ...s, cursor: { ...(s.cursor ?? {}), weekly: cur }, rows_done: rowsDone(), last_error: `${e.message} at ${new Date().toISOString()}` }, false); return 'refused'; }
    throw e;
  }
}

// Once a day (owner, 6 Nov 2026): the unanswered list, withdrawn questions included, about 42 pages. A holding answer or a withdrawal comes
// while a question has no answer, so neither the half hourly pass, which lists answers, nor the 3 day top up sees it. Reads in full only a
// question whose holding date or withdrawal differs from what we hold, or that we do not hold. Keeps its place in cursor.unanswered.
export type UCursor = { window: number; skip: number; ids?: number[]; next?: number; total?: number };
// By date, because the API fails on deep pages of this list: the last three months, then everything older. About 40 pages.
export function unansweredWindows(today: string): string[] {
  const cuts = [addDays(today, -30), addDays(today, -60), addDays(today, -90)];
  return [`tabledWhenFrom=${cuts[0]}`, `tabledWhenFrom=${cuts[1]}&tabledWhenTo=${addDays(cuts[0], -1)}`, `tabledWhenFrom=${cuts[2]}&tabledWhenTo=${addDays(cuts[1], -1)}`, `tabledWhenFrom=${START}&tabledWhenTo=${addDays(cuts[2], -1)}`];
}
export async function runUnanswered(run: Run, s: State, today: string) {
  const windows = unansweredWindows(today);
  const base = run.rows;
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const startedAt = new Date().toISOString();
  let cur: UCursor = (s.cursor?.unanswered as UCursor | undefined) || { window: 0, skip: 0 };
  const save = async () => { await run.saveState({ ...s, cursor: { ...(s.cursor ?? {}), unanswered: cur }, rows_done: rowsDone(), last_error: null }, false); };
  const batch: Record<string, unknown>[] = [];
  const flush = () => run.saveQuestions(batch.splice(0));
  try {
    for (;;) {
      if (!cur.ids) {
        const page = await run.getJson<{ totalResults: number; results: { value: ListedQ }[] }>(`${QUESTIONS}/questions?answered=Unanswered&${windows[cur.window]}&includeWithdrawn=true&take=${PAGE}&skip=${cur.skip}`);
        const listed = page.results.map((r) => r.value);
        const { data, error } = listed.length ? await run.db.from('parliament_written_questions').select('id, date_holding_answer, is_withdrawn').in('id', listed.map((q) => q.id)) : { data: [], error: null };
        if (error) throw new Error(`stored holding answers read: ${error.message}`);
        const held = new Map(((data ?? []) as { id: number; date_holding_answer: string | null; is_withdrawn: boolean | null }[]).map((r) => [r.id, r]));
        const stale = (q: ListedQ) => {
          const h = held.get(q.id);
          return !h || !!h.is_withdrawn !== !!q.isWithdrawn || (h.date_holding_answer ?? null) !== (q.dateHoldingAnswer ? q.dateHoldingAnswer.slice(0, 10) : null);
        };
        cur = { ...cur, ids: listed.filter(stale).map((q) => q.id), next: 0, total: page.totalResults };
      }
      while ((cur.next ?? 0) < (cur.ids ?? []).length) {
        batch.push(questionRow((await run.getJson<{ value: WQ }>(`${QUESTIONS}/questions/${(cur.ids ?? [])[cur.next ?? 0]}`)).value));
        cur.next = (cur.next ?? 0) + 1;
        if (batch.length >= 20) { await flush(); await save(); }
      }
      await flush();
      const nextSkip = cur.skip + PAGE;
      if (nextSkip < (cur.total ?? 0)) cur = { window: cur.window, skip: nextSkip };
      else if (cur.window + 1 < windows.length) cur = { window: cur.window + 1, skip: 0 };
      else break;
      await save();
    }
    const rest = { ...(s.cursor ?? {}) };
    delete rest.unanswered;
    await run.saveState({ ...s, cursor: { ...rest, unanswered_ok_at: startedAt }, rows_done: rowsDone(), last_error: null }, false);
    return 'done';
  } catch (e) {
    if (e instanceof StopRun || e instanceof SourceRefused) await flush();
    if (e instanceof StopRun) { await save(); return 'partial'; }
    if (e instanceof SourceRefused) { await run.saveState({ ...s, cursor: { ...(s.cursor ?? {}), unanswered: cur }, rows_done: rowsDone(), last_error: `${e.message} at ${new Date().toISOString()}` }, false); return 'refused'; }
    throw e;
  }
}

// The Sunday 03:08 UTC run (ENTRY 205): Sunday 03:00 to 03:59 UTC.
export const inWeeklyWindow = (now: Date) => now.getUTCDay() === 0 && now.getUTCHours() === 3;

// ---------- the weekly catch-up's lock (ENTRY 216) ----------

// scripts/catchup-written-questions.ts holds this row while it runs from the owner's Mac: cursor.lock_until in the future.
// The daily route then leaves every written question pass alone, so the two never write the same cursors at once; the
// script in turn will not start within 6 minutes of the route's last questions run. A crashed catch-up stops blocking
// when lock_until passes.
export const CATCHUP_SOURCE = 'questions-catchup';
export async function catchupLockedUntil(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.from('parliament_archive_sync_state').select('cursor').eq('source', CATCHUP_SOURCE).maybeSingle();
  if (error) throw new Error(`catch-up lock read: ${error.message}`);
  const until = (data as { cursor: Record<string, unknown> | null } | null)?.cursor?.lock_until;
  return typeof until === 'string' && new Date(until).getTime() > Date.now() ? until : null;
}
