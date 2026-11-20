// The Sources fold of a council detail tab (T1-5c, owner via Cowork, 11 Nov 2026: "a Sources fold at the end of each tab
// panel"). A tab loads on its own from /councils/[slug]/panel/[tab], so it cannot join the page's one fold: each section
// in it that shows figures adds its source here while it renders, and the panel route lists them in one PageSources at
// the end. One list per request (React cache). Licence and attribution lines (Cowork ENTRY 410: no source lines in the
// page text) go in the same fold through addPanelNote.
import { cache } from 'react';
import type { PageSource } from '@/app/components/PageSources';
import type { FoldNote } from '@/lib/fold-notes';

export const panelSources = cache((): PageSource[] => []);
export function addPanelSource(s: PageSource): void {
  const list = panelSources();
  if (!list.some((x) => x.href === s.href)) list.push(s);
}

export const panelNotes = cache((): FoldNote[] => []);
export function addPanelNote(n: FoldNote): void {
  const list = panelNotes();
  if (!list.some((x) => x.text === n.text)) list.push(n);
}
