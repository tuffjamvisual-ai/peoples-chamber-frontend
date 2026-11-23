// Every lobbying organisation page, A to Z (owner approved 23 Nov 2026, Cowork ENTRY 536 item 2): /lobbying shows a ranking
// of 30, so the other pages were reached only through organisation and secretariat pages. Built from the rankings list
// /lobbying already reads (lib/lobbying.ts getRankings, cached and refreshed by its tag): no new reads.
import 'server-only';
import { getRankings } from '@/lib/lobbying';

export const LETTERS = [...'abcdefghijklmnopqrstuvwxyz', '0-9'] as const;
export const lobbyingLetterHref = (letter: string) => `/lobbying/a-z/${letter}`;

// The letter a name files under: its first letter, ignoring a leading 'The ' and punctuation; digits and others under 0-9.
export function letterOf(name: string): string {
  const s = name.trim().replace(/^the\s+/i, '').replace(/^[^a-z0-9]+/i, '').toLowerCase();
  const c = s.charAt(0);
  return /[a-z]/.test(c) ? c : '0-9';
}

export async function lobbyingByLetter(): Promise<Map<string, { slug: string; name: string }[]>> {
  const rows = await getRankings();
  const out = new Map<string, { slug: string; name: string }[]>();
  for (const r of rows) {
    if (!r.slug || !r.name) continue;
    const l = letterOf(r.name);
    const list = out.get(l) ?? [];
    list.push({ slug: r.slug, name: r.name });
    out.set(l, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }));
  return out;
}
