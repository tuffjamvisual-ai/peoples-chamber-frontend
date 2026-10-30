// PIP mobility lines for a council page (council_pip_mobility, migration 2026-10-21t). Pure functions with no imports.
// Counts only, no per-resident rates (John's decisions, 21 Oct 2026).

export type PipMobilityRow = {
  gss: string;
  period: string; // '2026-07-01'
  enhanced: number;
  derived_from_districts: boolean;
  district_gss: string[] | null;
};

const num = (n: number) => n.toLocaleString('en-GB');
export const monthLabel = (period: string) =>
  new Date(`${period.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function eligibleLine(n: number): string {
  return `${num(n)} ${n === 1 ? 'person' : 'people'} eligible for a Motability vehicle (enhanced PIP mobility rate)`;
}

// The change on the same month a year earlier: the count and the percentage, or the count alone when the earlier
// figure is under 20 (a percentage of a small number says little).
export function changeLine(cur: PipMobilityRow, prev: PipMobilityRow | undefined): string | null {
  if (!prev) return null;
  const d = cur.enhanced - prev.enhanced;
  const when = `${monthLabel(prev.period)} (${num(prev.enhanced)})`;
  if (d === 0) return `The same as ${when}`;
  const dir = d > 0 ? 'Up' : 'Down';
  if (prev.enhanced < 20) return `${dir} ${num(Math.abs(d))} on ${when}`;
  return `${dir} ${num(Math.abs(d))} (${Math.round(Math.abs(d) / prev.enhanced * 100)}%) on ${when}`;
}

export function derivedNote(districts: number): string {
  return `Worked out by opengovt by adding the DWP figures for its ${districts} district${districts === 1 ? '' : 's'}.`;
}

export const sourceLine = (period: string) => `Source: DWP Stat-Xplore, PIP, ${monthLabel(period)}`;

// One national line under the council figure (John's wording, 21 Oct 2026).
export const UK_SCHEME_LINE = 'Across the UK, more than 890,000 vehicles were leased through the Motability Scheme at 30 September 2025.';
export const UK_SCHEME_SOURCE = {
  label: 'Motability Operations annual report and accounts 2025',
  url: 'https://www.mo.co.uk/media/xviibgvr/motability-operations-annual-report-and-accounts-2025.pdf',
};
