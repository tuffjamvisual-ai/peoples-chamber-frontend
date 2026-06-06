#!/usr/bin/env node
// Syncs APPG data from mySociety/appg-membership into our DB.
// Source: https://github.com/mysociety/appg-membership
// Licence: Open Government Licence per upstream attribution.
//
// (Previously this script tried to scrape publications.parliament.uk via
// Playwright. That site sits behind Cloudflare and the scrape never
// settled. mySociety's repo is the parsed, structured equivalent.)
//
// Three tables populated:
//   appgs           — one row per APPG
//   appg_officers   — one row per (APPG, officer); mnis_id maps to mps.member_id
//   appg_funders    — one row per registered benefit / secretariat funder
//
// Snapshot semantics: officers + funders are replaced wholesale on each
// run (delete-then-insert) so removed-from-upstream rows stop appearing.
// APPGs upsert on slug so existing detail isn't lost.

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const APPLY = process.argv.includes('--apply');
const CONCURRENCY = 12;

const TREE_URL = 'https://api.github.com/repos/mysociety/appg-membership/git/trees/main?recursive=1';
const RAW_BASE = 'https://raw.githubusercontent.com/mysociety/appg-membership/main';

function psql(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-At', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', c => c === 0 ? resolve(out) : reject(new Error(err || `psql exit ${c}\n${out}`)));
    p.stdin.end(sql);
  });
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function dq(tag, v) { return v == null ? 'NULL' : `$${tag}$${String(v).replaceAll('$','')}$${tag}$`; }
function dqArr(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 'NULL';
  const parts = arr.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(',');
  return `'{${parts}}'`;
}
function dqDate(d) {
  if (!d) return 'NULL';
  const m = String(d).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `'${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}'::date`;
  const m2 = String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m2) {
    let [, dd, mo, y] = m2;
    if (y.length === 2) y = '20' + y;
    return `'${y}-${mo.padStart(2,'0')}-${dd.padStart(2,'0')}'::date`;
  }
  return 'NULL';
}

(async () => {
  console.log('Fetching APPG file index from GitHub tree API…');
  const tree = await fetchJson(TREE_URL);
  const files = (tree.tree || [])
    .filter((t) => t.path.startsWith('data/appgs/') && t.path.endsWith('.json'))
    .map((t) => t.path);
  console.log(`  ${files.length.toLocaleString()} APPG JSON files`);

  let processed = 0;
  const appgRows = [];
  const officerRows = [];
  const funderRows = [];

  async function pull(path) {
    try {
      const d = await fetchJson(`${RAW_BASE}/${path}`);
      const slug = d.slug || path.replace(/^data\/appgs\//, '').replace(/\.json$/, '');
      let secretariatText = null, secretariatUrl = null;
      if (d.contact_details?.secretariat) {
        const sm = String(d.contact_details.secretariat);
        const urlM = sm.match(/(https?:\/\/[^\s]+)/);
        secretariatUrl = urlM ? urlM[1] : null;
        const beforeUrl = urlM ? sm.slice(0, urlM.index).trim() : sm;
        // Strip boilerplate suffix so the same lobby firm doesn't split
        // into multiple distinct values across the dataset.
        secretariatText = beforeUrl
          .replace(/\s*acts\s+as\s+the\s+group['’]?s\s+secretariat\.?\s*$/i, '')
          .trim();
      }
      appgRows.push({
        slug,
        title: d.title || slug,
        purpose: d.purpose || null,
        category: d.category || null,
        parliament: d.parliament || 'uk',
        secretariat: secretariatText,
        secretariat_url: secretariatUrl,
        registered_contact: d.contact_details?.registered_contact_name || null,
        registrable_benefits: d.registrable_benefits || null,
        agm_date: d.agm?.date_of_most_recent_agm || null,
        reporting_year: d.agm?.reporting_year || null,
        next_reporting_deadline: d.agm?.next_reporting_deadline || null,
        website_url: d.contact_details?.website?.url || null,
        website_status: d.contact_details?.website?.status || null,
        categories: Array.isArray(d.categories) ? d.categories : [],
        source_url: d.source_url || null,
      });

      for (const o of d.officers || []) {
        const mnis = o.mnis_id ? parseInt(o.mnis_id, 10) : null;
        officerRows.push({
          slug,
          member_id: Number.isFinite(mnis) ? mnis : null,
          name_at_time: o.name || '(unknown)',
          party: o.party || null,
          role: o.role || 'Officer',
          removed: !!o.removed,
        });
      }
      for (const b of d.detailed_benefits || []) {
        funderRows.push({
          slug,
          source: b.Source || '(unspecified)',
          description: b.Description || null,
          value_band: b['Value £s In bands of £1,500'] || b['Value Pounds In bands of £1,500'] || null,
          received_date: b.Received || null,
          registered_date: b.Registered || null,
          benefit_type: b.benefit_type || d.registrable_benefits || null,
        });
      }
    } catch (e) {
      console.error(`  ${path}: ${e.message}`);
    } finally {
      processed++;
      if (processed % 50 === 0 || processed === files.length) {
        process.stdout.write(`\r  processed ${processed}/${files.length}`);
      }
    }
  }

  // Concurrency pool
  const queue = [...files];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const f = queue.shift();
      if (!f) break;
      await pull(f);
    }
  }));
  console.log(`\n  APPGs: ${appgRows.length}, officers: ${officerRows.length}, funders: ${funderRows.length}`);

  if (!APPLY) {
    console.log('\n(preview — pass --apply to write)');
    return;
  }

  console.log('\nWriting to DB…');

  const upsertAppg = appgRows.map((r) => `
    INSERT INTO appgs (slug, title, purpose, category, parliament, secretariat, secretariat_url,
                       registered_contact, registrable_benefits, agm_date, reporting_year,
                       next_reporting_deadline, website_url, website_status, categories, source_url, scraped_at)
    VALUES (${dq('s', r.slug)}, ${dq('t', r.title)}, ${dq('p', r.purpose)}, ${dq('c', r.category)},
            ${dq('pl', r.parliament)}, ${dq('sec', r.secretariat)}, ${dq('su', r.secretariat_url)},
            ${dq('rc', r.registered_contact)}, ${dq('rb', r.registrable_benefits)},
            ${dqDate(r.agm_date)}, ${dq('ry', r.reporting_year)},
            ${dqDate(r.next_reporting_deadline)},
            ${dq('wu', r.website_url)}, ${dq('ws', r.website_status)},
            ${dqArr(r.categories)}, ${dq('source', r.source_url)}, now())
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title, purpose = EXCLUDED.purpose, category = EXCLUDED.category,
      secretariat = EXCLUDED.secretariat, secretariat_url = EXCLUDED.secretariat_url,
      registered_contact = EXCLUDED.registered_contact,
      registrable_benefits = EXCLUDED.registrable_benefits, agm_date = EXCLUDED.agm_date,
      reporting_year = EXCLUDED.reporting_year, next_reporting_deadline = EXCLUDED.next_reporting_deadline,
      website_url = EXCLUDED.website_url, website_status = EXCLUDED.website_status,
      categories = EXCLUDED.categories, source_url = EXCLUDED.source_url, scraped_at = now();`).join('\n');
  await psql(upsertAppg);
  console.log(`  appgs: ${appgRows.length} upserted`);

  await psql('DELETE FROM appg_officers; DELETE FROM appg_funders;');

  const BATCH = 200;
  for (let i = 0; i < officerRows.length; i += BATCH) {
    const slice = officerRows.slice(i, i + BATCH);
    const values = slice.map((o, j) =>
      `(${dq(`o${i + j}`, o.slug)}, ${o.member_id ?? 'NULL'}, ${dq(`n${i + j}`, o.name_at_time)},
        ${dq(`p${i + j}`, o.party)}, ${dq(`r${i + j}`, o.role)}, ${o.removed ? 'TRUE' : 'FALSE'})`,
    ).join(',\n');
    await psql(`INSERT INTO appg_officers (appg_slug, member_id, name_at_time, party, role, removed) VALUES ${values};`);
  }
  console.log(`  appg_officers: ${officerRows.length} inserted`);

  for (let i = 0; i < funderRows.length; i += BATCH) {
    const slice = funderRows.slice(i, i + BATCH);
    const values = slice.map((f, j) =>
      `(${dq(`fs${i + j}`, f.slug)}, ${dq(`src${i + j}`, f.source)},
        ${dq(`d${i + j}`, f.description)}, ${dq(`v${i + j}`, f.value_band)},
        ${dqDate(f.received_date)}, ${dqDate(f.registered_date)},
        ${dq(`bt${i + j}`, f.benefit_type)})`,
    ).join(',\n');
    await psql(`INSERT INTO appg_funders (appg_slug, source, description, value_band, received_date, registered_date, benefit_type) VALUES ${values};`);
  }
  console.log(`  appg_funders: ${funderRows.length} inserted`);
  console.log('\nDone.');
})().catch((e) => { console.error(e); process.exit(1); });
