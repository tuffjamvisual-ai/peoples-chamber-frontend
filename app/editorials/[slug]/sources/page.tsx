// /editorials/<slug>/sources: every record an investigation was checked against (added 23 Oct 2026). The article's
// evidence panel links here as one "Sources (N)" line. Not indexed; not in the sitemap.
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import SourcesPage from '../../../components/SourcesPage';
import { getEditorial } from '@/lib/editorials-source';
import type { EditorialEntry } from '@/lib/editorials/types';

export const revalidate = 86400;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const piece = await getEditorial(slug);
  if (!piece || piece.kind === 'briefing') return { title: 'Sources', robots: { index: false, follow: true } };
  return {
    title: `Sources: ${piece.headline}`,
    alternates: { canonical: `/editorials/${slug}/sources` },
    robots: { index: false, follow: true },
  };
}

export default async function EditorialSourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const piece = (await getEditorial(slug)) as EditorialEntry | undefined;
  if (!piece) notFound();
  if (piece.kind === 'briefing') permanentRedirect(`/briefings/${slug}/sources`);
  const records = piece.evidence?.recordsReviewed ?? [];
  if (!records.length) notFound();
  return (
    <SourcesPage stamp="Reports" articleHref={`/editorials/${slug}`} headline={piece.headline} records={records} lastChecked={piece.evidence?.lastChecked} />
  );
}
