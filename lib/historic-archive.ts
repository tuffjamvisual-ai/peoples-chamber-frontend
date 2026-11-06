// The historic Commons votes (11 Oct 2004 to 8 Mar 2016) and the historic Register of Members' Financial Interests (10 Nov 2000 to 4 Mar 2024), loaded on
// 6 Nov 2026 (scripts/migrations/2026-11-06h-historic-votes-register.sql). Separate tables, and separate on the page: attendance, rebellion and every other
// live MP figure keep reading mp_division_votes, and these votes have no rebellion figures. Text is as published (EXACT_COLUMNS in lib/no-em-dash.ts).
// The archive does not change, so nothing here needs a sync.
import { cache } from 'react';
import { supabase } from '@/lib/supabase';

export const ARCHIVE_LAST_DATE = '2016-03-08';
export const ARCHIVE_FIRST_YEAR = 2004;
export const ARCHIVE_LAST_YEAR = 2016;
export const HANSARD_LABEL = 'From Hansard, October 2004 to March 2016';
export const ARCHIVE_NOTE = "This archive starts on 11 October 2004. 69 later divisions are missing from Parliament's data.";

// The 12 members whose Commons record has no biography, so profile links use their fuller Lords record (profile_link_id). Their rows stay under the Commons
// ID, so a page for either ID shows the same record.
const COMMONS_ID_OF: Record<number, number> = {
  4150: 511, 3748: 212, 3786: 222, 4211: 110, 4154: 137, 4158: 612, 4148: 587, 4162: 293, 4149: 653, 4170: 30, 4151: 378, 4160: 1450,
};
export const idsFor = (memberId: number) => (COMMONS_ID_OF[memberId] ? [memberId, COMMONS_ID_OF[memberId]] : [memberId]);
// Where a name in the archive links. Every member with a Commons record has a page at /mps/<id> (lib/former-mps.ts).
export const archiveProfileHref = (r: { member_id: number | null; profile_link_id: number | null }) => {
  const id = r.profile_link_id ?? r.member_id;
  return id == null ? null : `/mps/${id}`;
};

// "6 September 2010": the dates are plain days, so read them as UTC and the day never shifts.
export const archiveDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export type ArchiveDivision = {
  external_id: string; division_date: string; division_number: number; title: string;
  ayes_shown: number; noes_shown: number; count_shown: string; count_note: string | null;
  aye_tellers: number | null; noe_tellers: number | null;
  evel_ayes: string | null; evel_noes: string | null; text_before: string | null; text_after: string | null;
};
export type ArchiveVote = {
  id: number; side: 'aye' | 'no'; is_teller: boolean; list_as: string; party_as_listed: string | null;
  member_id: number | null; profile_link_id: number | null;
};

// A blank title in the printed record (18 July 2007, no. 190) shows as its number.
export const archiveTitle = (d: { title: string | null; division_number: number }) => (d.title ?? '').trim() || `Division ${d.division_number}`;
// The one division whose printed record contradicts itself (14 May 2008, no. 183): its note says so, and its printed result is not repeated as fact.
export const recordInconsistent = (d: { count_note: string | null }) => !!d.count_note?.includes('printed record is inconsistent');

export const archiveDivision = cache(async (date: string, number: number): Promise<ArchiveDivision | null> => {
  if (date > ARCHIVE_LAST_DATE) return null;
  const { data, error } = await supabase.from('historic_commons_divisions')
    .select('external_id, division_date, division_number, title, ayes_shown, noes_shown, count_shown, count_note, aye_tellers, noe_tellers, evel_ayes, evel_noes, text_before, text_after')
    .eq('division_date', date).eq('division_number', number).maybeSingle();
  if (error) throw new Error(`archive division ${date} ${number}: ${error.message}`);
  return data as ArchiveDivision | null;
});

export async function archiveVotes(externalId: string): Promise<ArchiveVote[]> {
  const { data, error } = await supabase.from('historic_commons_votes')
    .select('id, side, is_teller, list_as, party_as_listed, member_id, profile_link_id')
    .eq('division_external_id', externalId).order('id', { ascending: true }).limit(1000);
  if (error) throw new Error(`archive votes ${externalId}: ${error.message}`);
  return (data ?? []) as ArchiveVote[];
}

export type ArchiveRef = { date: string; number: number; title: string };
type RefRow = { division_date: string; division_number: number; title: string | null };
const toRef = (r: RefRow): ArchiveRef => ({ date: String(r.division_date).slice(0, 10), number: r.division_number, title: archiveTitle(r) });

// The votes either side of one, and up to 10 others that day, as divisionNeighbours gives for current votes.
export async function archiveNeighbours(date: string, number: number): Promise<{ previous: ArchiveRef | null; next: ArchiveRef | null; sameDay: ArchiveRef[] }> {
  const cols = 'division_date, division_number, title';
  const table = () => supabase.from('historic_commons_divisions').select(cols);
  const [prev, next, day] = await Promise.all([
    table().or(`division_date.lt.${date},and(division_date.eq.${date},division_number.lt.${number})`).order('division_date', { ascending: false }).order('division_number', { ascending: false }).limit(1).maybeSingle(),
    table().or(`division_date.gt.${date},and(division_date.eq.${date},division_number.gt.${number})`).order('division_date', { ascending: true }).order('division_number', { ascending: true }).limit(1).maybeSingle(),
    table().eq('division_date', date).neq('division_number', number).order('division_number', { ascending: true }).limit(10),
  ]);
  for (const r of [prev, next, day]) if (r.error) throw new Error(`archive neighbours ${date} ${number}: ${r.error.message}`);
  return {
    previous: prev.data ? toRef(prev.data as RefRow) : null,
    next: next.data ? toRef(next.data as RefRow) : null,
    sameDay: ((day.data ?? []) as RefRow[]).map(toRef),
  };
}

// The year pages: a year's archive divisions, newest first.
export async function archiveYearCount(year: number): Promise<number> {
  if (year < ARCHIVE_FIRST_YEAR || year > ARCHIVE_LAST_YEAR) return 0;
  const { count, error } = await supabase.from('historic_commons_divisions').select('division_number', { count: 'exact', head: true })
    .gte('division_date', `${year}-01-01`).lte('division_date', `${year}-12-31`);
  if (error) throw new Error(`archive count ${year}: ${error.message}`);
  return count ?? 0;
}
export async function archiveYearRows(year: number, from: number, to: number): Promise<(ArchiveRef & { ayes: number; noes: number })[]> {
  const { data, error } = await supabase.from('historic_commons_divisions').select('division_date, division_number, title, ayes_shown, noes_shown')
    .gte('division_date', `${year}-01-01`).lte('division_date', `${year}-12-31`)
    .order('division_date', { ascending: false }).order('division_number', { ascending: false }).range(from, to);
  if (error && error.code !== 'PGRST103') throw new Error(`archive divisions ${year}: ${error.message}`);
  return ((data ?? []) as (RefRow & { ayes_shown: number; noes_shown: number })[]).map((r) => ({ ...toRef(r), ayes: r.ayes_shown, noes: r.noes_shown }));
}

// One member's archive votes.
export type MemberVote = { side: 'aye' | 'no'; is_teller: boolean; division_date: string; division_number: number; division_external_id: string };
export type NamedVote = MemberVote & { title: string };

const memberVotes = cache(async (memberId: number): Promise<MemberVote[]> => {
  const out: MemberVote[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('historic_commons_votes').select('side, is_teller, division_date, division_number, division_external_id')
      .in('member_id', idsFor(memberId)).order('division_date', { ascending: false }).order('division_number', { ascending: false }).order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`archive votes for ${memberId}: ${error.message}`);
    out.push(...((data ?? []) as MemberVote[]));
    if ((data ?? []).length < 1000) return out;
  }
});

async function withTitles(votes: MemberVote[]): Promise<NamedVote[]> {
  const titles = new Map<string, string>();
  for (let i = 0; i < votes.length; i += 200) {
    const ids = votes.slice(i, i + 200).map((v) => v.division_external_id);
    const { data, error } = await supabase.from('historic_commons_divisions').select('external_id, title, division_number').in('external_id', ids);
    if (error) throw new Error(`archive vote titles: ${error.message}`);
    for (const r of (data ?? []) as { external_id: string; title: string | null; division_number: number }[]) titles.set(r.external_id, archiveTitle(r));
  }
  return votes.map((v) => ({ ...v, title: titles.get(v.division_external_id) ?? `Division ${v.division_number}` }));
}

export type MemberVoteSummary = { total: number; ayes: number; noes: number; first: string; last: string; years: { year: number; count: number }[]; latest: NamedVote[] };

export async function memberVoteSummary(memberId: number): Promise<MemberVoteSummary | null> {
  const votes = await memberVotes(memberId);
  if (!votes.length) return null;
  const perYear = new Map<number, number>();
  for (const v of votes) { const y = Number(v.division_date.slice(0, 4)); perYear.set(y, (perYear.get(y) ?? 0) + 1); }
  return {
    total: votes.length,
    ayes: votes.filter((v) => v.side === 'aye').length,
    noes: votes.filter((v) => v.side === 'no').length,
    first: votes[votes.length - 1].division_date,
    last: votes[0].division_date,
    years: [...perYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count })),
    latest: await withTitles(votes.slice(0, 5)),
  };
}

export async function memberVotesInYear(memberId: number, year: number): Promise<{ summary: MemberVote[]; votes: NamedVote[] }> {
  const all = await memberVotes(memberId);
  return { summary: all, votes: await withTitles(all.filter((v) => v.division_date.startsWith(`${year}-`))) };
}

// One member's register history: every entry, grouped by category, in the order published. An entry covers a run of editions, so its place is its place in
// the edition that first printed it (block_order, the printed order within a member's entry). Lines with the same dates that follow one another read as one
// item and share one "Declared from" line; nothing is merged in the text or dropped.
type EntryRow = { entry_id: string; member_name: string; category_type: string | null; category_name: string | null; row_kind: string; text: string; first_edition: string; last_edition: string };
export type RegisterBlock = { first: string; last: string; lines: { kind: string; text: string }[] };
export type RegisterCategory = { key: string; label: string; entries: number; blocks: RegisterBlock[] };
export type RegisterHistory = { names: string[]; entries: number; firstEdition: string; lastEdition: string; categories: RegisterCategory[] };

// Labels changed over the years ("etc", "etc.", "etc..", stray spaces): one group for spellings of one label, shown as most often printed.
const labelKey = (s: string) => s.toLowerCase().replace(/[.,\s]+/g, ' ').trim();
const categoryPlace = (key: string, first: string) => (key.startsWith('(') ? `9999 ${key}` : first);
const tidyLabel = (s: string) => s.replace(/\s+/g, ' ').trim();

export async function registerHistory(memberId: number): Promise<RegisterHistory | null> {
  const { data, error } = await supabase.from('register_archive_entries')
    .select('entry_id, member_name, category_type, category_name, row_kind, text, first_edition, last_edition')
    .in('member_id', idsFor(memberId)).limit(2000);
  if (error) throw new Error(`register history ${memberId}: ${error.message}`);
  const entries = (data ?? []) as EntryRow[];
  if (!entries.length) return null;

  const place = new Map<string, number>();
  const CHUNK = 150;
  const chunks: EntryRow[][] = [];
  for (let i = 0; i < entries.length; i += CHUNK) chunks.push(entries.slice(i, i + CHUNK));
  await Promise.all(chunks.map(async (chunk) => {
    const byEdition = new Map<string, string[]>();
    for (const e of chunk) byEdition.set(e.first_edition, [...(byEdition.get(e.first_edition) ?? []), e.entry_id]);
    const filter = [...byEdition.entries()].map(([d, ids]) => `and(edition_date.eq.${d},entry_id.in.(${ids.join(',')}))`).join(',');
    const { data: rows, error: orderError } = await supabase.from('register_archive_entry_editions').select('entry_id, block_order').or(filter).limit(5000);
    if (orderError) throw new Error(`register order ${memberId}: ${orderError.message}`);
    for (const r of (rows ?? []) as { entry_id: string; block_order: number }[]) {
      const had = place.get(r.entry_id);
      if (had == null || r.block_order < had) place.set(r.entry_id, r.block_order);
    }
  }));
  entries.sort((a, b) => a.first_edition.localeCompare(b.first_edition) || (place.get(a.entry_id) ?? 0) - (place.get(b.entry_id) ?? 0));

  const groups = new Map<string, { rows: EntryRow[]; spellings: Map<string, number>; type: number }>();
  for (const e of entries) {
    const raw = tidyLabel(e.category_name ?? '') || 'No category given';
    const key = labelKey(raw);
    const g = groups.get(key) ?? { rows: [], spellings: new Map<string, number>(), type: Number(e.category_type) || 99 };
    g.rows.push(e);
    g.spellings.set(raw, (g.spellings.get(raw) ?? 0) + 1);
    groups.set(key, g);
  }
  const categories = [...groups.entries()]
    // Within a category number, by when the label first appears, and lettered parts ("(a) Support", "(b) Any other") last and in letter order.
    .sort((a, b) => a[1].type - b[1].type || categoryPlace(a[0], a[1].rows[0].first_edition).localeCompare(categoryPlace(b[0], b[1].rows[0].first_edition)))
    .map(([key, g]): RegisterCategory => {
      const blocks: RegisterBlock[] = [];
      for (const e of g.rows) {
        const last = blocks[blocks.length - 1];
        if (last && last.first === e.first_edition && last.last === e.last_edition) last.lines.push({ kind: e.row_kind, text: e.text });
        else blocks.push({ first: e.first_edition, last: e.last_edition, lines: [{ kind: e.row_kind, text: e.text }] });
      }
      return { key, label: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0], entries: g.rows.length, blocks };
    });
  const firsts = entries.map((e) => e.first_edition), lasts = entries.map((e) => e.last_edition).sort();
  return {
    names: [...new Set(entries.map((e) => e.member_name))],
    entries: entries.length,
    firstEdition: firsts[0],
    lastEdition: lasts[lasts.length - 1],
    categories,
  };
}
