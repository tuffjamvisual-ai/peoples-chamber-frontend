// Former MPs (owner's decision, 28 Oct 2026, Search Console fixes): every member Parliament records as having sat in
// the Commons gets a basic page at /mps/<id> even when they are not in our mps table, which holds the current
// Commons and a few members who left after it was built. The page is built from Parliament's Members API History
// endpoint (name, party, seats and dates served), never a 404. A member who only ever sat in the Lords has no
// Open Govt page: /mps/<id> sends them, permanently, to their page on members.parliament.uk.
import { cache } from 'react';

const MEMBERS_API = 'https://members-api.parliament.uk/api/Members';
const UA = { 'User-Agent': 'OpenGovt/1.0 (+https://www.opengovt.uk)' };
export const parliamentMemberUrl = (id: number) => `https://members.parliament.uk/member/${id}/career`;

type Membership = { house: number; membershipFrom: string | null; membershipStartDate: string | null; membershipEndDate: string | null };
type Party = { startDate: string | null; endDate: string | null; party: { name: string; backgroundColour: string | null } | null };
type History = {
  id: number;
  nameHistory?: { nameDisplayAs: string; startDate: string | null; endDate: string | null }[] | null;
  partyHistory?: Party[] | null;
  houseMembershipHistory?: Membership[] | null;
};

// One seat and the years it was held, consecutive terms joined: "Stafford, 2010 to 2019".
export type FormerSeat = { constituency: string; from: string; to: string | null };
export type FormerMp = {
  memberId: number;
  name: string;
  party: string | null;
  partyColour: string | null;
  seats: FormerSeat[];
  firstYear: number | null;
  lastYear: number | null;
  sitsInLords: boolean;
};
export type MemberLookup = { kind: 'former_mp'; mp: FormerMp } | { kind: 'lords_only' } | { kind: 'unknown' };

const year = (d: string | null) => (d ? Number(d.slice(0, 4)) : null);

function build(h: History): MemberLookup {
  const all = h.houseMembershipHistory ?? [];
  const commons = all.filter((m) => m.house === 1).sort((a, b) => String(a.membershipStartDate).localeCompare(String(b.membershipStartDate)));
  if (!commons.length) return all.length ? { kind: 'lords_only' } : { kind: 'unknown' };
  const seats: FormerSeat[] = [];
  for (const m of commons) {
    const last = seats[seats.length - 1];
    const name = (m.membershipFrom ?? '').trim();
    // A seat held over several Parliaments is one line; a gap of more than a year starts a new line.
    if (last && last.constituency === name && last.to && m.membershipStartDate
      && Date.parse(m.membershipStartDate) - Date.parse(last.to) < 400 * 86400000) last.to = m.membershipEndDate;
    else seats.push({ constituency: name, from: m.membershipStartDate ?? '', to: m.membershipEndDate });
  }
  const lastCommons = commons[commons.length - 1];
  // The party held at the end of the member's last Commons term.
  const end = lastCommons.membershipEndDate ?? new Date().toISOString();
  const party = (h.partyHistory ?? [])
    .filter((p) => p.party && (!p.startDate || p.startDate <= end))
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))[0]?.party ?? null;
  const names = h.nameHistory ?? [];
  const name = (names.find((n) => !n.endDate) ?? names[names.length - 1])?.nameDisplayAs ?? `Member ${h.id}`;
  return {
    kind: 'former_mp',
    mp: {
      memberId: h.id,
      name: name.replace(/^(?:Mr|Mrs|Miss|Ms) /, ''),
      party: party?.name ?? null,
      partyColour: party?.backgroundColour ? `#${party.backgroundColour}` : null,
      seats,
      firstYear: year(commons[0].membershipStartDate),
      lastYear: year(lastCommons.membershipEndDate),
      sitsInLords: all.some((m) => m.house === 2 && !m.membershipEndDate),
    },
  };
}

// Kept for 30 days: a former member's record does not change. Parliament answering anything but a clear "no such
// member" throws, so an outage is never published (and cached) as a missing page.
export const lookupMember = cache(async (memberId: number): Promise<MemberLookup> => {
  const res = await fetch(`${MEMBERS_API}/History?ids=${memberId}`, { headers: UA, next: { revalidate: 30 * 86400 } });
  if (res.status === 404 || res.status === 400) return { kind: 'unknown' };
  if (!res.ok) throw new Error(`Members API History ${memberId}: HTTP ${res.status}`);
  const json = (await res.json()) as { value?: History }[];
  const h = json?.[0]?.value;
  return h && h.id === memberId ? build(h) : { kind: 'unknown' };
});

// "2010 to 2019", or "since 2024" for a seat still held (a member we do not list as current).
export function seatYears(s: FormerSeat): string {
  const from = year(s.from);
  const to = year(s.to);
  return to ? `${from} to ${to}` : `since ${from}`;
}

// Former MPs whose name matches a search (Parliament's own member search, Commons, not current), for /search.
export async function searchFormerMps(q: string, take = 10): Promise<{ memberId: number; name: string; party: string | null; constituency: string | null }[]> {
  const term = q.replace(/["%_]/g, ' ').trim();
  if (term.length < 3) return [];
  const url = `${MEMBERS_API}/Search?Name=${encodeURIComponent(term)}&House=1&IsCurrentMember=false&skip=0&take=${take}`;
  const res = await fetch(url, { headers: UA, next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Members API Search: HTTP ${res.status}`);
  const json = (await res.json()) as { items?: { value?: { id: number; nameDisplayAs: string; latestParty?: { name: string } | null; latestHouseMembership?: { house: number; membershipFrom: string | null } | null } }[] };
  return (json.items ?? [])
    .map((i) => i.value)
    .filter((v): v is NonNullable<typeof v> => !!v)
    .map((v) => ({
      memberId: v.id,
      name: v.nameDisplayAs.replace(/^(?:Mr|Mrs|Miss|Ms) /, ''),
      party: v.latestParty?.name ?? null,
      constituency: v.latestHouseMembership?.house === 1 ? v.latestHouseMembership.membershipFrom : null,
    }));
}
