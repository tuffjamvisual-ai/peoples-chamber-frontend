// Change detection for the nightly career sync (SY2, owner, 9 Nov 2026: "all we should be doing is checking if there are
// any changes"). Pure: no network or database here, so it is unit tested (scripts/checks/career-sync-changes.test.ts).
//
// scripts/sync-career-parliament.ts reads a few dozen cheap lists from Parliament (every government and opposition post
// with its current holders, department by department; the current Commons members with party and seat; the bills updated
// since the last successful run) and compares them with what is stored in mp_biography.career_parliament. Only an MP whose
// post, party, seat or membership changed, who is new, or whose last full fetch is more than 30 days old (a safety net, at
// most 25 a night, oldest first) gets the full Members API biography again. A bill updated since the cursor is rebuilt from
// its list record in the records of the MPs who sponsor it.
import type { CareerEntry } from '../lib/career-timeline';

export type PostKind = 'Government post' | 'Opposition post';
// What Parliament's cheap lists say about one current MP.
export type LiveMember = { party: string | null; seat: string | null };
export type LiveState = {
  members: Map<number, LiveMember>;   // current Commons members (Members API search, House=1, IsCurrentMember=true)
  posts: Map<number, Set<string>>;    // member id -> "Government post|<name>" / "Opposition post|<name>" held now
};
// What the stored record says.
export type StoredState = { posts: Set<string>; party: string | null; seat: string | null };

export const SAFETY_DAYS = 30;
export const SAFETY_MAX = 25;

export const postKey = (kind: PostKind, name: string) => `${kind}|${name.trim()}`;
const norm = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
// The members list names a Labour and Co-operative MP's party "Labour (Co-op)"; their biography, and so the stored record,
// says "Labour". The same party, not a change.
const partyNorm = (s: string | null | undefined) => norm(s).replace(/ \(co-op\)$/, '');

// The posts, party and seat a stored career_parliament holds now (entries that end "present").
export function storedState(entries: CareerEntry[] | null | undefined): StoredState {
  const posts = new Set<string>();
  let party: string | null = null, seat: string | null = null;
  for (const e of entries ?? []) {
    if (e.end !== 'present') continue;
    if (e.group === 'posts' && (e.detail === 'Government post' || e.detail === 'Opposition post')) posts.add(postKey(e.detail, e.title));
    else if (e.group === 'elections' && e.title.startsWith('Party: ') && e.organisation !== 'House of Lords') party = e.title.slice('Party: '.length);
    else if (e.group === 'elections' && e.title.startsWith('MP for ')) seat = e.title.slice('MP for '.length);
  }
  return { posts, party, seat };
}

// Why each MP needs the full biography again; an MP not in the map needs nothing. ids: the MPs this run covers.
// fullAt: when each MP's record was last built from the full biography (ISO), from sync_cursor.
export function membersToRefresh(
  ids: number[],
  stored: Map<number, CareerEntry[] | null>,
  live: LiveState,
  fullAt: Record<string, string>,
  now: Date,
  safetyMax = SAFETY_MAX,
): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const add = (id: number, why: string) => { const r = out.get(id) ?? []; r.push(why); out.set(id, r); };
  for (const id of ids) {
    const entries = stored.get(id);
    if (!entries || !entries.length) { add(id, 'new: no stored record'); continue; }
    const s = storedState(entries);
    const m = live.members.get(id);
    if (!m) { if (s.seat) add(id, `membership: no longer a current Commons member (stored seat ${s.seat})`); continue; }
    if (m.seat && norm(m.seat) !== norm(s.seat)) add(id, `seat: ${s.seat ?? 'none'} to ${m.seat}`);
    if (m.party && partyNorm(m.party) !== partyNorm(s.party)) add(id, `party: ${s.party ?? 'none'} to ${m.party}`);
    const nowPosts = live.posts.get(id) ?? new Set<string>();
    for (const p of nowPosts) if (!s.posts.has(p)) add(id, `gained post: ${p.replace('|', ': ')}`);
    for (const p of s.posts) if (!nowPosts.has(p)) add(id, `lost post: ${p.replace('|', ': ')}`);
  }
  // Safety net: the records fetched in full longest ago (or never), more than 30 days, oldest first, at most safetyMax.
  const cutoff = now.getTime() - SAFETY_DAYS * 86400000;
  const stale = ids
    .filter((id) => !out.has(id))
    .map((id) => ({ id, at: fullAt[String(id)] ?? '' }))
    .filter((x) => !x.at || Date.parse(x.at) < cutoff)
    .sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id)
    .slice(0, safetyMax);
  for (const x of stale) add(x.id, x.at ? `safety net: last full fetch ${x.at.slice(0, 10)}, over ${SAFETY_DAYS} days` : 'safety net: no full fetch recorded');
  return out;
}

// The bills updated after the cursor, from Bills?SortOrder=DateUpdatedDescending pages read newest first. Returns the bills
// to rebuild and whether paging can stop (the page reached a bill updated at or before the cursor).
export type ListedBill = { billId: number; lastUpdate: string };
export function billsSince<T extends ListedBill>(page: T[], since: string): { changed: T[]; done: boolean } {
  const s = Date.parse(since);
  const changed = page.filter((b) => Date.parse(b.lastUpdate) > s);
  return { changed, done: changed.length < page.length || page.length === 0 };
}

// Which stored records already hold each bill (by its Parliament URL), so a known bill needs no extra request.
export const billUrl = (billId: number) => `https://bills.parliament.uk/bills/${billId}`;
export function billHolders(stored: Map<number, CareerEntry[] | null>): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (const [id, entries] of stored) for (const e of entries ?? []) {
    if (e.group !== 'bills') continue;
    const m = /\/bills\/(\d+)$/.exec(e.source.url);
    if (!m) continue;
    const b = Number(m[1]);
    out.set(b, [...(out.get(b) ?? []), id]);
  }
  return out;
}

// One MP's record with the given bills replaced (or added at the end when new to the record); every other entry unchanged.
export function withBills(entries: CareerEntry[], bills: Map<number, CareerEntry>): CareerEntry[] {
  const seen = new Set<number>();
  const out = entries.map((e) => {
    if (e.group !== 'bills') return e;
    const m = /\/bills\/(\d+)$/.exec(e.source.url);
    const b = m ? Number(m[1]) : NaN;
    if (!bills.has(b)) return e;
    seen.add(b);
    return bills.get(b)!;
  });
  for (const [b, e] of bills) if (!seen.has(b)) out.push(e);
  return out;
}
