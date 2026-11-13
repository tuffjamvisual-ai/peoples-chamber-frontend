// Investigations article route. Briefings used to live here; they now live at
// /briefings/[slug], so a briefing slug permanently redirects there (belt and
// suspenders alongside the next.config redirects).

import type { Metadata } from 'next';
import { proseDescription } from '@/lib/meta-description';
import { titleWithin } from '@/lib/seo-title';
import { notFound, permanentRedirect } from 'next/navigation';
import EditorialArticle from '../../components/EditorialArticle';
import { editorialRelated, namedMps } from '@/lib/related-links';
import { getEditorial, editorialSlugsFor } from '@/lib/editorials-source';
import type { EditorialEntry } from '@/lib/editorials/types';
import JsonLd, { buildEditorialArticle, buildBreadcrumbs } from '@/lib/JsonLd';

export const revalidate = 86400;
// Every investigation is built at build time (25 Oct 2026, report 43), so visitors no longer wait for a render after each deploy (the first visit
// to each piece used to render it, p95 about 1 s). Briefings are left out: they redirect to /briefings/[slug].
export async function generateStaticParams() {
  return (await editorialSlugsFor('investigation')).map((slug) => ({ slug }));
}
// A piece published after the build renders on its first visit (lib/editorials-source.ts, 29 Oct 2026).
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const piece = await getEditorial(slug);
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!piece) notFound();
  if (piece.kind === 'briefing') permanentRedirect(`/briefings/${slug}`);
  const SITE_URL = 'https://www.opengovt.uk';
  // Description (owner's approval, 24 Oct 2026): the piece's summary where it has one, else its standfirst; the same
  // text goes to openGraph and twitter.
  // Whole sentences only since L6 (7 Nov 2026), the headline where the first sentence is over 160 characters.
  const description = proseDescription(piece.summary?.trim() ? piece.summary : piece.standfirst, piece.headline);
  const canonical = `/editorials/${slug}`;
  // Each piece's own share image (./opengraph-image.tsx, 23 Oct 2026). Next.js fills og:image from that file; the
  // same address is given here so twitter:image points to it as well.
  const ogImage = `${SITE_URL}${canonical}/opengraph-image`;
  return {
    // Search title (owner's approval, 24 Oct 2026): a headline that would take the full title past 60 characters with
    // the " | opengovt" suffix is used on its own; shorter ones keep the suffix (lib/seo-title.ts).
    // The full headline, never shortened (owner, 5 Nov 2026), with the site's name when that fits in 60 characters.
    title: titleWithin(piece.headline),
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
  const piece = (await getEditorial(slug)) as EditorialEntry | undefined;
  if (!piece) notFound();
  if (piece.kind === 'briefing') permanentRedirect(`/briefings/${slug}`);
  // The MPs the piece names: the NewsArticle's mentions and the first of the Related links (owner's brief, 3 Nov 2026).
  // A failed read leaves both without them.
  const mps = await namedMps(piece.relatedMemberIds).catch((e) => {
    console.error(`/editorials/${slug} named MPs:`, e instanceof Error ? e.message : String(e));
    return [];
  });
  const related = await editorialRelated(piece, mps);
  return (
    <>
      <JsonLd
        data={buildEditorialArticle({
          slug,
          headline: piece.headline,
          // The same text as the meta description: the summary where the piece has one (owner's brief, 3 Nov 2026).
          description: piece.summary?.trim() ? piece.summary : (piece.standfirst ?? null),
          datePublished: piece.publishedAt ?? null,
          author: piece.authorByline ?? null,
          updateNote: piece.updateNote ?? null,
          mentions: mps,
        })}
      />
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Reports', path: '/reports' }, { name: piece.headline, path: `/editorials/${slug}` }])} />
      <EditorialArticle piece={piece} stamp="Reports" backHref="/reports" basePath="/editorials" related={related} />
    </>
  );
}
