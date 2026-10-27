// Reads for /laws/made-without-a-vote, /statutory-instruments/[id] (API ids) and /treaties (report 81), from the
// statutory_instruments and treaties tables (migration 2026-10-27b).
//
// Local testing without the database: with SI_TREATIES_FIXTURES set to a folder holding si.json and treaties.json
// (rows in the tables' shape), and never on Vercel, these reads come from those files instead.

import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase } from '@/lib/supabase';
import type { SiRow, TreatyRow } from '@/lib/parliament-si-treaties';

export const PER_PAGE = 50;
export type SiFlag = 'committee' | 'prayed' | 'debated';
export type SiFilters = { department?: string; procedure?: string; flag?: SiFlag; page: number };
export type SiListRow = Pick<SiRow, 'api_id' | 'title' | 'si_number' | 'procedure' | 'laying_department' | 'laid_date' | 'legislation_url' | 'committee_concerns' | 'prayed_against' | 'debated'>;
export type TreatyListRow = Pick<TreatyRow, 'api_id' | 'title' | 'command_paper' | 'laid_date' | 'lead_department' | 'crag_end_date' | 'scrutiny_concluded' | 'conclusion' | 'govuk_url' | 'committee_reports'>;

const FLAG_COLUMN: Record<SiFlag, keyof SiRow> = { committee: 'committee_concerns', prayed: 'prayed_against', debated: 'debated' };
const SI_LIST_COLS = 'api_id, title, si_number, procedure, laying_department, laid_date, legislation_url, committee_concerns, prayed_against, debated';
const TREATY_LIST_COLS = 'api_id, title, command_paper, laid_date, lead_department, crag_end_date, scrutiny_concluded, conclusion, govuk_url, committee_reports';

// ---- fixtures (local only) ----
function fixtures<T>(name: string): T[] | null {
  const dir = process.env.SI_TREATIES_FIXTURES;
  if (!dir || process.env.VERCEL) return null;
  return JSON.parse(readFileSync(join(dir, name), 'utf8')) as T[];
}
const byLaidDesc = <T extends { laid_date: string | null }>(a: T, b: T) => (b.laid_date || '').localeCompare(a.laid_date || '');
const yearAgo = () => new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);

export async function listSis(f: SiFilters): Promise<{ rows: SiListRow[]; total: number }> {
  const from = (f.page - 1) * PER_PAGE;
  const fx = fixtures<SiRow>('si.json');
  if (fx) {
    const all = fx.filter((r) => (!f.department || r.laying_department === f.department) && (!f.procedure || r.procedure === f.procedure)
      && (!f.flag || !!r[FLAG_COLUMN[f.flag]])).sort(byLaidDesc);
    return { rows: all.slice(from, from + PER_PAGE), total: all.length };
  }
  let q = supabase.from('statutory_instruments').select(SI_LIST_COLS, { count: 'exact' });
  if (f.department) q = q.eq('laying_department', f.department);
  if (f.procedure) q = q.eq('procedure', f.procedure);
  if (f.flag) q = q.eq(FLAG_COLUMN[f.flag] as string, true);
  const { data, error, count } = await q.order('laid_date', { ascending: false, nullsFirst: false }).order('api_id').range(from, from + PER_PAGE - 1);
  if (error) throw new Error(`statutory_instruments list: ${error.message}`);
  return { rows: (data ?? []) as SiListRow[], total: count ?? 0 };
}

// Laid in the last 12 months, and how many of those were debated.
export async function siYear(): Promise<{ laid: number; debated: number }> {
  const since = yearAgo();
  const fx = fixtures<SiRow>('si.json');
  if (fx) {
    const y = fx.filter((r) => (r.laid_date || '') >= since);
    return { laid: y.length, debated: y.filter((r) => r.debated).length };
  }
  const [a, b] = await Promise.all([
    supabase.from('statutory_instruments').select('api_id', { count: 'exact', head: true }).gte('laid_date', since),
    supabase.from('statutory_instruments').select('api_id', { count: 'exact', head: true }).gte('laid_date', since).eq('debated', true),
  ]);
  if (a.error || b.error) throw new Error(`statutory_instruments counts: ${(a.error || b.error)!.message}`);
  return { laid: a.count ?? 0, debated: b.count ?? 0 };
}

export async function siDepartments(): Promise<string[]> {
  const fx = fixtures<SiRow>('si.json');
  if (fx) return [...new Set(fx.map((r) => r.laying_department).filter(Boolean) as string[])].sort();
  const { data, error } = await supabase.from('statutory_instrument_departments').select('laying_department').order('laying_department');
  if (error) throw new Error(`statutory_instrument_departments: ${error.message}`);
  return (data ?? []).map((r) => r.laying_department as string);
}

export async function getSi(apiId: string): Promise<SiRow | null> {
  const fx = fixtures<SiRow>('si.json');
  if (fx) return fx.find((r) => r.api_id === apiId) ?? null;
  const { data, error } = await supabase.from('statutory_instruments').select('*').eq('api_id', apiId).maybeSingle();
  if (error) throw new Error(`statutory_instruments ${apiId}: ${error.message}`);
  return (data as SiRow) ?? null;
}

// The other version of an instrument (owner's job, 27 Oct 2026, Part 4): for a draft or proposal, the made version;
// for a made instrument, the draft or proposal it came from. In order:
//   1. the API links the two (followed_by_id and preceded_by_id, read from either side);
//   2. a numbered and an unnumbered instrument have exactly the same title and the same laying date;
//   3. (owner's rule, 27 Oct 2026) exactly the same title, the numbered one laid after the draft, and exactly one such
//      candidate each way: the draft has one later numbered instrument of that title, and that instrument has one
//      earlier unnumbered one.
// Nothing looser: no match means none is shown.
export type SiVersion = Pick<SiRow, 'api_id' | 'title' | 'si_number' | 'procedure' | 'laid_date'>;
export type SiVersions = { made: SiVersion | null; draft: SiVersion | null };
const VERSION_COLS = 'api_id, title, si_number, procedure, laid_date';

export function pickVersions(si: SiRow, rows: (SiVersion & Pick<SiRow, 'preceded_by_id' | 'followed_by_id'>)[]): SiVersions {
  const others = rows.filter((r) => r.api_id !== si.api_id);
  const byId = (id: string | null | undefined) => (id ? others.find((r) => r.api_id === id) ?? null : null);
  const sameTitleAndDay = (r: SiVersion) => !!si.laid_date && r.laid_date === si.laid_date && r.title.trim() === si.title.trim();
  const strip = (r: SiVersion): SiVersion => ({ api_id: r.api_id, title: r.title, si_number: r.si_number, procedure: r.procedure, laid_date: r.laid_date });
  const sameTitle = (a: SiVersion, b: SiVersion) => a.title.trim() === b.title.trim();
  const laterMade = (d: SiVersion) => rows.filter((r) => !!r.si_number && sameTitle(r, d) && !!d.laid_date && !!r.laid_date && r.laid_date > d.laid_date);
  const earlierDrafts = (m: SiVersion) => rows.filter((r) => !r.si_number && sameTitle(r, m) && !!m.laid_date && !!r.laid_date && r.laid_date < m.laid_date);
  const onlyOne = <T,>(xs: T[]) => (xs.length === 1 ? xs[0] : null);
  const titleRuleMade = () => { const m = onlyOne(laterMade(si)); return m && onlyOne(earlierDrafts(m))?.api_id === si.api_id ? m : null; };
  const titleRuleDraft = () => { const d = onlyOne(earlierDrafts(si)); return d && onlyOne(laterMade(d))?.api_id === si.api_id ? d : null; };
  const made = byId(si.followed_by_id) ?? others.find((r) => r.preceded_by_id === si.api_id)
    ?? (!si.si_number ? others.find((r) => !!r.si_number && sameTitleAndDay(r)) ?? titleRuleMade() : null);
  const draft = byId(si.preceded_by_id) ?? others.find((r) => r.followed_by_id === si.api_id)
    ?? (si.si_number ? others.find((r) => !r.si_number && sameTitleAndDay(r)) ?? titleRuleDraft() : null);
  return { made: made ? strip(made) : null, draft: draft ? strip(draft) : null };
}

export async function getSiVersions(si: SiRow): Promise<SiVersions> {
  const fx = fixtures<SiRow>('si.json');
  if (fx) return pickVersions(si, fx);
  const ids = [si.preceded_by_id, si.followed_by_id].filter((x): x is string => !!x);
  const reads = await Promise.all([
    ids.length ? supabase.from('statutory_instruments').select(`${VERSION_COLS}, preceded_by_id, followed_by_id`).in('api_id', ids) : Promise.resolve({ data: [], error: null }),
    supabase.from('statutory_instruments').select(`${VERSION_COLS}, preceded_by_id, followed_by_id`).or(`preceded_by_id.eq.${si.api_id},followed_by_id.eq.${si.api_id}`).limit(5),
    supabase.from('statutory_instruments').select(`${VERSION_COLS}, preceded_by_id, followed_by_id`).eq('title', si.title).limit(50),
  ]);
  const rows = [];
  for (const r of reads) {
    if (r.error) throw new Error(`statutory_instruments versions ${si.api_id}: ${r.error.message}`);
    rows.push(...((r.data ?? []) as (SiVersion & Pick<SiRow, 'preceded_by_id' | 'followed_by_id'>)[]));
  }
  return pickVersions(si, [si, ...rows.filter((r, i, a) => r.api_id !== si.api_id && a.findIndex((x) => x.api_id === r.api_id) === i)]);
}

export async function listTreaties(page: number): Promise<{ rows: TreatyListRow[]; total: number }> {
  const from = (page - 1) * PER_PAGE;
  const fx = fixtures<TreatyRow>('treaties.json');
  if (fx) { const all = [...fx].sort(byLaidDesc); return { rows: all.slice(from, from + PER_PAGE), total: all.length }; }
  const { data, error, count } = await supabase.from('treaties').select(TREATY_LIST_COLS, { count: 'exact' })
    .order('laid_date', { ascending: false, nullsFirst: false }).order('api_id').range(from, from + PER_PAGE - 1);
  if (error) throw new Error(`treaties list: ${error.message}`);
  return { rows: (data ?? []) as TreatyListRow[], total: count ?? 0 };
}

export async function treatyYear(): Promise<{ laid: number; open: number }> {
  const since = yearAgo();
  const fx = fixtures<TreatyRow>('treaties.json');
  if (fx) return { laid: fx.filter((r) => (r.laid_date || '') >= since).length, open: fx.filter((r) => !r.scrutiny_concluded && (r.laid_date || '') >= since).length };
  const [a, b] = await Promise.all([
    supabase.from('treaties').select('api_id', { count: 'exact', head: true }).gte('laid_date', since),
    supabase.from('treaties').select('api_id', { count: 'exact', head: true }).gte('laid_date', since).eq('scrutiny_concluded', false),
  ]);
  if (a.error || b.error) throw new Error(`treaties counts: ${(a.error || b.error)!.message}`);
  return { laid: a.count ?? 0, open: b.count ?? 0 };
}

export async function getTreaty(apiId: string): Promise<TreatyRow | null> {
  const fx = fixtures<TreatyRow>('treaties.json');
  if (fx) return fx.find((r) => r.api_id === apiId) ?? null;
  const { data, error } = await supabase.from('treaties').select('*').eq('api_id', apiId).maybeSingle();
  if (error) throw new Error(`treaties ${apiId}: ${error.message}`);
  return (data as TreatyRow) ?? null;
}

// API ids are 6 to 12 letters and digits with at least one letter; a division id (the older statutory_instrument rows)
// is all digits.
export const isApiId = (id: string) => /^[A-Za-z0-9]{6,12}$/.test(id) && /[A-Za-z]/.test(id);

export function fmtDate(d: string | null): string {
  if (!d) return 'not given';
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// The scrutiny state of a treaty, in words, for /treaties and /treaties/[id].
export function scrutinyLabel(t: { scrutiny_concluded: boolean; conclusion: string | null; crag_end_date: string | null }, today: string): string {
  if (t.scrutiny_concluded) return t.conclusion === 'CantRatify' ? 'Scrutiny concluded: Parliament objected' : 'Scrutiny concluded: can be ratified';
  if (t.crag_end_date && t.crag_end_date >= today) return `Open to objection until ${fmtDate(t.crag_end_date)}`;
  if (t.crag_end_date) return `Objection period ended ${fmtDate(t.crag_end_date)}`;
  return 'Scrutiny not concluded';
}
