// True dates for sitemap pages that had none (Cowork ENTRY 531 item 1, owner approved 23 Nov 2026). The rule of the
// whole sitemap: a date the page's own content carries, or none; never today, a build day, or a sync or fetch time.
//   donors            the newest date the Electoral Commission published one of the donor's donations (published_date);
//                     a donor with none published: the newest reported_date, then the newest accepted_date
//   party /money      the same, over the donations the party received (recipient_name)
//   Lords members     the peer's most recent Lords vote (the MP pages' rule); votes held from 4 Sep 2024
// Both are read once a day into the data cache (no reads per page): donations by keyset paging (about 94 reads of 1,000
// rows, as the donor registry already does), Lords votes in groups of whole divisions, newest first (about 150 reads).
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { readAllById } from '@/lib/read-all';
import { DONATIONS_TAG } from '@/lib/page-reads';

const DAY = 86400;
const day = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const later = (a: string | null | undefined, b: string | null) => (b && (!a || b > a) ? b : a ?? null);

type Newest = { pub: string | null; rep: string | null; acc: string | null };
const pick = (n: Newest | undefined) => (n ? n.pub ?? n.rep ?? n.acc : null);

// [name, date] lists, so they survive the data cache's JSON.
async function readDonationDates(): Promise<{ donors: [string, string][]; recipients: [string, string][] }> {
  const rows = await readAllById<{ id: number; donor_name: string | null; recipient_name: string | null; published_date: string | null; reported_date: string | null; accepted_date: string | null }>(
    () => supabase.from('political_donations'),
    { columns: 'id, donor_name, recipient_name, published_date, reported_date, accepted_date', label: 'sitemap donation dates' },
  );
  const donors = new Map<string, Newest>();
  const recipients = new Map<string, Newest>();
  const add = (m: Map<string, Newest>, key: string | null, r: (typeof rows)[number]) => {
    if (!key || !key.trim()) return;
    const n = m.get(key) ?? { pub: null, rep: null, acc: null };
    n.pub = later(n.pub, day(r.published_date));
    n.rep = later(n.rep, day(r.reported_date));
    n.acc = later(n.acc, day(r.accepted_date));
    m.set(key, n);
  };
  for (const r of rows) { add(donors, r.donor_name, r); add(recipients, r.recipient_name, r); }
  const out = (m: Map<string, Newest>) => [...m].map(([k, n]) => [k, pick(n)] as [string, string | null]).filter((x): x is [string, string] => !!x[1]);
  return { donors: out(donors), recipients: out(recipients) };
}

const donationDatesShared = unstable_cache(readDonationDates, ['sitemap-donation-dates-v1'], { tags: ['sitemap', DONATIONS_TAG], revalidate: DAY });

export async function donationDates(): Promise<{ donor: (names: string[]) => string | null; recipient: (name: string | null | undefined) => string | null }> {
  const { donors, recipients } = await donationDatesShared();
  const d = new Map(donors), r = new Map(recipients);
  return {
    // A donor page groups several spellings: the newest of their dates.
    donor: (names) => names.map((n) => d.get(n) ?? null).reduce<string | null>((a, b) => later(a, b), null),
    recipient: (name) => (name ? r.get(name) ?? null : null),
  };
}

// Each peer's most recent vote: divisions newest first, read in groups whose votes fit one read (at most 1,000 rows),
// so a peer's first appearance is their latest vote.
async function readPeerLastVotes(): Promise<[number, string][]> {
  const { data, error } = await supabase.from('lords_divisions').select('division_id, division_date, content_count, not_content_count')
    .order('division_date', { ascending: false }).order('division_id', { ascending: false }).limit(5000);
  if (error) throw new Error(`sitemap lords divisions: ${error.message}`);
  const divisions = (data ?? []) as { division_id: number; division_date: string | null; content_count: number | null; not_content_count: number | null }[];
  const dateOf = new Map(divisions.map((x) => [x.division_id, day(x.division_date)]));
  const last = new Map<number, string>();
  let group: number[] = [], size = 0;
  const flush = async () => {
    if (!group.length) return;
    const { data: votes, error: e } = await supabase.from('lords_division_votes').select('division_id, member_id').in('division_id', group).limit(1000);
    if (e) throw new Error(`sitemap lords votes: ${e.message}`);
    const rows = (votes ?? []) as { division_id: number; member_id: number }[];
    if (rows.length >= 1000) throw new Error('sitemap lords votes: a group reached the 1,000 row limit');
    for (const v of rows) {
      const dt = dateOf.get(v.division_id);
      if (dt && (!last.has(v.member_id) || dt > (last.get(v.member_id) as string))) last.set(v.member_id, dt);
    }
    group = []; size = 0;
  };
  for (const x of divisions) {
    // Tellers and any count drift: allow 20 rows of slack per division.
    const n = (x.content_count ?? 0) + (x.not_content_count ?? 0) + 20;
    if (size + n > 950) await flush();
    group.push(x.division_id); size += n;
  }
  await flush();
  return [...last];
}

const peerLastVotesShared = unstable_cache(readPeerLastVotes, ['sitemap-peer-last-votes-v1'], { tags: ['sitemap', 'sitemap:lords'], revalidate: DAY });

export async function peerLastVotes(): Promise<Map<number, string>> {
  return new Map(await peerLastVotesShared());
}
