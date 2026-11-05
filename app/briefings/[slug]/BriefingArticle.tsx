// The page of a daily briefing from the briefings table, used by /briefings/[slug] and by the owner's private preview, so
// a draft is seen exactly as it will look. banner and sourcesHref are for the preview.
import type { ReactNode } from 'react';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import ArticleEndSignup from '../../components/ArticleEndSignup';
import { textReadingLabel } from '@/lib/reading-time';

const INK = '#14100d';
const INK_SOFT = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export interface BriefingRow {
  slug: string;
  headline: string;
  body: string;
  sources: unknown;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export default function BriefingArticle({ b, slug, banner, sourcesHref }: { b: BriefingRow; slug: string; banner?: ReactNode; sourcesHref?: string }) {
  const paragraphs = b.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const sourceCount = Array.isArray(b.sources) ? (b.sources as unknown[]).filter((s) => typeof s === 'string').length : 0;

  return (
    <OpenGovShell pageStamp="Reports">
      {banner}
      <BackLink
        fallbackHref="/reports"
        label="← Reports"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />


      <header style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', color: ACCENT, fontWeight: 'bold', marginBottom: '10px' }}>
          Daily Briefing
        </div>
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(24px, 3.4vw, 40px)', fontWeight: 'bold', lineHeight: 1.12, letterSpacing: '0.01em', marginBottom: '12px' }}>
          {b.headline}
        </h1>
        {(b.published_at || b.created_at) && (
          <div style={{ fontFamily: MONO, fontSize: '15px', color: INK_SOFT, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {new Date(b.published_at || b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {textReadingLabel(b.headline, b.body)}
          </div>
        )}
      </header>

      <article style={{ maxWidth: '680px', fontSize: '18px', lineHeight: 1.75, color: INK }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: '0 0 18px' }}>{p}</p>
        ))}
      </article>

      {/* Newsletter sign-up after the briefing text, for readers who are not signed in (report 81). */}
      <div style={{ maxWidth: '680px' }}><ArticleEndSignup source="article-end-briefings-db" /></div>

      {/* Sources checked by the automated fact-check pipeline: one link to /briefings/<slug>/sources, which lists
          them (23 Oct 2026). */}
      {sourceCount > 0 && (
        <aside
          aria-label="Sources checked"
          style={{ marginTop: '36px', border: `1px solid ${HAIRLINE}`, borderTop: `3px solid ${ACCENT}`, padding: '16px 18px 10px', background: 'rgba(107,36,23,0.03)' }}
        >
          <p style={{ fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', color: ACCENT, margin: '0 0 10px' }}>
            Sources checked
          </p>
          <p style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 6px', lineHeight: 1.5 }}>
            <Link href={sourcesHref ?? `/briefings/${slug}/sources`} className="og-tap" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Sources ({sourceCount})</Link>
          </p>
        </aside>
      )}
    </OpenGovShell>
  );
}
