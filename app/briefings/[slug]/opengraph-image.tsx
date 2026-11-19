// Share image for each briefing (owner, 19 Nov 2026, Cowork ENTRY 397: "same for briefings"): the briefing's headline on
// the folder colour with the red stamp (lib/og-card.tsx). The headline comes from the same two places as the page: a
// briefing in the editorials registry, else the published row in the briefings table (the same cached read, key and tag,
// as app/briefings/[slug]/page.tsx). A briefing that is not published gets the plain site line, as on other cards.

import { ogCard } from '@/lib/og-card';
import { getEditorial } from '@/lib/editorials-source';
import { supabaseAdminRead as supabaseAdmin } from '@/lib/supabase-admin';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

export const alt = 'Briefing headline from opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const piece = await getEditorial(slug);
  if (piece) return ogCard({ title: piece.headline });
  const { data } = await cachedQuery(['q:app/briefings/[slug]/page.tsx:2671c1fea1', JSON.stringify([slug])], tableTags('briefings'), () => supabaseAdmin
    .from('briefings')
    .select('slug, headline, body, sources, is_published, published_at, created_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .not('published_at', 'is', null)
    .maybeSingle());
  const headline = (data as { headline?: string } | null)?.headline;
  return ogCard({ title: headline || 'UK politics, in the open' });
}
