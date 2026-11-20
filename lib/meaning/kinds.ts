// Meaning search (Cowork ENTRY 390 GO, owner approved 20 Nov 2026): the kinds of record held in search_embeddings, the
// label each shows on /search, and the key used to leave out a record /search already lists. Shared by the server (the
// loader, /api/meaning-search) and the browser (app/search/MeaningResults.tsx), so no server imports here.

export const MEANING_KINDS = [
  'page', 'mp', 'peer', 'council', 'constituency', 'organisation', 'report', 'briefing', 'bill', 'commons_vote',
  'committee', 'appg', 'edm', 'petition', 'debate', 'special_adviser',
] as const;
export type MeaningKind = (typeof MEANING_KINDS)[number];

export const MEANING_LABEL: Record<MeaningKind, string> = {
  page: 'Page',
  mp: 'MP',
  peer: 'Peer',
  council: 'Council',
  constituency: 'Constituency',
  organisation: 'Organisation',
  report: 'Report',
  briefing: 'Report',
  bill: 'Bill',
  commons_vote: 'Commons vote',
  committee: 'Committee',
  appg: 'APPG',
  edm: 'Early day motion',
  petition: 'Petition',
  debate: 'Debate',
  special_adviser: 'Special adviser',
};

// date: YYYY-MM-DD or null; house: 'Commons', 'Lords' or null (search_embeddings item_date, house).
export type MeaningHit = { kind: MeaningKind; path: string; title: string; score: number; date: string | null; house: string | null };

// The line under a meaning result, as the exact results show it (Cowork ENTRY 390 PICTURES): 'Commons debate · 12 Mar 2025',
// 'Last updated 3 Nov 2026' for a bill (lib/search-content.ts labels a bill's date so), 'Tabled ...', 'Opened ...', or the
// date alone; null when there is nothing to show.
export function meaningDetail(kind: MeaningKind, date: string | null, house: string | null): string | null {
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : null;
  if (kind === 'debate') return [house ? `${house} debate` : null, d].filter(Boolean).join(' · ') || null;
  if (!d) return null;
  if (kind === 'bill') return `Last updated ${d}`;
  if (kind === 'edm') return `Tabled ${d}`;
  if (kind === 'petition') return `Opened ${d}`;
  return d;
}

// The same record under either address: a report is listed by the exact search at /editorials/<slug> and may be held here
// at /briefings/<slug> (a briefing), so both become 'report:<slug>'. Anything after '?' is ignored, except on the APPG list,
// where the search for the group's title is what tells one APPG from another; the '#' of a special adviser's row is kept
// (each adviser is a different record on the same page).
export function seenKey(path: string): string {
  if (path.startsWith('/transparency/appgs?')) return path;
  const p = path.split('?')[0].replace(/\/+$/, '') || '/';
  const m = p.match(/^\/(?:editorials|briefings)\/([^/#]+)$/);
  return m ? `report:${m[1]}` : p;
}
