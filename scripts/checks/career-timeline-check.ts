// MP Political career check (owner, 7 Nov 2026, PC1). Read only: reads every mp_biography.career_parliament and
// career_research with the server key, validates each with lib/career-timeline.ts, and prints the problems per member_id,
// the MPs with each part and the entries per group. Writes nothing. Before migration 2026-11-08a is applied it says the
// columns are not there yet.
//
// Usage: npx tsx --tsconfig tsconfig.json scripts/checks/career-timeline-check.ts

import { createClient } from '@supabase/supabase-js';
import { validate, type CareerEntry } from '../../lib/career-timeline';

process.loadEnvFile(`${__dirname}/../../.env.local`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local');
const supabase = createClient(url, key, { auth: { persistSession: false } });
const PAGE = 1000;

async function main() {
  const rows: { member_id: number; career_parliament: unknown; career_research: unknown; career_checked_at: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('mp_biography').select('member_id, career_parliament, career_research, career_checked_at').order('member_id').range(from, from + PAGE - 1);
    if (error) {
      if (/career_(parliament|research|checked_at)/.test(error.message)) { console.log('The career columns are not in mp_biography yet (migration 2026-11-08a is not applied).'); return; }
      throw new Error(`mp_biography: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  let parliament = 0, research = 0, problems = 0;
  const groups: Record<string, number> = {};
  for (const r of rows) {
    const found: string[] = [];
    for (const [name, part] of [['career_parliament', r.career_parliament], ['career_research', r.career_research]] as const) {
      if (part === null || part === undefined) continue;
      if (name === 'career_parliament') parliament++; else research++;
      found.push(...validate(part).map((p) => `${name} ${p}`));
      if (Array.isArray(part)) for (const e of part as CareerEntry[]) groups[e.group] = (groups[e.group] ?? 0) + 1;
    }
    if (r.career_parliament != null && !r.career_checked_at) found.push('career_checked_at is not set');
    if (found.length) {
      problems += found.length;
      console.log(`member ${r.member_id}:`);
      for (const p of found) console.log(`  ${p}`);
    }
  }
  console.log(`${rows.length} biography rows read; ${parliament} with a Parliament part, ${research} with a research part; entries by group ${JSON.stringify(groups)}; ${problems} problems`);
  if (problems) process.exit(1);
}

main().catch((e) => {
  console.error('career-timeline-check failed:', e);
  process.exit(1);
});
