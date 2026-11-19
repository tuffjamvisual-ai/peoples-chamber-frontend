// Reads for the House of Lords pages (owner's yes, 3 Nov 2026): /lords, /lords/[id] and /lords/[id]/questions.
// Peers from the peers table (lib/peers.ts fills it); votes from lords_division_votes and lords_divisions (the Lords
// votes sync, from 4 September 2024); written questions from parliament_written_questions (lib/mp-written-questions.ts).
import type { SupabaseClient } from '@supabase/supabase-js';
import { PAGES_FROM, type Post } from '@/lib/peers';
import { tagged } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { cachedQuery } from '@/lib/tagged-read';

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

export type PeerInterest = {
  interest_id: number; category_id: number; category_name: string; category_sort_order: number | null; interest_text: string;
  child_interests: { id?: number; interest?: string | null }[] | null;
};
export type PeerInterestCategory = { id: number; name: string; entries: PeerInterest[] };

export const lordsDivisionUrl = (id: number) => `https://votes.parliament.uk/Votes/Lords/Division/${id}`;

async function getPeerRead(db: SupabaseClient, memberId: number): Promise<Peer | null> {
  const { data, error } = await cachedQuery(['q:lib/lords.ts:6f1557ff2e', JSON.stringify([memberId])], tableTags('peers'), () => db.from('peers')
    .select('member_id, name_display, name_list_as, name_full_title, party, party_colour, peerage_type, start_date, end_date, end_reason, status, is_current, thumbnail_url, government_posts, opposition_posts, other_posts, committee_memberships, posts_checked_at')
    .eq('member_id', memberId).maybeSingle());
  if (error) throw new Error(`peer ${memberId}: ${error.message}`);
  return (data as Peer | null) ?? null;
}

// A peer's entries on the register of interests now (peer_registered_interests, scripts/sync-peer-interests.js), grouped
// by category in the register's order.
export async function peerInterests(db: SupabaseClient, memberId: number): Promise<PeerInterestCategory[]> {
  const { data, error } = await cachedQuery(['q:lib/lords.ts:7f6493a285', JSON.stringify([memberId])], tableTags('peer_registered_interests'), () => db.from('peer_registered_interests')
    .select('interest_id, category_id, category_name, category_sort_order, interest_text, child_interests')
    .eq('member_id', memberId).eq('is_current', true)
    .order('category_sort_order', { ascending: true }).order('interest_id', { ascending: true }).range(0, 1999));
  if (error) throw new Error(`peer interests: ${error.message}`);
  const groups = new Map<number, PeerInterestCategory>();
  for (const row of (data ?? []) as PeerInterest[]) {
    const group = groups.get(row.category_id) ?? { id: row.category_id, name: row.category_name, entries: [] };
    group.entries.push(row);
    groups.set(row.category_id, group);
  }
  return [...groups.values()];
}

// Every current peer (816 on 3 Nov 2026), in Parliament's list order (surname or title).
export async function currentPeers(db: SupabaseClient): Promise<PeerListRow[]> {
  const { data, error } = await cachedQuery(['q:lib/lords.ts:69d3e624db'], tableTags('peers'), () => db.from('peers')
    .select('member_id, name_display, name_list_as, party, party_colour, peerage_type, start_date, status')
    .eq('is_current', true).order('name_list_as', { ascending: true }).order('member_id', { ascending: true }).range(0, 1999));
  if (error) throw new Error(`current peers: ${error.message}`);
  return (data ?? []) as PeerListRow[];
}

// Every former member with a page (left on or after 4 July 2024, lib/peers.ts peerHasPage), for the fold on /lords
// (Cowork ENTRY 367 item 6), in Parliament's list order (surname or title), as the current members.
export type FormerPeerRow = Pick<Peer, 'member_id' | 'name_display' | 'name_list_as' | 'party' | 'end_date'>;
export async function formerPeersWithPages(db: SupabaseClient): Promise<FormerPeerRow[]> {
  const { data, error } = await cachedQuery(['q:lib/lords.ts:former-with-pages', PAGES_FROM], tableTags('peers'), () => db.from('peers')
    .select('member_id, name_display, name_list_as, party, end_date')
    .eq('is_current', false).gte('end_date', PAGES_FROM)
    .order('name_list_as', { ascending: true }).order('member_id', { ascending: true }).range(0, 1999));
  if (error) throw new Error(`former peers: ${error.message}`);
  return (data ?? []) as FormerPeerRow[];
}

// Cowork ENTRY 367 item 6: whether a member's page shows any vote, written question or current register entry, as cached
// head counts (no rows read) in the order most members have one, stopping at the first found. With the posts and
// committees on the peer's own row, this is lib/index-rules.ts peerNoActivity for the page's metadata.
export async function peerActivityCounts(db: SupabaseClient, memberId: number): Promise<{ votes: number; questions: number; interests: number }> {
  // Each read sits inside its own cachedQuery call, so the A16 check can see it is cached under its table's tag.
  const count = (table: string, r: { count?: number | null; error: { message: string } | null }) => {
    if (r.error) throw new Error(`peer ${memberId} ${table} count: ${r.error.message}`);
    return r.count ?? 0;
  };
  const key = JSON.stringify([memberId]);
  const votes = count('lords_division_votes', await cachedQuery(['q:lib/lords.ts:activity-votes', key], tableTags('lords_division_votes'), () => db.from('lords_division_votes').select('division_id', { count: 'exact', head: true }).eq('member_id', memberId)));
  if (votes) return { votes, questions: 0, interests: 0 };
  const interests = count('peer_registered_interests', await cachedQuery(['q:lib/lords.ts:activity-interests', key], tableTags('peer_registered_interests'), () => db.from('peer_registered_interests').select('interest_id', { count: 'exact', head: true }).eq('member_id', memberId).eq('is_current', true)));
  if (interests) return { votes, questions: 0, interests };
  const questions = count('parliament_written_questions', await cachedQuery(['q:lib/lords.ts:activity-questions', key], tableTags('parliament_written_questions'), () => db.from('parliament_written_questions').select('id', { count: 'exact', head: true }).eq('asking_member_id', memberId).eq('house', 'Lords')));
  return { votes, questions, interests };
}

// Votes since the first stored division (a peer votes in at most every division, 446 on 3 Nov 2026, so one read).
export async function peerVoting(db: SupabaseClient, memberId: number, recentCount = 10): Promise<LordsVoting> {
  const [votesRes, divCountRes, firstRes] = await Promise.all([
    cachedQuery(['q:lib/lords.ts:3d2a3624e1', JSON.stringify([memberId])], tableTags('lords_division_votes'), () => db.from('lords_division_votes').select('division_id, vote').eq('member_id', memberId).range(0, 1999)),
    cachedQuery(['q:lib/lords.ts:25dc7cb381'], tableTags('lords_divisions'), () => db.from('lords_divisions').select('division_id', { count: 'exact', head: true })),
    cachedQuery(['q:lib/lords.ts:689cfb88f2'], tableTags('lords_divisions'), () => db.from('lords_divisions').select('division_date').order('division_date', { ascending: true }).limit(1)),
  ]);
  if (votesRes.error) throw new Error(`peer votes: ${votesRes.error.message}`);
  if (divCountRes.error) throw new Error(`lords divisions count: ${divCountRes.error.message}`);
  const votes = (votesRes.data ?? []) as Array<{ division_id: number; vote: string }>;
  const byDivision = new Map(votes.map((v) => [v.division_id, v.vote]));
  let recent: LordsVote[] = [];
  if (votes.length) {
    // The key holds the member and the divisions they voted in (19 Nov 2026): with only recentCount, every peer shared one
    // cached list of recent divisions (found by T1's helper, ENTRY 367); the ids also make a new vote a new key.
    const { data, error } = await cachedQuery(['q:lib/lords.ts:c764fb30b8', JSON.stringify([memberId, recentCount, [...byDivision.keys()].sort((a, b) => a - b)])], tableTags('lords_divisions'), () => db.from('lords_divisions').select('division_id, division_date, title, bill_id, is_government_win')
      .in('division_id', [...byDivision.keys()]).order('division_date', { ascending: false }).order('division_id', { ascending: false }).limit(recentCount));
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

// A16 (owner rule 15 Nov 2026, COWORK-TO-T1 ENTRY 129): kept in the shared data cache under its tags, no timer.
export const getPeer = (db: Parameters<typeof getPeerRead>[0], memberId: number) =>
  tagged(['peer-v1', memberId], tableTags('peers'), () => getPeerRead(db, memberId));
