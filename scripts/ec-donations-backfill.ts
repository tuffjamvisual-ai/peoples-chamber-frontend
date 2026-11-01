// One-off backfill of Electoral Commission donations missing from political_donations (owner's approval, "yes",
// 1 Nov 2026; option A). The records come from the Commission's search API through the same code the daily sync and
// the weekly sweep use (lib/ec-donations.ts fetchPage and mapRow, unchanged), so imported rows look exactly like
// synced rows. The official CSV copy only decides which references are missing. Nothing here deletes or updates a row.
//
//   build <ec-csv-dir> <db-export.csv> <out-dir>
//       The import set: every ECRef in the Commission's CSV files that is not in political_donations.ec_ref, less
//       those whose date, value and donor name match an existing row under another reference (held back as possible
//       duplicates). Writes import-refs.txt and import-held-back-possible-duplicates.csv.
//   fetch <out-dir> <from YYYY-MM> <to YYYY-MM>
//       Reads the search API month by month by reported date (fetchPage filters by reported date only), every page,
//       at least 1 second between requests, and keeps the mapped rows (mapRow) whose ec_ref is in import-refs.txt.
//       Any 403, 429, other HTTP error or a non-JSON answer (a challenge page) stops the run at once, with no retry and
//       no wait; what was read so far is kept. Writes import-rows.jsonl and fetch-state.json (the next month to read).
//   sql <out-dir>
//       Writes the insert batches (at most 2,000 rows each, one transaction each, 60 s statement and 5 s lock timeouts,
//       ON CONFLICT (ec_ref) DO NOTHING) as batches/batch-NNN.sql, and import-refs-fetched.txt (the list the undo
//       deletes from). Undo: scripts/ec-donations-backfill-undo.sql.
import { readFileSync, readdirSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { fetchPage, mapRow, ROWS, type ECResult } from '@/lib/ec-donations';
import { SyncBudget, sleep } from '@/lib/sync-budget';

const [cmd, ...args] = process.argv.slice(2);

// Minimal RFC 4180 CSV reader.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const head = rows.shift()!.map((h) => h.replace(/^﻿/, ''));
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

async function main() {
if (cmd === 'build') {
  const [csvDir, dbExport, out] = args;
  const ymd = (d: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d ?? ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
  const num = (v: string) => { const n = Number(String(v ?? '').replace(/[£,\s]/g, '')); return Number.isFinite(n) ? Math.round(n) : null; };
  const key = (date: string, value: string, donor: string) => `${date}|${num(value)}|${(donor ?? '').toLowerCase().replace(/\W/g, '')}`;
  const file: Record<string, string>[] = [];
  for (const f of readdirSync(csvDir).filter((x) => /^ec-donations-.*\.csv$/.test(x)).sort()) file.push(...parseCsv(readFileSync(`${csvDir}/${f}`, 'utf8')));
  const db = parseCsv(readFileSync(dbExport, 'utf8'));
  const dbRefs = new Set(db.map((r) => (r.ec_ref ?? '').trim()));
  const dbByKey = new Map<string, string[]>();
  for (const r of db) { const k = key(r.accepted_date || r.received_date || '', r.amount, r.donor_name); dbByKey.set(k, [...(dbByKey.get(k) ?? []), r.ec_ref]); }
  const missing = file.filter((r) => r.ECRef.trim() && !dbRefs.has(r.ECRef.trim()));
  const held = missing.filter((r) => dbByKey.has(key(ymd(r.AcceptedDate) || ymd(r.ReceivedDate), r.Value, r.DonorName)));
  const heldRefs = new Set(held.map((r) => r.ECRef.trim()));
  const refs = [...new Set(missing.map((r) => r.ECRef.trim()))].filter((r) => !heldRefs.has(r)).sort();
  writeFileSync(`${out}/import-refs.txt`, refs.join('\n') + '\n');
  writeFileSync(`${out}/import-held-back-possible-duplicates.csv`, ['ECRef,date,value,donor,recipient,existing_refs_same_date_value_donor',
    ...held.map((r) => [r.ECRef.trim(), ymd(r.AcceptedDate) || ymd(r.ReceivedDate), r.Value, r.DonorName.trim(), r.RegulatedEntityName.trim(),
      dbByKey.get(key(ymd(r.AcceptedDate) || ymd(r.ReceivedDate), r.Value, r.DonorName))!.join(' ')].map(esc).join(','))].join('\n') + '\n');
  console.log(`file rows ${file.length}; table rows ${db.length}; missing ${missing.length}; held back ${held.length}; import set ${refs.length}`);
} else if (cmd === 'fetch') {
  const [out, from, to] = args;
  const refs = new Set(readFileSync(`${out}/import-refs.txt`, 'utf8').split('\n').filter(Boolean));
  const statePath = `${out}/fetch-state.json`;
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) as { next: string; requests: number; kept: number } : { next: from, requests: 0, kept: 0 };
  const have = new Set<string>(existsSync(`${out}/import-rows.jsonl`) ? readFileSync(`${out}/import-rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).ec_ref) : []);
  // Stop at once on any block: no retry, no Retry-After wait (politeFetch would otherwise wait once on a 429).
  const realFetch = globalThis.fetch;
  class Blocked extends Error {}
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await realFetch(input, init);
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('json')) throw new Blocked(`HTTP ${res.status} (${type || 'no content type'}) for ${String(input).replace(/\?.*/, '')}`);
    return res;
  }) as typeof fetch;
  const budget = new SyncBudget(86_400);
  let last = 0;
  const polite = async () => { const wait = 1_000 - (Date.now() - last); if (wait > 0) await sleep(wait); last = Date.now(); };
  const months: string[] = [];
  for (let d = new Date(`${state.next}-01T00:00:00Z`); d <= new Date(`${to}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 7));
  try {
    for (const m of months) {
      const startDay = `${m}-01`;
      const end = new Date(`${m}-01T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
      const endDay = end.toISOString().slice(0, 10);
      let total = Infinity, seen = 0, keptHere = 0;
      for (let start = 0; start < total; start += ROWS) {
        await polite();
        const page = await fetchPage(start, startDay, endDay, budget);
        state.requests++;
        total = page.Total ?? 0;
        const rows = (page.Result ?? []) as ECResult[];
        seen += rows.length;
        for (const r of rows) {
          const mapped = mapRow(r);
          if (!mapped || !refs.has(String(mapped.ec_ref).trim()) || have.has(String(mapped.ec_ref))) continue;
          appendFileSync(`${out}/import-rows.jsonl`, JSON.stringify(mapped) + '\n');
          have.add(String(mapped.ec_ref)); keptHere++; state.kept++;
        }
        if (!rows.length) break;
      }
      const next = new Date(`${m}-01T00:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1);
      state.next = next.toISOString().slice(0, 7);
      writeFileSync(statePath, JSON.stringify(state));
      console.log(`${m}: reported ${total === Infinity ? 0 : total}, read ${seen}, kept ${keptHere}; requests ${state.requests}, kept so far ${state.kept} of ${refs.size}`);
    }
    console.log(`DONE: requests ${state.requests}; kept ${state.kept} of ${refs.size}; not returned ${refs.size - have.size}`);
  } catch (e) {
    writeFileSync(statePath, JSON.stringify(state));
    console.log(`STOPPED at ${state.next}: ${(e as Error).message}; kept so far ${state.kept} of ${refs.size}`);
    process.exit(2);
  }
} else if (cmd === 'sql') {
  const [out] = args;
  const rows = readFileSync(`${out}/import-rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
  const cols = Object.keys(rows[0]);
  const TAG = '$ecrows$';
  mkdirSync(`${out}/batches`, { recursive: true });
  const BATCH = 2_000;
  let n = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const json = JSON.stringify(chunk);
    if (json.includes(TAG)) throw new Error('row data holds the dollar-quote tag');
    n++;
    writeFileSync(`${out}/batches/batch-${String(n).padStart(3, '0')}.sql`, `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
DO $do$
DECLARE inserted integer;
BEGIN
  INSERT INTO public.political_donations (${cols.join(', ')})
  SELECT ${cols.join(', ')} FROM jsonb_populate_recordset(NULL::public.political_donations, ${TAG}${json}${TAG}::jsonb)
  ON CONFLICT (ec_ref) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RAISE NOTICE 'batch ${n}: inserted % of ${chunk.length}', inserted;
END $do$;
COMMIT;
`);
  }
  writeFileSync(`${out}/import-refs-fetched.txt`, rows.map((r) => r.ec_ref).join('\n') + '\n');
  console.log(`${rows.length} rows in ${n} batches; columns ${cols.length}: ${cols.join(', ')}`);
} else {
  console.log('usage: build <ec-csv-dir> <db-export.csv> <out-dir> | fetch <out-dir> <from YYYY-MM> <to YYYY-MM> | sql <out-dir>');
  process.exit(1);
}
}

main().catch((e) => { console.error(e); process.exit(1); });
