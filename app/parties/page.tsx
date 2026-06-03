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

export const revalidate = 3600;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const PARCHMENT_CREAM = '#efe6d2';
const ACCENT = '#7a1612';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

export const metadata: Metadata = {
  title: "Parties — Compare Policies | The People's Chamber",
  description:
    "Every UK political party's 2024 General Election manifesto positions side by side across 11 policy themes, with post-election shifts marked.",
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

async function getAll(): Promise<{ parties: Party[]; byParty: Record<string, Record<string, Policy>> }> {
  const [{ data: partyRows }, { data: policyRows }] = await Promise.all([
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
  ]);

  const parties = (partyRows || []) as Party[];

  // Reorder so the parties with research come first; the placeholder
  // columns sit on the right.
  const policySlugs = new Set((policyRows || []).map((r) => r.party_slug));
  parties.sort((a, b) => {
    const aHas = policySlugs.has(a.slug) ? 0 : 1;
    const bHas = policySlugs.has(b.slug) ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.name.localeCompare(b.name);
  });

  const byParty: Record<string, Record<string, Policy>> = {};
  for (const r of (policyRows || []) as Policy[]) {
    (byParty[r.party_slug] ||= {})[r.theme] = r;
  }
  return { parties, byParty };
}

// Cell extract: first sentence (or first ~140 chars) so the row fits
// without wrapping into an unreadable wall. Full text on the dossier.
function extract(text: string): string {
  const firstSentence = text.match(/^[^.!?]+[.!?]/);
  const s = firstSentence ? firstSentence[0] : text.slice(0, 140);
  return s.length > 180 ? s.slice(0, 177) + '…' : s;
}

export default async function PartiesIndex() {
  const { parties, byParty } = await getAll();

  return (
    <DossierShell>
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
            Manifesto Comparison · 2024 General Election
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            The Parties
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

        {/* The grid is rendered as a horizontally-scrolling table on
            smaller viewports so the columns stay readable. Each column
            is min 220px wide. The scroll container has no background of
            its own so the parchment shows through; ruled hairlines do
            all the structural work. */}
        <div style={{ overflowX: 'auto', marginTop: '12px' }}>
          <table
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              width: '100%',
              minWidth: `${220 * (parties.length + 1)}px`,
              tableLayout: 'fixed',
              color: INK,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    width: '180px',
                    textAlign: 'left',
                    fontFamily: MONO,
                    fontSize: '11px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: INK_SOFT,
                    padding: '10px 12px',
                    borderBottom: `1.5px solid ${INK}`,
                    verticalAlign: 'bottom',
                    position: 'sticky',
                    left: 0,
                    background: PARCHMENT_CREAM,
                    zIndex: 2,
                  }}
                >
                  Theme
                </th>
                {parties.map((p) => (
                  <th
                    key={p.slug}
                    style={{
                      width: '220px',
                      padding: '10px 12px 8px',
                      borderBottom: `1.5px solid ${INK}`,
                      borderTop: `3px solid ${p.party_colour || '#7697a2'}`,
                      verticalAlign: 'bottom',
                    }}
                  >
                    <a
                      href={`/parties/${p.slug}`}
                      className="no-hover-scale"
                      style={{
                        display: 'block',
                        textDecoration: 'none',
                        color: INK,
                        fontFamily: SERIF,
                        fontWeight: 600,
                        fontSize: '17px',
                        lineHeight: 1.2,
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {p.name}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {THEMES.map((theme) => (
                <tr key={theme}>
                  <th
                    scope="row"
                    style={{
                      textAlign: 'left',
                      fontFamily: SERIF,
                      fontWeight: 600,
                      fontSize: '15px',
                      padding: '16px 12px',
                      borderBottom: `1px solid ${INK_HAIRLINE}`,
                      background: PARCHMENT_CREAM,
                      verticalAlign: 'top',
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                    }}
                  >
                    {theme}
                  </th>
                  {parties.map((p) => {
                    const cell = byParty[p.slug]?.[theme];
                    return (
                      <td
                        key={p.slug}
                        style={{
                          padding: '16px 12px',
                          borderBottom: `1px solid ${INK_HAIRLINE}`,
                          verticalAlign: 'top',
                          fontFamily: SERIF,
                          fontSize: '14px',
                          lineHeight: 1.55,
                        }}
                      >
                        {cell ? (
                          <a
                            href={`/parties/${p.slug}#${encodeURIComponent(theme.toLowerCase().replace(/\s+/g, '-'))}`}
                            style={{ color: INK, textDecoration: 'none', display: 'block' }}
                          >
                            {extract(cell.manifesto_position)}
                            {cell.current_shift && (
                              <span
                                title="Shifted since 2024 — click for detail"
                                aria-label="Shifted since 2024"
                                style={{
                                  display: 'inline-block',
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  background: p.party_colour || '#7697a2',
                                  marginLeft: '6px',
                                  verticalAlign: 'middle',
                                }}
                              />
                            )}
                          </a>
                        ) : (
                          <span style={{ fontFamily: MONO, fontSize: '12px', fontStyle: 'italic', color: INK_SOFT }}>Coming soon</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </article>
    </DossierShell>
  );
}

