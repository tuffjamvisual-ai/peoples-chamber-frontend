// The PMQs archive, 24 October 1961 to 22 May 2024 (owner, 5 Nov 2026), read from the pmqs_archive_* tables and shown as
// stored (lib/no-em-dash.ts EXACT_COLUMNS). Every read is kept for 30 days under PMQS_TAG, so a refresh of that tag
// reaches /pmqs, the archive session pages and /mps/<id>/pmqs. The archive is complete and nothing writes to it.
import 'server-only';
import { cache } from 'react';
import { timedClient } from '@/lib/page-reads';
import { readAll } from '@/lib/read-all';
import attendance from '@/lib/data/pmqs-attendance-2026-11-04.json';
import answerers from '@/lib/data/pmqs-archive-answerers.json';

// Same value as PMQS_TAG in lib/pmqs.ts, which is not imported here so that this file stays free of its reads.
const db = () => timedClient(30 * 86400, ['pmqs']);

export type ArchiveSession = { date: string; prime_minister_as_named: string | null; exchanges: number; source: string; note: string | null };
export type LibraryTotal = { prime_minister: string; in_office_from: string | null; in_office_to: string | null; library_total: number | null; library_attended: number | null; library_missed: number | null; our_sessions: number | null; difference: number | null; note: string | null };
type Row = { date: string; item_order: number; attributed_to: string | null; parlparse_speaker_id: string | null; member_id: number | null; contribution_text: string };
// site: where the name links, so the page can say when it leaves opengovt.
export type ArchiveContribution = { order: number; name: string | null; href: string | null; site: 'opengovt' | 'parliament' | 'historic' | null; text: string };
export type ArchiveExchange = { lead: ArchiveContribution; answers: ArchiveContribution[] };
export type MemberContribution = { date: string; order: number; text: string };

export const archiveSessions = cache(async (): Promise<ArchiveSession[]> =>
  readAll<ArchiveSession>(() => db().from('pmqs_archive_sessions'), {
    columns: 'date, prime_minister_as_named, exchanges, source, note',
    orderBy: { column: 'date', ascending: false },
    label: 'pmqs_archive_sessions',
  }));

export const archiveSessionOn = cache(async (date: string): Promise<ArchiveSession | null> => {
  const { data, error } = await db().from('pmqs_archive_sessions').select('date, prime_minister_as_named, exchanges, source, note').eq('date', date).maybeSingle();
  if (error) throw new Error(`pmqs archive session ${date}: ${error.message}`);
  return (data as ArchiveSession | null) ?? null;
});

export const libraryTotals = cache(async (): Promise<LibraryTotal[]> => {
  const { data, error } = await db().from('pmqs_library_totals').select('*').order('in_office_from', { ascending: false });
  if (error) throw new Error(`pmqs_library_totals: ${error.message}`);
  return (data ?? []) as LibraryTotal[];
});

// Who was in office before the Commons Library's table starts in May 1979. Wilson's two terms are told apart.
const BEFORE_1979 = [
  { prime_minister: 'James Callaghan', in_office_from: '1976-04-05', in_office_to: '1979-05-04' },
  { prime_minister: 'Harold Wilson (1974 to 1976)', in_office_from: '1974-03-04', in_office_to: '1976-04-05' },
  { prime_minister: 'Edward Heath', in_office_from: '1970-06-19', in_office_to: '1974-03-04' },
  { prime_minister: 'Harold Wilson (1964 to 1970)', in_office_from: '1964-10-16', in_office_to: '1970-06-19' },
  { prime_minister: 'Alec Douglas-Home', in_office_from: '1963-10-19', in_office_to: '1964-10-16' },
  { prime_minister: 'Harold Macmillan', in_office_from: '1957-01-10', in_office_to: '1963-10-19' },
];

// A session on a handover day counts for the outgoing Prime Minister, as in the archive's reconciliation.
const OFFICE = [...attendance.attendance.map((a) => ({ prime_minister: a.prime_minister, in_office_from: a.in_office_from, in_office_to: a.in_office_to as string | null })), ...BEFORE_1979]
  .sort((a, b) => a.in_office_from.localeCompare(b.in_office_from));
export function archivePrimeMinisterOn(date: string): string {
  return OFFICE.find((o) => o.in_office_from <= date && (!o.in_office_to || date <= o.in_office_to))?.prime_minister ?? 'Prime Minister';
}

// Who answered a session: by member id, never the printed name, which can carry OCR slips (scripts/build-pmqs-answerers.py).
const ANSWERER_NAMES: Record<string, string> = answerers.names;
const ANSWERER_ON: Record<string, string> = answerers.sessions;
export const answeredBy = (date: string): string | null => ANSWERER_NAMES[ANSWERER_ON[date]] ?? null;

// A Prime Minister's name in the group labels, from their member id. The key is the office table's name.
const PM_MEMBER: Record<string, number> = {
  'Rishi Sunak': 4483, 'Liz Truss': 4097, 'Boris Johnson': 1423, 'Theresa May': 8, 'David Cameron': 1467, 'Gordon Brown': 591, 'Tony Blair': 512,
  'John Major': 119, 'Margaret Thatcher': 953, 'James Callaghan': 769, 'Harold Wilson (1974 to 1976)': 1016, 'Edward Heath': 195,
  'Harold Wilson (1964 to 1970)': 1016, 'Alec Douglas-Home': 2938, 'Harold Macmillan': 2565,
};
export function primeMinisterLabel(pm: string): string {
  const name = ANSWERER_NAMES[String(PM_MEMBER[pm])];
  if (!name) return pm;
  return pm.includes('(') ? `${name} ${pm.slice(pm.indexOf('('))}` : name;
}

export type ArchiveYear = { year: string; sessions: ArchiveSession[] };
export type ArchiveGroup = { pm: string; count: number; years: ArchiveYear[] };

// Newest Prime Minister first; each one's sessions by year, newest first.
export function groupByPrimeMinister(sessions: ArchiveSession[]): ArchiveGroup[] {
  const groups: ArchiveGroup[] = [];
  for (const s of sessions) {
    const pm = archivePrimeMinisterOn(s.date);
    let g = groups[groups.length - 1];
    if (g?.pm !== pm) { g = { pm, count: 0, years: [] }; groups.push(g); }
    g.count++;
    const year = s.date.slice(0, 4);
    let y = g.years[g.years.length - 1];
    if (y?.year !== year) { y = { year, sessions: [] }; g.years.push(y); }
    y.sessions.push(s);
  }
  return groups;
}

// The official record of a day: Hansard from 2004, Historic Hansard before.
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function officialRecord(date: string): { href: string; label: string } {
  const [y, m, d] = date.split('-').map(Number);
  if (y >= 2004) return { href: `https://hansard.parliament.uk/Commons/${date}`, label: 'Read the official record in Hansard' };
  return { href: `https://api.parliament.uk/historic-hansard/sittings/${y}/${MON[m - 1]}/${String(d).padStart(2, '0')}`, label: 'Read the official record in Historic Hansard' };
}

async function membersKnown(ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set();
  const { data, error } = await db().from('mps').select('member_id').in('member_id', ids);
  if (error) throw new Error(`pmqs archive mps: ${error.message}`);
  return new Set(((data ?? []) as { member_id: number }[]).map((m) => m.member_id));
}

async function historicLinks(speakerIds: string[]): Promise<Map<string, string>> {
  if (!speakerIds.length) return new Map();
  const { data, error } = await db().from('pmqs_archive_people').select('parlparse_speaker_id, historic_hansard_url').in('parlparse_speaker_id', speakerIds);
  if (error) throw new Error(`pmqs_archive_people: ${error.message}`);
  const out = new Map<string, string>();
  for (const p of (data ?? []) as { parlparse_speaker_id: string; historic_hansard_url: string | null }[]) if (p.historic_hansard_url) out.set(p.parlparse_speaker_id, p.historic_hansard_url);
  return out;
}

// Whoever answered: the record's "The Prime Minister", or for a stand in the speaker with the most contributions.
function answererOf(rows: Row[]): string | null {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.attributed_to || /\bSpeaker\b/i.test(r.attributed_to)) continue;
    const k = r.parlparse_speaker_id ?? r.attributed_to;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [k, n] of counts) if (best === null || n > counts.get(best)!) best = k;
  return best;
}

// Every row of the session in order, with its own rule rather than the current sessions' isExchangeRow: a row with no
// member id, a Speaker's remark or a note in the record all show. An answer follows the contribution before it.
export const archiveExchanges = cache(async (date: string): Promise<ArchiveExchange[]> => {
  const { data, error } = await db().from('pmqs_archive_exchanges')
    .select('date, item_order, attributed_to, parlparse_speaker_id, member_id, contribution_text')
    .eq('date', date).order('item_order', { ascending: true });
  if (error) throw new Error(`pmqs_archive_exchanges ${date}: ${error.message}`);
  const rows = (data ?? []) as Row[];
  const [known, historic] = await Promise.all([
    membersKnown([...new Set(rows.map((r) => r.member_id).filter((v): v is number => v !== null))]),
    historicLinks([...new Set(rows.map((r) => r.parlparse_speaker_id).filter((v): v is string => !!v))]),
  ]);
  const answerer = answererOf(rows);
  const out: ArchiveExchange[] = [];
  for (const r of rows) {
    // Their MP page; else, with a member id, Parliament's page for them; else Historic Hansard; else plain text.
    const old = r.member_id === null && r.parlparse_speaker_id ? historic.get(r.parlparse_speaker_id) ?? null : null;
    const link: Pick<ArchiveContribution, 'href' | 'site'> = r.member_id !== null
      ? (known.has(r.member_id) ? { href: `/mps/${r.member_id}`, site: 'opengovt' } : { href: `https://members.parliament.uk/member/${r.member_id}/career`, site: 'parliament' })
      : (old ? { href: old, site: 'historic' } : { href: null, site: null });
    const c: ArchiveContribution = { order: r.item_order, name: r.attributed_to, ...link, text: r.contribution_text };
    const isAnswer = !!r.attributed_to && !/\bSpeaker\b/i.test(r.attributed_to)
      && (/^the (deputy )?prime minister\b/i.test(r.attributed_to) || (r.parlparse_speaker_id ?? r.attributed_to) === answerer);
    const last = out[out.length - 1];
    if (isAnswer && last) last.answers.push(c);
    else out.push({ lead: c, answers: [] });
  }
  return out;
});

// How many of those there are: the MP profile's "Questions at PMQs" count.
const NOT_FROM_THE_CHAIR = 'attributed_to.is.null,attributed_to.not.ilike.*speaker*';
export const memberArchiveCount = cache(async (memberId: number): Promise<number> => {
  const { count, error } = await db().from('pmqs_archive_exchanges').select('date', { count: 'exact', head: true }).eq('member_id', memberId).or(NOT_FROM_THE_CHAIR);
  if (error) throw new Error(`pmqs_archive_exchanges count: ${error.message}`);
  return count ?? 0;
});

// An MP's own questions and answers in the archive, newest first. The Speaker's remarks from the chair are not theirs.
export const memberArchive = cache(async (memberId: number): Promise<MemberContribution[]> => {
  const rows = await readAll<Row>(() => db().from('pmqs_archive_exchanges'), {
    columns: 'date, item_order, attributed_to, contribution_text',
    filter: (q) => q.eq('member_id', memberId).or(NOT_FROM_THE_CHAIR),
    orderBy: [{ column: 'date', ascending: false }, { column: 'item_order' }],
    label: 'pmqs_archive_exchanges member',
  });
  return rows.map((r) => ({ date: r.date, order: r.item_order, text: r.contribution_text }));
});

export function longDateArchive(iso: string): string {
  const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${M[m - 1]} ${y}`;
}
