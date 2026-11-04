// Members of the House of Lords (owner's yes, 3 Nov 2026): the peers table (migration 2026-11-04a) from Parliament's
// Members API, shared by the first load (scripts/load-peers.ts) and the sync (/api/sync-peers), so both store exactly
// the same row. The list (name, party, peerage type, dates, status, thumbnail) comes from Members/Search, 20 a page;
// posts and committees from each peer's Biography. One request at a time, at least 1 s apart (politeFetch).
import type { SupabaseClient } from '@supabase/supabase-js';
import { politeFetch, sleep, type SyncBudget } from '@/lib/sync-budget';

const API = 'https://members-api.parliament.uk/api/Members';
const UA = { 'User-Agent': 'opengovt.uk peers (https://www.opengovt.uk; contact@opengovt.uk)', Accept: 'application/json' };
const GAP_MS = 1000;
const TAKE = 20; // the most Members/Search returns a page

// Pages (/lords/[id]) exist for current peers and anyone who has sat since the 4 July 2024 general election; earlier
// former peers link to their Parliament profile (owner, 3 Nov 2026).
export const PAGES_FROM = '2024-07-04';
export const peerHasPage = (p: { is_current: boolean; end_date: string | null }) => p.is_current || (!!p.end_date && p.end_date >= PAGES_FROM);
export const parliamentProfileUrl = (id: number) => `https://members.parliament.uk/member/${id}/career`;
export const parliamentRegisterUrl = (id: number) => `https://members.parliament.uk/member/${id}/registeredinterests`;

type ApiMember = {
  id: number; nameListAs?: string; nameDisplayAs?: string; nameFullTitle?: string; gender?: string; thumbnailUrl?: string;
  latestParty?: { id?: number; name?: string; backgroundColour?: string } | null;
  latestHouseMembership?: {
    house?: number; membershipFrom?: string; membershipFromId?: number; membershipStartDate?: string | null; membershipEndDate?: string | null;
    membershipEndReason?: string | null; membershipStatus?: { statusDescription?: string | null } | null;
  } | null;
};
export type Post = { name: string; startDate: string | null; endDate: string | null; additionalInfo?: string | null };
export type PeerRow = {
  member_id: number; name_display: string; name_list_as: string | null; name_full_title: string | null; gender: string | null;
  party: string | null; party_id: number | null; party_colour: string | null; peerage_type: string | null; peerage_type_id: number | null;
  start_date: string | null; end_date: string | null; end_reason: string | null; status: string | null; is_current: boolean;
  thumbnail_url: string | null; synced_at: string;
};
export type PostsRow = {
  member_id: number; government_posts: Post[]; opposition_posts: Post[]; other_posts: Post[]; committee_memberships: Post[]; posts_checked_at: string;
};

const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);

export function mapPeer(m: ApiMember, now = new Date().toISOString()): PeerRow | null {
  const h = m.latestHouseMembership;
  if (!m.id || !h || h.house !== 2) return null;
  const end = day(h.membershipEndDate);
  return {
    member_id: m.id,
    name_display: (m.nameDisplayAs || m.nameFullTitle || m.nameListAs || `Member ${m.id}`).trim(),
    name_list_as: m.nameListAs?.trim() || null,
    name_full_title: m.nameFullTitle?.trim() || null,
    gender: m.gender || null,
    party: m.latestParty?.name || null,
    party_id: m.latestParty?.id ?? null,
    party_colour: m.latestParty?.backgroundColour || null,
    peerage_type: h.membershipFrom || null,
    peerage_type_id: h.membershipFromId ?? null,
    start_date: day(h.membershipStartDate),
    end_date: end,
    end_reason: h.membershipEndReason || null,
    status: h.membershipStatus?.statusDescription || (end ? 'Former member' : null),
    is_current: !end,
    thumbnail_url: m.thumbnailUrl || null,
    synced_at: now,
  };
}

async function getJson<T>(url: string, budget?: SyncBudget): Promise<T> {
  await sleep(GAP_MS);
  const res = await politeFetch(url, { headers: UA, cache: 'no-store' }, { budget });
  if (!res.ok) throw new Error(`Members API HTTP ${res.status} for ${url.replace(API, '')}`);
  return res.json() as Promise<T>;
}

// Every peer, current (IsCurrentMember=true) or former (false), page by page. The API's order is not stable from one
// page to the next, so a pass can miss a few members; up to three passes are combined until every id the API counts has
// been read. Throws if one is still missing, so a partial list is never saved as complete.
export async function fetchPeerList(current: boolean, budget?: SyncBudget): Promise<PeerRow[]> {
  const { rows, seen, total } = await readPeerList(current, budget);
  if (seen.size !== total) throw new Error(`peer list (${current ? 'current' : 'former'}): read ${seen.size} of ${total} after three passes`);
  return rows;
}

// The same, without the completeness check: the first load (scripts/load-peers.ts) fills any id the search never
// returns by reading it on its own.
export async function readPeerList(current: boolean, budget?: SyncBudget): Promise<{ rows: PeerRow[]; seen: Set<number>; total: number }> {
  const rows = new Map<number, PeerRow>();
  const seen = new Set<number>(); // every id read, including a former peer whose latest membership is the Commons (not stored)
  let total = Infinity;
  for (let pass = 1; pass <= 3 && seen.size < total; pass++) {
    for (let skip = 0; skip < total; skip += TAKE) {
      const page = await getJson<{ totalResults: number; items: { value: ApiMember }[] }>(`${API}/Search?House=2&IsCurrentMember=${current}&skip=${skip}&take=${TAKE}`, budget);
      total = page.totalResults;
      for (const it of page.items ?? []) {
        if (!it.value?.id) continue;
        seen.add(it.value.id);
        const r = mapPeer(it.value);
        if (r) rows.set(r.member_id, r);
      }
      if (!page.items?.length) break;
    }
  }
  return { rows: [...rows.values()], seen, total };
}

// One peer by id: used for a peer no longer in the current list, to record their end date and reason.
export async function fetchPeer(memberId: number, budget?: SyncBudget): Promise<PeerRow | null> {
  const j = await getJson<{ value: ApiMember }>(`${API}/${memberId}`, budget);
  return j.value ? mapPeer(j.value) : null;
}

type ApiPost = { name?: string; startDate?: string | null; endDate?: string | null; additionalInfo?: string | null };
const posts = (v: ApiPost[] | null | undefined): Post[] =>
  (v ?? []).filter((p) => p.name).map((p) => ({ name: p.name!.trim(), startDate: day(p.startDate), endDate: day(p.endDate), additionalInfo: p.additionalInfo?.trim() || null }))
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

export async function fetchPosts(memberId: number, budget?: SyncBudget): Promise<PostsRow> {
  const b = (await getJson<{ value: { governmentPosts?: ApiPost[]; oppositionPosts?: ApiPost[]; otherPosts?: ApiPost[]; committeeMemberships?: ApiPost[] } }>(`${API}/${memberId}/Biography`, budget)).value ?? {};
  return {
    member_id: memberId,
    government_posts: posts(b.governmentPosts),
    opposition_posts: posts(b.oppositionPosts),
    other_posts: posts(b.otherPosts),
    committee_memberships: posts(b.committeeMemberships),
    posts_checked_at: new Date().toISOString(),
  };
}

// Writes list rows in batches of 200 (upsert on member_id; the posts columns are not in a list row, so they are kept).
export async function saveList(db: SupabaseClient, rows: PeerRow[]): Promise<number> {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('peers').upsert(rows.slice(i, i + 200), { onConflict: 'member_id' });
    if (error) throw new Error(`peers list save: ${error.message}`);
  }
  return rows.length;
}

export async function savePosts(db: SupabaseClient, row: PostsRow): Promise<void> {
  const { member_id, ...cols } = row;
  const { error } = await db.from('peers').update(cols).eq('member_id', member_id);
  if (error) throw new Error(`peers posts save ${member_id}: ${error.message}`);
}
