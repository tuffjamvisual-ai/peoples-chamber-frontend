// MP Political career, Parliament part (owner, 7 Nov 2026, PC1). For each MP, Parliament's own records: elections and party
// from the Members API Biography (representations, partyAffiliations, and electionsContested for elections contested and lost,
// owner PCL2, 8 Nov 2026, skipping any that is already a win in representations), posts (governmentPosts, oppositionPosts, otherPosts),
// committees (committeeMemberships), and the bills they sponsored from the Bills API (/api/v1/Bills?MemberId=, paged), each
// bill's outcome taken only from isAct, isDefeated, billWithdrawn and currentStage. Session dates come from Parliament's
// What's On sessions list (the Bills API has none), fetched once a run.
//
// Writes only mp_biography.career_parliament and career_checked_at (never career_research, never the biography review
// flags, which the party, roster and member biography syncs raise), and its own row in sync_cursor. Every entry passes
// lib/career-timeline.ts validate() before anything is written; an entry that fails is left out on its own (never the
// MP's whole timeline), written with the MP's id, the raw API record and the reason to excluded-records-<date>.json
// (owner, PCL1, 8 Nov 2026), and counted. Once more than 10 entries in total are left out the run writes nothing more and
// stops with an error. One API request a second; a failed request is tried again after 2, 4 and 8 seconds.
//
// Checks for changes rather than fetching every MP (SY2, owner, 9 Nov 2026; scripts/career-sync-changes.ts):
//   1. A few dozen cheap lists: every government and opposition post with its current holders (department by department,
//      as the plain lists hold only the senior posts), the current Commons members with party and seat, and the bills
//      updated since the cursor (newest first, until one is older).
//   2. The full Members API biography (and the MP's bills) only for an MP whose post, party, seat or membership changed,
//      who is new, or whose last full fetch is over 30 days old (at most 25 a night, oldest first). A bill updated since
//      the cursor is rebuilt from its list record in each sponsoring MP's record (its sponsors come from the records that
//      already hold it, or one Bills API request for a bill no record holds yet).
//   3. Each changed MP is written as soon as it is done, so a stopped run keeps its work; career_checked_at is set for
//      every MP checked, changed or not. sync_cursor 'career-parliament-sync' keeps { since, baseline_started, full_at }:
//      since (the start of the last successful run) advances only when a run finishes everything; full_at (each MP's last
//      full fetch) is saved as the run goes.
//   With no "since" yet the run is a baseline: every MP in full, oldest career_checked_at first, as many as the time
//   budget allows (--budget-minutes, default 33), each run continuing where the last stopped, until every MP has been
//   checked since the baseline began; then "since" is set to that start.
//
//   npx tsx --tsconfig tsconfig.json scripts/sync-career-parliament.ts --dry-run --out <file.json> [--since <ISO>] [--members 4131,1447]
//   npx tsx --tsconfig tsconfig.json scripts/sync-career-parliament.ts [--members ...]       writes the database
// Without --members it takes every current MP from the mps table. --dry-run reads Parliament's cheap lists and the stored
// records, writes nothing to the database, and prints the requests made, the MPs needing a full refresh and why, the
// bills to rebuild and an estimate of the minutes the real run needs; --since <ISO> stands in for the stored cursor.
// --members fetches those MPs in full (a hand run). After writing (owner, 8 Nov 2026, PR1): the MPs whose
// career_parliament really changed (a stable hash of the stored value and of the new one differ) have /mps/<id> refreshed
// and sent to IndexNow (scripts/refresh-pages.ts), also when the run stops part way.
import fs from 'node:fs';
import { refreshPages, stableHash, reportToRun } from './refresh-pages';
import { excludedRecordsFile } from './career-sync-files';
import { createClient } from '@supabase/supabase-js';
import { type CareerEntry, type BillOutcome } from '../lib/career-timeline';
import { keepValid, contestEntries, MAX_EXCLUDED, type Built, type Excluded, type ContestRecord } from './career-sync-filter';
import { membersToRefresh, billsSince, billHolders, withBills, postKey, type LiveState, type PostKind } from './career-sync-changes';

process.loadEnvFile(`${__dirname}/../.env.local`);
const MEMBERS = 'https://members-api.parliament.uk/api';
const BILLS = 'https://bills-api.parliament.uk/api/v1';
const SESSIONS = 'https://whatson-api.parliament.uk/calendar/sessions/list.json';
const PAGE = 20;

const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const DRY = argv.includes('--dry-run');
const OUT = opt('--out');
if (DRY && !OUT) throw new Error('--dry-run needs --out <file.json>');
// Where the left out records go: the owner's Claude outputs folder when it exists (local runs), else the working
// directory (GitHub Actions, which keeps it as a run artifact).
const EXCLUDED_DIR = fs.existsSync('/Volumes/EDGE_SSD/opengovt-work/Claude outputs/career') ? '/Volumes/EDGE_SSD/opengovt-work/Claude outputs/career' : '.';
const SINCE = opt('--since');
const BUDGET_MS = Number(opt('--budget-minutes') ?? 33) * 60000;
const CURSOR_ROUTE = 'career-parliament-sync';
const ONLY = opt('--members')?.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

// One request a second across the whole run, with retries.
let last = 0, requests = 0, requestMs = 0;
class Stop extends Error {}
async function get<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const wait = 1000 - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    let status = 0;
    try {
      const t0 = Date.now();
      requests++;
      const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
      status = res.status;
      if (res.ok) { const body = (await res.json()) as T; requestMs += Date.now() - t0; return body; }
      if (status === 429 || status === 403) throw new Stop(`HTTP ${status} from ${url}: stopping the run`);
      if (status === 404) throw new Error(`HTTP 404 from ${url}`);
    } catch (e) {
      if (e instanceof Stop || (e instanceof Error && e.message.startsWith('HTTP 404'))) throw e;
    }
    if (attempt >= 3) throw new Error(`${status ? `HTTP ${status}` : 'no answer'} from ${url} after 4 tries`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

type Posting = { house: number; name: string; id: number; startDate: string | null; endDate: string | null; additionalInfo: string | null };
type Biography = { representations: Posting[]; electionsContested?: ContestRecord[]; partyAffiliations: Posting[]; governmentPosts: Posting[]; oppositionPosts: Posting[]; otherPosts: Posting[]; committeeMemberships: Posting[] };
type Bill = { billId: number; shortTitle: string; lastUpdate: string; billWithdrawn: string | null; isDefeated: boolean; isAct: boolean; includedSessionIds: number[]; introducedSessionId: number; currentStage: { description: string; sessionId: number } | null };
type Session = { SessionId: number; StartDate: string; EndDate: string | null; CommonsDescription: string };

const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : null);
const HOUSE = (h: number) => (h === 2 ? 'House of Lords' : 'House of Commons');

function fromBiography(id: number, b: Biography): Built[] {
  const src = { title: 'UK Parliament: Members API, career', url: `https://members.parliament.uk/member/${id}/career` };
  const out: Built[] = [];
  for (const r of b.representations ?? []) {
    out.push({ raw: r, entry: { group: 'elections', start: day(r.startDate), end: day(r.endDate) ?? 'present', title: r.house === 2 ? 'Member of the House of Lords' : `MP for ${r.name}`, organisation: r.house === 2 ? null : HOUSE(r.house), detail: r.additionalInfo?.trim() || null, source: src } });
  }
  out.push(...contestEntries(id, b.electionsContested, b.representations).built);
  for (const p of b.partyAffiliations ?? []) {
    out.push({ raw: p, entry: { group: 'elections', start: day(p.startDate), end: day(p.endDate) ?? 'present', title: `Party: ${p.name}`, organisation: HOUSE(p.house), detail: null, source: src } });
  }
  const posts: Array<[Posting[], string]> = [[b.governmentPosts, 'Government post'], [b.oppositionPosts, 'Opposition post'], [b.otherPosts, 'Other post']];
  for (const [list, kind] of posts) {
    for (const p of list ?? []) {
      out.push({ raw: p, entry: { group: 'posts', start: day(p.startDate), end: day(p.endDate) ?? 'present', title: p.name, organisation: p.additionalInfo?.trim() || null, detail: kind, source: src } });
    }
  }
  for (const c of b.committeeMemberships ?? []) {
    out.push({ raw: c, entry: { group: 'committees', start: day(c.startDate), end: day(c.endDate) ?? 'present', title: c.name, organisation: HOUSE(c.house), detail: c.additionalInfo?.trim() || null, source: src } });
  }
  return out;
}

// A bill's outcome from isAct, isDefeated, billWithdrawn and currentStage only. "no_further_stage" only when its last
// session has ended and it is not an Act, defeated or withdrawn.
function fromBill(bill: Bill, sessions: Map<number, Session>, today: string, notes: string[]): CareerEntry {
  const lastSessionId = Math.max(...(bill.includedSessionIds?.length ? bill.includedSessionIds : [bill.introducedSessionId]));
  const s = sessions.get(lastSessionId);
  const stage = bill.currentStage?.description ?? null;
  const ended = !!s?.EndDate && s.EndDate.slice(0, 10) < today;
  if (bill.isAct && (bill.isDefeated || bill.billWithdrawn)) notes.push(`bill ${bill.billId}: the Bills API marks it an Act and also ${bill.isDefeated ? 'defeated' : 'withdrawn'}`);
  if (bill.isDefeated && bill.billWithdrawn) notes.push(`bill ${bill.billId}: the Bills API marks it both defeated and withdrawn`);
  if (!s) notes.push(`bill ${bill.billId}: session ${lastSessionId} is not in Parliament's sessions list`);
  const outcome: BillOutcome = bill.isAct ? 'became_law'
    : bill.isDefeated ? 'defeated'
    : bill.billWithdrawn ? 'withdrawn'
    : ended ? 'no_further_stage'
    : 'in_progress';
  const end = outcome === 'withdrawn' ? day(bill.billWithdrawn) : day(bill.lastUpdate);
  return {
    group: 'bills', start: null, end, title: bill.shortTitle, organisation: null, detail: 'Sponsor',
    outcome, stage, session: s?.CommonsDescription ?? `session ${lastSessionId}`,
    source: { title: `UK Parliament Bills: ${bill.shortTitle}`, url: `https://bills.parliament.uk/bills/${bill.billId}` },
  };
}

async function members(): Promise<Array<{ id: number; name: string; constituency: string | null; party: string | null }>> {
  let q = db.from('mps').select('member_id, name, constituency, party').order('member_id');
  q = ONLY?.length ? q.in('member_id', ONLY) : q.eq('current_member', true);
  const { data, error } = await q;
  if (error) throw new Error(`mps: ${error.message}`);
  return (data ?? []).map((m) => ({ id: m.member_id as number, name: m.name as string, constituency: (m.constituency as string | null) ?? null, party: (m.party as string | null) ?? null }));
}

type Mp = { id: number; name: string; constituency: string | null; party: string | null };
type Cursor = { since: string | null; baseline_started: string | null; full_at: Record<string, string> };
type Stored = { entries: CareerEntry[] | null; checkedAt: string | null };

async function readCursor(): Promise<Cursor> {
  const { data, error } = await db.from('sync_cursor').select('cursor').eq('route', CURSOR_ROUTE).maybeSingle();
  if (error) throw new Error(`sync_cursor read: ${error.message}`);
  const c = (data?.cursor ?? {}) as Partial<Cursor>;
  return { since: c.since ?? null, baseline_started: c.baseline_started ?? null, full_at: c.full_at ?? {} };
}
async function saveCursor(c: Cursor): Promise<void> {
  if (DRY) return;
  const { error } = await db.from('sync_cursor').upsert({ route: CURSOR_ROUTE, cursor: c, updated_at: new Date().toISOString() }, { onConflict: 'route' });
  if (error) throw new Error(`sync_cursor write: ${error.message}`);
}

async function loadStored(ids: number[]): Promise<Map<number, Stored>> {
  const out = new Map<number, Stored>();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data, error } = await db.from('mp_biography').select('member_id, career_parliament, career_checked_at').in('member_id', batch);
    if (error) throw new Error(`mp_biography (stored values): ${error.message}`);
    for (const r of data ?? []) out.set(r.member_id as number, { entries: (r.career_parliament as CareerEntry[] | null) ?? null, checkedAt: (r.career_checked_at as string | null) ?? null });
  }
  return out;
}

// The cheap lists: every government and opposition post with its holders, department by department (the plain lists
// hold only the senior posts), and the current Commons members with their party and seat.
type PostList = Array<{ value: { name: string; postHolders: Array<{ member: { value: { id: number } }; endDate: string | null }> } }>;
type Searched = { items: Array<{ value: { id: number; latestParty: { id: number; name: string } | null; latestHouseMembership: { membershipFrom: string | null; house: number; membershipEndDate: string | null } | null } }>; totalResults: number };
async function liveState(): Promise<LiveState> {
  const posts = new Map<number, Set<string>>();
  const lists: Array<[PostKind, string, number]> = [['Government post', 'GovernmentPosts', 0], ['Opposition post', 'OppositionPosts', 1]];
  for (const [kind, path, type] of lists) {
    const depts = await get<Array<{ id: number }>>(`${MEMBERS}/Posts/Departments/${type}`);
    for (const url of [`${MEMBERS}/Posts/${path}`, ...depts.map((d) => `${MEMBERS}/Posts/${path}?departmentId=${d.id}`)]) {
      for (const p of await get<PostList>(url)) for (const h of p.value.postHolders ?? []) {
        if (h.endDate) continue;
        const id = h.member.value.id;
        posts.set(id, (posts.get(id) ?? new Set<string>()).add(postKey(kind, p.value.name)));
      }
    }
  }
  const members = new Map<number, { party: string | null; seat: string | null }>();
  const parties = new Set<number>();
  for (let skip = 0; ; skip += 20) {
    const page = await get<Searched>(`${MEMBERS}/Members/Search?House=1&IsCurrentMember=true&skip=${skip}&take=20`);
    for (const { value: v } of page.items) {
      const hm = v.latestHouseMembership;
      members.set(v.id, { party: v.latestParty?.name ?? null, seat: hm && hm.house === 1 && !hm.membershipEndDate ? hm.membershipFrom : null });
      if (v.latestParty) parties.add(v.latestParty.id);
    }
    if (page.items.length < 20 || skip + 20 >= page.totalResults) break;
  }
  // The other parties' spokespeople (Liberal Democrat, SNP and the rest): the biography lists them as opposition posts,
  // but the opposition lists above hold only the Official Opposition. One request for each party with Commons members.
  for (const partyId of parties) {
    for (const p of await get<PostList>(`${MEMBERS}/Posts/Spokespersons?partyId=${partyId}`)) for (const h of p.value.postHolders ?? []) {
      if (h.endDate) continue;
      const id = h.member.value.id;
      posts.set(id, (posts.get(id) ?? new Set<string>()).add(postKey('Opposition post', p.value.name)));
    }
  }
  return { members, posts };
}

// One MP from the full Members API biography and their bills: the record as every run has built it (PC1, PCL1 to PCL3).
async function buildFull(m: Mp, sessions: Map<number, Session>, today: string): Promise<{ built: Built[] | null; notes: string[] }> {
  const notes: string[] = [];
  try {
    const bio = (await get<{ value: Biography }>(`${MEMBERS}/Members/${m.id}/Biography`)).value;
    const built = fromBiography(m.id, bio);
    const dupContests = (bio.electionsContested ?? []).length - built.filter((b) => b.entry.group === 'elections' && b.entry.title.startsWith('Contested ')).length;
    if (dupContests > 0) notes.push(`contest already a win: ${dupContests} electionsContested record(s) left out as the same seat and day as a representation`);
    // Our MP record against the Members API: the current seat and party.
    const seat = (bio.representations ?? []).find((r) => r.house === 1 && !r.endDate);
    const party = (bio.partyAffiliations ?? []).find((p) => !p.endDate);
    if (m.constituency && seat && seat.name !== m.constituency) notes.push(`constituency: our record "${m.constituency}", Members API "${seat.name}"`);
    if (m.party && party && party.name !== m.party && !(m.party.startsWith(party.name) || party.name.startsWith(m.party))) notes.push(`party: our record "${m.party}", Members API "${party.name}"`);
    let total = 0; const bills: Bill[] = [];
    for (let skip = 0; ; skip += PAGE) {
      const page = await get<{ items: Bill[]; totalResults: number }>(`${BILLS}/Bills?MemberId=${m.id}&Take=${PAGE}&Skip=${skip}`);
      total = page.totalResults; bills.push(...page.items);
      if (page.items.length < PAGE || bills.length >= total) break;
    }
    if (bills.length !== total) notes.push(`bills: the Bills API reported ${total} but returned ${bills.length}`);
    built.push(...bills.map((b) => ({ raw: b, entry: fromBill(b, sessions, today, notes) })));
    return { built, notes };
  } catch (e) {
    if (e instanceof Stop) throw e;
    notes.push(`error: ${e instanceof Error ? e.message : String(e)}`);
    return { built: null, notes };
  }
}

async function main() {
  const started = new Date();
  const startedIso = started.toISOString();
  const today = startedIso.slice(0, 10);
  const elapsed = () => Date.now() - started.getTime();
  const cursor = await readCursor();
  const list = await members();
  if (ONLY?.length) for (const id of ONLY) if (!list.some((m) => m.id === id)) console.warn(`member ${id} is not in the mps table: left out`);
  const byId = new Map(list.map((m) => [m.id, m]));
  const stored = await loadStored(list.map((m) => m.id));
  const storedEntries = new Map(list.map((m) => [m.id, stored.get(m.id)?.entries ?? null]));
  const since = SINCE ?? cursor.since;
  const mode = ONLY?.length ? 'members' : since ? 'changes' : 'baseline';

  const excluded: Excluded[] = [];
  const refreshIds: number[] = [];
  const result: Record<string, { name: string; reasons: string[]; career_parliament: CareerEntry[] | null; notes: string[] }> = {};
  let written = 0, failed = 0, unfinished = 0;
  let sessions: Map<number, Session> | null = null;
  const getSessions = async () => (sessions ??= new Map((await get<Session[]>(SESSIONS)).map((s) => [s.SessionId, s])));
  const excludedFile = excludedRecordsFile(EXCLUDED_DIR, today, DRY);
  const saveExcluded = () => fs.writeFileSync(excludedFile, JSON.stringify({ generated: new Date().toISOString(), dry_run: DRY, count: excluded.length, records: excluded }, null, 1));

  // Validates, writes at once (so a stopped run keeps its work) and notes a changed record for the page refresh.
  async function save(m: Mp, built: Built[], reasons: string[], notes: string[], full: boolean): Promise<void> {
    const v = keepValid(m.id, m.name, built);
    for (const x of v.excluded) notes.push(`left out: ${x.entry.group} "${x.entry.title}": ${x.reason}`);
    excluded.push(...v.excluded);
    if (excluded.length > MAX_EXCLUDED) {
      saveExcluded();
      throw new Stop(`${excluded.length} entries left out, more than ${MAX_EXCLUDED}: stopping before writing any more; see ${excludedFile}`);
    }
    result[String(m.id)] = { name: m.name, reasons, career_parliament: v.kept, notes };
    const changed = stableHash(storedEntries.get(m.id) ?? null) !== stableHash(v.kept);
    if (DRY) { if (changed) refreshIds.push(m.id); return; }
    const { error } = await db.from('mp_biography').update({ career_parliament: v.kept, career_checked_at: new Date().toISOString() }).eq('member_id', m.id);
    if (error) { notes.push(`write failed: ${error.message}`); console.error(`${m.id} ${m.name}: write failed: ${error.message}`); failed++; return; }
    written++;
    if (changed) refreshIds.push(m.id);
    if (full) { cursor.full_at[String(m.id)] = new Date().toISOString(); await saveCursor(cursor); }
  }
  async function refreshInFull(m: Mp, reasons: string[]): Promise<void> {
    const { built, notes } = await buildFull(m, await getSessions(), today);
    if (!built) { failed++; result[String(m.id)] = { name: m.name, reasons, career_parliament: null, notes }; console.log(`${m.id} ${m.name}: ${notes.join('; ')}`); return; }
    await save(m, built, reasons, notes, true);
    console.log(`${m.id} ${m.name}: ${result[String(m.id)].career_parliament?.length ?? 0} entries (${reasons.join('; ')})${notes.length ? `; ${notes.length} note(s)` : ''}`);
  }

  const plan: { mode: string; since: string | null; refresh: Array<{ id: number; name: string; reasons: string[] }>; bills: Array<{ billId: number; title: string; lastUpdate: string; mps: number[] }> } = { mode, since, refresh: [], bills: [] };
  try {
    if (mode !== 'changes') {
      // A hand run (--members) or the baseline: every MP in full, oldest career_checked_at first. The baseline goes on
      // over as many runs as it needs: an MP checked since it began is done.
      if (mode === 'baseline' && !cursor.baseline_started) { cursor.baseline_started = startedIso; await saveCursor(cursor); }
      const begun = cursor.baseline_started ?? startedIso;
      const todo = list
        .filter((m) => mode === 'members' || !(stored.get(m.id)?.checkedAt && stored.get(m.id)!.checkedAt! >= begun))
        .sort((a, b) => (stored.get(a.id)?.checkedAt ?? '').localeCompare(stored.get(b.id)?.checkedAt ?? '') || a.id - b.id);
      plan.refresh = todo.map((m) => ({ id: m.id, name: m.name, reasons: [mode === 'members' ? 'asked for by hand' : 'baseline: no cursor yet'] }));
      // A dry run builds the records for --members (written to the --out file, never the database); a baseline dry run only plans.
      if (!DRY || mode === 'members') {
        for (const m of todo) {
          if (elapsed() > BUDGET_MS) { unfinished = todo.length - Object.keys(result).length; console.log(`time budget reached: ${unfinished} MP(s) left for the next run`); break; }
          await refreshInFull(m, plan.refresh.find((r) => r.id === m.id)!.reasons);
        }
        if (!DRY && mode === 'baseline' && !unfinished && !failed) { cursor.since = cursor.baseline_started; cursor.baseline_started = null; await saveCursor(cursor); console.log(`baseline complete: cursor set to ${cursor.since}`); }
      }
    } else {
      // 1. The cheap lists, and the MPs who need the full biography.
      const live = await liveState();
      const notCurrent = [...live.members.keys()].filter((id) => !byId.has(id));
      if (notCurrent.length) console.log(`${notCurrent.length} current Commons member(s) not in our mps table: ${notCurrent.join(', ')}`);
      const reasons = membersToRefresh(list.map((m) => m.id), storedEntries, live, cursor.full_at, started);
      // Changes first, then the safety net (its reasons start "safety net").
      const order = [...reasons.entries()].sort(([, a], [, b]) => Number(a[0].startsWith('safety')) - Number(b[0].startsWith('safety')));
      plan.refresh = order.map(([id, r]) => ({ id, name: byId.get(id)!.name, reasons: r }));
      // 2. Bills updated since the cursor, newest first, until one is older; and who sponsors each.
      const holders = billHolders(storedEntries);
      const billUpdates = new Map<number, Map<number, CareerEntry>>();
      const billNotes: string[] = [];
      for (let skip = 0, pages = 0; ; skip += 50, pages++) {
        if (pages >= 60) { unfinished++; billNotes.push('bills: stopped after 60 pages (3,000 bills); the rest are left for the next run'); break; }
        const page = await get<{ items: Bill[] }>(`${BILLS}/Bills?SortOrder=DateUpdatedDescending&Take=50&Skip=${skip}`);
        const { changed, done } = billsSince(page.items, since!);
        for (const b of changed) {
          let mps = (holders.get(b.billId) ?? []).filter((id) => byId.has(id));
          if (!holders.has(b.billId)) {
            const detail = await get<{ sponsors: Array<{ member: { memberId: number } | null }> }>(`${BILLS}/Bills/${b.billId}`);
            mps = (detail.sponsors ?? []).map((s) => s.member?.memberId).filter((id): id is number => !!id && byId.has(id));
          }
          plan.bills.push({ billId: b.billId, title: b.shortTitle, lastUpdate: b.lastUpdate, mps });
          if (!mps.length) continue;
          const entry = fromBill(b, await getSessions(), today, billNotes);
          for (const id of mps) billUpdates.set(id, (billUpdates.get(id) ?? new Map<number, CareerEntry>()).set(b.billId, entry));
        }
        if (done) break;
      }
      for (const n of billNotes) console.log(n);
      if (!DRY) {
        // 3. The full refreshes, then the bill updates for MPs not refreshed in full, each written as it is done.
        for (const [id, why] of order) {
          if (elapsed() > BUDGET_MS) { unfinished++; continue; }
          await refreshInFull(byId.get(id)!, why);
        }
        for (const [id, bills] of billUpdates) {
          if (reasons.has(id) && result[String(id)]) continue; // rebuilt in full above, bills included
          const m = byId.get(id)!;
          const entries = storedEntries.get(id);
          if (!entries) continue; // no stored record: picked up as new and refreshed in full
          // The stored record with these bills rebuilt from their list records; every other entry as stored.
          await save(m, withBills(entries, bills).map((e) => ({ raw: e, entry: e })), [`bills updated: ${[...bills.keys()].join(', ')}`], [], false);
          console.log(`${id} ${m.name}: ${bills.size} bill(s) updated`);
        }
        // 4. career_checked_at for every MP checked and not written above, 100 at a time.
        const rest = list.map((m) => m.id).filter((id) => !result[String(id)]);
        for (let i = 0; i < rest.length; i += 100) {
          const { error } = await db.from('mp_biography').update({ career_checked_at: new Date().toISOString() }).in('member_id', rest.slice(i, i + 100));
          if (error) { failed++; console.error(`career_checked_at: ${error.message}`); }
        }
        if (!unfinished && !failed) { cursor.since = startedIso; await saveCursor(cursor); console.log(`cursor advanced to ${startedIso}`); }
        else console.log(`cursor left at ${cursor.since}: ${unfinished} unfinished, ${failed} failed`);
      }
    }
  } finally {
    if (!DRY || Object.keys(result).length) saveExcluded();
    // Only the MPs whose career changed and was written, also when the run stopped part way (PR1).
    if (!DRY) {
      console.log(`${list.length} MPs (${mode}); ${written} written; ${failed} failed; ${excluded.length} entries left out; ${requests} requests in ${Math.round(elapsed() / 60000)} min`);
      console.log(`${refreshIds.length} MP(s) with a changed career_parliament`);
      const refreshed = await refreshPages(refreshIds.map((id) => `/mps/${id}`), { dryRun: false, reason: 'career-parliament-sync' });
      reportToRun('Political career sync', refreshed);
    }
  }
  if (DRY) {
    // The plan, and how long the real run would take: the requests made here plus, for each full refresh, the biography
    // and the MP's bill pages (from the stored record), at the pace measured here (at least a second a request).
    // Biographies answer far more slowly than the lists (about 4 seconds against a quarter of a second, 9 Nov 2026), so two
    // of the planned ones are timed here (read only) and that pace is used for every biography.
    const billPages = (id: number) => Math.max(1, Math.ceil((storedEntries.get(id) ?? []).filter((e) => e.group === 'bills').length / PAGE));
    const listPace = Math.max(1000, requests ? requestMs / requests : 1000);
    let bioPace = listPace;
    if (mode !== 'members' && plan.refresh.length) {
      const sample = plan.refresh.slice(0, 2);
      const t0 = Date.now();
      for (const r of sample) await get(`${MEMBERS}/Members/${r.id}/Biography`);
      bioPace = Math.max(1000, (Date.now() - t0) / sample.length);
    }
    const planned = mode === 'members' ? 0 : plan.refresh.reduce((n, r) => n + 1 + billPages(r.id), 0);
    const plannedMs = mode === 'members' ? 0 : plan.refresh.reduce((n, r) => n + bioPace + billPages(r.id) * listPace, 0);
    const minutes = (requests * listPace + plannedMs) / 60000;
    const why: Record<string, number> = {};
    for (const r of plan.refresh) for (const w of r.reasons) { const k = w.split(':')[0]; why[k] = (why[k] ?? 0) + 1; }
    console.log(`mode: ${mode}${since ? `, since ${since}` : ''}`);
    console.log(`requests made: ${requests} (average answer ${Math.round(requests ? requestMs / requests : 0)} ms)`);
    console.log(`MPs needing a full refresh: ${plan.refresh.length} ${JSON.stringify(why)}`);
    for (const r of plan.refresh.slice(0, 40)) console.log(`  ${r.id} ${r.name}: ${r.reasons.join('; ')}`);
    if (plan.refresh.length > 40) console.log(`  ... and ${plan.refresh.length - 40} more`);
    console.log(`bills needing stages: ${plan.bills.length}, in ${new Set(plan.bills.flatMap((b) => b.mps)).size} MP record(s)`);
    for (const b of plan.bills.slice(0, 40)) console.log(`  ${b.billId} ${b.title} (updated ${b.lastUpdate.slice(0, 16)}): ${b.mps.length ? `MPs ${b.mps.join(', ')}` : 'no current MP sponsor'}`);
    console.log(`full refresh requests still to make: about ${planned} (biographies timed at ${(bioPace / 1000).toFixed(1)} s each, other requests ${(listPace / 1000).toFixed(1)} s); estimated run: about ${minutes.toFixed(1)} minutes${mode === 'baseline' ? `, about ${Math.ceil(minutes / (BUDGET_MS / 60000))} night(s) at ${BUDGET_MS / 60000} minutes a night` : ''}`);
    if (refreshIds.length) console.log(`pages that would be refreshed: ${refreshIds.map((id) => `/mps/${id}`).join(', ')}`);
    const counts: Record<string, number> = {};
    for (const r of Object.values(result)) for (const e of r.career_parliament ?? []) counts[e.group] = (counts[e.group] ?? 0) + 1;
    fs.writeFileSync(OUT!, JSON.stringify({ generated: new Date().toISOString(), requests, average_ms: Math.round(requests ? requestMs / requests : 0), estimated_minutes: Number(minutes.toFixed(1)), ...plan, members: result, counts }, null, 1));
  }
  if (excluded.length > MAX_EXCLUDED) throw new Error(`${excluded.length} entries left out, more than ${MAX_EXCLUDED}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
