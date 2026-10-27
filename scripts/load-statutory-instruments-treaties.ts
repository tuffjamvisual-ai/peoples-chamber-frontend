// One off full load of statutory instruments and treaties from UK Parliament's free APIs into the tables of migration
// 2026-10-27b (report 81). The daily cron (/api/sync-statutory-instruments-treaties) keeps them up to date afterwards.
//
//   npx tsx scripts/load-statutory-instruments-treaties.ts                # dry run: reads the APIs, writes nothing
//   npx tsx scripts/load-statutory-instruments-treaties.ts --write        # writes, in batches of 500, 1 s apart
//   options: --si-timelines=200   also read the detail and timeline of the newest 200 instruments (2 requests each)
//            --no-treaty-timelines  skip the treaty timelines (338 requests)
//
// What it reads (every request at least 1 s apart, 20 s limit each; about 60 requests plus 2 per treaty):
//   every SI summary (pages of 1,000), each laying body's SIs (for the department, which summaries lack), the
//   MotionToStop and ConcernsRaisedByCommittee lists (flags), every treaty and, unless skipped, each treaty's timeline.
// SI timelines are left to the daily cron, which reads the backlog newest first in its spare time (reading all 7,641
// here would take about four hours at one request a second).
// Writes: upsert by api_id, at most 500 rows per request (each its own transaction), 1 s between batches; it stops at
// the first error and reports what was written. Uses SUPABASE_SERVICE_ROLE_KEY from .env.local and never prints it.

import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import { createClient } from '@supabase/supabase-js';
import {
  ParliamentApi, SI_API, TREATY_API, unwrap, siRowFromSummary, siRowFromDetail, treatyRow,
  type ApiList, type ApiSi, type ApiTreaty, type ApiBusinessItem, type ApiLayingBody,
} from '../lib/parliament-si-treaties';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const SI_TIMELINES = Number((args.find((a) => a.startsWith('--si-timelines=')) || '=0').split('=')[1]) || 0;
const TREATY_TIMELINES = !args.includes('--no-treaty-timelines');
const BATCH = 500;
const PAGE = 1000;

const api = new ParliamentApi();
const now = new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function need<T>(url: string): Promise<T> {
  const r = await api.get<T>(url);
  if (r === null) throw new Error(`no answer within 20 s: ${url}`);
  return r;
}
async function allPages<T>(base: string): Promise<{ items: T[]; total: number }> {
  const out: T[] = []; let total = 0;
  for (let skip = 0; ; skip += PAGE) {
    const r = await need<ApiList<T>>(`${base}${base.includes('?') ? '&' : '?'}Take=${PAGE}&Skip=${skip}`);
    total = r.totalResults; out.push(...r.items.map((x) => unwrap(x)));
    if (r.items.length < PAGE || out.length >= total) break;
  }
  return { items: out, total };
}

(async () => {
  const t0 = Date.now();
  console.log(`${WRITE ? 'WRITE' : 'DRY RUN (nothing written)'}; SI timelines: ${SI_TIMELINES}; treaty timelines: ${TREATY_TIMELINES ? 'yes' : 'no'}`);

  // Statutory instruments.
  const sis = await allPages<ApiSi>(`${SI_API}/StatutoryInstrument`);
  console.log(`SIs: ${sis.items.length} of ${sis.total}`);
  const rows = new Map(sis.items.map((s) => [s.id, { ...siRowFromSummary(s, now), laying_department: null as string | null, committee_concerns: false, prayed_against: false, debated: false }]));
  const bodies = await need<ApiList<ApiLayingBody> | ApiLayingBody[]>(`${SI_API}/LayingBody`);
  const bodyList = (Array.isArray(bodies) ? bodies : bodies.items).map((b) => unwrap(b as ApiLayingBody));
  let withDept = 0;
  for (const b of bodyList) {
    const list = await allPages<ApiSi>(`${SI_API}/StatutoryInstrument?LayingBodyId=${encodeURIComponent(b.id)}`);
    for (const s of list.items) { const r = rows.get(s.id); if (r && !r.laying_department) { r.laying_department = b.name; withDept++; } }
  }
  console.log(`laying bodies: ${bodyList.length}; SIs given a department: ${withDept}`);
  for (const [filter, col] of [['MotionToStop', 'prayed_against'], ['ConcernsRaisedByCommittee', 'committee_concerns']] as const) {
    const list = await allPages<ApiSi>(`${SI_API}/StatutoryInstrument?${filter}=true`);
    let n = 0; for (const s of list.items) { const r = rows.get(s.id); if (r) { r[col] = true; n++; } }
    console.log(`${filter}: ${list.total} listed, ${n} matched`);
  }
  const siRows: Record<string, unknown>[] = [...rows.values()];
  // Optional: detail and timeline for the newest instruments.
  const newest = [...rows.values()].sort((a, b) => (b.laid_date || '').localeCompare(a.laid_date || '')).slice(0, SI_TIMELINES);
  for (const r of newest) {
    const d = await need<ApiSi>(`${SI_API}/StatutoryInstrument/${r.api_id}`);
    const bi = await need<ApiBusinessItem[] | ApiList<ApiBusinessItem>>(`${SI_API}/StatutoryInstrument/${r.api_id}/BusinessItems`);
    const full = siRowFromDetail(unwrap(d), (Array.isArray(bi) ? bi : bi.items) as ApiBusinessItem[], { committee: r.committee_concerns, motion: r.prayed_against }, now);
    const i = siRows.findIndex((x) => x.api_id === r.api_id); siRows[i] = full;
  }

  // Treaties.
  const trs = await allPages<ApiTreaty>(`${TREATY_API}/Treaty`);
  console.log(`treaties: ${trs.items.length} of ${trs.total}`);
  const trRows: Record<string, unknown>[] = [];
  for (const t of trs.items) {
    let items: ApiBusinessItem[] | null = null;
    if (TREATY_TIMELINES) {
      const bi = await need<ApiBusinessItem[] | ApiList<ApiBusinessItem>>(`${TREATY_API}/Treaty/${t.id}/BusinessItems`);
      items = (Array.isArray(bi) ? bi : bi.items) as ApiBusinessItem[];
    }
    trRows.push(treatyRow(t, items, now) as Record<string, unknown>);
  }
  const ms = api.calls.map((c) => c.ms).sort((a, b) => a - b);
  console.log(`API requests: ${api.calls.length}; median ${ms[Math.floor(ms.length / 2)] ?? 0} ms, slowest ${ms[ms.length - 1] ?? 0} ms; read in ${Math.round((Date.now() - t0) / 1000)} s`);

  if (!WRITE) { console.log(`would write ${siRows.length} SIs and ${trRows.length} treaties in batches of ${BATCH}`); return; }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  const db = createClient(url, key);
  for (const [table, list] of [['statutory_instruments', siRows], ['treaties', trRows]] as const) {
    let written = 0;
    for (let i = 0; i < list.length; i += BATCH) {
      // Rows of one table must share the same columns in one request: give summary rows the timeline columns too.
      const batch = list.slice(i, i + BATCH);
      const { error } = await db.from(table).upsert(batch, { onConflict: 'api_id', defaultToNull: false });
      if (error) { console.error(`STOPPED: ${table} batch ${i / BATCH + 1}: ${error.message}. Written so far: ${written}.`); process.exit(1); }
      written += batch.length;
      console.log(`${table}: ${written} of ${list.length}`);
      await sleep(1000);
    }
  }
  const { count: siCount } = await db.from('statutory_instruments').select('api_id', { count: 'exact', head: true });
  const { count: trCount } = await db.from('treaties').select('api_id', { count: 'exact', head: true });
  console.log(`in the database: ${siCount} SIs (API total ${sis.total}), ${trCount} treaties (API total ${trs.total})`);
})().catch((e) => { console.error(`STOPPED: ${(e as Error).message}`); process.exit(1); });
