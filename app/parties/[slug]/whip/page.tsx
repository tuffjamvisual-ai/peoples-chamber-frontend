// Per-party whip cohesion and votes against the party — /parties/[slug]/whip
//
// From the saved figures party_division_splits and party_member_vote_stats (built from
// mp_division_votes; see scripts/migrations/2026-10-15c-division-parties-rebellions.sql).
// In each division since the July 2024 election, the party's side is the one most of its
// MPs took; an MP who voted the other way is counted as voting against the party. MPs are
// counted under their party on the day of the vote.
//
// Independents and the Speaker get a note instead: there is no party line to measure.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../../components/OpenGovShell';
import PartySidebar from '../../../components/PartySidebar';
import { displayMpName } from '@/lib/mp-name';

export const revalidate = 21600;
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
  const { data: party, error: partyErr } = await supabase.from('parties').select('name').eq('slug', slug).maybeSingle();
  if (partyErr && partyErr.code !== 'PGRST116') throw new Error(`/parties/[slug]/whip parties: ${partyErr.message}`);
  const name = party?.name || 'Party';
  return {
    title: `${name}, whip cohesion + rebellions`,
    description: `How tightly ${name} MPs vote together in the Commons, and which of its MPs vote against most of the party most often. Every division since the July 2024 election.`,
    alternates: { canonical: `/parties/${slug}/whip` },
  };
}


export default async function PartyWhip({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: partyRow, error: partyRowErr } = await supabase
    .from('parties')
    .select('slug, name, party_colour, mp_party_string')
    .eq('slug', slug)
    .maybeSingle();
  if (partyRowErr && partyRowErr.code !== 'PGRST116') throw new Error(`/parties/[slug]/whip parties: ${partyRowErr.message}`);
  const party = partyRow as Party | null;

  if (!party || !party.mp_party_string) {
    return (
      <OpenGovShell pageStamp="Parties">
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>Party not found, or has no MP party mapping (cohesion not calculable).</p>
      </OpenGovShell>
    );
  }

  // Votes are grouped by the party the MP belonged to on the day of each vote, as the
  // Commons Votes API records it (mp_division_votes.party; Labour and Labour Co-op are both
  // "Labour" there). Saved figures: party_division_splits and party_member_vote_stats, this
  // Parliament only (2026-10-15c migration).
  const partyName = party.mp_party_string;
  if (/^independent/i.test(partyName) || partyName === 'Speaker') {
    return (
      <OpenGovShell pageStamp="Parties">
        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>{party.name} have no party whip, so there is no party line to vote against.</p>
      </OpenGovShell>
    );
  }

  type SplitRow = { division_id: number; division_date_only: string; division_number: number; division_title: string | null; ayes: number; noes: number };
  type StatRow = { member_id: number; votes: number; rebellions: number; last_vote: string };
  const splits: SplitRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('party_division_splits')
      .select('division_id, division_date_only, division_number, division_title, ayes, noes')
      .eq('party', partyName)
      .order('division_id')
      .range(from, from + 999);
    if (error) throw new Error(`/parties/${slug}/whip party_division_splits: ${error.message}`); // loud, not partial (report 36)
    if (!data) break;
    splits.push(...(data as SplitRow[]));
    if (data.length < 1000) break;
  }
  const stats: StatRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('party_member_vote_stats')
      .select('member_id, votes, rebellions, last_vote')
      .eq('party', partyName)
      .order('member_id')
      .range(from, from + 999);
    if (error) throw new Error(`/parties/${slug}/whip party_member_vote_stats: ${error.message}`); // loud, not partial (report 36)
    if (!data) break;
    stats.push(...(data as StatRow[]));
    if (data.length < 1000) break;
  }
  // No whip data (23 Oct 2026): the normal heading and party navigation, and one plain line.
  if (splits.length === 0) {
    return (
      <WhipFrame party={party}>
        <p style={{ fontSize: '15px', lineHeight: 1.7 }}>No Commons votes are recorded for {party.name} MPs since the July 2024 election, so there is no voting record to measure.</p>
      </WhipFrame>
    );
  }

  const divisions = splits.map((d) => ({
    key: String(d.division_id), date: d.division_date_only, num: d.division_number,
    title: (d.division_title || '').trim(), ayes: d.ayes, noes: d.noes,
  }));
  const divisionsCount = divisions.length;

  // Cohesion: of all aye/no votes cast by MPs in this party, what fraction were on the
  // side most of the party took in that division?
  let aligned = 0, total = 0, unanimous = 0;
  for (const d of divisions) {
    total += d.ayes + d.noes;
    aligned += Math.max(d.ayes, d.noes);
    if (d.ayes === 0 || d.noes === 0) unanimous += 1;
  }
  const cohesionPct = total > 0 ? (aligned / total) * 100 : 0;
  const unanimousPct = divisionsCount > 0 ? (unanimous / divisionsCount) * 100 : 0;

  // Most votes against the party, among MPs with at least 20 votes as a member of it.
  const rebelRanked = stats
    .filter((m) => m.votes >= 20 && m.rebellions > 0)
    .sort((a, b) => b.rebellions - a.rebellions || b.rebellions / b.votes - a.rebellions / a.votes);

  // Top "most divided" — divisions where the party was split closest to 50:50
  const mostDivided = divisions
    .filter((d) => d.ayes + d.noes >= 10 && Math.min(d.ayes, d.noes) >= 2)
    .sort((a, b) => Math.min(b.ayes, b.noes) / (b.ayes + b.noes) - Math.min(a.ayes, a.noes) / (a.ayes + a.noes))
    .slice(0, 15);

  const REBELS_SHOWN = 25;
  const DIVS_PER_REBEL = 8;
  const topIds = rebelRanked.slice(0, REBELS_SHOWN).map((r) => r.member_id);

  // Names, and today's party for anyone who has since left.
  type MpRow = { member_id: number; display_name: string | null; name: string | null; party: string | null; current_member: boolean | null };
  const mpById = new Map<number, MpRow>();
  if (topIds.length) {
    const { data: mpRows, error: mpRowsErr } = await supabase.from('mps').select('member_id, display_name, name, party, current_member').in('member_id', topIds);
    if (mpRowsErr && mpRowsErr.code !== 'PGRST116') throw new Error(`/parties/[slug]/whip mps: ${mpRowsErr.message}`);
    for (const m of (mpRows || []) as MpRow[]) mpById.set(m.member_id, m);
  }

  // The votes against the party for the MPs shown, newest first.
  type RebelVote = { member_id: number; division_date_only: string; division_number: number; division_title: string | null };
  const rebelVotes: RebelVote[] = [];
  if (topIds.length) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('mp_division_votes')
        .select('member_id, division_date_only, division_number, division_title')
        .eq('party', partyName)
        .eq('is_rebellion', true)
        .gte('division_date_only', '2024-07-04')
        .in('member_id', topIds)
        .order('division_date_only', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + 999);
      if (error) throw new Error(`/parties/${slug}/whip rebel votes: ${error.message}`); // loud, not partial (report 36)
      if (!data) break;
      rebelVotes.push(...(data as RebelVote[]));
      if (data.length < 1000) break;
    }
  }
  const sameParty = (a: string | null) => (a || '').replace(/\s*\(Co-op\)$/i, '').trim() === partyName;
  const topRebels = rebelRanked.slice(0, REBELS_SHOWN).map((r) => {
    const mp = mpById.get(r.member_id);
    return {
      memberId: r.member_id,
      name: displayMpName(mp?.display_name || mp?.name) || `MP ${r.member_id}`,
      now: mp && (!mp.current_member ? 'no longer an MP' : !sameParty(mp.party) ? `now ${mp.party || 'Independent'}` : null),
      rebellions: r.rebellions,
      totalVotes: r.votes,
      rebelDivs: rebelVotes.filter((v) => v.member_id === r.member_id).map((v) => ({
        key: `${v.division_date_only}|${v.division_number}`, date: v.division_date_only, num: v.division_number, title: (v.division_title || '').trim(),
      })),
    };
  });

  const accent = party.party_colour || ACCENT;

  return (
    <OpenGovShell pageStamp="Parties">
      <a
        href={`/parties/${party.slug}`}
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      >
        ← {party.name}
      </a>

      <header style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>
          {party.name} · Whip cohesion + rebellion
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          How tightly {party.name} MPs vote together
        </h1>
        <div style={{ height: '4px', background: accent, width: '80px', marginBottom: '12px' }} />
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '60ch' }}>
          Every Commons division since the July 2024 election. In each one we take the side most {party.name} MPs voted for, and count any {party.name} MP who voted the other way as voting against the party. MPs are counted under the party they belonged to on the day of the vote. Free votes, where MPs are not told how to vote, are not marked by Parliament, so they are included.
        </p>
      </header>

      <PartySidebar party={party} active="whip">

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <Tile label="Voted with the party" value={`${cohesionPct.toFixed(1)}%`} sub={`of ${total.toLocaleString('en-GB')} votes by ${party.name} MPs`} />
        <Tile label="Divisions" value={divisionsCount.toLocaleString('en-GB')} sub="with at least one of its MPs voting" />
        <Tile label="All on one side" value={`${unanimousPct.toFixed(0)}%`} sub={`${unanimous.toLocaleString('en-GB')} divisions with no ${party.name} MP voting the other way`} />
      </div>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>MPs who voted against most of their party most often</h2>
        <p style={{ fontSize: '15px', marginBottom: '14px' }}>MPs with at least 20 votes as a {party.name} MP. A division where the party split exactly evenly counts for no one. Each name links to the MP; the divisions listed are their most recent votes against the party.</p>
        {topRebels.length === 0 && <p style={{ fontSize: '15px' }}>No {party.name} MP has voted against most of the party since the July 2024 election.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {topRebels.map((r, i) => {
            const shown = r.rebelDivs.slice(0, DIVS_PER_REBEL);
            const moreCount = r.rebelDivs.length - shown.length;
            return (
              <div key={r.memberId} style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace' }}>{i + 1}.</span>
                  <Link href={`/mps/${r.memberId}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{r.name}</Link>
                  {r.now && <span style={{ fontSize: '15px' }}>({r.now})</span>}
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{r.rebellions} vote{r.rebellions === 1 ? '' : 's'} against</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{((r.rebellions / r.totalVotes) * 100).toFixed(1)}% of {r.totalVotes} votes</span>
                </div>
                {shown.length > 0 && (
                  <div style={{ fontSize: '15px', marginTop: '5px', lineHeight: 1.55 }}>
                    {shown.map((k, j) => (
                      <span key={k.key}>
                        <Link href={`/divisions/pw-${k.date}-${k.num}-commons`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '2px' }}>{k.title || `Division ${k.num} (${k.date})`}</Link>
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
                const title = d.title || `Division ${d.num}`;
                return (
                  <tr key={d.key} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '15px' }}>{d.date}</td>
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

    </OpenGovShell>
  );
}

// The page's back link, heading and party navigation without the figures, for a party with nothing to measure.
function WhipFrame({ party, children }: { party: Party; children: React.ReactNode }) {
  const accent = party.party_colour || ACCENT;
  return (
    <OpenGovShell pageStamp="Parties">
      <a
        href={`/parties/${party.slug}`}
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      >
        ← {party.name}
      </a>

      <header style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px' }}>
          {party.name} · Whip cohesion + rebellion
        </p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15 }}>
          How tightly {party.name} MPs vote together
        </h1>
        <div style={{ height: '4px', background: accent, width: '80px', marginBottom: '12px' }} />
      </header>

      <PartySidebar party={party} active="whip">
        {children}
      </PartySidebar>
    </OpenGovShell>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ border: `1px solid ${HAIRLINE}`, padding: '12px 14px', background: CREAM }}>
      <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '22px', fontWeight: 'bold', color: ACCENT }}>{value}</div>
      <div style={{ fontSize: '15px', marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: 'var(--font-special-elite), monospace',
  fontSize: '20px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '12px',
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '15px', fontFamily: 'var(--font-special-elite), monospace' };
const th: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 'bold' };
const td: React.CSSProperties = { padding: '8px 6px', fontSize: '15px', verticalAlign: 'top' };
