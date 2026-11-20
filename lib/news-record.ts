// "What the record shows" on /news/<slug> (Cowork ENTRY 368, owner approved 19 Nov 2026): the page's reads. SAMPLE ONLY:
// nothing is read or shown unless NEWS_RECORD_BOX=1 is set, which no deployed environment sets, so production is
// unchanged if this is pushed. The matching and the sentences are in lib/news-record-core.ts (shared with the sample
// script, scripts/news-record/sample-368.ts).
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
  buildNewsRecord, websearchOr, containsPattern, billPatterns, FETCH_MAX, LIST_MAX,
  type NewsRecord, type NewsRecordReader, type Refs, type ReleaseInput, type CouncilRef, type SeatRef, type MpRef, type OrgRef, type DivisionRow,
} from '@/lib/news-record-core';

export const newsRecordEnabled = () => process.env.NEWS_RECORD_BOX === '1';

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

// The box for one release, or null when the flag is off or a read fails (the page is shown without it).
export async function newsRecord(r: ReleaseInput): Promise<NewsRecord | null> {
  if (!newsRecordEnabled()) return null;
  return optionalSection(`news record (news ${r.id})`, async () => {
    const refs = await loadRefs();
    return tagged(['news-record-v1', r.id, keyHash(r)], tableTags(...REF_TABLES, ...ITEM_TABLES), () => buildNewsRecord(r, refs, reader));
  }, null);
}
