// Cron: the Parliament archive backfill and top up (owner's approval, 29 Oct 2026, "go"). Writes ONLY to
// parliament_written_questions, hansard_contributions and parliament_archive_sync_state
// (scripts/migrations/2026-10-29a-parliament-archive.sql).
//
// Two sources, one after the other:
//   speeches   Commons spoken contributions from the Hansard API, sitting days from 2024-07-04 in date order. For each
//              day: the day's sections (sectionsforday), the debates in each spoken section (sectiontrees), then one
//              request per debate (debates/debate), whose items carry every contribution's full text.
//   questions  Written questions, Commons and Lords, tabled from 2024-07-04 in date order: a list page of ids for each
//              day, then one detail request per question, because list pages cut answers short. Starts only once
//              speeches has finished_at set.
// The cursor (parliament_archive_sync_state.cursor) is the current date and position in it, saved with every batch of
// rows, so a run that stops part way loses nothing. Rows are upserted by primary key, so a batch read twice is never
// duplicated. When a source reaches today it sets finished_at; from then on it tops up only the last 3 days, at most
// once every TOP_UP_EVERY_MS, so a run every 10 minutes does not reread the same days each time.
//
// Politeness: one request at a time, at least 0.5 s apart. HTTP 429 or 5xx: last_error is recorded, the cursor saved,
// and the run ends cleanly (the next run tries again); nothing is retried in a loop. New requests stop at 80 per cent
// of maxDuration.

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withHeartbeat } from '@/lib/sync-heartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 270;

const ROUTE = '/api/sync-parliament-archive';
const START = '2024-07-04';
const BUDGET_MS = Math.floor(maxDuration * 1000 * 0.8); // no new request after 216 s
const RESERVE_MS = 15_000;                              // kept for the closing save
const GAP_MS = 500;                                     // at least 0.5 s between requests
const REQUEST_TIMEOUT_MS = 20_000;
const DB_TIMEOUT_MS = 10_000;
const TOP_UP_DAYS = 3;
const TOP_UP_EVERY_MS = 6 * 60 * 60 * 1000;
const UA = 'opengovt.uk parliament archive (https://www.opengovt.uk; contact@opengovt.uk)';
const HANSARD = 'https://hansard-api.parliament.uk';
const QUESTIONS = 'https://questions-statements-api.parliament.uk/api/writtenquestions';
// Spoken sections of a sitting day; written statements and corrections are left out.
const SKIP_SECTIONS = new Set(['WMS', 'Correction', 'Petition', 'Petitions']);

class StopRun extends Error {}           // the time budget is spent
class SourceRefused extends Error {}     // HTTP 429 or 5xx: stop cleanly, try again next run

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const day = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return day(d); };

// Plain text from Hansard and answer HTML: paragraphs kept as blank lines, tags dropped, entities decoded.
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', pound: '£' };
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type State = { source: string; cursor: Record<string, unknown> | null; rows_done: number | null; last_run_at: string | null; last_error: string | null; finished_at: string | null };

class Run {
  readonly started = Date.now();
  private lastRequest = 0;
  requests = 0;
  rows = 0;
  // A local test (testOptions) writes rows but never the sync state, so the backfill cursor is untouched.
  constructor(readonly db: SupabaseClient, readonly budgetMs: number, readonly saveStateToo = true) {}

  timeLeft() { return this.budgetMs - (Date.now() - this.started); }

  async get<T>(url: string): Promise<T> {
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

  async state(source: string): Promise<State> {
    const { data, error } = await this.db.from('parliament_archive_sync_state').select('*').eq('source', source).maybeSingle();
    if (error) throw new Error(`state read: ${error.message}`);
    return (data as State | null) ?? { source, cursor: null, rows_done: 0, last_run_at: null, last_error: null, finished_at: null };
  }

  async saveState(s: State) {
    if (!this.saveStateToo) return;
    const { error } = await this.db.from('parliament_archive_sync_state').upsert({ ...s, last_run_at: new Date().toISOString() }, { onConflict: 'source' });
    if (error) throw new Error(`state save: ${error.message}`);
  }

  async upsert(table: string, key: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const { error } = await this.db.from(table).upsert(rows, { onConflict: key });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
    this.rows += rows.length;
  }
}

// ---------- speeches ----------

type SpeechCursor = { date: string; debates?: { id: string; title: string; section: string }[]; next?: number };
type TreeNode = { Id?: number; ParentId?: number | null; Title?: string; ExternalId?: string; SectionTreeItems?: TreeNode[] };
type DebateItem = { ItemType: string; MemberId: number | null; Value: string | null; ExternalId: string | null };
type Debate = { Overview?: { Title?: string; ExtId?: string; Location?: string; House?: string }; Items?: DebateItem[] };

async function debatesForDay(run: Run, date: string) {
  const sections = await run.get<string[]>(`${HANSARD}/overview/sectionsforday.json?date=${date}&house=Commons`);
  const out: { id: string; title: string; section: string }[] = [];
  for (const section of (Array.isArray(sections) ? sections : []).filter((s) => !SKIP_SECTIONS.has(s))) {
    const tree = await run.get<TreeNode | TreeNode[]>(`${HANSARD}/overview/sectiontrees.json?date=${date}&house=Commons&section=${encodeURIComponent(section)}`);
    for (const root of Array.isArray(tree) ? tree : [tree]) {
      const items = root.SectionTreeItems ?? [];
      const parents = new Set<number>(items.map((i) => i.ParentId).filter((x): x is number => x != null));
      // Leaf entries only: a parent heading's own request would repeat its children's contributions.
      for (const i of items) if (i.ExternalId && !(i.Id != null && parents.has(i.Id))) out.push({ id: i.ExternalId, title: (i.Title ?? '').trim(), section });
    }
  }
  return out;
}

function slug(s: string) { return s.replace(/[^A-Za-z0-9]+/g, '').slice(0, 60) || 'Debate'; }

async function runSpeeches(run: Run, s: State, from: string, until: string, topUp: boolean) {
  const base = run.rows;
  let cur: SpeechCursor = (!topUp && s.cursor && typeof s.cursor.date === 'string') ? (s.cursor as SpeechCursor) : { date: from };
  if (cur.date < from) cur = { date: from };
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const save = async () => { await run.saveState({ ...s, cursor: topUp ? s.cursor : cur, rows_done: rowsDone(), last_error: null }); };
  try {
    while (cur.date <= until) {
      if (!cur.debates) { cur = { date: cur.date, debates: await debatesForDay(run, cur.date), next: 0 }; }
      const list = cur.debates ?? [];
      while ((cur.next ?? 0) < list.length) {
        const d = list[cur.next ?? 0];
        const deb = await run.get<Debate>(`${HANSARD}/debates/debate/${d.id}.json`);
        const rows = (deb.Items ?? []).filter((i) => i.ItemType === 'Contribution' && i.ExternalId).map((i) => ({
          ext_id: i.ExternalId,
          member_id: i.MemberId || null,
          house: 'Commons',
          sitting_date: cur.date,
          debate_title: (deb.Overview?.Title ?? d.title).trim(),
          debate_section: deb.Overview?.Location ?? d.section,
          debate_ext_id: d.id,
          contribution_text: htmlToText(i.Value),
          url: `https://hansard.parliament.uk/Commons/${cur.date}/debates/${d.id}/${slug(deb.Overview?.Title ?? d.title)}#contribution-${i.ExternalId}`,
          fetched_at: new Date().toISOString(),
        }));
        await run.upsert('hansard_contributions', 'ext_id', rows);
        cur.next = (cur.next ?? 0) + 1;
        if (!topUp) await save();
      }
      cur = { date: addDays(cur.date, 1) };
      if (!topUp) await save();
    }
    // Reached today: backfill finished; a top up just records its run.
    await run.saveState({ ...s, cursor: topUp ? s.cursor : { date: until }, rows_done: rowsDone(), last_error: null, finished_at: topUp ? s.finished_at : (s.finished_at ?? new Date().toISOString()) });
    return 'done';
  } catch (e) {
    if (e instanceof StopRun) { await save(); return 'partial'; }
    if (e instanceof SourceRefused) { await run.saveState({ ...s, cursor: topUp ? s.cursor : cur, rows_done: rowsDone(), last_error: `${e.message} at ${new Date().toISOString()}` }); return 'refused'; }
    throw e;
  }
}

// ---------- questions ----------

type QCursor = { date: string; skip?: number; ids?: number[]; next?: number };
type WQ = { id: number; uin: string; house: string; dateTabled: string | null; dateAnswered: string | null; askingMemberId: number | null; answeringMemberId: number | null; answeringBodyId: number | null; answeringBodyName: string | null; heading: string | null; questionText: string | null; answerText: string | null; isWithdrawn: boolean | null };
const PAGE = 100;

async function runQuestions(run: Run, s: State, from: string, until: string, topUp: boolean) {
  const base = run.rows;
  let cur: QCursor = (!topUp && s.cursor && typeof s.cursor.date === 'string') ? (s.cursor as QCursor) : { date: from };
  if (cur.date < from) cur = { date: from };
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const save = async () => { await run.saveState({ ...s, cursor: topUp ? s.cursor : cur, rows_done: rowsDone(), last_error: null }); };
  try {
    while (cur.date <= until) {
      if (!cur.ids) {
        const page = await run.get<{ totalResults: number; results: { value: { id: number } }[] }>(`${QUESTIONS}/questions?tabledWhenFrom=${cur.date}&tabledWhenTo=${cur.date}&take=${PAGE}&skip=${cur.skip ?? 0}`);
        cur = { date: cur.date, skip: cur.skip ?? 0, ids: page.results.map((r) => r.value.id), next: 0 };
        (cur as QCursor & { total?: number }).total = page.totalResults;
      }
      const batch: Record<string, unknown>[] = [];
      while ((cur.next ?? 0) < (cur.ids ?? []).length) {
        const id = (cur.ids ?? [])[cur.next ?? 0];
        const q = (await run.get<{ value: WQ }>(`${QUESTIONS}/questions/${id}`)).value;
        const tabled = q.dateTabled ? q.dateTabled.slice(0, 10) : null;
        batch.push({
          id: q.id, uin: q.uin, house: q.house, date_tabled: tabled, date_answered: q.dateAnswered ? q.dateAnswered.slice(0, 10) : null,
          asking_member_id: q.askingMemberId, answering_member_id: q.answeringMemberId, answering_body_id: q.answeringBodyId,
          answering_body: q.answeringBodyName, heading: q.heading, question_text: htmlToText(q.questionText),
          answer_text: q.answerText ? htmlToText(q.answerText) : null, answer_html: q.answerText, is_withdrawn: q.isWithdrawn,
          url: tabled ? `https://questions-statements.parliament.uk/written-questions/detail/${tabled}/${q.uin}` : null,
          fetched_at: new Date().toISOString(),
        });
        cur.next = (cur.next ?? 0) + 1;
        if (batch.length >= 20) { await run.upsert('parliament_written_questions', 'id', batch.splice(0)); if (!topUp) await save(); }
      }
      await run.upsert('parliament_written_questions', 'id', batch.splice(0));
      const total = (cur as QCursor & { total?: number }).total ?? 0;
      const nextSkip = (cur.skip ?? 0) + PAGE;
      cur = nextSkip < total ? { date: cur.date, skip: nextSkip } : { date: addDays(cur.date, 1) };
      if (!topUp) await save();
    }
    await run.saveState({ ...s, cursor: topUp ? s.cursor : { date: until }, rows_done: rowsDone(), last_error: null, finished_at: topUp ? s.finished_at : (s.finished_at ?? new Date().toISOString()) });
    return 'done';
  } catch (e) {
    if (e instanceof StopRun) { await save(); return 'partial'; }
    if (e instanceof SourceRefused) { await run.saveState({ ...s, cursor: topUp ? s.cursor : cur, rows_done: rowsDone(), last_error: `${e.message} at ${new Date().toISOString()}` }); return 'refused'; }
    throw e;
  }
}

// ---------- the run ----------

// Database calls get their own timeout, so a stalled save cannot hold the run past the limit.
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DB_TIMEOUT_MS);
  init?.signal?.addEventListener('abort', () => ctrl.abort());
  return fetch(input, { ...init, signal: ctrl.signal, cache: 'no-store' }).finally(() => clearTimeout(timer));
}

// Local tests only: ?source=speeches|questions&date=YYYY-MM-DD fetches that one day (as a top up, so the backfill
// cursor is untouched) and ?budget_ms shortens the run. Never honoured on Vercel production.
function testOptions(req: Request) {
  if (process.env.VERCEL_ENV === 'production') return null;
  const u = new URL(req.url);
  const date = u.searchParams.get('date');
  const source = u.searchParams.get('source');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (source !== 'speeches' && source !== 'questions')) return null;
  return { date, source, budgetMs: Number(u.searchParams.get('budget_ms')) || BUDGET_MS };
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: fetchWithTimeout } });

  const test = testOptions(req);
  const run = new Run(db, test?.budgetMs ?? BUDGET_MS, !test);
  const today = day(new Date());
  const results: Record<string, string> = {};

  if (test) {
    const s = await run.state(test.source);
    results[test.source] = test.source === 'speeches'
      ? await runSpeeches(run, s, test.date, test.date, true)
      : await runQuestions(run, s, test.date, test.date, true);
  } else {
    const speeches = await run.state('speeches');
    const speechesTopUpDue = !speeches.last_run_at || Date.now() - new Date(speeches.last_run_at).getTime() > TOP_UP_EVERY_MS;
    if (!speeches.finished_at) results.speeches = await runSpeeches(run, speeches, START, today, false);
    else if (speechesTopUpDue) results.speeches = await runSpeeches(run, speeches, addDays(today, -TOP_UP_DAYS), today, true);
    // Questions start once the speeches backfill has finished, and only while time is left in this run.
    const sp = await run.state('speeches');
    if (sp.finished_at && results.speeches !== 'partial' && results.speeches !== 'refused' && run.timeLeft() > RESERVE_MS * 2) {
      const questions = await run.state('questions');
      const qTopUpDue = !questions.last_run_at || Date.now() - new Date(questions.last_run_at).getTime() > TOP_UP_EVERY_MS;
      if (!questions.finished_at) results.questions = await runQuestions(run, questions, START, today, false);
      else if (qTopUpDue) results.questions = await runQuestions(run, questions, addDays(today, -TOP_UP_DAYS), today, true);
    }
  }

  const partial = Object.values(results).some((r) => r === 'partial' || r === 'refused');
  const body = { ok: true, rows_written: run.rows, requests: run.requests, results, partial, elapsed_ms: Date.now() - run.started, syncedAt: new Date().toISOString() };
  console.log(`[sync-parliament-archive] ${body.elapsed_ms} ms, ${run.requests} requests, ${run.rows} rows, ${JSON.stringify(results)}`);
  return NextResponse.json(body);
}

export const GET = withHeartbeat(ROUTE, GET_impl);
