// MP Political career, Parliament part (owner, 7 Nov 2026, PC1). For each MP, Parliament's own records: elections and party
// from the Members API Biography (representations, partyAffiliations, and electionsContested for elections contested and lost,
// owner PCL2, 8 Nov 2026, skipping any that is already a win in representations), posts (governmentPosts, oppositionPosts, otherPosts),
// committees (committeeMemberships), and the bills they sponsored from the Bills API (/api/v1/Bills?MemberId=, paged), each
// bill's outcome taken only from isAct, isDefeated, billWithdrawn and currentStage. Session dates come from Parliament's
// What's On sessions list (the Bills API has none), fetched once a run.
//
// Writes only mp_biography.career_parliament and career_checked_at (never career_research). Every entry passes
// lib/career-timeline.ts validate() before anything is written; an entry that fails is left out on its own (never the
// MP's whole timeline), written with the MP's id, the raw API record and the reason to excluded-records-<date>.json
// (owner, PCL1, 8 Nov 2026), and counted at the end. A run leaving out more than 10 entries in total writes nothing and
// stops with an error. All MPs are fetched before anything is written, so a run that stops (HTTP 429 or 403, or too many
// left out) writes nothing. One API request a second; a failed request is tried again after 2, 4 and 8 seconds.
//
//   npx tsx --tsconfig tsconfig.json scripts/sync-career-parliament.ts --dry-run --out <file.json> [--members 4131,1447]
//   npx tsx --tsconfig tsconfig.json scripts/sync-career-parliament.ts [--members ...]       writes the database
// Without --members it takes every current MP from the mps table. --dry-run writes the JSON file and never the database:
// { generated, members: { "<id>": { name, career_parliament, notes } }, counts }. "notes" lists where Parliament's APIs
// disagreed with each other or with our MP record, and any request that failed.
// After writing (owner, 8 Nov 2026, PR1): the MPs whose career_parliament really changed (a stable hash of the stored value
// before and of the new one differ) have /mps/<id> refreshed and sent to IndexNow (scripts/refresh-pages.ts); an unchanged
// MP is not refreshed, and a run that stops before writing refreshes nothing. --dry-run lists the pages it would refresh.
import fs from 'node:fs';
import path from 'node:path';
import { refreshPages, stableHash, reportToRun } from './refresh-pages';
import { createClient } from '@supabase/supabase-js';
import { type CareerEntry, type BillOutcome } from '../lib/career-timeline';
import { keepValid, contestEntries, MAX_EXCLUDED, type Built, type Excluded, type ContestRecord } from './career-sync-filter';

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
const EXCLUDED_DIR = fs.existsSync('/Volumes/GoliathSSD/opengovt-work/Claude outputs/career') ? '/Volumes/GoliathSSD/opengovt-work/Claude outputs/career' : '.';
const ONLY = opt('--members')?.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

// One request a second across the whole run, with retries.
let last = 0;
class Stop extends Error {}
async function get<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const wait = 1000 - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    let status = 0;
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
      status = res.status;
      if (res.ok) return (await res.json()) as T;
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

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = new Map((await get<Session[]>(SESSIONS)).map((s) => [s.SessionId, s]));
  const list = await members();
  if (ONLY?.length) for (const id of ONLY) if (!list.some((m) => m.id === id)) console.warn(`member ${id} is not in the mps table: left out`);
  const result: Record<string, { name: string; career_parliament: CareerEntry[] | null; notes: string[] }> = {};
  let written = 0, failed = 0;
  const excluded: Excluded[] = [];
  for (const m of list) {
    const notes: string[] = [];
    let entries: CareerEntry[] | null = null;
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
      // Bills, paged.
      let total = 0; const bills: Bill[] = [];
      for (let skip = 0; ; skip += PAGE) {
        const page = await get<{ items: Bill[]; totalResults: number }>(`${BILLS}/Bills?MemberId=${m.id}&Take=${PAGE}&Skip=${skip}`);
        total = page.totalResults; bills.push(...page.items);
        if (page.items.length < PAGE || bills.length >= total) break;
      }
      if (bills.length !== total) notes.push(`bills: the Bills API reported ${total} but returned ${bills.length}`);
      built.push(...bills.map((b) => ({ raw: b, entry: fromBill(b, sessions, today, notes) })));
      const v = keepValid(m.id, m.name, built);
      entries = v.kept;
      for (const x of v.excluded) notes.push(`left out: ${x.entry.group} "${x.entry.title}": ${x.reason}`);
      excluded.push(...v.excluded);
    } catch (e) {
      if (e instanceof Stop) throw e;
      notes.push(`error: ${e instanceof Error ? e.message : String(e)}`);
      entries = null; failed++;
    }
    result[String(m.id)] = { name: m.name, career_parliament: entries, notes };
    console.log(`${m.id} ${m.name}: ${entries ? entries.length : 'no'} entries${notes.length ? `; ${notes.length} note(s)` : ''}`);
  }
  const excludedFile = path.join(EXCLUDED_DIR, `excluded-records-${today}.json`);
  fs.writeFileSync(excludedFile, JSON.stringify({ generated: new Date().toISOString(), dry_run: DRY, count: excluded.length, records: excluded }, null, 1));
  console.log(`${excluded.length} entr${excluded.length === 1 ? 'y' : 'ies'} left out (failed validate()), listed in ${excludedFile}`);
  for (const x of excluded) console.log(`  left out: ${x.member_id} ${x.name}: ${x.entry.group} "${x.entry.title}": ${x.reason}`);
  if (excluded.length > MAX_EXCLUDED) {
    throw new Error(`${excluded.length} entries left out, more than ${MAX_EXCLUDED}: stopping before writing anything; see ${excludedFile}`);
  }
  // The MPs whose stored career_parliament this run changes (PR1): the stored value read now, hashed without regard to key
  // order, against the new one. Read 100 MPs at a time; an MP with no row or no stored value counts as changed.
  const changing = new Set<number>();
  const fresh = list.filter((m) => result[String(m.id)].career_parliament);
  for (let i = 0; i < fresh.length; i += 100) {
    const ids = fresh.slice(i, i + 100).map((m) => m.id);
    const { data, error } = await db.from('mp_biography').select('member_id, career_parliament').in('member_id', ids);
    if (error) throw new Error(`mp_biography (stored values): ${error.message}`);
    const stored = new Map((data ?? []).map((r) => [r.member_id as number, r.career_parliament as unknown]));
    for (const id of ids) if (stableHash(stored.get(id) ?? null) !== stableHash(result[String(id)].career_parliament)) changing.add(id);
  }
  const refreshIds: number[] = [];
  if (!DRY) {
    for (const m of list) {
      const r = result[String(m.id)];
      if (!r.career_parliament) continue;
      const { error } = await db.from('mp_biography').update({ career_parliament: r.career_parliament, career_checked_at: new Date().toISOString() }).eq('member_id', m.id);
      if (error) { r.notes.push(`write failed: ${error.message}`); console.error(`${m.id} ${m.name}: write failed: ${error.message}`); failed++; } else {
        written++;
        if (changing.has(m.id)) refreshIds.push(m.id);
      }
    }
  } else refreshIds.push(...[...changing]);
  const counts: Record<string, number> = {};
  for (const r of Object.values(result)) for (const e of r.career_parliament ?? []) counts[e.group] = (counts[e.group] ?? 0) + 1;
  if (DRY) fs.writeFileSync(OUT!, JSON.stringify({ generated: new Date().toISOString(), members: result, counts }, null, 1));
  console.log(`${list.length} MPs; ${DRY ? 'dry run, nothing written' : `${written} written`}; ${failed} failed; ${excluded.length} entries left out; entries by group ${JSON.stringify(counts)}`);
  // Only the MPs whose career changed and was written; a refresh problem is reported but never undoes the write (PR1).
  console.log(`${changing.size} MP(s) with a changed career_parliament${DRY ? '' : `, ${refreshIds.length} written`}`);
  const refreshed = await refreshPages(refreshIds.map((id) => `/mps/${id}`), { dryRun: DRY, reason: 'career-parliament-sync' });
  reportToRun('Political career sync', refreshed);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
