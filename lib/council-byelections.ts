// Council byelections since May 2026 (owner's approval of the design, 30 Oct 2026): the rows of council_byelections
// (migration 2026-10-30e, loaded by scripts/import-council-byelections.js) for one council, newest first, and the
// sentence each one is shown as on /councils/[slug].
import { supabase } from '@/lib/supabase';

export type CouncilByelection = {
  ward_name: string;
  poll_date: string;
  kind: 'by-election' | 'postponed_ordinary';
  winner_name: string;
  winner_party: string | null;
  winner_votes: number | null;
  runner_up_name: string | null;
  runner_up_party: string | null;
  runner_up_votes: number | null;
  turnout_pct: number | null;
  declaration_url: string;
  former_councillor: string | null;
  former_party_at_vacancy: string | null;
  former_party_source: 'council' | 'secondary' | null;
  vacancy_reason: string | null;
  joint_runners_up: { name: string; party: string | null }[] | null;
  status: 'confirmed_council' | 'winner_only_council';
};

// A failed read throws, so the last good page stays up. Until migration 2026-10-30e is applied the table does not
// exist (Previews read the production database): that reads as no rows, so the section is simply not shown.
export async function loadCouncilByelections(slug: string): Promise<CouncilByelection[]> {
  const { data, error } = await supabase
    .from('council_byelections')
    .select('ward_name, poll_date, kind, winner_name, winner_party, winner_votes, runner_up_name, runner_up_party, runner_up_votes, turnout_pct, declaration_url, former_councillor, former_party_at_vacancy, former_party_source, vacancy_reason, joint_runners_up, status')
    .eq('council_slug', slug)
    .order('poll_date', { ascending: false })
    .order('ward_name');
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return [];
    throw new Error(`council_byelections ${slug}: ${error.message}`);
  }
  return (data ?? []) as CouncilByelection[];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const n0 = (n: number) => n.toLocaleString('en-GB');
const withParty = (name: string, party: string | null) => (party ? `${name} (${party})` : name);
const pct = (n: number) => String(Number(n.toFixed(2)));

// "<date>, <ward>: <winner> (<party>) elected with <votes> votes; <runner up> (<party>) <votes>. Turnout <x> per cent."
// Without vote counts: "<winner> (<party>) elected. The council has not published vote counts." Parties are as on
// the declaration. Never "gain" or "hold".
export function resultSentence(r: CouncilByelection): string {
  const head = `${longDate(r.poll_date)}, ${r.ward_name}: `;
  if (r.winner_votes == null) return `${head}${withParty(r.winner_name, r.winner_party)} elected. The council has not published vote counts.`;
  const runnerUp = r.runner_up_name && r.runner_up_votes != null
    ? `; ${withParty(r.runner_up_name, r.runner_up_party)} ${n0(r.runner_up_votes)}`
    : '';
  const turnout = r.turnout_pct != null ? ` Turnout ${pct(r.turnout_pct)} per cent.` : '';
  return `${head}${withParty(r.winner_name, r.winner_party)} elected with ${n0(r.winner_votes)} votes${runnerUp}.${turnout}`;
}

// Runners up tied on the same votes (Flintshire, Higher Kinnerton): "Joint runners up: A (party) and B (party), 21 votes
// each." Names and parties as in the research file.
export function jointRunnersUp(r: CouncilByelection): string | null {
  const j = r.joint_runners_up;
  if (!j || j.length < 2 || r.runner_up_votes == null || r.winner_votes == null) return null;
  const people = j.map((p) => withParty(p.name, p.party));
  const list = people.length === 2 ? `${people[0]} and ${people[1]}` : `${people.slice(0, -1).join(', ')} and ${people[people.length - 1]}`;
  return `Joint runners up: ${list}, ${n0(r.runner_up_votes)} votes each.`;
}

// The line under the result: a postponed ordinary poll is labelled as such; otherwise who held the seat, with the
// party only where the council's own page gives it.
export function contextSentence(r: CouncilByelection): string | null {
  if (r.kind === 'postponed_ordinary') return 'Poll postponed from May 2026.';
  if (!r.former_councillor) return null;
  const who = r.former_party_source === 'council' ? withParty(r.former_councillor, r.former_party_at_vacancy) : r.former_councillor;
  return r.vacancy_reason ? `Seat previously held by ${who}, ${r.vacancy_reason}.` : `Seat previously held by ${who}.`;
}
