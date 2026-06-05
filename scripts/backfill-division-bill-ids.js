#!/usr/bin/env node
// Backfills bill_id on mp_division_votes rows whose division title clearly
// references an existing bill but never went through our CVA→bill linker
// (parlparse-imported rows). Once linked, the /divisions/[slug] page can
// surface bill.plain_summary as the 'What this vote was about' section.
//
// Strategy: for each distinct (date, number) tuple with NO bill_id on any
// row, normalise the division_title down to a bill-name candidate, then
// match against bill.title. On match, UPDATE every row for that tuple.
//
// Normalisations applied (in order, on the title's prefix-before-first-colon):
//   strip " Report Stage", " Committee", " Bill Committee" etc.
//   strip trailing parenthetical session markers like "(No. 2)" — kept as
//     an alternative variant tried after the literal
//   collapse multiple spaces, trim
//
// Match priority:
//   1. EXACT case-insensitive match on bill.title (best)
//   2. Bill.title ILIKE 'candidate%' (single result wins)
//   3. Reject (ambiguous or no match) — leave bill_id NULL
//
// Usage:
//   node scripts/backfill-division-bill-ids.js              # preview
//   node scripts/backfill-division-bill-ids.js --apply      # write

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const APPLY = process.argv.includes('--apply');

function psqlQuery(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-At', '-F', '\t', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', c => c === 0 ? resolve(out) : reject(new Error(err)));
  });
}
function psqlWrite(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-q'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', c => c === 0 ? resolve() : reject(new Error(err)));
    p.stdin.end(sql);
  });
}

// Strip suffixes that vary across stages of the same bill — they all map
// to the same underlying bill record.
const STRIP_SUFFIXES = [
  / Report Stage$/i,
  / Bill Committee$/i,
  / Committee$/i,
  / (HL)?$/i,
  / \[HL\]$/i,
  /,? Lords Amendments?.*$/i,
];

function normaliseCandidate(rawPrefix) {
  let s = rawPrefix.trim();
  // Drop "Unpublished Divisions:" wrapper so the inner bill name surfaces.
  s = s.replace(/^Unpublished Divisions:\s*/i, '');
  // Drop date stamps in parens at the end of the line: "(14 April 2026)"
  s = s.replace(/\s*\(\d{1,2} [A-Za-z]+ \d{4}\)\s*$/i, '');
  // Run all suffix strips iteratively until stable.
  let prev = '';
  while (prev !== s) {
    prev = s;
    for (const re of STRIP_SUFFIXES) s = s.replace(re, '');
  }
  return s.replace(/\s+/g, ' ').trim();
}

// A "key" strips trailing Bill/Act + year + quote-style differences so the
// same legislation matches whether stored as "Foo Bill" or "Foo Act 2026"
// in our bill table. Curly apostrophes (’ ’) collapse to straight (' ')
// so titles from parlparse and bill metadata reconcile.
function keyOf(s) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+\[(HL|Lords)\]\s*$/i, '')
    .replace(/\s+\((No\.?\s*\d+)\)\s*$/i, ' $1')      // keep "(No. 2)" inline
    .replace(/\s+(Bill|Act)(\s+\d{4})?\s*$/i, '')     // drop trailing Bill/Act [YYYY]
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// When multiple bills share a normalised key, prefer Act (passed) over
// Bill [HL] (Lords-introduced version) over plain Bill. Then most recent.
function preferBill(a, b) {
  const isAct = (t) => / Act(\s+\d{4})?\s*$/i.test(t);
  const isLordsBill = (t) => /\[HL\]\s*$/i.test(t);
  if (isAct(a.title) && !isAct(b.title)) return a;
  if (isAct(b.title) && !isAct(a.title)) return b;
  if (isLordsBill(a.title) && !isLordsBill(b.title)) return b;
  if (isLordsBill(b.title) && !isLordsBill(a.title)) return a;
  return a.id > b.id ? a : b;
}

(async () => {
  console.log('Loading bills...');
  const billsRaw = await psqlQuery(`SELECT id, title FROM bill WHERE title IS NOT NULL AND length(trim(title)) > 0;`);
  const bills = billsRaw.trim().split('\n').filter(Boolean).map(ln => {
    const [id, title] = ln.split('\t');
    return { id: parseInt(id, 10), title: title || '' };
  });
  const byExactLower = new Map();
  for (const b of bills) byExactLower.set(b.title.toLowerCase(), b);
  // Normalised-key index: Bill/Act/HL stripped, curly quotes flattened
  // so the parlparse title format reconciles with our stored Acts.
  const byKey = new Map();
  for (const b of bills) {
    const k = keyOf(b.title);
    if (!k) continue;
    const existing = byKey.get(k);
    byKey.set(k, existing ? preferBill(existing, b) : b);
  }
  console.log(`  ${bills.length.toLocaleString()} bills (${byKey.size.toLocaleString()} distinct normalised keys)`);

  console.log('Loading bare divisions...');
  const divsRaw = await psqlQuery(`
    SELECT DISTINCT division_date_only::text, division_number, MIN(division_title)
    FROM mp_division_votes
    WHERE division_date_only IS NOT NULL AND division_number IS NOT NULL
    GROUP BY division_date_only, division_number
    HAVING BOOL_OR(bill_id IS NOT NULL) = FALSE;
  `);
  const divs = divsRaw.trim().split('\n').filter(Boolean).map(ln => {
    const [date, num, title] = ln.split('\t');
    return { date, num: parseInt(num, 10), title: title || '' };
  });
  console.log(`  ${divs.length.toLocaleString()} divisions with no bill_id on any row`);

  let exactHits = 0, keyHits = 0, prefixHits = 0, ambiguous = 0, none = 0;
  const updates = [];
  const sampleMisses = [];

  for (const d of divs) {
    const prefix = d.title.split(':')[0];
    const cand = normaliseCandidate(prefix);
    if (!cand) { none++; continue; }

    // 1. exact (case-insensitive) match
    const exact = byExactLower.get(cand.toLowerCase());
    if (exact) {
      exactHits++;
      updates.push({ ...d, bill_id: exact.id, via: 'exact' });
      continue;
    }
    // 2. normalised-key match (Bill/Act stripped, quotes flattened)
    const keyMatch = byKey.get(keyOf(cand));
    if (keyMatch) {
      keyHits++;
      updates.push({ ...d, bill_id: keyMatch.id, via: 'key' });
      continue;
    }
    // 3. prefix match — bills whose normalised title starts with the candidate
    const candKey = keyOf(cand);
    const prefixMatches = candKey
      ? Array.from(byKey.entries()).filter(([k]) => k.startsWith(candKey + ' ') || k === candKey)
      : [];
    if (prefixMatches.length === 1) {
      prefixHits++;
      updates.push({ ...d, bill_id: prefixMatches[0][1].id, via: 'prefix' });
      continue;
    }
    if (prefixMatches.length > 1) {
      ambiguous++;
      continue;
    }
    none++;
    if (sampleMisses.length < 12) sampleMisses.push({ ...d, candidate: cand });
  }

  console.log(`\nResults:`);
  console.log(`  exact matches:           ${exactHits.toLocaleString()}`);
  console.log(`  normalised-key matches:  ${keyHits.toLocaleString()}`);
  console.log(`  prefix matches:          ${prefixHits.toLocaleString()}`);
  console.log(`  ambiguous (skip):        ${ambiguous.toLocaleString()}`);
  console.log(`  no match (skip):         ${none.toLocaleString()}`);
  console.log(`  total updates:           ${updates.length.toLocaleString()}`);
  if (sampleMisses.length) {
    console.log(`\nSample of unmatched titles (first 10):`);
    for (const m of sampleMisses) console.log(`    "${m.title.slice(0,80)}"  → candidate "${m.candidate}"`);
  }

  if (!APPLY) {
    console.log('\n(preview only — pass --apply to write)');
    return;
  }

  // Apply UPDATEs in batches
  const BATCH = 200;
  let written = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    const sqls = slice.map(u =>
      `UPDATE mp_division_votes SET bill_id = ${u.bill_id} WHERE division_date_only = '${u.date}'::date AND division_number = ${u.num} AND bill_id IS NULL;`
    );
    await psqlWrite(sqls.join('\n'));
    written += slice.length;
    process.stdout.write(`\r  written ${written}/${updates.length}`);
  }
  console.log(`\n  ${written.toLocaleString()} divisions now have bill_id set.`);
})().catch(e => { console.error(e); process.exit(1); });
