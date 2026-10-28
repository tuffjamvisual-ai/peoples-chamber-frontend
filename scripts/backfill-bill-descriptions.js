#!/usr/bin/env node
// Fills bills that have no summary at all (no description and no long title) from Parliament's Bills API:
//   GET https://bills-api.parliament.uk/api/v1/Bills/{parliament_id}
//     longTitle -> bill.long_title     (corrected 20 Oct 2026: this used to write longTitle into description)
//     summary   -> bill.description    (the API's plain-English summary, tags removed; only where it has one)
// Matches by bill.parliament_id (NOT bill.id; the two are different numbers). lib/bill-summary.ts shows
// description first, then long_title.
//
// Which bills: no description and no long title (the same test as lib/bill-summary.ts). By default only bills that are
// not Acts and not withdrawn (owner's approval, 20 Oct 2026: the 61 such bills); --all includes Acts and withdrawn.
//
// DRY RUN BY DEFAULT: fetches (robots.txt first, one request a second, --cache=dir keeps responses), prints what it
// found, writes nothing. --sql=file.sql writes one guarded transaction: the rows' current values are copied to
// bill_summary_fill_20261020 first, and it stops unless exactly the planned rows change.
//
// Usage: node scripts/backfill-bill-descriptions.js [--all] [--cache=dir] [--sql=file.sql]
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { makePoliteFetch } = require('./lib/polite-fetch');

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const ALL = process.argv.includes('--all');
const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const BACKUP = 'bill_summary_fill_20261020';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—' };
function plain(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m))
    .replace(/\s+/g, ' ')
    .trim();
}
const empty = (s, title) => { const t = plain(s); return !t || t.toLowerCase() === 'no description available' || t === (title || '').trim(); };

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  const bills = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('bill').select('id, parliament_id, title, description, long_title, is_act, bill_withdrawn').order('id').range(from, from + 999);
    if (error) throw error;
    bills.push(...data);
    if (data.length < 1000) break;
  }
  const targets = bills.filter((b) => empty(b.description, b.title) && empty(b.long_title, b.title) && (ALL || (!b.is_act && b.bill_withdrawn == null)));
  console.log(`${bills.length} bills; ${targets.length} with no summary${ALL ? '' : ' (not Acts, not withdrawn)'}; ${targets.filter((b) => b.parliament_id == null).length} without a parliament_id`);

  const { getJson, requestCount } = makePoliteFetch({ cacheDir: arg('cache') || null });
  const plan = []; const none = []; const failed = [];
  for (const [i, b] of targets.entries()) {
    if (b.parliament_id == null) { none.push({ ...b, why: 'no parliament_id' }); continue; }
    try {
      const r = await getJson(`https://bills-api.parliament.uk/api/v1/Bills/${b.parliament_id}`);
      if (r.status !== 200) { failed.push({ ...b, why: `HTTP ${r.status}` }); continue; }
      const longTitle = plain(r.json.longTitle);
      const summary = plain(r.json.summary);
      const lt = longTitle && longTitle !== b.title.trim() ? longTitle : null;
      const desc = summary && summary !== b.title.trim() && summary !== lt ? summary : null;
      if (!lt && !desc) none.push({ ...b, why: 'API has no long title or summary' });
      else plan.push({ id: b.id, parliament_id: b.parliament_id, title: b.title, long_title: lt, description: desc });
    } catch (e) { failed.push({ ...b, why: e.message }); }
    if ((i + 1) % 20 === 0) console.error(`  ${i + 1}/${targets.length}`);
  }
  console.log(`requests made: ${requestCount()}`);
  console.log(`to fill: ${plan.length} (long title ${plan.filter((p) => p.long_title).length}, summary ${plan.filter((p) => p.description).length}); nothing upstream: ${none.length}; failed: ${failed.length}`);
  for (const p of plan.slice(0, 8)) console.log(`  ${p.id} (Parliament ${p.parliament_id}) ${p.title}\n      long title: ${(p.long_title || '-').slice(0, 150)}\n      summary:    ${(p.description || '-').slice(0, 150)}`);
  for (const n of [...none, ...failed].slice(0, 15)) console.log(`  not filled: ${n.id} (Parliament ${n.parliament_id}) ${n.title}: ${n.why}`);
  if (arg('report')) fs.writeFileSync(arg('report'), JSON.stringify({ plan, none, failed }, null, 1));

  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql to write the transaction.'); return; }
  if (!plan.length) { console.log('Nothing to write.'); return; }
  const ids = plan.map((p) => p.id).join(', ');
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;',
    `CREATE TABLE IF NOT EXISTS ${BACKUP} AS SELECT id, parliament_id, title, description, long_title, now() AS saved_at FROM bill WHERE false;`,
    `ALTER TABLE ${BACKUP} ENABLE ROW LEVEL SECURITY;`,
    `INSERT INTO ${BACKUP} SELECT id, parliament_id, title, description, long_title, now() FROM bill WHERE id IN (${ids});`,
    'CREATE TEMP TABLE fill (id int PRIMARY KEY, long_title text, description text) ON COMMIT DROP;',
    'INSERT INTO fill VALUES', plan.map((p) => `(${p.id}, ${q(p.long_title)}, ${q(p.description)})`).join(',\n') + ';',
    'DO $$ DECLARE n int; BEGIN',
    // Each row must still be empty: anything filled since the dry run is left alone and stops the run.
    `  SELECT count(*) INTO n FROM bill b JOIN fill f USING (id) WHERE nullif(trim(b.long_title), '') IS NULL AND nullif(trim(b.description), '') IS NULL;`,
    `  IF n <> ${plan.length} THEN RAISE EXCEPTION 'expected ${plan.length} bills still without a summary, found %', n; END IF;`,
    'END $$;',
    'UPDATE bill b SET long_title = coalesce(f.long_title, b.long_title), description = coalesce(f.description, b.description) FROM fill f WHERE f.id = b.id;',
    'DO $$ DECLARE n int; BEGIN',
    `  SELECT count(*) INTO n FROM bill b JOIN fill f USING (id) WHERE nullif(trim(b.long_title), '') IS NOT NULL OR nullif(trim(b.description), '') IS NOT NULL;`,
    `  IF n <> ${plan.length} THEN RAISE EXCEPTION 'expected ${plan.length} bills filled, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM ${BACKUP}; IF n <> ${plan.length} THEN RAISE EXCEPTION 'backup has % rows, expected ${plan.length} (already run?)', n; END IF;`,
    'END $$;', 'COMMIT;'];
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${plan.length} bills). Not run.`);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
