// Investigations article route. Briefings used to live here; they now live at
// /briefings/[slug], so a briefing slug permanently redirects there (belt and
// suspenders alongside the next.config redirects).

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import EditorialArticle from '../../components/EditorialArticle';
import { editorials } from '@/lib/editorials';
import type { EditorialEntry } from '@/lib/editorials/types';
import JsonLd, { buildEditorialArticle } from '@/lib/JsonLd';

export const revalidate = 86400;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const piece = editorials[slug];
  if (!piece || piece.kind === 'briefing') return { title: 'Editorial' };
  const SITE_URL = 'https://www.opengovt.uk';
  const description = piece.standfirst.slice(0, 200);
  const canonical = `/editorials/${slug}`;
  const ogImage = `${SITE_URL}/og-image.png`;
  return {
    title: `${piece.headline}`,
    description,
    alternates: { canonical },
    // Per-article OG/Twitter. Re-declare the default image because Next.js
    // shallow-merges metadata: setting openGraph here drops the root layout's
    // openGraph.images unless we repeat them.
    openGraph: {
      type: 'article',
      siteName: 'opengovt',
      title: piece.headline,
      description,
      url: `${SITE_URL}${canonical}`,
      locale: 'en_GB',
      images: [{ url: ogImage, width: 1200, height: 630, type: 'image/png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: piece.headline,
      description,
      images: [ogImage],
    },
  };
}

export default async function EditorialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const piece = editorials[slug] as EditorialEntry | undefined;
  if (!piece) notFound();
  if (piece.kind === 'briefing') permanentRedirect(`/briefings/${slug}`);
  return (
    <>
      <JsonLd
        data={buildEditorialArticle({
          slug,
          headline: piece.headline,
          description: piece.standfirst ?? null,
          datePublished: piece.publishedAt ?? null,
          author: piece.authorByline ?? null,
        })}
      />
      <EditorialArticle piece={piece} stamp="Investigations" backHref="/editorials" />
    </>
  );
}
