// One off: read the detail and timeline of every statutory instrument laid in the last N days (default 365) that has
// none yet, so the committee, prayed against and debated flags are complete for the last 12 months (owner, 27 Oct 2026).
// The daily sync (/api/sync-statutory-instruments-treaties) fills older ones over the coming days.
//
//   npx tsx scripts/load-si-timelines.ts                 # dry run: reads the API, writes nothing
//   npx tsx scripts/load-si-timelines.ts --write         # upserts each instrument's row as it is read
//   options: --days=365  --limit=N (stop after N instruments)
//
// Two requests per instrument (detail and business items), at least 1 s apart, 20 s limit each (lib/parliament-si-
// treaties.ts). Writes: upsert by api_id, one row at a time; never deletes. The API's ConcernsRaisedByCommittee and
// MotionToStop flags already stored are kept. Stops at the first API or database error and says how far it got.
// Uses SUPABASE_SECRET_KEY from .env.local and never prints it.
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import { createClient } from '@supabase/supabase-js';
import { ParliamentApi, SI_API, unwrap, siRowFromDetail, type ApiSi, type ApiBusinessItem, type ApiList } from '../lib/parliament-si-treaties';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const DAYS = Number((args.find((a) => a.startsWith('--days=')) || '=365').split('=')[1]) || 365;
const LIMIT = Number((args.find((a) => a.startsWith('--limit=')) || '=0').split('=')[1]) || 0;

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local');
  const db = createClient(url, key);
  const since = new Date(Date.now() - DAYS * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await db.from('statutory_instruments').select('api_id, committee_concerns, prayed_against')
    .is('timeline_fetched_at', null).gte('laid_date', since).order('laid_date', { ascending: false }).limit(5000);
  if (error) throw new Error(`queue: ${error.message}`);
  const queue = (LIMIT ? data!.slice(0, LIMIT) : data!) as { api_id: string; committee_concerns: boolean; prayed_against: boolean }[];
  console.log(`${WRITE ? 'WRITE' : 'DRY RUN (nothing written)'}: ${queue.length} instruments laid since ${since} without a timeline`);
  const api = new ParliamentApi();
  const t0 = Date.now();
  let done = 0, debated = 0;
  for (const r of queue) {
    const d = await api.get<ApiSi>(`${SI_API}/StatutoryInstrument/${r.api_id}`);
    const bi = d && await api.get<ApiBusinessItem[] | ApiList<ApiBusinessItem>>(`${SI_API}/StatutoryInstrument/${r.api_id}/BusinessItems`);
    if (!d || !bi) throw new Error(`no answer within 20 s for ${r.api_id} (after ${done} done)`);
    const row = siRowFromDetail(unwrap(d), (Array.isArray(bi) ? bi : bi.items) as ApiBusinessItem[], { committee: r.committee_concerns, motion: r.prayed_against }, new Date().toISOString());
    if (row.debated) debated++;
    if (WRITE) {
      const { error: e } = await db.from('statutory_instruments').upsert(row, { onConflict: 'api_id' });
      if (e) throw new Error(`upsert ${r.api_id}: ${e.message} (after ${done} done)`);
    }
    done++;
    if (done % 25 === 0 || done === queue.length) console.log(`${new Date().toISOString().slice(11, 19)} ${done} of ${queue.length}; debated so far ${debated}; ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  console.log(`DONE: ${done} instruments read${WRITE ? ' and written' : ''}; ${debated} debated; API requests ${api.calls.length}`);
})().catch((e) => { console.error(`STOPPED: ${(e as Error).message}`); process.exit(1); });
