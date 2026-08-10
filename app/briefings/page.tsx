import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { editorials } from '@/lib/editorials';
import type { EditorialEntry } from '@/lib/editorials/types';
import { supabase } from '@/lib/supabase';

// Briefings: short daily news analysis, distinct from long-form Investigations.
// Two sources, merged: hand-written registry entries flagged kind:'briefing',
// and PUBLISHED rows from the DB `briefings` table (cron-generated, reviewed and
// flipped live). Drafts (is_published = false) are excluded by RLS + the filter.
// Dynamic so a manual publish-flip appears immediately.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Briefings',
  description: 'Daily news analysis from opengovt: the fact-checked story behind the day’s biggest political events.',
  alternates: { canonical: '/briefings' },
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

interface Item {
  slug: string;
  kicker: string;
  headline: string;
  standfirst: string;
  dateISO: string;
}

export default async function BriefingsIndexPage() {
  const fileItems: Item[] = (Object.values(editorials) as EditorialEntry[])
    .filter((e) => e.kind === 'briefing')
    .map((e) => ({ slug: e.slug, kicker: e.kicker || 'Briefing', headline: e.headline, standfirst: e.standfirst, dateISO: e.publishedAt }));

  const { data: dbRows } = await supabase
    .from('briefings')
    .select('slug, headline, body, published_at, created_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  const dbItems: Item[] = (dbRows ?? []).map((r) => ({
    slug: r.slug as string,
    kicker: 'Daily Briefing',
    headline: r.headline as string,
    standfirst: String(r.body || '').replace(/\s+/g, ' ').slice(0, 180).trim() + '…',
    dateISO: (r.published_at as string) || (r.created_at as string),
  }));

  const items = [...fileItems, ...dbItems].sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));

  return (
    <OpenGovShell pageStamp="Briefings">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(12px, 1.6vw, 19px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.05, marginBottom: '14px' }}>
          Briefings
        </h1>
      </header>

      <div style={{ borderTop: `1px solid ${HAIRLINE}`, fontFamily: '"Special Elite", monospace' }}>
        {items.length === 0 && <p style={{ padding: '22px 0', color: INK }}>No briefings yet.</p>}
        {items.map((e) => (
          <Link
            key={e.slug}
            href={`/briefings/${e.slug}`}
            className="no-hover-scale"
            style={{ display: 'block', padding: '22px 0', borderBottom: `1px solid ${HAIRLINE}`, textDecoration: 'none', color: INK }}
          >
            <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.28em', color: ACCENT, fontWeight: 'bold', marginBottom: '8px' }}>
              {e.kicker}
            </div>
            <h2 style={{ fontFamily: '"Special Elite", monospace', fontSize: 'clamp(22px, 2.6vw, 32px)', fontWeight: 'bold', letterSpacing: '0.01em', lineHeight: 1.1, marginBottom: '8px' }}>
              {e.headline} <span style={{ color: ACCENT }}>&rarr;</span>
            </h2>
            <p style={{ fontFamily: '"Special Elite", monospace', fontSize: '17px', lineHeight: 1.45, color: INK_SOFT, marginBottom: '8px' }}>
              {e.standfirst}
            </p>
            <div style={{ fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: INK_SOFT }}>
              {new Date(e.dateISO).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </Link>
        ))}
      </div>
    </OpenGovShell>
  );
}
