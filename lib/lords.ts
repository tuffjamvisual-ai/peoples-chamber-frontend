// Reads for the House of Lords pages (owner's yes, 3 Nov 2026): /lords, /lords/[id] and /lords/[id]/questions.
// Peers from the peers table (lib/peers.ts fills it); votes from lords_division_votes and lords_divisions (the Lords
// votes sync, from 4 September 2024); written questions from parliament_written_questions (lib/mp-written-questions.ts).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Post } from '@/lib/peers';

export type Peer = {
  member_id: number; name_display: string; name_list_as: string | null; name_full_title: string | null;
  party: string | null; party_colour: string | null; peerage_type: string | null; start_date: string | null; end_date: string | null;
  end_reason: string | null; status: string | null; is_current: boolean; thumbnail_url: string | null;
  government_posts: Post[] | null; opposition_posts: Post[] | null; other_posts: Post[] | null; committee_memberships: Post[] | null;
  posts_checked_at: string | null;
};
export type PeerListRow = Pick<Peer, 'member_id' | 'name_display' | 'name_list_as' | 'party' | 'party_colour' | 'peerage_type' | 'start_date' | 'status'>;
export type LordsVote = { division_id: number; vote: string; division_date: string | null; title: string | null; bill_id: number | null; is_government_win: boolean | null };
export type LordsVoting = { divisions: number; voted: number; content: number; notContent: number; firstDivision: string | null; recent: LordsVote[] };

export const lordsDivisionUrl = (id: number) => `https://votes.parliament.uk/Votes/Lords/Division/${id}`;

export async function getPeer(db: SupabaseClient, memberId: number): Promise<Peer | null> {
  const { data, error } = await db.from('peers')
    .select('member_id, name_display, name_list_as, name_full_title, party, party_colour, peerage_type, start_date, end_date, end_reason, status, is_current, thumbnail_url, government_posts, opposition_posts, other_posts, committee_memberships, posts_checked_at')
    .eq('member_id', memberId).maybeSingle();
  if (error) throw new Error(`peer ${memberId}: ${error.message}`);
  return (data as Peer | null) ?? null;
}

// Every current peer (816 on 3 Nov 2026), in Parliament's list order (surname or title).
export async function currentPeers(db: SupabaseClient): Promise<PeerListRow[]> {
  const { data, error } = await db.from('peers')
    .select('member_id, name_display, name_list_as, party, party_colour, peerage_type, start_date, status')
    .eq('is_current', true).order('name_list_as', { ascending: true }).order('member_id', { ascending: true }).range(0, 1999);
  if (error) throw new Error(`current peers: ${error.message}`);
  return (data ?? []) as PeerListRow[];
}

// Votes since the first stored division (a peer votes in at most every division, 446 on 3 Nov 2026, so one read).
export async function peerVoting(db: SupabaseClient, memberId: number, recentCount = 10): Promise<LordsVoting> {
  const [votesRes, divCountRes, firstRes] = await Promise.all([
    db.from('lords_division_votes').select('division_id, vote').eq('member_id', memberId).range(0, 1999),
    db.from('lords_divisions').select('division_id', { count: 'exact', head: true }),
    db.from('lords_divisions').select('division_date').order('division_date', { ascending: true }).limit(1),
  ]);
  if (votesRes.error) throw new Error(`peer votes: ${votesRes.error.message}`);
  if (divCountRes.error) throw new Error(`lords divisions count: ${divCountRes.error.message || divCountRes.status}`);
  const votes = (votesRes.data ?? []) as Array<{ division_id: number; vote: string }>;
  const byDivision = new Map(votes.map((v) => [v.division_id, v.vote]));
  let recent: LordsVote[] = [];
  if (votes.length) {
    const { data, error } = await db.from('lords_divisions').select('division_id, division_date, title, bill_id, is_government_win')
      .in('division_id', [...byDivision.keys()]).order('division_date', { ascending: false }).order('division_id', { ascending: false }).limit(recentCount);
    if (error) throw new Error(`peer recent divisions: ${error.message}`);
    recent = ((data ?? []) as Array<Omit<LordsVote, 'vote'>>).map((d) => ({ ...d, vote: byDivision.get(d.division_id) ?? '' }));
  }
  return {
    divisions: divCountRes.count ?? 0,
    voted: votes.length,
    content: votes.filter((v) => v.vote === 'content').length,
    notContent: votes.filter((v) => v.vote === 'not_content').length,
    firstDivision: (firstRes.data?.[0] as { division_date?: string } | undefined)?.division_date ?? null,
    recent,
  };
}
