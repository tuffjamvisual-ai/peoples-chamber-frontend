// Reads for the constituency pages (owner, backlog item 15d, 6 Nov 2026), this Parliament only. The tables are loaded from the
// Commons Library's results and the Members API by scripts/load-constituencies.py; the current MP comes from mps, which the
// nightly syncs keep current. Names, parties and results are as published: see EXACT_COLUMNS in lib/no-em-dash.ts.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdminRead as db } from '@/lib/supabase-admin';

export type SeatListRow = { ons_code: string; slug: string; name: string; nation: string; region: string | null; last_change: string };

// All 650. last_change is the seat's latest election or change of MP, which dates the sitemap entry.
export const allConstituencies = unstable_cache(async (): Promise<SeatListRow[]> => {
  const [seats, terms, byes] = await Promise.all([
    db.from('constituencies').select('ons_code, slug, name, nation, region').order('name').limit(1000),
    db.from('constituency_mp_terms').select('ons_code, start_date, end_date').limit(2000),
    db.from('constituency_byelections').select('ons_code, election_date').limit(1000),
  ]);
  const err = seats.error ?? terms.error ?? byes.error;
  if (err) throw new Error(`constituencies list: ${err.message}`);
  const latest = new Map<string, string>();
  const see = (code: string, d: string | null) => { if (d && d > (latest.get(code) ?? '')) latest.set(code, d); };
  for (const t of (terms.data ?? []) as { ons_code: string; start_date: string; end_date: string | null }[]) { see(t.ons_code, t.start_date); see(t.ons_code, t.end_date); }
  for (const b of (byes.data ?? []) as { ons_code: string; election_date: string }[]) see(b.ons_code, b.election_date);
  return ((seats.data ?? []) as Omit<SeatListRow, 'last_change'>[]).map((s) => ({ ...s, last_change: latest.get(s.ons_code) ?? '2024-07-04' }));
}, ['constituencies-list'], { revalidate: 86400 });

export type CouncilLink = { code: string; name: string; slug: string };
export type Seat = SeatListRow & {
  electorate: number; valid_votes: number; invalid_votes: number; turnout_pct: number; majority: number; majority_pct: number;
  result_summary: string; result_url: string; councils: CouncilLink[]; county: CouncilLink | null;
};
export type Byelection = { election_id: number; election_date: string; electorate: number; valid_votes: number; invalid_votes: number; turnout_pct: number; majority: number; result_summary: string; url: string };
export type Candidate = { election_id: number; election_kind: string; position: number; given_name: string | null; family_name: string; party: string; adjunct_party: string | null; votes: number; share_pct: number };
export type MpTerm = { member_id: number; name: string; start_date: string; end_date: string | null; end_reason: string | null; has_page: boolean };
export type CurrentMp = { member_id: number; name: string; party: string | null; questions: number };

export async function getSeat(slug: string): Promise<Seat | null> {
  const { data, error } = await db.from('constituencies').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error(`constituency ${slug}: ${error.message}`);
  return data ? { ...(data as unknown as Seat), last_change: '' } : null;
}

export async function seatDetail(ons: string) {
  const [results, byes, terms, mp] = await Promise.all([
    db.from('constituency_election_results').select('election_id, election_kind, position, given_name, family_name, party, adjunct_party, votes, share_pct').eq('ons_code', ons).order('election_id').order('position').limit(500),
    db.from('constituency_byelections').select('election_id, election_date, electorate, valid_votes, invalid_votes, turnout_pct, majority, result_summary, url').eq('ons_code', ons).order('election_date').limit(50),
    db.from('constituency_mp_terms').select('member_id, name, start_date, end_date, end_reason').eq('ons_code', ons).order('start_date').limit(50),
    db.from('mps').select('member_id, display_name, name, party').eq('constituency_gss_code', ons).eq('current_member', true).maybeSingle(),
  ]);
  const err = results.error ?? byes.error ?? terms.error ?? mp.error;
  if (err) throw new Error(`constituency ${ons}: ${err.message}`);
  const termRows = (terms.data ?? []) as Omit<MpTerm, 'has_page'>[];
  // Only MPs with a profile get a link: Andrew Gwynne and Mike Amesbury have no row in mps.
  const { data: pages, error: pageErr } = await db.from('mps').select('member_id').in('member_id', termRows.map((t) => t.member_id));
  if (pageErr) throw new Error(`constituency ${ons} MPs: ${pageErr.message}`);
  const withPage = new Set(((pages ?? []) as { member_id: number }[]).map((p) => p.member_id));
  const row = mp.data as { member_id: number; display_name: string | null; name: string; party: string | null } | null;
  let current: CurrentMp | null = null;
  if (row) {
    const { count, error: qErr } = await db.from('parliament_written_questions').select('id', { count: 'exact', head: true }).eq('asking_member_id', row.member_id).eq('house', 'Commons');
    if (qErr) throw new Error(`constituency ${ons} questions: ${qErr.message}`);
    current = { member_id: row.member_id, name: row.display_name || row.name, party: row.party, questions: count ?? 0 };
  }
  return {
    candidates: (results.data ?? []) as Candidate[],
    byelections: (byes.data ?? []) as Byelection[],
    terms: termRows.map((t) => ({ ...t, has_page: withPage.has(t.member_id) })) as MpTerm[],
    current,
  };
}
