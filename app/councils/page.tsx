// /councils — Local government index. All 382 UK principal authorities
// (164 districts, 116 unitaries, 36 met-boroughs, 33 London boroughs,
// 21 county councils, 11 Northern Irish councils, 1 Isles of Scilly)
// grouped by country and type, each linking into /councils/[slug].
//
// Seeded from mySociety MapIt on 2026-06-03. Most rows are still
// thin — political_control, leader, budget etc. will land in
// follow-up phases. The listing is the foundation.

import NoJsPager from '@/app/components/NoJsPager';
import type { Metadata } from 'next';
import LastUpdated from '../components/LastUpdated';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import CouncilSearch from '../components/CouncilSearch';
import PhoneMore from '../components/PhoneMore';
import PhoneGroup from '../components/PhoneGroup';
import { SHOW_LEAGUE_TABLE } from '@/lib/feature-flags';
import { PHONE } from '@/lib/breakpoints';

export const revalidate = 21600;

// Title and description (owner, 7 Nov 2026, L4): the word "councils" and the number of councils from the data. The page lists
// them by country and type (no ratings on this page, so none are named).
export async function generateMetadata(): Promise<Metadata> {
  const { count, error } = await supabase.from('councils').select('slug', { count: 'exact', head: true });
  if (error) throw new Error(`/councils count: ${error.message}`);
  const n = count ?? 0;
  return {
    title: n ? `UK councils: all ${n.toLocaleString('en-GB')}, by country and type` : 'UK councils',
    description: `Every UK principal local authority, county, district, unitary, metropolitan and London boroughs, and Northern Irish councils${n ? `, ${n.toLocaleString('en-GB')} in total` : ''}.`,
    alternates: { canonical: '/councils' },
  };
}

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

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
    <OpenGovShell pageStamp="Councils">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: '#14100d', textDecoration: 'none', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />
      {/* No parchment card: content sits directly on the page, like the
          council, department and MP pages. */}
      {/* Phones (UX2l, owner approved through Cowork, 10 Nov 2026): the postcode lookup first, then shortcuts to each nation,
          then the lists with every nation closed; the introduction follows the lookup. CSS order, the same with JavaScript
          off. From 640px up, as before. */}
      <style>{`.cn-jump { display: none; } @media ${PHONE} { .cn-flow { display: flex; flex-direction: column; } .cn-flow > * { order: 4; } .cn-flow { padding-top: 0 !important; } .cn-flow > header { order: 0; margin-bottom: 10px !important; padding-bottom: 8px !important; } .cn-find > div:first-child { margin-bottom: 4px !important; } .cn-flow > .cn-find { order: 1; } .cn-flow > .cn-jump { order: 2; display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0 0 16px; } .cn-flow > .cn-intro { order: 3; } .cn-jump a { display: inline-flex; align-items: center; min-height: 44px; font-family: var(--font-special-elite), monospace; font-size: 15px; color: #7a1612; text-decoration: underline; text-underline-offset: 3px; } .cn-nation { scroll-margin-top: 8px; } }`}</style>
      <article
        className="cn-flow"
        style={{
          padding: 'clamp(15px, 2vw, 24px) 0',
          color: '#14100d',
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
            United Kingdom · Principal Authorities · {all.length}
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Local Government
          </h1>
        </header>

        <p
          className="cn-intro"
          style={{
            fontFamily: MONO,
            fontSize: 'clamp(15px, 1.15vw, 15px)',
            lineHeight: 1.75,
            margin: '0 auto 28px',
            maxWidth: '46em',
            color: INK,
          }}
        >
          Every UK principal authority: county and district councils, unitaries, metropolitan and London
          boroughs, and Northern Irish councils, with who runs each, what it spends and what it does.
        </p>

        <div data-main-action className="cn-find" style={{ maxWidth: '46em', margin: '0 auto 28px' }}>
          <div style={{ fontFamily: MONO, fontSize: '15px', marginBottom: '8px', color: INK }}>Find a council by postcode or name</div>
          <CouncilSearch />
        </div>

        <nav aria-label="Nations" className="cn-jump">
          {COUNTRY_ORDER.filter((c) => grouped[c]).map((country) => (
            <a key={country} href={`#nation-${country.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{country}</a>
          ))}
        </nav>

        {SHOW_LEAGUE_TABLE && <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, margin: '0 auto 28px', maxWidth: '46em', color: INK, borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}`, padding: '10px 0' }}>
          <a href="/councils/league-table" style={{ color: INK, fontWeight: 'bold' }}>How council areas compare</a>: how every council area in England compares on schools, safety, health, jobs, housing, environment and connectivity, with a separate score for selected council services and warnings such as section 114 notices.
        </p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {COUNTRY_ORDER.filter((c) => grouped[c]).map((country) => {
            const byType = grouped[country];
            const countryTotal = Object.values(byType).reduce((a, b) => a + b.length, 0);
            return (
              <section key={country} id={`nation-${country.toLowerCase().replace(/[^a-z]+/g, '-')}`} className="cn-nation" style={{ borderTop: `3px solid ${INK}`, paddingTop: '18px' }}>
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 30px)', lineHeight: 1.15, marginBottom: '4px' }}>
                  {country}
                </div>
                <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginBottom: '20px' }}>
                  {countryTotal} principal authorities
                </div>
                {/* Phones: every nation folded (UX2l, 10 Nov 2026; the first was open before), reached from the shortcuts above. Tablets
                    too since T1-GUARD (owner approved 13 Nov 2026); desktop unchanged. */}
                <PhoneGroup tablets summary={`${country}: ${countryTotal} authorities`}>
                {TYPE_ORDER.filter((t) => byType[t]).map((type) => {
                  const items = byType[type];
                  return (
                    <div key={type} style={{ marginBottom: '24px' }}>
                      <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginBottom: '8px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '6px' }}>
                        {items[0].type_label}{items.length > 1 ? 's' : ''} · {items.length}
                      </div>
                      <NoJsPager id={`njp-${country}-${type}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-")} ownMore count={(items).length} rows="> li" size={25}>
                      <ul
                        data-own-more
                        id={`councils-${country}-${type}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}
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
                                fontSize: '15px',
                                lineHeight: 1.55,
                              }}
                            >
                              {c.short_name || c.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                      </NoJsPager>
                      <PhoneMore selector={`#${`councils-${country}-${type}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`} total={items.length} first={5} />
                    </div>
                  );
                })}
                </PhoneGroup>
              </section>
            );
          })}
        </div>
      </article>
      <LastUpdated sourceKey="councils" />
    </OpenGovShell>
  );
}
