#!/usr/bin/env node
// Fills a bill's missing sponsor and missing current stage from Parliament's Bills API:
//   GET https://bills-api.parliament.uk/api/v1/Bills/{parliament_id}
//     sponsors[] (lowest sortOrder with a member) -> sponsor_member_id, sponsor_name, sponsor_party,
//       sponsor_party_colour, sponsor_photo, sponsor_page, sponsor_constituency   (same fields as backfill-bill-sponsors.js)
//     currentStage.description                   -> current_stage
//     currentStage.stageSittings[].date          -> stage_date (latest sitting on or before today; empty if none)
// Only empty fields are filled; nothing already set is changed. By default only bills that are not Acts and not
// withdrawn (owner's approval, 20 Oct 2026: 23 without a sponsor, 4 without a stage); --all includes the rest.
//
// DRY RUN BY DEFAULT: fetches (robots.txt first, one request a second, --cache=dir keeps responses; share the cache
// with backfill-bill-descriptions.js so a bill is fetched once), prints what it found, writes nothing.
// --sql=file.sql writes one guarded transaction: current values copied to bill_sponsor_stage_fill_20261020 first,
// stops unless exactly the planned rows change, and recounts mps.bills_sponsored_count for the members added.
//
// Usage: node scripts/backfill-bill-sponsors-stages.js [--all] [--cache=dir] [--sql=file.sql]
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { makePoliteFetch } = require('./lib/polite-fetch');

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const ALL = process.argv.includes('--all');
const q = (v) => (v == null || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const BACKUP = 'bill_sponsor_stage_fill_20261020';
const blank = (s) => !String(s ?? '').trim();
const TODAY = new Date().toISOString().slice(0, 10);

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  const bills = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('bill').select('id, parliament_id, title, sponsor_name, current_stage, stage_date, is_act, bill_withdrawn').order('id').range(from, from + 999);
    if (error) throw error;
    bills.push(...data);
    if (data.length < 1000) break;
  }
  const scope = bills.filter((b) => ALL || (!b.is_act && b.bill_withdrawn == null));
  const needSponsor = new Set(scope.filter((b) => blank(b.sponsor_name)).map((b) => b.id));
  const needStage = new Set(scope.filter((b) => blank(b.current_stage)).map((b) => b.id));
  const targets = scope.filter((b) => needSponsor.has(b.id) || needStage.has(b.id));
  console.log(`${bills.length} bills; ${needSponsor.size} without a sponsor, ${needStage.size} without a stage${ALL ? '' : ' (not Acts, not withdrawn)'}; ${targets.length} to fetch`);

  const { getJson, requestCount } = makePoliteFetch({ cacheDir: arg('cache') || null });
  const sponsorPlan = []; const stagePlan = []; const notFilled = [];
  for (const b of targets) {
    if (b.parliament_id == null) { notFilled.push(`${b.id} ${b.title}: no parliament_id`); continue; }
    let r;
    try { r = await getJson(`https://bills-api.parliament.uk/api/v1/Bills/${b.parliament_id}`); } catch (e) { notFilled.push(`${b.id} ${b.title}: ${e.message}`); continue; }
    if (r.status !== 200) { notFilled.push(`${b.id} (Parliament ${b.parliament_id}) ${b.title}: HTTP ${r.status}`); continue; }
    const d = r.json;
    if (needSponsor.has(b.id)) {
      const sp = (d.sponsors || []).filter((s) => s && s.member && s.member.memberId).sort((a, x) => (a.sortOrder ?? 9999) - (x.sortOrder ?? 9999))[0];
      if (sp) {
        const m = sp.member;
        sponsorPlan.push({ id: b.id, parliament_id: b.parliament_id, title: b.title, sponsor_member_id: m.memberId, sponsor_name: m.name, sponsor_party: m.party,
          sponsor_party_colour: m.partyColour, sponsor_photo: m.memberPhoto, sponsor_page: m.memberPage, sponsor_constituency: m.memberFrom });
      } else {
        const org = (d.sponsors || []).map((s) => s && s.organisation && s.organisation.name).filter(Boolean);
        notFilled.push(`${b.id} (Parliament ${b.parliament_id}) ${b.title}: no member sponsor in the API (${(d.sponsors || []).length} sponsor entries${org.length ? `; organisation: ${org.join(', ')}` : ''}${(d.promoters || []).length ? `; ${(d.promoters || []).length} promoters` : ''})`);
      }
    }
    if (needStage.has(b.id)) {
      const cs = d.currentStage;
      if (cs && cs.description) {
        const dates = (cs.stageSittings || []).map((x) => String(x.date || '').slice(0, 10)).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && x <= TODAY).sort();
        stagePlan.push({ id: b.id, parliament_id: b.parliament_id, title: b.title, current_stage: cs.description, stage_date: dates.length ? dates[dates.length - 1] : null, house: cs.house });
      } else notFilled.push(`${b.id} (Parliament ${b.parliament_id}) ${b.title}: no current stage in the API`);
    }
  }
  console.log(`requests made: ${requestCount()}`);
  console.log(`sponsors to fill: ${sponsorPlan.length} of ${needSponsor.size}; stages to fill: ${stagePlan.length} of ${needStage.size}`);
  for (const p of sponsorPlan.slice(0, 10)) console.log(`  sponsor ${p.id} (Parliament ${p.parliament_id}) ${p.title}: ${p.sponsor_name} (${p.sponsor_party || '-'}, ${p.sponsor_constituency || '-'}, member ${p.sponsor_member_id})`);
  for (const p of stagePlan) console.log(`  stage   ${p.id} (Parliament ${p.parliament_id}) ${p.title}: ${p.current_stage} (${p.house || '-'}), ${p.stage_date || 'no sitting date yet'}`);
  for (const n of notFilled) console.log(`  not filled: ${n}`);

  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql to write the transaction.'); return; }
  if (!sponsorPlan.length && !stagePlan.length) { console.log('Nothing to write.'); return; }
  const ids = [...new Set([...sponsorPlan, ...stagePlan].map((p) => p.id))];
  const SC = ['sponsor_member_id', 'sponsor_name', 'sponsor_party', 'sponsor_party_colour', 'sponsor_photo', 'sponsor_page', 'sponsor_constituency'];
  const members = [...new Set(sponsorPlan.map((p) => p.sponsor_member_id))];
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;',
    `CREATE TABLE IF NOT EXISTS ${BACKUP} AS SELECT id, parliament_id, title, ${SC.join(', ')}, current_stage, stage_date, now() AS saved_at FROM bill WHERE false;`,
    `ALTER TABLE ${BACKUP} ENABLE ROW LEVEL SECURITY;`,
    `INSERT INTO ${BACKUP} SELECT id, parliament_id, title, ${SC.join(', ')}, current_stage, stage_date, now() FROM bill WHERE id IN (${ids.join(', ')});`,
    'DO $$ DECLARE n int; BEGIN',
    `  SELECT count(*) INTO n FROM ${BACKUP}; IF n <> ${ids.length} THEN RAISE EXCEPTION 'backup has % rows, expected ${ids.length} (already run?)', n; END IF;`];
  if (sponsorPlan.length) L.push(
    `  SELECT count(*) INTO n FROM bill WHERE id IN (${sponsorPlan.map((p) => p.id).join(', ')}) AND nullif(trim(sponsor_name), '') IS NULL;`,
    `  IF n <> ${sponsorPlan.length} THEN RAISE EXCEPTION 'expected ${sponsorPlan.length} bills still without a sponsor, found %', n; END IF;`);
  if (stagePlan.length) L.push(
    `  SELECT count(*) INTO n FROM bill WHERE id IN (${stagePlan.map((p) => p.id).join(', ')}) AND nullif(trim(current_stage), '') IS NULL;`,
    `  IF n <> ${stagePlan.length} THEN RAISE EXCEPTION 'expected ${stagePlan.length} bills still without a stage, found %', n; END IF;`);
  L.push('END $$;');
  for (const p of sponsorPlan) L.push(`UPDATE bill SET ${SC.map((c) => `${c} = ${c === 'sponsor_member_id' ? Number(p[c]) : q(p[c])}`).join(', ')} WHERE id = ${p.id} AND nullif(trim(sponsor_name), '') IS NULL;`);
  for (const p of stagePlan) L.push(`UPDATE bill SET current_stage = ${q(p.current_stage)}, stage_date = ${q(p.stage_date)} WHERE id = ${p.id} AND nullif(trim(current_stage), '') IS NULL;`);
  if (members.length) L.push(`UPDATE mps m SET bills_sponsored_count = (SELECT count(*) FROM bill b WHERE b.sponsor_member_id = m.member_id) WHERE m.member_id IN (${members.join(', ')});`);
  L.push('DO $$ DECLARE n int; BEGIN');
  if (sponsorPlan.length) L.push(`  SELECT count(*) INTO n FROM bill WHERE id IN (${sponsorPlan.map((p) => p.id).join(', ')}) AND nullif(trim(sponsor_name), '') IS NOT NULL;`,
    `  IF n <> ${sponsorPlan.length} THEN RAISE EXCEPTION 'expected ${sponsorPlan.length} sponsors filled, found %', n; END IF;`);
  if (stagePlan.length) L.push(`  SELECT count(*) INTO n FROM bill WHERE id IN (${stagePlan.map((p) => p.id).join(', ')}) AND nullif(trim(current_stage), '') IS NOT NULL;`,
    `  IF n <> ${stagePlan.length} THEN RAISE EXCEPTION 'expected ${stagePlan.length} stages filled, found %', n; END IF;`);
  L.push('END $$;', 'COMMIT;');
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${sponsorPlan.length} sponsors, ${stagePlan.length} stages). Not run.`);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
