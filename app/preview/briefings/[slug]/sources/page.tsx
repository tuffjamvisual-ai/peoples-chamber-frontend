// The owner's private preview of a briefing's sources (lib/draft-preview.ts). Anyone else gets a real 404.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../../components/OpenGovShell';
import BackLink from '../../../../components/BackLink';
import DraftBanner from '../../../../components/DraftBanner';
import SourcesPage, { backStyle, kickerStyle, h1Style } from '../../../../components/SourcesPage';
import { isDraftViewer, PREVIEW_ROBOTS, readBriefingAnyState, requireDraftViewer } from '@/lib/draft-preview';
import { readEditorialAnyState } from '@/lib/editorials-source';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  if (!(await isDraftViewer())) return { robots: PREVIEW_ROBOTS };
  return { title: { absolute: 'Draft: sources' }, robots: PREVIEW_ROBOTS };
}

export default async function PreviewBriefingSourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireDraftViewer();
  const { slug } = await params;
  const articleHref = `/preview/briefings/${slug}`;
  const piece = await readEditorialAnyState(slug);
  if (piece?.kind === 'briefing') {
    const records = piece.evidence?.recordsReviewed ?? [];
    if (!records.length) notFound();
    return <SourcesPage stamp="Reports" articleHref={articleHref} headline={piece.headline} records={records} banner={<DraftBanner published={!piece.unpublished} />} />;
  }
  const b = await readBriefingAnyState(slug);
  const sources = Array.isArray(b?.sources) ? (b.sources as unknown[]).filter((s): s is string => typeof s === 'string') : [];
  if (!b || !sources.length) notFound();
  return (
    <OpenGovShell pageStamp="Reports">
      <DraftBanner published={b.is_published && !!b.published_at} />
      <BackLink fallbackHref={articleHref} label="← Back to article" className="no-hover-scale" style={backStyle} />
      <header>
        <div style={kickerStyle}>Sources</div>
        <h1 style={h1Style}><Link href={articleHref} style={{ color: '#14100d', textDecoration: 'none' }}>{b.headline}</Link></h1>
      </header>
      <div style={{ maxWidth: '760px' }}>
        {sources.map((src, i) => (
          <p key={i} style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: '#14100d', margin: '0 0 6px', wordBreak: 'break-all' }}>{src}</p>
        ))}
      </div>
    </OpenGovShell>
  );
}
