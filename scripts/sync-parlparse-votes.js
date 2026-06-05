#!/usr/bin/env node
// Two-phase backfill for ParlParse division votes into mp_division_votes.
//
// PHASE 1 — Populate division_number on existing CVA-sourced rows.
//   For each distinct division_id already in mp_division_votes (124 of them
//   at time of writing), call Commons Votes API /data/division/{id}.json
//   and read the `Number` field. UPDATE rows where division_id matches.
//   This unifies the natural key (member_id, date_only, number) across CVA
//   and parlparse rows so phase 2's ON CONFLICT correctly skips duplicates.
//
// PHASE 2 — Import parlparse parquet votes.
//   Download divisions.parquet + votes.parquet from theyworkforyou.com,
//   filter to chamber='commons' and division_date in the requested window,
//   translate publicwhip person_id → our member_id via people.json
//   identifiers crosswalk, and INSERT ... ON CONFLICT DO NOTHING using the
//   (member_id, division_date_only, division_number) partial unique index.
//
// vote_type mapping:
//   ParlParse → ours
//   aye       → 'aye',  is_teller=false
//   no        → 'no',   is_teller=false
//   tellaye   → 'aye',  is_teller=true
//   tellno    → 'no',   is_teller=true
//   both      → 'both', is_teller=false
//
// Usage:
//   node scripts/sync-parlparse-votes.js                       # preview both phases
//   node scripts/sync-parlparse-votes.js --apply               # full backfill (current parl)
//   node scripts/sync-parlparse-votes.js --apply --from=2024-07-04
//   node scripts/sync-parlparse-votes.js --apply --phase=1     # just CVA number backfill
//   node scripts/sync-parlparse-votes.js --apply --phase=2     # just parlparse import
//   node scripts/sync-parlparse-votes.js --apply --phase=3     # backfill division_id on parlparse rows

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true'];
  }),
);

const APPLY = args.apply === 'true';
const FROM = args.from || '2024-07-04';
const PHASE = args.phase ? parseInt(args.phase, 10) : null;  // null = both

const TMP_DIR = path.join(os.tmpdir(), 'parlparse-votes');
fs.mkdirSync(TMP_DIR, { recursive: true });
const DIVISIONS_PARQUET = path.join(TMP_DIR, 'divisions.parquet');
const VOTES_PARQUET = path.join(TMP_DIR, 'votes.parquet');
const PEOPLE_JSON = path.join(TMP_DIR, 'people.json');

function psqlQuery(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-At', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
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

async function fetchToFile(url, target, label) {
  if (fs.existsSync(target) && fs.statSync(target).mtimeMs > Date.now() - 6 * 3600 * 1000) {
    console.log(`  [cache] ${label} (<6h old, reusing ${target})`);
    return;
  }
  console.log(`  [download] ${label} → ${target}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(target, buf);
  console.log(`     ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
}

// ──────────────────────────────────────────────────────────────────────
// Phase 1 — CVA division_number backfill
// ──────────────────────────────────────────────────────────────────────

async function phase1() {
  console.log('\n=== Phase 1 — backfill division_number on existing CVA rows ===');
  const out = await psqlQuery(`SELECT DISTINCT division_id FROM mp_division_votes WHERE division_id IS NOT NULL AND division_number IS NULL ORDER BY division_id;`);
  const ids = out.trim().split('\n').filter(Boolean).map(s => parseInt(s, 10));
  console.log(`  ${ids.length} distinct division_ids need division_number backfill`);
  if (ids.length === 0) { console.log('  (already done)'); return; }

  if (!APPLY) {
    console.log('  (preview mode — would fetch Commons Votes API for each id and UPDATE)');
    return;
  }

  let ok = 0, fail = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const res = await fetch(`https://commonsvotes-api.parliament.uk/data/division/${id}.json`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
      });
      if (!res.ok) { fail++; continue; }
      const j = await res.json();
      const num = j.Number;
      if (!Number.isFinite(num)) { fail++; continue; }
      await psqlWrite(`UPDATE mp_division_votes SET division_number = ${num} WHERE division_id = ${id};`);
      ok++;
    } catch (e) {
      fail++;
    }
    if ((i + 1) % 25 === 0) {
      process.stdout.write(`\r  progress ${i + 1}/${ids.length}  ok=${ok} fail=${fail}`);
    }
    await new Promise(r => setTimeout(r, 60));   // polite to CVA
  }
  console.log(`\n  Phase 1 done. UPDATEd ${ok} division_ids, ${fail} failures.`);
}

// ──────────────────────────────────────────────────────────────────────
// Phase 2 — ParlParse parquet import
// ──────────────────────────────────────────────────────────────────────

// Run a python helper inside the parlparse venv to flatten parquet+people.json
// into a single JSONL stream we can stream-process from node.
function streamParlparseVotes(fromDate, toDate) {
  return new Promise((resolve, reject) => {
    const py = `
import sys, json, html, pyarrow.parquet as pq, pyarrow.compute as pc, pyarrow as pa
from datetime import date

divisions_path = "${DIVISIONS_PARQUET}"
votes_path     = "${VOTES_PARQUET}"
people_path    = "${PEOPLE_JSON}"
from_d = date.fromisoformat("${fromDate}")
to_d   = date.fromisoformat("${toDate}")

def clean_title(t):
    if not t: return None
    # Decode HTML entities (Unpublished/Deferred divisions ship &#8212; literally
    # in the parquet) then apply site-wide em/en dash convention.
    return html.unescape(t).replace('\\u2014', ', ').replace('\\u2013', '-')

# Build publicwhip → member_id (datadotparl_id)
people = json.load(open(people_path))
crosswalk = {}
for p in people['persons']:
    for ident in p.get('identifiers', []):
        if ident.get('scheme') == 'datadotparl_id':
            crosswalk[p['id']] = int(ident['identifier'])
            break

divs = pq.read_table(divisions_path)
m = pc.and_(
  pc.equal(divs['chamber'], 'commons'),
  pc.and_(
    pc.greater_equal(divs['division_date'], pa.scalar(from_d)),
    pc.less_equal(divs['division_date'], pa.scalar(to_d)),
  )
)
divs = divs.filter(m)
div_meta = {r['division_id']: r for r in divs.to_pylist()}

votes = pq.read_table(votes_path)
# Filter to vote rows whose division_id is in our window
vm = pc.is_in(votes['division_id'], value_set=pa.array(list(div_meta.keys())))
votes = votes.filter(vm)

# Emit JSONL: {member_id, division_date_only, division_number, vote_type, is_teller, division_title, division_date}
for r in votes.to_pylist():
    pw_pid = f"uk.org.publicwhip/person/{r['person_id']}"
    mid = crosswalk.get(pw_pid)
    if mid is None: continue
    meta = div_meta[r['division_id']]
    v = r['vote']
    is_teller = v in ('tellaye', 'tellno')
    if v in ('aye', 'tellaye'): vt = 'aye'
    elif v in ('no', 'tellno'): vt = 'no'
    elif v == 'both': vt = 'both'
    else: continue  # absent etc.
    sys.stdout.write(json.dumps({
        'member_id': mid,
        'division_date_only': meta['division_date'].isoformat(),
        'division_number': meta['division_number'],
        'division_date': meta['division_date'].isoformat() + 'T00:00:00',
        'division_title': clean_title(meta['division_title']),
        'vote_type': vt,
        'is_teller': is_teller,
    }) + "\\n")
`;
    const p = spawn('/tmp/parlparse/venv/bin/python3', ['-c', py], { stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    const rows = [];
    p.stdout.on('data', d => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const ln of lines) if (ln) rows.push(JSON.parse(ln));
    });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', c => {
      if (buf.trim()) rows.push(JSON.parse(buf));
      c === 0 ? resolve(rows) : reject(new Error(err || `python exit ${c}`));
    });
  });
}

function dq(tag, v) { return v == null ? 'NULL' : `$${tag}$${String(v).replaceAll('$','')}$${tag}$`; }

async function phase2(fromDate, toDate) {
  console.log(`\n=== Phase 2 — import parlparse votes (${fromDate} → ${toDate}) ===`);

  console.log('  Fetching parlparse data files...');
  await Promise.all([
    fetchToFile('https://www.theyworkforyou.com/pwdata/votes/divisions.parquet', DIVISIONS_PARQUET, 'divisions.parquet'),
    fetchToFile('https://www.theyworkforyou.com/pwdata/votes/votes.parquet', VOTES_PARQUET, 'votes.parquet'),
    fetchToFile('https://raw.githubusercontent.com/mysociety/parlparse/master/members/people.json', PEOPLE_JSON, 'people.json'),
  ]);

  console.log('  Flattening parquet → vote rows...');
  const rows = await streamParlparseVotes(fromDate, toDate);
  console.log(`  ${rows.length.toLocaleString()} parlparse vote rows in window`);

  // Count distinct divisions
  const distinctDivs = new Set(rows.map(r => `${r.division_date_only}|${r.division_number}`));
  console.log(`  distinct divisions in window: ${distinctDivs.size.toLocaleString()}`);

  // Distinct member_ids covered
  const distinctMembers = new Set(rows.map(r => r.member_id));
  console.log(`  distinct member_ids voting: ${distinctMembers.size.toLocaleString()}`);

  if (!APPLY) {
    console.log('  (preview — pass --apply to write)');
    return;
  }

  // Batch INSERTs with ON CONFLICT DO NOTHING on the natural key
  const BATCH = 1000;
  let inserted = 0;
  let processed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const values = slice.map((r, j) => {
      const t = `pv${i + j}`;
      return `(${r.member_id}, NULL, ${dq(t, r.vote_type)}, ${dq(t, r.division_date)}::timestamp, ${dq(t, r.division_title)}, ${r.division_number}, ${dq(t, r.division_date_only)}::date, 'parlparse', ${r.is_teller ? 'TRUE' : 'FALSE'})`;
    }).join(',\n  ');

    const sql = `
      INSERT INTO mp_division_votes
        (member_id, division_id, vote_type, division_date, division_title, division_number, division_date_only, source, is_teller)
      VALUES
        ${values}
      ON CONFLICT (member_id, division_date_only, division_number)
        WHERE division_date_only IS NOT NULL AND division_number IS NOT NULL
        DO NOTHING;
    `;
    try {
      await psqlWrite(sql);
      inserted += slice.length;
    } catch (e) {
      console.error(`\n  batch insert fail at row ${i}: ${e.message.split('\n')[0]}`);
    }
    processed += slice.length;
    if ((i / BATCH) % 10 === 0) {
      process.stdout.write(`\r  inserted ${processed.toLocaleString()}/${rows.length.toLocaleString()}`);
    }
  }
  console.log(`\n  Phase 2 done. ${inserted.toLocaleString()} INSERT attempts (DO NOTHING for duplicates).`);
}

// ──────────────────────────────────────────────────────────────────────
// Phase 3 — backfill division_id on parlparse rows
//   Pulls the CVA divisions list (paginated 25/page via the bulk search
//   endpoint), builds a (date_only, Number) → DivisionId lookup, then
//   UPDATEs every parlparse-sourced row whose natural key matches. After
//   this, parlparse rows render the same /bills/, /statutory-instruments/
//   and external commonsvotes links as CVA-sourced rows do.
// ──────────────────────────────────────────────────────────────────────

async function phase3(fromDate, toDate) {
  console.log(`\n=== Phase 3 — backfill division_id on parlparse rows (${fromDate} → ${toDate}) ===`);

  const cvaIndex = new Map();   // 'YYYY-MM-DD|N' → DivisionId
  let skip = 0;
  const PAGE = 25;     // CVA caps take at 25
  while (true) {
    const url = `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.startDate=${fromDate}&queryParameters.endDate=${toDate}&queryParameters.take=${PAGE}&queryParameters.skip=${skip}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'PeoplesChamber/1.0' } });
    if (!res.ok) { console.error(`  CVA HTTP ${res.status} at skip=${skip}`); break; }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) {
      const dateOnly = (r.Date || '').slice(0, 10);
      if (!dateOnly || r.Number == null || r.DivisionId == null) continue;
      cvaIndex.set(`${dateOnly}|${r.Number}`, r.DivisionId);
    }
    if (rows.length < PAGE) break;
    skip += PAGE;
    if (skip > 5000) break;       // safety cap
    await new Promise(r => setTimeout(r, 60));
  }
  console.log(`  CVA lookup built: ${cvaIndex.size.toLocaleString()} (date, number) → DivisionId entries`);

  // How many parlparse rows currently need a division_id?
  const needRaw = (await psqlQuery(`SELECT COUNT(*) FROM mp_division_votes WHERE source='parlparse' AND division_id IS NULL;`)).trim();
  console.log(`  parlparse rows with NULL division_id: ${parseInt(needRaw, 10).toLocaleString()}`);

  if (!APPLY) {
    console.log('  (preview — pass --apply to write)');
    return;
  }

  // Group entries by DivisionId so we can issue one UPDATE per natural-key
  // tuple instead of one UPDATE per row.
  let updated = 0;
  let noMatch = 0;
  const entries = Array.from(cvaIndex.entries());
  const BATCH = 100;
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH);
    const sqls = slice.map(([key, divId]) => {
      const [dateOnly, num] = key.split('|');
      return `UPDATE mp_division_votes SET division_id = ${divId} WHERE source='parlparse' AND division_id IS NULL AND division_date_only = '${dateOnly}'::date AND division_number = ${parseInt(num, 10)};`;
    });
    try {
      await psqlWrite(sqls.join('\n'));
      updated += slice.length;
    } catch (e) {
      console.error(`  batch update fail at i=${i}: ${e.message.split('\n')[0]}`);
    }
    if ((i / BATCH) % 5 === 0) {
      process.stdout.write(`\r  processed ${Math.min(i + BATCH, entries.length)}/${entries.length} divisions`);
    }
  }
  console.log();

  // Verify
  const remainRaw = (await psqlQuery(`SELECT COUNT(*) FROM mp_division_votes WHERE source='parlparse' AND division_id IS NULL;`)).trim();
  const linked = (await psqlQuery(`SELECT COUNT(*) FROM mp_division_votes WHERE source='parlparse' AND division_id IS NOT NULL;`)).trim();
  console.log(`  parlparse rows still NULL division_id: ${parseInt(remainRaw, 10).toLocaleString()}`);
  console.log(`  parlparse rows now LINKED:             ${parseInt(linked, 10).toLocaleString()}`);
  console.log(`  Phase 3 done. Updated ${updated} natural-key tuples.`);
  void noMatch;
}

(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const wantPhase1 = PHASE === null || PHASE === 1;
  const wantPhase2 = PHASE === null || PHASE === 2;
  const wantPhase3 = PHASE === null || PHASE === 3;

  if (wantPhase1) await phase1();
  if (wantPhase2) await phase2(FROM, today);
  if (wantPhase3) await phase3(FROM, today);

  console.log('\nAll requested phases complete.');
})().catch(e => { console.error(e); process.exit(1); });
