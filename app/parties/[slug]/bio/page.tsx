// Per-party bio — /parties/[slug]/bio
//
// Pure "People's Verdict" page: party header + colour bar + the
// long-form critique. No 11-theme policy grid (that stays at
// /parties/[slug]). This is what the nav-bar PARTIES dropdown
// points at, so users arriving from the dropdown land on the
// editorial assessment rather than a manifesto grid.
//
// Cross-links: back to /parties (comparison) and through to
// /parties/[slug] for the detailed manifesto-vs-record breakdown.

import { supabase } from '@/lib/supabase';
import DossierShell from '../../../components/DossierShell';
import ScrollToTopButton from '../../../components/ScrollToTopButton';

export const revalidate = 3600;

const INK = '#14100d';

type Party = {
  slug: string;
  name: string;
  party_colour: string | null;
  website: string | null;
  founded_year: number | null;
  critique: string | null;
  mp_party_string: string | null;
  recipient_name: string | null;
};

async function getPartyBio(slug: string): Promise<{
  party: Party | null;
  mpCount: number;
  donationsTotal: number;
}> {
  const { data: partyRow } = await supabase
    .from('parties')
    .select('slug, name, party_colour, website, founded_year, critique, mp_party_string, recipient_name')
    .eq('slug', slug)
    .maybeSingle();

  if (!partyRow) return { party: null, mpCount: 0, donationsTotal: 0 };
  const party = partyRow as Party;

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

  let donationsTotal = 0;
  if (party.recipient_name) {
    const { data: donRows } = await supabase
      .from('political_donations')
      .select('amount')
      .eq('recipient_name', party.recipient_name);
    donationsTotal = (donRows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  return { party, mpCount, donationsTotal };
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1_000) return '£' + Math.round(n / 1_000) + 'k';
  return '£' + n;
}

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
    title: `${name} | The People's Chamber`,
    description: `${name} — People's Verdict.`,
    alternates: { canonical: `/parties/${slug}/bio` },
  };
}

export default async function PartyBio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { party, mpCount, donationsTotal } = await getPartyBio(slug);

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
        ← Compare parties
      </a>

      {/* Header: name + colour bar + at-a-glance metrics */}
      <div style={{ marginTop: '5%', marginBottom: '5%' }}>
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

      {/* People's critique — sharp ~550-word assessment in MP-bio
          style. Renders as blank-line-separated paragraphs in the
          body-prose typewriter face (Special Elite). The eyebrow
          label was removed 2026-06-03 per user request — the prose
          now leads. */}
      {party.critique ? (
        <section style={{ marginBottom: '40px' }}>
          <div
            style={{
              fontFamily: 'Special Elite, monospace',
              fontSize: 'clamp(13px, 1.35vw, 15px)',
              lineHeight: 1.7,
              color: INK,
              maxWidth: '74ch',
            }}
          >
            {party.critique
              .split(/\n\n+/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={i} style={{ margin: '0 0 1em 0' }}>
                  {p}
                </p>
              ))}
          </div>
        </section>
      ) : (
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '16px',
            opacity: 0.7,
            marginBottom: '40px',
          }}
        >
          People&apos;s verdict not yet written for this party.
        </p>
      )}

      {/* Cross-link to the manifesto-vs-record detail page. */}
      <section style={{ borderTop: '1px solid rgba(20,16,13,0.2)', paddingTop: '20px', marginBottom: '20px' }}>
        <a
          href={`/parties/${party.slug}`}
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '14px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: INK,
            textDecoration: 'none',
            borderBottom: '1px solid rgba(20,16,13,0.4)',
            paddingBottom: '2px',
          }}
        >
          {party.name}&apos;s manifesto vs record — 11 themes →
        </a>
      </section>

      <ScrollToTopButton />
    </DossierShell>
  );
}
