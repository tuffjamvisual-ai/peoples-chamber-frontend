// Backfill per-MP written-question counts + top answering departments from the
// Questions & Statements API (Commons, this Parliament) into mp_contribution_totals.
const { execSync, exec } = require('child_process');
const DB = process.env.DATABASE_URL;
const API = 'https://questions-statements-api.parliament.uk/api/writtenquestions/questions';
const START = '2024-07-04';

function q(sql) { return execSync(`psql "${DB}" -tA -c "${sql}"`).toString().trim(); }
function curlJson(url) {
  return new Promise((res) => {
    exec(`/usr/bin/curl -s -L -m 30 "${url}"`, { maxBuffer: 1 << 26 }, (e, out) => {
      if (e) return res(null);
      try { res(JSON.parse(out)); } catch { res(null); }
    });
  });
}

async function memberWQ(id) {
  // Page all of this member's Commons written questions, tally by answering body.
  const depts = new Map();
  let skip = 0, total = null, fetched = 0, guard = 0, ok = true;
  while (guard++ < 400) {
    const j = await curlJson(`${API}?house=Commons&askingMemberId=${id}&tabledWhenFrom=${START}&take=100&skip=${skip}`);
    if (!j) { ok = false; break; }
    if (total === null) total = j.totalResults || 0;
    const R = j.results || [];
    if (!R.length) break;
    for (const row of R) {
      const d = (row.value && row.value.answeringBodyName || '').trim();
      if (d) depts.set(d, (depts.get(d) || 0) + 1);
    }
    fetched += R.length; skip += R.length;
    if (fetched >= total || R.length < 100) break;
  }
  if (total === null) ok = false;
  const top = [...depts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([dept, count]) => ({ dept, count }));
  return { id, total: total || 0, top, ok };
}

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

(async () => {
  const ids = q(`SELECT member_id FROM mps WHERE (current_member IS NULL OR current_member=true)`)
    .split('\n').filter(Boolean).map(Number);
  console.log(`Backfilling written questions for ${ids.length} current MPs...`);
  const res = await pool(ids, 8, memberWQ);
  const good = res.filter((r) => r.ok);
  console.log(`Fetched ${good.length}/${res.length} ok. Writing...`);
  const fs = require('fs');
  // Dollar-quote the JSON so its double quotes / commas survive both the shell
  // and SQL — far safer than escaping inside a -c "..." argument.
  let sql = '';
  for (const r of good) {
    sql += `UPDATE mp_contribution_totals SET written_questions=${r.total}, wq_top_departments=$q$${JSON.stringify(r.top)}$q$::jsonb, updated_at=now() WHERE member_id=${r.id};\n`;
  }
  fs.writeFileSync('/tmp/wq-update.sql', sql);
  execSync(`psql "${DB}" -f /tmp/wq-update.sql`, { stdio: 'inherit' });
  console.log(`Updated ${good.length} rows.`);
  console.log('Top 5 askers:');
  const top = q(`SELECT m.name, t.written_questions FROM mp_contribution_totals t JOIN mps m ON m.member_id=t.member_id ORDER BY t.written_questions DESC NULLS LAST LIMIT 5`);
  console.log(top);
})();
