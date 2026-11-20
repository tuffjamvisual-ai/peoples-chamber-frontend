// Meaning search (Cowork ENTRY 390 GO, owner approved 20 Nov 2026): the kinds of record held in search_embeddings, the
// label each shows on /search, and the key used to leave out a record /search already lists. Shared by the server (the
// loader, /api/meaning-search) and the browser (app/search/MeaningResults.tsx), so no server imports here.

export const MEANING_KINDS = [
  'page', 'mp', 'peer', 'council', 'constituency', 'organisation', 'report', 'briefing', 'bill', 'commons_vote',
  'committee', 'edm', 'petition', 'debate', 'special_adviser',
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
  edm: 'Early day motion',
  petition: 'Petition',
  debate: 'Debate',
  special_adviser: 'Special adviser',
};

export type MeaningHit = { kind: MeaningKind; path: string; title: string; score: number };

// The same record under either address: a report is listed by the exact search at /editorials/<slug> and may be held here
// at /briefings/<slug> (a briefing), so both become 'report:<slug>'. Anything after '?' is ignored; the '#' of a special
// adviser's row is kept (each adviser is a different record on the same page).
export function seenKey(path: string): string {
  const p = path.split('?')[0].replace(/\/+$/, '') || '/';
  const m = p.match(/^\/(?:editorials|briefings)\/([^/#]+)$/);
  return m ? `report:${m[1]}` : p;
}
