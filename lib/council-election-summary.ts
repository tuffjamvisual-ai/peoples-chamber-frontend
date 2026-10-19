// Summary of a council's latest election for the council page's "Last election"
// line: each party's share of the vote and seats won, largest share first.
// Reads the council election results tables (scripts/migrations/2026-10-17m-council-election-results.sql),
// which are only loaded for councils whose every ward result was collected, so the
// shares are never worked out from a partial count.
//
// Share = all votes for a party's candidates / all votes cast, across the council
// (in wards electing several councillors each voter has several votes, which is
// the usual basis councils and the press use for council wide shares).

import { supabase } from '@/lib/supabase';

// Short names, matching the seats lines elsewhere on the council page. The register's
// full names ("Conservative and Unionist Party", "Labour and Co-operative Party (joint
// description ...)") are too long for a one line summary. Labour and Co-operative
// candidates stand for the Labour Party, so they are counted with Labour, as councils
// and the press normally do.
export function shortParty(name: string): string {
  // A joint entry named as such ("Plaid Cymru and Green (joint)") is shown whole, not as its first party.
  if (/\(joint\)$/i.test(name.trim())) return name.trim();
  const n = name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim().replace(/^the /i, '');
  if (/^labour\b/i.test(n)) return 'Labour';
  if (/^conservative\b/i.test(n)) return 'Conservative';
  if (/^liberal democrat/i.test(n)) return 'Liberal Democrats';
  if (/^green party/i.test(n) || /^scottish green/i.test(n)) return 'Green';
  if (/^reform uk/i.test(n)) return 'Reform UK';
  if (/^plaid cymru/i.test(n)) return 'Plaid Cymru';
  if (/^scottish national party/i.test(n)) return 'SNP';
  if (/^independent$/i.test(n)) return 'Independent';
  return n;
}

export type PartyResult = { party: string; votes: number; share: number; seats: number };
export type ElectionSummary = { date: string; wards: number; seats: number; parties: PartyResult[]; source: string | null; stv: boolean; unopposedSeats: number; labourCoop: boolean };

export async function loadElectionSummary(gssCode: string | null): Promise<ElectionSummary | null> {
  if (!gssCode) return null;
  const { data: el, error } = await supabase
    .from('council_elections')
    .select('id, election_date, wards_contested, seats_contested, source_note')
    .eq('council_gss_code', gssCode)
    .order('election_date', { ascending: false })
    .limit(20);
  if (error || !el?.length) return null; // tables not created yet, or no results held
  // The main election is the latest with more than one ward; later single ward polls
  // (postponed after a candidate died) belong to it.
  const main = el.find((e) => e.wards_contested > 1) ?? el[0];
  // Byelections are never counted in: only single ward polls within 60 days after the main
  // election day (a postponed poll) are added, and byelection-only contests are not loaded.
  const limit = new Date(`${main.election_date}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 60);
  const until = limit.toISOString().slice(0, 10);
  const ids = el
    .filter((e) => e.id === main.id || (e.wards_contested === 1 && e.election_date > main.election_date && e.election_date <= until))
    .map((e) => e.id);

  const { data: wards, error: wErr } = await supabase.from('council_election_wards').select('id').in('election_id', ids).limit(1000);
  if (wErr || !wards?.length) return null;
  const wardIds = wards.map((w) => w.id as number);

  // votes is null for a candidate elected unopposed (no poll held in that ward).
  const rows: { party_id: string | null; party_published: string | null; votes: number | null; elected: boolean }[] = [];
  for (let i = 0; i < wardIds.length; i += 100) {
    for (let from = 0; from < 20_000; from += 1000) {
      const { data, error: cErr } = await supabase
        .from('council_election_candidates')
        .select('party_id, party_published, votes, elected')
        .in('ward_id', wardIds.slice(i, i + 100))
        .order('id')
        .range(from, from + 999);
      if (cErr) return null;
      rows.push(...((data ?? []) as typeof rows));
      if (!data || data.length < 1000) break;
    }
  }
  if (!rows.length) return null;

  const pids = [...new Set(rows.map((r) => r.party_id).filter((p): p is string => !!p))];
  const names = new Map<string, string>();
  if (pids.length) {
    const { data: pn } = await supabase.from('party_names').select('party_id, party_name').in('party_id', pids);
    for (const p of (pn ?? []) as { party_id: string; party_name: string }[]) names.set(p.party_id, p.party_name);
  }
  const by = new Map<string, { votes: number; seats: number }>();
  let total = 0;
  let unopposedSeats = 0;
  let labourCoop = false; // any Labour and Co-operative candidate counted in with Labour
  for (const r of rows) {
    const full = (r.party_id && names.get(r.party_id)) || r.party_published || 'No description';
    if (/co-?operative/i.test(full) && /labour/i.test(full)) labourCoop = true;
    const name = shortParty(full);
    const e = by.get(name) ?? { votes: 0, seats: 0 };
    e.votes += r.votes ?? 0;
    if (r.elected) e.seats += 1;
    if (r.elected && r.votes == null) unopposedSeats += 1;
    by.set(name, e);
    total += r.votes ?? 0;
  }
  if (!total) return null;
  const parties = [...by.entries()]
    .map(([party, e]) => ({ party, votes: e.votes, share: (e.votes / total) * 100, seats: e.seats }))
    .sort((a, b) => b.votes - a.votes);
  return { date: main.election_date as string, wards: wardIds.length, seats: parties.reduce((t, p) => t + p.seats, 0), parties, source: (main.source_note as string | null) ?? null, stv: /^[SN]/.test(gssCode), unopposedSeats, labourCoop };
}
