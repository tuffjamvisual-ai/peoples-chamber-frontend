// The opengovt Verdict on party pages is hidden (owner decision 12 Nov 2026, T1-VERD: 'hide opengovt verdict on the
// parties'). Hidden, not deleted: each party's text stays stored in parties.critique, and a party listed here shows it
// again (its Verdict tab, /parties/<slug>/bio and that page's sitemap entry come back with it). Empty: off for every party.
const SHOWN: ReadonlySet<string> = new Set<string>([]);

export function partyVerdictShown(slug: string): boolean {
  return SHOWN.has(slug);
}

// Where a link to a party goes: its verdict page while that is shown, otherwise its first page (Manifesto vs Record).
export function partyHref(slug: string): string {
  return partyVerdictShown(slug) ? `/parties/${slug}/bio` : `/parties/${slug}`;
}
