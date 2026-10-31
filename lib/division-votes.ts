// One Commons division's votes, totals, party split and rebels (owner, 31 Oct 2026). Moved here from
// app/divisions/[slug]/page.tsx so the division page and the debate pages (/debates/[guid], "The vote") use one
// calculation, never two that could differ. The division page's own behaviour is unchanged.
import { supabase } from '@/lib/supabase';
import { normaliseParty, partyColourForMember } from '@/lib/party-helpers';

export type VoteRow = {
  member_id: number;
  vote_type: 'aye' | 'no' | 'both' | string;
  is_teller: boolean | null;
  is_rebellion: boolean | null;
  bill_id: number | null;
  division_title: string | null;
  division_date: string;
  division_id: number | null;
};

export type MpRow = {
  member_id: number;
  display_name: string | null;
  name: string | null;
  party: string | null;
  party_colour: string | null;
  constituency: string | null;
  photo_url: string | null;
};

export type Vote = VoteRow & { mp: MpRow | null };
export type Totals = { aye_count: number; no_count: number; aye_tellers: string[]; no_tellers: string[] } | null;
export type PartyGroup = { party: string; partyColour: string; rows: Vote[] };

// The vote rows of one division (natural key index), Parliament's official totals (division_id) and the MPs who voted
// (one batch by member_id). Returns null when the division has no vote rows (the division page's 404).
export async function fetchDivisionVotes(dateOnly: string, divisionNumber: number, label: string): Promise<{ voteRows: VoteRow[]; votes: Vote[]; totals: Totals } | null> {
  const { data: voteRows, error: voteErr } = await supabase
    .from('mp_division_votes')
    .select('member_id, vote_type, is_teller, is_rebellion, bill_id, division_title, division_date, division_id')
    .eq('division_date_only', dateOnly)
    .eq('division_number', divisionNumber);
  if (voteErr) throw new Error(`division ${label}: ${voteErr.message}`);
  if (!voteRows || voteRows.length === 0) return null;

  // Official totals from Parliament (tellers not included). The vote rows include the tellers
  // and can miss a voter Parliament's list does not name, so they are only a fallback.
  const { data: totalsRow, error: totalsRowErr } = await supabase
    .from('commons_division_totals')
    .select('aye_count, no_count, aye_tellers, no_tellers')
    .eq('division_id', (voteRows[0] as { division_id: number }).division_id)
    .maybeSingle();
  if (totalsRowErr && totalsRowErr.code !== 'PGRST116') throw new Error(`${label} commons_division_totals: ${totalsRowErr.message}`);

  // MP lookup — single batch on the distinct member_ids.
  const memberIds = Array.from(new Set(voteRows.map((v) => v.member_id)));
  const { data: mpRows, error: mpRowsErr } = await supabase
    .from('mps')
    .select('member_id, display_name, name, party, party_colour, constituency, photo_url')
    .in('member_id', memberIds);
  if (mpRowsErr && mpRowsErr.code !== 'PGRST116') throw new Error(`${label} mps: ${mpRowsErr.message}`);
  const mpById = new Map<number, MpRow>((mpRows ?? []).map((m) => [m.member_id, m as MpRow]));

  return { voteRows: voteRows as VoteRow[], votes: (voteRows as VoteRow[]).map((v) => ({ ...v, mp: mpById.get(v.member_id) ?? null })), totals: totalsRow as Totals };
}

// Party ordering: largest delegation in THIS division first.
export function groupByParty(rows: Vote[]): PartyGroup[] {
  const groups = new Map<string, Vote[]>();
  for (const v of rows) {
    const p = normaliseParty(v.mp?.party) || v.mp?.party || 'Unknown';
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p)!.push(v);
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([party, rs]) => ({
      party,
      partyColour: partyColourForMember(rs[0].mp?.party ?? null, rs[0].mp?.party_colour ?? null),
      rows: rs.sort((x, y) => (x.mp?.display_name || x.mp?.name || '').localeCompare(y.mp?.display_name || y.mp?.name || '')),
    }));
}

// The figures the division page shows: totals (official, else counted without tellers), the lists by vote, the party
// groups, and the MPs flagged as voting against their party (is_rebellion, as the page marks them "REBEL").
export function divisionTally(votes: Vote[], totals: Totals) {
  const ayes = votes.filter((v) => v.vote_type === 'aye');
  const noes = votes.filter((v) => v.vote_type === 'no');
  const boths = votes.filter((v) => v.vote_type === 'both');
  const tellers = votes.filter((v) => v.is_teller);
  const ayeTotal = totals ? totals.aye_count : ayes.filter((v) => !v.is_teller).length;
  const noTotal = totals ? totals.no_count : noes.filter((v) => !v.is_teller).length;
  const ayeNamed = ayes.filter((v) => !v.is_teller).length;
  const noNamed = noes.filter((v) => !v.is_teller).length;
  const ayeGroups = groupByParty(ayes);
  const noeGroups = groupByParty(noes);
  const rebels = [...ayes, ...noes].filter((v) => v.is_rebellion);
  return { ayes, noes, boths, tellers, ayeTotal, noTotal, ayeNamed, noNamed, ayeGroups, noeGroups, rebels };
}
