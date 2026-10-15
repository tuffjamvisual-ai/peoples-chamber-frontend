// Plain-English labels for council_composition (Open Council Data UK May compositions, CC0).
// Used on the council pages. See scripts/import-council-composition.js.

export type CouncilComposition = {
  snapshot_year: number;
  total_seats: number;
  seats: Record<string, number>;
  majority_party: string | null;
  administration_code: string | null;
};

const SEAT_NAME: Record<string, string> = {
  con: 'Conservative', lab: 'Labour', ld: 'Liberal Democrats', green: 'Green', ukip: 'UKIP',
  ref: 'Reform UK', pc: 'Plaid Cymru', snp: 'SNP', other: 'Independents and others',
};
// Codes used in the publisher's administration labels.
const ADMIN_NAME: Record<string, string> = {
  CON: 'Conservative', LAB: 'Labour', LD: 'Liberal Democrat', GRN: 'Green', REF: 'Reform UK',
  PC: 'Plaid Cymru', SNP: 'SNP', IND: 'Independent', UKIP: 'UKIP', Aspire: 'Aspire',
};

// "Labour 48 · Conservative 14 · Green 11 ..." largest first, parties with no seats left out.
export function seatsLine(c: CouncilComposition): string {
  return Object.entries(c.seats)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([p, n]) => `${SEAT_NAME[p] || p} ${n}`)
    .join(' · ');
}

// 'LAB min' -> 'Labour minority administration'; 'LD/GRN' -> 'Liberal Democrat and Green coalition';
// 'LAB Mayor' -> 'Labour directly elected mayor'; 'LAB' -> 'Labour administration'.
// Unknown codes are shown as published; 'NOC' or none -> null (nothing shown).
export function administrationLabel(code: string | null): string | null {
  if (!code) return null;
  const raw = code.trim();
  if (!raw || /^(noc|null)$/i.test(raw)) return null;
  const mayor = /\s+mayor$/i.test(raw);
  const minority = /\s+min$/i.test(raw);
  const core = raw.replace(/\s+(mayor|min)$/i, '').trim();
  const parties = core.split('/').map((p) => ADMIN_NAME[p.trim()] || ADMIN_NAME[p.trim().toUpperCase()] || p.trim());
  if (mayor) return `${parties.join(' and ')} directly elected mayor`;
  const who = parties.length === 1 ? parties[0] : `${parties.slice(0, -1).join(', ')} and ${parties[parties.length - 1]}`;
  if (minority) return `${who} minority ${parties.length > 1 ? 'coalition' : 'administration'}`;
  return parties.length > 1 ? `${who} coalition` : `${who} administration`;
}
