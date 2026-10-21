// "Read next" blocks on news, editorial and debate pages (owner's approval, 21 Oct 2026): 3 to 5 links placed after
// the opening of the piece, as well as the existing end sections. Each rule runs in order, a link is used once, and a
// link the page already shows in its end sections is left out (news: RelatedLinks' department, Secretary of State
// and newest releases; editorials: ExploreNext). A block with fewer than two links is not shown. A failed read throws,
// like the pages' other reads, so a page built ahead keeps its last good version.
import { supabase } from '@/lib/supabase';
import { topics } from '@/lib/topics';
import { departments } from '@/lib/departments';
import type { EditorialEntry } from '@/lib/editorials/types';
import { resolveOrgToDeptSlug } from '@/lib/govOrgSlug';
import { exploreNextSelection } from '@/lib/explore-next';

export type ReadNextLink = { href: string; label: string; note?: string };

const MAX = 5;
const MIN_SHOWN = 2;

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A whole-word, case-insensitive match ("tax" matches "tax" and "tax rises", not "taxi").
const hasWords = (text: string, phrase: string) => new RegExp(`(^|[^a-z0-9])${esc(phrase.toLowerCase())}($|[^a-z0-9])`).test(text.toLowerCase());

class Picker {
  links: ReadNextLink[] = [];
  private seen: Set<string>;
  constructor(exclude: Iterable<string>) { this.seen = new Set(exclude); }
  add(l: ReadNextLink | null | undefined) {
    if (!l || this.links.length >= MAX || this.seen.has(l.href)) return false;
    this.seen.add(l.href); this.links.push(l); return true;
  }
  get full() { return this.links.length >= MAX; }
  result() { return this.links.length >= MIN_SHOWN ? this.links : []; }
}

// The topic hub whose keywords appear in a title (the first topic with the most matching keywords). Keywords match as
// substrings, as on the topic pages themselves ("rail" matches "Railways").
function topicFor(title: string): ReadNextLink | null {
  const lower = title.toLowerCase();
  let best: { t: (typeof topics)[number]; n: number } | null = null;
  for (const t of topics) {
    const n = t.keywords.filter((k) => lower.includes(k.toLowerCase())).length;
    if (n > 0 && (!best || n > best.n)) best = { t, n };
  }
  return best ? { href: `/topics/${best.t.slug}`, label: `Everything on ${best.t.title}`, note: 'Departments, votes, bills, MPs and reporting on this subject' } : null;
}

// "The Rt Hon Pat McFadden MP" -> "Pat McFadden", for matching names in text and against mps.name.
const plainName = (n: string) => n.replace(/^(The\s+)?((Rt\.?\s+Hon\.?|Sir|Dame|Dr|Lord|Baroness|Lady)\s+)+/i, '').replace(/\s+(MP|KC|QC|CBE|OBE|MBE)\b.*$/i, '').trim();

type Minister = { member_id: number | null; name: string; role: string; dept_slug: string; is_secretary_of_state: boolean | null };
// Current ministers (dept_ministers), named without titles. Most rows (80 of 121) carry no member_id, so it is filled
// from the current MP with the same name; ministers who are not MPs (peers) keep none and are not linked.
async function currentMinisters(): Promise<Minister[]> {
  const [{ data, error }, { data: mps, error: mpErr }] = await Promise.all([
    supabase.from('dept_ministers').select('member_id, name, role, dept_slug, is_secretary_of_state').or('resigned.is.null,resigned.eq.false'),
    supabase.from('mps').select('member_id, name').eq('current_member', true).range(0, 999),
  ]);
  if (error) throw new Error(`read next: dept_ministers: ${error.message}`);
  if (mpErr) throw new Error(`read next: mps: ${mpErr.message}`);
  const idByName = new Map<string, number>();
  for (const m of (mps || []) as { member_id: number; name: string | null }[]) if (m.name) idByName.set(plainName(m.name).toLowerCase(), m.member_id);
  return ((data || []) as Minister[])
    .map((m) => { const name = plainName(m.name || ''); return { ...m, name, member_id: m.member_id ?? idByName.get(name.toLowerCase()) ?? null }; })
    .filter((m) => m.member_id != null && m.name.split(/\s+/).length >= 2);
}

// ---------- News (press releases) ----------
// 1. Ministers named in the release, the issuing department's first, up to 2 (its Secretary of State is in
//    RelatedLinks already). 2. Up to 2 releases from the same organisation within 180 days that match the title most
//    closely (related_press_releases, migration 2026-10-21d; it leaves out the "More from" list). 3. The topic hub
//    matching the title. The department page is in RelatedLinks, so it is not repeated here.
export async function newsReadNext(r: { id: number; title: string; organisation: string | null; body: string | null; description: string | null }): Promise<ReadNextLink[]> {
  const deptSlug = r.organisation ? resolveOrgToDeptSlug(r.organisation) : null;
  const text = plain(`${r.description || ''} ${r.body || ''}`);
  const [ministers, related] = await Promise.all([
    currentMinisters(),
    supabase.rpc('related_press_releases', { p_id: r.id, p_limit: 2 }),
  ]);
  if (related.error) throw new Error(`read next: related_press_releases: ${related.error.message}`);
  const exclude = deptSlug ? [`/departments/${deptSlug}`] : [];
  for (const m of ministers) if (m.is_secretary_of_state && m.dept_slug === deptSlug) exclude.push(`/mps/${m.member_id}`);
  const pick = new Picker(exclude);
  const named = ministers.filter((m) => hasWords(text, m.name))
    .sort((a, b) => Number(b.dept_slug === deptSlug) - Number(a.dept_slug === deptSlug) || Number(!!b.is_secretary_of_state) - Number(!!a.is_secretary_of_state));
  let n = 0;
  for (const m of named) { if (n >= 2) break; if (pick.add({ href: `/mps/${m.member_id}`, label: m.name, note: m.role })) n++; }
  for (const p of (related.data || []) as { news_slug: string; title: string; published_at: string | null }[]) {
    pick.add({ href: `/news/${p.news_slug}`, label: p.title, note: p.published_at ? new Date(p.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined });
  }
  pick.add(topicFor(r.title));
  return pick.result();
}

// ---------- Editorials ----------
// 1. MPs named in full in the text (current MPs), up to 2. 2. Departments named in full, up to 2. 3. The next
//    pieces on the same subject after the three ExploreNext shows, up to 2. ExploreNext's links (data pages, topic
//    hubs, hand-picked and related pieces) are not repeated.
export async function editorialReadNext(piece: EditorialEntry): Promise<ReadNextLink[]> {
  const sel = exploreNextSelection(piece);
  const pick = new Picker(sel.hrefs);
  const text = piece.body.map((b) => ('text' in b && typeof b.text === 'string' ? b.text : '')).join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const { data, error } = await supabase.from('mps').select('member_id, name, constituency').eq('current_member', true).range(0, 999);
  if (error) throw new Error(`read next: mps: ${error.message}`);
  const mps = ((data || []) as { member_id: number; name: string | null; constituency: string | null }[])
    .map((m) => ({ ...m, plainName: (m.name || '').replace(/^(Rt Hon |Sir |Dame |Dr |Mr |Mrs |Ms )+/i, '').trim() }))
    .filter((m) => m.plainName.split(/\s+/).length >= 2)
    .map((m) => ({ ...m, at: text.search(new RegExp(`(^|[^A-Za-z])${esc(m.plainName)}($|[^A-Za-z])`)) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at);
  for (const m of mps.slice(0, 2)) pick.add({ href: `/mps/${m.member_id}`, label: m.plainName, note: m.constituency ? `MP for ${m.constituency}` : undefined });
  const depts = departments.map((d) => ({ d, at: text.indexOf(d.name) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
  for (const { d } of depts.slice(0, 2)) pick.add({ href: `/departments/${d.slug}`, label: d.name });
  const base = piece.kind === 'briefing' ? '/briefings' : '/editorials';
  let n = 0;
  for (const e of sel.moreRelated) { if (n >= 2) break; if (pick.add({ href: `${base}/${e.slug}`, label: e.headline })) n++; }
  return pick.result();
}

// ---------- Debates ----------
// 1. The opening speaker's MP page. 2. The council for that MP's constituency, when the debate is about the place
//    (the council's or constituency's name is in the title or the opening speech). 3. The answering minister's
//    department, from the role Hansard records on the day ("The Parliamentary Under-Secretary of State for Transport
//    (Lilian Greenwood)"), not today's role. 4. A bill named in the title. 5. The topic hub matching the title. Other
//    debates are not offered on shared speakers alone (in the drafts that gave unrelated matches).
const DEPT_STOP = new Set(['department', 'for', 'of', 'and', 'the', 'ministry', 'office', 'hm', 'his', 'majesty', "majesty's", 'government']);
function departmentInRole(attribution: string) {
  const role = attribution.toLowerCase();
  if (!/secretary of state|minister|chancellor|attorney general|solicitor general|chief secretary/.test(role)) return null;
  for (const dep of departments) {
    if (role.includes(dep.name.toLowerCase())) return dep;
    const words = dep.name.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter((w) => w.length >= 5 && !DEPT_STOP.has(w));
    if (words.length && words.every((w) => role.includes(w))) return dep;
  }
  return null;
}
export async function debateReadNext(d: { title: string; speakers: { memberId: number | null; html: string; attribution: string }[] }): Promise<ReadNextLink[]> {
  const pick = new Picker([]);
  const withId = d.speakers.filter((s) => s.memberId != null);
  const opening = withId[0];
  const ids = [...new Set(withId.map((s) => s.memberId as number))];
  const [mpRes, billRes] = await Promise.all([
    ids.length ? supabase.from('mps').select('member_id, name, constituency, constituency_gss_code').in('member_id', ids) : Promise.resolve({ data: [], error: null }),
    (() => {
      const m = d.title.match(/^(.+? Bill)\b/i);
      return m ? supabase.from('bill').select('id, title').is('hidden_reason', null).ilike('title', m[1].replace(/[%_]/g, '')).limit(1) : Promise.resolve({ data: [], error: null });
    })(),
  ]);
  if (mpRes.error) throw new Error(`read next: mps: ${mpRes.error.message}`);
  if (billRes.error) throw new Error(`read next: bill: ${billRes.error.message}`);
  const mpById = new Map(((mpRes.data || []) as { member_id: number; name: string | null; constituency: string | null; constituency_gss_code: string | null }[]).map((m) => [m.member_id, m]));
  const op = opening ? mpById.get(opening.memberId as number) : undefined;
  if (op) {
    pick.add({ href: `/mps/${op.member_id}`, label: (op.name || '').replace(/^(Rt Hon |Sir |Dame |Dr )+/i, '').replace(/\s+MP$/, ''), note: op.constituency ? `MP for ${op.constituency}, who opened the debate` : 'Opened the debate' });
    if (op.constituency_gss_code) {
      const { data: geo, error: geoErr } = await supabase.from('welfare_constituency_geography').select('council_gss_code, council_name').eq('constituency_gss_code', op.constituency_gss_code).limit(5);
      if (geoErr) throw new Error(`read next: constituency councils: ${geoErr.message}`);
      const about = plain(`${d.title} ${opening?.html || ''}`);
      const placeWords = (op.constituency || '').split(/[\s,]+|\band\b/i).filter((w) => w.length >= 5);
      for (const g of (geo || []) as { council_gss_code: string; council_name: string }[]) {
        if (!(hasWords(about, g.council_name) || placeWords.some((w) => hasWords(about, w)))) continue;
        const { data: c, error: cErr } = await supabase.from('councils').select('slug, name').eq('gss_code', g.council_gss_code).maybeSingle();
        if (cErr) throw new Error(`read next: councils: ${cErr.message}`);
        if (c) { pick.add({ href: `/councils/${c.slug}`, label: c.name as string, note: 'The council for the area the debate is about' }); break; }
      }
    }
  }
  for (const s of d.speakers) {
    const dep = departmentInRole(s.attribution);
    if (!dep) continue;
    const who = s.attribution.match(/\(([^)]+)\)\s*$/)?.[1];
    pick.add({ href: `/departments/${dep.slug}`, label: dep.name, note: who ? `${who} answered for the department` : 'Answered for the department' });
    break;
  }
  const bill = ((billRes.data || []) as { id: number; title: string }[])[0];
  if (bill) pick.add({ href: `/bills/${bill.id}`, label: bill.title, note: 'The bill this debate is about' });
  pick.add(topicFor(d.title));
  return pick.result();
}

// Editorial placement (index of the block to put Read next after; -1 means after the body): before the first heading
// that has at least three paragraphs above it, if that comes within the first six paragraphs; otherwise after the
// fourth paragraph. A piece with fewer than five paragraphs gets the block after its body.
export function editorialReadNextIndex(piece: EditorialEntry): number {
  const paraAt: number[] = [];
  piece.body.forEach((b, i) => { if (b.type === 'paragraph') paraAt.push(i); });
  if (paraAt.length < 5) return -1;
  let before = 0;
  for (let i = 0; i < piece.body.length; i++) {
    const b = piece.body[i];
    if (b.type === 'heading' && before >= 3 && before <= 6) return i - 1;
    if (b.type === 'paragraph') before++;
    if (before > 6) break;
  }
  return paraAt[3];
}
