// Cross-comparison grid — /parties
//
// Parties as columns, the 11 themes as rows. Each cell shows a short
// extract of the manifesto position and a small dot if there has been
// a post-election shift. The full text lives behind a click into
// /parties/[slug], which is the per-party dossier.
//
// Parties without policy rows yet (currently 14 of 17) still get a
// column with "Coming soon" so the index reflects the full set.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import DossierShell from '../components/DossierShell';
import BackLink from '../components/BackLink';
import ScrollToTopButton from '../components/ScrollToTopButton';

export const revalidate = 3600;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const PARCHMENT_CREAM = '#efe6d2';
const ACCENT = '#7a1612';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

export const metadata: Metadata = {
  title: "UK Party Manifestos 2024, Side by Side Policy Comparison",
  description:
    "Compare 2024 General Election manifestos from Labour, Conservative, Reform, Lib Dem, SNP, Green and 9 other UK parties across 11 policy themes, with post election shifts marked.",
  alternates: { canonical: '/parties' },
};

// The canonical theme order. Mirrored in /parties/[slug] via
// party_policies.theme_order so the rows match in both views.
const THEMES = [
  'Economy & Tax',
  'NHS & Health',
  'Immigration & Asylum',
  'Education',
  'Climate & Energy',
  'Housing',
  'Welfare & Work',
  'Crime & Justice',
  'Defence & Foreign Policy',
  'Europe',
  'Constitution & Devolution',
];

type Party = { slug: string; name: string; party_colour: string | null; founded_year: number | null };
type Policy = {
  party_slug: string;
  theme: string;
  manifesto_position: string;
  current_shift: string | null;
};

// mps.party stores the display string Parliament publishes, which
// doesn't always match parties.name on this site (Lib Dem singular vs
// plural, SDLP vs Social Democratic & Labour Party, etc.). Map by
// hand so MP counts roll up to the right parties.slug. 'Labour' and
// 'Labour (Co-op)' both count toward the Labour bench.
const MP_PARTY_TO_SLUG: Record<string, string> = {
  'Labour': 'labour',
  'Labour (Co-op)': 'labour',
  'Conservative': 'conservative',
  'Liberal Democrat': 'liberal-democrats',
  'Liberal Democrats': 'liberal-democrats',
  'Reform UK': 'reform-uk',
  'Green Party': 'green',
  'Scottish National Party': 'snp',
  'Plaid Cymru': 'plaid-cymru',
  'Sinn Féin': 'sinn-fein',
  'Sinn Fein': 'sinn-fein',
  'Democratic Unionist Party': 'dup',
  'Ulster Unionist Party': 'uup',
  'Social Democratic & Labour Party': 'sdlp',
  'Alliance': 'alliance',
  'Alliance Party': 'alliance',
  'Traditional Unionist Voice': 'tuv',
  'Restore Britain': 'restore-britain',
  'Your Party': 'your-party',
};

async function getAll(): Promise<{ parties: Party[]; byParty: Record<string, Record<string, Policy>>; mpCounts: Record<string, number> }> {
  const [{ data: partyRows }, { data: policyRows }, { data: mpRows }] = await Promise.all([
    supabase
      .from('parties')
      .select('slug, name, party_colour, founded_year')
      // Drop Speaker + Independents from the comparison grid — they
      // are not parties with manifestos.
      .not('slug', 'in', '(speaker,independent)')
      .order('name'),
    supabase
      .from('party_policies')
      .select('party_slug, theme, manifesto_position, current_shift'),
    supabase
      .from('mps')
      .select('party')
      .eq('current_member', true),
  ]);

  const parties = (partyRows || []) as Party[];

  // Roll MP party labels up to parties.slug counts.
  const mpCounts: Record<string, number> = {};
  for (const row of (mpRows || []) as { party: string | null }[]) {
    if (!row.party) continue;
    const slug = MP_PARTY_TO_SLUG[row.party];
    if (!slug) continue;
    mpCounts[slug] = (mpCounts[slug] || 0) + 1;
  }

  // Sort by MP count desc — biggest benches first. Parties with zero
  // MPs (typically the placeholder / minor-party columns) tie on count
  // and fall back to alphabetical so the order is at least stable.
  parties.sort((a, b) => {
    const ac = mpCounts[a.slug] || 0;
    const bc = mpCounts[b.slug] || 0;
    if (ac !== bc) return bc - ac;
    return a.name.localeCompare(b.name);
  });

  const byParty: Record<string, Record<string, Policy>> = {};
  for (const r of (policyRows || []) as Policy[]) {
    (byParty[r.party_slug] ||= {})[r.theme] = r;
  }
  return { parties, byParty, mpCounts };
}

// Cell extract: first sentence (or first ~140 chars) so the row fits
// without wrapping into an unreadable wall. Full text on the dossier.
function extract(text: string): string {
  const firstSentence = text.match(/^[^.!?]+[.!?]/);
  const s = firstSentence ? firstSentence[0] : text.slice(0, 140);
  return s.length > 180 ? s.slice(0, 177) + '…' : s;
}

export default async function PartiesIndex() {
  const { parties, byParty, mpCounts } = await getAll();

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: '#14100d', textDecoration: 'none', fontFamily: 'Special Elite, monospace', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />
      {/* Same parchment article wrapper used by /bills/[id] and
          /bills/[id]/full so the parties index reads as part of the
          dossier line rather than a cream table dropped on top of it. */}
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
            2024 General Election · Theme by Theme
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Manifesto Comparisons
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
          What every UK party promised at the 2024 General Election, theme by theme. A coloured dot
          marks where a party has materially shifted since. Click any column header to read that
          party's full dossier.
        </p>

        {/* Stacked layout: one section per party, with the 11 themes
            running vertically under each. Replaced the
            horizontally-scrolling cross-comparison table on 2026-06-03
            because the scroll buried the data on anything smaller than
            a desktop. Each party gets a party-colour accent rule, name
            in EB Garamond serif, and a two-column theme/position list.
            Parties without research yet render a single 'Coming soon'
            stub instead of a full empty list. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {parties.map((p) => {
            const hasData = !!byParty[p.slug] && Object.keys(byParty[p.slug]).length > 0;
            const colour = p.party_colour || '#7697a2';
            const seats = mpCounts[p.slug] || 0;
            const seatLabel = seats === 1 ? '1 seat' : seats > 0 ? `${seats} seats` : 'No Commons seats';
            return (
              <section
                key={p.slug}
                style={{
                  borderTop: `3px solid ${colour}`,
                  paddingTop: '18px',
                }}
              >
                <a
                  href={`/parties/${p.slug}`}
                  className="no-hover-scale"
                  style={{
                    display: 'inline-block',
                    textDecoration: 'none',
                    color: INK,
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: 'clamp(22px, 2.6vw, 30px)',
                    lineHeight: 1.15,
                    letterSpacing: '-0.005em',
                    marginBottom: '4px',
                  }}
                >
                  {p.name}
                </a>
                <div style={{ fontFamily: MONO, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK_SOFT, marginBottom: '18px' }}>
                  {seatLabel} · {hasData ? 'Manifesto positions 2024' : 'Research pending'}
                </div>

                {hasData ? (
                  <dl
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(160px, 200px) 1fr',
                      gap: '0',
                      margin: 0,
                      borderTop: `1px solid ${INK_HAIRLINE}`,
                    }}
                  >
                    {THEMES.map((theme) => {
                      const cell = byParty[p.slug]?.[theme];
                      if (!cell) {
                        return (
                          <div key={theme} style={{ display: 'contents' }}>
                            <dt
                              style={{
                                fontFamily: MONO,
                                fontWeight: 'normal',
                                fontSize: '13px',
                                letterSpacing: '0.04em',
                                padding: '14px 16px 14px 0',
                                borderBottom: `1px solid ${INK_HAIRLINE}`,
                                color: INK_SOFT,
                              }}
                            >
                              {theme}
                            </dt>
                            <dd style={{ padding: '14px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, margin: 0, fontFamily: MONO, fontSize: '12px', fontStyle: 'italic', color: INK_SOFT }}>
                              Coming soon
                            </dd>
                          </div>
                        );
                      }
                      return (
                        <div key={theme} style={{ display: 'contents' }}>
                          <dt
                            style={{
                              fontFamily: MONO,
                              fontWeight: 'normal',
                              fontSize: '13px',
                              letterSpacing: '0.04em',
                              padding: '14px 16px 14px 0',
                              borderBottom: `1px solid ${INK_HAIRLINE}`,
                            }}
                          >
                            {theme}
                          </dt>
                          <dd style={{ padding: '14px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, margin: 0 }}>
                            <a
                              href={`/parties/${p.slug}#${encodeURIComponent(theme.toLowerCase().replace(/\s+/g, '-'))}`}
                              style={{ color: INK, textDecoration: 'none', display: 'block', fontFamily: MONO, fontSize: '14px', lineHeight: 1.7 }}
                            >
                              {extract(cell.manifesto_position)}
                              {cell.current_shift && (
                                <span
                                  title="Shifted since 2024, click for detail"
                                  aria-label="Shifted since 2024"
                                  style={{
                                    display: 'inline-block',
                                    width: '9px',
                                    height: '9px',
                                    borderRadius: '50%',
                                    background: colour,
                                    marginLeft: '8px',
                                    verticalAlign: 'middle',
                                  }}
                                />
                              )}
                            </a>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : (
                  <p style={{ fontFamily: MONO, fontSize: '13px', fontStyle: 'italic', color: INK_SOFT, margin: 0 }}>
                    Coming soon. The 2024 manifesto positions for this party are being researched.
                  </p>
                )}
                {/* Back-to-top arrow at the end of every party section.
                    Reuses the shared ScrollToTopButton (rotated arrow,
                    centred, smooth scroll). Lets readers jump back up
                    without scrolling through every party below them. */}
                <ScrollToTopButton />
              </section>
            );
          })}
        </div>

      </article>
    </DossierShell>
  );
}

