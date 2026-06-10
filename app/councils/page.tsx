// /councils — Local government index. All 382 UK principal authorities
// (164 districts, 116 unitaries, 36 met-boroughs, 33 London boroughs,
// 21 county councils, 11 Northern Irish councils, 1 Isles of Scilly)
// grouped by country and type, each linking into /councils/[slug].
//
// Seeded from mySociety MapIt on 2026-06-03. Most rows are still
// thin — political_control, leader, budget etc. will land in
// follow-up phases. The listing is the foundation.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Local Government | The People’s Chamber',
  description:
    'Every UK principal local authority, county, district, unitary, metropolitan and London boroughs, and Northern Irish councils, 382 in total.',
  alternates: { canonical: '/councils' },
};

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
  type: string;
  type_label: string;
  country: string;
  political_control: string | null;
  leader_name: string | null;
};

const COUNTRY_ORDER = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
const TYPE_ORDER = ['county', 'lon-borough', 'met-borough', 'unitary', 'district', 'ni-council', 'sui-generis'];

async function getAll(): Promise<Council[]> {
  // Supabase default range limit is 1000 — fine for 382 rows.
  const { data, error } = await supabase
    .from('councils')
    .select('slug, name, short_name, type, type_label, country, political_control, leader_name')
    .order('country', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    console.error('councils fetch error:', error);
    return [];
  }
  return (data || []) as Council[];
}

export default async function CouncilsIndex() {
  const all = await getAll();
  // Group: country -> type -> councils
  const grouped: Record<string, Record<string, Council[]>> = {};
  for (const c of all) {
    (grouped[c.country] ||= {});
    (grouped[c.country][c.type] ||= []).push(c);
  }

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: '#14100d', textDecoration: 'none', fontFamily: 'Special Elite, monospace', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
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
          <div style={{ fontFamily: SERIF, fontSize: '12px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            United Kingdom · Principal Authorities · {all.length}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Local Government
          </h1>
        </header>

        <p
          style={{
            fontFamily: MONO,
            fontSize: 'clamp(13px, 1.15vw, 14px)',
            lineHeight: 1.75,
            textAlign: 'justify',
            margin: '0 auto 28px',
            maxWidth: '46em',
            color: INK,
          }}
        >
          Every UK principal authority, county councils, district councils, unitaries, metropolitan
          and London boroughs, and Northern Irish councils. 382 in total. Click any council to read
          who runs it, how much it spends, and what it does. Political control, leadership and
          budgets are being added in stages; most rows still carry only the foundation data.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {COUNTRY_ORDER.filter((c) => grouped[c]).map((country) => {
            const byType = grouped[country];
            const countryTotal = Object.values(byType).reduce((a, b) => a + b.length, 0);
            return (
              <section key={country} style={{ borderTop: `3px solid ${INK}`, paddingTop: '18px' }}>
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 30px)', lineHeight: 1.15, marginBottom: '4px' }}>
                  {country}
                </div>
                <div style={{ fontFamily: MONO, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginBottom: '20px' }}>
                  {countryTotal} principal authorities
                </div>
                {TYPE_ORDER.filter((t) => byType[t]).map((type) => {
                  const items = byType[type];
                  return (
                    <div key={type} style={{ marginBottom: '24px' }}>
                      <div style={{ fontFamily: MONO, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginBottom: '8px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '6px' }}>
                        {items[0].type_label}{items.length > 1 ? 's' : ''} · {items.length}
                      </div>
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: '4px 16px',
                        }}
                      >
                        {items.map((c) => (
                          <li key={c.slug}>
                            <a
                              href={`/councils/${c.slug}`}
                              style={{
                                display: 'block',
                                padding: '6px 0',
                                color: INK,
                                textDecoration: 'none',
                                fontFamily: MONO,
                                fontSize: '13px',
                                lineHeight: 1.55,
                              }}
                            >
                              {c.short_name || c.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                <ScrollToTopButton />
              </section>
            );
          })}
        </div>
      </article>
    </DossierShell>
  );
}
