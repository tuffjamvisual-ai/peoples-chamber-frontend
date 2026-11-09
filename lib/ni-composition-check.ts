// Northern Ireland council seats against Open Council Data's own page (NI2, 9 Nov 2026), read only. Once a month the
// freshness monitor (app/api/monitor-freshness/route.ts) reads https://opencouncildata.co.uk/nicouncils.php?y=0, which
// lists each NI council's seats now (SF, DUP, Alliance, UUP, SDLP, Others, Total), and compares it with what we hold in
// council_composition (May 2026, scripts/import-council-composition.js). Differences are listed in the monitor's report
// only; nothing is written. Pure, so it is unit tested (scripts/checks/ni-composition-check.test.ts).
export const NI_SOURCE = 'https://opencouncildata.co.uk/nicouncils.php?y=0';
export const NI_COLUMNS = ['sf', 'dup', 'alliance', 'uup', 'sdlp', 'others', 'total'] as const;
export type NiCounts = Record<(typeof NI_COLUMNS)[number], number>;

const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// The page's table: council name, then the seven numbers. Rows that are not councils (the totals) are left out.
export function parseNiPage(html: string): Map<string, NiCounts> {
  const out = new Map<string, NiCounts>();
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = (row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? []).map(text);
    if (cells.length !== 8 || !/[a-z]/i.test(cells[0]) || /^totals?:?$/i.test(cells[0])) continue;
    const nums = cells.slice(1).map((c) => Number(c.replace(/,/g, '')));
    if (nums.some((n) => !Number.isInteger(n))) continue;
    out.set(cells[0], Object.fromEntries(NI_COLUMNS.map((k, i) => [k, nums[i]])) as NiCounts);
  }
  return out;
}

// Our seats (party codes from council_composition) in the page's columns: TUV, PBP, PUP, Green and independents are
// "Others" there.
export function toNiColumns(seats: Record<string, number>, total: number): NiCounts {
  const g = (k: string) => seats[k] ?? 0;
  const named = g('sf') + g('dup') + g('alliance') + g('uup') + g('sdlp');
  return { sf: g('sf'), dup: g('dup'), alliance: g('alliance'), uup: g('uup'), sdlp: g('sdlp'), others: total - named, total };
}

const LABEL: Record<string, string> = { sf: 'Sinn Féin', dup: 'DUP', alliance: 'Alliance', uup: 'UUP', sdlp: 'SDLP', others: 'others', total: 'total' };

// One line per council that differs ("Belfast: Alliance 11 here, 10 there"), and any council missing on either side.
export function compareNi(ours: Map<string, NiCounts>, theirs: Map<string, NiCounts>): string[] {
  const out: string[] = [];
  for (const [name, o] of ours) {
    const t = theirs.get(name);
    if (!t) { out.push(`${name}: not on the page`); continue; }
    const diffs = NI_COLUMNS.filter((k) => o[k] !== t[k]).map((k) => `${LABEL[k]} ${o[k]} here, ${t[k]} there`);
    if (diffs.length) out.push(`${name}: ${diffs.join('; ')}`);
  }
  for (const name of theirs.keys()) if (!ours.has(name)) out.push(`${name}: on the page, not held here`);
  return out;
}

// The monitor runs the check on the first day of each month (UTC).
export const niCheckDue = (now: Date) => now.getUTCDate() === 1;
