import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { editorials } from '@/lib/editorials';
import type { EditorialEntry } from '@/lib/editorials/types';

// Auto-generated index of every editorial registered in lib/editorials.
// New pieces appear here automatically once registered in the registry.

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Editorials & Investigations',
  description: 'Long-form investigations and editorials from Open Govt.',
  alternates: { canonical: '/editorials' },
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

export default function EditorialsIndexPage() {
  const items = (Object.values(editorials) as EditorialEntry[]).sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0
  );

  return (
    <OpenGovShell pageStamp="Editorials">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(24px, 3.2vw, 38px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.05, marginBottom: '14px' }}>
          Editorials &amp; Investigations
        </h1>
        <p style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(17px, 1.6vw, 22px)', lineHeight: 1.5, fontStyle: 'italic', color: INK_SOFT, maxWidth: '720px' }}>
          Long-form investigations and editorials from Open Govt, each drawn from the public record.
        </p>
      </header>

      <div style={{ borderTop: `1px solid ${HAIRLINE}`, fontFamily: '"Special Elite", monospace' }}>
        {items.map((e) => (
          <Link
            key={e.slug}
            href={`/editorials/${e.slug}`}
            className="no-hover-scale"
            style={{ display: 'block', padding: '22px 0', borderBottom: `1px solid ${HAIRLINE}`, textDecoration: 'none', color: INK }}
          >
            {e.kicker && (
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.28em', color: ACCENT, fontWeight: 'bold', marginBottom: '8px' }}>
                {e.kicker}
              </div>
            )}
            <h2 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(22px, 2.6vw, 32px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.1, marginBottom: '8px' }}>
              {e.headline} <span style={{ color: ACCENT }}>&rarr;</span>
            </h2>
            <p style={{ fontFamily: '"Special Elite", monospace', fontSize: '17px', lineHeight: 1.45, color: INK_SOFT, marginBottom: '8px' }}>
              {e.standfirst}
            </p>
            <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: INK_SOFT }}>
              {new Date(e.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </Link>
        ))}
      </div>
    </OpenGovShell>
  );
}
