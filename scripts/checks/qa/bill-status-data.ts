// QA1 A1, data part (owner approved, 9 Nov 2026): read only. Lists stored bills that show a stage sitting after they
// ended (withdrawn, or Royal Assent for an Act; scripts/checks/qa/bill-status-rules.ts stagesAfterEnd). Run by the weekly
// live check, or by hand: npx tsx --tsconfig tsconfig.json scripts/checks/qa/bill-status-data.ts [--json]
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from the environment or .env.local. Writes nothing.
// Exit code 1 when any bill breaks the rule, 2 when it could not read.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { stagesAfterEnd, type StoredBill } from './bill-status-rules';

async function main(): Promise<number> {
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) { console.error('bill status data: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing'); return 2; }
  const db = createClient(url, key);

  const rows: StoredBill[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('bill').select('id, bill_withdrawn, is_act, current_stage, stages')
      .is('hidden_reason', null).or('bill_withdrawn.not.is.null,is_act.eq.true').order('id').range(from, from + 999);
    if (error) { console.error(`bill status data: ${error.message}`); return 2; }
    rows.push(...((data ?? []) as StoredBill[]));
    if (!data || data.length < 1000) break;
  }
  const bad = rows.map((b) => ({ id: b.id, after: stagesAfterEnd(b) })).filter((b) => b.after.length);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ checked: rows.length, bad }));
  else {
    console.log(`bill status data: ${rows.length} ended bills checked (withdrawn or Acts); ${bad.length} list a stage after they ended`);
    for (const b of bad.slice(0, 20)) console.log(`  /bills/${b.id}: ${b.after.join('; ')}`);
  }
  return bad.length ? 1 : 0;
}

main().then((code) => process.exit(code));
