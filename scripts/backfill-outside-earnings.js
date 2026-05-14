// Re-populate mp_outside_earnings_summary from Parliament's
// RegisteredInterests API for every current MP. Parses Category 1
// "Employment and earnings" entries: amounts come from child interests
// (Payment: £X), payer names come from the parent's "Payer:" line.
//
// DRY RUN by default. Writes nothing without DRY_RUN=false.
// On write: backs up every affected row to scripts/backups/ first, then
// UPSERTs each MP's totals via psql.

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN !== 'false';
const CONCURRENCY = 12;

if (!SUPABASE_URL || !ANON_KEY) { console.error('env missing'); process.exit(1); }
if (!DRY_RUN && !DATABASE_URL) { console.error('DATABASE_URL required for write'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const AMOUNT_RE = /£\s*([\d,]+(?:\.\d{1,2})?)/g;
const PAYER_RE = /(?:^|\|)\s*Payer:\s*([^|]+?)(?:\s*\(|\s*\|\s*ACOBA|$)/i;
const ULTIMATE_RE = /(?:^|\|)\s*Ultimate payer:\s*([^|]+?)(?:\s*\(|$)/i;

function parseAmount(s) {
  return parseFloat(String(s).replace(/,/g, ''));
}

function payerName(raw) {
  if (!raw) return null;
  const t = String(raw).replace(/\r\n/g, '|').trim();
  const m = t.match(PAYER_RE);
  if (!m) return null;
  // Trim address tail — keep just the org name (everything before the first comma).
  return m[1].split(',')[0].trim();
}

function ultimatePayerName(raw) {
  if (!raw) return null;
  const t = String(raw).replace(/\r\n/g, '|').trim();
  const m = t.match(ULTIMATE_RE);
  if (!m) return null;
  return m[1].split(',')[0].trim();
}

function summarize(category) {
  // category = { name, interests: [{ interest, childInterests: [...] }] }
  let total = 0;
  let claimCount = 0;
  const sources = new Set();

  for (const i of category.interests || []) {
    if (i.deletedWhen) continue;
    const parentPayer = payerName(i.interest);
    if (parentPayer) sources.add(parentPayer.toLowerCase());

    const children = (i.childInterests || []).filter((c) => !c.deletedWhen);
    if (children.length === 0) {
      // No child amount — still count the declaration as a claim with £0
      // so it shows up as activity, but we can't extract a money figure.
      claimCount += 1;
      continue;
    }
    for (const c of children) {
      claimCount += 1;
      const text = c.interest || '';
      const matches = [...text.matchAll(AMOUNT_RE)];
      for (const m of matches) {
        total += parseAmount(m[1]);
      }
      const ult = ultimatePayerName(text);
      if (ult) sources.add(ult.toLowerCase());
    }
  }
  return { total, claimCount, sourceCount: sources.size };
}

async function fetchSummary(memberId) {
  try {
    const res = await fetch(`https://members-api.parliament.uk/api/Members/${memberId}/RegisteredInterests`);
    if (!res.ok) return { memberId, ok: false, status: res.status };
    const data = await res.json();
    const cat = (data.value || []).find((c) => (c.name || '').startsWith('1. Employment and earnings'));
    if (!cat) return { memberId, ok: true, total: 0, claimCount: 0, sourceCount: 0, hasCat1: false };
    const s = summarize(cat);
    return { memberId, ok: true, ...s, hasCat1: true };
  } catch (e) {
    return { memberId, ok: false, error: e.message };
  }
}

async function runWithConcurrency(items, limit, fn) {
  const out = [];
  let i = 0;
  async function w() { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); } }
  await Promise.all(Array.from({ length: limit }, w));
  return out;
}

const sqlEsc = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

(async () => {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'}`);

  const { data: mps } = await supabase
    .from('mps')
    .select('member_id, name, display_name')
    .eq('current_member', true);
  console.log(`Current MPs: ${mps.length}`);

  console.log(`Probing API (concurrency=${CONCURRENCY})…`);
  const t0 = Date.now();
  const results = await runWithConcurrency(mps.map((m) => m.member_id), CONCURRENCY, fetchSummary);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const failures = results.filter((r) => !r.ok);
  console.log(`API failures: ${failures.length}`);

  // Existing rows
  const { data: existing } = await supabase
    .from('mp_outside_earnings_summary')
    .select('member_id, total_extracted, claim_count, source_count');
  const existingByMember = new Map(existing.map((r) => [r.member_id, r]));

  // Build new state per MP. We only insert/update for MPs whose API has Cat-1.
  const inserts = [];     // not in existing, will INSERT
  const updates = [];     // in existing, changed values
  const unchanged = [];   // in existing, no change
  for (const r of results) {
    if (!r.ok || !r.hasCat1) continue;
    const row = { member_id: r.memberId, total_extracted: r.total, claim_count: r.claimCount, source_count: r.sourceCount };
    const prev = existingByMember.get(r.memberId);
    if (!prev) inserts.push(row);
    else if (Number(prev.total_extracted) !== row.total_extracted ||
             prev.claim_count !== row.claim_count ||
             prev.source_count !== row.source_count) {
      updates.push({ row, prev });
    } else unchanged.push(row);
  }

  console.log(`\n=== Diff summary ===`);
  console.log(`Inserts (new MPs):   ${inserts.length}`);
  console.log(`Updates (changed):   ${updates.length}`);
  console.log(`Unchanged:           ${unchanged.length}`);

  console.log(`\nSample inserts (first 10):`);
  for (const r of inserts.slice(0, 10)) {
    const mp = mps.find((m) => m.member_id === r.member_id);
    console.log(`  ${mp?.display_name || mp?.name}: £${r.total_extracted.toLocaleString()} (${r.claim_count} claims / ${r.source_count} sources)`);
  }
  console.log(`\nSample updates (first 10):`);
  for (const u of updates.slice(0, 10)) {
    const mp = mps.find((m) => m.member_id === u.row.member_id);
    console.log(`  ${mp?.display_name || mp?.name}: £${Number(u.prev.total_extracted).toLocaleString()} → £${u.row.total_extracted.toLocaleString()}  (${u.prev.claim_count}→${u.row.claim_count} claims, ${u.prev.source_count}→${u.row.source_count} sources)`);
  }

  if (DRY_RUN) {
    console.log(`\nDry run complete. To apply: DRY_RUN=false node scripts/backfill-outside-earnings.js`);
    return;
  }

  // Backup current state of every row we're about to touch.
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const affected = [...inserts.map((r) => r.member_id), ...updates.map((u) => u.row.member_id)];
  const backupRows = existing.filter((r) => affected.includes(r.member_id));
  const backupFile = path.join(backupsDir, `mp_outside_earnings_summary_pre_backfill_${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupRows, null, 2));
  console.log(`\nBacked up ${backupRows.length} existing rows to ${backupFile}`);

  // Apply via psql, one statement per row (simpler; small N).
  let ok = 0;
  const all = [...inserts.map((r) => ({ row: r, kind: 'insert' })), ...updates.map((u) => ({ row: u.row, kind: 'update' }))];
  for (const { row, kind } of all) {
    const sql =
      `INSERT INTO mp_outside_earnings_summary (member_id, total_extracted, claim_count, source_count) ` +
      `VALUES (${row.member_id}, ${row.total_extracted}, ${row.claim_count}, ${row.source_count}) ` +
      `ON CONFLICT (member_id) DO UPDATE SET total_extracted = EXCLUDED.total_extracted, claim_count = EXCLUDED.claim_count, source_count = EXCLUDED.source_count;`;
    try {
      execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'pipe' });
      ok++;
    } catch (e) {
      console.error(`  ${kind} failed member_id=${row.member_id}:`, e.stderr ? e.stderr.toString() : e.message);
    }
  }
  console.log(`\nDone. ${ok}/${all.length} rows written.`);
})();
