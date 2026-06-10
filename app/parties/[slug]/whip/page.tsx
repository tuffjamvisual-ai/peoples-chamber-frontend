// Per-party whip cohesion + rebellion dossier — /parties/[slug]/whip
//
// Computed from mp_division_votes. For each division this Parliament,
// classify how the party voted as a bloc (which side won the party-
// internal majority) and tally everyone who voted the other way as a
// rebel for that division.
//
// Independents get a placeholder note because Independent has no whip
// to rebel against — the calculation is meaningless for them.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DossierShell from '../../../components/DossierShell';
import PartySidebar from '../../../components/PartySidebar';
import ScrollToTopButton from '../../../components/ScrollToTopButton';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

const INK = '#14100d';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';

type Party = {
  slug: string;
  name: string;
  party_colour: string | null;
  mp_party_string: string | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: party } = await supabase.from('parties').select('name').eq('slug', slug).maybeSingle();
  const name = party?.name || 'Party';
  return {
    title: `${name}, whip cohesion + rebellions | The People's Chamber`,
    description: `How tightly the ${name} votes together in the Commons, and which MPs break from the party line most often. Computed from every recorded division this Parliament.`,
    alternates: { canonical: `/parties/${slug}/whip` },
  };
}

type VoteRow = {
  member_id: number;
  division_date_only: string;
  division_number: number;
  vote_type: string;
};

type MpRow = { member_id: number; display_name: string | null; party: string | null };

export default async function PartyWhip({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: partyRow } = await supabase
    .from('parties')
    .select('slug, name, party_colour, mp_party_string')
    .eq('slug', slug)
    .maybeSingle();
  const party = partyRow as Party | null;

  if (!party || !party.mp_party_string) {
    return (
      <DossierShell>
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>Party not found, or has no MP party mapping (cohesion not calculable).</p>
      </DossierShell>
    );
  }

  // Party-string variants. Labour rolls in Co-op & Co-op merged labels.
  const partyVariants =
    party.slug === 'labour'
      ? ['Labour', 'Labour (Co-op)', 'Labour and Co-operative']
      : [party.mp_party_string];

  // All current MPs in this party
  const { data: rawMps } = await supabase
    .from('mps')
    .select('member_id, display_name, party')
    .eq('current_member', true)
    .in('party', partyVariants);
  const mps = (rawMps || []) as MpRow[];
  const memberIds = mps.map((m) => m.member_id);
  if (memberIds.length === 0) {
    return (
      <DossierShell>
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>No current MPs found for this party.</p>
      </DossierShell>
    );
  }
  const mpById = new Map<number, MpRow>(mps.map((m) => [m.member_id, m]));

  // Every aye/no vote cast by these MPs this Parliament
  const PAGE = 1000;
  const votes: VoteRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('mp_division_votes')
      .select('member_id, division_date_only, division_number, vote_type, is_teller')
      .in('member_id', memberIds)
      .eq('is_teller', false)
      .in('vote_type', ['aye', 'no'])
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    votes.push(...(data as VoteRow[]));
    if (data.length < PAGE) break;
  }

  // Per-division aye/no counts inside the party
  const divisionStats = new Map<string, { ayes: number; noes: number; key: string; date: string; num: number }>();
  for (const v of votes) {
    const key = `${v.division_date_only}|${v.division_number}`;
    const ex = divisionStats.get(key) ?? { ayes: 0, noes: 0, key, date: v.division_date_only, num: v.division_number };
    if (v.vote_type === 'aye') ex.ayes += 1;
    else if (v.vote_type === 'no') ex.noes += 1;
    divisionStats.set(key, ex);
  }
  const divisions = Array.from(divisionStats.values());
  const divisionsCount = divisions.length;

  // Cohesion: of all aye/no votes cast by MPs in this party, what
  // fraction were on the party's winning side per division?
  let aligned = 0, total = 0, unanimous = 0;
  for (const d of divisions) {
    total += d.ayes + d.noes;
    aligned += Math.max(d.ayes, d.noes);
    if (d.ayes === 0 || d.noes === 0) unanimous += 1;
  }
  const cohesionPct = total > 0 ? (aligned / total) * 100 : 0;
  const unanimousPct = divisionsCount > 0 ? (unanimous / divisionsCount) * 100 : 0;

  // Per-MP rebellion count
  const partyMajorityByDivision = new Map<string, 'aye' | 'no' | null>();
  for (const d of divisions) {
    if (d.ayes === d.noes) partyMajorityByDivision.set(d.key, null);
    else partyMajorityByDivision.set(d.key, d.ayes > d.noes ? 'aye' : 'no');
  }
  type RebelAgg = { memberId: number; name: string; rebellions: number; totalVotes: number };
  const byMp = new Map<number, RebelAgg>();
  for (const v of votes) {
    const ex = byMp.get(v.member_id) ?? { memberId: v.member_id, name: mpById.get(v.member_id)?.display_name || `MP ${v.member_id}`, rebellions: 0, totalVotes: 0 };
    ex.totalVotes += 1;
    const majority = partyMajorityByDivision.get(`${v.division_date_only}|${v.division_number}`);
    if (majority && v.vote_type !== majority) ex.rebellions += 1;
    byMp.set(v.member_id, ex);
  }
  const rebelRanked = Array.from(byMp.values())
    .filter((m) => m.totalVotes >= 20)
    .sort((a, b) => b.rebellions - a.rebellions);

  // Top "most divided" — divisions where the party was split closest to 50:50
  const mostDivided = divisions
    .filter((d) => d.ayes + d.noes >= 10 && Math.min(d.ayes, d.noes) >= 2)
    .sort((a, b) => Math.min(b.ayes, b.noes) / (b.ayes + b.noes) - Math.min(a.ayes, a.noes) / (a.ayes + a.noes))
    .slice(0, 15);

  // Lookup division titles for the most-divided list
  const divisionLookups = mostDivided.map((d) => ({ date: d.date, num: d.num }));
  let titleByKey = new Map<string, string>();
  if (divisionLookups.length > 0) {
    const orClause = divisionLookups.map((d) => `and(division_date_only.eq.${d.date},division_number.eq.${d.num})`).join(',');
    const { data: titleRows } = await supabase
      .from('mp_division_votes')
      .select('division_date_only, division_number, division_title')
      .or(orClause)
      .limit(2000);
    const seen = new Set<string>();
    for (const r of (titleRows || []) as Array<{ division_date_only: string; division_number: number; division_title: string | null }>) {
      const k = `${r.division_date_only}|${r.division_number}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (r.division_title) titleByKey.set(k, r.division_title);
    }
  }

  const accent = party.party_colour || ACCENT;

  return (
    <DossierShell>
      <a
        href={`/parties/${party.slug}`}
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      >
        ← {party.name}
      </a>

      <header style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          {party.name} · Whip cohesion + rebellion
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          How tightly the {party.name} votes together
        </h1>
        <div style={{ height: '4px', background: accent, width: '80px', marginBottom: '12px' }} />
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '60ch' }}>
          Computed from every recorded Commons division in the current Parliament. For each division we look at how the party&rsquo;s MPs voted as a bloc and treat anyone on the opposite side from their party&rsquo;s internal majority as a rebel on that division. Tells you how often the whip holds and which MPs break it.
        </p>
      </header>

      <PartySidebar party={party} active="whip">

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <Tile label="Cohesion" value={cohesionPct.toFixed(1) + '%'} sub="of votes on the party's winning side" />
        <Tile label="Unanimous divisions" value={unanimousPct.toFixed(1) + '%'} sub={`${unanimous} of ${divisionsCount} divisions`} />
        <Tile label="Divisions participated in" value={divisionsCount.toLocaleString()} sub="this Parliament" />
        <Tile label="Current MPs" value={mps.length.toLocaleString()} sub="in cohesion calc" />
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Top rebels · MPs voting against the party whip most often</h2>
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '10px' }}>Calculation requires &ge; 20 recorded votes by the MP. Excludes tellers and unanimous divisions where the &ldquo;rebellion&rdquo; would be meaningless.</p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
              <th style={th}>#</th>
              <th style={th}>MP</th>
              <th style={{ ...th, textAlign: 'right' }}>Rebellions</th>
              <th style={{ ...th, textAlign: 'right' }}>Total votes</th>
              <th style={{ ...th, textAlign: 'right' }}>Rebel rate</th>
            </tr>
          </thead>
          <tbody>
            {rebelRanked.slice(0, 25).map((r, i) => (
              <tr key={r.memberId} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={{ ...td, opacity: 0.6 }}>{i + 1}</td>
                <td style={td}>
                  <Link href={`/mps/${r.memberId}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{r.name}</Link>
                </td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{r.rebellions}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{r.totalVotes}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{((r.rebellions / r.totalVotes) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {mostDivided.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={sectionH2}>Most divided divisions · where the party split closest to 50:50</h2>
          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}`, textAlign: 'left' }}>
                <th style={th}>Date</th>
                <th style={th}>Division</th>
                <th style={{ ...th, textAlign: 'right' }}>Ayes / Noes</th>
                <th style={{ ...th, textAlign: 'right' }}>Split</th>
              </tr>
            </thead>
            <tbody>
              {mostDivided.map((d) => {
                const split = Math.min(d.ayes, d.noes) / (d.ayes + d.noes);
                const title = titleByKey.get(d.key) || `Division ${d.num}`;
                return (
                  <tr key={d.key} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '11px', opacity: 0.7 }}>{d.date}</td>
                    <td style={td}>
                      <Link href={`/divisions/pw-${d.date}-${d.num}-commons`} style={{ color: ACCENT, textDecoration: 'underline' }}>{title}</Link>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{d.ayes} / {d.noes}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: ACCENT }}>{(split * 100).toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '24px' }}>
        Source: mp_division_votes table built from parlparse + Commons Votes API. Calculation excludes tellers, abstentions, and votes where the MP&rsquo;s vote_type was something other than aye/no. Cohesion = aligned votes / total votes across all participated divisions.
      </p>

      </PartySidebar>

      <ScrollToTopButton />
    </DossierShell>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ border: `1px solid ${HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
      <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: '"Special Elite", monospace',
  fontSize: '20px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '12px',
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: '"Special Elite", monospace' };
const th: React.CSSProperties = { padding: '8px 6px', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 'bold' };
const td: React.CSSProperties = { padding: '8px 6px', fontSize: '13px', verticalAlign: 'top' };
