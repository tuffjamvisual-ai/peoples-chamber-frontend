// The /reports search index (owner request 18 Nov 2026, Cowork ENTRY 304): for every report on /reports, its article text
// as distinct words, { "<href>": "word word ..." }. The search box fetches it once, when it is first used, so the body text
// is searchable without being in the page; headlines and summaries are searched before it arrives. Static and cached (A16):
// rebuilt when the editorials or briefings change (their tags) or on a deploy.
import { editorialSearchWords } from '@/lib/editorials-source';
import { supabase } from '@/lib/supabase';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { wordsOf } from '@/lib/search/words';

export const revalidate = false;
export const dynamic = 'force-static';

export async function GET() {
  const words = await editorialSearchWords();
  const { data: rows, error } = await cachedQuery(['q:app/reports/search-index/route.ts:briefings'], tableTags('briefings'), () => supabase
    .from('briefings')
    .select('slug, body')
    .eq('is_published', true)
    .not('published_at', 'is', null));
  if (error && error.code !== 'PGRST116') throw new Error(`/reports/search-index briefings: ${error.message}`);
  for (const r of (rows ?? []) as { slug: string; body: string | null }[]) words[`/briefings/${r.slug}`] = [...new Set(wordsOf(r.body ?? ''))].join(' ');
  return Response.json(words, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400' } });
}
