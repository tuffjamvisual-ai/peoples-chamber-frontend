// Backfill debates.summary (first sentence / 200 chars, from the transcript) and
// debates.division_ids (exact division slugs from the in-transcript division
// numbers, cross-checked against our divisions). No LLM.
const { execSync, exec } = require('child_process');
const fs = require('fs');
const DB = process.env.DATABASE_URL;

function q(sql) { return execSync(`psql "${DB}" -tA -c "${sql}"`).toString().trim(); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function curlOnce(url) {
  return new Promise((res) => {
    exec(`/usr/bin/curl -s -L -m 30 "${url}"`, { maxBuffer: 1 << 26 }, (e, out) => {
      if (e) return res(null);
      try { res(JSON.parse(out)); } catch { res(null); }
    });
  });
}
async function curlJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const j = await curlOnce(url);
    if (j) return j;
    await sleep(400 * (attempt + 1)); // back off on throttle
  }
  return null;
}
const plain = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();

function walk(node, items, divs) {
  for (const it of node.Items || []) {
    if (it.ItemType === 'Contribution') items.push(it);
    else if (it.ItemType === 'Division' && it.Value) divs.push(it);
  }
  for (const c of node.ChildDebates || []) walk(c, items, divs);
  return { items, divs };
}

const SKIP = /^(motion made|question (put|proposed|agreed)|resolved|ordered|that this house do now adjourn|the house (divided|proceeded)|i beg to move,?\s*that this house do now adjourn)/i;

function firstSentence(s, max) {
  const m = s.match(/^[\s\S]*?[.?!](\s|$)/);
  let out = (m ? m[0] : s).trim();
  if (out.length > max) out = out.slice(0, max - 1).trim() + '…';
  return out;
}

function summaryFrom(items) {
  const texts = items.map((i) => plain(i.Value)).filter(Boolean);
  // Prefer a "has considered" / bill motion.
  for (const t of texts.slice(0, 40)) {
    const m = t.match(/That (?:this House|the House|the Committee|the Grand Committee) has considered\b[\s\S]*?(?=\.\s|\.$)/i);
    if (m && m[0].length > 30) return firstSentence(m[0].trim() + '.', 200);
  }
  // Else first meaningful, non-procedural contribution.
  for (const t of texts) {
    if (t.length > 20 && !SKIP.test(t)) return firstSentence(t, 200);
  }
  return null;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

(async () => {
  // Valid (date, number) divisions, so badges never 404.
  const valid = new Set(
    q(`SELECT division_date_only || '#' || division_number FROM commons_divisions_titled`).split('\n').filter(Boolean),
  );
  // Resumable: only debates not yet processed (division_ids stays NULL until a
  // successful fetch writes '{}' or an array).
  const rows = q(`SELECT id || '|' || hansard_ext_id || '|' || sitting_date FROM debates WHERE division_ids IS NULL`)
    .split('\n').filter(Boolean)
    .map((l) => { const [id, ext, date] = l.split('|'); return { id: +id, ext, date }; });
  console.log(`Processing ${rows.length} unprocessed debates (valid divisions: ${valid.size})...`);

  const updates = [];
  let done = 0, withDiv = 0, withSum = 0, failed = 0;
  await pool(rows, 3, async (r) => {
    await sleep(120); // stagger to stay under Hansard's throttle
    const j = await curlJson(`https://hansard-api.parliament.uk/debates/debate/${r.ext}.json`);
    done++;
    if (done % 1000 === 0) console.log(`  ${done}/${rows.length}`);
    if (!j || !j.Overview) { failed++; return; }
    const { items, divs } = walk(j, [], []);
    const summary = summaryFrom(items);
    const slugs = [];
    for (const d of divs) {
      const num = parseInt(String(d.Value).split('|')[0], 10);
      if (!Number.isFinite(num)) continue;
      if (valid.has(`${r.date}#${num}`)) slugs.push(`pw-${r.date}-${num}-commons`);
    }
    const uniq = [...new Set(slugs)];
    if (summary) withSum++;
    if (uniq.length) withDiv++;
    updates.push({ id: r.id, summary, slugs: uniq });
  });

  console.log(`Fetched. summaries:${withSum} withDivisions:${withDiv} failed:${failed}. Writing...`);
  let sql = '';
  for (const u of updates) {
    const sumSql = u.summary ? `$q$${u.summary}$q$` : 'NULL';
    const arrSql = u.slugs.length ? `'{${u.slugs.map((s) => `"${s}"`).join(',')}}'::text[]` : `'{}'::text[]`;
    sql += `UPDATE debates SET summary=${sumSql}, division_ids=${arrSql} WHERE id=${u.id};\n`;
  }
  fs.writeFileSync('/tmp/debate-extras.sql', sql);
  execSync(`psql "${DB}" -f /tmp/debate-extras.sql`, { stdio: 'inherit' });
  console.log(`Updated ${updates.length} debates.`);
})();
