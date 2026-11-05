// The owner's private preview of a report, exactly as it will look (lib/draft-preview.ts). Anyone else gets a real 404.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EditorialArticle from '../../../components/EditorialArticle';
import DraftBanner from '../../../components/DraftBanner';
import { isDraftViewer, PREVIEW_ROBOTS, requireDraftViewer } from '@/lib/draft-preview';
import { readEditorialAnyState } from '@/lib/editorials-source';
import { editorialRelated, namedMps } from '@/lib/related-links';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!(await isDraftViewer())) return { robots: PREVIEW_ROBOTS };
  const { slug } = await params;
  const piece = await readEditorialAnyState(slug);
  return { title: { absolute: piece ? `Draft: ${piece.headline}` : 'Draft' }, robots: PREVIEW_ROBOTS };
}

export default async function PreviewEditorialPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireDraftViewer();
  const { slug } = await params;
  const piece = await readEditorialAnyState(slug);
  if (!piece || piece.kind === 'briefing') notFound();
  const mps = await namedMps(piece.relatedMemberIds).catch(() => []);
  const related = await editorialRelated(piece, mps);
  return <EditorialArticle piece={piece} stamp="Reports" backHref="/reports" basePath="/editorials" related={related} banner={<DraftBanner published={!piece.unpublished} />} sourcesHref={`/preview/editorials/${slug}/sources`} />;
}
