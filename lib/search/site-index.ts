// The names behind the site wide suggestions (SEARCH-ALL batch 1, Cowork ENTRY 326): what a reader most often types into
// Search opengovt, the homepage box and the page not found box, and where each goes. About 3,000 short entries: sitting MPs
// (name, seat, party), constituencies (with their MP), councils, members of the Lords with a page here, government
// departments, our reports and this session's bills. Read once into a shared cache (a day, and refreshed by the tables'
// tags when they change) and searched in memory with lib/search/words.ts, so a keystroke reads no database rows.
// The full search (/search?q=) is unchanged: these are suggestions only.
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { displayMpName } from '@/lib/mp-name';
import { departments } from '@/lib/departments';
import { allEditorials } from '@/lib/editorials-source';
import { getParliamentSessions, getSessionBills } from '@/lib/parliament-sessions';
import { peerHasPage } from '@/lib/peers';
import { tableTags } from '@/lib/source-tags';
import { wordsOf, searchList, type Fielded } from '@/lib/search/words';

export type SiteEntry = { label: string; kind: string; href: string; extra: string };

async function readAll<T>(read: (from: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, what: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await read(from);
    if (error) throw new Error(`site index ${what}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) return out;
  }
}

async function build(): Promise<SiteEntry[]> {
  const [mps, seats, councils, peers, reports, sessions] = await Promise.all([
    readAll((f) => supabase.from('mps').select('member_id, display_name, constituency, party, constituency_gss_code, current_member').order('member_id').range(f, f + 999), 'mps'),
    readAll((f) => supabase.from('constituencies').select('ons_code, slug, name').order('name').range(f, f + 999), 'constituencies'),
    readAll((f) => supabase.from('councils').select('slug, name, short_name, type_label').not('gss_code', 'is', null).order('name').range(f, f + 999), 'councils'),
    readAll((f) => supabase.from('peers').select('member_id, name_display, party, is_current, end_date').order('member_id').range(f, f + 999), 'peers'),
    allEditorials(),
    getParliamentSessions(),
  ]);
  const current = sessions.find((s) => s.is_current);
  const bills = current ? await getSessionBills(current.id) : [];
  const mpBySeat = new Map(mps.filter((m) => m.current_member).map((m) => [m.constituency_gss_code as string, displayMpName(m.display_name as string) ?? '']));
  const out: SiteEntry[] = [];
  // Sitting MPs, and the few in the table who have left (their pages stay up), as 'Former MP'.
  for (const m of mps) out.push({ label: displayMpName(m.display_name as string) ?? String(m.member_id), kind: m.current_member ? 'MP' : 'Former MP', href: `/mps/${m.member_id}`, extra: `${m.constituency ?? ''} ${m.party ?? ''}` });
  for (const s of seats) out.push({ label: s.name as string, kind: 'Constituency', href: `/constituencies/${s.slug}`, extra: mpBySeat.get(s.ons_code as string) ?? '' });
  for (const c of councils) out.push({ label: (c.short_name as string) || (c.name as string), kind: 'Council', href: `/councils/${c.slug}`, extra: `${c.name ?? ''} ${c.type_label ?? ''}` });
  for (const p of peers) if (peerHasPage(p as { is_current: boolean; end_date: string | null })) out.push({ label: p.name_display as string, kind: 'Lords', href: `/lords/${p.member_id}`, extra: (p.party as string) ?? '' });
  for (const d of departments) out.push({ label: d.name, kind: 'Department', href: `/departments/${d.slug}`, extra: '' });
  // A briefing lives at /briefings/<slug> (its /editorials address redirects there; T2, 18 Nov 2026).
  for (const r of reports) out.push({ label: r.headline, kind: 'Report', href: r.kind === 'briefing' ? `/briefings/${r.slug}` : `/editorials/${r.slug}`, extra: r.kicker ?? '' });
  for (const b of bills) out.push({ label: b.title, kind: 'Bill', href: `/bills/${b.bill_id}`, extra: '' });
  return out;
}

// Shared by every server instance; a day, and refreshed when any of these tables is written.
const siteIndex = unstable_cache(build, ['site-suggest-index-v1'], {
  revalidate: 86400,
  tags: [...tableTags('mps', 'constituencies', 'councils', 'peers', 'bill'), 'editorials'],
});

// Kinds in the order a tie is broken: a person or a place before a title.
const ORDER = ['MP', 'Constituency', 'Council', 'Department', 'Lords', 'Former MP', 'Bill', 'Report'];

// The words of each entry, worked out once for each copy of the index this server instance reads.
let made: { from: SiteEntry[]; list: Fielded<SiteEntry>[] } | null = null;
function fielded(entries: SiteEntry[]): Fielded<SiteEntry>[] {
  if (made?.from !== entries) {
    made = { from: entries, list: entries.slice().sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).map((e) => ({ item: e, fields: [wordsOf(e.label), wordsOf(e.extra)] })) };
  }
  return made.list;
}

export async function siteSuggestions(q: string, most = 6): Promise<{ suggestions: SiteEntry[]; typos: boolean }> {
  if (wordsOf(q).join('').length < 2) return { suggestions: [], typos: false };
  const { matches, typos } = searchList(fielded(await siteIndex()), q);
  // A name typed whole comes first ('kent' puts Kent council before Weald of Kent), then names that start with what was
  // typed; otherwise the order searchList gave (best score, then kind).
  const want = wordsOf(q).join(' ');
  const close = (e: SiteEntry) => { const l = wordsOf(e.label).join(' '); return l === want ? 0 : l.startsWith(want) ? 1 : 2; };
  const ordered = matches.map((e, i) => [e, i] as const).sort((a, b) => close(a[0]) - close(b[0]) || a[1] - b[1]).map(([e]) => e);
  return { suggestions: ordered.slice(0, most), typos };
}
