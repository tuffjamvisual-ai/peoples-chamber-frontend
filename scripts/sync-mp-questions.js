// Sync MP written questions and answers from the Parliament Members API.
//
// Endpoint: /api/Members/{id}/WrittenQuestions
// Per-MP take=50 most-recent. Active MPs only (650). At 300ms delay,
// total runtime is ~3.5 minutes. Wipe-and-insert; no natural unique key
// in the destination schema. Resume support via /tmp/mp-questions-progress.json.
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PER_MP = 50;
const DELAY_MS = 300;
const PROGRESS_FILE = '/tmp/mp-questions-progress.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch { return { doneMembers: [], rows: [] }; }
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }

function isoDate(s) {
  if (!s) return null;
  const d = String(s).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

async function fetchActiveMembers() {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('mps')
      .select('member_id,name')
      .eq('current_member', true)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function fetchQuestionsForMember(memberId) {
  const url = `https://members-api.parliament.uk/api/Members/${memberId}/WrittenQuestions?skip=0&take=${PER_MP}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.items || [];
}

function mapRow(memberId, item) {
  const v = item.value || item;
  if (!v) return null;
  // Only keep answered questions — unanswered ones lack the answer text we
  // want to display.
  const answeredOn = isoDate(v.dateAnswered);
  if (!answeredOn) return null;
  return {
    member_id: memberId,
    member_slug: String(memberId),
    question: v.questionText || null,
    answer: v.answerText || null,
    answered_date: answeredOn,
    department: v.answeringBody?.name || v.answeringBody?.shortName || null,
  };
}

async function main() {
  const progress = loadProgress();
  const doneSet = new Set(progress.doneMembers);

  const members = await fetchActiveMembers();
  console.log(`[mp-questions] ${members.length} active MPs to process (${doneSet.size} already done in this run)`);

  for (let i = 0; i < members.length; i++) {
    const { member_id: memberId, name } = members[i];
    if (doneSet.has(memberId)) continue;

    let items = [];
    try {
      items = await fetchQuestionsForMember(memberId);
    } catch (e) {
      console.warn(`  [${i + 1}/${members.length}] member ${memberId} fetch failed: ${e.message}`);
      await sleep(DELAY_MS);
      continue;
    }

    let added = 0;
    for (const it of items) {
      const row = mapRow(memberId, it);
      if (row) { progress.rows.push(row); added++; }
    }
    progress.doneMembers.push(memberId);
    doneSet.add(memberId);

    if (i % 50 === 0 || i === members.length - 1) {
      console.log(`  [${i + 1}/${members.length}] ${name} (${memberId}) — +${added} answered (rows so far: ${progress.rows.length})`);
      saveProgress(progress);
    }
    await sleep(DELAY_MS);
  }
  saveProgress(progress);

  if (!progress.rows.length) { console.log('[mp-questions] no rows produced.'); return; }
  console.log(`[mp-questions] wiping mp_questions…`);
  const { error: delErr } = await supabase.from('mp_questions').delete().not('id', 'is', null);
  if (delErr) { console.error('[mp-questions] wipe error:', delErr.message); return; }

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < progress.rows.length; i += BATCH) {
    const batch = progress.rows.slice(i, i + BATCH);
    const { error } = await supabase.from('mp_questions').insert(batch);
    if (error) {
      console.error(`[mp-questions] insert batch ${i} error:`, error.message);
      break;
    }
    inserted += batch.length;
    if (i % 2000 === 0 || i + BATCH >= progress.rows.length) {
      console.log(`[mp-questions] inserted ${inserted}/${progress.rows.length}`);
    }
    await sleep(150);
  }
  console.log('[mp-questions] done.');
}

main().catch((e) => { console.error('[mp-questions] fatal:', e?.message || e); process.exit(0); });
