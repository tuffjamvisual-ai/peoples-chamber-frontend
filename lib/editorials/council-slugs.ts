// The councils a piece links to (owner's brief, 3 Nov 2026, for the Related links): its council entries' councilSlug,
// and in text links written as [words](/councils/<slug>). Council index pages under /councils/ are not councils.
import type { EditorialEntry } from './types';

const NOT_COUNCILS = new Set(['league-table', 'search', 'blue-badges', 'children-in-care', 'road-condition']);

export function councilSlugsOf(piece: Pick<EditorialEntry, 'body'>): string[] {
  const out: string[] = [];
  const add = (s: string | undefined) => { if (s && !NOT_COUNCILS.has(s) && !out.includes(s)) out.push(s); };
  for (const block of piece.body ?? []) {
    if (block.type === 'councilEntry') add(block.councilSlug);
    for (const m of JSON.stringify(block).matchAll(/\]\(\/councils\/([a-z0-9-]+)\)/g)) add(m[1]);
  }
  return out;
}
