// Meaning search for /search (Cowork ENTRY 390 GO, owner approved 20 Nov 2026): GET /api/meaning-search?q=<words> gives
// the records closest in meaning (lib/meaning/search.ts), at most 25 (repeated titles are collapsed on the page), for the 'Related by meaning' group, which the
// search page asks for after its exact results are shown (app/search/MeaningResults.tsx). Its own function, so the
// model and its runtime (about 80 MB) are not added to the search page or any other route; the exact search never waits
// for it. Always 200 with a list: an empty list when the search is too short, the model is slow or the database fails,
// so the page shows nothing extra. Public reads only (titles and site paths already on the site); no-store, noindex.
import { meaningSearch, MAX_QUERY } from '@/lib/meaning/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, MAX_QUERY * 2);
  const { hits, why, ms } = await meaningSearch(q, 25);
  return Response.json(
    { results: hits.map(({ kind, path, title, date, house }) => ({ kind, path, title, date, house })) },
    { headers: { ...HEADERS, 'Server-Timing': `embed;dur=${ms.embed}, db;dur=${ms.db}${why ? `, skip;desc="${why}"` : ''}` } },
  );
}
