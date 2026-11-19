// The names /search looks for inside what was typed (Cowork ENTRY 384 stage B2, ENTRY 390, 19 Nov 2026), and the special
// advisers and area codes it searches. MPs and members of the Lords come from the site wide suggestions index, already
// held in the shared cache (lib/search/site-index.ts); councils, constituencies (with their ONS codes) and special
// advisers from one small read here, kept in the shared data cache under the tables' tags (A16: no timer, refreshed when
// a sync changes them). About 1,200 short rows. Donor names, only when nothing else is found, from the donor registry
// each server instance already keeps (lib/donor-registry.ts). Searched in memory: a search reads no extra rows.
import 'server-only';
import { supabase } from '@/lib/supabase';
import { tagged } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { siteIndexEntries } from '@/lib/search/site-index';
import { donorRegistry } from '@/lib/donor-registry';
import { addCores, findNameRun, nameCore, peerCores, startsWords, areaCode, type NameKind, type NameRun } from '@/lib/search/query-understanding';

export type SpadHit = { name: string; area: string | null; quarter: string | null; href: string };
type Places = {
  councils: { name: string; short_name: string | null; gss_code: string | null }[];
  seats: { name: string; ons_code: string | null }[];
  spads: { name: string; area: string | null; quarter: string | null }[];
  listed: string[]; // advisers in the latest appointments list, who have a row (and an anchor) on the special advisers page
};

const readPlaces = () => tagged(['search-name-index-v1'], tableTags('councils', 'constituencies', 'special_advisers', 'spad_appointments'), async (): Promise<Places> => {
  const [c, s, a, l] = await Promise.all([
    supabase.from('councils').select('name, short_name, gss_code').order('name').limit(1000),
    supabase.from('constituencies').select('name, ons_code').order('name').limit(1000),
    supabase.from('special_advisers').select('name, area, quarter').order('id').limit(1000),
    supabase.from('spad_appointments').select('adviser_name').order('adviser_name').limit(1000),
  ]);
  for (const [what, r] of [['councils', c], ['constituencies', s], ['special_advisers', a], ['spad_appointments', l]] as const) {
    if (r.error) throw new Error(`search name index ${what}: ${r.error.message}`);
  }
  return {
    councils: (c.data ?? []) as Places['councils'],
    seats: (s.data ?? []) as Places['seats'],
    spads: (a.data ?? []) as Places['spads'],
    listed: [...new Set((l.data ?? []).map((r) => r.adviser_name as string))],
  };
});

// The special advisers page's anchor for an adviser (app/transparency/special-advisers/SpadRosterTable.tsx adviserAnchor).
const anchor = (name: string) => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// 'April to June 2026' -> a number that sorts quarters in time order (as on the special advisers page).
const QUARTER_START = ['january', 'april', 'july', 'october'];
const quarterOrder = (q: string | null) => {
  const m = (q ?? '').match(/^(\w+)\s+to\s+\w+\s+(\d{4})$/);
  return m ? Number(m[2]) * 10 + QUARTER_START.indexOf(m[1].toLowerCase()) : 0;
};

// The core -> kinds map, built once for each copy of the cached data this server instance reads.
let made: { site: unknown; places: Places; byCore: Map<string, NameKind[]> } | null = null;
async function names(): Promise<{ places: Places; byCore: Map<string, NameKind[]> }> {
  const [site, places] = await Promise.all([siteIndexEntries(), readPlaces()]);
  if (made?.site !== site || made.places !== places) {
    const byCore = new Map<string, NameKind[]>();
    addCores(byCore, site.filter((e) => e.kind === 'MP' || e.kind === 'Former MP').map((e) => nameCore(e.label, 'mp')), 'mp');
    addCores(byCore, site.filter((e) => e.kind === 'Lords').flatMap((e) => peerCores(e.label)), 'peer');
    addCores(byCore, places.spads.map((s) => nameCore(s.name, 'spad')), 'spad');
    addCores(byCore, places.seats.map((s) => nameCore(s.name, 'constituency')), 'constituency');
    addCores(byCore, places.councils.flatMap((c) => [nameCore(c.name, 'council'), c.short_name ? nameCore(c.short_name, 'council') : '']), 'council');
    made = { site, places, byCore };
  }
  return made;
}

// Donor names by core, made once for each registry this instance holds.
const donorCores = new WeakMap<object, Map<string, NameKind[]>>();
async function donorNames(): Promise<Map<string, NameKind[]>> {
  const reg = await donorRegistry();
  let m = donorCores.get(reg);
  if (!m) {
    m = new Map();
    addCores(m, [...reg.bySlug.values()].map((e) => nameCore(e.label, 'donor')).filter((c) => c.includes(' ')), 'donor');
    donorCores.set(reg, m);
  }
  return m;
}

export type QueryNames = {
  /** What the name groups search for: the name found inside the query, the place an area code names, or the query. */
  recordQ: string;
  /** The name found inside a longer query, or the place for a code; null when the query is searched as typed. */
  found: (NameRun & { code?: string }) | null;
  spads: SpadHit[];
};

/** Reads what was typed for /search's name groups. A failed read leaves the query as typed, never an error. */
export async function queryNames(q: string): Promise<QueryNames> {
  const plain: QueryNames = { recordQ: q, found: null, spads: [] };
  try {
    const { places, byCore } = await names();
    const code = areaCode(q);
    if (code) {
      const council = places.councils.find((c) => c.gss_code?.toUpperCase() === code);
      const seat = places.seats.find((s) => s.ons_code?.toUpperCase() === code);
      const hit = council ? { name: council.name, kind: 'council' as const } : seat ? { name: seat.name, kind: 'constituency' as const } : null;
      return hit ? { recordQ: hit.name, found: { start: 0, length: 1, kind: hit.kind, name: hit.name, rest: '', code }, spads: [] } : plain;
    }
    let run = findNameRun(q, byCore);
    if (!run) run = findNameRun(q, await donorNames().catch(() => new Map()));
    const recordQ = run ? run.name : q;
    const typed = recordQ.split(/\s+/).filter(Boolean);
    const listed = new Set(places.listed);
    const seen = new Set<string>();
    // One row per adviser, with the latest quarter they are listed in.
    const spads: SpadHit[] = [];
    for (const s of places.spads.slice().sort((a, b) => quarterOrder(b.quarter) - quarterOrder(a.quarter))) {
      if (seen.has(s.name) || !typed.length || !startsWords(s.name, typed)) continue;
      seen.add(s.name);
      spads.push({ name: s.name, area: s.area, quarter: s.quarter, href: `/transparency/special-advisers${listed.has(s.name) ? `#${anchor(s.name)}` : ''}` });
    }
    return { recordQ, found: run, spads: spads.slice(0, 10) };
  } catch (e) {
    console.warn('[search] name index:', e instanceof Error ? e.message : String(e));
    return plain;
  }
}
