// /briefings/<slug>/sources: the sources of a briefing (added 23 Oct 2026). A file briefing lists its records as on
// /editorials/<slug>/sources; a database briefing lists its string sources as plain text, as its article page used
// to. Dynamic like the article, so drafts work by direct link. Never indexed; not in the sitemap.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import SourcesPage, { backStyle, kickerStyle, h1Style } from '../../../components/SourcesPage';
import { editorials } from '@/lib/editorials';
import type { EditorialEntry } from '@/lib/editorials/types';
import { supabaseAdminRead as supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const INK = '#14100d';
const MONO = '"Special Elite", monospace';

async function getDbBriefing(slug: string): Promise<{ headline: string; sources: string[] } | null> {
  const { data, error } = await supabaseAdmin.from('briefings').select('headline, sources').eq('slug', slug).maybeSingle();
  if (error && error.code !== 'PGRST116') throw new Error(`/briefings/[slug]/sources briefings: ${error.message}`);
  if (!data) return null;
  const sources = Array.isArray(data.sources) ? (data.sources as unknown[]).filter((s): s is string => typeof s === 'string') : [];
  return { headline: data.headline as string, sources };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const piece = editorials[slug];
  const headline = piece && piece.kind === 'briefing' ? piece.headline : (await getDbBriefing(slug))?.headline;
  return {
    title: headline ? `Sources: ${headline}` : 'Sources',
    alternates: { canonical: `/briefings/${slug}/sources` },
    robots: { index: false, follow: true },
  };
}

export default async function BriefingSourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const articleHref = `/briefings/${slug}`;

  const piece = editorials[slug] as EditorialEntry | undefined;
  if (piece && piece.kind === 'briefing') {
    const records = piece.evidence?.recordsReviewed ?? [];
    if (!records.length) notFound();
    return <SourcesPage stamp="Reports" articleHref={articleHref} headline={piece.headline} records={records} lastChecked={piece.evidence?.lastChecked} />;
  }

  const b = await getDbBriefing(slug);
  if (!b || !b.sources.length) notFound();
  return (
    <OpenGovShell pageStamp="Reports">
      <BackLink fallbackHref={articleHref} label="← Back to article" className="no-hover-scale" style={backStyle} />
      <header>
        <div style={kickerStyle}>Sources</div>
        <h1 style={h1Style}>
          <Link href={articleHref} style={{ color: INK, textDecoration: 'none' }}>{b.headline}</Link>
        </h1>
      </header>
      <div style={{ maxWidth: '760px' }}>
        {b.sources.map((src, i) => (
          <p key={i} style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: '0 0 6px', wordBreak: 'break-all', lineHeight: 1.5 }}>
            {src}
          </p>
        ))}
      </div>
    </OpenGovShell>
  );
}
