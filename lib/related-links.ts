// The links in the compact "Related" block (app/components/RelatedLine.tsx; owner's brief, 3 Nov 2026). At most four,
// only links with data behind them, from reads the pages already make or small reads of existing tables (no new
// tables). A failed read leaves its link out and is logged; it never fails the page.
//   MP page:        their reports, their council, their interests, their votes (in that order).
//   Report page:    the MPs and councils it names, then the newest other reports on the same topic.
//   Council page:   up to three reports that link to the council.
import { supabase } from '@/lib/supabase';
import { displayMpName } from '@/lib/mp-name';
import { editorialSet, topicsOfIn, allEditorials } from '@/lib/editorials-source';
import { councilSlugsOf } from '@/lib/editorials/council-slugs';
import type { EditorialEntry } from '@/lib/editorials/types';

export type RelatedLink = { href: string; label: string };
const MAX = 4;

const editorialHref = (e: { slug: string; kind?: string }) => `/${e.kind === 'briefing' ? 'briefings' : 'editorials'}/${e.slug}`;
const newestFirst = (a: { publishedAt: string }, b: { publishedAt: string }) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

// The council for a constituency, only when the constituency lies in exactly one council (245 of 632 span two or
// three, and there is no share to choose between them, so those get no council link). Also the MP page's Contact section
// "Local council" line (HT1, owner, 8 Nov 2026), which took over from the MP page's Related line.
export async function councilForConstituency(gss: string | null | undefined): Promise<RelatedLink | null> {
  if (!gss) return null;
  const { data, error } = await supabase.from('welfare_constituency_geography').select('council_gss_code').eq('constituency_gss_code', gss).limit(4);
  if (error) throw new Error(`related: constituency councils: ${error.message}`);
  const codes = [...new Set(((data ?? []) as { council_gss_code: string }[]).map((r) => r.council_gss_code))];
  if (codes.length !== 1) return null;
  const { data: c, error: cErr } = await supabase.from('councils').select('slug, name').eq('gss_code', codes[0]).maybeSingle();
  if (cErr) throw new Error(`related: councils: ${cErr.message}`);
  return c ? { href: `/councils/${c.slug}`, label: c.name as string } : null;
}

export async function mpRelated(opts: {
  memberId: number; name: string; reportsCount: number; constituencyGss?: string | null; interestsCount: number; votesCount: number;
}): Promise<RelatedLink[]> {
  const links: RelatedLink[] = [];
  if (opts.reportsCount > 0) links.push({ href: `/mps/${opts.memberId}/reports`, label: `Reports on ${opts.name} (${opts.reportsCount})` });
  try {
    const council = await councilForConstituency(opts.constituencyGss);
    if (council) links.push(council);
  } catch (e) {
    console.error(`/mps/${opts.memberId} related council:`, e instanceof Error ? e.message : String(e));
  }
  if (opts.interestsCount > 0) links.push({ href: `/mps/${opts.memberId}?section=interests`, label: 'Registered interests' });
  if (opts.votesCount > 0) links.push({ href: `/mps/${opts.memberId}?section=voting`, label: 'Voting record' });
  return links.slice(0, MAX);
}

// Names for the MPs a piece names (also used for the NewsArticle's "mentions").
export async function namedMps(memberIds: number[] | undefined): Promise<{ memberId: number; name: string }[]> {
  const ids = [...new Set(memberIds ?? [])];
  if (!ids.length) return [];
  const { data, error } = await supabase.from('mps').select('member_id, name, display_name').in('member_id', ids);
  if (error) throw new Error(`related: mps: ${error.message}`);
  const byId = new Map(((data ?? []) as { member_id: number; name: string | null; display_name: string | null }[]).map((m) => [m.member_id, displayMpName(m.display_name || m.name || '')]));
  return ids.filter((id) => byId.get(id)).map((id) => ({ memberId: id, name: byId.get(id)! }));
}

export async function editorialRelated(piece: EditorialEntry, mps: { memberId: number; name: string }[]): Promise<RelatedLink[]> {
  const links: RelatedLink[] = [];
  const add = (l: RelatedLink) => { if (links.length < MAX && !links.some((x) => x.href === l.href)) links.push(l); };
  for (const m of mps) add({ href: `/mps/${m.memberId}`, label: m.name });
  try {
    const slugs = [...new Set([...(piece.relatedCouncilSlugs ?? []), ...councilSlugsOf(piece)])];
    if (slugs.length && links.length < MAX) {
      const { data, error } = await supabase.from('councils').select('slug, name').in('slug', slugs);
      if (error) throw new Error(`related: councils: ${error.message}`);
      const bySlug = new Map(((data ?? []) as { slug: string; name: string }[]).map((c) => [c.slug, c.name]));
      for (const s of slugs) if (bySlug.get(s)) add({ href: `/councils/${s}`, label: bySlug.get(s)! });
    }
    if (links.length < MAX) {
      const set = await editorialSet();
      const onTopic = new Set(topicsOfIn(set, piece.slug).flatMap((t) => set.topicSlugs[t] ?? []));
      onTopic.delete(piece.slug);
      const others = [...onTopic].map((s) => set.bySlug[s]).filter(Boolean).sort(newestFirst);
      for (const e of others) add({ href: editorialHref(e), label: e.headline });
    }
  } catch (e) {
    console.error(`/editorials/${piece.slug} related:`, e instanceof Error ? e.message : String(e));
  }
  return links;
}

export async function councilRelated(slug: string): Promise<RelatedLink[]> {
  try {
    const pieces = (await allEditorials()).filter((e) => (e.councilSlugs ?? []).includes(slug)).sort(newestFirst).slice(0, 3);
    return pieces.map((e) => ({ href: editorialHref(e), label: e.headline }));
  } catch (e) {
    console.error(`/councils/${slug} related:`, e instanceof Error ? e.message : String(e));
    return [];
  }
}
