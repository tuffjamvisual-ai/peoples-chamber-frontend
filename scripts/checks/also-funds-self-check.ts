// "Also funds" self check (owner, 31 Oct 2026). Read only: writes nothing.
//
// The MP Donations tab (app/api/mps/[id]/donations/route.ts) lists, for each of the MP's donors, the other recipients
// that donor funds ("Also funds"). Until 31 Oct 2026 step 2 kept the MP out of that list with a plain substring test on
// the MP's name ("ed davey"), weaker than the token rule step 1 uses to find the MP's own donations, so
// "Mr Edward Davey MP" was listed as another recipient on Ed Davey's own page. Step 2 now uses the same test
// (lib/mp-recipient-match.ts recipientIsMp) and also drops any recipient_name string found among the MP's own donations.
//
// For every MP in mps, this replays steps 1 and 2 of the route in memory over one read of political_donations and
// prints the recipient strings the OLD rule kept but the NEW rule removes: the 20 MPs with the most, the total number of
// MPs affected, and every removed string where the first name matched only as a prefix (a word that starts with the
// MP's first name but is not equal to it), which may be a different person. Differences from the route: donors are
// grouped by trimmed name (the route also matches stored spellings with stray spaces), and the route caps step 1 at
// 500 rows and step 2 at 60 donors, which this replays.
//
// Usage: npx tsx --tsconfig tsconfig.json scripts/checks/also-funds-self-check.ts

import { createClient } from '@supabase/supabase-js';
import { recipientIsMp, lastNamePrefilter, stripHonorific } from '../../lib/mp-recipient-match';

// The step 1 rule as it was before the hyphenated surname fix (31 Oct 2026), kept here only to show what changed:
// names split on spaces, commas, full stops AND hyphens, so a hyphenated last name could never match.
function oldRecipientIsMp(recipientName: string | null | undefined, firstWord: string, lastWord: string): boolean {
  const tokens = String(recipientName || '').toLowerCase().split(/[\s,.\-]+/).filter(Boolean);
  if (!tokens.includes(lastWord)) return false;
  if (firstWord.length < 2) return false;
  return tokens.some((t) => t === firstWord || t.startsWith(firstWord));
}

process.loadEnvFile(`${__dirname}/../../.env.local`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const PAGE = 1000;
const STEP1_TYPES = new Set(['MP - Member of Parliament', 'Regulated Donee', 'Members Association', 'Member of Registered Political Party']);

type Row = { id: number; donor_name: string | null; recipient_name: string | null; recipient_type: string | null; accepted_date: string | null };

async function readTable<T>(table: string, columns: string, order: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).order(order).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function main() {
  const mps = await readTable<{ member_id: number; display_name: string | null; name: string | null }>('mps', 'member_id, display_name, name', 'member_id');
  const rows = await readTable<Row>('political_donations', 'id, donor_name, recipient_name, recipient_type, accepted_date', 'id');

  // Rows by trimmed donor name, for step 2.
  const byDonor = new Map<string, Row[]>();
  for (const r of rows) {
    const dn = (r.donor_name || '').trim();
    if (!dn || !r.recipient_name) continue;
    if (!byDonor.has(dn)) byDonor.set(dn, []);
    byDonor.get(dn)!.push(r);
  }
  const step1Pool = rows.filter((r) => STEP1_TYPES.has(r.recipient_type || ''));

  type Result = { id: number; name: string; removed: string[]; prefixOnly: { recipient: string; token: string }[] };
  const results: Result[] = [];
  for (const mp of mps) {
    const nameTop = mp.display_name || mp.name || '';
    const nameKey = stripHonorific(nameTop);
    const firstWord = nameKey.split(/\s+/)[0]?.toLowerCase() ?? '';
    const lastWord = nameKey.split(/\s+/).slice(-1)[0]?.toLowerCase() ?? '';
    if (firstWord.length < 2 || lastWord.length < 2) continue;

    // Step 1: ilike %first% and %last%, newest first, at most 500 rows, then the token rule.
    const candidates = step1Pool
      .filter((r) => { const rn = (r.recipient_name || '').toLowerCase(); return rn.includes(firstWord) && rn.includes(lastWord); })
      .sort((a, b) => (b.accepted_date || '').localeCompare(a.accepted_date || ''))
      .slice(0, 500);
    const own = candidates.filter((r) => recipientIsMp(r.recipient_name, firstWord, lastWord));
    const ownNames = new Set(own.map((r) => (r.recipient_name || '').trim()).filter(Boolean));
    const donorNames = Array.from(new Set(own.map((r) => (r.donor_name || '').trim()).filter(Boolean))).slice(0, 60);

    // Step 2: every row for those donors; OLD kept unless the name contained "first last"; NEW drops isThisMp and own.
    const removed = new Set<string>();
    for (const dn of donorNames) {
      for (const r of byDonor.get(dn) ?? []) {
        const rn = (r.recipient_name || '').trim();
        const oldKeeps = !rn.toLowerCase().includes(nameKey.toLowerCase());
        const newKeeps = !(recipientIsMp(rn, firstWord, lastWord) || ownNames.has(rn));
        if (oldKeeps && !newKeeps) removed.add(rn);
      }
    }
    if (removed.size === 0) continue;
    const prefixOnly: { recipient: string; token: string }[] = [];
    for (const rn of removed) {
      const tokens = rn.toLowerCase().split(/[\s,.\-]+/).filter(Boolean);
      if (!tokens.includes(firstWord)) {
        const token = tokens.find((t) => t.startsWith(firstWord));
        prefixOnly.push({ recipient: rn, token: token ?? '(matched as one of the MP\'s own recipient strings)' });
      }
    }
    results.push({ id: mp.member_id, name: nameTop, removed: [...removed].sort(), prefixOnly });
  }

  results.sort((a, b) => b.removed.length - a.removed.length || a.id - b.id);
  console.log(`${mps.length} MPs and ${rows.length} donation rows read.`);
  console.log(`MPs whose "Also funds" lists lose recipient strings under the new rule: ${results.length}`);
  console.log('\nTop 20 MPs by recipient strings removed:');
  for (const r of results.slice(0, 20)) console.log(`  ${r.id} ${r.name}: ${r.removed.length} removed: ${r.removed.map((s) => JSON.stringify(s)).join(', ')}`);
  const davey = results.find((r) => r.id === 188);
  console.log(`\nEd Davey (188): ${davey ? davey.removed.map((s) => JSON.stringify(s)).join(', ') : 'nothing removed'}`);
  console.log(`  "Mr Edward Davey MP" removed: ${davey?.removed.includes('Mr Edward Davey MP') ? 'yes' : 'NO'}`);
  const prefix = results.flatMap((r) => r.prefixOnly.map((p) => ({ ...p, id: r.id, name: r.name })));
  console.log(`\nRemoved strings where the first name matched only as a prefix (check these are the same person): ${prefix.length}`);
  for (const p of prefix) console.log(`  ${p.id} ${p.name}: ${JSON.stringify(p.recipient)} (word "${p.token}")`);
  if (!davey?.removed.includes('Mr Edward Davey MP')) process.exit(1);

  // Each MP's OWN donations (step 1), before and after the hyphenated surname fix. Before: the route's prefilter
  // (ILIKE %first% and %last%) and the old rule. After: the same rule from lib/mp-recipient-match.ts, over every row
  // whose name contains the first name and the longest hyphen part of the last name (so "Davies Jones" without the
  // hyphen is seen too); "past the route's prefilter" says whether the route's current ILIKE %last% would let a gained
  // row through. The 500 row cap is left out on both sides, so only the rule differs. Expected: gains for hyphenated
  // last names only, and no losses.
  console.log('\n=== Own donations (step 1) before and after the hyphenated surname fix ===');
  let changedMps = 0;
  let problems = 0;
  for (const mp of mps) {
    const nameTop = mp.display_name || mp.name || '';
    const nameKey = stripHonorific(nameTop);
    const firstWord = nameKey.split(/\s+/)[0]?.toLowerCase() ?? '';
    const lastWord = nameKey.split(/\s+/).slice(-1)[0]?.toLowerCase() ?? '';
    if (firstWord.length < 2 || lastWord.length < 2) continue;
    const part = lastNamePrefilter(lastWord);
    const pool = step1Pool.filter((r) => { const rn = (r.recipient_name || '').toLowerCase(); return rn.includes(firstWord) && rn.includes(part); });
    const before = new Set(pool.filter((r) => { const rn = (r.recipient_name || '').toLowerCase(); return rn.includes(lastWord) && oldRecipientIsMp(r.recipient_name, firstWord, lastWord); }).map((r) => r.id));
    const after = new Set(pool.filter((r) => recipientIsMp(r.recipient_name, firstWord, lastWord)).map((r) => r.id));
    const gained = pool.filter((r) => after.has(r.id) && !before.has(r.id));
    const lost = pool.filter((r) => before.has(r.id) && !after.has(r.id));
    if (!gained.length && !lost.length) continue;
    changedMps++;
    const strings = (list: Row[]) => {
      const m = new Map<string, { n: number; pastPrefilter: boolean }>();
      for (const r of list) { const s = r.recipient_name || ''; const e = m.get(s) ?? { n: 0, pastPrefilter: s.toLowerCase().includes(lastWord) }; e.n++; m.set(s, e); }
      return [...m.entries()].map(([s, e]) => `${JSON.stringify(s)} (${e.n}${e.pastPrefilter ? '' : ', NOT past the route\'s prefilter'})`).join(', ');
    };
    const hyphenated = lastWord.includes('-');
    const flag = lost.length || !hyphenated ? '  <-- STOP' : '';
    if (flag) problems++;
    console.log(`  ${mp.member_id} ${nameTop}: ${before.size} -> ${after.size}${gained.length ? `; gained ${strings(gained)}` : ''}${lost.length ? `; LOST ${strings(lost)}` : ''}${flag}`);
  }
  console.log(`MPs whose own donations change: ${changedMps}; unexpected (a loss, or a gain for a last name without a hyphen): ${problems}`);
  if (problems) process.exit(1);
}

main().catch((e) => {
  console.error('also-funds-self-check failed:', e);
  process.exit(1);
});
