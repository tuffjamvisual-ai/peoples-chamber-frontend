// The owner's private preview of a report's sources (lib/draft-preview.ts). Anyone else gets a real 404.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SourcesPage from '../../../../components/SourcesPage';
import DraftBanner from '../../../../components/DraftBanner';
import { isDraftViewer, PREVIEW_ROBOTS, requireDraftViewer } from '@/lib/draft-preview';
import { readEditorialAnyState } from '@/lib/editorials-source';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  if (!(await isDraftViewer())) return { robots: PREVIEW_ROBOTS };
  return { title: { absolute: 'Draft: sources' }, robots: PREVIEW_ROBOTS };
}

export default async function PreviewEditorialSourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireDraftViewer();
  const { slug } = await params;
  const piece = await readEditorialAnyState(slug);
  if (!piece || piece.kind === 'briefing') notFound();
  const records = piece.evidence?.recordsReviewed ?? [];
  if (!records.length) notFound();
  return <SourcesPage stamp="Reports" articleHref={`/preview/editorials/${slug}`} headline={piece.headline} records={records} banner={<DraftBanner published={!piece.unpublished} />} />;
}
