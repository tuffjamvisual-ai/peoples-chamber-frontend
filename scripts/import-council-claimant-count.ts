// Full-history load of the ONS Claimant Count by council (Nomis NM_162_1)
// into council_claimant_count. See scripts/migrations/2026-10-11j-council-claimant-count.sql.
// The daily sync (app/api/sync-claimant-count/route.ts) keeps the latest
// 3 months current.
//
// Run with tsx:
//   npx tsx scripts/import-council-claimant-count.ts --dry-run   # fetch + check, no writes
//   npx tsx scripts/import-council-claimant-count.ts             # writes every month
//
// Walks back from the latest month, 6 months per request, until Nomis has
// no more months. Stops without writing if any area code doesn't match the
// councils table, or if the latest month disagrees with ONS table CC01.
// Every write is an upsert, so re-running is safe.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  GEOGRAPHY_TYPES,
  MONTHS_PER_REQUEST,
  fetchMonths,
  writeClaimantRows,
  loadCouncilCodes,
  type ClaimantRow,
} from '../lib/claimant-count';

config({ path: '.env.local', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_MONTHS = 600;
const ONS_CC01_PAGE = 'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/datasets/claimantcountbyunitaryandlocalauthorityexperimental';
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const CHECK_CODES = ['E06000001', 'E09000033', 'N09000003', 'E10000012'];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ONS CC01 (current release): people claiming and proportion, by code.
async function readCC01(): Promise<{ url: string; byCode: Map<string, { people: number; pct: number }> }> {
  const html = await (await fetch(ONS_CC01_PAGE, { headers: UA })).text();
  const link = [...html.matchAll(/href="([^"]+\.xlsx?)"/gi)].map((m) => m[1]).find((l) => /\/current\//.test(l));
  if (!link) throw new Error('CC01: no current spreadsheet link on the ONS page');
  const url = link.startsWith('http') ? link : `https://www.ons.gov.uk${link}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`CC01 HTTP ${res.status}`);
  const wb = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
  const ws = wb.Sheets['CC01'];
  if (!ws) throw new Error(`CC01 sheet not found (sheets: ${wb.SheetNames.join(', ')})`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as (string | number)[][];
  const hi = rows.findIndex((r) => String(r[1]).trim() === 'Geography code');
  if (hi < 0) throw new Error('CC01: heading row not found');
  const h = rows[hi].map((v) => String(v).replace(/\d+$/, '').trim());
  const iPeople = h.indexOf('Number of people');
  const iPct = h.indexOf('Proportion of people');
  if (iPeople < 0 || iPct < 0) throw new Error(`CC01: columns not found (${h.join(' | ')})`);
  const byCode = new Map<string, { people: number; pct: number }>();
  for (const r of rows.slice(hi + 1)) {
    const code = String(r[1]).trim();
    if (/^[EWSNK]\d{8}$/.test(code) && typeof r[iPeople] === 'number') byCode.set(code, { people: r[iPeople] as number, pct: Number(r[iPct]) });
  }
  return { url, byCode };
}

async function main() {
  console.log(`Council claimant count import${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);
  const { codes, names } = await loadCouncilCodes(db);
  const all: ClaimantRow[] = [];
  const unmatched = new Set<string>();

  for (const geo of GEOGRAPHY_TYPES) {
    let offset = 0;
    let months = 0;
    let requests = 0;
    while (offset < MAX_MONTHS) {
      const offsets = Array.from({ length: MONTHS_PER_REQUEST }, (_, i) => offset + i);
      let r;
      try {
        r = await fetchMonths(geo, offsets, codes);
      } catch (e) {
        // Nomis rejects offsets past the first month; after at least one full batch that means we've reached the start.
        if (months > 0) { console.log(`  ${geo.type}: request for offsets ${offset}-${offset + MONTHS_PER_REQUEST - 1} refused (${(e as Error).message}); treating as start of series`); break; }
        throw e;
      }
      requests++;
      const got = new Set(r.rows.map((x) => x.month)).size;
      r.unmatched.forEach((c) => unmatched.add(c));
      all.push(...r.rows);
      months += got;
      if (got === 0) break;
      if (r.cells > 25000) throw new Error(`${geo.type}: ${r.cells} cells in one response (over the guest cap)`);
      offset += MONTHS_PER_REQUEST;
      if (got < MONTHS_PER_REQUEST) break;
      await new Promise((res) => setTimeout(res, 300));
    }
    console.log(`  ${geo.type}: ${months} months in ${requests} requests`);
  }

  const monthsAll = [...new Set(all.map((r) => r.month))].sort();
  const latest = monthsAll[monthsAll.length - 1];
  const councils = new Set(all.map((r) => r.council_gss_code));
  console.log(`  rows: ${all.length.toLocaleString()} for ${councils.size} councils; months ${monthsAll[0]} to ${latest} (${monthsAll.length})`);
  const missing = [...codes].filter((c) => !councils.has(c));
  console.log(`  councils with no rows (${missing.length}): ${missing.map((c) => `${c} ${names.get(c)}`).join('; ') || 'none'}`);
  const latestRows = all.filter((r) => r.month === latest);
  console.log(`  ${latest}: ${latestRows.length} councils; with count ${latestRows.filter((r) => r.claimants != null).length}; with rate ${latestRows.filter((r) => r.rate != null).length}; with men/women ${latestRows.filter((r) => r.claimants_men != null && r.claimants_women != null).length}`);
  const starts = new Map<string, number>();
  for (const c of councils) { const first = all.filter((r) => r.council_gss_code === c).map((r) => r.month).sort()[0]; starts.set(first, (starts.get(first) || 0) + 1); }
  console.log(`  series start months: ${[...starts.entries()].sort().map(([m, n]) => `${m}=${n}`).join(', ')}`);

  // Completeness by year: how many councils have a count / rate / men-women split in January of each year.
  console.log('  completeness (January of each year: councils with count / rate / men+women):');
  for (const m of monthsAll.filter((x) => x.endsWith('-01-01'))) {
    const rs = all.filter((r) => r.month === m);
    const eg = rs.find((r) => r.council_gss_code === 'E06000001');
    console.log(`    ${m.slice(0, 4)}: ${rs.filter((r) => r.claimants != null).length} / ${rs.filter((r) => r.rate != null).length} / ${rs.filter((r) => r.claimants_men != null && r.claimants_women != null).length}   Hartlepool ${eg?.claimants ?? '—'} (${eg?.rate ?? '—'}%)`);
  }

  const problems: string[] = [];
  if (unmatched.size) problems.push(`area codes not in councils table: ${[...unmatched].join(' ')}`);
  const dup = all.length - new Set(all.map((r) => `${r.council_gss_code}|${r.month}`)).size;
  if (dup) problems.push(`${dup} duplicate council/month rows`);

  const cc01 = await readCC01();
  console.log(`  ONS CC01 check against ${cc01.url}`);
  for (const code of CHECK_CODES) {
    const n = latestRows.find((r) => r.council_gss_code === code);
    const o = cc01.byCode.get(code);
    const ok = n && o && n.claimants === o.people && n.rate != null && Math.abs(n.rate - o.pct) <= 0.05;
    console.log(`    ${code} ${names.get(code)}: Nomis ${n?.claimants} (${n?.rate}%) vs CC01 ${o?.people} (${o?.pct}%) ${ok ? 'OK' : 'MISMATCH'}`);
    if (!ok) problems.push(`CC01 mismatch for ${code}`);
  }

  if (problems.length) {
    console.log(`\nPROBLEMS — nothing written:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  if (!DRY_RUN) await writeClaimantRows(db, all);
  console.log(`\n${all.length.toLocaleString()} rows ${DRY_RUN ? 'computed' : 'written'}`);
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
