// Donor page registry (24 Oct 2026): every registered donor name in political_donations, grouped by the donor page it
// belongs to, so /donors/<slug> finds its donor by exact name instead of by searching words from the slug (which left
// 72 names without a page, such as "Caroline O'Kane" and names whose only distinctive word is Ltd or Limited).
//
// A page's slug is donorNameToSlug(name) (lib/donor-slug.ts). Spellings that differ only in case, spacing or
// punctuation ("Andrew E Law" / "Andrew E. Law") are one registered name and share one page, as before. Two names whose
// letters differ but still produce the same slug (for example a letter the slug drops, such as an accent) are kept
// apart: the name with the most records keeps the slug and the next get "-2", "-3"... None existed on 24 Oct 2026.
//
// The names are read once per server instance and kept for a day, the donor pages' revalidate period.
import { supabase } from '@/lib/supabase';
import { donorNameToSlug } from '@/lib/donor-slug';

export type DonorPageEntry = {
  slug: string;
  label: string;      // the most used spelling, trimmed
  names: string[];    // every spelling exactly as stored, for an exact .in('donor_name', names) read
  records: number;
  others: { slug: string; label: string }[]; // other names that share this page's base slug (collisions)
};

// byTrimmed: each name with surrounding spaces removed -> every spelling stored for it (13,605 rows carry leading or
// trailing spaces on 24 Oct 2026), so an exact read can match them all (see storedSpellings).
export type DonorRegistry = { bySlug: Map<string, DonorPageEntry>; byTrimmed: Map<string, string[]> };

const TTL_MS = 24 * 60 * 60 * 1000;
const PAGE = 1000;
const BATCH = 8;
let cached: { at: number; registry: Promise<DonorRegistry> } | null = null;

// Letters and digits as written (accents kept, any alphabet), lower case, "&" read as "and"; punctuation and spaces
// ignored. Two spellings with the same key are the same registered name.
export function donorLetterKey(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/&/g, 'and').replace(/['’‘]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');
}

async function readNames(): Promise<Map<string, number>> {
  const { count, error: countErr } = await supabase
    .from('political_donations')
    .select('id', { count: 'exact', head: true })
    .not('donor_name', 'is', null);
  if (countErr) throw new Error(`donor registry count: ${countErr.message}`);
  const pages = Math.ceil((count ?? 0) / PAGE);
  const counts = new Map<string, number>();
  let read = 0;
  for (let first = 0; first < pages; first += BATCH) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(BATCH, pages - first) }, (_, k) => {
        const from = (first + k) * PAGE;
        return supabase.from('political_donations').select('donor_name').not('donor_name', 'is', null)
          .order('id', { ascending: true }).range(from, from + PAGE - 1);
      }),
    );
    for (const { data, error } of batch) {
      if (error) throw new Error(`donor registry names: ${error.message}`);
      for (const r of (data ?? []) as { donor_name: string | null }[]) {
        read++;
        const n = r.donor_name ?? '';
        if (n.trim()) counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
  }
  if (read < (count ?? 0)) throw new Error(`donor registry read ${read} of ${count} rows`);
  return counts;
}

async function build(): Promise<DonorRegistry> {
  const counts = await readNames();
  // base slug -> letter key -> spellings
  const groups = new Map<string, Map<string, { names: Map<string, number> }>>();
  for (const [raw, c] of counts) {
    const base = donorNameToSlug(raw.trim());
    if (!base) continue;
    const byKey = groups.get(base) ?? new Map();
    const key = donorLetterKey(raw);
    const g = byKey.get(key) ?? { names: new Map<string, number>() };
    g.names.set(raw, (g.names.get(raw) ?? 0) + c);
    byKey.set(key, g);
    groups.set(base, byKey);
  }
  const byTrimmed = new Map<string, string[]>();
  for (const raw of counts.keys()) {
    const t = raw.trim();
    byTrimmed.set(t, [...(byTrimmed.get(t) ?? []), raw]);
  }
  const bySlug = new Map<string, DonorPageEntry>();
  for (const [base, byKey] of groups) {
    const entries = [...byKey.values()].map((g) => {
      // The label is the most used spelling once surrounding spaces are trimmed, as the word search chose it.
      const trimmed = new Map<string, number>();
      for (const [n, c] of g.names) trimmed.set(n.trim(), (trimmed.get(n.trim()) ?? 0) + c);
      const label = [...trimmed.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
      return { names: [...g.names.keys()], label, records: [...g.names.values()].reduce((s, c) => s + c, 0) };
    }).sort((a, b) => b.records - a.records || a.label.localeCompare(b.label));
    // The second and later names get the first free "-2", "-3"... (never a slug another name already has).
    const slugs: string[] = [];
    let n = 2;
    entries.forEach((_, i) => {
      if (i === 0) { slugs.push(base); return; }
      while (groups.has(`${base}-${n}`) || bySlug.has(`${base}-${n}`)) n++;
      slugs.push(`${base}-${n++}`);
    });
    entries.forEach((e, i) => {
      bySlug.set(slugs[i], {
        slug: slugs[i], label: e.label, names: e.names, records: e.records,
        others: entries.map((o, j) => ({ slug: slugs[j], label: o.label })).filter((_, j) => j !== i),
      });
    });
  }
  return { bySlug, byTrimmed };
}

export function donorRegistry(): Promise<DonorRegistry> {
  if (!cached || Date.now() - cached.at > TTL_MS) {
    const registry = build();
    cached = { at: Date.now(), registry };
    registry.catch(() => { if (cached?.registry === registry) cached = null; }); // a failed read is retried next time
  }
  return cached.registry;
}

// Every stored spelling of these donor names, including those saved with leading or trailing spaces, which an exact
// .in('donor_name', names) read misses (24 Oct 2026, report 37). Use with inList (lib/read-all.ts), which quotes each
// value so PostgREST keeps the spaces: q.filter('donor_name', 'in', inList(await storedSpellings(names))).
// A name not in the register is returned as given, trimmed.
export async function storedSpellings(names: string[]): Promise<string[]> {
  const { byTrimmed } = await donorRegistry();
  const out = new Set<string>();
  for (const n of names) {
    const t = n.trim();
    if (!t) continue;
    out.add(t);
    for (const s of byTrimmed.get(t) ?? []) out.add(s);
  }
  return [...out];
}
