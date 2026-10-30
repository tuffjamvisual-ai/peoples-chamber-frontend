// "Latest election" section for council pages (server component). Reads the
// council election results tables (scripts/migrations/2026-10-17m-council-election-results.sql),
// collected from each council's own published results (its returning officer).
//
// Shows the council's latest election: date, seats won by each party at that
// election (not the whole council where it elects by thirds), turnout, then every
// ward with its candidates, party, votes and share. A ward whose poll was held on
// a later date (a postponed poll) is shown with its own date. Renders nothing when
// no results are held, so the Elections tab stays hidden.

import { supabase } from '@/lib/supabase';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';

type Election = { id: number; election_date: string; wards_contested: number; seats_contested: number; turnout_pct: number | null; source_note: string };
type Ward = { id: number; election_id: number; ward_gss_code: string; ward_name: string; seats: number; electorate: number | null; turnout_pct: number | null; ballots_rejected: number | null; source_url: string };
type Candidate = { ward_id: number; candidate_display: string; party_published: string | null; party_id: string | null; votes: number; share_pct: number; elected: boolean };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const n0 = (n: number) => Math.round(n).toLocaleString('en-GB');

async function fetchCandidates(wardIds: number[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  // PostgREST returns at most 1,000 rows per call; a large council has several thousand candidates.
  for (let i = 0; i < wardIds.length; i += 100) {
    const ids = wardIds.slice(i, i + 100);
    for (let from = 0; from < 20_000; from += 1000) {
      const { data, error } = await supabase
        .from('council_election_candidates')
        .select('ward_id, candidate_display, party_published, party_id, votes, share_pct, elected')
        .in('ward_id', ids)
        .order('id')
        .range(from, from + 999);
      if (error) throw new Error(`CouncilElectionSection candidates: ${error.message}`);
      out.push(...((data ?? []) as Candidate[]));
      if (!data || data.length < 1000) break;
    }
  }
  return out;
}

export default async function CouncilElectionSection({ gssCode, councilName }: { gssCode: string | null; councilName: string }) {
  if (!gssCode) return null;
  const { data: elData, error: elErr } = await supabase
    .from('council_elections')
    .select('id, election_date, wards_contested, seats_contested, turnout_pct, source_note')
    .eq('council_gss_code', gssCode)
    .order('election_date', { ascending: false })
    .limit(20);
  if (elErr) { console.error('CouncilElectionSection elections:', elErr.message); return null; }
  const elections = (elData ?? []) as Election[];
  if (elections.length === 0) return null;

  // The main election is the latest one with more than one ward (or the latest if all are single
  // ward polls); polls held after it on a later date (postponed polls) are shown alongside it.
  const main = elections.find((e) => e.wards_contested > 1) ?? elections[0];
  const later = elections.filter((e) => e.id !== main.id && e.election_date > main.election_date);
  const shown = [main, ...later];
  const dateOf = new Map(shown.map((e) => [e.id, e.election_date]));

  const { data: wData, error: wErr } = await supabase
    .from('council_election_wards')
    .select('id, election_id, ward_gss_code, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url')
    .in('election_id', shown.map((e) => e.id))
    .order('ward_name')
    .limit(1000);
  if (wErr) { console.error('CouncilElectionSection wards:', wErr.message); return null; }
  const wards = (wData ?? []) as Ward[];
  if (wards.length === 0) return null;

  let candidates: Candidate[];
  try { candidates = await fetchCandidates(wards.map((w) => w.id)); }
  catch (e) { console.error(e); return null; }

  const partyIds = [...new Set(candidates.map((c) => c.party_id).filter((p): p is string => !!p))];
  const partyName = new Map<string, string>();
  if (partyIds.length) {
    const { data: pData } = await supabase.from('party_names').select('party_id, party_name').in('party_id', partyIds);
    for (const p of (pData ?? []) as { party_id: string; party_name: string }[]) partyName.set(p.party_id, p.party_name);
  }
  const party = (c: Candidate) => (c.party_id ? partyName.get(c.party_id) ?? c.party_published ?? 'No description' : c.party_published ?? 'No description');

  const byWard = new Map<number, Candidate[]>();
  for (const c of candidates) byWard.set(c.ward_id, [...(byWard.get(c.ward_id) ?? []), c]);
  for (const list of byWard.values()) list.sort((a, b) => b.votes - a.votes);

  // Seats won at this election, by party.
  const won = new Map<string, number>();
  for (const c of candidates) if (c.elected) won.set(party(c), (won.get(party(c)) ?? 0) + 1);
  const wonList = [...won.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const seats = wards.reduce((t, w) => t + w.seats, 0);
  const isDivision = wards.length > 0 && /^E58|^E10/.test(gssCode); // county councils call them divisions
  const unit = isDivision ? 'division' : 'ward';

  const th: React.CSSProperties = { textAlign: 'left', padding: '5px 12px 5px 0', fontWeight: 'bold', borderBottom: `1px solid ${INK}` };
  const td: React.CSSProperties = { padding: '5px 12px 5px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, verticalAlign: 'top' };
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Latest election
      </h2>
      <p style={{ fontFamily: MONO, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
        <strong>{fmtDate(main.election_date)}</strong>: {n0(seats)} seat{seats === 1 ? '' : 's'} in {n0(wards.length)} {unit}{wards.length === 1 ? '' : 's'}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 14px' }}>
        {main.turnout_pct != null ? `Turnout ${Number(main.turnout_pct).toFixed(1)}%` : 'Turnout was not published by the council for every ward'}
      </p>

      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>Seats won at this election</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', fontFamily: MONO, fontSize: '15px', color: INK }}>
        {wonList.map(([p, n]) => (
          <li key={p} style={{ padding: '3px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, display: 'flex', justifyContent: 'space-between', maxWidth: '420px' }}>
            <span>{p}</span><strong>{n}</strong>
          </li>
        ))}
      </ul>

      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>Results in each {unit}</p>
      {wards.map((w) => {
        const list = byWard.get(w.id) ?? [];
        const winners = list.filter((c) => c.elected);
        const winnerParties = [...new Set(winners.map(party))].join(', ');
        const otherDate = dateOf.get(w.election_id) !== main.election_date ? dateOf.get(w.election_id) : null;
        return (
          <details key={w.id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, padding: '6px 0' }}>
            <summary style={{ fontFamily: MONO, fontSize: '15px', color: INK, cursor: 'pointer' }}>
              <strong>{w.ward_name}</strong>{winnerParties ? `: ${winnerParties}` : ''}{otherDate ? ` (poll held ${fmtDate(otherDate)})` : ''}
            </summary>
            <div style={{ overflowX: 'auto', margin: '8px 0 4px' }}>
              <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, minWidth: '420px' }}>
                <thead>
                  <tr><th style={th}>Candidate</th><th style={th}>Party</th><th style={{ ...th, textAlign: 'right' }}>Votes</th><th style={{ ...th, textAlign: 'right' }}>Share</th></tr>
                </thead>
                <tbody>
                  {list.map((c, i) => (
                    <tr key={i}>
                      <td style={td}>{c.elected ? <strong>{c.candidate_display} (elected)</strong> : c.candidate_display}</td>
                      <td style={td}>{party(c)}</td>
                      <td style={tdR}>{n0(c.votes)}</td>
                      <td style={tdR}>{Number(c.share_pct).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '4px 0 0' }}>
              {[
                `${w.seats} seat${w.seats === 1 ? '' : 's'}`,
                w.electorate != null ? `electorate ${n0(w.electorate)}` : null,
                w.turnout_pct != null ? `turnout ${Number(w.turnout_pct).toFixed(1)}%` : 'turnout not published',
                w.ballots_rejected != null ? `${n0(w.ballots_rejected)} rejected ballots` : null,
              ].filter(Boolean).join(' · ')}
              {' · '}<a href={w.source_url} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>official result</a>
            </p>
          </details>
        );
      })}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '14px 0 0' }}>
        Share is each candidate&rsquo;s votes as a share of all votes cast in the {unit}. Where several seats were filled, each voter could vote for up to that many candidates. Source: results published by {councilName}&rsquo;s returning officer{later.length ? '; polls held after the main election day are shown with their own date' : ''}.
      </p>
    </section>
  );
}
