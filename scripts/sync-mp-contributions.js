// Sync recent Hansard chamber contributions per MP from the Parliament
// Members API (ContributionSummary). Stores the most recent ~20 debates each
// MP contributed to, with per-type counts and a direct Hansard link, into
// mp_contributions. Emits upsert SQL to /tmp/contributions.sql (apply with
// psql). Reads member ids from /tmp/member_ids.txt (one per line).
//
//   psql "$DATABASE_URL" -tA -c "select member_id from mps where coalesce(current_member,true)" > /tmp/member_ids.txt
//   node scripts/sync-mp-contributions.js
//   psql "$DATABASE_URL" -f /tmp/contributions.sql
const fs = require('fs');

const API = 'https://members-api.parliament.uk/api/Members';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ids = fs.readFileSync('/tmp/member_ids.txt', 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

function q(v) {
  if (v == null) return 'NULL';
  if (String(v).includes('$Q$')) return 'NULL';
  return `$Q$${v}$Q$`;
}
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? String(Math.round(x)) : '0';
}

(async () => {
  const rows = [];
  let i = 0, withData = 0;
  for (const id of ids) {
    i++;
    if (i % 50 === 0) console.error(`  ${i}/${ids.length} (rows ${rows.length})`);
    let j;
    try {
      j = await (await fetch(`${API}/${id}/ContributionSummary?page=1`)).json();
    } catch { await sleep(120); continue; }
    const items = j?.items || [];
    if (items.length) withData++;
    for (const it of items.slice(0, 20)) {
      const v = it.value || {};
      const hansard = (it.links || []).find((l) => /hansard/i.test(l.href || ''))?.href || null;
      const sitting = v.sittingDate ? v.sittingDate.slice(0, 10) : null;
      rows.push(
        `(${n(id)}, ${q(v.debateWebsiteId)}, ${v.debateId ? n(v.debateId) : 'NULL'}, ${q((v.debateTitle || '').trim())}, ` +
        `${sitting ? q(sitting) : 'NULL'}, ${q(v.section)}, ${q(v.house)}, ${n(v.speechCount)}, ${n(v.questionCount)}, ` +
        `${n(v.interventionCount)}, ${n(v.answerCount)}, ${n(v.statementsCount)}, ${n(v.totalContributions)}, ${q(hansard)}, now())`
      );
    }
    await sleep(50);
  }
  const header =
    'insert into mp_contributions (member_id, debate_website_id, debate_id, debate_title, sitting_date, section, house, ' +
    'speech_count, question_count, intervention_count, answer_count, statement_count, total_contributions, hansard_url, updated_at) values\n';
  const onConflict =
    '\non conflict (member_id, debate_website_id) do update set ' +
    'debate_title=excluded.debate_title, sitting_date=excluded.sitting_date, section=excluded.section, house=excluded.house, ' +
    'speech_count=excluded.speech_count, question_count=excluded.question_count, intervention_count=excluded.intervention_count, ' +
    'answer_count=excluded.answer_count, statement_count=excluded.statement_count, total_contributions=excluded.total_contributions, ' +
    'hansard_url=excluded.hansard_url, updated_at=now();\n';
  // Chunk inserts to keep statements a sane size.
  let sql = '';
  for (let k = 0; k < rows.length; k += 500) {
    sql += header + rows.slice(k, k + 500).join(',\n') + onConflict;
  }
  fs.writeFileSync('/tmp/contributions.sql', sql);
  console.error(`DONE. members with data: ${withData}/${ids.length}, rows: ${rows.length}`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
