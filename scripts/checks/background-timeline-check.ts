// MP Background timeline check (owner's approval, 24 Oct 2026). Read only: reads every mp_biography.background_timeline
// with the public key, validates each with lib/background-timeline.ts, and prints the problems per member_id and the
// number of MPs with a timeline. Writes nothing.
//
// Usage: npx tsx --tsconfig tsconfig.json scripts/checks/background-timeline-check.ts

import { createClient } from '@supabase/supabase-js';
import { validate } from '../../lib/background-timeline';

process.loadEnvFile(`${__dirname}/../../.env.local`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local');
const supabase = createClient(url, key, { auth: { persistSession: false } });

const PAGE = 1000;

async function main() {
  const rows: { member_id: number; background_timeline: unknown; background_last_checked: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('mp_biography')
      .select('member_id, background_timeline, background_last_checked')
      .order('member_id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`mp_biography: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  let withTimeline = 0;
  let entries = 0;
  let problemCount = 0;
  for (const r of rows) {
    if (r.background_timeline === null || r.background_timeline === undefined) continue;
    withTimeline++;
    if (Array.isArray(r.background_timeline)) entries += r.background_timeline.length;
    const problems = validate(r.background_timeline);
    if (!r.background_last_checked) problems.push('background_last_checked is not set');
    if (problems.length) {
      problemCount += problems.length;
      console.log(`member ${r.member_id}:`);
      for (const p of problems) console.log(`  ${p}`);
    }
  }
  console.log(`${rows.length} biography rows read; ${withTimeline} MPs with a timeline (${entries} entries); ${problemCount} problems`);
}

main().catch((e) => {
  console.error('background-timeline-check failed:', e);
  process.exit(1);
});
