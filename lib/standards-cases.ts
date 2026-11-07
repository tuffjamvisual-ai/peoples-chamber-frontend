// Commissioner for Standards cases (owner, 7 Nov 2026, T1): the Parliamentary Commissioner for Standards' published lists of
// allegations rectified, not upheld and reported to the Committee on Standards, as collected from parliament.uk by Cowork
// (lib/data/standards-cases.json; the site blocks scripts, so the list is a data file, not a sync). Each person named is
// linked to a member id only where exactly one member matched and sat in that House during the period
// ("Claude outputs/standards-cases/matches.csv"). The names stay exactly as the Commissioner printed them.
import data from './data/standards-cases.json';

export type StandardsOutcome = 'Rectified' | 'Not upheld' | 'Reported to the Committee on Standards';
export type StandardsPerson = { listed: string; memberId: number | null; house: 'Commons' | 'Lords' | null; slug: string | null };
export type StandardsCase = { outcome: StandardsOutcome; period: string; nameAsListed: string; documentUrl: string; listPage: string; people: StandardsPerson[] };

export const STANDARDS = data as unknown as {
  source: string; sourceUrl: string; licence: string; collected: string; collector: string; matching: string; cases: StandardsCase[];
};

export const OUTCOMES: StandardsOutcome[] = ['Rectified', 'Not upheld', 'Reported to the Committee on Standards'];

// The Commissioner's own list page for each outcome (checked on parliament.uk, 7 Nov 2026).
const PCFS = 'https://www.parliament.uk/mps-lords-and-offices/standards-and-financial-interests/parliamentary-commissioner-for-standards/complaints-and-investigations/';
export const OUTCOME_PAGE: Record<StandardsOutcome, string> = {
  Rectified: `${PCFS}allegations--rectified/`,
  'Not upheld': `${PCFS}allegations-the-commissioner-has-not-upheld/`,
  'Reported to the Committee on Standards': `${PCFS}allegations-reported-to-the-standards-committee/`,
};
export const OUTCOME_KEY: Record<StandardsOutcome, string> = { Rectified: 'rectified', 'Not upheld': 'not-upheld', 'Reported to the Committee on Standards': 'reported' };

// Newest first: "2026" before "2025", "2023" before "2022-23", "2022-23" before "2022".
const periodKey = (p: string) => {
  const [a, b] = p.split('-');
  const start = Number(a);
  const end = b ? Number(a.slice(0, 4 - b.length) + b) : start;
  return end * 10000 + start;
};
export const byPeriodNewestFirst = (cases: StandardsCase[]) => {
  const groups = new Map<string, StandardsCase[]>();
  for (const c of cases) groups.set(c.period, [...(groups.get(c.period) ?? []), c]);
  return [...groups.entries()].sort((x, y) => periodKey(y[0]) - periodKey(x[0])).map(([period, items]) => ({ period, items }));
};

export const profileHref = (p: StandardsPerson) => (p.memberId == null ? null : p.house === 'Lords' ? `/lords/${p.memberId}` : `/mps/${p.memberId}`);

// Every case naming a member (a shared case counts once for each person in it).
export function casesForMember(memberId: number): StandardsCase[] {
  return STANDARDS.cases.filter((c) => c.people.some((p) => p.memberId === memberId));
}
export function slugForMember(memberId: number): string | null {
  for (const c of STANDARDS.cases) for (const p of c.people) if (p.memberId === memberId && p.slug) return p.slug;
  return null;
}

// "Standards cases: 3 (2 rectified, 1 reported to the Committee on Standards)": only the parts that apply. Null when none.
export function standardsLine(memberId: number): { text: string; href: string } | null {
  const cases = casesForMember(memberId);
  const slug = slugForMember(memberId);
  if (!cases.length || !slug) return null;
  const n = (o: StandardsOutcome) => cases.filter((c) => c.outcome === o).length;
  const parts = [
    n('Rectified') ? `${n('Rectified')} rectified` : null,
    n('Not upheld') ? `${n('Not upheld')} not upheld` : null,
    n('Reported to the Committee on Standards') ? `${n('Reported to the Committee on Standards')} reported to the Committee on Standards` : null,
  ].filter(Boolean);
  return { text: `Standards cases: ${cases.length} (${parts.join(', ')})`, href: `/standards#${slug}` };
}

// Every matched member, with their cases, for the page's per member blocks.
export function membersWithCases(): { memberId: number; slug: string; listed: string; cases: StandardsCase[] }[] {
  const seen = new Map<number, { memberId: number; slug: string; listed: string; cases: StandardsCase[] }>();
  for (const c of STANDARDS.cases) {
    for (const p of c.people) {
      if (p.memberId == null || !p.slug) continue;
      const m = seen.get(p.memberId) ?? { memberId: p.memberId, slug: p.slug, listed: p.listed, cases: [] };
      m.cases.push(c);
      seen.set(p.memberId, m);
    }
  }
  return [...seen.values()];
}
