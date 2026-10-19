// Fly-tipping lines for a council page (council_fly_tipping, migration 2026-10-19p). Pure functions with no
// imports, so scripts/import-fly-tipping.js prints the same wording in its dry run
// (node --experimental-strip-types).

export type FlyTippingRow = {
  gss: string;
  year: string; // '2024-25'
  nation: 'England' | 'Wales';
  incidents: number | null;
  incidents_per_1000: number | null;
  rate_calculated: boolean;
  actions: number | null;
  fpns_fly_tipping: number | null;
  prosecutions: number | null;
  reporting_basis: string | null;
  months_incidents: number | null;
  months_enforcement: number | null;
  summed_from_districts: boolean;
  source_url: string;
  notes: string | null;
};

export type FlyTippingLine = { label: string; value: string; sub?: string };
export type FlyTippingView = { year: string; lines: FlyTippingLine[]; notes: string[]; source: string };

const num = (n: number) => Math.round(n).toLocaleString('en-GB');
const yearLabel = (y: string) => y.replace('-', '/'); // 2024-25 -> 2024/25
const PUBLIC_ONLY = /customer\/public reported only/i;
const CHANGED = /changed during the year/i;

// The change on the year before is shown only when both years count the same way: both figures held, both cover
// 12 months, and the same reporting basis (not one that changed during either year).
function comparable(a: FlyTippingRow, b: FlyTippingRow): boolean {
  return a.incidents != null && b.incidents != null && b.incidents > 0
    && a.months_incidents === 12 && b.months_incidents === 12
    && (a.reporting_basis ?? '') === (b.reporting_basis ?? '')
    && !CHANGED.test(a.reporting_basis ?? '') && !CHANGED.test(b.reporting_basis ?? '');
}

export function flyTippingView(rows: FlyTippingRow[]): FlyTippingView | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((x, y) => y.year.localeCompare(x.year));
  const cur = sorted[0];
  const prev = sorted.find((r) => r.year < cur.year);
  const Y = yearLabel(cur.year);
  const lines: FlyTippingLine[] = [];
  const notes: string[] = [];

  if (cur.incidents != null) {
    // No rate is shown (owner's rule, 19 Oct 2026: no "per X" figures); incidents_per_1000 stays in the table only.
    let sub: string | undefined;
    if (prev && comparable(cur, prev)) {
      const pct = ((cur.incidents - (prev.incidents as number)) / (prev.incidents as number)) * 100;
      // "About the same": a change of less than 2% either way (owner's decision, 19 Oct 2026); otherwise the
      // change is shown rounded to the nearest whole per cent.
      sub = Math.abs(pct) < 2 ? `About the same as ${yearLabel(prev.year)} (${num(prev.incidents as number)})`
        : `${pct > 0 ? 'Up' : 'Down'} ${Math.round(Math.abs(pct))}% on ${yearLabel(prev.year)} (${num(prev.incidents as number)})`;
    } else if (prev) {
      sub = `No comparison with ${yearLabel(prev.year)}: the two years were not counted the same way`;
    }
    lines.push({ label: `Fly-tipping incidents, ${Y}`, value: num(cur.incidents), sub });
  } else {
    lines.push({ label: `Fly-tipping incidents, ${Y}`, value: cur.summed_from_districts ? 'No county total for this year (see note)' : 'Not published for this council' });
  }
  if (cur.actions != null) lines.push({ label: 'Enforcement actions', value: num(cur.actions) });
  if (cur.fpns_fly_tipping != null) lines.push({ label: 'Fixed penalty notices', value: num(cur.fpns_fly_tipping) });
  if (cur.prosecutions != null) lines.push({ label: 'Prosecutions', value: num(cur.prosecutions) });

  if (cur.summed_from_districts) notes.push('County figures are the total of its district councils, which collect the waste and record fly-tipping.');
  if (PUBLIC_ONLY.test(cur.reporting_basis ?? '')) notes.push('This council counts only fly-tips reported by the public, not every incident it clears, so its figures are lower than a full count would be.');
  if (!cur.summed_from_districts && CHANGED.test(cur.reporting_basis ?? '')) notes.push(`This council changed how it counts fly-tips during ${Y}.`);
  if (cur.nation === 'Wales' && cur.fpns_fly_tipping != null) notes.push('Welsh figures give one count of fixed penalty notices, not split by offence.');
  // a county's notes name the district whose figures are part-year
  if (!cur.summed_from_districts && cur.months_enforcement != null && cur.months_enforcement < 12) notes.push(`Enforcement figures cover ${cur.months_enforcement} months of ${Y}.`);
  if (cur.notes) notes.push(cur.notes);

  const source = cur.nation === 'Wales'
    ? `Source: Welsh Government, StatsWales, Local authority reported fly-tipping, ${Y}.`
    : `Source: Defra, Fly-tipping statistics for England, ${Y}.`;
  return { year: cur.year, lines, notes, source };
}

// Scotland and Northern Ireland publish no official council figures.
export function noFlyTippingFigures(nation: string): string | null {
  return nation === 'Scotland' || nation === 'Northern Ireland'
    ? `No official council figures for fly-tipping are published in ${nation}.` : null;
}
