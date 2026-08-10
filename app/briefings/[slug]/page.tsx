// Briefing article route. Two sources, checked in order:
//   1. File-based editorial registry (hand-written pieces flagged kind:'briefing')
//      -> rendered with the shared EditorialArticle renderer.
//   2. The DB `briefings` table (cron-generated). Read via the service-role client
//      so unpublished DRAFTS are viewable by direct link for review; drafts show a
//      banner and are noindex, only is_published rows are indexable + listed.
// Anything matching neither 404s.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EditorialArticle from '../../components/EditorialArticle';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import { editorials } from '@/lib/editorials';
import type { EditorialEntry } from '@/lib/editorials/types';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Dynamic so DB drafts are viewable immediately after the cron run and a flip to
// published shows without a rebuild. File-based briefings render fine here too.
export const dynamic = 'force-dynamic';

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';
const MONO = '"Special Elite", monospace';

interface BriefingRow {
  slug: string;
  headline: string;
  body: string;
  sources: unknown;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

async function getDbBriefing(slug: string): Promise<BriefingRow | null> {
  const { data } = await supabaseAdmin
    .from('briefings')
    .select('slug, headline, body, sources, is_published, published_at, created_at')
    .eq('slug', slug)
    .maybeSingle();
  return (data as BriefingRow) ?? null;
}


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const piece = editorials[slug];
  if (piece && piece.kind === 'briefing') {
    return {
      title: piece.headline,
      description: piece.standfirst.slice(0, 200),
      alternates: { canonical: `/briefings/${slug}` },
    };
  }
  const b = await getDbBriefing(slug);
  if (b) {
    return {
      title: b.headline,
      description: b.body.slice(0, 155),
      alternates: { canonical: `/briefings/${slug}` },
      ...(b.is_published ? {} : { robots: { index: false, follow: false } }),
    };
  }
  return { title: 'Briefing' };
}

export default async function BriefingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. File-based briefing.
  const piece = editorials[slug] as EditorialEntry | undefined;
  if (piece && piece.kind === 'briefing') {
    return <EditorialArticle piece={piece} stamp="Briefing" backHref="/briefings" />;
  }

  // 2. DB briefing (cron-generated). Drafts render for review; published render normally.
  const b = await getDbBriefing(slug);
  if (!b) notFound();

  const paragraphs = b.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <OpenGovShell pageStamp="Briefing">
      <BackLink
        fallbackHref="/briefings"
        label="← Briefings"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      {!b.is_published && (
        <div style={{ margin: '0 0 20px', padding: '10px 14px', border: `1px solid ${ACCENT}`, background: 'rgba(122,22,18,0.06)', fontFamily: MONO, fontSize: '15px', color: ACCENT }}>
          DRAFT — auto-generated, pending review. Not public, not listed, not indexed. Verify every claim before publishing.
        </div>
      )}

      <header style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', color: ACCENT, fontWeight: 'bold', marginBottom: '10px' }}>
          Daily Briefing
        </div>
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(24px, 3.4vw, 40px)', fontWeight: 'bold', lineHeight: 1.12, letterSpacing: '0.01em', marginBottom: '12px' }}>
          {b.headline}
        </h1>
        {(b.published_at || b.created_at) && (
          <div style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {new Date(b.published_at || b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
      </header>

      {/* In-text attribution (named report/minister/figure within sentences) is
          the only sourcing on published briefings. The separate bottom-of-article
          "Sources" list was removed by request; b.sources is still stored in the
          DB for audit and the automated fact-check, just not rendered here. */}
      <article style={{ maxWidth: '680px', fontSize: '18px', lineHeight: 1.75, color: INK }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: '0 0 18px' }}>{p}</p>
        ))}
      </article>
    </OpenGovShell>
  );
}
