// Meaning search for /search (Cowork ENTRY 390 GO, owner approved 20 Nov 2026): GET /api/meaning-search?q=<words> gives
// the records closest in meaning (lib/meaning/search.ts), at most 25 (repeated titles are collapsed on the page), for the 'Related by meaning' group, which the
// search page asks for after its exact results are shown (app/search/MeaningResults.tsx). Its own function, so the
// model and its runtime (about 80 MB) are not added to the search page or any other route; the exact search never waits
// for it. Always 200 with a list: an empty list when the search is too short, the model is slow or the database fails,
// so the page shows nothing extra. Public reads only (titles and site paths already on the site); noindex.
// Caching (T2's note, Cowork ENTRY 390 PICTURES OK): a real answer (or a search too short to run, which never changes) is
// kept at the edge for a day (public, s-maxage=86400), so a repeated search costs no model or database time; a failure
// (model not loaded, model slow, database error) is no-store, so the next request tries again instead of serving a
// cached empty list for a day.
import { meaningSearch, MAX_QUERY } from '@/lib/meaning/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const CACHED = 'public, s-maxage=86400';
const UNCACHED = 'no-store';
const FAILURES = new Set(['model', 'model-slow', 'db']);

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, MAX_QUERY * 2);
  const { hits, why, ms } = await meaningSearch(q, 25);
  return Response.json(
    { results: hits.map(({ kind, path, title, date, house }) => ({ kind, path, title, date, house })) },
    { headers: { 'Cache-Control': why && FAILURES.has(why) ? UNCACHED : CACHED, 'X-Robots-Tag': 'noindex', 'Server-Timing': `embed;dur=${ms.embed}, db;dur=${ms.db}${why ? `, skip;desc="${why}"` : ''}` } },
  );
}
