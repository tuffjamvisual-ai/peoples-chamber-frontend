// Per-party policy dossier — /parties/[slug]
//
// Renders inside DossierShell (folder background, masthead nav). Pulls
// the party row + its 11 themed policies from the `parties` and
// `party_policies` tables. For each theme: 2024 manifesto position +
// (optional) post-election shift, each with a source URL.
//
// Cross-reference back to /parties (the comparison grid) at the top.

import { supabase } from '@/lib/supabase';
import DossierShell from '../../components/DossierShell';
import ScrollToTopButton from '../../components/ScrollToTopButton';

export const revalidate = 3600;

const INK = '#14100d';
const CREAM = '#ebe5d8';

type Party = {
  slug: string;
  name: string;
  party_colour: string | null;
  website: string | null;
  founded_year: number | null;
  brief: string | null;
  mp_party_string: string | null;
  recipient_name: string | null;
};

type Policy = {
  theme: string;
  theme_order: number;
  manifesto_position: string;
  manifesto_source: string | null;
  current_shift: string | null;
  shift_source: string | null;
  last_verified: string | null;
};

async function getPartyAndPolicies(slug: string): Promise<{
  party: Party | null;
  policies: Policy[];
  mpCount: number;
  donationsTotal: number;
}> {
  const [{ data: partyRow }, { data: policyRows }] = await Promise.all([
    supabase.from('parties').select('*').eq('slug', slug).maybeSingle(),
    supabase
      .from('party_policies')
      .select('theme, theme_order, manifesto_position, manifesto_source, current_shift, shift_source, last_verified')
      .eq('party_slug', slug)
      .order('theme_order', { ascending: true }),
  ]);

  if (!partyRow) return { party: null, policies: [], mpCount: 0, donationsTotal: 0 };

  const party = partyRow as Party;
  const policies = (policyRows || []) as Policy[];

  // MP count uses the EXACT mps.party string the party row points at,
  // plus the Labour (Co-op) merge for Labour. Falls back to 0 if no
  // mapping is set (Independent, Speaker).
  let mpCount = 0;
  if (party.mp_party_string) {
    const variants =
      party.slug === 'labour'
        ? ['Labour', 'Labour (Co-op)', 'Labour and Co-operative']
        : [party.mp_party_string];
    const { count } = await supabase
      .from('mps')
      .select('member_id', { count: 'exact', head: true })
      .in('party', variants);
    mpCount = count || 0;
  }

  // Donations total uses the exact EC recipient_name on
  // political_donations. Sums all-time; the page line below labels it.
  let donationsTotal = 0;
  if (party.recipient_name) {
    const { data: donRows } = await supabase
      .from('political_donations')
      .select('amount')
      .eq('recipient_name', party.recipient_name);
    donationsTotal = (donRows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  return { party, policies, mpCount, donationsTotal };
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1_000) return '£' + Math.round(n / 1_000) + 'k';
  return '£' + n;
}

// Strip the protocol + trailing slash for source display labels — we
// want a readable host name under the policy block rather than the
// full URL, which would wrap and clutter the dossier.
function sourceLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: party } = await supabase.from('parties').select('name').eq('slug', slug).maybeSingle();
  const name = party?.name || 'Party';
  return {
    title: `${name} — Policies | The People's Chamber`,
    description: `${name}'s 2024 General Election manifesto positions across 11 themes, with post-election shifts tracked.`,
    alternates: { canonical: `/parties/${slug}` },
  };
}

export default async function PartyDossier({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { party, policies, mpCount, donationsTotal } = await getPartyAndPolicies(slug);

  if (!party) {
    return (
      <DossierShell>
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>Party not found.</p>
      </DossierShell>
    );
  }

  const accent = party.party_colour || '#7697a2';

  return (
    <DossierShell>
      <a
        href="/parties"
        className="no-hover-scale"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '-6%',
          marginBottom: '12px',
          color: INK,
          textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      >
        ← Compare every party
      </a>

      {/* Header: name + colour bar + at-a-glance metrics */}
      <div style={{ marginBottom: '5%' }}>
        <div
          style={{
            fontSize: 'clamp(28px, 4.6vw, 60px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            marginBottom: '12px',
          }}
        >
          {party.name}
        </div>
        <div
          aria-hidden
          style={{
            height: '8px',
            background: accent,
            width: '40%',
            marginBottom: '18px',
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px 36px',
            fontFamily: 'Special Elite, monospace',
            fontSize: 'clamp(13px, 1.5vw, 17px)',
            color: INK,
          }}
        >
          {party.founded_year && (
            <span>
              <span style={{ opacity: 0.6 }}>FOUNDED</span> {party.founded_year}
            </span>
          )}
          <span>
            <span style={{ opacity: 0.6 }}>COMMONS MPS</span> {mpCount}
          </span>
          {donationsTotal > 0 && (
            <span>
              <span style={{ opacity: 0.6 }}>DONATIONS ON RECORD</span> {fmtMoney(donationsTotal)}
            </span>
          )}
          {party.website && (
            <a href={party.website} target="_blank" rel="noopener noreferrer" style={{ color: INK }}>
              <span style={{ opacity: 0.6 }}>WEBSITE</span> {sourceLabel(party.website)} ↗
            </a>
          )}
        </div>
      </div>

      {/* The 11 themed policy blocks. Each block: theme label, 2024
          manifesto position, source, optional post-election shift in a
          coloured callout, shift source. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
        {policies.length === 0 && (
          <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '16px', opacity: 0.7 }}>
            Policy positions not yet researched for this party. Coming soon.
          </p>
        )}
        {policies.map((p) => (
          <section key={p.theme}>
            <h2
              style={{
                fontSize: 'clamp(20px, 2.6vw, 32px)',
                fontWeight: 'bold',
                letterSpacing: '-0.01em',
                margin: '0 0 4px 0',
                borderBottom: `2px solid ${accent}`,
                paddingBottom: '6px',
                display: 'inline-block',
              }}
            >
              {p.theme}
            </h2>
            <div
              style={{
                fontFamily: 'Special Elite, monospace',
                fontSize: 'clamp(15px, 1.7vw, 19px)',
                lineHeight: 1.65,
                marginTop: '12px',
                color: INK,
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <span style={{ opacity: 0.55, fontSize: '0.85em', letterSpacing: '0.04em' }}>
                  2024 MANIFESTO
                </span>
              </div>
              <p style={{ margin: 0 }}>{p.manifesto_position}</p>
              {p.manifesto_source && (
                <a
                  href={p.manifesto_source}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    fontSize: '0.85em',
                    opacity: 0.7,
                    color: INK,
                  }}
                >
                  Source: {sourceLabel(p.manifesto_source)} ↗
                </a>
              )}

              {p.current_shift && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px 16px',
                    background: CREAM,
                    borderLeft: `4px solid ${accent}`,
                  }}
                >
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ opacity: 0.55, fontSize: '0.85em', letterSpacing: '0.04em' }}>
                      SHIFT SINCE 2024
                    </span>
                  </div>
                  <p style={{ margin: 0 }}>{p.current_shift}</p>
                  {p.shift_source && (
                    <a
                      href={p.shift_source}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        fontSize: '0.85em',
                        opacity: 0.7,
                        color: INK,
                      }}
                    >
                      Source: {sourceLabel(p.shift_source)} ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <ScrollToTopButton />
    </DossierShell>
  );
}
