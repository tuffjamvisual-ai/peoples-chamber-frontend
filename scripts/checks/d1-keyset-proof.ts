// ENTRY 166 proof (read only): the two donations loaders' rows read with readAll (OFFSET pages) and with the keyset
// readers must be byte-identical, so the cached results built from them are identical. Prints row counts, sha256 of each
// JSON and the time taken. One page at a time (concurrency 1) to keep the old reads gentle.
// Run: npx tsx scripts/checks/d1-keyset-proof.ts
import { createHash } from 'crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readAll, readAllById, readAllByDateDescId } from '../../lib/read-all';

config({ path: '.env.local', quiet: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const from = () => db.from('political_donations');
const sha = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
type Row = { id: number };

async function timed<T>(f: () => Promise<T>): Promise<[T, number]> { const t = Date.now(); const r = await f(); return [r, (Date.now() - t) / 1000]; }

(async () => {
  let ok = true;
  const cCols = 'id, donor_name, recipient_name, accounting_unit_name, amount, accepted_date';
  const cFilter = (q: ReturnType<typeof from>) => q.not('accounting_unit_name', 'is', null).neq('accounting_unit_name', '');
  const [cOld, tcOld] = await timed(() => readAll<Row>(from, { columns: cCols, filter: cFilter, orderBy: [{ column: 'accepted_date', ascending: false }, { column: 'id' }], concurrency: 1, label: 'constituencies old' }));
  const [cNew, tcNew] = await timed(() => readAllByDateDescId<Row>(from, { columns: cCols, filter: cFilter, dateColumn: 'accepted_date', label: 'constituencies new' }));
  const same1 = sha(cOld) === sha(cNew);
  ok &&= same1;
  console.log(`/donations/constituencies rows: OFFSET ${cOld.length} in ${tcOld}s, keyset ${cNew.length} in ${tcNew}s; sha256 ${sha(cOld).slice(0, 16)} / ${sha(cNew).slice(0, 16)}; identical: ${same1}`);
  const dCols = 'id, donor_name, recipient_name, amount';
  const dFilter = (q: ReturnType<typeof from>) => q.not('donor_name', 'is', null);
  const [dOld, tdOld] = await timed(() => readAll<Row>(from, { columns: dCols, filter: dFilter, orderBy: 'id', concurrency: 1, label: 'double-dip old' }));
  const [dNew, tdNew] = await timed(() => readAllById<Row>(from, { columns: dCols, filter: dFilter, label: 'double-dip new' }));
  const same2 = sha(dOld) === sha(dNew);
  ok &&= same2;
  console.log(`/donations/double-dip rows: OFFSET ${dOld.length} in ${tdOld}s, keyset ${dNew.length} in ${tdNew}s; sha256 ${sha(dOld).slice(0, 16)} / ${sha(dNew).slice(0, 16)}; identical: ${same2}`);
  if (!ok) process.exit(1);
})().catch((e) => { console.error('FAILED: ' + (e instanceof Error ? e.message : e)); process.exit(1); });
