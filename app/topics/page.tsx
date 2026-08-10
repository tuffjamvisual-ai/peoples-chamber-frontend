import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { topics } from '@/lib/topics';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Policy Topics',
  description:
    'Every major policy area in one place: the department behind it, recent Commons votes, bills before Parliament, the MPs scrutinising it most, and where the public stands.',
  alternates: { canonical: '/topics' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'Special Elite, monospace';

// First sentence of the blurb, for the index card.
function firstSentence(s: string) {
  const m = s.match(/^.*?[.](\s|$)/);
  return m ? m[0].trim() : s;
}

export default function TopicsIndexPage() {
  return (
    <OpenGovShell pageStamp="Topics">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Policy Topics
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK }}>
          Each topic gathers everything the site holds on a policy area in one place: the department responsible and how it is performing, the most recent Commons votes, the bills going through Parliament, the MPs scrutinising it hardest, the editorials, and where the public stands.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {topics.map((t) => (
          <Link
            key={t.slug}
            href={`/topics/${t.slug}`}
            className="no-hover-scale"
            style={{ display: 'block', textDecoration: 'none', color: INK, border: `1px solid ${HAIRLINE}`, padding: '18px 20px', background: 'rgba(122,22,18,0.02)' }}
          >
            <div style={{ fontFamily: MONO, fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 'bold', marginBottom: '8px' }}>
              {t.title} <span style={{ color: ACCENT }}>→</span>
            </div>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0 }}>{firstSentence(t.blurb)}</p>
          </Link>
        ))}
      </div>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}
