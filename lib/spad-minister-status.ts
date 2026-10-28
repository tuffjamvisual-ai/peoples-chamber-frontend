// Is each appointing minister in the latest Cabinet Office list of special advisers still in that post, and who holds
// the Cabinet posts today? (Owner, 28 Oct 2026: the list is dated 31 March 2026 and many ministers have changed since.)
// From the Members API: each minister's governmentPosts (start and end dates) and GovernmentPosts (today's holders).
// Saved in spad_minister_status by /api/sync-spad-roster every week, so the page follows reshuffles on its own.
import type { SupabaseClient } from '@supabase/supabase-js';
import { SyncBudget, politeFetch, sleep } from '@/lib/sync-budget';

const API = 'https://members-api.parliament.uk/api';
const UA = 'OpenGovt/1.0 (contact@opengovt.uk)';

// A row of the list that names no minister: who held the post on the list's date, checked in the Members API
// (governmentPosts of David Lammy: Deputy Prime Minister and Lord Chancellor from 5 September 2025), 28 Oct 2026.
const UNNAMED_HOLDERS: Record<string, number> = {
  'special-adviser-data-releases-numbers-and-costs-july-2026|Deputy Prime Minister; Lord Chancellor and Secretary of State for Justice': 206,
};
// Lords ministers have no MP page; their Members API ids.
const LORDS_IDS: Record<string, number> = { 'Baroness Smith of Basildon': 4170, 'Lord Hermer': 5365 };

// Today's Cabinet posts and the department name the quarterly declarations use for them ("area"). Ministers of State
// are left out: the Cabinet Office lists special advisers for Cabinet ministers and a few others.
const POST_AREA: [RegExp, string | null][] = [
  [/^prime minister/i, 'No 10'], [/chancellor of the duchy of lancaster|minister for the cabinet office/i, 'Cabinet Office'],
  [/chancellor of the exchequer|chief secretary to the treasury/i, 'HM Treasury'], [/chief whip/i, 'Commons Leader & Whips'],
  [/foreign secretary/i, 'Foreign Office'], [/home secretary/i, 'Home Office'], [/defence/i, 'MoD'], [/health and social care/i, 'DHSC'],
  [/justice/i, 'MoJ'], [/^secretary of state for education/i, 'DfE'], [/work and pensions/i, 'DWP'], [/business/i, 'DBT'],
  [/housing, communities/i, 'MHCLG'], [/transport/i, 'DfT'], [/energy security/i, 'DESNZ'], [/culture, media/i, 'DCMS'],
  [/environment, food/i, 'Defra'], [/northern ireland/i, 'NIO'], [/scotland/i, 'Scotland Office'], [/wales/i, 'Wales Office'],
  [/leader of the house of lords/i, 'Lords Leader & Whips'], [/leader of the house of commons/i, 'Commons Leader & Whips'],
  [/women and equalities/i, null], [/attorney general/i, null],
];

// The department name for a post, as the quarterly declarations write it (null when there is none).
export const areaForPost = (name: string | null) => (name ? POST_AREA.find(([re]) => re.test(name))?.[1] ?? null : null);

export type MinisterStatusRow = {
  kind: 'listed' | 'current'; minister_title: string; release_slug: string | null; minister_name: string | null; member_id: number | null;
  gender: string | null; post_id: number | null; post_name: string | null; started_on: string | null; left_on: string | null;
  still_in_post: boolean; area: string | null;
};
type ApiPost = { id: number; name: string; startDate: string; endDate: string | null };

const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'state'].includes(w)));
const overlap = (a: string, b: string) => { const wb = words(b); return [...words(a)].filter((w) => wb.has(w)).length; };

// The post a minister held on the list's date that the list's title names: the best word match with the title's
// first part ("Secretary of State for Education; Minister for Women and Equalities" → Education), then the whole.
export function pickPost(title: string, posts: ApiPost[], asAt: string): ApiPost | null {
  const held = posts.filter((p) => p.startDate.slice(0, 10) <= asAt && (!p.endDate || p.endDate.slice(0, 10) > asAt));
  if (!held.length) return null;
  const first = title.split(/;|,\s*(?=[A-Z])/)[0];
  return [...held].sort((a, b) => overlap(first, b.name) - overlap(first, a.name) || overlap(title, b.name) - overlap(title, a.name))[0];
}

async function api<T>(path: string, budget: SyncBudget): Promise<T> {
  await sleep(500);
  const res = await politeFetch(`${API}${path}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, { budget });
  if (!res.ok) throw new Error(`Members API answered HTTP ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

export async function computeMinisterStatus(listed: { release_slug: string; as_at: string; minister_title: string; minister_name: string | null; minister_member_id: number | null }[], budget: SyncBudget): Promise<MinisterStatusRow[]> {
  const out: MinisterStatusRow[] = [];
  const seen = new Set<string>();
  for (const l of listed) {
    if (seen.has(l.minister_title)) continue;
    seen.add(l.minister_title);
    const lordsKey = Object.keys(LORDS_IDS).find((k) => (l.minister_name ?? '').includes(k));
    const id = l.minister_member_id ?? (lordsKey ? LORDS_IDS[lordsKey] : null) ?? UNNAMED_HOLDERS[`${l.release_slug}|${l.minister_title}`] ?? null;
    const row: MinisterStatusRow = { kind: 'listed', minister_title: l.minister_title, release_slug: l.release_slug, minister_name: l.minister_name, member_id: id, gender: null, post_id: null, post_name: null, started_on: null, left_on: null, still_in_post: false, area: null };
    if (id != null) {
      const [bio, member] = await Promise.all([
        api<{ value?: { governmentPosts?: ApiPost[] } }>(`/Members/${id}/Biography`, budget),
        api<{ value?: { nameDisplayAs?: string; gender?: string } }>(`/Members/${id}`, budget),
      ]);
      const post = pickPost(l.minister_title, bio.value?.governmentPosts ?? [], l.as_at);
      row.gender = member.value?.gender ?? null;
      if (!l.minister_name) row.minister_name = member.value?.nameDisplayAs ?? null; // the list gives no name
      if (post) Object.assign(row, { post_id: post.id, post_name: post.name, started_on: post.startDate.slice(0, 10), left_on: post.endDate ? post.endDate.slice(0, 10) : null, still_in_post: !post.endDate });
    }
    out.push(row);
  }
  // Today's Cabinet posts.
  const posts = await api<{ value: { id: number; name: string; postHolders?: { startDate: string; endDate: string | null; member: { value: { id: number; nameDisplayAs: string; gender: string } } }[] } }[]>('/Posts/GovernmentPosts', budget);
  for (const { value: p } of posts) {
    if (/^minister of state/i.test(p.name)) continue;
    for (const h of (p.postHolders ?? []).filter((x) => !x.endDate)) {
      out.push({ kind: 'current', minister_title: p.name, release_slug: null, minister_name: h.member.value.nameDisplayAs, member_id: h.member.value.id, gender: h.member.value.gender, post_id: p.id, post_name: p.name, started_on: h.startDate.slice(0, 10), left_on: null, still_in_post: true, area: areaForPost(p.name) });
    }
  }
  return out;
}

// Weekly: recompute for the latest list and replace the table's rows (a reshuffle changes them).
export async function syncMinisterStatus(supabase: SupabaseClient, budget: SyncBudget): Promise<Record<string, unknown>> {
  const { data: rel, error: relError } = await supabase.from('spad_releases').select('release_slug, as_at').order('as_at', { ascending: false }).limit(1).maybeSingle();
  if (relError || !rel) throw new Error(`spad_releases: ${relError?.message ?? 'none'}`);
  const { data: listed, error } = await supabase.from('spad_appointments').select('minister_title, minister_name, minister_member_id').eq('release_slug', rel.release_slug);
  if (error) throw new Error(`spad_appointments: ${error.message}`);
  const rows = await computeMinisterStatus((listed ?? []).map((l) => ({ ...l, release_slug: rel.release_slug, as_at: rel.as_at })), budget);
  const listedCount = rows.filter((r) => r.kind === 'listed').length;
  if (!listedCount || rows.filter((r) => r.kind === 'listed' && r.post_id == null && r.member_id != null).length > listedCount / 2) {
    throw new Error('Members API answers look wrong (most listed ministers had no post on the list date); nothing changed');
  }
  const now = new Date().toISOString();
  const { error: upError } = await supabase.from('spad_minister_status').upsert(rows.map((r) => ({ ...r, checked_at: now })), { onConflict: 'kind,minister_title' });
  if (upError) throw new Error(`spad_minister_status: ${upError.message}`);
  const { error: delError } = await supabase.from('spad_minister_status').delete().lt('checked_at', now);
  if (delError) throw new Error(`spad_minister_status remove: ${delError.message}`);
  return { listed: listedCount, still_in_post: rows.filter((r) => r.kind === 'listed' && r.still_in_post).length, current_posts: rows.filter((r) => r.kind === 'current').length };
}
