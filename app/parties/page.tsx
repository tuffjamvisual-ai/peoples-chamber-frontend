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
const CREAM = '#ebe5d8';

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
      <div style={{ marginTop: '-6%', marginBottom: '18px' }}>
        <div
          style={{
            fontSize: 'clamp(28px, 4.6vw, 60px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            marginBottom: '10px',
          }}
        >
          The Parties
        </div>
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: 'clamp(14px, 1.7vw, 19px)',
            lineHeight: 1.6,
            maxWidth: '80ch',
            color: INK,
            opacity: 0.85,
            margin: 0,
          }}
        >
          What every UK party promised at the 2024 General Election, theme by theme. A coloured dot
          marks where a party has materially shifted since. Click any column header to read that
          party's full dossier.
        </p>
      </div>

      {/* The grid is rendered as a horizontally-scrolling table on
          smaller viewports so the columns stay readable. Each column
          is min 220px wide. */}
      <div
        style={{
          overflowX: 'auto',
          background: CREAM,
          padding: '18px 12px',
          marginTop: '18px',
        }}
      >
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: '100%',
            minWidth: `${220 * (parties.length + 1)}px`,
            tableLayout: 'fixed',
            fontFamily: 'Special Elite, monospace',
            color: INK,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: '180px',
                  textAlign: 'left',
                  fontSize: '13px',
                  letterSpacing: '0.06em',
                  opacity: 0.55,
                  padding: '6px 10px',
                  borderBottom: `1px solid rgba(20,16,13,0.2)`,
                  verticalAlign: 'bottom',
                  position: 'sticky',
                  left: 0,
                  background: CREAM,
                  zIndex: 2,
                }}
              >
                THEME
              </th>
              {parties.map((p) => (
                <th
                  key={p.slug}
                  style={{
                    width: '220px',
                    padding: '6px 10px',
                    borderBottom: `4px solid ${p.party_colour || '#7697a2'}`,
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
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontWeight: 'bold',
                      fontSize: '17px',
                      lineHeight: 1.15,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {p.name}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {THEMES.map((theme, ti) => (
              <tr key={theme}>
                <th
                  scope="row"
                  style={{
                    textAlign: 'left',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    padding: '12px 10px',
                    borderBottom: `1px solid rgba(20,16,13,0.12)`,
                    background: ti % 2 ? 'rgba(20,16,13,0.025)' : 'transparent',
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
                        padding: '12px 10px',
                        borderBottom: `1px solid rgba(20,16,13,0.12)`,
                        background: ti % 2 ? 'rgba(20,16,13,0.025)' : 'transparent',
                        verticalAlign: 'top',
                        fontSize: '13px',
                        lineHeight: 1.45,
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
                        <span style={{ opacity: 0.35 }}>Coming soon</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        style={{
          fontFamily: 'Special Elite, monospace',
          fontSize: '13px',
          opacity: 0.65,
          marginTop: '14px',
          maxWidth: '80ch',
        }}
      >
        Pilot rollout: Labour, Conservatives and Reform UK populated. The other 14 follow once
        the format is signed off. Every claim is sourced on the per-party dossier.
      </p>
    </DossierShell>
  );
}
