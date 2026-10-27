// Commons seat history for mp_biography.representations, built from the Members API
// History endpoint (owner's approval, 22 Oct 2026). The Biography endpoint merges a
// seat across real breaks (Farage's Clacton showed as continuous from 4 Jul 2024
// although he resigned on 8 Jul 2026 and returned on 13 Aug 2026); History keeps
// each membership separate and gives the reason it ended.
//
// Rules:
//  - Two memberships of the same constituency (same constituency id) are merged only
//    when the first ended at a dissolution and the second began at the general
//    election that followed it. Any other break shows as separate entries.
//  - A membership that ends a break (the member was not returned straight away) gets
//    a plain label: "resigned", "lost seat at general election", "stood down at
//    general election", or "left at general election" when the candidates cannot be
//    checked. Seat changes at a general election (boundary changes, moving seat) are
//    not breaks and get no label.

const MEMBERS_API = 'https://members-api.parliament.uk/api';
const HEADERS = { 'User-Agent': 'PeoplesChamber/1.0 (bio-sync)', Accept: 'application/json' };

// History's membershipEndReasonId values seen for Commons memberships (its text fields are
// empty): 7 ends every membership at a dissolution; 9 and 10 are the two offices an MP
// takes to resign (Chiltern Hundreds, Manor of Northstead). Other ids get no label.
const DISSOLUTION = 7;
const RESIGNED = new Set([9, 10]);
// A dissolution runs about five to seven weeks before polling day.
const MAX_DISSOLUTION_DAYS = 60;

export interface Representation {
  id: number;
  name: string;
  house: 1;
  startDate: string;
  endDate: string | null;
  endReason: string | null;
}

export interface HistoryMember {
  id: number;
  houseMembershipHistory: {
    membershipFrom: string;
    membershipFromId: number;
    house: number;
    membershipStartDate: string;
    membershipEndDate: string | null;
    membershipEndReasonId: number | null;
  }[];
  nameHistory?: { nameListAs?: string | null }[];
}

const day = (s: string) => Date.parse(s.slice(0, 10));
const daysBetween = (a: string, b: string) => (day(b) - day(a)) / 86_400_000;

// 20 s per request (job 79, 27 Oct 2026: it had none, so one stalled request could hold the biography sync past its
// limit). A failed or limited request gives null, as before: the member's seats are then left as they are.
async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// History for up to 20 members per request. Members the API did not return are absent.
export async function fetchHistory(memberIds: number[]): Promise<Map<number, HistoryMember>> {
  const out = new Map<number, HistoryMember>();
  for (let i = 0; i < memberIds.length; i += 20) {
    const ids = memberIds.slice(i, i + 20);
    const json = (await getJson(`${MEMBERS_API}/Members/History?${ids.map((x) => `ids=${x}`).join('&')}`)) as { value: HistoryMember }[] | null;
    for (const m of json || []) if (m?.value?.id) out.set(m.value.id, m.value);
  }
  return out;
}

type ElectionResult = { electionId: number; electionDate: string; isGeneralElection: boolean; candidates?: { name?: string | null }[] | null };
const resultsCache = new Map<number, Promise<ElectionResult[] | null>>();

// The list gives each election without its candidates; ElectionResult/{electionId} has them.
function constituencyResults(constituencyId: number) {
  if (!resultsCache.has(constituencyId)) {
    resultsCache.set(constituencyId, getJson(`${MEMBERS_API}/Location/Constituency/${constituencyId}/ElectionResults`)
      .then((j) => ((j as { value?: ElectionResult[] } | null)?.value ?? null)));
  }
  return resultsCache.get(constituencyId)!;
}

// After a dissolution with no return: did the member stand again in the same seat and lose?
// The API holds results from 2010; earlier elections, or a failed lookup, get the neutral label.
async function generalElectionLabel(constituencyId: number, dissolvedOn: string, surnames: string[]): Promise<string> {
  const results = await constituencyResults(constituencyId);
  const ge = results?.find((r) => r.isGeneralElection && daysBetween(dissolvedOn, r.electionDate) >= 0 && daysBetween(dissolvedOn, r.electionDate) <= MAX_DISSOLUTION_DAYS);
  if (!ge) return 'left at general election';
  const detail = (await getJson(`${MEMBERS_API}/Location/Constituency/${constituencyId}/ElectionResult/${ge.electionId}`)) as { value?: ElectionResult } | null;
  const candidates = detail?.value?.candidates;
  if (!candidates?.length) return 'left at general election';
  const stood = candidates.some((c) => {
    const words = (c.name || '').toLowerCase().split(/\s+/);
    return surnames.some((s) => words.includes(s));
  });
  return stood ? 'lost seat at general election' : 'stood down at general election';
}

export async function buildRepresentations(member: HistoryMember): Promise<Representation[]> {
  const rows = member.houseMembershipHistory
    .filter((h) => h.house === 1 && h.membershipStartDate)
    .sort((a, b) => a.membershipStartDate.localeCompare(b.membershipStartDate));
  const surnames = Array.from(new Set((member.nameHistory || [])
    .map((n) => (n.nameListAs || '').split(',')[0].trim().toLowerCase())
    .filter(Boolean)));

  // Merge across a dissolution when the same constituency returned the member at the next election.
  const merged: (Representation & { endReasonId: number | null })[] = [];
  for (const h of rows) {
    const prev = merged[merged.length - 1];
    if (prev && prev.id === h.membershipFromId && prev.endDate && prev.endReasonId === DISSOLUTION
      && daysBetween(prev.endDate, h.membershipStartDate) >= 0 && daysBetween(prev.endDate, h.membershipStartDate) <= MAX_DISSOLUTION_DAYS) {
      prev.endDate = h.membershipEndDate;
      prev.endReasonId = h.membershipEndReasonId;
      continue;
    }
    merged.push({
      id: h.membershipFromId, name: h.membershipFrom, house: 1, startDate: h.membershipStartDate,
      endDate: h.membershipEndDate, endReason: null, endReasonId: h.membershipEndReasonId,
    });
  }

  // Label the memberships that end a break: no other Commons membership began within a dissolution of the end.
  for (const r of merged) {
    if (!r.endDate) continue;
    const returnedAtOnce = merged.some((o) => o !== r && daysBetween(r.endDate!, o.startDate) >= 0 && daysBetween(r.endDate!, o.startDate) <= MAX_DISSOLUTION_DAYS && r.endReasonId === DISSOLUTION);
    if (returnedAtOnce) continue;
    if (r.endReasonId != null && RESIGNED.has(r.endReasonId)) r.endReason = 'resigned';
    else if (r.endReasonId === DISSOLUTION) r.endReason = await generalElectionLabel(r.id, r.endDate, surnames);
  }

  return merged.map(({ endReasonId: _drop, ...r }) => r);
}

// Stable comparison of a stored array with a built one (key order and extra stored keys ignored).
export function sameRepresentations(stored: unknown, built: Representation[]): boolean {
  const norm = (a: Partial<Representation>[]) => JSON.stringify(a
    .map((r) => [r.id, r.name, (r.startDate || '').slice(0, 10), (r.endDate || '').slice(0, 10), r.endReason ?? null])
    .sort((x, y) => String(x[2]).localeCompare(String(y[2]))));
  return Array.isArray(stored) && norm(stored as Partial<Representation>[]) === norm(built);
}
