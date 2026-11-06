// One-off backfill of the columns from migration 2026-11-06f (owner, 6 Nov 2026), one request at a time, at least a second apart. Parliament's
// API took 4 to 30 seconds a request that day and fails on deep pages, so short date windows, and the quick parts first:
//   1. the corrected list (4 pages), then one full read of each for its original answer;
//   2. the unanswered list by month, withdrawn questions included: holding dates, the withdrawn questions, which are read in full and stored,
//      and which row we hold that Parliament does not list;
//   3. every question, a week of tabled dates at a time: holding answer dates and attachments. About 2,000 pages, so hours. Writes only rows
//      with something to store.
// Keeps its place in <state file>, so it can stop and carry on.   npx tsx scripts/backfill-written-question-fields.ts <state file>
import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { questionRow, type WQ } from '../lib/written-question-row';

dotenv.config({ path: '.env.local', quiet: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const Q = 'https://questions-statements-api.parliament.uk/api/writtenquestions/questions';
const UA = { 'User-Agent': 'opengovt.uk parliament archive (https://www.opengovt.uk; contact@opengovt.uk)', Accept: 'application/json' };
const START = '2024-07-04';
const stateFile = process.argv[2];
type Listed = WQ & { isWithdrawn: boolean };
type St = { step: string; week: string; skip: number; pages: number; updated: number; withdrawn: Record<string, number>; corrected: number[]; attachments: number; holding: number; correctedSeen: number; unansweredListed: number[]; done: { w: number[]; c: number[] }; errors: string[]; extra: unknown };
const st: St = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : { step: 'unanswered', week: START, skip: 0, pages: 0, updated: 0, withdrawn: {}, corrected: [], attachments: 0, holding: 0, correctedSeen: 0, unansweredListed: [], done: { w: [], c: [] }, errors: [], extra: null };
const save = () => fs.writeFileSync(stateFile, JSON.stringify(st));
let last = 0;
async function get<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const wait = last + 1050 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60_000) });
      if (r.ok) return (await r.json()) as T;
      if (r.status !== 429 && r.status < 500) throw new Error(`HTTP ${r.status} ${url}`);
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (attempt >= 8 || /HTTP 4(?!29)/.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 30_000 * (attempt + 1)));
    }
  }
}
const addDays = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const day = (v?: string | null) => (v ? v.slice(0, 10) : null);

async function store(listed: Listed[]) {
  const wanted = listed.filter((q) => q.dateHoldingAnswer || q.attachments?.length);
  if (!wanted.length) return;
  for (const q of wanted) {
    if (q.dateAnswerCorrected) st.correctedSeen++;
    if (q.dateHoldingAnswer) st.holding++;
    if (q.attachments?.length) st.attachments++;
    const { error, count } = await db.from('parliament_written_questions').update({ date_holding_answer: day(q.dateHoldingAnswer), date_answer_corrected: day(q.dateAnswerCorrected), attachments: q.attachments?.length ? q.attachments : null }, { count: 'exact' }).eq('id', q.id);
    if (error) st.errors.push(`${q.id}: ${error.message}`);
    else if (count) st.updated++;
    else st.errors.push(`${q.id}: not held`);
  }
}

const months = () => {
  const out: [string, string][] = [];
  for (let d = new Date(`${START.slice(0, 7)}-01T00:00:00Z`); d <= new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) {
    const end = new Date(d); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
    out.push([d.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]);
  }
  return out;
};

async function main() {
  if (st.step === 'unanswered') st.step = 'corrected';
  if (st.step === 'corrected') {
    for (let skip = 0; ; skip += 100) {
      const page = await get<{ totalResults: number; results: { value: Listed }[] }>(`${Q}?correctedWhenFrom=${START}&take=100&skip=${skip}`);
      st.pages++;
      for (const r of page.results) if (!st.corrected.includes(r.value.id)) st.corrected.push(r.value.id);
      save();
      if (skip + 100 >= page.totalResults) break;
    }
    for (const id of st.corrected) {
      if (st.done.c.includes(id)) continue;
      const q = (await get<{ value: WQ }>(`${Q}/${id}`)).value;
      st.pages++;
      const { error } = await db.from('parliament_written_questions').update({ original_answer_html: q.originalAnswerText || null, date_answer_corrected: day(q.dateAnswerCorrected), date_holding_answer: day(q.dateHoldingAnswer), attachments: q.attachments?.length ? q.attachments : null }).eq('id', id);
      if (error) st.errors.push(`original ${id}: ${error.message}`); else { st.done.c.push(id); st.updated++; }
      save();
    }
    console.log(`${new Date().toISOString()} corrected done: ${st.corrected.length} listed, ${st.done.c.length} stored, pages ${st.pages}`);
    st.step = 'months'; st.skip = 0; save();
  }
  if (st.step === 'months') {
    for (const [from, to] of months()) {
      if (to < st.week) continue;
      st.week = from;
      for (let skip = st.skip; ; skip += 100) {
        const page = await get<{ totalResults: number; results: { value: Listed }[] }>(`${Q}?answered=Unanswered&tabledWhenFrom=${from}&tabledWhenTo=${to}&includeWithdrawn=true&take=100&skip=${skip}`);
        st.pages++; st.skip = skip;
        for (const r of page.results) { st.unansweredListed.push(r.value.id); if (r.value.isWithdrawn) st.withdrawn[r.value.id] = 1; }
        await store(page.results.map((r) => r.value).filter((q) => !q.isWithdrawn));
        save();
        if (skip + 100 >= page.totalResults) break;
      }
      st.skip = 0;
    }
    for (const id of Object.keys(st.withdrawn).map(Number)) {
      if (st.done.w.includes(id)) continue;
      const q = (await get<{ value: WQ }>(`${Q}/${id}`)).value;
      st.pages++;
      const { error } = await db.from('parliament_written_questions').upsert(questionRow(q), { onConflict: 'id' });
      if (error) st.errors.push(`withdrawn ${id}: ${error.message}`); else st.done.w.push(id);
      save();
    }
    console.log(`${new Date().toISOString()} withdrawn done: ${st.done.w.length} stored of ${Object.keys(st.withdrawn).length}, pages ${st.pages}, errors ${st.errors.length}`);
    const listed = new Set(st.unansweredListed);
    const ours: { id: number; uin: string; house: string; date_tabled: string; heading: string | null; asking_member_id: number | null; answering_body: string | null; url: string | null; fetched_at: string; is_withdrawn: boolean | null }[] = [];
    for (let f = 0; ; f += 1000) {
      const { data, error } = await db.from('parliament_written_questions').select('id, uin, house, date_tabled, heading, asking_member_id, answering_body, url, fetched_at, is_withdrawn').is('date_answered', null).order('id').range(f, f + 999);
      if (error) throw error;
      ours.push(...(data ?? []) as typeof ours);
      if (!data || data.length < 1000) break;
    }
    const extras = ours.filter((r) => !listed.has(r.id));
    const details = [];
    for (const r of extras) {
      let source: unknown;
      try { source = (await get<{ value: Record<string, unknown> }>(`${Q}/${r.id}`)).value; } catch (e) { source = String(e); }
      details.push({ ours: r, source });
    }
    st.extra = details;
    console.log(`${new Date().toISOString()} unanswered: ${listed.size} listed, ours ${ours.length}, not listed ${extras.length}`);
    st.step = 'weeks'; st.week = START; st.skip = 0; save();
  }
  if (st.step === 'weeks') {
    const today = new Date().toISOString().slice(0, 10);
    while (st.week <= today) {
      const to = addDays(st.week, 6);
      const page = await get<{ totalResults: number; results: { value: Listed }[] }>(`${Q}?tabledWhenFrom=${st.week}&tabledWhenTo=${to}&take=100&skip=${st.skip}`);
      st.pages++;
      await store(page.results.map((r) => r.value));
      if (st.skip + 100 >= page.totalResults) { st.week = addDays(st.week, 7); st.skip = 0; } else st.skip += 100;
      save();
      if (st.pages % 100 === 0) console.log(`${new Date().toISOString()} pages ${st.pages}, week ${st.week}, updated ${st.updated}, holding ${st.holding}, attachments ${st.attachments}, errors ${st.errors.length}`);
    }
    st.step = 'finished'; save();
    console.log(`finished: pages ${st.pages}, updated ${st.updated}, holding ${st.holding}, corrected ${st.done.c.length}, attachments ${st.attachments}, withdrawn ${st.done.w.length}, errors ${st.errors.length}`);
  }
}
main().catch((e) => { save(); console.error('stopped:', String(e).slice(0, 300)); process.exit(1); });
