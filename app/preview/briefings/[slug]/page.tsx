// The owner's private preview of a briefing, exactly as it will look (lib/draft-preview.ts). Anyone else gets a real 404.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EditorialArticle from '../../../components/EditorialArticle';
import DraftBanner from '../../../components/DraftBanner';
import BriefingArticle from '../../../briefings/[slug]/BriefingArticle';
import { isDraftViewer, PREVIEW_ROBOTS, readBriefingAnyState, requireDraftViewer } from '@/lib/draft-preview';
import { readEditorialAnyState } from '@/lib/editorials-source';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!(await isDraftViewer())) return { robots: PREVIEW_ROBOTS };
  const { slug } = await params;
  const piece = await readEditorialAnyState(slug);
  const headline = piece?.kind === 'briefing' ? piece.headline : (await readBriefingAnyState(slug))?.headline;
  return { title: { absolute: headline ? `Draft: ${headline}` : 'Draft' }, robots: PREVIEW_ROBOTS };
}

export default async function PreviewBriefingPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireDraftViewer();
  const { slug } = await params;
  const piece = await readEditorialAnyState(slug);
  if (piece?.kind === 'briefing') {
    return <EditorialArticle piece={piece} stamp="Reports" backHref="/reports" basePath="/briefings" banner={<DraftBanner published={!piece.unpublished} />} sourcesHref={`/preview/briefings/${slug}/sources`} />;
  }
  const b = await readBriefingAnyState(slug);
  if (!b) notFound();
  return <BriefingArticle b={b} slug={slug} banner={<DraftBanner published={b.is_published && !!b.published_at} />} sourcesHref={`/preview/briefings/${slug}/sources`} />;
}
