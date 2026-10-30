// Cron: the Parliament archive backfill and top up (owner's approval, 29 Oct 2026, "go"). Writes ONLY to
// parliament_written_questions, hansard_contributions, hansard_debates and parliament_archive_sync_state
// (scripts/migrations/2026-10-29a-parliament-archive.sql and 2026-10-30f-hansard-debates.sql).
//
// Sources, one after the other in each run:
//   speeches   Commons spoken contributions from the Hansard API, sitting days from 2024-07-04 in date order. For each
//              day: the day's sections (sectionsforday), the debates in each spoken section (sectiontrees), then one
//              request per debate (debates/debate), whose items carry every contribution's full text. Backfill
//              finished 30 Oct 2026; it now tops up the last 3 days every 6 hours.
//   debates    Debates from our own database, Stage 1 (owner's approval, 30 Oct 2026). The same day walk again over
//              every sitting day, storing what the debate page needs: each record's overview (title, house, date,
//              location, previous and next) in hansard_debates, the parent links and positions from the section trees,
//              and for every item its order, type, speaker label (AttributedTo) and HTML (value_html), alongside
//              contribution_text as before. Parent headings and sitting headers are fetched once each too; only their
//              own items are stored (their children are stored under the children's own ids).
//   re-fetch   A debate is fetched again once a day until it is 14 days old, then settled_at is set. A re-fetch that
//              changes the text re-stores the debate and is recorded in the debates cursor (text_changes); the page
//              refresh comes in Stage 2. Hansard answering 400 or 404 for a stored id sets gone_at.
//   our ids    Once the debates backfill has finished, once a day: every Commons id in our debates table that has no
//              hansard_debates row is fetched (Hansard re-issues some sitting headers under new ids; those get gone_at).
//   monthly    Once the debates backfill has finished, once every 30 days: 20 random settled debates are fetched again;
//              any whose text differs is re-stored and listed in the cursor (monthly), which the freshness monitor shows.
//   questions  Written questions, Commons and Lords, tabled from 2024-07-04 in date order: a list page of ids for each
//              day, then one detail request per question, because list pages cut answers short. Starts only once
//              speeches has finished_at set.
// The cursor (parliament_archive_sync_state.cursor) is the current date and position in it, saved with every batch of
// rows, so a run that stops part way loses nothing. Rows are upserted by primary key, so a batch read twice is never
// duplicated. When a source reaches today it sets finished_at; from then on speeches and questions top up only the last
// 3 days, at most once every TOP_UP_EVERY_MS, so a run every 10 minutes does not reread the same days each time.
// While the questions backfill is unfinished, the debates backfill takes 60 per cent of a run's remaining time.
//
// Saves go in batches of ITEM_BATCH rows (owner, 30 Oct 2026): a whole debate in one upsert (up to 2,002 items) hit the
// statement timeout at 15:28 on 30 Oct, and value_html roughly doubles each row.
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
const ITEM_BATCH = 50;                                  // rows per upsert: about 100 KB with value_html
const SETTLE_DAYS = 14;                                 // re-fetched daily until this old, then settled
const REFETCH_AFTER_MS = 20 * 60 * 60 * 1000;           // "daily", with slack for the 10 minute schedule
const OUR_IDS_EVERY_MS = 24 * 60 * 60 * 1000;
const MONTHLY_EVERY_MS = 30 * 24 * 60 * 60 * 1000;
const MONTHLY_SAMPLE = 20;
const CHANGES_KEPT = 50;                                // text changes listed in the cursor (the total is kept too)
// Time given to each pass of a run (the debates backfill and questions share what is left).
const TOP_UP_PHASE_MS = 60_000;
const REFETCH_PHASE_MS = 45_000;
const OUR_IDS_PHASE_MS = 45_000;
const MONTHLY_PHASE_MS = 30_000;
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
// Hansard ids come in either case; hansard_debates and new rows keep them in upper case, as the page links them.
const up = (id: string | null | undefined) => (id ?? '').trim().toUpperCase() || null;

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
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type State = { source: string; cursor: Record<string, unknown> | null; rows_done: number | null; last_run_at: string | null; last_error: string | null; finished_at: string | null };
type Row = Record<string, unknown>;
type TextChange = { guid: string; at: string; via: string };
// Counters and logs kept in the debates cursor: this run's additions, written on top of the stored values.
type DebatesExtra = { with_items: number; parents_filled: number; changes: TextChange[]; monthly?: Row; our_ids_checked_at?: string };

class Run {
  readonly started = Date.now();
  private lastRequest = 0;
  private phaseEnd = Infinity;
  requests = 0;
  rows = 0;
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

  // Contributions Hansard no longer lists under a debate it has re-published.
  async deleteContributions(extIds: string[]) {
    for (let i = 0; i < extIds.length; i += ITEM_BATCH) {
      const batch = extIds.slice(i, i + ITEM_BATCH);
      if (this.dry) { this.captured.push({ table: 'hansard_contributions:delete', rows: batch.map((ext_id) => ({ ext_id })) }); continue; }
      const { error } = await this.db.from('hansard_contributions').delete().in('ext_id', batch);
      if (error) throw new Error(`hansard_contributions delete: ${error.message}`);
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
        .select('ext_id, item_order, item_type, attributed_to, value_html')
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
        const { data, error } = await this.db.from('hansard_contributions').select('ext_id, debate_ext_id').in('ext_id', batch);
        if (error) throw new Error(`hansard_contributions read: ${error.message}`);
        owners = (data ?? []) as typeof owners;
      }
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

// ---------- debates and speeches ----------

// An entry of a sitting day's section trees: a leaf debate, a parent heading or a sitting header. parent and position
// place it among its parent's children; kids are its own children's ids. Cursors saved before Stage 1 have leaves
// only, without parent, position or kids.
type Listed = { id: string; title: string; section: string; parent?: string | null; position?: number; kids?: string[] };
type DayCursor = { date: string; debates?: Listed[]; next?: number };
type TreeNode = { Id?: number; ParentId?: number | null; Title?: string; ExternalId?: string; SectionTreeItems?: TreeNode[] };
type DebateItem = { ItemType: string; MemberId: number | null; AttributedTo?: string | null; Value: string | null; ExternalId: string | null };
type Overview = {
  Title?: string; ExtId?: string; Location?: string; House?: string; Date?: string;
  NextDebateExtId?: string | null; NextDebateTitle?: string | null; PreviousDebateExtId?: string | null; PreviousDebateTitle?: string | null;
};
type Debate = { Overview?: Overview; Items?: DebateItem[] | null; ChildDebates?: Debate[] | null };
type Known = { guid: string; fetched_at: string | null; settled_at: string | null; gone_at: string | null };
type Stored = { ext_id: string; item_order: number | null; item_type: string | null; attributed_to: string | null; value_html: string | null };

async function debatesForDay(run: Run, date: string): Promise<Listed[]> {
  const sections = await run.getJson<string[]>(`${HANSARD}/overview/sectionsforday.json?date=${date}&house=Commons`);
  const out: Listed[] = [];
  for (const section of (Array.isArray(sections) ? sections : []).filter((s) => !SKIP_SECTIONS.has(s))) {
    const tree = await run.getJson<TreeNode | TreeNode[]>(`${HANSARD}/overview/sectiontrees.json?date=${date}&house=Commons&section=${encodeURIComponent(section)}`);
    for (const root of Array.isArray(tree) ? tree : [tree]) {
      const items = root.SectionTreeItems ?? [];
      const extId = new Map<number, string>();
      for (const i of items) if (i.Id != null && i.ExternalId) extId.set(i.Id, up(i.ExternalId)!);
      const kids = new Map<number, string[]>();
      for (const i of items) if (i.ParentId != null && i.ExternalId) kids.set(i.ParentId, [...(kids.get(i.ParentId) ?? []), up(i.ExternalId)!]);
      const siblings = new Map<number | null, number>();
      for (const i of items) {
        const parentId = i.ParentId ?? null;
        const position = siblings.get(parentId) ?? 0;
        siblings.set(parentId, position + 1);
        if (!i.ExternalId) continue;
        out.push({
          id: i.ExternalId, title: (i.Title ?? '').trim(), section,
          parent: parentId != null ? extId.get(parentId) ?? null : null, position,
          kids: i.Id != null ? kids.get(i.Id) ?? [] : [],
        });
      }
    }
  }
  return out;
}

function slug(s: string) { return s.replace(/[^A-Za-z0-9]+/g, '').slice(0, 60) || 'Debate'; }

const fingerprint = (r: Row) =>
  [r.ext_id, r.item_order, r.item_type, r.attributed_to ?? '', r.value_html ?? ''].join('\u0001');

type StoreOpts = {
  originalId: string;                                   // the id as Hansard listed it (rows before Stage 1 kept its case)
  date: string; title?: string; section?: string;       // fallbacks when the overview lacks them
  place?: { parent: string | null; position: number };  // from the day's section tree
  kids: string[] | null;                                // the tree's children, or null to read them from hansard_debates
  known: boolean;                                       // stored before: a text change is recorded
  settledAt: string | null;                             // kept when already settled
  via: string;
};

// Stores one debate record: its own items (Timestamps and items without an id, which show nothing, are left out) and
// then its hansard_debates row, so a row with fetched_at always has its items. A re-fetch whose items are unchanged
// writes only the hansard_debates row.
async function storeDebate(run: Run, guid: string, deb: Debate, o: StoreOpts): Promise<'stored' | 'changed' | 'unchanged'> {
  const ov = deb.Overview ?? {};
  const date = (ov.Date ?? '').slice(0, 10) || o.date;
  const title = (ov.Title ?? o.title ?? '').trim();
  const location = ov.Location ?? o.section ?? null;
  const now = new Date().toISOString();
  let incomplete = false;
  const rows: Row[] = [];
  (deb.Items ?? []).forEach((i, n) => {
    if (i.ItemType === 'Timestamp') return;
    const text = htmlToText(i.Value);
    if (!i.ExternalId) { if (text) incomplete = true; return; }
    rows.push({
      ext_id: i.ExternalId,
      member_id: i.MemberId || null,
      house: 'Commons',
      sitting_date: date,
      debate_title: title,
      debate_section: location,
      debate_ext_id: guid,
      contribution_text: text,
      url: `https://hansard.parliament.uk/Commons/${date}/debates/${o.originalId}/${slug(title)}#contribution-${i.ExternalId}`,
      fetched_at: now,
      item_order: n,
      item_type: i.ItemType,
      attributed_to: (i.AttributedTo ?? '').trim() || null,
      value_html: i.Value ?? null,
    });
  });
  // Children the record has but the tree (or, on a re-fetch, hansard_debates) does not: their items are not stored.
  const childIds = (deb.ChildDebates ?? []).map((c) => up(c.Overview?.ExtId)).filter((x): x is string => !!x);
  if (childIds.length) {
    const expected = new Set(o.kids ?? await run.childrenOf(guid));
    if (childIds.some((c) => !expected.has(c))) incomplete = true;
  }

  // Hansard sometimes publishes one sitting as two records that list the same contribution ids (two "Draft Double
  // Taxation Relief" records of 1 Dec 2025 share 37). ext_id is the primary key, so a contribution already stored
  // under another debate is stored again for this one as "<id>@<this debate>", and neither debate loses items.
  const stored = await run.storedItems([guid, o.originalId]);
  const mine = new Set(stored.map((r) => r.ext_id));
  const copyKey = (e: unknown) => `${e}@${guid}`;
  const elsewhere = await run.storedElsewhere(rows.map((r) => String(r.ext_id)).filter((e) => !mine.has(e) && !mine.has(copyKey(e))), [guid, o.originalId]);
  for (const r of rows) if (mine.has(copyKey(r.ext_id)) || elsewhere.has(String(r.ext_id))) r.ext_id = copyKey(r.ext_id);
  // Speeches: the copy with the longest text.
  const longer = (a: Row, b: Row) => String(a.contribution_text ?? '').length > String(b.contribution_text ?? '').length;
  const byKey = new Map<unknown, Row>();
  for (const r of rows) { const kept = byKey.get(r.ext_id); if (!kept || longer(r, kept)) byKey.set(r.ext_id, r); }
  const unique = [...byKey.values()];
  const same = o.known && stored.length === unique.length
    && JSON.stringify(stored.map(fingerprint).sort()) === JSON.stringify(unique.map(fingerprint).sort());
  const result = o.known ? (same ? 'unchanged' : 'changed') : 'stored';
  if (!same) {
    await run.upsert('hansard_contributions', 'ext_id', rows, 'speeches', longer);
    const keep = new Set(unique.map((r) => r.ext_id));
    const stale = stored.map((r) => r.ext_id).filter((id) => !keep.has(id));
    if (unique.length && stale.length) await run.deleteContributions(stale);
    if (o.known) run.extra.changes.push({ guid, at: now, via: o.via });
  }
  if (!o.known) {
    if (unique.length) run.extra.with_items++;
    if (childIds.length || (o.kids?.length ?? 0) > 0) run.extra.parents_filled++;
  }

  const settled = o.settledAt ?? (date <= addDays(day(new Date()), -SETTLE_DAYS) ? now : null);
  await run.write('hansard_debates', 'guid', [{
    guid, house: ov.House || 'Commons', sitting_date: date, title, location,
    ...(o.place ? { parent_guid: o.place.parent, position: o.place.position } : {}),
    prev_guid: up(ov.PreviousDebateExtId), prev_title: (ov.PreviousDebateTitle ?? '').trim() || null,
    next_guid: up(ov.NextDebateExtId), next_title: (ov.NextDebateTitle ?? '').trim() || null,
    fetched_at: now, settled_at: settled, gone_at: null, incomplete,
  }]);
  return result;
}

const fresh = (k: Known) => !!k.fetched_at && Date.now() - new Date(k.fetched_at).getTime() < REFETCH_AFTER_MS;

// Walks sitting days from `from` to `until`: the section trees, then every listed record not already stored and
// settled (or fetched in the last day). `only` (local tests): just these ids, with their parents and children.
async function runDays(run: Run, s: State, from: string, until: string, topUp: boolean, only?: Set<string>) {
  const base = run.rows;
  let cur: DayCursor = (!topUp && s.cursor && typeof s.cursor.date === 'string') ? (s.cursor as DayCursor) : { date: from };
  if (cur.date < from) cur = { date: from };
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const save = async () => { await run.saveState({ ...s, cursor: topUp ? s.cursor : cur, rows_done: rowsDone(), last_error: null }, !topUp); };
  try {
    while (cur.date <= until) {
      if (!cur.debates) { cur = { date: cur.date, debates: await debatesForDay(run, cur.date), next: 0 }; }
      const list = cur.debates ?? [];
      const wanted = only ? withFamily(list, only) : null;
      const known = await run.knownDebates([...new Set(list.map((d) => up(d.id)!))]);
      while ((cur.next ?? 0) < list.length) {
        const d = list[cur.next ?? 0];
        const guid = up(d.id)!;
        const k = known.get(guid);
        const skip = (wanted && !wanted.has(guid)) || (k && (k.gone_at || k.settled_at || fresh(k)));
        if (!skip) {
          const deb = await run.getDebate(d.id);
          if (!deb) await run.markGone(guid, { title: d.title, sitting_date: cur.date, location: d.section, house: 'Commons' });
          else await storeDebate(run, guid, deb, {
            originalId: d.id, date: cur.date, title: d.title, section: d.section,
            place: d.parent !== undefined ? { parent: d.parent, position: d.position ?? 0 } : undefined,
            kids: d.kids ?? null, known: !!k, settledAt: null, via: topUp ? 'top up' : 'backfill',
          });
          known.set(guid, { guid, fetched_at: new Date().toISOString(), settled_at: null, gone_at: null });
        }
        cur.next = (cur.next ?? 0) + 1;
        if (!topUp && !skip) await save();
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

// The listed ids, their parents up to the sitting header, and all their children.
function withFamily(list: Listed[], only: Set<string>) {
  const parentOf = new Map(list.map((d) => [up(d.id)!, d.parent ?? null]));
  const out = new Set<string>();
  for (const id of only) for (let g: string | null = id; g && !out.has(g); g = parentOf.get(g) ?? null) out.add(g);
  const down = new Set(only);
  for (let grew = true; grew;) {
    grew = false;
    for (const [g, p] of parentOf) if (p && down.has(p) && !down.has(g)) { down.add(g); grew = true; }
  }
  for (const g of down) out.add(g);
  return out;
}

// Stops a pass cleanly on the budget or a refusal, as runDays does.
async function pass(fn: () => Promise<string>): Promise<string> {
  try { return await fn(); } catch (e) {
    if (e instanceof StopRun) return 'partial';
    if (e instanceof SourceRefused) return 'refused';
    throw e;
  }
}

// Daily re-fetch of the debates under 14 days old, oldest fetch first.
async function runRefetch(run: Run, only?: string) {
  return pass(async () => {
    let rows: { guid: string; sitting_date: string }[];
    if (only) rows = [{ guid: only, sitting_date: '' }];
    else if (run.dry) rows = [];
    else {
      const cutoff = new Date(Date.now() - REFETCH_AFTER_MS).toISOString();
      const { data, error } = await run.db.from('hansard_debates').select('guid, sitting_date')
        .is('settled_at', null).is('gone_at', null).lt('fetched_at', cutoff).order('fetched_at').limit(200);
      if (error) throw new Error(`hansard_debates read: ${error.message}`);
      rows = (data ?? []) as typeof rows;
    }
    for (const r of rows) {
      const deb = await run.getDebate(r.guid);
      if (!deb) { await run.markGone(r.guid); continue; }
      await storeDebate(run, r.guid, deb, { originalId: r.guid, date: r.sitting_date, kids: null, known: true, settledAt: null, via: 're-fetch' });
    }
    return rows.length === 200 ? 'partial' : 'done';
  });
}

async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

// Once a day after the backfill: Commons ids in our debates table with no hansard_debates row.
async function runOurIds(run: Run) {
  return pass(async () => {
    const ours = await readAll<{ hansard_ext_id: string; title: string | null; sitting_date: string | null; section: string | null; house: string | null }>((a, b) =>
      run.db.from('debates').select('hansard_ext_id, title, sitting_date, section, house').not('hansard_ext_id', 'is', null).order('id').range(a, b));
    const have = new Set((await readAll<{ guid: string }>((a, b) => run.db.from('hansard_debates').select('guid').order('guid').range(a, b))).map((r) => r.guid));
    const missing = ours.filter((d) => !/lords/i.test(d.house ?? '') && !have.has(up(d.hansard_ext_id)!));
    for (const d of missing) {
      const guid = up(d.hansard_ext_id)!;
      if (have.has(guid)) continue;
      have.add(guid);
      const deb = await run.getDebate(d.hansard_ext_id);
      if (!deb) await run.markGone(guid, { title: d.title, sitting_date: d.sitting_date, location: d.section, house: 'Commons' });
      else await storeDebate(run, guid, deb, { originalId: d.hansard_ext_id, date: d.sitting_date ?? '', title: d.title ?? undefined, section: d.section ?? undefined, kids: null, known: false, settledAt: null, via: 'our ids' });
    }
    run.extra.our_ids_checked_at = new Date().toISOString();
    return `done (${missing.length} missing)`;
  });
}

// Once every 30 days after the backfill: 20 random settled debates fetched again and compared.
async function runMonthly(run: Run) {
  return pass(async () => {
    const settledRows = () => run.db.from('hansard_debates').select('guid, sitting_date, settled_at').not('settled_at', 'is', null).is('gone_at', null);
    const { count, error } = await run.db.from('hansard_debates').select('guid', { count: 'exact', head: true }).not('settled_at', 'is', null).is('gone_at', null);
    if (error) throw new Error(`hansard_debates count: ${error.message}`);
    const offsets = new Set<number>();
    while (offsets.size < Math.min(MONTHLY_SAMPLE, count ?? 0)) offsets.add(Math.floor(Math.random() * (count ?? 0)));
    const differed: string[] = [];
    const gone: string[] = [];
    for (const off of offsets) {
      const { data, error: e } = await settledRows().order('guid').range(off, off);
      if (e) throw new Error(`hansard_debates read: ${e.message}`);
      const r = (data ?? [])[0] as { guid: string; sitting_date: string; settled_at: string } | undefined;
      if (!r) continue;
      const deb = await run.getDebate(r.guid);
      if (!deb) { await run.markGone(r.guid); gone.push(r.guid); continue; }
      const res = await storeDebate(run, r.guid, deb, { originalId: r.guid, date: r.sitting_date, kids: null, known: true, settledAt: r.settled_at, via: 'monthly check' });
      if (res === 'changed') differed.push(r.guid);
    }
    run.extra.monthly = { at: new Date().toISOString(), checked: offsets.size, differed, gone };
    if (differed.length) console.log(`[sync-parliament-archive] monthly check: text differs for ${differed.join(', ')}; re-stored`);
    return `done (${differed.length} of ${offsets.size} differed)`;
  });
}

// ---------- questions ----------

type QCursor = { date: string; skip?: number; ids?: number[]; next?: number };
type WQ = { id: number; uin: string; house: string; dateTabled: string | null; dateAnswered: string | null; askingMemberId: number | null; answeringMemberId: number | null; answeringBodyId: number | null; answeringBodyName: string | null; heading: string | null; questionText: string | null; answerText: string | null; isWithdrawn: boolean | null };
const PAGE = 100;
// Questions: the copy with the latest date_answered, or else the last one seen.
const laterAnswer = (a: Record<string, unknown>, b: Record<string, unknown>) => String(a.date_answered ?? '') >= String(b.date_answered ?? '');

async function runQuestions(run: Run, s: State, from: string, until: string, topUp: boolean) {
  const base = run.rows;
  let cur: QCursor = (!topUp && s.cursor && typeof s.cursor.date === 'string') ? (s.cursor as QCursor) : { date: from };
  if (cur.date < from) cur = { date: from };
  const rowsDone = () => (s.rows_done ?? 0) + run.rows - base;
  const save = async () => { await run.saveState({ ...s, cursor: topUp ? s.cursor : cur, rows_done: rowsDone(), last_error: null }); };
  try {
    while (cur.date <= until) {
      if (!cur.ids) {
        const page = await run.getJson<{ totalResults: number; results: { value: { id: number } }[] }>(`${QUESTIONS}/questions?tabledWhenFrom=${cur.date}&tabledWhenTo=${cur.date}&take=${PAGE}&skip=${cur.skip ?? 0}`);
        cur = { date: cur.date, skip: cur.skip ?? 0, ids: page.results.map((r) => r.value.id), next: 0 };
        (cur as QCursor & { total?: number }).total = page.totalResults;
      }
      const batch: Record<string, unknown>[] = [];
      while ((cur.next ?? 0) < (cur.ids ?? []).length) {
        const id = (cur.ids ?? [])[cur.next ?? 0];
        const q = (await run.getJson<{ value: WQ }>(`${QUESTIONS}/questions/${id}`)).value;
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
        if (batch.length >= 20) { await run.upsert('parliament_written_questions', 'id', batch.splice(0), 'questions', laterAnswer); if (!topUp) await save(); }
      }
      await run.upsert('parliament_written_questions', 'id', batch.splice(0), 'questions', laterAnswer);
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

// Local tests only, never honoured on Vercel production:
//   ?source=speeches|questions|debates&date=YYYY-MM-DD fetches that one day (as a top up, so no cursor is touched);
//   with source=debates, &only=GUID,GUID stores just those debates with their parents and children;
//   ?source=refetch&guid=GUID re-fetches one stored id; ?budget_ms shortens the run;
//   &dry=1 reads and writes nothing in the database and returns the rows it would write.
function testOptions(req: Request) {
  if (process.env.VERCEL_ENV === 'production') return null;
  const u = new URL(req.url);
  const date = u.searchParams.get('date');
  const source = u.searchParams.get('source');
  const guid = u.searchParams.get('guid');
  const dry = u.searchParams.get('dry') === '1';
  const budgetMs = Number(u.searchParams.get('budget_ms')) || BUDGET_MS;
  if (source === 'refetch' && guid && /^[0-9A-Fa-f-]{36}$/.test(guid)) return { source, date: '', guid: up(guid)!, only: null, dry, budgetMs };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (source !== 'speeches' && source !== 'questions' && source !== 'debates')) return null;
  const only = u.searchParams.get('only');
  return { date, source, guid: null, only: only ? new Set(only.split(',').map((g) => up(g)!).filter(Boolean)) : null, dry, budgetMs };
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
  const run = new Run(db, test?.budgetMs ?? BUDGET_MS, !test, !!test?.dry);
  const today = day(new Date());
  const results: Record<string, string> = {};
  const due = (st: State, every: number, at?: unknown) => {
    const last = typeof at === 'string' ? at : st.last_run_at;
    return !last || Date.now() - new Date(last).getTime() > every;
  };

  if (test) {
    if (test.source === 'refetch') results.refetch = await runRefetch(run, test.guid!);
    else {
      const s = await run.state(test.source === 'debates' ? 'speeches' : test.source);
      results[test.source] = test.source === 'questions'
        ? await runQuestions(run, s, test.date, test.date, true)
        : await runDays(run, s, test.date, test.date, true, test.only ?? undefined);
    }
  } else {
    const debates = await run.state('debates');   // read first: the baseline for its counters
    const speeches = await run.state('speeches');
    // 1. Speeches: the top up of the last 3 days every 6 hours (its backfill finished 30 Oct 2026).
    if (!speeches.finished_at) results.speeches = await runDays(run, speeches, START, today, false);
    else if (due(speeches, TOP_UP_EVERY_MS)) results.speeches = await run.phase(TOP_UP_PHASE_MS, () => runDays(run, speeches, addDays(today, -TOP_UP_DAYS), today, true));
    // 2. The daily re-fetch of debates under 14 days old.
    if (run.timeLeft() > RESERVE_MS * 2) results.refetch = await run.phase(REFETCH_PHASE_MS, () => runRefetch(run));
    // 3. The debates backfill; once it has finished, the daily check of our ids and the monthly check.
    const questions = await run.state('questions');
    if (!debates.finished_at) {
      if (run.timeLeft() > RESERVE_MS * 2) {
        const share = questions.finished_at ? Infinity : Math.floor((run.timeLeft() - RESERVE_MS) * 0.6);
        results.debates = await run.phase(share, () => runDays(run, debates, START, today, false));
      }
    } else {
      if (run.timeLeft() > RESERVE_MS * 2 && due(debates, OUR_IDS_EVERY_MS, debates.cursor?.our_ids_checked_at)) results.ourIds = await run.phase(OUR_IDS_PHASE_MS, () => runOurIds(run));
      const monthlyAt = (debates.cursor?.monthly as Row | undefined)?.at;
      if (run.timeLeft() > RESERVE_MS * 2 && due(debates, MONTHLY_EVERY_MS, monthlyAt ?? '1970-01-01')) results.monthly = await run.phase(MONTHLY_PHASE_MS, () => runMonthly(run));
    }
    // 4. Questions start once the speeches backfill has finished, and only while time is left in this run.
    const sp = await run.state('speeches');
    if (sp.finished_at && run.timeLeft() > RESERVE_MS * 2) {
      const q = await run.state('questions');
      const qTopUpDue = due(q, TOP_UP_EVERY_MS);
      if (!q.finished_at) results.questions = await runQuestions(run, q, START, today, false);
      else if (qTopUpDue) results.questions = await runQuestions(run, q, addDays(today, -TOP_UP_DAYS), today, true);
    }
    // The debates counters, text changes and checks, on the latest saved debates state.
    await run.saveState(await run.state('debates'), false);
  }

  const partial = Object.values(results).some((r) => r === 'partial' || r === 'refused');
  const body = {
    ok: true, rows_written: run.rows, requests: run.requests, results, partial, dupes_dropped: run.dupes,
    debates: { with_items: run.extra.with_items, parents_filled: run.extra.parents_filled, text_changes: run.extra.changes.length },
    elapsed_ms: Date.now() - run.started, syncedAt: new Date().toISOString(),
    ...(run.dry ? { captured: run.captured } : {}),
  };
  console.log(`[sync-parliament-archive] ${body.elapsed_ms} ms, ${run.requests} requests, ${run.rows} rows, ${JSON.stringify(results)}`);
  return NextResponse.json(body);
}

export const GET = withHeartbeat(ROUTE, GET_impl);
