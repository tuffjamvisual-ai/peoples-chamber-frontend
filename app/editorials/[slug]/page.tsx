// Investigations article route. Briefings used to live here; they now live at
// /briefings/[slug], so a briefing slug permanently redirects there (belt and
// suspenders alongside the next.config redirects).

import type { Metadata } from 'next';
import { metaDescription } from '@/lib/meta-description';
import { TITLE_SUFFIX, TITLE_MAX } from '@/lib/seo-title';
import { notFound, permanentRedirect } from 'next/navigation';
import EditorialArticle from '../../components/EditorialArticle';
import { editorialReadNext } from '@/lib/read-next';
import { editorials } from '@/lib/editorials';
import type { EditorialEntry } from '@/lib/editorials/types';
import JsonLd, { buildEditorialArticle, buildBreadcrumbs } from '@/lib/JsonLd';

export const revalidate = 86400;
// Every investigation is built at build time (25 Oct 2026, report 43): the pieces live in the code (lib/editorials), so
// building them costs no database time, and visitors no longer wait for a render after each deploy (the first visit
// to each piece used to render it, p95 about 1 s). Briefings are left out: they redirect to /briefings/[slug].
export function generateStaticParams() {
  return Object.entries(editorials).filter(([, p]) => p.kind !== 'briefing').map(([slug]) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const piece = editorials[slug];
  if (!piece || piece.kind === 'briefing') return { title: 'Editorial' };
  const SITE_URL = 'https://www.opengovt.uk';
  // Description (owner's approval, 24 Oct 2026): the piece's summary where it has one, else its standfirst; the same
  // text goes to openGraph and twitter.
  const description = metaDescription(piece.summary?.trim() ? piece.summary : piece.standfirst);
  const canonical = `/editorials/${slug}`;
  // Each piece's own share image (./opengraph-image.tsx, 23 Oct 2026). Next.js fills og:image from that file; the
  // same address is given here so twitter:image points to it as well.
  const ogImage = `${SITE_URL}${canonical}/opengraph-image`;
  return {
    // Search title (owner's approval, 24 Oct 2026): a headline that would take the full title past 60 characters with
    // the " | opengovt" suffix is used on its own; shorter ones keep the suffix (lib/seo-title.ts).
    title: piece.headline.length + TITLE_SUFFIX.length > TITLE_MAX ? { absolute: piece.headline } : piece.headline,
    description,
    alternates: { canonical },
    // Per-article OG/Twitter, each with the piece's own image.
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
          lastChecked: piece.evidence?.lastChecked ?? null,
        })}
      />
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Reports', path: '/reports' }, { name: piece.headline, path: `/editorials/${slug}` }])} />
      <EditorialArticle piece={piece} stamp="Reports" backHref="/reports" basePath="/editorials" readNext={await editorialReadNext(piece)} />
    </>
  );
}
