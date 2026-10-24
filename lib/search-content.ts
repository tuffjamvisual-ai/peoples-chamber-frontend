import { supabase } from '@/lib/supabase';
import { govUrlToSlug } from '@/lib/govUrlSlug';
import { DEPT_SLUG_TO_ORGS } from '@/lib/govOrgSlug';
import { listSummary } from '@/lib/editorials/list-summary';
import { displayMpName } from '@/lib/mp-name';

export type SearchResultType =
  | 'editorial'
  | 'pressRelease'
  | 'briefing'
  | 'bill'
  | 'division'
  | 'mp';

export type SearchResult = {
  type: SearchResultType;
  title: string;
  standfirst?: string;
  date?: string;        // YYYY-MM-DD
  url: string;
  kicker?: string;
  org?: string;
  party?: string;
  constituency?: string;
};

export const VALID_SEARCH_TYPES = [
  'all', 'editorial', 'pressRelease', 'briefing', 'bill', 'division', 'mp',
] as const;

export type SearchType = typeof VALID_SEARCH_TYPES[number];

const PER_TABLE      = 20;
export const TOTAL_LIMIT  = 50;
const PHRASE_PER_TABLE    = 100;
export const PHRASE_LIMIT = 100;

const TYPE_WEIGHT: Record<SearchResultType, number> = {
  editorial:    0.90,
  briefing:     0.80,
  mp:           0.70,
  bill:         0.55,
  division:     0.25,
  pressRelease: 0.10,
};

function titleScore(title: string, q: string): 0 | 1 | 2 {
  const tl = title.trim().toLowerCase();
  const ql = q.trim().toLowerCase();
  if (!ql) return 0;
  if (tl === ql) return 2;
  if (tl.includes(ql)) return 1;
  return 0;
}

/** True when q is a quoted phrase: starts AND ends with " with content between. */
export function isPhrase(q: string): boolean {
  const t = q.trim();
  return t.length > 2 && t.startsWith('"') && t.endsWith('"');
}

function unwrapPhrase(q: string): string {
  return q.trim().slice(1, -1);
}

function toDateStr(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  return v.slice(0, 10);
}

type TsType = 'phrase' | 'websearch';

async function queryEditorials(
  q: string,
  tsType: TsType,
  dept: string | null,
  from: string | null,
  to: string | null,
): Promise<SearchResult[]> {
  const limit = tsType === 'phrase' ? PHRASE_PER_TABLE : PER_TABLE;
  let query = supabase
    .from('editorials')
    .select('slug, headline, standfirst, summary, published_at, kicker')
    .textSearch('search_vec', q, { type: tsType, config: 'english' })
    .order('published_at', { ascending: false })
    .limit(limit);

  if (dept) query = query.contains('related_dept_slugs', [dept]);
  if (from) query = query.gte('published_at', from);
  if (to)   query = query.lte('published_at', to);

  const { data, error } = await query;
  if (error) throw new Error(`editorials: ${error.message}`);

  return (data ?? []).map((r) => ({
    type: 'editorial' as const,
    title: r.headline,
    standfirst: listSummary(r) || undefined,
    date: toDateStr(r.published_at),
    url: `/editorials/${r.slug}`,
    kicker: r.kicker ?? undefined,
  }));
}

async function queryPressReleases(
  q: string,
  tsType: TsType,
  dept: string | null,
  from: string | null,
  to: string | null,
): Promise<SearchResult[]> {
  let orgNames: string[] | null = null;
  if (dept) {
    orgNames = DEPT_SLUG_TO_ORGS[dept] ?? [];
    if (orgNames.length === 0) return [];
  }

  const limit = tsType === 'phrase' ? PHRASE_PER_TABLE : PER_TABLE;
  let query = supabase
    .from('press_releases')
    .select('title, description, organisation, published_at, gov_url')
    .textSearch('search_vec', q, { type: tsType, config: 'english' })
    .not('removed_upstream', 'is', true)
    .not('gov_url', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (orgNames) query = query.in('organisation', orgNames);
  if (from) query = query.gte('published_at', from);
  if (to)   query = query.lte('published_at', to);

  const { data, error } = await query;
  if (error) throw new Error(`press_releases: ${error.message}`);

  return (data ?? []).flatMap((r) => {
    if (!r.gov_url) return [];
    const newsSlug = govUrlToSlug(r.gov_url);
    if (!newsSlug) return [];
    return [{
      type: 'pressRelease' as const,
      title: r.title,
      standfirst: r.description ?? undefined,
      date: toDateStr(r.published_at),
      url: `/news/${newsSlug}`,
      org: r.organisation ?? undefined,
    }];
  });
}

async function queryBriefings(
  q: string,
  tsType: TsType,
  from: string | null,
  to: string | null,
): Promise<SearchResult[]> {
  const limit = tsType === 'phrase' ? PHRASE_PER_TABLE : PER_TABLE;
  let query = supabase
    .from('briefings')
    .select('slug, headline, published_at')
    .textSearch('search_vec', q, { type: tsType, config: 'english' })
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (from) query = query.gte('published_at', from);
  if (to)   query = query.lte('published_at', to);

  const { data, error } = await query;
  if (error) throw new Error(`briefings: ${error.message}`);

  return (data ?? []).map((r) => ({
    type: 'briefing' as const,
    title: r.headline,
    date: toDateStr(r.published_at),
    url: `/briefings/${r.slug}`,
  }));
}

async function queryBills(
  q: string,
  tsType: TsType,
  from: string | null,
  to: string | null,
): Promise<SearchResult[]> {
  const limit = tsType === 'phrase' ? PHRASE_PER_TABLE : PER_TABLE;
  let query = supabase
    .from('bill')
    .select('id, title, current_stage, last_update')
    .textSearch('search_vec', q, { type: tsType, config: 'english' })
    .is('hidden_reason', null)
    .order('last_update', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (from) query = query.gte('last_update', from);
  if (to)   query = query.lte('last_update', to);

  const { data, error } = await query;
  if (error) throw new Error(`bill: ${error.message}`);

  return (data ?? []).map((r) => ({
    type: 'bill' as const,
    title: r.title,
    standfirst: r.current_stage ?? undefined,
    date: toDateStr(r.last_update),
    url: `/bills/${r.id}`,
  }));
}

async function queryDivisions(
  q: string,
  tsType: TsType,
  from: string | null,
  to: string | null,
): Promise<SearchResult[]> {
  const limit = tsType === 'phrase' ? PHRASE_PER_TABLE : PER_TABLE;
  let query = supabase
    .from('commons_divisions_fts')
    .select('division_date_only, division_number, division_title')
    .textSearch('search_vec', q, { type: tsType, config: 'english' })
    .order('division_date_only', { ascending: false })
    .limit(limit);

  if (from) query = query.gte('division_date_only', from);
  if (to)   query = query.lte('division_date_only', to);

  const { data, error } = await query;
  if (error) throw new Error(`commons_divisions_fts: ${error.message}`);

  return (data ?? []).map((r) => ({
    type: 'division' as const,
    title: r.division_title ?? `Division ${r.division_number}`,
    date: toDateStr(r.division_date_only),
    url: `/divisions/pw-${r.division_date_only}-${r.division_number}-commons`,
  }));
}

async function queryMPs(q: string, tsType: TsType): Promise<SearchResult[]> {
  const limit = tsType === 'phrase' ? PHRASE_PER_TABLE : PER_TABLE;
  const { data, error } = await supabase
    .from('mps')
    .select('member_id, display_name, constituency, party')
    .textSearch('search_vec', q, { type: tsType, config: 'english' })
    .eq('current_member', true)
    .limit(limit);

  if (error) throw new Error(`mps: ${error.message}`);

  return (data ?? []).map((r) => ({
    type: 'mp' as const,
    title: displayMpName(r.display_name) ?? r.member_id?.toString() ?? '',
    constituency: r.constituency ?? undefined,
    party: r.party ?? undefined,
    url: `/mps/${r.member_id}`,
  }));
}

// Council profiles (23 Oct 2026): matched on the council's name or short name, as the council search does, and
// shown as their own group above the other results rather than mixed into them.
export type CouncilSearchResult = { slug: string; name: string; typeLabel: string | null; country: string | null };
const COUNCIL_LIMIT = 10;

export async function searchCouncils(q: string): Promise<CouncilSearchResult[]> {
  const term = (isPhrase(q) ? unwrapPhrase(q) : q).trim();
  // % and _ are ilike wildcards; commas and parentheses would break the .or() filter.
  const safe = term.replace(/[%_,()\\"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (safe.length < 2) return [];
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from('councils')
    .select('slug, name, short_name, type_label, country')
    .or(`name.ilike.${pattern},short_name.ilike.${pattern}`)
    .order('name', { ascending: true })
    .limit(COUNCIL_LIMIT);
  if (error) {
    console.warn('[search] councils error:', error.message);
    return [];
  }
  const lower = safe.toLowerCase();
  const exact = (r: { name: string; short_name: string | null }) =>
    r.name.toLowerCase() === lower || (r.short_name ?? '').toLowerCase() === lower ? 0 : 1;
  return (data ?? [])
    .slice()
    .sort((x, y) => exact(x) - exact(y))
    .map((r) => ({ slug: r.slug, name: r.name, typeLabel: r.type_label ?? null, country: r.country ?? null }));
}

export async function searchContent(
  q: string,
  type: string,
  dept: string | null,
  from: string | null,
  to: string | null,
  sort: 'relevance' | 'newest' = 'relevance',
): Promise<SearchResult[]> {
  if (!q || !VALID_SEARCH_TYPES.includes(type as SearchType)) return [];

  const phrase = isPhrase(q);
  const effectiveQ = phrase ? unwrapPhrase(q) : q;
  const tsType: TsType = phrase ? 'phrase' : 'websearch';
  const totalLimit = phrase ? PHRASE_LIMIT : TOTAL_LIMIT;

  const want = (t: SearchResultType) => type === 'all' || type === t;

  const tasks: Promise<SearchResult[]>[] = [];
  if (want('editorial'))    tasks.push(queryEditorials(effectiveQ, tsType, dept, from, to));
  if (want('pressRelease')) tasks.push(queryPressReleases(effectiveQ, tsType, dept, from, to));
  // The Reports filter (type=editorial) covers database briefings too (23 Oct 2026).
  if (want('briefing') || type === 'editorial') tasks.push(queryBriefings(effectiveQ, tsType, from, to));
  if (want('bill'))         tasks.push(queryBills(effectiveQ, tsType, from, to));
  if (want('division'))     tasks.push(queryDivisions(effectiveQ, tsType, from, to));
  if (want('mp'))           tasks.push(queryMPs(effectiveQ, tsType));

  const settled = await Promise.allSettled(tasks);

  const results: SearchResult[] = [];
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results.push(...outcome.value);
    } else {
      console.warn('[search] fan-out error:', outcome.reason);
    }
  }

  if (sort === 'relevance') {
    results.sort((a, b) => {
      const ta = titleScore(a.title, effectiveQ);
      const tb = titleScore(b.title, effectiveQ);
      if (ta !== tb) return tb - ta;
      const wa = TYPE_WEIGHT[a.type] ?? 0;
      const wb = TYPE_WEIGHT[b.type] ?? 0;
      if (wa !== wb) return wb - wa;
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
    // Cap: max 3 results per type in the first 10 positions.
    // Overflow items are appended after position 10 rather than dropped.
    const typeCounts: Partial<Record<SearchResultType, number>> = {};
    const top: SearchResult[] = [];
    const rest: SearchResult[] = [];
    for (const r of results) {
      const n = typeCounts[r.type] ?? 0;
      if (top.length < 10 && n < 3) {
        top.push(r);
        typeCounts[r.type] = n + 1;
      } else {
        rest.push(r);
      }
    }
    return [...top, ...rest].slice(0, totalLimit);
  }

  results.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return results.slice(0, totalLimit);
}
