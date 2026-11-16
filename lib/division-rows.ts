// The rows a Commons division gives mp_division_votes (moved out of app/api/sync-commons-votes-api/route.ts for F03,
// ENTRY 134, so the voters it refreshes can be tested): one row per member, Ayes and Noes with their tellers. A member in
// both the Ayes and the Noes is a deliberate both-lobby vote (vote_type 'both'); the same member twice on one side
// (Ayes and AyeTellers) is kept once. Pure: no database, no network.
export type DivisionMember = { MemberId: number; Party?: string | null; Name?: string };
export type DivisionDetail = { DivisionId: number; Number: number; Title?: string | null; Ayes?: DivisionMember[]; Noes?: DivisionMember[]; AyeTellers?: DivisionMember[]; NoTellers?: DivisionMember[] };
export type DivisionRow = {
  member_id: number; division_id: number; vote_type: 'aye' | 'no' | 'both'; division_date: string; division_title: string | null;
  division_number: number; division_date_only: string; source: string; is_teller: boolean; is_rebellion: boolean; party: string | null;
};

export function divisionRows(det: DivisionDetail, dateOnly: string): { rows: DivisionRow[]; bothLobby: number[] } {
  const ts = `${dateOnly} 00:00:00`;
  const all: DivisionRow[] = [];
  const add = (members: DivisionMember[] | undefined, vote: 'aye' | 'no', teller: boolean) => {
    for (const m of members || []) {
      if (!m.MemberId) continue;
      all.push({
        member_id: m.MemberId, division_id: det.DivisionId, vote_type: vote,
        division_date: ts, division_title: det.Title || null, division_number: det.Number,
        division_date_only: dateOnly, source: 'commonsvotes-api', is_teller: teller, is_rebellion: false,
        party: m.Party ? String(m.Party).trim() : null,
      });
    }
  };
  add(det.Ayes, 'aye', false); add(det.AyeTellers, 'aye', true);
  add(det.Noes, 'no', false); add(det.NoTellers, 'no', true);
  const at = new Map<number, number>();
  const rows: DivisionRow[] = [];
  const bothLobby: number[] = [];
  for (const r of all) {
    const i = at.get(r.member_id);
    if (i === undefined) { at.set(r.member_id, rows.length); rows.push(r); continue; }
    if (rows[i].vote_type !== 'both' && rows[i].vote_type !== r.vote_type) { rows[i] = { ...rows[i], vote_type: 'both' }; bothLobby.push(r.member_id); }
  }
  return { rows, bothLobby };
}
