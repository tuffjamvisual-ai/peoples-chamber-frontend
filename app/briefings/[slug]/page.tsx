// Briefing article route. Two sources, checked in order:
//   1. File-based editorial registry (hand-written pieces flagged kind:'briefing')
//      -> rendered with the shared EditorialArticle renderer.
//   2. The DB `briefings` table (cron-generated), published rows with a publish date only.
// Anything matching neither 404s.
// A piece in the registry that is not a briefing (an ordinary editorial) goes permanently to /editorials/<slug> (owner,
// 7 Nov 2026, K4; Search Console: /briefings/ck8m2wq7x3 and /briefings/rm9x2qk7v4 were 404s, Google chose the
// /editorials address). No slug is both an editorial and a database briefing (checked 7 Nov 2026).

import type { Metadata } from 'next';
import { proseDescription } from '@/lib/meta-description';
import { titleWithin } from '@/lib/seo-title';
import { notFound, permanentRedirect } from 'next/navigation';
import EditorialArticle from '../../components/EditorialArticle';
import BriefingArticle, { type BriefingRow } from './BriefingArticle';
import { getEditorial } from '@/lib/editorials-source';
import type { EditorialEntry } from '@/lib/editorials/types';
import { supabaseAdminRead as supabaseAdmin } from '@/lib/supabase-admin';

// Dynamic so DB drafts are viewable immediately after the cron run and a flip to
// published shows without a rebuild. File-based briefings render fine here too.
export const dynamic = 'force-dynamic';



// Published rows only (owner, 5 Nov 2026): a draft, or a row with no publish date, is a real 404 with nothing of it in the response.
async function getDbBriefing(slug: string): Promise<BriefingRow | null> {
  const { data, error: dataErr } = await supabaseAdmin
    .from('briefings')
    .select('slug, headline, body, sources, is_published, published_at, created_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .not('published_at', 'is', null)
    .maybeSingle();
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`/briefings/[slug] briefings: ${dataErr.message}`);
  return (data as BriefingRow) ?? null;
}


// Search title, the same rule as reports (owner, 5 Nov 2026): the full headline, never shortened, with the site's name
// when that fits in 60 characters.
function searchTitle(headline: string): Metadata['title'] {
  return titleWithin(headline);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const piece = await getEditorial(slug);
  if (piece && piece.kind !== 'briefing') permanentRedirect(`/editorials/${slug}`);
  if (piece && piece.kind === 'briefing') {
    return {
      title: searchTitle(piece.headline),
      description: proseDescription(piece.standfirst, piece.headline),
      alternates: { canonical: `/briefings/${slug}` },
    };
  }
  const b = await getDbBriefing(slug);
  if (b) {
    return {
      title: searchTitle(b.headline),
      description: proseDescription(b.body, b.headline),
      alternates: { canonical: `/briefings/${slug}` },
    };
  }
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  notFound();
}

export default async function BriefingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. File-based briefing.
  const piece = (await getEditorial(slug)) as EditorialEntry | undefined;
  if (piece && piece.kind !== 'briefing') permanentRedirect(`/editorials/${slug}`);
  if (piece && piece.kind === 'briefing') {
    return <EditorialArticle piece={piece} stamp="Reports" backHref="/reports" basePath="/briefings" />;
  }

  // 2. DB briefing (cron-generated), published only.
  const b = await getDbBriefing(slug);
  if (!b) notFound();

  return <BriefingArticle b={b} slug={slug} />;
}
