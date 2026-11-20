// "What the record shows" on /news/<slug> (Cowork ENTRY 368, owner approved 19 Nov 2026; live as sampled, ENTRY 368 GO,
// owner approved 20 Nov 2026): the page's reads, and the news sitemap's list of indexable releases. The matching and the
// sentences are in lib/news-record-core.ts (shared with the sample script, scripts/news-record/sample-368.ts); whether a
// page is indexable is newsRecordIndexable() there.
//
// Database load (A16: every read in the tagged cache, no timer):
//   - one shared copy of the reference lists (councils, constituencies, MPs, organisations with contracts or grants),
//     read once and kept until one of those tables changes;
//   - per release, at most six reads, each on an index or a small table, kept until a source table changes:
//     written questions (GIN index on search, then the heading checked on the rows found), debates and early day motions
//     (titles of 11,400 and 4,500 rows), bills (trigram index on title), Commons divisions (GIN index on search_vec) and
//     their totals (by date and number). Costs measured by EXPLAIN in a READ ONLY transaction: see the commit message.
import { supabase } from '@/lib/supabase';
import { tagged, keyHash } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { optionalSection } from '@/lib/optional-section';
import {
  buildNewsRecord, newsRecordIndexable, websearchOr, containsPattern, billPatterns, FETCH_MAX, LIST_MAX,
  type NewsRecord, type NewsRecordReader, type Refs, type ReleaseInput, type CouncilRef, type SeatRef, type MpRef, type OrgRef, type DivisionRow,
} from '@/lib/news-record-core';

const REF_TABLES = ['councils', 'constituencies', 'mps', 'organisation_index'];
const ITEM_TABLES = ['parliament_written_questions', 'debates', 'early_day_motions', 'bill', 'commons_divisions_fts', 'commons_division_totals'];

// Every row of a small table, 1,000 a read (PostgREST's page size).
async function all<T>(label: string, read: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await read(from, from + 999);
    if (error) throw new Error(`news record ${label}: ${error.message}`);
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const loadRefs = () => tagged(['news-record-refs-v1'], tableTags(...REF_TABLES), async (): Promise<Refs> => {
  const [councils, seats, mps, orgs] = await Promise.all([
    all<CouncilRef>('councils', (f, t) => supabase.from('councils').select('slug, name, short_name, type_label, population, council_tax_band_d_pounds, political_control').order('slug').range(f, t)),
    all<SeatRef>('constituencies', (f, t) => supabase.from('constituencies').select('slug, name, ons_code').order('ons_code').range(f, t)),
    all<MpRef>('mps', (f, t) => supabase.from('mps').select('member_id, name, display_name, party, constituency, constituency_gss_code, current_member').order('member_id').range(f, t)),
    all<OrgRef>('organisations', (f, t) => supabase.from('organisation_index').select('slug, name, name_variants, contracts, contract_value, grants, grant_value').or('contracts.gt.0,grants.gt.0').order('slug').range(f, t)),
  ]);
  return { councils, seats, mps, orgs };
});

const fail = (label: string, error: { message: string } | null) => { if (error) throw new Error(`news record ${label}: ${error.message}`); };

const reader: NewsRecordReader = {
  async questions(ps) {
    const { data, error } = await supabase.from('parliament_written_questions')
      .select('id, uin, house, heading, date_tabled, date_answered, answering_body, asking_member_id')
      .textSearch('search', websearchOr(ps), { type: 'websearch', config: 'english' })
      .ilikeAnyOf('heading', ps.map(containsPattern))
      .not('is_withdrawn', 'is', true)
      .order('date_tabled', { ascending: false }).order('id', { ascending: false }).limit(FETCH_MAX);
    fail('written questions', error);
    return (data || []) as Awaited<ReturnType<NewsRecordReader['questions']>>;
  },
  async debates(ps) {
    const { data, error } = await supabase.from('debates').select('hansard_ext_id, title, sitting_date, section, house')
      .ilikeAnyOf('title', ps.map(containsPattern))
      .order('sitting_date', { ascending: false }).order('id', { ascending: false }).limit(FETCH_MAX);
    fail('debates', error);
    return (data || []) as Awaited<ReturnType<NewsRecordReader['debates']>>;
  },
  async edms(ps) {
    const { data, error } = await supabase.from('early_day_motions').select('id, uin_with_suffix, uin, title, date_tabled, signature_count')
      .ilikeAnyOf('title', ps.map(containsPattern))
      .order('date_tabled', { ascending: false }).order('id', { ascending: false }).limit(FETCH_MAX);
    fail('early day motions', error);
    return (data || []) as Awaited<ReturnType<NewsRecordReader['edms']>>;
  },
  async bills(cores) {
    const { data, error } = await supabase.from('bill').select('id, title, is_act, current_stage, originating_house, status')
      .is('hidden_reason', null).ilikeAnyOf('title', billPatterns(cores))
      .order('last_update', { ascending: false, nullsFirst: false }).limit(LIST_MAX);
    fail('bills', error);
    return (data || []) as Awaited<ReturnType<NewsRecordReader['bills']>>;
  },
  async divisions(ps) {
    const { data, error } = await supabase.from('commons_divisions_fts').select('division_date_only, division_number, division_title')
      .textSearch('search_vec', websearchOr(ps), { type: 'websearch', config: 'english' })
      .order('division_date_only', { ascending: false }).order('division_number', { ascending: false }).limit(FETCH_MAX);
    fail('divisions', error);
    const rows = (data || []) as { division_date_only: string; division_number: number; division_title: string | null }[];
    if (!rows.length) return [];
    const { data: totals, error: tErr } = await supabase.from('commons_division_totals').select('division_date, division_number, aye_count, no_count')
      .in('division_date', [...new Set(rows.map((r) => String(r.division_date_only).slice(0, 10)))])
      .in('division_number', [...new Set(rows.map((r) => r.division_number))]).limit(1000);
    fail('division totals', tErr);
    const byKey = new Map(((totals || []) as { division_date: string; division_number: number; aye_count: number | null; no_count: number | null }[])
      .map((t) => [`${String(t.division_date).slice(0, 10)}#${t.division_number}`, t]));
    return rows.map((r): DivisionRow => {
      const date = String(r.division_date_only).slice(0, 10);
      const t = byKey.get(`${date}#${r.division_number}`);
      return { date, number: r.division_number, title: r.division_title || `Division ${r.division_number}`, ayes: t?.aye_count ?? null, noes: t?.no_count ?? null };
    });
  },
};

// The box for one release, or null when a read fails (the page is shown without it, and stays noindex, follow).
export async function newsRecord(r: ReleaseInput): Promise<NewsRecord | null> {
  return optionalSection(`news record (news ${r.id})`, async () => {
    const refs = await loadRefs();
    return tagged(['news-record-v1', r.id, keyHash(r)], tableTags(...REF_TABLES, ...ITEM_TABLES), () => buildNewsRecord(r, refs, reader));
  }, null);
}

// The news sitemap (lib/sitemap/parts.ts 'news'; ENTRY 368 GO item 3): the slugs of recent releases whose page is
// indexable, by the page's own rule and the page's own cached box (same input, same cache key, so a release the page
// has already built costs no read). Only the most recent releases are judged, not all 46,819: the newest
// SITEMAP_NEWS_MAX published in the last SITEMAP_NEWS_DAYS days (about 350 in November 2026). An older release that
// qualifies is still indexable on its page; it is just not listed. Cost per rebuild (the part is kept a day, and built
// again when a press release, written question, debate, EDM, bill or division sync changes rows): one read of those
// releases (about 350 rows), then for each release whose box is not in the cache at most six indexed reads (about
// 0.1 to 0.3 s of database time each release by the sample's EXPLAIN figures), SITEMAP_NEWS_AT_ONCE at a time. A box
// that cannot be read leaves that release out.
export const SITEMAP_NEWS_DAYS = 30;
export const SITEMAP_NEWS_MAX = 400;
const SITEMAP_NEWS_AT_ONCE = 3;
// Time budget (T2, 20 Nov 2026): a cold build can take 35 to 105 s against the route's 120 s limit; stop judging at 90 s and
// list what is done, so the part never answers an error. The boxes already judged stay cached, so the next build goes further.
const SITEMAP_NEWS_BUDGET_MS = 90_000;
export const NEWS_SITEMAP_TAGS = tableTags('press_releases', ...REF_TABLES, ...ITEM_TABLES);

export async function indexableNewsSlugs(): Promise<string[]> {
  const since = new Date(Date.now() - SITEMAP_NEWS_DAYS * 86400_000).toISOString();
  const { data, error } = await supabase.from('press_releases')
    .select('id, title, description, organisation, body, news_slug')
    .not('news_slug', 'is', null).not('removed_upstream', 'is', true).gte('published_at', since)
    .order('published_at', { ascending: false }).order('id', { ascending: false }).limit(SITEMAP_NEWS_MAX);
  if (error) throw new Error(`news sitemap releases: ${error.message}`);
  const rows = (data || []) as (ReleaseInput & { news_slug: string })[];
  const out: string[] = [];
  const started = Date.now();
  for (let i = 0; i < rows.length; i += SITEMAP_NEWS_AT_ONCE) {
    if (Date.now() - started > SITEMAP_NEWS_BUDGET_MS) break;
    const batch = rows.slice(i, i + SITEMAP_NEWS_AT_ONCE);
    const records = await Promise.all(batch.map((r) => newsRecord({ id: r.id, title: r.title, organisation: r.organisation, body: r.body, description: r.description })));
    batch.forEach((r, j) => { if (newsRecordIndexable(records[j])) out.push(r.news_slug.toLowerCase()); });
  }
  return out;
}
