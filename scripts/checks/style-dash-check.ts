// Checks the house style hyphen rule (scripts/style-dash.ts): link addresses are skipped, visible wording is not.
// Usage: npx tsx scripts/checks/style-dash-check.ts. Exits 1 on any failure. Reads and writes nothing.
import { strayDash } from '../style-dash';

const cases: [string, string, boolean][] = [
  // [label, text, should pass]
  ['markdown link to /councils/north-northamptonshire (7 Nov 2026)', 'Its neighbour [North Northamptonshire](/councils/north-northamptonshire) took over.', true],
  ['markdown link to /councils/west-northamptonshire (7 Nov 2026)', 'and [West Northamptonshire](/councils/west-northamptonshire). It is the second.', true],
  ['markdown link to /councils/tower-hamlets (7 Nov 2026)', '[Tower Hamlets](/councils/tower-hamlets) is in its second government intervention.', true],
  ['href address', 'See <a href="/councils/tower-hamlets">Tower Hamlets</a>.', true],
  ['bare site path', 'The list is at /councils/north-northamptonshire for anyone checking.', true],
  ['full URL', 'Source: https://www.gov.uk/government/news/some-thing-here.', true],
  ['quotation', 'He called it "a well-run council".', true],
  ['hyphen in visible wording', 'A well-run council kept its books.', false],
  ['hyphen in link wording', 'See [North-Northamptonshire](/councils/north-northamptonshire).', false],
  ['dash in wording beside a link', '[Slough](/councils/slough) – the worst case.', false],
];

let failed = 0;
for (const [label, text, shouldPass] of cases) {
  const passes = strayDash(text) === null;
  const ok = passes === shouldPass;
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'} ${label}: ${passes ? 'no hyphen found' : 'hyphen found'}`);
}
console.log(failed ? `style-dash: ${failed} failed` : `style-dash: all ${cases.length} passed`);
process.exit(failed ? 1 : 0);
