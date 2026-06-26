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
import OpenGovShell from '../../../components/OpenGovShell';
import PartySidebar from '../../../components/PartySidebar';
import ScrollToTopButton from '../../../components/ScrollToTopButton';

export const revalidate = 3600;
export function generateStaticParams() { return []; }

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
    title: `${name}, whip cohesion + rebellions`,
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
      <OpenGovShell>
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>Party not found, or has no MP party mapping (cohesion not calculable).</p>
      </OpenGovShell>
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
      <OpenGovShell>
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>No current MPs found for this party.</p>
      </OpenGovShell>
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
  type RebelDiv = { date: string; num: number; key: string };
  type RebelAgg = { memberId: number; name: string; rebellions: number; totalVotes: number; rebelDivs: RebelDiv[] };
  const byMp = new Map<number, RebelAgg>();
  for (const v of votes) {
    const ex = byMp.get(v.member_id) ?? { memberId: v.member_id, name: mpById.get(v.member_id)?.display_name || `MP ${v.member_id}`, rebellions: 0, totalVotes: 0, rebelDivs: [] };
    ex.totalVotes += 1;
    const key = `${v.division_date_only}|${v.division_number}`;
    const majority = partyMajorityByDivision.get(key);
    if (majority && v.vote_type !== majority) {
      ex.rebellions += 1;
      ex.rebelDivs.push({ date: v.division_date_only, num: v.division_number, key });
    }
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

  // The rebels we render, each with their specific rebellion divisions
  // (most recent first), capped per MP for display.
  const REBELS_SHOWN = 25;
  const DIVS_PER_REBEL = 8;
  const topRebels = rebelRanked.slice(0, REBELS_SHOWN).map((r) => ({
    ...r,
    rebelDivs: [...r.rebelDivs].sort((a, b) => b.date.localeCompare(a.date)),
  }));

  // Division titles we need: the most-divided list plus the (capped)
  // rebellion divisions shown under each MP. The title is denormalised
  // onto every mp_division_votes row; fetch in chunks to stay within URL
  // length limits.
  const neededDivs = new Map<string, { date: string; num: number }>();
  for (const d of mostDivided) neededDivs.set(d.key, { date: d.date, num: d.num });
  for (const r of topRebels) for (const k of r.rebelDivs.slice(0, DIVS_PER_REBEL)) neededDivs.set(k.key, { date: k.date, num: k.num });
  const titleByKey = new Map<string, string>();
  const lookupList = Array.from(neededDivs.values());
  for (let i = 0; i < lookupList.length; i += 80) {
    const chunk = lookupList.slice(i, i + 80);
    const orClause = chunk.map((d) => `and(division_date_only.eq.${d.date},division_number.eq.${d.num})`).join(',');
    const { data: titleRows } = await supabase
      .from('mp_division_votes')
      .select('division_date_only, division_number, division_title')
      .or(orClause)
      .limit(4000);
    for (const r of (titleRows || []) as Array<{ division_date_only: string; division_number: number; division_title: string | null }>) {
      const k = `${r.division_date_only}|${r.division_number}`;
      if (!titleByKey.has(k) && r.division_title) titleByKey.set(k, r.division_title);
    }
  }

  const accent = party.party_colour || ACCENT;

  return (
    <OpenGovShell>
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


      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Top rebels · MPs voting against the party whip most often</h2>
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '14px' }}>Calculation requires &ge; 20 recorded votes by the MP. Excludes tellers and unanimous divisions where the &ldquo;rebellion&rdquo; would be meaningless. Each name links to the MP; the divisions listed are the specific votes where they broke from the party line.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {topRebels.map((r, i) => {
            const shown = r.rebelDivs.slice(0, DIVS_PER_REBEL);
            const moreCount = r.rebelDivs.length - shown.length;
            return (
              <div key={r.memberId} style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ opacity: 0.55, fontFamily: 'monospace' }}>{i + 1}.</span>
                  <Link href={`/mps/${r.memberId}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{r.name}</Link>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{r.rebellions} rebellions</span>
                  <span style={{ fontFamily: 'monospace', opacity: 0.65, fontSize: '12px' }}>{((r.rebellions / r.totalVotes) * 100).toFixed(1)}% of {r.totalVotes} votes</span>
                </div>
                {shown.length > 0 && (
                  <div style={{ fontSize: '13px', marginTop: '5px', lineHeight: 1.55 }}>
                    {shown.map((k, j) => (
                      <span key={k.key}>
                        <Link href={`/divisions/pw-${k.date}-${k.num}-commons`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '2px' }}>{titleByKey.get(k.key) || `Division ${k.num} (${k.date})`}</Link>
                        {j < shown.length - 1 ? '; ' : ''}
                      </span>
                    ))}
                    {moreCount > 0 && (
                      <>
                        {'; '}
                        <Link href={`/mps/${r.memberId}#voting`} style={{ color: ACCENT, textDecoration: 'underline' }}>+{moreCount} more</Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '13px', opacity: 0.7 }}>{d.date}</td>
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

      </PartySidebar>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ border: `1px solid ${HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
      <div style={{ fontSize: '13px', opacity: 0.65, marginTop: '4px' }}>{sub}</div>
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
const th: React.CSSProperties = { padding: '8px 6px', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 'bold' };
const td: React.CSSProperties = { padding: '8px 6px', fontSize: '13px', verticalAlign: 'top' };
