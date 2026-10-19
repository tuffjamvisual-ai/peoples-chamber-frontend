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
export type ElectionSummary = { date: string; wards: number; seats: number; parties: PartyResult[]; source: string | null; stv: boolean; unopposedSeats: number; labourCoop: boolean;
  turnout: number | null;   // council-wide turnout as stored for the main election; null when not held
  // single ward polls counted in with the main election: 'postponed' (the ward had no poll on the main day) or
  // 'unfilled' (the ward also appears in the main election, under-contested; this poll filled the seats left over)
  extraPolls: { ward: string; date: string; reason: 'postponed' | 'unfilled' }[] };

export async function loadElectionSummary(gssCode: string | null): Promise<ElectionSummary | null> {
  if (!gssCode) return null;
  const { data: el, error } = await supabase
    .from('council_elections')
    .select('id, election_date, wards_contested, seats_contested, source_note, turnout_pct')
    .eq('council_gss_code', gssCode)
    .order('election_date', { ascending: false })
    .limit(20);
  if (error || !el?.length) return null; // tables not created yet, or no results held
  // A smaller poll held within 60 days after a larger election belongs to it (a ward postponed after a candidate
  // died, or a poll for seats left unfilled when too few stood). The main election is the latest one that is not
  // such a poll. Byelections are never counted in: byelection-only contests are not loaded.
  const plus60 = (d: string) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + 60); return x.toISOString().slice(0, 10); };
  const isExtra = (e: (typeof el)[number]) =>
    el.some((f) => f.wards_contested > e.wards_contested && f.election_date < e.election_date && e.election_date <= plus60(f.election_date as string));
  const main = el.find((e) => !isExtra(e)) ?? el[0];
  const until = plus60(main.election_date as string);
  const ids = el
    .filter((e) => e.id === main.id || (e.wards_contested < main.wards_contested && e.election_date > main.election_date && e.election_date <= until))
    .map((e) => e.id);

  const { data: wards, error: wErr } = await supabase.from('council_election_wards').select('id, election_id, ward_name').in('election_id', ids).limit(1000);
  if (wErr || !wards?.length) return null;
  const wardIds = wards.map((w) => w.id as number);
  const mainWards = new Set(wards.filter((w) => w.election_id === main.id).map((w) => w.ward_name as string));
  const extraPolls = el
    .filter((e) => ids.includes(e.id) && e.id !== main.id)
    .flatMap((e) => wards.filter((w) => w.election_id === e.id).map((w) => ({
      ward: w.ward_name as string, date: e.election_date as string,
      reason: (mainWards.has(w.ward_name as string) ? 'unfilled' : 'postponed') as 'postponed' | 'unfilled',
    })));

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
  return { date: main.election_date as string, wards: new Set(wards.map((w) => w.ward_name as string)).size,   // distinct wards (a ward with a later poll for unfilled seats counts once)
    seats: parties.reduce((t, p) => t + p.seats, 0), parties, source: (main.source_note as string | null) ?? null, stv: /^[SN]/.test(gssCode), unopposedSeats, labourCoop,
    turnout: main.turnout_pct == null ? null : Number(main.turnout_pct), extraPolls };
}
