// Donor backgrounds check (owner's approval, 31 Oct 2026). Read only: reads a donor profiles file (default
// "Claude outputs/donor-profiles-batch1.json", not committed), runs lib/donor-profile.ts validate() on every profile and
// checks the batch's counts and that each donor's facts are already in LABEL_ORDER. Exits 1 on any problem.
//
// Usage: npx tsx --tsconfig tsconfig.json scripts/checks/donor-profile-check.ts [file] [profiles slugs facts]

import { readFileSync } from 'fs';
import { validate, sortFacts, type DonorFact } from '../../lib/donor-profile';

const file = process.argv[2] ?? `${__dirname}/../../Claude outputs/donor-profiles-batch1.json`;
const [wantProfiles, wantSlugs, wantFacts] = (process.argv.slice(3, 6).length === 3 ? process.argv.slice(3, 6) : ['25', '41', '172']).map(Number);

const data = JSON.parse(readFileSync(file, 'utf8')) as { key: string; slugs: string[]; facts: DonorFact[] }[];
const problems: string[] = [];
if (!Array.isArray(data)) throw new Error('the file is not an array');
for (const d of data) problems.push(...validate(d));

const keys = new Set(data.map((d) => d.key));
const slugs = data.flatMap((d) => d.slugs ?? []);
const facts = data.reduce((n, d) => n + (Array.isArray(d.facts) ? d.facts.length : 0), 0);
if (data.length !== wantProfiles) problems.push(`${data.length} profiles, expected ${wantProfiles}`);
if (keys.size !== data.length) problems.push(`${keys.size} unique keys for ${data.length} profiles`);
if (slugs.length !== wantSlugs || new Set(slugs).size !== wantSlugs) problems.push(`${slugs.length} slugs (${new Set(slugs).size} unique), expected ${wantSlugs} unique`);
if (facts !== wantFacts) problems.push(`${facts} facts, expected ${wantFacts}`);
for (const d of data) {
  if (!Array.isArray(d.facts)) continue;
  if (JSON.stringify(sortFacts(d.facts)) !== JSON.stringify(d.facts)) problems.push(`${d.key}: facts are not grouped in LABEL_ORDER`);
}

console.log(`${data.length} profiles, ${keys.size} unique keys, ${new Set(slugs).size} unique slugs, ${facts} facts; ${problems.length} problems`);
for (const p of problems) console.log(`  ${p}`);
if (problems.length) process.exit(1);
