// /councils/search?q=... — Full results page for the homepage's local
// authority search bar. The search bar's typeahead dropdown already lets
// a visitor click straight through to a single council, but this page is
// the destination when they press Enter/Search instead — same role as
// /tools/welfare/search plays for the welfare explorer's search bar.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';

export const dynamic = 'force-dynamic';

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const PARCHMENT_CREAM = '#efe6d2';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

type Council = {
  slug: string;
  name: string;
  short_name: string | null;
  type_label: string;
  country: string;
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `"${q}" — Council search` : 'Council search',
    alternates: { canonical: '/councils/search' },
  };
}

async function search(q: string): Promise<Council[]> {
  if (q.trim().length < 2) return [];
  // Same sanitisation as /api/councils/search, for the same reason:
  // strip characters with special meaning in PostgREST's ilike/or syntax.
  const safe = q.trim().replace(/[%_,()]/g, '');
  if (safe.length < 2) return [];
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from('councils')
    .select('slug, name, short_name, type_label, country')
    .or(`name.ilike.${pattern},short_name.ilike.${pattern}`)
    .order('name', { ascending: true })
    .limit(50);
  if (error) {
    console.error('councils search page error:', error.message);
    return [];
  }
  return (data || []) as Council[];
}

export default async function CouncilSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const results = await search(q);

  return (
    <OpenGovShell pageStamp="Councils">
      <BackLink
        fallbackHref="/councils"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />
      <article
        style={{
          background: `${PARCHMENT_CREAM} url('/bill-parchment.webp') center top / 100% auto repeat-y`,
          border: '1px solid rgba(26,20,14,0.3)',
          boxShadow: '0 1px 0 rgba(26,20,14,0.05), 0 22px 44px -22px rgba(26,20,14,0.35)',
          padding: 'clamp(28px, 4vw, 56px) clamp(24px, 4vw, 60px)',
          color: '#1a140e',
          fontFamily: SERIF,
        }}
      >
        <header
          style={{
            borderTop: `1.5px solid ${INK}`,
            borderBottom: `1.5px solid ${INK}`,
            padding: '14px 12px',
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            Council search
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            {q ? `Results for "${q}"` : 'Search for a council'}
          </h1>
        </header>

        {!q && (
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK_SOFT, margin: 0 }}>
            Enter a council or area name from the homepage search bar, or{' '}
            <a href="/councils" style={{ color: INK, textDecoration: 'underline' }}>browse the full list</a>.
          </p>
        )}

        {q && results.length === 0 && (
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK_SOFT, margin: 0 }}>
            No councils matched &ldquo;{q}&rdquo;. Try a different spelling, or{' '}
            <a href="/councils" style={{ color: INK, textDecoration: 'underline' }}>browse the full list</a>.
          </p>
        )}

        {results.length > 0 && (
          <>
            <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginBottom: '16px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '6px' }}>
              {results.length} match{results.length === 1 ? '' : 'es'}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {results.map((c) => (
                <li key={c.slug}>
                  <a
                    href={`/councils/${c.slug}`}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px',
                      padding: '10px 4px', textDecoration: 'none', color: INK, fontFamily: SERIF, fontSize: '17px',
                      borderBottom: `1px solid ${INK_HAIRLINE}`,
                    }}
                  >
                    <span>{c.short_name || c.name}</span>
                    <span style={{ fontSize: '13px', color: INK_SOFT, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {c.type_label} · {c.country}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </OpenGovShell>
  );
}
