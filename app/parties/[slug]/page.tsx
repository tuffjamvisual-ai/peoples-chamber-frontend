// Per-party policy dossier — /parties/[slug]
//
// Renders inside OpenGovShell (folder background, masthead nav). Pulls
// the party row + its 11 themed policies from the `parties` and
// `party_policies` tables. For each theme: 2024 manifesto position +
// (optional) post-election shift, each with a source URL.
//
// Cross-reference back to /parties (the comparison grid) at the top.

import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import PartySidebar from '../../components/PartySidebar';
import Link from 'next/link';
import { THEME_TOPIC, partySecondJobs } from '@/lib/party-links';

export const revalidate = 21600;

export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('parties')
    .select('slug')
    .limit(20);
  if (error || !data?.length) throw new Error(`generateStaticParams parties: ${error?.message || 'zero rows'}`);
  const slugs = data.map((r) => String(r.slug)).filter(Boolean);
  if (!slugs.length) throw new Error('generateStaticParams parties: zero usable values');
  return slugs.map((slug) => ({ slug }));
}

const INK = '#14100d';
const CREAM = '#ebe5d8';

type Party = {
  slug: string;
  name: string;
  party_colour: string | null;
  website: string | null;
  founded_year: number | null;
  brief: string | null;
  critique: string | null;
  mp_party_string: string | null;
  recipient_name: string | null;
};

type Policy = {
  theme: string;
  theme_order: number;
  position_label: string;
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
  const [{ data: partyRow, error: partyErr }, { data: policyRows, error: policyErr }] = await Promise.all([
    supabase
      .from('parties')
      .select('slug, name, party_colour, website, founded_year, brief, critique, mp_party_string, recipient_name')
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('party_policies')
      .select('theme, theme_order, position_label, manifesto_position, manifesto_source, current_shift, shift_source, last_verified')
      .eq('party_slug', slug)
      .order('theme_order', { ascending: true }),
  ]);

  // A failed read throws (owner's approval, 21 Oct 2026); before, it fell through to "no party" and a cached 404.
  if (partyErr) throw new Error(`parties ${slug}: ${partyErr.message}`);
  if (policyErr) throw new Error(`party_policies ${slug}: ${policyErr.message}`);
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
    const { count, error: countErr } = await supabase
      .from('mps')
      .select('member_id', { count: 'exact', head: true })
      .in('party', variants);
    if (countErr) throw new Error(`mps count ${slug}: ${countErr.message}`);
    mpCount = count || 0;
  }

  // Donations total uses the exact EC recipient_name on political_donations. Sums all-time; the page line below
  // labels it. Summed in the database (party_donations_total, migration 2026-10-21b): the earlier read returned at
  // most 1,000 rows, so parties with more donations than that showed a partial total.
  let donationsTotal = 0;
  if (party.recipient_name) {
    const { data: total, error: totalErr } = await supabase.rpc('party_donations_total', { p_recipient_name: party.recipient_name });
    if (totalErr) throw new Error(`party_donations_total: ${totalErr.message}`);
    donationsTotal = Number(total) || 0;
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
  const { data: party, error: partyErr2 } = await supabase.from('parties').select('name').eq('slug', slug).maybeSingle();
  if (partyErr2 && partyErr2.code !== 'PGRST116') throw new Error(`/parties/[slug] parties: ${partyErr2.message}`);
  const name = party?.name || 'Party';
  return {
    title: `${name}, Policies`,
    description: `${name}'s 2024 General Election manifesto positions across 11 themes, with post-election shifts tracked.`,
    alternates: { canonical: `/parties/${slug}` },
  };
}

export default async function PartyDossier({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { party, policies, mpCount, donationsTotal } = await getPartyAndPolicies(slug);
  const secondJobs = party ? await partySecondJobs(party.mp_party_string) : null;

  if (!party) {
    return (
      <OpenGovShell pageStamp="Parties">
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>Party not found.</p>
      </OpenGovShell>
    );
  }

  const accent = party.party_colour || '#7697a2';

  return (
    <OpenGovShell pageStamp="Parties">
      <a
        href="/parties/manifestos"
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
          user request — critique leads directly under the colour bar. */}
      <div style={{ marginTop: '5%', marginBottom: '5%' }}>
        <h1
          style={{
            fontSize: 'clamp(28px, 4.6vw, 60px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            margin: '0 0 12px',
          }}
        >
          {party.name}
        </h1>
        <div
          aria-hidden
          style={{
            height: '8px',
            background: accent,
            width: '40%',
            borderRadius: '2px',
          }}
        />
        {party.recipient_name && (
          <div style={{ marginTop: '14px', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px' }}>
            <Link href={`/parties/${party.slug}/money`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{fmtMoney(donationsTotal)} lifetime declared donations →</Link>
          </div>
        )}
        {secondJobs && (
          <div style={{ marginTop: '6px', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px' }}>
            <Link href={`/second-jobs/${secondJobs.slug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{secondJobs.count} {party.name} MP{secondJobs.count === 1 ? ' has' : 's have'} paid roles outside Parliament →</Link>
          </div>
        )}
      </div>

      <PartySidebar party={party} active="manifesto">

      {/* The People's critique/verdict lives only on the /bio tab now —
          removed here 2026-06-10 to stop it duplicating across the
          Manifesto vs Record and People's verdict pages. */}

      {/* The 11 themed policy blocks. Each block: theme label, 2024
          manifesto position, source, optional post-election shift in a
          coloured callout, shift source. */}
      <div>
        {policies.length === 0 && (
          <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '16px' }}>
            Policy positions not yet researched for this party. Coming soon.
          </p>
        )}
        {policies.map((p) => (
          <section
            key={p.theme}
            id={p.theme.toLowerCase().replace(/\s+/g, '-')}
            style={{ scrollMarginTop: '32px', marginBottom: '36px' }}
          >
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
                fontFamily: 'var(--font-special-elite), monospace',
                fontSize: 'clamp(15px, 1.7vw, 19px)',
                lineHeight: 1.65,
                marginTop: '12px',
                color: INK,
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85em', letterSpacing: '0.04em' }}>
                  {p.position_label || '2024 MANIFESTO'}
                </span>
              </div>
              <p style={{ margin: 0 }}>{p.manifesto_position}</p>

              {p.current_shift && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '4px 0 4px 16px',
                    borderLeft: `4px solid ${accent}`,
                  }}
                >
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.85em', letterSpacing: '0.04em' }}>
                      SHIFT SINCE 2024
                    </span>
                  </div>
                  <p style={{ margin: 0 }}>{p.current_shift}</p>
                </div>
              )}
              {THEME_TOPIC[p.theme] && (
                <p style={{ margin: '12px 0 0', fontSize: '15px' }}>
                  <Link href={`/topics/${THEME_TOPIC[p.theme].slug}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Everything on {THEME_TOPIC[p.theme].title}: votes, bills, departments and reporting →</Link>
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      </PartySidebar>

    </OpenGovShell>
  );
}
