#!/usr/bin/env node
// Last step of each scheduled GitHub workflow. Records how every step went in
// sync_heartbeat (route "/github-actions/<step id>"), so the freshness monitor and the nightly data
// health check see these jobs the same way they see the Vercel cron routes. Then it
// fails the run if any step failed.
//
// Why: steps run with continue-on-error so one failure does not stop the rest, but that
// also made every run report "success" even when steps failed (the duplicate votes step
// failed on every insert for months and the run still showed green). A failed run now
// shows red and GitHub emails the workflow's owner.
//
// The workflow passes the steps context as JSON:
//   - name: Report step results
//     if: always()
//     env:
//       STEPS_JSON: ${{ toJSON(steps) }}
//     run: node scripts/report-workflow-steps.js
// Only steps with an id are reported; give each data step an id.

'use strict';
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

(async () => {
  let steps;
  try { steps = JSON.parse(process.env.STEPS_JSON || '{}'); } catch { steps = {}; }
  const entries = Object.entries(steps);
  if (!entries.length) { console.error('No step results were passed (STEPS_JSON is empty).'); process.exit(1); }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

  const lines = [];
  const failed = [];
  for (const [id, s] of entries) {
    const outcome = s && s.outcome; // success | failure | cancelled | skipped
    if (outcome === 'skipped') { lines.push(`- ${id}: skipped`); continue; }
    const ok = outcome === 'success';
    if (!ok) failed.push(id);
    lines.push(`- ${id}: ${ok ? 'ok' : `FAILED (${outcome})`}`);
    if (db) {
      const { error } = await db.rpc('record_sync_run', { p_route: `/github-actions/${id}`, p_status: ok ? 200 : 500, p_rows: null });
      if (error) lines.push(`  (could not record in sync_heartbeat: ${error.message})`);
    }
  }
  if (!db) lines.push('(not recorded in sync_heartbeat: Supabase settings missing)');

  const report = `Step results:\n${lines.join('\n')}`;
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Step results\n${lines.join('\n')}\n`); } catch { /* summary is optional */ }
  }
  if (failed.length) {
    console.log(`::error::${failed.length} step${failed.length === 1 ? '' : 's'} failed: ${failed.join(', ')}`);
    process.exit(1);
  }
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
