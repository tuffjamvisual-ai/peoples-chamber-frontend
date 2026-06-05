#!/usr/bin/env node
// Pulls ministers-2010.json from mySociety/parlparse and merges into
// mp_biography.government_posts / opposition_posts / committee_memberships.
//
// MERGE STRATEGY (preserves existing data — never overwrites or deletes):
//   - Dedupe key: post `id` (both ParlParse and our existing data use the
//     same data.parliament.uk PostId; ParlParse encodes it in its `id`
//     URL suffix e.g. .../GovernmentPost/1277 → id=1277).
//   - Where IDs overlap, KEEP existing entry. This preserves the
//     `additionalInfoLink` field which ParlParse does not provide.
//   - Where ParlParse has a new entry not in existing data, ADD it.
//   - Where existing data has an entry not in ParlParse, KEEP it.
//   - Result: union, sorted by startDate desc.
//
// FOLDING: per user direction 2026-06-05, datadotparl/parliamentarypost
//   rows (Speaker, Deputy Speaker, Whips, etc.) are folded into
//   government_posts rather than getting their own column.
//
// LICENSING: data is Crown-licensed under the Open Parliament Licence
//   v3.0; mySociety / TheyWorkForYou provide the bulk-download path under
//   CC BY-SA 2.5 with attribution "Data service provided by TheyWorkForYou".
//   Attribution lives on /credits — added in a sibling change.
//
// Usage:
//   node scripts/sync-parlparse-posts.js                       # preview Sunak
//   node scripts/sync-parlparse-posts.js --preview=4483        # preview one
//   node scripts/sync-parlparse-posts.js --apply               # write all
//   node scripts/sync-parlparse-posts.js --apply --dry-run     # show counts only

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true'];
  }),
);

const APPLY = args.apply === 'true';
const DRY_RUN = args['dry-run'] === 'true';
const PREVIEW_ID = args.preview ? parseInt(args.preview, 10) : (APPLY ? null : 4483);

const PARLPARSE_URL =
  'https://raw.githubusercontent.com/mysociety/parlparse/master/members/ministers-2010.json';

// Map: parlparse source → which JSONB column it goes into
const SOURCE_TO_COL = {
  'datadotparl/governmentpost': 'government_posts',
  'datadotparl/parliamentarypost': 'government_posts',  // folded per user direction
  'datadotparl/oppositionpost': 'opposition_posts',
  'datadotparl/committee': 'committee_memberships',
};

const ID_PATTERN = /^uk\.parliament\.data\/Member\/(\d+)\/(\w+)\/(\d+)$/;

function isoTs(dateStr) {
  // ParlParse dates are 'YYYY-MM-DD' → convert to 'YYYY-MM-DDT00:00:00' to
  // match the timestamp style of existing entries.
  if (!dateStr) return null;
  return `${dateStr}T00:00:00`;
}

// Convert a parlparse membership into our JSONB entry shape
function toEntry(m, orgsById) {
  const mat = ID_PATTERN.exec(m.id);
  if (!mat) return null;
  const postId = parseInt(mat[3], 10);
  const orgName = orgsById[m.organization_id] || null;
  return {
    id: postId,
    name: m.role || orgName || '(unknown post)',
    // ParlParse's organization_id is always 'house-of-commons' for these
    // records (it's where the post is held, not the person's chamber);
    // leaving house unset rather than guessing.
    startDate: isoTs(m.start_date),
    endDate: isoTs(m.end_date),
    additionalInfo: orgName,
    // additionalInfoLink intentionally omitted — ParlParse doesn't have it;
    // existing data wins on merge so links we already have survive.
    _source: 'parlparse',
  };
}

// Merge existing + parlparse arrays. Existing wins on `id` collision.
function mergeArr(existing, parlparseEntries) {
  const ex = Array.isArray(existing) ? existing : [];
  const exIds = new Set(ex.map(e => e?.id).filter(v => v != null));
  const added = parlparseEntries.filter(e => !exIds.has(e.id));
  const merged = [...ex, ...added];
  // Sort by startDate desc (most recent first), nulls last
  merged.sort((a, b) => {
    const as = a?.startDate || '';
    const bs = b?.startDate || '';
    if (as === bs) return 0;
    return as < bs ? 1 : -1;
  });
  return { merged, addedCount: added.length, existingCount: ex.length };
}

async function fetchParlparse() {
  const res = await fetch(PARLPARSE_URL, {
    headers: { 'User-Agent': 'PeoplesChamber/1.0 (peoples-chamber-frontend)' },
  });
  if (!res.ok) throw new Error(`parlparse HTTP ${res.status}`);
  return res.json();
}

function groupByMember(memberships, orgsById) {
  // member_id → { government_posts: [], opposition_posts: [], committee_memberships: [] }
  const out = new Map();
  for (const m of memberships) {
    const mat = ID_PATTERN.exec(m.id);
    if (!mat) continue;
    const memberId = parseInt(mat[1], 10);
    const col = SOURCE_TO_COL[m.source];
    if (!col) continue;
    const entry = toEntry(m, orgsById);
    if (!entry) continue;
    if (!out.has(memberId)) out.set(memberId, { government_posts: [], opposition_posts: [], committee_memberships: [] });
    out.get(memberId)[col].push(entry);
  }
  return out;
}

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

function escapeJson(v) {
  // Stable dollar-quote tag — JSON has no $ chars normally
  return `$pp$${JSON.stringify(v)}$pp$`;
}

async function getExisting(memberId) {
  const sql = `SELECT COALESCE(government_posts,'[]'::jsonb)::text, COALESCE(opposition_posts,'[]'::jsonb)::text, COALESCE(committee_memberships,'[]'::jsonb)::text FROM mp_biography WHERE member_id = ${memberId};`;
  const out = (await psqlQuery(sql)).trim();
  if (!out) return null;
  const [g, o, c] = out.split('|');
  return {
    government_posts: JSON.parse(g),
    opposition_posts: JSON.parse(o),
    committee_memberships: JSON.parse(c),
  };
}

function diffSummary(existing, merged) {
  const exIds = new Set(existing.map(e => e?.id).filter(v => v != null));
  const added = merged.filter(e => !exIds.has(e?.id));
  return {
    before: existing.length,
    after: merged.length,
    preserved: existing.length,
    added: added.length,
    addedEntries: added,
  };
}

function previewEntry(e) {
  const start = (e.startDate || '????-??-??').slice(0, 10);
  const end = e.endDate ? e.endDate.slice(0, 10) : 'OPEN';
  const link = e.additionalInfoLink ? ' 🔗' : '';
  return `    [id=${e.id}] ${e.name}\n      ${start} → ${end}  (${e.additionalInfo || '—'})${link}`;
}

async function previewOne(memberId, byMember) {
  const pp = byMember.get(memberId) || { government_posts: [], opposition_posts: [], committee_memberships: [] };
  const ex = await getExisting(memberId);
  if (!ex) {
    console.log(`\nmember_id ${memberId}: no mp_biography row — would insert.`);
    return;
  }

  const nm = (await psqlQuery(`SELECT display_name FROM mps WHERE member_id = ${memberId};`)).trim();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`PREVIEW — ${nm} (member_id ${memberId})`);
  console.log('='.repeat(70));

  for (const col of ['government_posts', 'opposition_posts', 'committee_memberships']) {
    const { merged } = mergeArr(ex[col], pp[col]);
    const d = diffSummary(ex[col], merged);
    console.log(`\n  ${col}:  before=${d.before}  after=${d.after}  preserved=${d.preserved}  added=${d.added}`);

    if (d.preserved > 0) {
      console.log(`    ── PRESERVED (existing — additionalInfoLink kept) ──`);
      for (const e of ex[col]) console.log(previewEntry(e));
    }
    if (d.added > 0) {
      console.log(`    ── ADDED from ParlParse ──`);
      for (const e of d.addedEntries) console.log(previewEntry(e));
    }
    if (d.before === 0 && d.added === 0) {
      console.log(`    (empty — no data in either source)`);
    }
  }
}

async function applyAll(byMember) {
  // List members we have in mp_biography
  const rows = (await psqlQuery(`SELECT member_id FROM mp_biography ORDER BY member_id;`)).trim().split('\n').filter(Boolean).map(s => parseInt(s, 10));
  console.log(`mp_biography rows: ${rows.length.toLocaleString()}`);

  let touched = 0, gov_added = 0, opp_added = 0, cmte_added = 0;
  let batchSql = [];
  const BATCH = 50;

  async function flush() {
    if (!batchSql.length) return;
    if (!DRY_RUN) await psqlWrite(batchSql.join('\n'));
    batchSql = [];
  }

  for (let i = 0; i < rows.length; i++) {
    const memberId = rows[i];
    const pp = byMember.get(memberId);
    if (!pp) continue;
    const ex = await getExisting(memberId);
    if (!ex) continue;

    const mg = mergeArr(ex.government_posts, pp.government_posts);
    const mo = mergeArr(ex.opposition_posts, pp.opposition_posts);
    const mc = mergeArr(ex.committee_memberships, pp.committee_memberships);

    const totalAdded = mg.addedCount + mo.addedCount + mc.addedCount;
    if (totalAdded === 0) continue;

    touched++;
    gov_added += mg.addedCount;
    opp_added += mo.addedCount;
    cmte_added += mc.addedCount;

    batchSql.push(
      `UPDATE mp_biography SET government_posts = ${escapeJson(mg.merged)}::jsonb, opposition_posts = ${escapeJson(mo.merged)}::jsonb, committee_memberships = ${escapeJson(mc.merged)}::jsonb WHERE member_id = ${memberId};`,
    );
    if (batchSql.length >= BATCH) {
      await flush();
      process.stdout.write(`\r  processed ${i + 1}/${rows.length}  touched=${touched}  +gov=${gov_added} +opp=${opp_added} +cmte=${cmte_added}`);
    }
  }
  await flush();
  console.log(`\n\nDone. mp_biography rows touched: ${touched.toLocaleString()}`);
  console.log(`  government_posts entries added: ${gov_added.toLocaleString()}`);
  console.log(`  opposition_posts entries added: ${opp_added.toLocaleString()}`);
  console.log(`  committee_memberships entries added: ${cmte_added.toLocaleString()}`);
  if (DRY_RUN) console.log('(dry-run — no writes performed)');
}

(async () => {
  console.log(`Fetching ${PARLPARSE_URL} ...`);
  const data = await fetchParlparse();
  console.log(`  memberships: ${data.memberships.length.toLocaleString()}  organizations: ${data.organizations.length.toLocaleString()}`);
  const orgsById = Object.fromEntries(data.organizations.map(o => [o.id, o.name]));
  const byMember = groupByMember(data.memberships, orgsById);
  console.log(`  parlparse covers ${byMember.size.toLocaleString()} distinct member_ids`);

  if (!APPLY) {
    await previewOne(PREVIEW_ID, byMember);
    console.log(`\n(preview only — pass --apply to write.)`);
    return;
  }
  await applyAll(byMember);
})().catch(e => { console.error(e); process.exit(1); });
