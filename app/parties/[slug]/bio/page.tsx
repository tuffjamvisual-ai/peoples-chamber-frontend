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
import PartySidebar from '../../../components/PartySidebar';
import ScrollToTopButton from '../../../components/ScrollToTopButton';

export const revalidate = 3600;

const INK = '#14100d';

type Party = {
  slug: string;
  name: string;
  party_colour: string | null;
  critique: string | null;
  mp_party_string: string | null;
};

async function getPartyBio(slug: string): Promise<Party | null> {
  const { data: partyRow } = await supabase
    .from('parties')
    .select('slug, name, party_colour, critique, mp_party_string')
    .eq('slug', slug)
    .maybeSingle();
  return (partyRow as Party | null) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: party } = await supabase.from('parties').select('name').eq('slug', slug).maybeSingle();
  const name = party?.name || 'Party';
  return {
    title: `${name} | The People's Chamber`,
    description: `${name}, People's Verdict.`,
    alternates: { canonical: `/parties/${slug}/bio` },
  };
}

export default async function PartyBio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const party = await getPartyBio(slug);

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

      {/* Header: name + colour bar. The FOUNDED / COMMONS MPS /
          DONATIONS / WEBSITE metrics row was removed 2026-06-03 per
          user request — the bio leads directly under the colour bar. */}
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
            borderRadius: '2px',
          }}
        />
      </div>

      {/* Two-column body: sidebar nav (col-span-1) + critique
          (col-span-3), mirroring the MP dossier layout in
          MagazineProfileSections. The sidebar is scaffolding for
          future content — BIO is active, the rest link out to
          related routes. Add more items to the SIDEBAR array as
          the parties surface grows. */}
      <PartySidebar party={party} active="bio">
        <div>
          {/* People's critique — sharp ~550-word assessment in MP-bio
              style. Renders as blank-line-separated paragraphs in the
              body-prose typewriter face (Special Elite). The eyebrow
              label was removed 2026-06-03 per user request. */}
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

          {/* cross link to the manifesto-vs-record detail page. */}
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
              {party.name}&apos;s manifesto vs record, 11 themes →
            </a>
          </section>
        </div>
      </PartySidebar>

      <ScrollToTopButton />
    </DossierShell>
  );
}
