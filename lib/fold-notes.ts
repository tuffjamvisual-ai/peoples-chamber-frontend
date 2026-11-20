// Licence and attribution lines that belong with a page's sources (Cowork ENTRY 410, owner: "no source lines or source
// links inside page text; sources belong only in the page's Sources fold at the foot of the page", licences such as
// CC BY-SA and OGL keep their attribution there). They render inside the PageSources fold (FoldNotes), above its list.
export type FoldNote = { text: string; href?: string };

export const OGL_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';
export const OGL_NOTE: FoldNote = { text: 'Contains public sector information licensed under the Open Government Licence v3.0.', href: OGL_URL };
export const CC_BY_SA_4_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

/** The notes with no repeats (same text), in order. */
export function uniqueNotes(notes: (FoldNote | null | false | undefined)[]): FoldNote[] {
  const seen = new Set<string>();
  return notes.filter((n): n is FoldNote => !!n && !seen.has(n.text) && !!seen.add(n.text));
}
