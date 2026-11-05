// The owner's private preview of a policy programme, exactly as it will look (lib/draft-preview.ts). Anyone else gets a real 404.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DraftBanner from '../../../components/DraftBanner';
import ProgrammeArticle from '../../../programmes/[slug]/ProgrammeArticle';
import { isDraftViewer, PREVIEW_ROBOTS, requireDraftViewer } from '@/lib/draft-preview';
import { getProgramme, getTimeline } from '@/lib/programmes';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!(await isDraftViewer())) return { robots: PREVIEW_ROBOTS };
  const { slug } = await params;
  const prog = await getProgramme(slug);
  return { title: { absolute: prog ? `Draft: ${prog.name}` : 'Draft' }, robots: PREVIEW_ROBOTS };
}

export default async function PreviewProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireDraftViewer();
  const { slug } = await params;
  const prog = await getProgramme(slug);
  if (!prog) notFound();
  // A draft shows all its timeline entries; a live programme what the public page shows.
  const timeline = await getTimeline(prog.id, !prog.is_live);
  return <ProgrammeArticle prog={prog} timeline={timeline} banner={<DraftBanner published={prog.is_live} />} />;
}
