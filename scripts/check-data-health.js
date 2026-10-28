#!/usr/bin/env node
// Nightly data health check (GitHub workflow "Data Health Check"). Fails, so GitHub
// emails the owner, when any check below fails. It works without any email service and
// does not depend on the site being reachable: it reads the database and Parliament's
// APIs directly.
//
// Two kinds of check:
//
// 1. Did each refresh job run, and succeed? Every source in lib/data-freshness.ts with a
//    syncRoute (Vercel routes "/api/..." and GitHub steps "/github-actions/...") is looked up in
//    sync_heartbeat. Failed last run, or no run within the source's cadence, fails.
//    The cadences are read from lib/data-freshness.ts so there is one list to maintain.
//
// 2. Is the data complete and correct? Compared with Parliament, not with dates, so a job
//    that runs but writes the wrong thing is caught:
//    - Commons and Lords division counts since the July 2024 election equal Parliament's
//    - every Commons division has official totals and party/rebellion flags applied
//    - every current MP with register entries was checked in the last 3 days
//    - bills: none with a stage that has sat but no current stage, none untitled, both Houses present
//    - no contract rows without a Find a Tender identifier since the 16 Oct 2026 clean-up
//    - the party whip figures were rebuilt in the last 2 days
//
// Usage: node scripts/check-data-health.js     (read-only; exit 1 when a check fails)

'use strict';
try { require('dotenv').config({ path: '.env.local' }); } catch { /* the workflow sets the env directly */ }
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const PARL_START = '2024-07-04';
const DAY = 86400000;
const now = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const yesterday = iso(new Date(now.getTime() - DAY));

const results = [];
const pass = (name, detail) => results.push({ ok: true, name, detail });
const fail = (name, detail) => results.push({ ok: false, name, detail });

async function check(name, fn) {
  try { await fn(); } catch (e) { fail(name, `check could not run: ${e.message}`); }
}

async function count(table, build) {
  let q = db.from(table).select('*', { count: 'exact', head: true });
  if (build) q = build(q);
  const { count: n, error, status } = await q;
  // A HEAD request that times out returns no body, so error.message can be empty: show the code and HTTP status too.
  if (error) throw new Error(`${table}: ${error.message || error.code || 'no message'} (HTTP ${status}${status === 500 || error.code === '57014' ? ', likely a statement timeout' : ''})`);
  return n ?? 0;
}

async function getText(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'opengovt-health/1.0 (+https://opengovt.uk)' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.text();
}

// Cadences from lib/data-freshness.ts (one source of truth).
function readSources() {
  const text = fs.readFileSync(path.join(__dirname, '..', 'lib', 'data-freshness.ts'), 'utf8');
  const maxAge = {};
  const block = text.match(/CADENCE_MAX_AGE_DAYS[^{]*\{([^}]*)\}/);
  for (const m of (block ? block[1] : '').matchAll(/(\w+):\s*(\d+)/g)) maxAge[m[1]] = Number(m[2]);
  const sources = [];
  for (const line of text.split('\n')) {
    if (!/\{\s*key:\s*'/.test(line)) continue;
    const get = (k) => (line.match(new RegExp(`${k}:\\s*'([^']*)'`)) || [])[1];
    if (get('syncRoute')) sources.push({ key: get('key'), label: get('label'), cadence: get('cadence'), route: get('syncRoute') });
  }
  if (!sources.length || !Object.keys(maxAge).length) throw new Error('could not read lib/data-freshness.ts');
  return { sources, maxAge };
}

(async () => {
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY not set');

  await check('Refresh jobs ran and succeeded', async () => {
    const { sources, maxAge } = readSources();
    const { data, error } = await db.from('sync_heartbeat').select('route, last_ran_at, last_status, last_rows');
    if (error) throw new Error(error.message);
    const hb = new Map(data.map((r) => [r.route, r]));
    const problems = [];
    const seen = new Set();
    for (const s of sources) {
      if (seen.has(s.route)) continue;
      seen.add(s.route);
      const h = hb.get(s.route);
      const limit = maxAge[s.cadence] ?? 9;
      if (!h) { problems.push(`${s.label} (${s.route}): no run on record`); continue; }
      const days = Math.floor((now - new Date(h.last_ran_at)) / DAY);
      if (h.last_status != null && (h.last_status < 200 || h.last_status >= 300)) problems.push(`${s.label} (${s.route}): last run failed (status ${h.last_status}, ${days} day${days === 1 ? '' : 's'} ago)`);
      else if (days > limit) problems.push(`${s.label} (${s.route}): last ran ${days} days ago (limit ${limit})`);
    }
    // GitHub steps not listed in data-freshness.ts still count when they fail.
    for (const r of data) {
      if (!r.route.startsWith('/github-actions/') || seen.has(r.route)) continue;
      if (r.last_status != null && (r.last_status < 200 || r.last_status >= 300)) problems.push(`${r.route}: last run failed`);
    }
    problems.length ? fail('Refresh jobs ran and succeeded', problems.join('\n    ')) : pass('Refresh jobs ran and succeeded', `${seen.size} jobs checked`);
  });

  await check('Commons divisions complete', async () => {
    const api = Number(await getText(`https://commonsvotes-api.parliament.uk/data/divisions.json/searchTotalResults?queryParameters.startDate=${PARL_START}&queryParameters.endDate=${yesterday}`));
    const ours = await count('commons_division_totals', (q) => q.gte('division_date', PARL_START).lte('division_date', yesterday));
    const notApplied = await count('commons_division_totals', (q) => q.is('parties_applied_at', null).lte('division_date', yesterday));
    const msg = `Parliament ${api}, ours ${ours}; divisions without party/rebellion flags: ${notApplied}`;
    ours === api && notApplied === 0 ? pass('Commons divisions complete', msg) : fail('Commons divisions complete', msg);
  });

  await check('Commons votes have a party', async () => {
    const n = await count('mp_division_votes', (q) => q.gte('division_date_only', PARL_START).lte('division_date_only', yesterday).is('party', null));
    n <= 5 ? pass('Commons votes have a party', `${n} vote rows without a party since July 2024`) : fail('Commons votes have a party', `${n} vote rows without a party since July 2024`);
  });

  await check('Lords divisions complete', async () => {
    const api = Number(await getText(`https://lordsvotes-api.parliament.uk/data/Divisions/searchTotalResults?StartDate=${PARL_START}&EndDate=${yesterday}`));
    const ours = await count('lords_divisions', (q) => q.gte('division_date', PARL_START).lte('division_date', yesterday));
    const msg = `Parliament ${api}, ours ${ours}`;
    ours === api ? pass('Lords divisions complete', msg) : fail('Lords divisions complete', msg);
  });

  await check('Every MP register checked recently', async () => {
    const current = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('mps').select('member_id').eq('current_member', true).order('member_id').range(from, from + 999);
      if (error) throw new Error(error.message);
      current.push(...data);
      if (data.length < 1000) break;
    }
    const newest = new Map();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('mp_registered_interests').select('member_id, last_seen_date').eq('is_current', true).order('id').range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const r of data) if (!newest.has(r.member_id) || r.last_seen_date > newest.get(r.member_id)) newest.set(r.member_id, r.last_seen_date);
      if (data.length < 1000) break;
    }
    const cutoff = iso(new Date(now.getTime() - 3 * DAY));
    const currentIds = new Set(current.map((m) => m.member_id));
    const stale = current.filter((m) => newest.has(m.member_id) && newest.get(m.member_id) < cutoff).map((m) => m.member_id);
    const former = [...newest.keys()].filter((id) => !currentIds.has(id));
    const msg = `${newest.size} MPs with current entries; not checked since ${cutoff}: ${stale.length}${stale.length ? ` (e.g. ${stale.slice(0, 8).join(', ')})` : ''}; former MPs still shown as current: ${former.length}`;
    stale.length === 0 && former.length === 0 ? pass('Every MP register checked recently', msg) : fail('Every MP register checked recently', msg);
  });

  await check('Bills complete', async () => {
    // A bill only needs a current stage once one of its stages has actually sat. Bills whose listed
    // stages have no sitting date yet (e.g. a Lords private member's bill awaiting 2nd reading) are
    // correctly shown without one, so they are not counted.
    const { data: noStageRows, error: nsErr } = await db.from('bill').select('parliament_id, stages').not('stages->items->0', 'is', null).is('current_stage', null).order('id').limit(1000);
    if (nsErr) throw new Error(`bill: ${nsErr.message}`);
    const today = iso(now);
    const noStageIds = (noStageRows || []).filter((b) => (b.stages?.items || []).some((st) => {
      const d = st?.stageSittings?.[0]?.date;
      return typeof d === 'string' && d.slice(0, 10) <= today;
    })).map((b) => b.parliament_id);
    const noStage = noStageIds.length;
    const untitled = await count('bill', (q) => q.or('title.is.null,title.eq.,title.eq.Untitled Bill'));
    const commons = await count('bill', (q) => q.eq('originating_house', 'Commons'));
    const lords = await count('bill', (q) => q.eq('originating_house', 'Lords'));
    const placeholder = await count('bill', (q) => q.eq('description', 'No description available'));
    const msg = `with a stage that has sat but no current stage: ${noStage}${noStage ? ` (bills ${noStageIds.slice(0, 8).join(', ')})` : ''}; untitled: ${untitled}; started in Commons ${commons}, Lords ${lords}; placeholder descriptions: ${placeholder}`;
    noStage === 0 && untitled === 0 && commons > 0 && lords > 0 && placeholder === 0 ? pass('Bills complete', msg) : fail('Bills complete', msg);
  });

  await check('Contracts have no duplicates', async () => {
    // Every contract row must carry its Find a Tender identifier (ocid). Rows without one were
    // duplicates written by the retired script; the database refuses new ones, so any here is a fault.
    const noOcid = await count('government_contracts', (q) => q.is('ocid', null).gt('updated_at', '2026-10-16T23:59:59Z'));
    const msg = `contract rows without a Find a Tender identifier added since the 16 Oct 2026 clean-up: ${noOcid}`;
    noOcid === 0 ? pass('Contracts have no duplicates', msg) : fail('Contracts have no duplicates', msg);
  });

  await check('Party whip figures rebuilt', async () => {
    const { data, error } = await db.from('party_division_splits').select('refreshed_at').limit(1);
    if (error) throw new Error(error.message);
    const at = data && data[0] ? new Date(data[0].refreshed_at) : null;
    const days = at ? Math.floor((now - at) / DAY) : null;
    at && days <= 2 ? pass('Party whip figures rebuilt', `${days} day${days === 1 ? '' : 's'} ago`) : fail('Party whip figures rebuilt', at ? `last rebuilt ${days} days ago` : 'never rebuilt');
  });

  const failed = results.filter((r) => !r.ok);
  const lines = results.map((r) => `${r.ok ? 'OK  ' : 'FAIL'} ${r.name}: ${r.detail}`);
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Data health\n${results.map((r) => `- ${r.ok ? '✅' : '❌'} **${r.name}**: ${r.detail.replace(/\n\s+/g, '; ')}`).join('\n')}\n`); } catch { /* optional */ }
  }
  if (failed.length) { console.log(`::error::${failed.length} data health check${failed.length === 1 ? '' : 's'} failed: ${failed.map((r) => r.name).join('; ')}`); process.exit(1); }
  console.log('All data health checks passed.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
